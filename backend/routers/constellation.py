"""Constellation: 2D scatter — score vs confidence, plus warning count + band, for all countries."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from data.reference import COUNTRY_BY_ISO3
from scoring import compute_risk

router = APIRouter(prefix="/api/constellation", tags=["constellation"])


@router.get("")
def constellation(sector: str = Query("macro"), db: Session = Depends(get_db)):
    points = []
    for iso, meta in COUNTRY_BY_ISO3.items():
        a = compute_risk(db, country_iso3=iso, sector_code=sector)
        points.append({
            "iso3": iso,
            "name": meta.get("name", iso),
            "region": meta.get("region", ""),
            "score": a.composite_score,
            "confidence": round(a.composite_confidence * 100, 1),
            "warnings": len(a.warning_signals),
            "deteriorating": len(a.deteriorating),
            "band": a.band,
        })
    return {"sector": sector, "points": points}
