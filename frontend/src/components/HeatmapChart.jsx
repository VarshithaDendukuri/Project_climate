import {
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'

function TooltipContent({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-sm">
      <p className="font-bold text-slate-800 mb-2">{label}</p>
      {payload.map((e) => (
        <div key={e.dataKey} className="flex items-center justify-between gap-3 mb-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: e.color }} />
            <span className="text-xs text-slate-500">{e.name}</span>
          </div>
          <span className="text-xs font-semibold" style={{ color: e.color }}>
            {e.value != null ? `${e.value.toFixed(0)} d` : '—'}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function HeatmapChart({ data, title, subtitle }) {
  if (!data?.length) return null

  const maxDays = Math.max(...data.map((d) => d.total_heatwave_days ?? 0))
  const avg     = data.reduce((s, d) => s + (d.total_heatwave_days ?? 0), 0) / data.length
  const peakRow = data.find((d) => d.total_heatwave_days === maxDays)

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-base sm:text-lg font-bold text-slate-800">{title}</h3>
        {subtitle && <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>

      <div className="h-56 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="heatGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="rollGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#f97316" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0.0}  />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#94a3b8' }}
                   tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }}
                   tickLine={false} axisLine={false} unit="d" />
            <Tooltip content={<TooltipContent />} />
            <ReferenceLine y={avg} stroke="#cbd5e1" strokeDasharray="4 3"
              label={{ value: `avg ${avg.toFixed(1)}d`, fill: '#94a3b8', fontSize: 10, position: 'insideTopRight' }} />
            <Area type="monotone" dataKey="total_heatwave_days" name="Total HW days"
                  stroke="#ef4444" strokeWidth={2} fill="url(#heatGrad)"
                  activeDot={{ r: 5 }} />
            <Area type="monotone" dataKey="rolling_avg_days" name="5-yr rolling avg"
                  stroke="#f97316" strokeWidth={2} strokeDasharray="5 3"
                  fill="url(#rollGrad)" activeDot={{ r: 4 }} connectNulls={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {maxDays > 0 && (
        <p className="mt-2 text-xs text-slate-500">
          Peak year: <span className="font-semibold text-red-600">{peakRow?.year} — {maxDays} heatwave days</span>
        </p>
      )}
    </div>
  )
}
