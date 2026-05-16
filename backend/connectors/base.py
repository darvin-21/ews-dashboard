"""Connector base class. Each connector returns a list of normalised observations."""
from __future__ import annotations

import datetime as dt
import logging
from dataclasses import dataclass
from typing import List, Optional

import httpx

logger = logging.getLogger(__name__)


@dataclass
class Observation:
    country_iso3: str
    indicator_code: str
    source: str
    source_series_id: str
    period: str  # ISO-ish: YYYY, YYYY-MM, YYYY-MM-DD
    value: Optional[float]
    unit: Optional[str]
    source_url: str
    fetched_at: dt.datetime


class BaseConnector:
    SOURCE: str = "BASE"

    def __init__(self, timeout: float = 20.0):
        self.timeout = timeout

    async def _client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(
            timeout=self.timeout,
            follow_redirects=True,
            headers={
                "User-Agent": "EWS-Dashboard/1.0 (research/educational)",
                "Accept": "application/json, text/xml, application/xml, */*",
            },
        )

    async def fetch(self, country_iso3: str, indicator: dict) -> List[Observation]:
        raise NotImplementedError
