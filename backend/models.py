"""ORM models. Designed for cache, not analytics."""
from __future__ import annotations

import datetime as dt

from sqlalchemy import Column, DateTime, Float, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped

from database import Base


class IndicatorObservation(Base):
    """One observation = (country, indicator, period, value, source)."""

    __tablename__ = "indicator_observations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    country_iso3 = Column(String(3), index=True, nullable=False)
    indicator_code = Column(String(64), index=True, nullable=False)  # internal canonical code
    source = Column(String(32), nullable=False)  # WORLD_BANK | IMF | ECB | FRED | ...
    source_series_id = Column(String(128), nullable=False)  # original series id at source
    period = Column(String(16), nullable=False)  # YYYY or YYYY-MM or YYYY-MM-DD
    value = Column(Float, nullable=True)  # nullable: source may report null
    unit = Column(String(32), nullable=True)
    fetched_at = Column(DateTime, default=dt.datetime.utcnow, nullable=False)
    source_url = Column(Text, nullable=False)

    __table_args__ = (
        UniqueConstraint("country_iso3", "indicator_code", "period", "source", name="uq_obs"),
        Index("ix_country_indicator", "country_iso3", "indicator_code"),
    )


class FetchLog(Base):
    """Audit trail of fetch attempts. Useful for the methodology page."""

    __tablename__ = "fetch_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    source = Column(String(32), nullable=False)
    target = Column(String(256), nullable=False)
    started_at = Column(DateTime, default=dt.datetime.utcnow, nullable=False)
    finished_at = Column(DateTime, nullable=True)
    ok = Column(Integer, nullable=False, default=0)  # 0 / 1
    rows_written = Column(Integer, nullable=False, default=0)
    error = Column(Text, nullable=True)


class NewsItem(Base):
    """Cached RSS items."""

    __tablename__ = "news_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    source = Column(String(64), nullable=False, index=True)
    title = Column(Text, nullable=False)
    link = Column(Text, nullable=False)
    summary = Column(Text, nullable=True)
    published = Column(DateTime, nullable=True, index=True)
    fetched_at = Column(DateTime, default=dt.datetime.utcnow, nullable=False)
    country_hint = Column(String(3), nullable=True, index=True)

    __table_args__ = (UniqueConstraint("source", "link", name="uq_news"),)
