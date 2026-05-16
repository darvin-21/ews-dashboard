"""Sources/admin endpoints: fetch log + manual refresh trigger."""
from __future__ import annotations

import asyncio
import logging

from fastapi import APIRouter, BackgroundTasks, Depends, Query
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from database import get_db
from models import FetchLog, IndicatorObservation, NewsItem
from scheduler import refresh_indicators_async, refresh_news_sync

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["sources"])


@router.get("/sources/log")
def fetch_log(
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
):
    rows = db.execute(
        select(FetchLog).order_by(desc(FetchLog.started_at)).limit(limit)
    ).scalars().all()
    return {
        "items": [
            {
                "id": r.id,
                "source": r.source,
                "target": r.target,
                "started_at": r.started_at.isoformat() + "Z",
                "finished_at": r.finished_at.isoformat() + "Z" if r.finished_at else None,
                "ok": bool(r.ok),
                "rows_written": r.rows_written,
                "error": r.error,
            }
            for r in rows
        ]
    }


@router.get("/sources/summary")
def summary(db: Session = Depends(get_db)):
    obs_total = db.execute(select(func.count(IndicatorObservation.id))).scalar_one()
    news_total = db.execute(select(func.count(NewsItem.id))).scalar_one()
    by_source = db.execute(
        select(IndicatorObservation.source, func.count(IndicatorObservation.id))
        .group_by(IndicatorObservation.source)
    ).all()
    last_fetch = db.execute(
        select(func.max(IndicatorObservation.fetched_at))
    ).scalar_one()
    return {
        "indicator_observations": obs_total,
        "news_items": news_total,
        "by_source": [{"source": s, "rows": n} for s, n in by_source],
        "last_indicator_fetch_at": last_fetch.isoformat() + "Z" if last_fetch else None,
    }


@router.post("/admin/refresh")
async def trigger_refresh(background: BackgroundTasks):
    """Kick a manual refresh in the background. Returns immediately."""
    background.add_task(lambda: asyncio.run(refresh_indicators_async()))
    background.add_task(refresh_news_sync)
    return {"started": True, "message": "Refresh enqueued in background."}
