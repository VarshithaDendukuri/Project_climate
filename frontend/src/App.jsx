import { useState } from 'react'
import {
  Activity, CloudSun, Menu, X, ChevronLeft, ChevronRight,
} from 'lucide-react'

import RegionSelector   from './components/RegionSelector'
import TimeRangeSelector from './components/TimeRangeSelector'
import HazardSelector   from './components/HazardSelector'
import TrendChart       from './components/TrendChart'
import HeatmapChart     from './components/HeatmapChart'
import DurationChart    from './components/DurationChart'
import SummaryInsights  from './components/SummaryInsights'
import ExportButtons    from './components/ExportButtons'
import { useAnalysis }  from './hooks/useAnalysis'

/* ── Sub-components ──────────────────────────────────────────────────────── */

function Spinner() {
  return (
    <div className="fixed inset-0 z-50 bg-white/80 backdrop-blur-sm flex items-center justify-center">
      <div className="text-center px-6 max-w-sm">
        <div className="relative w-16 h-16 mx-auto mb-5">
          <div className="absolute inset-0 border-4 border-primary-100 rounded-full" />
          <div className="absolute inset-0 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          <CloudSun className="absolute inset-0 m-auto w-6 h-6 text-sky-500" />
        </div>
        <p className="text-lg font-semibold text-slate-800">Analyzing climate data…</p>
        <p className="text-sm text-slate-500 mt-1">
          Fetching historical temperature records and detecting heatwave events.
          First run may take up to 60 s.
        </p>
      </div>
    </div>
  )
}

function ErrorBanner({ message, onDismiss }) {
  return (
    <div className="mb-5 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
      <span className="w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold
                       flex items-center justify-center shrink-0 mt-0.5">!</span>
      <div className="flex-1">
        <p className="text-sm font-semibold text-red-800">Analysis Failed</p>
        <p className="text-sm text-red-700 mt-0.5">{message}</p>
      </div>
      <button onClick={onDismiss} className="text-red-400 hover:text-red-600 shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

function Welcome() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 py-12">
      <div className="w-20 h-20 bg-gradient-to-br from-sky-100 to-primary-100 rounded-3xl
                      flex items-center justify-center mb-6 shadow-inner">
        <CloudSun className="w-10 h-10 text-sky-500" />
      </div>
      <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">
        Analyze Climate Hazard Trends
      </h2>
      <p className="text-slate-500 max-w-md text-sm leading-relaxed mb-8">
        Select a geographic region, set a time range, and run the analysis to
        visualize historical heatwave trends with statistical significance testing.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg w-full">
        {[
          { icon: '📍', title: 'Select Region',  desc: 'City, state, or click on map' },
          { icon: '📅', title: 'Set Time Range', desc: '1950 – 2023 supported'        },
          { icon: '🔥', title: 'Run Analysis',   desc: 'Get heatwave insights'        },
        ].map(({ icon, title, desc }) => (
          <div key={title} className="bg-white rounded-2xl border border-slate-200 p-4 text-left shadow-sm">
            <div className="text-2xl mb-2">{icon}</div>
            <div className="text-sm font-semibold text-slate-800">{title}</div>
            <div className="text-xs text-slate-500 mt-0.5">{desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Events table ────────────────────────────────────────────────────────── */
function EventsTable({ events }) {
  if (!events?.length) return null
  const show = events.slice(0, 50)

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-slate-800">Individual Heatwave Events</h3>
          <p className="text-xs text-slate-500 mt-0.5">{events.length} events detected</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" role="table" aria-label="Heatwave events">
          <thead>
            <tr className="bg-slate-50 text-[11px] text-slate-400 uppercase tracking-wide">
              <th className="text-left px-4 sm:px-6 py-3 font-semibold">Start</th>
              <th className="text-left px-4 sm:px-6 py-3 font-semibold">End</th>
              <th className="text-right px-4 sm:px-6 py-3 font-semibold">Duration</th>
              <th className="text-right px-4 sm:px-6 py-3 font-semibold hidden sm:table-cell">Max Temp</th>
              <th className="text-right px-4 sm:px-6 py-3 font-semibold hidden sm:table-cell">Avg Temp</th>
            </tr>
          </thead>
          <tbody>
            {show.map((evt, i) => (
              <tr key={i} className="border-t border-slate-100 hover:bg-slate-50 transition">
                <td className="px-4 sm:px-6 py-3 text-slate-700 tabular-nums">{evt.start_date}</td>
                <td className="px-4 sm:px-6 py-3 text-slate-700 tabular-nums">{evt.end_date}</td>
                <td className="px-4 sm:px-6 py-3 text-right">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold
                    ${evt.duration_days >= 10 ? 'bg-red-100 text-red-700'
                      : evt.duration_days >= 7 ? 'bg-orange-100 text-orange-700'
                      : 'bg-amber-100 text-amber-700'}`}>
                    {evt.duration_days} d
                  </span>
                </td>
                <td className="px-4 sm:px-6 py-3 text-right text-red-600 font-medium hidden sm:table-cell tabular-nums">
                  {evt.max_temp} °C
                </td>
                <td className="px-4 sm:px-6 py-3 text-right text-slate-600 hidden sm:table-cell tabular-nums">
                  {evt.avg_temp} °C
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {events.length > 50 && (
          <div className="px-6 py-3 bg-slate-50 border-t text-xs text-slate-500">
            Showing 50 of {events.length} events. Export CSV for full data.
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Main App ────────────────────────────────────────────────────────────── */
export default function App() {
  const [region,   setRegion]   = useState(null)
  const [timeRange, setTimeRange] = useState({ startYear: 1990, endYear: 2023 })
  const [hazard,   setHazard]   = useState('heatwave')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const { loading, error, result, analyze, reset } = useAnalysis()

  const handleAnalyze = async () => {
    if (!region) return
    setMobileOpen(false)
    await analyze({
      region:     { lat: region.lat, lon: region.lon, name: region.name },
      start_year: timeRange.startYear,
      end_year:   timeRange.endYear,
      hazard_type: hazard,
    })
  }

  const canRun = !!region && !loading

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 transition"
            aria-label="Toggle sidebar"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Brand */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 bg-gradient-to-br from-sky-500 to-primary-600
                            rounded-lg flex items-center justify-center shadow-sm shrink-0">
              <CloudSun className="w-4 h-4 text-white" />
            </div>
            <div className="leading-tight min-w-0">
              <h1 className="text-sm font-bold text-slate-900 truncate">
                Climate Hazard Trend Analyzer
              </h1>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Historical heatwave analysis · Open-Meteo + MongoDB
              </p>
            </div>
          </div>

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-2 shrink-0">
            {result && <ExportButtons analysisId={result.analysis_id} />}
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500
                             bg-slate-100 px-3 py-1.5 rounded-full">
              <Activity className="w-3.5 h-3.5 text-green-500" />
              Live data
            </span>
          </div>
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div className="flex flex-1 max-w-screen-2xl mx-auto w-full relative">

        {/* Mobile backdrop */}
        {mobileOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-30 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* ── Sidebar ──────────────────────────────────────────────────── */}
        <aside
          className={`
            fixed lg:sticky top-14 left-0 z-30 lg:z-auto
            h-[calc(100vh-3.5rem)] bg-white border-r border-slate-200
            flex flex-col transition-all duration-300 ease-in-out shrink-0
            ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            ${sidebarCollapsed ? 'lg:w-0 lg:overflow-hidden lg:border-0' : 'w-72 sm:w-80'}
          `}
        >
          <div className="flex-1 overflow-y-auto p-4 space-y-6">

            {/* Region */}
            <section>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3">
                1 · Region
              </p>
              <RegionSelector value={region} onChange={setRegion} />
            </section>

            <hr className="border-slate-100" />

            {/* Time range */}
            <section>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3">
                2 · Time Range
              </p>
              <TimeRangeSelector
                startYear={timeRange.startYear}
                endYear={timeRange.endYear}
                onChange={setTimeRange}
              />
            </section>

            <hr className="border-slate-100" />

            {/* Hazard */}
            <section>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3">
                3 · Hazard Type
              </p>
              <HazardSelector value={hazard} onChange={setHazard} />
            </section>
          </div>

          {/* Analyze button */}
          <div className="p-4 border-t border-slate-200 bg-white/90 backdrop-blur-sm">
            <button
              onClick={handleAnalyze}
              disabled={!canRun}
              className={`w-full py-3 rounded-xl font-semibold text-sm transition
                flex items-center justify-center gap-2 shadow-sm
                ${canRun
                  ? 'bg-gradient-to-r from-primary-700 to-primary-600 text-white hover:from-primary-800 hover:to-primary-700'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              aria-disabled={!canRun}
            >
              <Activity className="w-4 h-4" />
              {loading ? 'Analyzing…' : 'Run Analysis'}
            </button>
            {!region && (
              <p className="text-[11px] text-slate-400 text-center mt-2">Select a region first</p>
            )}
          </div>
        </aside>

        {/* Sidebar collapse toggle (desktop only) */}
        <button
          onClick={() => setSidebarCollapsed((v) => !v)}
          className={`hidden lg:flex fixed top-1/2 -translate-y-1/2 z-20
            w-5 h-10 bg-white border border-slate-200 rounded-r-lg
            items-center justify-center text-slate-400 hover:text-primary-600
            hover:bg-primary-50 transition shadow-sm
            ${sidebarCollapsed ? 'left-0' : 'left-72 sm:left-80'}`}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{ marginTop: '3.5rem' }}
        >
          {sidebarCollapsed
            ? <ChevronRight className="w-3.5 h-3.5" />
            : <ChevronLeft  className="w-3.5 h-3.5" />}
        </button>

        {/* ── Main content ─────────────────────────────────────────────── */}
        <main className="flex-1 min-w-0 overflow-x-hidden p-4 sm:p-6 lg:p-8">

          {loading && <Spinner />}

          {!loading && !result && !error && <Welcome />}

          {error && <ErrorBanner message={error} onDismiss={reset} />}

          {result && (
            <div className="space-y-6">

              {/* Result header */}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                    {result.region.name}
                  </h2>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Heatwave analysis &middot; {result.start_year}–{result.end_year} &middot;
                    Threshold: <strong>{result.threshold_temp?.toFixed(1)} °C</strong>
                    {result.cached && (
                      <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                        ⚡ Cached
                      </span>
                    )}
                  </p>
                </div>
                <ExportButtons analysisId={result.analysis_id} />
              </div>

              {/* Summary */}
              <SummaryInsights result={result} />

              {/* Charts 2-col on xl */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                <TrendChart
                  data={result.rolling_avg_5yr}
                  title="Heatwave Frequency"
                  subtitle="Annual event count with 5-year rolling average"
                />
                <HeatmapChart
                  data={result.rolling_avg_5yr}
                  title="Total Heatwave Days"
                  subtitle="Cumulative heatwave days per year"
                />
              </div>

              <DurationChart
                data={result.yearly_stats}
                title="Heatwave Duration Trends"
                subtitle="Average and maximum heatwave duration per year"
              />

              {/* Events table */}
              {result.heatwave_events?.length > 0
                ? <EventsTable events={result.heatwave_events} />
                : (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
                    No heatwave events detected for this region and time period using the 95th
                    percentile threshold. This can indicate a naturally cool climate or limited data coverage.
                  </div>
                )
              }
            </div>
          )}
        </main>
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 bg-white py-3 px-4 sm:px-6">
        <div className="max-w-screen-2xl mx-auto flex flex-wrap items-center
                        justify-between gap-2 text-xs text-slate-400">
          <span>Climate Hazard Trend Analyzer · Data: Open-Meteo Archive API</span>
          <span className="hidden sm:block">
            Heatwave = 3+ days above 95th percentile · FastAPI + MongoDB + React
          </span>
        </div>
      </footer>
    </div>
  )
}
