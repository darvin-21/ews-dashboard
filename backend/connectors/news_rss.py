"""
RSS news aggregator.

We pull from official, free RSS feeds:
  - Federal Reserve Board press releases
  - ECB press
  - BIS central bank speeches
  - World Bank press (best-effort; sometimes 403-rate-limits non-browser UAs)
  - IMF press (best-effort)

Items are parsed and persisted. Country attribution is heuristic: we match
country names / ISO codes in the title or summary. The UI surfaces this
as a hint, not a fact.

feedparser handles the HTTP and XML parsing; we just normalise.
"""
from __future__ import annotations

import datetime as dt
import logging
from dataclasses import dataclass
from typing import List, Optional

import feedparser

from data.reference import COUNTRIES

logger = logging.getLogger(__name__)


@dataclass
class NewsRecord:
    source: str
    title: str
    link: str
    summary: Optional[str]
    published: Optional[dt.datetime]
    country_hint: Optional[str]


FEEDS = [
    ("Federal Reserve", "https://www.federalreserve.gov/feeds/press_all.xml"),
    ("ECB", "https://www.ecb.europa.eu/rss/press.html"),
    ("BIS speeches", "https://www.bis.org/doclist/cbspeeches.rss"),
    ("World Bank press", "https://www.worldbank.org/en/news/all/rss"),
    ("IMF news", "https://www.imf.org/en/News/rss?Language=ENG&Series=News%20Articles"),
]


def _infer_country(text: str) -> Optional[str]:
    if not text:
        return None
    lower = text.lower()
    for c in COUNTRIES:
        # match name (case-insensitive) or iso codes as standalone tokens
        if c["name"].lower() in lower:
            return c["iso3"]
    # second pass: ISO codes
    tokens = {t.strip(".,;:()[]") for t in text.split()}
    for c in COUNTRIES:
        if c["iso3"] in tokens or c["iso2"] in tokens:
            return c["iso3"]
    return None


def fetch_all() -> List[NewsRecord]:
    """Synchronous — feedparser is sync, called from the scheduler thread."""
    records: List[NewsRecord] = []
    for label, url in FEEDS:
        try:
            # request_headers gives us a more realistic UA than feedparser's default
            parsed = feedparser.parse(
                url,
                request_headers={"User-Agent": "Mozilla/5.0 (compatible; EWS-Dashboard/1.0)"},
            )
            if getattr(parsed, "bozo", False) and not parsed.entries:
                logger.warning("RSS feed %s parsed empty: %s", label, parsed.bozo_exception)
                continue
            for entry in parsed.entries[:50]:
                pub = None
                if getattr(entry, "published_parsed", None):
                    pub = dt.datetime(*entry.published_parsed[:6])
                elif getattr(entry, "updated_parsed", None):
                    pub = dt.datetime(*entry.updated_parsed[:6])
                title = getattr(entry, "title", "") or ""
                summary = getattr(entry, "summary", "") or ""
                link = getattr(entry, "link", "") or ""
                hint = _infer_country(title + " " + summary)
                records.append(
                    NewsRecord(
                        source=label,
                        title=title.strip(),
                        link=link.strip(),
                        summary=summary.strip()[:1000],
                        published=pub,
                        country_hint=hint,
                    )
                )
        except Exception as e:  # noqa: BLE001
            logger.warning("RSS feed %s failed: %s", label, e)
    return records
