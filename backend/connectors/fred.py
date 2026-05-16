"""
FRED (St. Louis Fed) connector.

Endpoint:
  https://api.stlouisfed.org/fred/series/observations?series_id={ID}&api_key={KEY}&file_type=json

Requires a free API key. If FRED_API_KEY is unset, returns []
and the indicator will show 'Data unavailable' with a reference to FRED.
Sign up: https://fred.stlouisfed.org/docs/api/api_key.html
"""
from __future__ import annotations

import datetime as dt
import logging
from typing import List

from config import settings

from .base import BaseConnector, Observation

logger = logging.getLogger(__name__)

BASE = "https://api.stlouisfed.org/fred/series/observations"


class FREDConnector(BaseConnector):
    SOURCE = "FRED"

    @property
    def available(self) -> bool:
        return bool(settings.fred_api_key)

    async def fetch(self, country_iso3: str, indicator: dict) -> List[Observation]:
        if not self.available:
            return []
        series = indicator["source_series_id"]
        # FRED series are global / US-centric. We attach the iso3 of the requesting
        # country only for storage convenience; the source_url makes the scope clear.
        url = (
            f"{BASE}?series_id={series}&api_key={settings.fred_api_key}"
            f"&file_type=json&observation_start=2015-01-01"
        )
        async with await self._client() as client:
            r = await client.get(url)
            r.raise_for_status()
            payload = r.json()
        observations = payload.get("observations", [])
        now = dt.datetime.utcnow()
        out: List[Observation] = []
        for row in observations:
            date_s = row.get("date")
            val_s = row.get("value")
            if val_s in (".", None, ""):
                value = None
            else:
                try:
                    value = float(val_s)
                except ValueError:
                    value = None
            out.append(
                Observation(
                    country_iso3=country_iso3,
                    indicator_code=indicator["code"],
                    source=self.SOURCE,
                    source_series_id=series,
                    period=date_s,
                    value=value,
                    unit=indicator.get("unit"),
                    source_url=indicator["source_url_template"],
                    fetched_at=now,
                )
            )
        return out
