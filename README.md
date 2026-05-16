# Economic Early Warning Dashboard

A working local prototype of a country & sector economic risk dashboard, built only on public data sources. FastAPI backend, React frontend, SQLite cache, scheduled refresh jobs, and a transparent scoring engine. Every score links back to its source.

## What this prototype actually does

- Pulls macro indicators from the **World Bank WDI API**, **IMF DataMapper API**, **ECB Statistical Data Warehouse**, and (optionally) **FRED**. None of these require a paid plan; FRED requires a free key, the rest are open.
- Pulls news headlines from the public RSS feeds of the **Federal Reserve, ECB, BIS (central bank speeches), World Bank, and IMF**.
- Caches everything in a local SQLite file (`backend/ews_cache.db`).
- A background scheduler (APScheduler) refreshes indicators every 3 hours and news every 30 minutes. You can also trigger an on-demand refresh from the UI.
- A scoring engine maps each indicator's latest value to a transparent 0–100 risk bucket, then computes a weighted composite score with `low | moderate | high | critical | unknown` banding. Every score returns the underlying value, period, source, source URL, weight used, and a per-indicator confidence.
- Frontend exposes filters, KPIs, key-warning panel, deteriorating/improving lists, indicator trend charts, a country × indicator heatmap, a news/timeline feed, a source-and-methodology drawer, a full reference page, and CSV/PDF export. Light and dark themes.

> This is a prototype. The threshold buckets that drive scoring are transparent priors — informed by IMF/BIS reference frames — not a calibrated model. They are easy to edit in `backend/data/reference.py`.

---

## Repo layout

```
ews/
├── backend/                    # FastAPI app
│   ├── main.py                 # entry point + CORS + lifespan
│   ├── config.py               # pydantic-settings, .env loader
│   ├── database.py             # SQLAlchemy engine + session
│   ├── models.py               # IndicatorObservation, NewsItem, FetchLog
│   ├── scoring.py              # transparent 0-100 scoring engine
│   ├── scheduler.py            # APScheduler refresh jobs
│   ├── connectors/             # one file per data source
│   │   ├── world_bank.py       # World Bank WDI (live)
│   │   ├── imf.py              # IMF DataMapper (live)
│   │   ├── ecb.py              # ECB Statistical Data Warehouse (live, helper)
│   │   ├── fred.py             # FRED (live if FRED_API_KEY set, else graceful no-op)
│   │   ├── bis.py              # BIS (modular TODO stub — no fabricated data)
│   │   ├── oecd.py             # OECD (modular TODO stub)
│   │   └── news_rss.py         # Fed/ECB/BIS/WB/IMF RSS aggregator
│   ├── data/reference.py       # countries, sectors, indicator catalogue + buckets
│   ├── routers/                # filters, indicators, risk, news, sources
│   ├── requirements.txt
│   ├── .env.example            # config template
│   └── Dockerfile
├── frontend/                   # React + Vite + Tailwind
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api.js
│   │   ├── utils.js
│   │   └── components/
│   │       ├── Sidebar.jsx          # all filters
│   │       ├── RiskSummary.jsx      # composite score + gauge + KPIs
│   │       ├── IndicatorPanels.jsx  # warning / deteriorating / improving / full table
│   │       ├── TrendChart.jsx       # recharts line chart
│   │       ├── Heatmap.jsx          # country × indicator heatmap
│   │       ├── NewsFeed.jsx         # RSS feed list
│   │       ├── Timeline.jsx         # event timeline (indicators + news)
│   │       ├── SourceDrawer.jsx     # per-indicator source / methodology drawer
│   │       ├── ReferencesPage.jsx   # full source log
│   │       └── MethodologyPage.jsx  # methodology + indicator catalogue
│   ├── vite.config.js          # proxies /api → :8000 in dev
│   ├── tailwind.config.js
│   ├── package.json
│   ├── nginx.conf              # only used by Docker build
│   └── Dockerfile
├── scripts/
│   ├── run_backend.sh
│   ├── run_frontend.sh
│   └── share.sh                # ngrok / cloudflared / localtunnel auto-detect
├── docker-compose.yml          # optional containerised run
└── .gitignore
```

---

## Setup — laptop, no Docker (~3 minutes)

Prereqs: Python 3.10+, Node 18+, npm.

```bash
# 1. Backend
cd backend
python3 -m venv .venv
source .venv/bin/activate         # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env              # optional: paste your free FRED_API_KEY here
uvicorn main:app --reload --port 8000
```

The first time it starts, the backend sees an empty database and kicks off an initial refresh in the background. World Bank + IMF together cover the macro stack for all 23 sample countries; expect 1–3 minutes for the first sweep to populate the cache. The API is usable immediately — values just fill in as connectors complete.

In a second terminal:

```bash
# 2. Frontend
cd frontend
npm install
npm run dev                       # opens http://localhost:5173
```

Or use the bundled helpers:

```bash
./scripts/run_backend.sh          # one-shot venv + uvicorn
./scripts/run_frontend.sh         # one-shot npm install + vite
```

Open **http://localhost:5173** — the Vite dev server proxies `/api/*` to FastAPI on `:8000`.

---

## Setup — Docker (optional)

```bash
cp backend/.env.example .env      # for FRED_API_KEY only
docker compose up --build
# UI at http://localhost:5173, API at http://localhost:8000
```

The SQLite cache persists under `./.data/`.

---

## Sharing via a temporary public URL

The dashboard runs on `localhost`; tunnels expose the **frontend port 5173** (which already proxies the API). The frontend's Vite config is pre-configured to accept `*.ngrok-free.app`, `*.ngrok.io`, `*.trycloudflare.com`, and `*.loca.lt` hosts.

```bash
# Option A — ngrok (free, requires one-time signup)
ngrok config add-authtoken <your-token>   # once
ngrok http 5173

# Option B — Cloudflare Tunnel (no signup needed for the quick "try" mode)
cloudflared tunnel --url http://localhost:5173

# Option C — LocalTunnel (no signup, less stable)
npm install -g localtunnel
lt --port 5173

# Convenience wrapper that picks whichever is installed
./scripts/share.sh 5173
```

ngrok / cloudflared print a public HTTPS URL. Open it on any device. Stop the process to revoke.

> **Privacy note.** The tunnel exposes everything the dev server can reach, so don't share a tunnel pointing at your work laptop unless you're comfortable with that.

---

## Data sources, freshness, and what "real-time" means here

| Source | Indicators | Cadence at source | What the dashboard does |
|---|---|---|---|
| [World Bank WDI](https://api.worldbank.org/v2) | GDP, CPI, unemployment, current account, external debt, reserves, exports, credit/GDP, REER | Annual, 3–12 month lag | Refetched every 3h |
| [IMF DataMapper](https://www.imf.org/external/datamapper) | Govt debt/GDP, fiscal balance/GDP | Twice a year (Apr/Oct WEO) | Refetched every 3h. Forecasts stored but excluded from scoring (we use latest non-projection year). |
| [ECB SDW](https://data.ecb.europa.eu/) | Euro-area aggregates (helper wired) | Monthly | Helper exists; not connected to a scored indicator yet |
| [FRED](https://fred.stlouisfed.org/) | Brent crude, Henry Hub gas, Fed funds, 10Y-2Y term spread | Daily (where applicable) | Refetched every 3h **only if `FRED_API_KEY` is set**. Without a key, these gracefully show "Data unavailable". |
| [BIS](https://data.bis.org/) | Credit-gap, property prices | Quarterly | Modular stub. World Bank `FS.AST.PRVT.GD.ZS` covers credit/GDP in the meantime. |
| [OECD](https://sdmx.oecd.org/) | KEI/MEI/EO | Monthly+ | Modular stub. |
| Federal Reserve, ECB, BIS, World Bank, IMF RSS | News | Continuous | Refetched every 30 minutes |

**True real-time?** None of these sources publish at sub-second cadence; the most frequent useful update is daily (FRED market series) and intraday (news RSS). The dashboard refreshes news every 30 min and macro indicators every 3 hours — those cadences are configurable in `backend/.env`.

---

## Scoring methodology (one-screen summary)

For each indicator the engine performs four steps:

1. **Pick the latest observation** for `(country, indicator)`. Forecast years from IMF WEO are stored but excluded — only periods up to the current year + 1 are scored.
2. **Map value → bucket risk (0..100)** using a transparent threshold table defined per-indicator in `backend/data/reference.py`. Direction (`higher_is_riskier` vs `lower_is_riskier`) is respected. Special cases:
   - Brent risk is partially inverted for net-oil-exporters (SAU, ARE, NGA, CAN, BRA).
   - US 10Y–2Y term spread and FRED fed funds rate are only scored for USA.
3. **Weight & average.** Take the weighted average of bucket risks. Sector overlay boosts certain indicators (e.g., `credit_to_gdp` and `policy_rate` are emphasised for the "Banking & Financial" sector).
4. **Compute confidence.** `confidence = 0.5 × coverage + 0.5 × freshness`, where coverage is the share of indicators with usable data and freshness is data-recency-relative-to-frequency.

**Band thresholds:** `0–25 Low · 26–50 Moderate · 51–75 High · 76–100 Critical`. If no indicators are usable, the band is `Unknown` rather than a misleading low score.

Every score returned by `/api/risk/assess` includes:

```jsonc
{
  "code": "gov_debt_gdp",
  "name": "General govt gross debt / GDP",
  "value": 120.79, "unit": "% of GDP", "period": "2024",
  "source": "IMF", "source_series_id": "GG_DEBT_GDP",
  "source_url": "https://www.imf.org/external/datamapper/GG_DEBT_GDP@WEO/USA",
  "direction": "higher_is_riskier", "weight_used": 1.3,
  "bucket_risk": 75.0, "direction_of_change": "deteriorating",
  "yoy_change": 1.45, "confidence": 1.0, "available": true,
  "notes": "IMF WEO. Reinhart-Rogoff style banding ..."
}
```

The full indicator catalogue with all buckets is rendered on the **Methodology** tab and is also available at `GET /api/filters/indicators`.

---

## Configuration

`backend/.env` (copy from `.env.example`):

```ini
FRED_API_KEY=                # optional — get free at https://fred.stlouisfed.org/docs/api/api_key.html
REFRESH_INTERVAL_MIN=180     # macro indicators refresh cadence
NEWS_REFRESH_INTERVAL_MIN=30 # news RSS refresh cadence
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
DATABASE_URL=sqlite:///./ews_cache.db
```

To add countries, sectors, or indicators (or change the thresholds), edit `backend/data/reference.py`. The frontend reads the catalogue from the API, so changes appear after a backend reload.

---

## API reference

| Endpoint | Purpose |
|---|---|
| `GET /api/health` | liveness |
| `GET /api/filters/countries` | catalogue: ISO3 + name + region |
| `GET /api/filters/sectors` | sector catalogue |
| `GET /api/filters/risk-categories` | categories used by filter chips |
| `GET /api/filters/indicators` | full indicator catalogue (with buckets) |
| `GET /api/indicators/series?country=USA&code=gdp_growth&from=2010&to=2025` | time series for one indicator |
| `GET /api/indicators/heatmap?countries=USA&countries=GBR&codes=gdp_growth&codes=inflation_cpi` | country × indicator latest + bucket-risk |
| `GET /api/risk/assess?country=USA&sector=macro` | composite assessment |
| `GET /api/news/feed?country=USA&keywords=default&limit=50` | cached RSS items, optionally filtered |
| `GET /api/sources/log?limit=100` | fetch audit log |
| `GET /api/sources/summary` | row counts by source + last fetch timestamp |
| `POST /api/admin/refresh` | trigger a refresh in the background |

Interactive docs at `http://localhost:8000/docs` while the backend runs.

---

## Honest limitations

- **Annual cadence dominates.** World Bank WDI is annual with a 3–12 month publishing lag. Quarterly/monthly central bank statistics generally require source-specific connectors; ECB and FRED are wired, others are modular stubs with explicit `TODO`s — the dashboard never invents values, it shows "Data unavailable" and points at the right source.
- **Country mapping for market series.** US-specific market signals (10Y-2Y, fed funds via FRED) only apply to USA. Brent and Henry Hub are global but the dashboard stores them under the requesting country for convenience. The methodology page makes both explicit.
- **News country-tagging is heuristic.** RSS items are tagged with a country only if the title or summary contains a country name or ISO code. Untagged items still appear in any country view as global context.
- **Threshold buckets are priors, not forecasts.** The score is meant to be auditable and replaceable, not predictive. Treat it as a screening tool.
- **No rating-agency / sanctions integration yet.** Moody's, S&P, Fitch, OFAC, EU sanctions lists, and Comtrade are all reachable from public sources but each has its own scraping or terms-of-use shape. The scaffolding (modular connectors, audit log, source-attributed scoring) is in place to add them — the prototype refuses to fake them.

---

## Sample countries and sectors preloaded

23 countries across NA, Europe, Asia, MENA, Africa, LATAM, Oceania (USA, GBR, DEU, FRA, ITA, ESP, JPN, CHN, IND, KOR, SGP, ARE, SAU, TUR, EGY, ZAF, NGA, BRA, MEX, ARG, AUS, NZL, CAN) — see `backend/data/reference.py`.

7 sectors: Macro/Sovereign, Banking & Financial, Energy, Trade & External, Construction & Real Estate, Manufacturing, Technology.

16 indicators across the categories listed in the task (GDP growth, CPI inflation, unemployment, govt debt/GDP, fiscal balance/GDP, current account/GDP, external debt/GNI, reserves in months of imports, exports/GDP, credit/GDP, private-credit-growth derived, US fed funds, Brent, Henry Hub, US 10Y-2Y term spread, REER).
