"""GET endpoints for filter options."""
from __future__ import annotations

from fastapi import APIRouter

from data.reference import COUNTRIES, SECTORS, INDICATORS

router = APIRouter(prefix="/api/filters", tags=["filters"])


@router.get("/countries")
def countries():
    return {"items": COUNTRIES, "source": "Bundled catalog (ISO3)", "count": len(COUNTRIES)}


@router.get("/sectors")
def sectors():
    return {"items": SECTORS, "count": len(SECTORS)}


@router.get("/risk-categories")
def risk_categories():
    cats = sorted({ind["category"] for ind in INDICATORS})
    return {"items": cats}


@router.get("/indicators")
def indicators():
    """Returns the public indicator catalog with thresholds and source info."""
    public = []
    for ind in INDICATORS:
        public.append({
            "code": ind["code"],
            "name": ind["name"],
            "category": ind["category"],
            "source": ind["source"],
            "source_series_id": ind["source_series_id"],
            "unit": ind["unit"],
            "frequency": ind["frequency"],
            "direction": ind["direction"],
            "weight": ind["weight"],
            "buckets": ind["buckets"],
            "notes": ind["notes"],
        })
    return {"items": public, "count": len(public)}
