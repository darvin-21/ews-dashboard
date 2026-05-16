"""
Scoring engine.

Design principles:
  - Every score has a per-indicator breakdown with: value, period, source,
    URL, weight, bucket risk, direction.
  - The composite is a simple weighted average over indicators that have
    a usable observation in the last N years.
  - Confidence is derived from (a) coverage (fraction of expected
    indicators present) and (b) freshness (recency of underlying data).
  - No black-box ML. The user must be able to audit every number.
"""
from __future__ import annotations

import datetime as dt
import logging
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Tuple

from sqlalchemy import select, and_
from sqlalchemy.orm import Session

from data.reference import (
    INDICATORS,
    INDICATOR_BY_CODE,
    OIL_EXPORTERS,
    SECTOR_BY_CODE,
)
from models import IndicatorObservation

logger = logging.getLogger(__name__)


@dataclass
class IndicatorScore:
    code: str
    name: str
    category: str
    source: str
    source_series_id: str
    source_url: str
    period: Optional[str]
    value: Optional[float]
    unit: Optional[str]
    direction: str
    weight_used: float
    bucket_risk: Optional[float]  # 0..100
    direction_of_change: Optional[str]  # "improving" | "deteriorating" | "stable" | None
    yoy_change: Optional[float]
    confidence: float  # 0..1
    notes: Optional[str]
    available: bool
    unavailability_reason: Optional[str]


@dataclass
class RiskAssessment:
    country_iso3: str
    sector_code: str
    composite_score: float  # 0..100
    band: str  # "low" | "moderate" | "high" | "critical"
    composite_confidence: float  # 0..1
    indicators: List[IndicatorScore]
    warning_signals: List[str]
    deteriorating: List[str]
    improving: List[str]
    computed_at: str


BANDS = [
    (0, 40, "low"),
    (41, 70, "moderate"),
    (71, 90, "high"),
    (91, 100, "critical"),
]


def _band(score: float) -> str:
    for lo, hi, label in BANDS:
        if lo <= score <= hi:
            return label
    return "critical"


def _bucket_risk(value: float, indicator: dict) -> float:
    """Map a value to a 0..100 bucket risk, respecting direction."""
    for b in indicator["buckets"]:
        if b["lo"] < value <= b["hi"] or (b["lo"] == -1e18 and value <= b["hi"]):
            return float(b["risk"])
    # If above the top bucket explicitly
    top = indicator["buckets"][-1]
    if value > top["hi"]:
        return float(top["risk"])
    return 50.0


def _latest_obs(
    db: Session, country_iso3: str, indicator_code: str
) -> Tuple[Optional[IndicatorObservation], Optional[IndicatorObservation]]:
    """Return (latest, prior) observations with non-null values.

    For IMF WEO series we get forecasts that extend ~5y into the future.
    We prefer the latest *non-projection* observation (period <= current year + 1),
    falling back to the absolute latest if nothing else is available.
    """
    stmt = (
        select(IndicatorObservation)
        .where(
            and_(
                IndicatorObservation.country_iso3 == country_iso3,
                IndicatorObservation.indicator_code == indicator_code,
                IndicatorObservation.value.is_not(None),
            )
        )
        .order_by(IndicatorObservation.period.desc())
        .limit(20)
    )
    rows = db.execute(stmt).scalars().all()
    if not rows:
        return None, None
    cutoff_year = dt.datetime.utcnow().year + 1  # accept current-year nowcast
    filtered = []
    for r in rows:
        try:
            y = int(r.period[:4])
            if y <= cutoff_year:
                filtered.append(r)
        except (TypeError, ValueError):
            filtered.append(r)
    if not filtered:
        filtered = rows
    latest = filtered[0]
    prior = filtered[1] if len(filtered) > 1 else None
    return latest, prior


def _freshness_weight(latest: Optional[IndicatorObservation], frequency: str) -> float:
    """Confidence weight 0..1 based on how recent the data is for its frequency."""
    if latest is None or latest.value is None:
        return 0.0
    today = dt.datetime.utcnow()
    period = latest.period
    try:
        if len(period) == 4:
            obs_dt = dt.datetime(int(period), 12, 31)
        elif len(period) == 7:
            y, m = period.split("-")
            obs_dt = dt.datetime(int(y), int(m), 28)
        elif len(period) >= 10:
            obs_dt = dt.datetime.fromisoformat(period[:10])
        else:
            return 0.5
    except Exception:
        return 0.5
    age_days = (today - obs_dt).days
    if frequency == "annual":
        if age_days < 365 * 1.5:
            return 1.0
        if age_days < 365 * 3:
            return 0.7
        return 0.4
    if frequency == "quarterly":
        if age_days < 200:
            return 1.0
        if age_days < 400:
            return 0.7
        return 0.4
    if frequency == "monthly":
        if age_days < 90:
            return 1.0
        if age_days < 200:
            return 0.7
        return 0.4
    # daily
    if age_days < 14:
        return 1.0
    if age_days < 60:
        return 0.7
    return 0.4


def _indicator_codes_for(sector_code: str) -> List[str]:
    """Codes to evaluate for a sector. Macro stack + sector overlay (deduped)."""
    macro_stack = [ind["code"] for ind in INDICATORS]  # the full catalog
    sector = SECTOR_BY_CODE.get(sector_code)
    if not sector:
        return macro_stack
    overlay = sector.get("indicator_overlay", []) or []
    # Macro stack already includes everything; overlay is just emphasising weights.
    return macro_stack


def _weight_adjustment(indicator: dict, country_iso3: str, sector_code: str) -> float:
    """Per-country / per-sector weight tweaks."""
    w = float(indicator["weight"])
    # Oil-exporter flip: for net exporters, high oil price reduces risk, so down-weight.
    if indicator["code"] == "brent_price" and country_iso3 in OIL_EXPORTERS:
        w *= 0.3  # de-emphasise rather than fully flip to keep things transparent
    # Yield curve only applies to USA
    if indicator["code"] == "us_curve_10y_2y" and country_iso3 != "USA":
        w = 0.0
    # Policy rate via FRED is US fed funds — only applies to USA
    if indicator["code"] == "policy_rate" and country_iso3 != "USA":
        w = 0.0
    # Sector overlay boost
    sector = SECTOR_BY_CODE.get(sector_code, {})
    if indicator["code"] in (sector.get("indicator_overlay") or []):
        w *= 1.5
    return w


def _direction_of_change(
    indicator: dict,
    latest_value: Optional[float],
    prior_value: Optional[float],
) -> Tuple[Optional[str], Optional[float]]:
    if latest_value is None or prior_value is None:
        return None, None
    delta = latest_value - prior_value
    if abs(delta) < 1e-9:
        return "stable", 0.0
    direction = indicator["direction"]
    # For "higher_is_riskier", a positive delta means deteriorating.
    if direction == "higher_is_riskier":
        return ("deteriorating" if delta > 0 else "improving"), delta
    return ("improving" if delta > 0 else "deteriorating"), delta


def compute_risk(
    db: Session,
    country_iso3: str,
    sector_code: str = "macro",
    selected_indicator_codes: Optional[List[str]] = None,
) -> RiskAssessment:
    codes = selected_indicator_codes or _indicator_codes_for(sector_code)

    indicator_scores: List[IndicatorScore] = []
    weighted_sum = 0.0
    weight_sum = 0.0
    confidences: List[float] = []

    for code in codes:
        indicator = INDICATOR_BY_CODE.get(code)
        if not indicator:
            continue
        w = _weight_adjustment(indicator, country_iso3, sector_code)

        # private_credit_growth is derived from credit_to_gdp -> needs latest + prior of that series
        if code == "private_credit_growth":
            base_ind = INDICATOR_BY_CODE["credit_to_gdp"]
            latest, prior = _latest_obs(db, country_iso3, base_ind["code"])
            if latest and prior and latest.value is not None and prior.value is not None:
                derived_value = latest.value - prior.value
                bucket_risk = _bucket_risk(derived_value, indicator)
                conf = _freshness_weight(latest, indicator["frequency"])
                if w > 0:
                    weighted_sum += bucket_risk * w
                    weight_sum += w
                    confidences.append(conf)
                indicator_scores.append(
                    IndicatorScore(
                        code=code,
                        name=indicator["name"],
                        category=indicator["category"],
                        source=base_ind["source"],
                        source_series_id=base_ind["source_series_id"],
                        source_url=base_ind["source_url_template"].format(iso3=country_iso3),
                        period=latest.period,
                        value=derived_value,
                        unit=indicator.get("unit"),
                        direction=indicator["direction"],
                        weight_used=w,
                        bucket_risk=bucket_risk,
                        direction_of_change=("deteriorating" if derived_value > 0 else "improving") if derived_value != 0 else "stable",
                        yoy_change=derived_value,
                        confidence=conf,
                        notes=indicator["notes"],
                        available=True,
                        unavailability_reason=None,
                    )
                )
            else:
                indicator_scores.append(
                    IndicatorScore(
                        code=code, name=indicator["name"], category=indicator["category"],
                        source=base_ind["source"], source_series_id=base_ind["source_series_id"],
                        source_url=base_ind["source_url_template"].format(iso3=country_iso3),
                        period=None, value=None, unit=indicator.get("unit"),
                        direction=indicator["direction"], weight_used=0.0, bucket_risk=None,
                        direction_of_change=None, yoy_change=None, confidence=0.0,
                        notes=indicator["notes"], available=False,
                        unavailability_reason="Not enough observations to derive YoY change. Check source for latest WDI release.",
                    )
                )
            continue

        latest, prior = _latest_obs(db, country_iso3, code)
        source_url = indicator["source_url_template"].format(iso3=country_iso3) if "{iso3}" in indicator["source_url_template"] else indicator["source_url_template"]

        if latest is None or latest.value is None:
            indicator_scores.append(
                IndicatorScore(
                    code=code, name=indicator["name"], category=indicator["category"],
                    source=indicator["source"], source_series_id=indicator["source_series_id"],
                    source_url=source_url,
                    period=None, value=None, unit=indicator.get("unit"),
                    direction=indicator["direction"], weight_used=0.0, bucket_risk=None,
                    direction_of_change=None, yoy_change=None, confidence=0.0,
                    notes=indicator["notes"], available=False,
                    unavailability_reason=(
                        f"Not available for {country_iso3}.""
                    ),
                )
            )
            continue

        bucket_risk = _bucket_risk(latest.value, indicator)
        # If oil exporter and brent indicator, invert effective risk (high oil = lower risk)
        if code == "brent_price" and country_iso3 in OIL_EXPORTERS:
            bucket_risk = 100.0 - bucket_risk
        conf = _freshness_weight(latest, indicator["frequency"])
        doc, yoy = _direction_of_change(indicator, latest.value, prior.value if prior else None)

        if w > 0:
            weighted_sum += bucket_risk * w
            weight_sum += w
            confidences.append(conf)

        indicator_scores.append(
            IndicatorScore(
                code=code,
                name=indicator["name"],
                category=indicator["category"],
                source=indicator["source"],
                source_series_id=indicator["source_series_id"],
                source_url=source_url,
                period=latest.period,
                value=latest.value,
                unit=indicator.get("unit"),
                direction=indicator["direction"],
                weight_used=w,
                bucket_risk=bucket_risk,
                direction_of_change=doc,
                yoy_change=yoy,
                confidence=conf,
                notes=indicator["notes"],
                available=True,
                unavailability_reason=None,
            )
        )

    composite = (weighted_sum / weight_sum) if weight_sum > 0 else 0.0
    coverage = sum(1 for s in indicator_scores if s.available) / max(1, len(indicator_scores))
    freshness = (sum(confidences) / len(confidences)) if confidences else 0.0
    composite_confidence = round(0.5 * coverage + 0.5 * freshness, 3)

    # If we had no usable observations at all, refuse to assign a band — show "unknown".
    if weight_sum == 0 or not any(s.available for s in indicator_scores):
        band = "unknown"
    else:
        band = _band(composite)

    warning_signals = [
        f"{s.name}: {s.value:.2f}{s.unit or ''} (bucket risk {s.bucket_risk:.0f}/100)"
        for s in indicator_scores
        if s.available and s.bucket_risk is not None and s.bucket_risk >= 70
    ]
    deteriorating = [s.code for s in indicator_scores if s.direction_of_change == "deteriorating"]
    improving = [s.code for s in indicator_scores if s.direction_of_change == "improving"]

    return RiskAssessment(
        country_iso3=country_iso3,
        sector_code=sector_code,
        composite_score=round(composite, 2),
        band=band,
        composite_confidence=composite_confidence,
        indicators=indicator_scores,
        warning_signals=warning_signals,
        deteriorating=deteriorating,
        improving=improving,
        computed_at=dt.datetime.utcnow().isoformat() + "Z",
    )


def assessment_to_dict(a: RiskAssessment) -> dict:
    d = asdict(a)
    return d
