"""
Main analysis router — region list, analyze endpoint, health check.
"""
import logging
import hashlib
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from app.models.schemas import AnalysisRequest, AnalysisResponse, PredefinedRegion
from app.services.weather_service import weather_service
from app.services.hazard_service import hazard_service
from app.services.trend_service import trend_service
from app.services.db_service import db_service
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

PREDEFINED_REGIONS = [
    PredefinedRegion(name="Mumbai",      lat=19.076,  lon=72.877,   country="India",     description="Coastal megacity"),
    PredefinedRegion(name="Delhi",       lat=28.614,  lon=77.209,   country="India",     description="Capital region"),
    PredefinedRegion(name="Chennai",     lat=13.083,  lon=80.270,   country="India",     description="South Indian coast"),
    PredefinedRegion(name="Kolkata",     lat=22.573,  lon=88.364,   country="India",     description="Eastern India"),
    PredefinedRegion(name="Hyderabad",   lat=17.385,  lon=78.487,   country="India",     description="Deccan plateau"),
    PredefinedRegion(name="Ahmedabad",   lat=23.023,  lon=72.572,   country="India",     description="Gujarat plains"),
    PredefinedRegion(name="Jaipur",      lat=26.912,  lon=75.787,   country="India",     description="Rajasthan desert fringe"),
    PredefinedRegion(name="Lucknow",     lat=26.847,  lon=80.947,   country="India",     description="Gangetic plains"),
    PredefinedRegion(name="Bhopal",      lat=23.259,  lon=77.413,   country="India",     description="Central India"),
    PredefinedRegion(name="Nagpur",      lat=21.146,  lon=79.089,   country="India",     description="Vidarbha heat belt"),
    PredefinedRegion(name="London",      lat=51.509,  lon=-0.118,   country="UK",        description="Northwest Europe"),
    PredefinedRegion(name="Paris",       lat=48.853,  lon=2.349,    country="France",    description="Western Europe"),
    PredefinedRegion(name="New York",    lat=40.712,  lon=-74.006,  country="USA",       description="Northeast USA"),
    PredefinedRegion(name="Los Angeles", lat=34.052,  lon=-118.244, country="USA",       description="Southern California"),
    PredefinedRegion(name="Sydney",      lat=-33.869, lon=151.209,  country="Australia", description="Southeast Australia"),
    PredefinedRegion(name="Tokyo",       lat=35.689,  lon=139.692,  country="Japan",     description="East Asia"),
    PredefinedRegion(name="Dubai",       lat=25.205,  lon=55.271,   country="UAE",       description="Arabian Peninsula"),
    PredefinedRegion(name="Nairobi",     lat=-1.286,  lon=36.818,   country="Kenya",     description="East Africa"),
]


def _cache_key(req: AnalysisRequest) -> str:
    raw = f"{round(req.region.lat,2)}_{round(req.region.lon,2)}_{req.start_year}_{req.end_year}_{req.hazard_type}"
    return hashlib.md5(raw.encode()).hexdigest()


@router.get("/regions", response_model=list[PredefinedRegion])
async def get_regions():
    """Return predefined regions for the quick-select UI."""
    return PREDEFINED_REGIONS


@router.post("/analyze", response_model=AnalysisResponse)
async def analyze(request: AnalysisRequest):
    """
    Full analysis pipeline:
      1. Check MongoDB analysis cache
      2. Fetch / load cached weather data
      3. Detect heatwave events
      4. Rolling average + trend (OLS + Mann-Kendall)
      5. Generate insights
      6. Cache result and return
    """
    key = _cache_key(request)

    cached = await db_service.get_analysis_cache(key)
    if cached:
        logger.info(f"Analysis cache hit: {key}")
        cached["cached"] = True
        return AnalysisResponse(**cached)

    try:
        df = await weather_service.get_daily_max_temps(
            lat=request.region.lat,
            lon=request.region.lon,
            start_year=request.start_year,
            end_year=request.end_year,
        )

        quality = weather_service.quality_report(df)
        threshold, events, yearly_stats = hazard_service.detect_heatwaves(df)
        rolling = trend_service.compute_rolling_average(yearly_stats)
        trend   = trend_service.compute_trend(yearly_stats)
        insights = trend_service.generate_insights(
            yearly_stats=yearly_stats,
            trend=trend,
            region_name=request.region.name,
            start_year=request.start_year,
            end_year=request.end_year,
            threshold_temp=threshold,
        )

        analysis_id  = str(uuid.uuid4())
        computed_at  = datetime.now(timezone.utc).isoformat()

        response = AnalysisResponse(
            analysis_id=analysis_id,
            region=request.region,
            start_year=request.start_year,
            end_year=request.end_year,
            hazard_type=request.hazard_type,
            percentile_threshold=95.0,
            threshold_temp=round(threshold, 2),
            yearly_stats=yearly_stats,
            heatwave_events=events,
            rolling_avg_5yr=rolling,
            trend=trend,
            summary_insights=insights,
            data_quality=quality,
            computed_at=computed_at,
            cached=False,
        )

        await db_service.set_analysis_cache(
            cache_key=key,
            analysis_id=analysis_id,
            data=response.model_dump(),
            ttl_seconds=settings.analysis_cache_ttl,
        )

        return response

    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.exception(f"Analysis error: {e}")
        raise HTTPException(status_code=500, detail="Internal analysis error")


@router.get("/health")
async def health():
    db_ok = await db_service.ping()
    return {"status": "ok" if db_ok else "degraded", "database": "connected" if db_ok else "unavailable"}
