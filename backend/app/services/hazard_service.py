"""
Heatwave detection logic.

Definition (WMO-inspired, percentile-based):
  3 or more consecutive days where daily max temperature > 95th percentile
  of all daily max temperatures for that region over the full analysis period.
"""
import logging
import numpy as np
import pandas as pd
from typing import List, Tuple, Dict

from app.models.schemas import HeatwaveEvent, YearlyStats

logger = logging.getLogger(__name__)

HEATWAVE_MIN_DURATION = 3
HEATWAVE_PERCENTILE = 95.0


class HazardService:

    def detect_heatwaves(
        self, df: pd.DataFrame
    ) -> Tuple[float, List[HeatwaveEvent], List[YearlyStats]]:
        df = df.dropna(subset=["temperature_2m_max"]).copy()
        df["date"] = pd.to_datetime(df["date"])
        df = df.sort_values("date").reset_index(drop=True)

        if df.empty:
            raise ValueError("No valid temperature data available for analysis")

        threshold = float(np.percentile(df["temperature_2m_max"].dropna(), HEATWAVE_PERCENTILE))
        logger.info(f"95th percentile threshold: {threshold:.2f}°C")

        df["is_hot"] = df["temperature_2m_max"] > threshold
        events = self._extract_events(df, threshold)
        yearly_stats = self._yearly_stats(df, events)

        return threshold, events, yearly_stats

    def _extract_events(self, df: pd.DataFrame, threshold: float) -> List[HeatwaveEvent]:
        events: List[HeatwaveEvent] = []
        df = df.copy()
        df["run_id"] = (df["is_hot"] != df["is_hot"].shift()).cumsum()

        for _, group in df.groupby("run_id"):
            if not group["is_hot"].iloc[0]:
                continue
            if len(group) < HEATWAVE_MIN_DURATION:
                continue

            temps = group["temperature_2m_max"].dropna()
            events.append(HeatwaveEvent(
                start_date=group["date"].iloc[0].strftime("%Y-%m-%d"),
                end_date=group["date"].iloc[-1].strftime("%Y-%m-%d"),
                duration_days=len(group),
                max_temp=round(float(temps.max()), 2),
                avg_temp=round(float(temps.mean()), 2),
                year=int(group["date"].iloc[0].year),
            ))
        return events

    def _yearly_stats(self, df: pd.DataFrame, events: List[HeatwaveEvent]) -> List[YearlyStats]:
        df = df.copy()
        df["year"] = df["date"].dt.year
        years = sorted(df["year"].unique())

        events_by_year: Dict[int, List[HeatwaveEvent]] = {y: [] for y in years}
        for e in events:
            if e.year in events_by_year:
                events_by_year[e.year].append(e)

        stats: List[YearlyStats] = []
        for year in years:
            evts = events_by_year[year]
            valid = df[df["year"] == year]["temperature_2m_max"].dropna()
            durations = [e.duration_days for e in evts]

            stats.append(YearlyStats(
                year=int(year),
                event_count=len(evts),
                total_heatwave_days=sum(durations),
                max_duration=max(durations) if durations else 0,
                avg_duration=round(float(np.mean(durations)), 2) if durations else 0.0,
                max_temp_recorded=round(float(valid.max()), 2) if not valid.empty else 0.0,
                avg_max_temp=round(float(valid.mean()), 2) if not valid.empty else 0.0,
            ))
        return stats


hazard_service = HazardService()
