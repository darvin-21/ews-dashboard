"""
IMF DataMapper API connector.

Endpoint shape:
  https://www.imf.org/external/datamapper/api/v1/{INDICATOR}/{ISO3}

Returns JSON of the form:
  {"values": {"{INDICATOR}": {"{ISO3}": {"YYYY": value, ...}}}}

Public, no key required. WEO + Fiscal Monitor + IFS subsets exposed.
Lists of available indicators: https://www.imf.org/external/datamapper/api/v1/indicators
"""
from __future__ import annotations

import datetime as dt
import logging
from typing import List

import httpx

from .base import BaseConnector, Observation

logger = logging.getLogger(__name__)

BASE = "https://www.imf.org/external/datamapper/api/v1"


class IMFConnector(BaseConnector):
    SOURCE = "IMF"

    async def _client(self) -> httpx.AsyncClient:
        # IMF DataMapper blocks custom User-Agents. Use httpx default headers.
        return httpx.AsyncClient(timeout=self.timeout, follow_redirects=True)

    async def fetch(self, country_iso3: str, indicator: dict) -> List[Observation]:
        series = indicator["source_series_id"]
        url = f"{BASE}/{series}/{country_iso3}"
        out: List[Observation] = []
        async with await self._client() as client:
            r = await client.get(url)
            if r.status_code == 404:
                return out
            r.raise_for_status()
            payload = r.json()
        values = (
            payload.get("values", {}).get(series, {}).get(country_iso3, {})
        )
        if not values:
            return out
        now = dt.datetime.utcnow()
        for year, val in values.items():
            try:
                v = float(val) if val is not None else None
            except (TypeError, ValueError):
                v = None
            out.append(
                Observation(
                    country_iso3=country_iso3,
                    indicator_code=indicator["code"],
                    source=self.SOURCE,
                    source_series_id=series,
                    period=str(year),
                    value=v,
                    unit=indicator.get("unit"),
                    source_url=indicator["source_url_template"].format(iso3=country_iso3),
                    fetched_at=now,
                )
            )
        return out
