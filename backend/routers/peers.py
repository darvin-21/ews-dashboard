"""Closest peers: find countries whose risk-indicator vector most resembles a given country today."""
from __future__ import annotations

from typing import Optional, List
import math

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from data.reference import COUNTRY_BY_ISO3
from scoring import compute_risk, _COUNTRY_LABEL

router = APIRouter(prefix="/api/peers", tags=["peers"])


def _indicator_vector(assessment_dict) -> dict:
    """Map indicator_code -> bucket_risk for available indicators."""
    out = {}
    for s in assessment_dict.get("indicators", []):
        if s.get("available") and s.get("bucket_risk") is not None:
            out[s["code"]] = float(s["bucket_risk"])
    return out


def _distance(va: dict, vb: dict) -> Optional[float]:
    common = set(va.keys()) & set(vb.keys())
    if len(common) < 4:  # need at least 4 shared indicators to be meaningful
        return None
    sq = sum((va[c] - vb[c]) ** 2 for c in common)
    return math.sqrt(sq / len(common))  # normalize by # of dims


@router.get("")
def peers(
    country: str = Query(..., min_length=3, max_length=3),
    sector: str = Query("macro"),
    top_n: int = Query(3, ge=1, le=10),
    db: Session = Depends(get_db),
):
    """For the given country, find the top_n other countries with the most similar indicator pattern."""
    target_iso = country.upper()
    if target_iso not in COUNTRY_BY_ISO3:
        return {"country": target_iso, "peers": []}

    from scoring import assessment_to_dict
    target = assessment_to_dict(compute_risk(db, country_iso3=target_iso, sector_code=sector))
    target_vec = _indicator_vector(target)

    results = []
    for iso, meta in COUNTRY_BY_ISO3.items():
        if iso == target_iso:
            continue
        other = assessment_to_dict(compute_risk(db, country_iso3=iso, sector_code=sector))
        other_vec = _indicator_vector(other)
        d = _distance(target_vec, other_vec)
        if d is None:
            continue
        results.append({
            "country_iso3": iso,
            "country_name": meta.get("name", iso),
            "distance": round(d, 2),
            "composite_score": other["composite_score"],
            "band": other["band"],
        })

    results.sort(key=lambda x: x["distance"])
    return {
        "country": target_iso,
        "country_name": _COUNTRY_LABEL.get(target_iso, target_iso),
        "target_score": target["composite_score"],
        "target_band": target["band"],
        "peers": results[:top_n],
    }
