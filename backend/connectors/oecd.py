"""
OECD connector — STUB.

OECD's data API moved to https://sdmx.oecd.org/public/rest/data/{DATASET}/{KEY}
Each dataset (e.g. KEI, MEI, EO) has its own key structure. Rather than fake
data, we expose this as a modular extension point.

Reference:
  - https://data-explorer.oecd.org/
  - https://sdmx.oecd.org/public/rest/dataflow/OECD/{DATASET}
"""
from __future__ import annotations

from typing import List

from .base import BaseConnector, Observation


class OECDConnector(BaseConnector):
    SOURCE = "OECD"

    async def fetch(self, country_iso3: str, indicator: dict) -> List[Observation]:
        # TODO: implement specific datasets when needed.
        return []
