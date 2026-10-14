import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, Info } from 'lucide-react'

function TrendBadge({ direction }) {
  if (direction === 'increasing')
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
        <TrendingUp className="w-3 h-3" /> Increasing
      </span>
    )
  if (direction === 'decreasing')
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
        <TrendingDown className="w-3 h-3" /> Decreasing
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
      <Minus className="w-3 h-3" /> No Significant Trend
    </span>
  )
}

function StatCard({ label, value, unit, color = 'text-slate-800' }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3 text-center">
      <div className={`text-xl sm:text-2xl font-bold ${color}`}>{value ?? '—'}</div>
      {unit && <div className="text-[10px] text-slate-400 mt-0.5">{unit}</div>}
      <div className="text-xs text-slate-500 mt-1 leading-tight">{label}</div>
    </div>
  )
}

export default function SummaryInsights({ result }) {
  if (!result) return null

  const { trend, summary_insights, yearly_stats, data_quality, threshold_temp } = result

  const totalEvents       = yearly_stats.reduce((s, y) => s + y.event_count, 0)
  const totalHeatwaveDays = yearly_stats.reduce((s, y) => s + y.total_heatwave_days, 0)
  const maxTemp           = Math.max(...yearly_stats.map((y) => y.max_temp_recorded ?? 0))
  const yearsWithEvents   = yearly_stats.filter((y) => y.event_count > 0).length

  return (
    <div className="space-y-4">

      {/* ── Trend card ─────────────────────────────────────────────────── */}
      <div className={`rounded-2xl border p-4 sm:p-5
        ${trend.is_significant && trend.trend_direction === 'increasing'
          ? 'border-red-200 bg-red-50'
          : trend.is_significant && trend.trend_direction === 'decreasing'
          ? 'border-green-200 bg-green-50'
          : 'border-slate-200 bg-white'
        }`}
      >
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <h3 className="text-base font-bold text-slate-800">Trend Analysis</h3>
          <TrendBadge direction={trend.trend_direction} />
          {trend.is_significant ? (
            <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
              <CheckCircle className="w-3 h-3" /> Significant (p={trend.p_value})
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
              <AlertTriangle className="w-3 h-3" /> Not significant (p={trend.p_value})
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <StatCard
            label="Slope"
            value={trend.slope > 0 ? `+${trend.slope}` : `${trend.slope}`}
            unit="events / yr"
            color={trend.slope > 0 ? 'text-red-600' : trend.slope < 0 ? 'text-green-600' : 'text-slate-800'}
          />
          <StatCard label="R²"      value={trend.r_squared.toFixed(3)} />
          <StatCard label="P-value" value={trend.p_value.toFixed(3)} />
          {trend.mann_kendall_tau != null ? (
            <StatCard
              label="Mann-Kendall τ"
              value={trend.mann_kendall_tau.toFixed(3)}
              color={trend.mann_kendall_tau > 0 ? 'text-red-600' : 'text-green-600'}
            />
          ) : (
            <StatCard label="95th pct threshold" value={`${threshold_temp?.toFixed(1)}°C`} />
          )}
        </div>
      </div>

      {/* ── Key stats ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { v: totalEvents,       label: 'Total Events',        color: 'text-primary-700' },
          { v: totalHeatwaveDays, label: 'Total HW Days',       color: 'text-orange-600'  },
          { v: maxTemp > 0 ? `${maxTemp.toFixed(1)}°` : '—', label: 'Peak Max Temp (°C)', color: 'text-red-600' },
          { v: yearsWithEvents,   label: 'Years With Events',   color: 'text-purple-600'  },
        ].map(({ v, label, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-200 p-4 text-center shadow-sm">
            <div className={`text-2xl sm:text-3xl font-bold ${color}`}>{v}</div>
            <div className="text-xs text-slate-500 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* ── Insight messages ───────────────────────────────────────────── */}
      {summary_insights?.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm">
          <h3 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
            <Info className="w-4 h-4 text-primary-600" />
            Key Insights
          </h3>
          <ul className="space-y-2.5">
            {summary_insights.map((ins, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 text-xs
                                 font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm text-slate-700 leading-relaxed">{ins.text}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Data quality ───────────────────────────────────────────────── */}
      {data_quality && (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 sm:p-4">
          <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2">
            Data Quality
          </h4>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-600">
            <span>📅 {data_quality.date_range?.start} → {data_quality.date_range?.end}</span>
            <span>📊 {data_quality.total_days?.toLocaleString()} days</span>
            <span className={data_quality.coverage_percent >= 95 ? 'text-green-600 font-medium' : 'text-amber-600 font-medium'}>
              ✓ {data_quality.coverage_percent}% coverage
            </span>
            {data_quality.missing_days > 0 && (
              <span className="text-amber-600">⚠ {data_quality.missing_days} days interpolated</span>
            )}
            {result.cached && <span className="text-blue-600 font-medium">⚡ Served from cache</span>}
          </div>
        </div>
      )}
    </div>
  )
}
