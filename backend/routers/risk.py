"""Risk assessment endpoint."""
from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from scoring import compute_risk, assessment_to_dict

router = APIRouter(prefix="/api/risk", tags=["risk"])


@router.get("/assess")
def assess(
    country: str = Query(..., min_length=3, max_length=3),
    sector: str = Query("macro"),
    indicators: Optional[List[str]] = Query(None, description="Limit to specific indicator codes"),
    to_year: Optional[int] = Query(None, description="As-of year: only use observations <= this year"),
    db: Session = Depends(get_db),
):
    assessment = compute_risk(
        db,
        country_iso3=country.upper(),
        sector_code=sector,
        selected_indicator_codes=indicators,
        to_year=to_year,
    )
    return assessment_to_dict(assessment)
