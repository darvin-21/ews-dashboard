"""
APScheduler-driven refresh.

Two jobs:
  1. refresh_indicators — pulls all (country, indicator) pairs through the
     connector matching each indicator's source.
  2. refresh_news — pulls RSS feeds.

The scheduler runs in-process. On startup we kick off an immediate refresh
if the database is empty so the user has data on first load.
"""
from __future__ import annotations

import asyncio
import datetime as dt
import logging
from typing import List

from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy import select
from sqlalchemy.dialects.sqlite import insert as sqlite_insert

from config import settings
from connectors import CONNECTORS
from data.reference import COUNTRIES, INDICATORS
from database import SessionLocal
from models import IndicatorObservation, NewsItem, FetchLog
from connectors.news_rss import fetch_all as fetch_news

logger = logging.getLogger(__name__)


async def _refresh_country_indicator(country_iso3: str, indicator: dict) -> int:
    connector = CONNECTORS.get(indicator["source"])
    if connector is None:
        return 0
    if indicator["source"] == "FRED" and not connector.available:
        return 0
    # Only fetch FRED commodity/market series once (for USA) — they're global.
    if indicator["source"] == "FRED" and country_iso3 != "USA":
        if indicator["code"] not in {"brent_price", "natgas_henry_hub"}:
            return 0
    try:
        observations = await connector.fetch(country_iso3, indicator)
    except Exception as e:  # noqa: BLE001
        logger.warning("Fetch failed for %s/%s: %s", country_iso3, indicator["code"], e)
        with SessionLocal() as db:
            db.add(FetchLog(
                source=indicator["source"],
                target=f"{country_iso3}/{indicator['code']}",
                started_at=dt.datetime.utcnow(),
                finished_at=dt.datetime.utcnow(),
                ok=0, rows_written=0, error=str(e)[:1000],
            ))
            db.commit()
        return 0
    if not observations:
        return 0
    rows = []
    for o in observations:
        rows.append({
            "country_iso3": o.country_iso3,
            "indicator_code": o.indicator_code,
            "source": o.source,
            "source_series_id": o.source_series_id,
            "period": o.period,
            "value": o.value,
            "unit": o.unit,
            "fetched_at": o.fetched_at,
            "source_url": o.source_url,
        })
    written = 0
    with SessionLocal() as db:
        stmt = sqlite_insert(IndicatorObservation).values(rows)
        # ON CONFLICT — refresh value, fetched_at, source_url
        stmt = stmt.on_conflict_do_update(
            index_elements=["country_iso3", "indicator_code", "period", "source"],
            set_={
                "value": stmt.excluded.value,
                "fetched_at": stmt.excluded.fetched_at,
                "source_url": stmt.excluded.source_url,
                "unit": stmt.excluded.unit,
            },
        )
        db.execute(stmt)
        db.add(FetchLog(
            source=indicator["source"],
            target=f"{country_iso3}/{indicator['code']}",
            started_at=dt.datetime.utcnow(),
            finished_at=dt.datetime.utcnow(),
            ok=1, rows_written=len(rows),
        ))
        db.commit()
        written = len(rows)
    return written


async def refresh_indicators_async(country_iso3s: List[str] | None = None) -> int:
    countries = country_iso3s or [c["iso3"] for c in COUNTRIES]
    total = 0
    # Throttle concurrency — be polite to public APIs.
    semaphore = asyncio.Semaphore(4)

    async def task(c, ind):
        async with semaphore:
            return await _refresh_country_indicator(c, ind)

    coros = [task(c, ind) for c in countries for ind in INDICATORS]
    results = await asyncio.gather(*coros, return_exceptions=True)
    for r in results:
        if isinstance(r, int):
            total += r
    return total


def refresh_indicators_sync() -> int:
    return asyncio.run(refresh_indicators_async())


def refresh_news_sync() -> int:
    records = fetch_news()
    if not records:
        return 0
    written = 0
    with SessionLocal() as db:
        for rec in records:
            try:
                stmt = sqlite_insert(NewsItem).values(
                    source=rec.source,
                    title=rec.title,
                    link=rec.link,
                    summary=rec.summary,
                    published=rec.published,
                    country_hint=rec.country_hint,
                    fetched_at=dt.datetime.utcnow(),
                ).on_conflict_do_nothing(index_elements=["source", "link"])
                result = db.execute(stmt)
                written += result.rowcount or 0
            except Exception as e:  # noqa: BLE001
                logger.warning("News insert failed: %s", e)
        db.commit()
    return written


def kick_initial_refresh_if_empty() -> None:
    with SessionLocal() as db:
        n = db.execute(select(IndicatorObservation).limit(1)).first()
    if n is None:
        logger.info("Database is empty — kicking off initial refresh in background.")
        import threading
        threading.Thread(target=refresh_indicators_sync, daemon=True).start()
        threading.Thread(target=refresh_news_sync, daemon=True).start()


def start_scheduler() -> BackgroundScheduler:
    sched = BackgroundScheduler(timezone="UTC")
    sched.add_job(
        refresh_indicators_sync,
        "interval",
        minutes=settings.refresh_interval_min,
        id="refresh_indicators",
        next_run_time=None,
    )
    sched.add_job(
        refresh_news_sync,
        "interval",
        minutes=settings.news_refresh_interval_min,
        id="refresh_news",
        next_run_time=None,
    )
    sched.start()
    logger.info(
        "Scheduler started: indicators every %dmin, news every %dmin",
        settings.refresh_interval_min, settings.news_refresh_interval_min,
    )
    return sched
