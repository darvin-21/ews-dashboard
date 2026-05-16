"""
BIS connector — STUB.

The BIS publishes statistical bulletins as SDMX 2.1 and CSV at
  https://data.bis.org/

A full integration requires walking specific dataset codes (e.g. CBS, LBS,
CRE, PP) and series keys. This is doable without an API key but each
dataset has a different dimensional schema, so we leave this as a modular
TODO rather than fake the data.

If you want to extend, start here:
  - https://data.bis.org/topics/CBS (credit to non-bank sector)
  - https://data.bis.org/topics/CRE (credit/GDP gap)
  - https://data.bis.org/topics/PP  (property prices)

For credit-cycle indicators, the World Bank `FS.AST.PRVT.GD.ZS` series is
already wired in `world_bank.py` as a practical approximation.
"""
from __future__ import annotations

from typing import List

from .base import BaseConnector, Observation


class BISConnector(BaseConnector):
    SOURCE = "BIS"

    async def fetch(self, country_iso3: str, indicator: dict) -> List[Observation]:
        # TODO: implement SDMX walks for CBS, CRE, PP datasets.
        return []
