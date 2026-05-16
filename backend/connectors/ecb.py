"""
ECB Statistical Data Warehouse (SDMX 2.1 JSON) connector.

Endpoint shape:
  https://data-api.ecb.europa.eu/service/data/{FLOWREF}/{SERIES_KEY}?format=jsondata

Public, no key required. Often gzip-encoded.

Used here for: euro area aggregate indicators (HICP, MRO rate, etc).
Not used for non-euro-area series. Country mapping note: for euro area we
treat U2 series as applicable to DEU/FRA/ITA/ESP for completeness; the
methodology page makes this explicit.
"""
from __future__ import annotations

import datetime as dt
import logging
from typing import List

from .base import BaseConnector, Observation

logger = logging.getLogger(__name__)

BASE = "https://data-api.ecb.europa.eu/service/data"


class ECBConnector(BaseConnector):
    SOURCE = "ECB"

    async def fetch_series(self, flowref: str, series_key: str, last_n: int = 60) -> List[dict]:
        url = f"{BASE}/{flowref}/{series_key}?format=jsondata&lastNObservations={last_n}"
        async with await self._client() as client:
            r = await client.get(url, headers={"Accept": "application/json"})
            r.raise_for_status()
            payload = r.json()
        # SDMX JSON: dataSets[0].series.{key}.observations.{obsIdx}: [value, ...]
        # structure: structure.dimensions.observation[0].values -> list of {id: period}
        try:
            obs_dim = payload["structure"]["dimensions"]["observation"][0]["values"]
            series_obj = payload["dataSets"][0]["series"]
            # exactly one series key when fully qualified
            first_series = next(iter(series_obj.values()))
            observations = first_series["observations"]
        except (KeyError, IndexError, StopIteration):
            return []
        out: List[dict] = []
        for k, v in observations.items():
            idx = int(k)
            period = obs_dim[idx]["id"]
            val = v[0]
            try:
                f = float(val) if val is not None else None
            except (TypeError, ValueError):
                f = None
            out.append({"period": period, "value": f})
        return out
