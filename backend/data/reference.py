"""
Canonical reference data:

- COUNTRIES: ISO3 + display name + World Bank/IMF region
- SECTORS: high-level sector taxonomy and indicator overlay weights
- INDICATORS: each indicator carries
    * canonical code
    * source mapping (which connector, which series id)
    * direction ("higher_is_riskier" or "lower_is_riskier" or "deviation_from_target")
    * threshold buckets that map values -> 0..100 risk contribution
    * weight (in the composite)
    * unit, frequency, description
    * source URL template (for citation)

Thresholds are deliberately transparent and conservative. They are based on
publicly available reference frames (IMF Fiscal Monitor / WEO discussion,
BIS credit-gap working papers, Reinhart-Rogoff debt thresholds). They are
NOT a model calibration — they are a transparent prior. Edit freely.
"""
from __future__ import annotations

from typing import Dict, List, Literal, TypedDict


class ThresholdBucket(TypedDict):
    """A bucket maps an interval (lo, hi] to a risk score 0..100."""
    lo: float  # -inf sentinel allowed via -1e18
    hi: float  # +inf sentinel allowed via  1e18
    risk: float  # 0..100


class IndicatorDef(TypedDict):
    code: str
    name: str
    category: Literal[
        "macro", "fiscal", "external", "monetary", "financial",
        "real_economy", "commodity", "market", "credit", "sector"
    ]
    source: Literal["WORLD_BANK", "IMF", "ECB", "FRED", "BIS", "NEWS"]
    source_series_id: str
    unit: str
    frequency: Literal["annual", "quarterly", "monthly", "daily"]
    direction: Literal["higher_is_riskier", "lower_is_riskier"]
    weight: float  # default weight in the composite
    buckets: List[ThresholdBucket]
    source_url_template: str
    notes: str


NEG_INF = -1e18
POS_INF = 1e18


# ---------------------------------------------------------------------------
# Countries
# ---------------------------------------------------------------------------
COUNTRIES: List[Dict[str, str]] = [
    {"iso3": "USA", "iso2": "US", "name": "United States", "region": "North America"},
    {"iso3": "GBR", "iso2": "GB", "name": "United Kingdom", "region": "Europe"},
    {"iso3": "DEU", "iso2": "DE", "name": "Germany", "region": "Europe"},
    {"iso3": "FRA", "iso2": "FR", "name": "France", "region": "Europe"},
    {"iso3": "ITA", "iso2": "IT", "name": "Italy", "region": "Europe"},
    {"iso3": "ESP", "iso2": "ES", "name": "Spain", "region": "Europe"},
    {"iso3": "JPN", "iso2": "JP", "name": "Japan", "region": "Asia"},
    {"iso3": "CHN", "iso2": "CN", "name": "China", "region": "Asia"},
    {"iso3": "IND", "iso2": "IN", "name": "India", "region": "Asia"},
    {"iso3": "KOR", "iso2": "KR", "name": "South Korea", "region": "Asia"},
    {"iso3": "SGP", "iso2": "SG", "name": "Singapore", "region": "Asia"},
    {"iso3": "ARE", "iso2": "AE", "name": "United Arab Emirates", "region": "MENA"},
    {"iso3": "SAU", "iso2": "SA", "name": "Saudi Arabia", "region": "MENA"},
    {"iso3": "TUR", "iso2": "TR", "name": "Türkiye", "region": "MENA"},
    {"iso3": "EGY", "iso2": "EG", "name": "Egypt", "region": "MENA"},
    {"iso3": "ZAF", "iso2": "ZA", "name": "South Africa", "region": "Africa"},
    {"iso3": "NGA", "iso2": "NG", "name": "Nigeria", "region": "Africa"},
    {"iso3": "BRA", "iso2": "BR", "name": "Brazil", "region": "LATAM"},
    {"iso3": "MEX", "iso2": "MX", "name": "Mexico", "region": "LATAM"},
    {"iso3": "ARG", "iso2": "AR", "name": "Argentina", "region": "LATAM"},
    {"iso3": "AUS", "iso2": "AU", "name": "Australia", "region": "Oceania"},
    {"iso3": "NZL", "iso2": "NZ", "name": "New Zealand", "region": "Oceania"},
    {"iso3": "CAN", "iso2": "CA", "name": "Canada", "region": "North America"},
]


# ---------------------------------------------------------------------------
# Sectors — high-level overlay. Sector-specific indicators come on top of
# the country macro stack.
# ---------------------------------------------------------------------------
SECTORS: List[Dict] = [
    {
        "code": "macro",
        "name": "Macro / Sovereign",
        "description": "Cross-cutting sovereign and macro risk.",
        # No extra indicators — uses the full macro stack only.
        "indicator_overlay": [],
    },
    {
        "code": "banking",
        "name": "Banking & Financial",
        "description": "Bank credit cycle, capital, NPLs (where public).",
        "indicator_overlay": ["credit_to_gdp", "private_credit_growth", "policy_rate"],
    },
    {
        "code": "energy",
        "name": "Energy",
        "description": "Crude, gas, energy price transmission.",
        "indicator_overlay": ["brent_price", "natgas_henry_hub"],
    },
    {
        "code": "trade",
        "name": "Trade & External",
        "description": "Trade flows, current account, FX.",
        "indicator_overlay": ["exports_goods_services_pct_gdp", "current_account_gdp", "reer"],
    },
    {
        "code": "construction",
        "name": "Construction & Real Estate",
        "description": "House prices, construction activity, mortgage credit.",
        "indicator_overlay": ["credit_to_gdp", "private_credit_growth"],
    },
    {
        "code": "manufacturing",
        "name": "Manufacturing",
        "description": "Industrial production, exports, PMI (where public).",
        "indicator_overlay": ["exports_goods_services_pct_gdp"],
    },
    {
        "code": "tech",
        "name": "Technology",
        "description": "Limited public macro overlay; news signal weighted.",
        "indicator_overlay": [],
    },
]


# ---------------------------------------------------------------------------
# Indicator catalog.
#
# Source notes:
#   WORLD_BANK series ids: see https://data.worldbank.org and
#     https://api.worldbank.org/v2/indicator?per_page=20000
#   IMF series ids: see https://www.imf.org/external/datamapper/api/v1/indicators
#   ECB series ids: see https://data.ecb.europa.eu/
#   FRED series ids: see https://fred.stlouisfed.org/
# ---------------------------------------------------------------------------
INDICATORS: List[IndicatorDef] = [
    # ----------------- Macro -----------------
    {
        "code": "gdp_growth",
        "name": "Real GDP growth",
        "category": "macro",
        "source": "WORLD_BANK",
        "source_series_id": "NY.GDP.MKTP.KD.ZG",
        "unit": "% y/y",
        "frequency": "annual",
        "direction": "lower_is_riskier",
        "weight": 1.5,
        "buckets": [
            {"lo": NEG_INF, "hi": -2.0, "risk": 95},
            {"lo": -2.0, "hi": 0.0, "risk": 75},
            {"lo": 0.0, "hi": 1.5, "risk": 55},
            {"lo": 1.5, "hi": 3.0, "risk": 30},
            {"lo": 3.0, "hi": POS_INF, "risk": 10},
        ],
        "source_url_template": "https://data.worldbank.org/indicator/NY.GDP.MKTP.KD.ZG?locations={iso3}",
        "notes": "World Bank WDI. Annual frequency, lagged ~3-9 months.",
    },
    {
        "code": "inflation_cpi",
        "name": "CPI inflation",
        "category": "macro",
        "source": "WORLD_BANK",
        "source_series_id": "FP.CPI.TOTL.ZG",
        "unit": "% y/y",
        "frequency": "annual",
        "direction": "higher_is_riskier",
        "weight": 1.2,
        "buckets": [
            {"lo": NEG_INF, "hi": 0.0, "risk": 60},  # deflation also risky
            {"lo": 0.0, "hi": 3.0, "risk": 15},
            {"lo": 3.0, "hi": 6.0, "risk": 40},
            {"lo": 6.0, "hi": 10.0, "risk": 65},
            {"lo": 10.0, "hi": 20.0, "risk": 85},
            {"lo": 20.0, "hi": POS_INF, "risk": 98},
        ],
        "source_url_template": "https://data.worldbank.org/indicator/FP.CPI.TOTL.ZG?locations={iso3}",
        "notes": "World Bank WDI. Annual CPI inflation.",
    },
    {
        "code": "unemployment",
        "name": "Unemployment rate",
        "category": "real_economy",
        "source": "WORLD_BANK",
        "source_series_id": "SL.UEM.TOTL.ZS",
        "unit": "% of labor force",
        "frequency": "annual",
        "direction": "higher_is_riskier",
        "weight": 0.8,
        "buckets": [
            {"lo": NEG_INF, "hi": 4.0, "risk": 10},
            {"lo": 4.0, "hi": 6.0, "risk": 25},
            {"lo": 6.0, "hi": 9.0, "risk": 50},
            {"lo": 9.0, "hi": 15.0, "risk": 75},
            {"lo": 15.0, "hi": POS_INF, "risk": 95},
        ],
        "source_url_template": "https://data.worldbank.org/indicator/SL.UEM.TOTL.ZS?locations={iso3}",
        "notes": "World Bank ILO modelled estimate.",
    },

    # ----------------- Fiscal -----------------
    {
        "code": "gov_debt_gdp",
        "name": "General govt gross debt / GDP",
        "category": "fiscal",
        "source": "IMF",
        "source_series_id": "GG_DEBT_GDP",  # IMF DataMapper
        "unit": "% of GDP",
        "frequency": "annual",
        "direction": "higher_is_riskier",
        "weight": 1.3,
        "buckets": [
            {"lo": NEG_INF, "hi": 30.0, "risk": 10},
            {"lo": 30.0, "hi": 60.0, "risk": 30},
            {"lo": 60.0, "hi": 90.0, "risk": 55},
            {"lo": 90.0, "hi": 130.0, "risk": 75},
            {"lo": 130.0, "hi": POS_INF, "risk": 92},
        ],
        "source_url_template": "https://www.imf.org/external/datamapper/GG_DEBT_GDP@WEO/{iso3}",
        "notes": "IMF WEO. Reinhart-Rogoff style banding (transparent prior, not a forecast).",
    },
    {
        "code": "fiscal_balance_gdp",
        "name": "General govt fiscal balance / GDP",
        "category": "fiscal",
        "source": "IMF",
        "source_series_id": "GGXCNL_NGDP",
        "unit": "% of GDP",
        "frequency": "annual",
        "direction": "lower_is_riskier",
        "weight": 1.2,
        "buckets": [
            {"lo": NEG_INF, "hi": -8.0, "risk": 92},
            {"lo": -8.0, "hi": -5.0, "risk": 75},
            {"lo": -5.0, "hi": -3.0, "risk": 55},
            {"lo": -3.0, "hi": 0.0, "risk": 30},
            {"lo": 0.0, "hi": POS_INF, "risk": 10},
        ],
        "source_url_template": "https://www.imf.org/external/datamapper/GGXCNL_NGDP@WEO/{iso3}",
        "notes": "IMF WEO general government net lending / borrowing.",
    },

    # ----------------- External -----------------
    {
        "code": "current_account_gdp",
        "name": "Current account / GDP",
        "category": "external",
        "source": "WORLD_BANK",
        "source_series_id": "BN.CAB.XOKA.GD.ZS",
        "unit": "% of GDP",
        "frequency": "annual",
        "direction": "lower_is_riskier",
        "weight": 1.0,
        "buckets": [
            {"lo": NEG_INF, "hi": -8.0, "risk": 90},
            {"lo": -8.0, "hi": -5.0, "risk": 70},
            {"lo": -5.0, "hi": -2.0, "risk": 45},
            {"lo": -2.0, "hi": 2.0, "risk": 20},
            {"lo": 2.0, "hi": POS_INF, "risk": 10},
        ],
        "source_url_template": "https://data.worldbank.org/indicator/BN.CAB.XOKA.GD.ZS?locations={iso3}",
        "notes": "Persistent large deficits flag external vulnerability.",
    },
    {
        "code": "external_debt_gni",
        "name": "External debt / GNI (low/middle income only)",
        "category": "external",
        "source": "WORLD_BANK",
        "source_series_id": "DT.DOD.DECT.GN.ZS",
        "unit": "% of GNI",
        "frequency": "annual",
        "direction": "higher_is_riskier",
        "weight": 0.8,
        "buckets": [
            {"lo": NEG_INF, "hi": 30.0, "risk": 15},
            {"lo": 30.0, "hi": 60.0, "risk": 40},
            {"lo": 60.0, "hi": 100.0, "risk": 70},
            {"lo": 100.0, "hi": POS_INF, "risk": 90},
        ],
        "source_url_template": "https://data.worldbank.org/indicator/DT.DOD.DECT.GN.ZS?locations={iso3}",
        "notes": "World Bank IDS. Reported for low/middle income only; HICs will show 'Data unavailable'.",
    },
    {
        "code": "reserves_months_imports",
        "name": "Reserves in months of imports",
        "category": "external",
        "source": "WORLD_BANK",
        "source_series_id": "FI.RES.TOTL.MO",
        "unit": "months",
        "frequency": "annual",
        "direction": "lower_is_riskier",
        "weight": 0.8,
        "buckets": [
            {"lo": NEG_INF, "hi": 2.0, "risk": 90},
            {"lo": 2.0, "hi": 4.0, "risk": 65},
            {"lo": 4.0, "hi": 6.0, "risk": 40},
            {"lo": 6.0, "hi": 12.0, "risk": 20},
            {"lo": 12.0, "hi": POS_INF, "risk": 10},
        ],
        "source_url_template": "https://data.worldbank.org/indicator/FI.RES.TOTL.MO?locations={iso3}",
        "notes": "Below 3 months is the classical adequacy threshold.",
    },
    {
        "code": "exports_goods_services_pct_gdp",
        "name": "Exports of goods & services / GDP",
        "category": "external",
        "source": "WORLD_BANK",
        "source_series_id": "NE.EXP.GNFS.ZS",
        "unit": "% of GDP",
        "frequency": "annual",
        "direction": "lower_is_riskier",  # treated as openness indicator; very low = vulnerable
        "weight": 0.4,
        "buckets": [
            {"lo": NEG_INF, "hi": 10.0, "risk": 60},
            {"lo": 10.0, "hi": 25.0, "risk": 35},
            {"lo": 25.0, "hi": 60.0, "risk": 15},
            {"lo": 60.0, "hi": POS_INF, "risk": 10},
        ],
        "source_url_template": "https://data.worldbank.org/indicator/NE.EXP.GNFS.ZS?locations={iso3}",
        "notes": "Openness proxy. Used contextually.",
    },

    # ----------------- Credit / Financial -----------------
    {
        "code": "credit_to_gdp",
        "name": "Domestic credit to private sector / GDP",
        "category": "credit",
        "source": "WORLD_BANK",
        "source_series_id": "FS.AST.PRVT.GD.ZS",
        "unit": "% of GDP",
        "frequency": "annual",
        "direction": "higher_is_riskier",  # very high levels = credit-cycle late stage
        "weight": 0.8,
        "buckets": [
            {"lo": NEG_INF, "hi": 30.0, "risk": 35},   # very thin credit also a development issue
            {"lo": 30.0, "hi": 80.0, "risk": 20},
            {"lo": 80.0, "hi": 150.0, "risk": 40},
            {"lo": 150.0, "hi": 220.0, "risk": 65},
            {"lo": 220.0, "hi": POS_INF, "risk": 85},
        ],
        "source_url_template": "https://data.worldbank.org/indicator/FS.AST.PRVT.GD.ZS?locations={iso3}",
        "notes": "BIS credit-gap framework inspired; levels here, not gap.",
    },
    {
        "code": "private_credit_growth",
        "name": "Private credit growth (proxy = change in credit/GDP)",
        "category": "credit",
        "source": "WORLD_BANK",
        "source_series_id": "FS.AST.PRVT.GD.ZS",  # derived
        "unit": "pp change",
        "frequency": "annual",
        "direction": "higher_is_riskier",
        "weight": 0.6,
        "buckets": [
            {"lo": NEG_INF, "hi": -5.0, "risk": 65},
            {"lo": -5.0, "hi": 2.0, "risk": 25},
            {"lo": 2.0, "hi": 8.0, "risk": 50},
            {"lo": 8.0, "hi": 15.0, "risk": 75},
            {"lo": 15.0, "hi": POS_INF, "risk": 92},
        ],
        "source_url_template": "https://data.worldbank.org/indicator/FS.AST.PRVT.GD.ZS?locations={iso3}",
        "notes": "Computed as YoY change in credit/GDP ratio. Excessive credit growth is a classical EWS signal.",
    },

    # ----------------- Monetary / market -----------------
    {
        "code": "policy_rate",
        "name": "Central bank policy rate (where ECB/FRED available)",
        "category": "monetary",
        "source": "FRED",  # USA + some via FRED; ECB via ECB connector handled separately
        "source_series_id": "DFF",  # FRED federal funds rate
        "unit": "%",
        "frequency": "monthly",
        "direction": "higher_is_riskier",  # tighter monetary stance = higher financial risk
        "weight": 0.5,
        "buckets": [
            {"lo": NEG_INF, "hi": 1.0, "risk": 10},
            {"lo": 1.0, "hi": 3.0, "risk": 25},
            {"lo": 3.0, "hi": 5.0, "risk": 50},
            {"lo": 5.0, "hi": 8.0, "risk": 70},
            {"lo": 8.0, "hi": POS_INF, "risk": 90},
        ],
        "source_url_template": "https://fred.stlouisfed.org/series/DFF",
        "notes": "FRED DFF for USA. Other countries: TODO via central bank connectors. ECB MRO via ECB API.",
    },

    # ----------------- Commodities (cross-country, fetched once) -----------------
    {
        "code": "brent_price",
        "name": "Brent crude (USD/bbl)",
        "category": "commodity",
        "source": "FRED",
        "source_series_id": "DCOILBRENTEU",
        "unit": "USD/bbl",
        "frequency": "daily",
        "direction": "higher_is_riskier",  # importer-centric default
        "weight": 0.3,
        "buckets": [
            {"lo": NEG_INF, "hi": 40.0, "risk": 60},
            {"lo": 40.0, "hi": 70.0, "risk": 25},
            {"lo": 70.0, "hi": 95.0, "risk": 45},
            {"lo": 95.0, "hi": 120.0, "risk": 70},
            {"lo": 120.0, "hi": POS_INF, "risk": 90},
        ],
        "source_url_template": "https://fred.stlouisfed.org/series/DCOILBRENTEU",
        "notes": "Default treats high oil as risk for importers; flip sign in scoring for net exporters (handled by oil_exporter flag).",
    },
    {
        "code": "natgas_henry_hub",
        "name": "Natural gas Henry Hub (USD/MMBtu)",
        "category": "commodity",
        "source": "FRED",
        "source_series_id": "DHHNGSP",
        "unit": "USD/MMBtu",
        "frequency": "daily",
        "direction": "higher_is_riskier",
        "weight": 0.2,
        "buckets": [
            {"lo": NEG_INF, "hi": 2.0, "risk": 20},
            {"lo": 2.0, "hi": 4.0, "risk": 30},
            {"lo": 4.0, "hi": 7.0, "risk": 55},
            {"lo": 7.0, "hi": POS_INF, "risk": 80},
        ],
        "source_url_template": "https://fred.stlouisfed.org/series/DHHNGSP",
        "notes": "Henry Hub spot. Daily.",
    },

    # ----------------- Yield curve / market (USA only at present) -----------------
    {
        "code": "us_curve_10y_2y",
        "name": "US 10Y–2Y term spread (recession signal)",
        "category": "market",
        "source": "FRED",
        "source_series_id": "T10Y2Y",
        "unit": "pp",
        "frequency": "daily",
        "direction": "lower_is_riskier",  # inversion = high risk
        "weight": 0.6,  # only meaningful for USA; auto-zeroed for other countries
        "buckets": [
            {"lo": NEG_INF, "hi": -0.5, "risk": 90},
            {"lo": -0.5, "hi": 0.0, "risk": 75},
            {"lo": 0.0, "hi": 0.5, "risk": 40},
            {"lo": 0.5, "hi": 1.5, "risk": 20},
            {"lo": 1.5, "hi": POS_INF, "risk": 10},
        ],
        "source_url_template": "https://fred.stlouisfed.org/series/T10Y2Y",
        "notes": "Classical recession EWS signal. Currently routed to USA only.",
    },

    # ----------------- REER / FX -----------------
    {
        "code": "reer",
        "name": "Real effective exchange rate (BIS broad index)",
        "category": "external",
        "source": "WORLD_BANK",
        "source_series_id": "PX.REX.REER",
        "unit": "index (2010=100)",
        "frequency": "annual",
        "direction": "higher_is_riskier",  # overvaluation
        "weight": 0.4,
        "buckets": [
            {"lo": NEG_INF, "hi": 90.0, "risk": 25},
            {"lo": 90.0, "hi": 105.0, "risk": 20},
            {"lo": 105.0, "hi": 120.0, "risk": 50},
            {"lo": 120.0, "hi": POS_INF, "risk": 75},
        ],
        "source_url_template": "https://data.worldbank.org/indicator/PX.REX.REER?locations={iso3}",
        "notes": "REER. Significant deviation from 100 flagged.",
    },
]


# Convenience: oil exporter flag flips brent_price direction in scoring.
OIL_EXPORTERS = {"SAU", "ARE", "NGA", "CAN", "BRA"}  # simplified set


# Quick lookups
INDICATOR_BY_CODE = {ind["code"]: ind for ind in INDICATORS}
COUNTRY_BY_ISO3 = {c["iso3"]: c for c in COUNTRIES}
SECTOR_BY_CODE = {s["code"]: s for s in SECTORS}
