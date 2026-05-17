"""Side-by-side comparison endpoint: up to 4 countries at once."""
from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from data.reference import INDICATOR_BY_CODE, COUNTRY_BY_ISO3
from database import get_db
from scoring import compute_risk, assessment_to_dict, _COUNTRY_LABEL, _SECTOR_LABEL

router = APIRouter(prefix="/api/compare", tags=["compare"])


def _build_comparison_commentary(items: list) -> str:
    """Auto-generated narrative across the selected countries."""
    if not items or len(items) < 2:
        return ""

    n = len(items)
    by_score = sorted(items, key=lambda a: a["composite_score"], reverse=True)
    worst = by_score[0]
    best = by_score[-1]
    worst_name = _COUNTRY_LABEL.get(worst["country_iso3"], worst["country_iso3"])
    best_name = _COUNTRY_LABEL.get(best["country_iso3"], best["country_iso3"])
    sector = _SECTOR_LABEL.get(items[0]["sector_code"], items[0]["sector_code"])

    # Find widest gap across the common available indicators
    by_country = {a["country_iso3"]: a for a in items}
    gap_winner = None  # (code, range_size, lo_country, lo_val, hi_country, hi_val, name, unit)
    common_codes = None
    for a in items:
        codes = {s["code"] for s in a["indicators"] if s.get("available")}
        common_codes = codes if common_codes is None else (common_codes & codes)
    for code in (common_codes or set()):
        vals = []
        for a in items:
            for s in a["indicators"]:
                if s["code"] == code and s.get("available") and s.get("bucket_risk") is not None:
                    vals.append((a["country_iso3"], s["bucket_risk"], s.get("value"), s.get("unit") or ""))
        if len(vals) < 2:
            continue
        vals.sort(key=lambda x: x[1])
        lo_c, lo_r, lo_v, _u = vals[0]
        hi_c, hi_r, hi_v, unit = vals[-1]
        rng = hi_r - lo_r
        ind = INDICATOR_BY_CODE.get(code, {})
        name = ind.get("name", code)
        if not gap_winner or rng > gap_winner[1]:
            gap_winner = (code, rng, lo_c, lo_v, hi_c, hi_v, name, unit)

    def fmtval(v):
        if isinstance(v, float):
            return f"{v:.2f}".rstrip("0").rstrip(".")
        return str(v)

    line1 = (
        f"Comparing {n} economies in the {sector} sector: "
        f"{worst_name} carries the highest composite risk at {worst['composite_score']:.1f}/100 "
        f"({worst['band']}), while {best_name} is lowest at {best['composite_score']:.1f}/100 "
        f"({best['band']}) — a {(worst['composite_score']-best['composite_score']):.1f}-point spread."
    )

    if gap_winner:
        code, rng, lo_c, lo_v, hi_c, hi_v, name, unit = gap_winner
        lo_name = _COUNTRY_LABEL.get(lo_c, lo_c)
        hi_name = _COUNTRY_LABEL.get(hi_c, hi_c)
        line2 = (
            f"Widest single-indicator gap is on {name}: "
            f"{lo_name} reads {fmtval(lo_v)} {unit}".strip()
            + f" vs {hi_name} at {fmtval(hi_v)} {unit}".rstrip()
            + f" — a {rng:.0f}-point risk-score difference."
        )
    else:
        line2 = ""

    total_warn = sum(len(a.get("warning_signals", [])) for a in items)
    total_det = sum(len(a.get("deteriorating", [])) for a in items)
    total_imp = sum(len(a.get("improving", [])) for a in items)
    line3 = (
        f"In aggregate across these {n} economies: {total_warn} warning signals are firing, "
        f"{total_det} indicators are deteriorating and {total_imp} are improving versus prior periods."
    )

    return " ".join(filter(None, [line1, line2, line3]))


@router.get("")
def compare(
    countries: str = Query(..., description="Comma-separated ISO3 codes, 2-4 items"),
    sector: str = Query("macro"),
    to_year: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    codes = [c.strip().upper() for c in countries.split(",") if c.strip()]
    if len(codes) < 2 or len(codes) > 4:
        raise HTTPException(status_code=400, detail="Pick 2-4 countries to compare.")
    for c in codes:
        if c not in COUNTRY_BY_ISO3:
            raise HTTPException(status_code=400, detail=f"Unknown country code: {c}")

    items = []
    for c in codes:
        a = compute_risk(db, country_iso3=c, sector_code=sector, to_year=to_year)
        items.append(assessment_to_dict(a))

    commentary = _build_comparison_commentary(items)
    return {"items": items, "commentary": commentary, "sector": sector}
