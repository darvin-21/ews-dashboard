"""Indicator time-series endpoints."""
from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from data.reference import INDICATOR_BY_CODE
from database import get_db
from models import IndicatorObservation

router = APIRouter(prefix="/api/indicators", tags=["indicators"])


@router.get("/series")
def get_series(
    country: str = Query(..., min_length=3, max_length=3, description="ISO3 country code"),
    code: str = Query(..., description="Internal indicator code"),
    from_year: Optional[int] = Query(None, alias="from"),
    to_year: Optional[int] = Query(None, alias="to"),
    db: Session = Depends(get_db),
):
    indicator = INDICATOR_BY_CODE.get(code)
    if not indicator:
        raise HTTPException(404, f"Unknown indicator code: {code}")
    stmt = select(IndicatorObservation).where(
        and_(
            IndicatorObservation.country_iso3 == country.upper(),
            IndicatorObservation.indicator_code == code,
        )
    ).order_by(IndicatorObservation.period.asc())
    rows = db.execute(stmt).scalars().all()
    points = []
    for r in rows:
        # Period-year filter for annual; otherwise leave as-is.
        try:
            y = int(r.period[:4])
            if from_year and y < from_year:
                continue
            if to_year and y > to_year:
                continue
        except (TypeError, ValueError):
            pass
        points.append({
            "period": r.period,
            "value": r.value,
            "unit": r.unit,
            "fetched_at": r.fetched_at.isoformat() + "Z",
            "source": r.source,
            "source_series_id": r.source_series_id,
            "source_url": r.source_url,
        })

    return {
        "country": country.upper(),
        "indicator": {
            "code": indicator["code"],
            "name": indicator["name"],
            "category": indicator["category"],
            "source": indicator["source"],
            "frequency": indicator["frequency"],
            "direction": indicator["direction"],
        },
        "points": points,
        "available": bool(points),
        "unavailability_reason": (
            None if points else
            "Not available for this country/indicator."
        ),
    }


@router.get("/heatmap")
def heatmap(
    countries: List[str] = Query(..., description="ISO3 codes"),
    codes: List[str] = Query(..., description="Indicator codes"),
    db: Session = Depends(get_db),
):
    """Return a country x indicator matrix of the latest value + bucket risk."""
    from scoring import _bucket_risk, _latest_obs, _weight_adjustment  # local import to avoid cycle

    cells = []
    for c in countries:
        c_iso = c.upper()
        for code in codes:
            indicator = INDICATOR_BY_CODE.get(code)
            if not indicator:
                continue
            latest, _ = _latest_obs(db, c_iso, code)
            if not latest or latest.value is None:
                cells.append({
                    "country": c_iso,
                    "code": code,
                    "value": None,
                    "risk": None,
                    "period": None,
                    "source": indicator["source"],
                    "source_url": indicator["source_url_template"].format(iso3=c_iso) if "{iso3}" in indicator["source_url_template"] else indicator["source_url_template"],
                    "available": False,
                })
                continue
            risk = _bucket_risk(latest.value, indicator)
            cells.append({
                "country": c_iso,
                "code": code,
                "value": latest.value,
                "risk": risk,
                "period": latest.period,
                "source": indicator["source"],
                "source_url": latest.source_url,
                "available": True,
            })
    return {"cells": cells}
