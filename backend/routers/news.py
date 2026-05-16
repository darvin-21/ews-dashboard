"""News feed endpoint."""
from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc, or_, select
from sqlalchemy.orm import Session

from database import get_db
from models import NewsItem

router = APIRouter(prefix="/api/news", tags=["news"])


@router.get("/feed")
def feed(
    country: Optional[str] = Query(None, description="ISO3 filter (also returns global items)"),
    keywords: Optional[List[str]] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    stmt = select(NewsItem)
    if country:
        c = country.upper()
        stmt = stmt.where(or_(NewsItem.country_hint == c, NewsItem.country_hint.is_(None)))
    if keywords:
        for kw in keywords:
            stmt = stmt.where(or_(NewsItem.title.ilike(f"%{kw}%"), NewsItem.summary.ilike(f"%{kw}%")))
    stmt = stmt.order_by(desc(NewsItem.published), desc(NewsItem.fetched_at)).limit(limit)
    rows = db.execute(stmt).scalars().all()
    items = [
        {
            "id": r.id,
            "source": r.source,
            "title": r.title,
            "link": r.link,
            "summary": r.summary,
            "published": r.published.isoformat() + "Z" if r.published else None,
            "fetched_at": r.fetched_at.isoformat() + "Z",
            "country_hint": r.country_hint,
        }
        for r in rows
    ]
    return {"items": items, "count": len(items)}
