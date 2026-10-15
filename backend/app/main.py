"""
FastAPI application — Climate Hazard Trend Analyzer
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.config import settings
from app.services.db_service import db_service
from app.routers import analyze, export

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Climate Hazard Trend Analyzer API…")
    await db_service.connect()
    yield
    logger.info("Shutting down…")
    await db_service.disconnect()


app = FastAPI(
    title="Climate Hazard Trend Analyzer API",
    description="Analyzes historical weather data to detect and visualize climate hazard trends.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://project-climate-1.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.include_router(analyze.router, prefix="/api", tags=["Analysis"])
app.include_router(export.router, prefix="/api", tags=["Export"])


@app.get("/", tags=["Root"])
async def root():
    return {"name": "Climate Hazard Trend Analyzer API", "version": "1.0.0", "docs": "/docs"}
