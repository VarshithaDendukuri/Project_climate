import {
  ComposedChart, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'

function TooltipContent({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-sm min-w-[170px]">
      <p className="font-bold text-slate-800 mb-2">{label}</p>
      {payload.map((e) => (
        <div key={e.dataKey} className="flex items-center justify-between gap-3 mb-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: e.color }} />
            <span className="text-xs text-slate-500">{e.name}</span>
          </div>
          <span className="text-xs font-semibold text-slate-800">
            {e.value != null ? (typeof e.value === 'number' ? e.value.toFixed(1) : e.value) : '—'}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function TrendChart({ data, title, subtitle }) {
  if (!data?.length) return null

  const avg = data.reduce((s, d) => s + (d.event_count ?? 0), 0) / data.length

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-base sm:text-lg font-bold text-slate-800">{title}</h3>
        {subtitle && <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>

      <div className="h-56 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#94a3b8' }}
                   tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }}
                   tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip content={<TooltipContent />} />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} iconType="circle" iconSize={8} />
            <ReferenceLine y={avg} stroke="#cbd5e1" strokeDasharray="4 3"
              label={{ value: `avg ${avg.toFixed(1)}`, fill: '#94a3b8', fontSize: 10, position: 'insideTopRight' }} />
            <Bar dataKey="event_count" name="Events / year"
                 fill="#bfdbfe" stroke="#60a5fa" strokeWidth={1}
                 radius={[3, 3, 0, 0]} maxBarSize={28} />
            <Line type="monotone" dataKey="rolling_avg_events" name="5-yr rolling avg"
                  stroke="#1d4ed8" strokeWidth={2.5} dot={false}
                  activeDot={{ r: 4 }} connectNulls={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
