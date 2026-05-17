"""
FastAPI entry point.

Run with:
  uvicorn main:app --reload --port 8000
"""
from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database import Base, engine
from routers import filters as filters_router
from routers import indicators as indicators_router
from routers import news as news_router
from routers import risk as risk_router
from routers import sources as sources_router
from routers import compare as compare_router
from routers import peers as peers_router
from routers import constellation as constellation_router
from scheduler import kick_initial_refresh_if_empty, start_scheduler

logging.basicConfig(
    level=os.environ.get("LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("ews")


_scheduler = None


@asynccontextmanager
async def lifespan(app: FastAPI):  # noqa: ARG001
    global _scheduler
    Base.metadata.create_all(bind=engine)
    _scheduler = start_scheduler()
    kick_initial_refresh_if_empty()
    yield
    if _scheduler:
        _scheduler.shutdown(wait=False)


app = FastAPI(
    title="Economic Early Warning Dashboard",
    description=(
        "Aggregates public macro indicators (World Bank, IMF, ECB, FRED) and "
        "central-bank news RSS, scores country/sector risk on a transparent "
        "0–100 scale, and exposes every score with its source link and date."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?|https?://.+\.(ngrok-free\.app|ngrok\.io|trycloudflare\.com|loca\.lt|onrender\.com)",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok"}


app.include_router(filters_router.router)
app.include_router(indicators_router.router)
app.include_router(risk_router.router)
app.include_router(news_router.router)
app.include_router(sources_router.router)
app.include_router(compare_router.router)
app.include_router(peers_router.router)
app.include_router(constellation_router.router)
