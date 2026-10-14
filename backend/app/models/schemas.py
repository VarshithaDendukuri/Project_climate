from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from enum import Enum


class HazardType(str, Enum):
    HEATWAVE = "heatwave"


class RegionInput(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)
    name: str = Field(..., min_length=1, max_length=100)

    @field_validator("name")
    @classmethod
    def sanitize_name(cls, v: str) -> str:
        return v.strip()


class AnalysisRequest(BaseModel):
    region: RegionInput
    start_year: int = Field(..., ge=1950, le=2023)
    end_year: int = Field(..., ge=1950, le=2023)
    hazard_type: HazardType = Field(default=HazardType.HEATWAVE)

    @field_validator("end_year")
    @classmethod
    def end_after_start(cls, v: int, info) -> int:
        if "start_year" in info.data and v < info.data["start_year"]:
            raise ValueError("end_year must be >= start_year")
        if v - info.data.get("start_year", v) > 73:
            raise ValueError("Time range cannot exceed 73 years")
        return v


class HeatwaveEvent(BaseModel):
    start_date: str
    end_date: str
    duration_days: int
    max_temp: float
    avg_temp: float
    year: int


class YearlyStats(BaseModel):
    year: int
    event_count: int
    total_heatwave_days: int
    max_duration: int
    avg_duration: float
    max_temp_recorded: float
    avg_max_temp: float


class TrendData(BaseModel):
    slope: float
    intercept: float
    r_squared: float
    p_value: float
    is_significant: bool
    trend_direction: str
    mann_kendall_tau: Optional[float] = None
    mann_kendall_p: Optional[float] = None


class SummaryInsight(BaseModel):
    text: str
    metric: str
    value: Optional[float] = None
    unit: Optional[str] = None


class AnalysisResponse(BaseModel):
    analysis_id: str
    region: RegionInput
    start_year: int
    end_year: int
    hazard_type: HazardType
    percentile_threshold: float
    threshold_temp: float
    yearly_stats: List[YearlyStats]
    heatwave_events: List[HeatwaveEvent]
    rolling_avg_5yr: List[dict]
    trend: TrendData
    summary_insights: List[SummaryInsight]
    data_quality: dict
    computed_at: str
    cached: bool = False


class PredefinedRegion(BaseModel):
    name: str
    lat: float
    lon: float
    country: str
    description: str
