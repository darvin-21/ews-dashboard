"""
World Bank WDI connector.

Endpoint shape:
  https://api.worldbank.org/v2/country/{ISO3}/indicator/{SERIES_ID}?format=json&per_page=200

Public, no key required. Annual cadence with 3-12 month lag.
Docs: https://datahelpdesk.worldbank.org/knowledgebase/articles/889392
"""
from __future__ import annotations

import datetime as dt
import logging
from typing import List

from .base import BaseConnector, Observation

logger = logging.getLogger(__name__)

BASE = "https://api.worldbank.org/v2"


class WorldBankConnector(BaseConnector):
    SOURCE = "WORLD_BANK"

    async def fetch(self, country_iso3: str, indicator: dict) -> List[Observation]:
        series = indicator["source_series_id"]
        url = f"{BASE}/country/{country_iso3}/indicator/{series}?format=json&per_page=200"
        out: List[Observation] = []
        async with await self._client() as client:
            r = await client.get(url)
            r.raise_for_status()
            payload = r.json()
        # payload is [meta, data] for valid responses
        if not isinstance(payload, list) or len(payload) < 2 or payload[1] is None:
            return out
        now = dt.datetime.utcnow()
        for row in payload[1]:
            year = row.get("date")
            value = row.get("value")
            if year is None:
                continue
            out.append(
                Observation(
                    country_iso3=country_iso3,
                    indicator_code=indicator["code"],
                    source=self.SOURCE,
                    source_series_id=series,
                    period=str(year),
                    value=float(value) if value is not None else None,
                    unit=indicator.get("unit"),
                    source_url=indicator["source_url_template"].format(iso3=country_iso3),
                    fetched_at=now,
                )
            )
        return out
