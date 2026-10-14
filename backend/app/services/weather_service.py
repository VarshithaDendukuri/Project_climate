"""
Fetches and caches historical daily temperatures from Open-Meteo Archive API.
Free, no API key required. Data from 1940 onward at ~25 km resolution.
"""
import httpx
import asyncio
import logging
from typing import List, Dict, Any, Optional
import pandas as pd
import numpy as np

from app.services.db_service import db_service
from app.config import settings

logger = logging.getLogger(__name__)
OPEN_METEO_BASE = "https://archive-api.open-meteo.com/v1/archive"


class WeatherService:
    async def get_daily_max_temps(
        self, lat: float, lon: float, start_year: int, end_year: int
    ) -> pd.DataFrame:
        cache_key = f"{round(lat, 2)}_{round(lon, 2)}_{start_year}_{end_year}"

        cached = await db_service.get_weather_cache(cache_key)
        if cached:
            logger.info(f"Weather cache hit: {cache_key}")
            df = pd.DataFrame(cached["records"])
            df["date"] = pd.to_datetime(df["date"])
            return df

        logger.info(f"Fetching Open-Meteo: {lat},{lon} {start_year}-{end_year}")
        df = await self._fetch_chunked(lat, lon, start_year, end_year)
        df = self._clean(df)

        records = df.copy()
        records["date"] = records["date"].dt.strftime("%Y-%m-%d")
        await db_service.set_weather_cache(
            cache_key,
            {"lat": lat, "lon": lon, "start_year": start_year, "end_year": end_year,
             "records": records.to_dict("records")},
            ttl_seconds=settings.weather_cache_ttl,
        )
        return df

    async def _fetch_chunked(
        self, lat: float, lon: float, start_year: int, end_year: int
    ) -> pd.DataFrame:
        all_dfs: List[pd.DataFrame] = []
        async with httpx.AsyncClient(timeout=60.0) as client:
            for y_start in range(start_year, end_year + 1, 10):
                y_end = min(y_start + 9, end_year)
                params = {
                    "latitude": round(lat, 4),
                    "longitude": round(lon, 4),
                    "start_date": f"{y_start}-01-01",
                    "end_date": f"{y_end}-12-31",
                    "daily": "temperature_2m_max,temperature_2m_min,temperature_2m_mean",
                    "timezone": "auto",
                    "temperature_unit": "celsius",
                }
                try:
                    resp = await client.get(OPEN_METEO_BASE, params=params)
                    resp.raise_for_status()
                    chunk = self._parse(resp.json())
                    if not chunk.empty:
                        all_dfs.append(chunk)
                    await asyncio.sleep(0.3)
                except httpx.HTTPStatusError as e:
                    raise RuntimeError(f"Weather API returned {e.response.status_code}")
                except httpx.RequestError:
                    raise RuntimeError("Failed to connect to weather data API")

        if not all_dfs:
            raise RuntimeError("No weather data received from API")
        return pd.concat(all_dfs, ignore_index=True)

    def _parse(self, data: Dict[str, Any]) -> pd.DataFrame:
        daily = data.get("daily", {})
        if not daily or "time" not in daily:
            return pd.DataFrame()
        return pd.DataFrame({
            "date": pd.to_datetime(daily["time"]),
            "temperature_2m_max": daily.get("temperature_2m_max", []),
            "temperature_2m_min": daily.get("temperature_2m_min", []),
            "temperature_2m_mean": daily.get("temperature_2m_mean", []),
        })

    def _clean(self, df: pd.DataFrame) -> pd.DataFrame:
        """Sort, deduplicate, fill gaps ≤3 days, remove physical impossibilities."""
        df = df.sort_values("date").drop_duplicates(subset="date").reset_index(drop=True)
        df = df.set_index("date")

        # Fill missing calendar days
        full_range = pd.date_range(df.index.min(), df.index.max(), freq="D")
        df = df.reindex(full_range)
        df.index.name = "date"

        # Interpolate short gaps
        for col in ["temperature_2m_max", "temperature_2m_min", "temperature_2m_mean"]:
            df[col] = df[col].interpolate(method="linear", limit=3, limit_direction="both")

        # Remove physically impossible temps
        df.loc[df["temperature_2m_max"] > 60, "temperature_2m_max"] = np.nan
        df.loc[df["temperature_2m_max"] < -90, "temperature_2m_max"] = np.nan

        # IQR outlier removal (4× IQR)
        q1, q3 = df["temperature_2m_max"].quantile([0.25, 0.75])
        iqr = q3 - q1
        mask = (df["temperature_2m_max"] < q1 - 4 * iqr) | (df["temperature_2m_max"] > q3 + 4 * iqr)
        df.loc[mask, "temperature_2m_max"] = np.nan

        return df.reset_index()

    def quality_report(self, df: pd.DataFrame) -> Dict[str, Any]:
        total = len(df)
        missing = int(df["temperature_2m_max"].isna().sum())
        return {
            "total_days": total,
            "missing_days": missing,
            "coverage_percent": round(100 * (1 - missing / total), 2) if total > 0 else 0,
            "date_range": {
                "start": df["date"].min().strftime("%Y-%m-%d") if total > 0 else None,
                "end": df["date"].max().strftime("%Y-%m-%d") if total > 0 else None,
            },
        }


weather_service = WeatherService()
