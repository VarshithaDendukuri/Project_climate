import {
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
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
          <span className="text-xs font-semibold text-slate-800">
            {e.value != null ? `${e.value.toFixed(1)} d` : '—'}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function DurationChart({ data, title, subtitle }) {
  if (!data?.length) return null

  const valid  = data.filter((d) => d.avg_duration > 0)
  const avgDur = valid.length ? valid.reduce((s, d) => s + d.avg_duration, 0) / valid.length : 0

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-base sm:text-lg font-bold text-slate-800">{title}</h3>
        {subtitle && <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>

      <div className="h-56 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#94a3b8' }}
                   tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }}
                   tickLine={false} axisLine={false} unit="d" />
            <Tooltip content={<TooltipContent />} />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} iconType="circle" iconSize={8} />
            {avgDur > 0 && (
              <ReferenceLine y={avgDur} stroke="#cbd5e1" strokeDasharray="4 3"
                label={{ value: `avg ${avgDur.toFixed(1)}d`, fill: '#94a3b8', fontSize: 10, position: 'insideTopRight' }} />
            )}
            <Line type="monotone" dataKey="avg_duration" name="Avg duration"
                  stroke="#7c3aed" strokeWidth={2}
                  dot={{ r: 2, fill: '#7c3aed' }} activeDot={{ r: 5 }}
                  connectNulls={false} />
            <Line type="monotone" dataKey="max_duration" name="Max duration"
                  stroke="#c4b5fd" strokeWidth={1.5} strokeDasharray="4 2"
                  dot={false} activeDot={{ r: 4 }} connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
