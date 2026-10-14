import { Calendar } from 'lucide-react'

const MIN = 1950
const MAX = 2023

const PRESETS = [
  { label: '1990 – 2023', start: 1990, end: 2023 },
  { label: '2000 – 2023', start: 2000, end: 2023 },
  { label: '1980 – 2010', start: 1980, end: 2010 },
  { label: '1960 – 2000', start: 1960, end: 2000 },
]

export default function TimeRangeSelector({ startYear, endYear, onChange }) {
  const span = endYear - startYear + 1

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm text-slate-600">
          <Calendar className="w-4 h-4 text-primary-500" />
          <span className="font-medium">Time Range</span>
        </div>
        <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-semibold">
          {span} yr{span !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Start */}
      <div>
        <div className="flex justify-between mb-1">
          <label className="text-xs text-slate-500">Start Year</label>
          <span className="text-sm font-bold text-primary-700">{startYear}</span>
        </div>
        <input
          type="range" min={MIN} max={MAX - 1} value={startYear}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10)
            onChange({ startYear: v, endYear: Math.max(v, endYear) })
          }}
          className="w-full h-2 rounded-full cursor-pointer"
          aria-label={`Start year ${startYear}`}
        />
      </div>

      {/* End */}
      <div>
        <div className="flex justify-between mb-1">
          <label className="text-xs text-slate-500">End Year</label>
          <span className="text-sm font-bold text-primary-700">{endYear}</span>
        </div>
        <input
          type="range" min={MIN + 1} max={MAX} value={endYear}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10)
            onChange({ startYear: Math.min(startYear, v), endYear: v })
          }}
          className="w-full h-2 rounded-full cursor-pointer"
          aria-label={`End year ${endYear}`}
        />
      </div>

      {/* Display */}
      <div className="flex items-center gap-2">
        <div className="flex-1 text-center bg-slate-100 rounded-lg py-2 text-sm font-bold text-slate-700">
          {startYear}
        </div>
        <span className="text-slate-400">→</span>
        <div className="flex-1 text-center bg-slate-100 rounded-lg py-2 text-sm font-bold text-slate-700">
          {endYear}
        </div>
      </div>

      {/* Presets */}
      <div>
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Presets</p>
        <div className="grid grid-cols-2 gap-1.5">
          {PRESETS.map(({ label, start, end }) => (
            <button
              key={label}
              onClick={() => onChange({ startYear: start, endYear: end })}
              className={`py-1.5 px-2 text-xs rounded-lg border transition font-medium
                ${startYear === start && endYear === end
                  ? 'bg-primary-100 border-primary-400 text-primary-800'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-primary-50 hover:border-primary-300'
                }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
