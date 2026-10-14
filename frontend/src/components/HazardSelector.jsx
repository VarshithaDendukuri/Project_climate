import { Thermometer } from 'lucide-react'

export default function HazardSelector({ value, onChange }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 text-sm text-slate-600">
        <Thermometer className="w-4 h-4 text-primary-500" />
        <span className="font-medium">Hazard Type</span>
      </div>

      <button
        onClick={() => onChange('heatwave')}
        className={`w-full text-left px-4 py-3 rounded-xl border-2 transition
          ${value === 'heatwave'
            ? 'border-primary-500 bg-primary-50'
            : 'border-slate-200 bg-white hover:border-primary-300'
          }`}
        aria-pressed={value === 'heatwave'}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl" role="img" aria-hidden>🌡️</span>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-semibold ${value === 'heatwave' ? 'text-primary-800' : 'text-slate-700'}`}>
                Heatwave
              </span>
              {value === 'heatwave' && (
                <span className="text-[10px] bg-primary-600 text-white px-1.5 py-0.5 rounded-full">
                  Default
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              3+ consecutive days above 95th percentile max temperature
            </p>
          </div>
        </div>
      </button>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <p className="text-xs text-amber-700 leading-relaxed">
          <strong>Definition:</strong> A heatwave is 3 or more consecutive days where the
          daily max temperature exceeds the regional 95th percentile.
        </p>
      </div>
    </div>
  )
}
