"""
Trend analysis: rolling average, OLS regression, Mann-Kendall test, insight generation.
"""
import logging
import numpy as np
from typing import List, Dict, Any, Optional

from app.models.schemas import YearlyStats, TrendData, SummaryInsight

logger = logging.getLogger(__name__)

try:
    import pymannkendall as mk
    MK_AVAILABLE = True
except ImportError:
    MK_AVAILABLE = False
    logger.warning("pymannkendall not installed — Mann-Kendall test skipped")


class TrendService:

    def compute_rolling_average(
        self, yearly_stats: List[YearlyStats], window: int = 5
    ) -> List[Dict[str, Any]]:
        if not yearly_stats:
            return []

        years   = [s.year for s in yearly_stats]
        counts  = [s.event_count for s in yearly_stats]
        days    = [s.total_heatwave_days for s in yearly_stats]

        rc = self._rolling(counts, window)
        rd = self._rolling(days, window)

        return [
            {
                "year": years[i],
                "event_count": yearly_stats[i].event_count,
                "rolling_avg_events": round(rc[i], 2) if rc[i] is not None else None,
                "total_heatwave_days": yearly_stats[i].total_heatwave_days,
                "rolling_avg_days": round(rd[i], 2) if rd[i] is not None else None,
                "avg_duration": yearly_stats[i].avg_duration,
                "max_duration": yearly_stats[i].max_duration,
            }
            for i in range(len(years))
        ]

    def _rolling(self, values: List[float], window: int) -> List[Optional[float]]:
        n = len(values)
        result: List[Optional[float]] = [None] * n
        half = window // 2
        for i in range(n):
            sl = values[max(0, i - half): min(n, i + half + 1)]
            valid = [v for v in sl if v is not None]
            if len(valid) >= max(1, window // 2):
                result[i] = float(np.mean(valid))
        return result

    def compute_trend(self, yearly_stats: List[YearlyStats]) -> TrendData:
        if len(yearly_stats) < 3:
            return TrendData(slope=0.0, intercept=0.0, r_squared=0.0, p_value=1.0,
                             is_significant=False, trend_direction="insufficient data")

        x = np.array([s.year for s in yearly_stats], dtype=float)
        y = np.array([s.event_count for s in yearly_stats], dtype=float)
        n = len(x)

        xm, ym = x.mean(), y.mean()
        ss_xy = np.sum((x - xm) * (y - ym))
        ss_xx = np.sum((x - xm) ** 2)
        slope = ss_xy / ss_xx if ss_xx != 0 else 0.0
        intercept = ym - slope * xm

        y_pred = slope * x + intercept
        ss_res = np.sum((y - y_pred) ** 2)
        ss_tot = np.sum((y - ym) ** 2)
        r_squared = float(1 - ss_res / ss_tot) if ss_tot != 0 else 0.0

        p_value = self._p_value(x, y, slope, intercept, n)

        mk_tau: Optional[float] = None
        mk_p: Optional[float] = None
        if MK_AVAILABLE and n >= 4:
            try:
                res = mk.original_test(y)
                mk_tau = float(res.Tau)
                mk_p = float(res.p)
                p_value = mk_p
            except Exception as e:
                logger.warning(f"Mann-Kendall failed: {e}")

        is_significant = p_value < 0.05
        if not is_significant:
            direction = "no significant trend"
        elif slope > 0:
            direction = "increasing"
        else:
            direction = "decreasing"

        return TrendData(
            slope=round(float(slope), 4),
            intercept=round(float(intercept), 4),
            r_squared=round(max(0.0, r_squared), 4),
            p_value=round(float(p_value), 4),
            is_significant=is_significant,
            trend_direction=direction,
            mann_kendall_tau=round(mk_tau, 4) if mk_tau is not None else None,
            mann_kendall_p=round(mk_p, 4) if mk_p is not None else None,
        )

    def _p_value(self, x, y, slope, intercept, n) -> float:
        from scipy import stats
        if n <= 2:
            return 1.0
        residuals = y - (slope * x + intercept)
        mse = np.sum(residuals ** 2) / (n - 2)
        x_var = np.sum((x - x.mean()) ** 2)
        if x_var == 0 or mse == 0:
            return 1.0
        se = np.sqrt(mse / x_var)
        t = slope / se
        return float(2 * stats.t.sf(abs(t), df=n - 2))

    def generate_insights(
        self,
        yearly_stats: List[YearlyStats],
        trend: TrendData,
        region_name: str,
        start_year: int,
        end_year: int,
        threshold_temp: float,
    ) -> List[SummaryInsight]:
        if not yearly_stats:
            return [SummaryInsight(text="No data available.", metric="data")]

        insights: List[SummaryInsight] = []
        total = sum(s.event_count for s in yearly_stats)
        n_years = len(yearly_stats)
        avg_per_year = total / n_years if n_years > 0 else 0

        mid = n_years // 2
        first_half = yearly_stats[:mid]
        second_half = yearly_stats[mid:]
        avg_first  = np.mean([s.event_count for s in first_half])  if first_half  else 0
        avg_second = np.mean([s.event_count for s in second_half]) if second_half else 0

        # Insight 1 — trend
        if trend.is_significant:
            if avg_first > 0:
                pct = round(100 * (avg_second - avg_first) / avg_first, 1)
                direction = "increased" if pct > 0 else "decreased"
                mid_year = first_half[-1].year if first_half else start_year
                insights.append(SummaryInsight(
                    text=f"Heatwave frequency has {direction} by {abs(pct):.0f}% in {region_name} "
                         f"since {mid_year} (p={trend.p_value:.3f}, statistically significant).",
                    metric="frequency_change", value=pct, unit="%",
                ))
            else:
                insights.append(SummaryInsight(
                    text=f"A statistically significant {trend.trend_direction} trend in heatwave "
                         f"frequency detected for {region_name} ({start_year}–{end_year}, p={trend.p_value:.3f}).",
                    metric="trend", value=trend.slope,
                ))
        else:
            insights.append(SummaryInsight(
                text=f"No statistically significant trend in heatwave frequency for {region_name} "
                     f"({start_year}–{end_year}). The data does not conclusively show an increase or decrease.",
                metric="trend",
            ))

        # Insight 2 — average annual events
        insights.append(SummaryInsight(
            text=f"On average, {region_name} experienced {avg_per_year:.1f} heatwave event(s) "
                 f"per year between {start_year} and {end_year}.",
            metric="avg_annual_events", value=round(avg_per_year, 1), unit="events/year",
        ))

        # Insight 3 — threshold
        insights.append(SummaryInsight(
            text=f"Regional 95th percentile max temperature threshold: {threshold_temp:.1f}°C. "
                 f"Events require 3+ consecutive days above this value.",
            metric="threshold", value=threshold_temp, unit="°C",
        ))

        # Insight 4 — worst year
        worst = max(yearly_stats, key=lambda s: s.event_count)
        if worst.event_count > 0:
            insights.append(SummaryInsight(
                text=f"Most active year: {worst.year} with {worst.event_count} event(s) "
                     f"totalling {worst.total_heatwave_days} heatwave days.",
                metric="worst_year", value=float(worst.year),
            ))

        # Insight 5 — duration change
        recent = [s.avg_duration for s in yearly_stats[-10:] if s.avg_duration > 0]
        early  = [s.avg_duration for s in yearly_stats[:10]  if s.avg_duration > 0]
        if recent and early:
            diff = np.mean(recent) - np.mean(early)
            word = "longer" if diff > 0 else "shorter"
            insights.append(SummaryInsight(
                text=f"Average heatwave duration is {abs(diff):.1f} day(s) {word} "
                     f"in recent years compared to the early period.",
                metric="duration_change", value=round(float(diff), 2), unit="days",
            ))

        return insights


trend_service = TrendService()
