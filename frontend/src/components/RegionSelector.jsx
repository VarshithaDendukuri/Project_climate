import { useState, useEffect, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { MapPin, Search, X } from 'lucide-react'
import { fetchRegions } from '../services/api'

/* ── Fix Leaflet default icon in Vite ─────────────────────────────────── */
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

function ClickHandler({ onMapClick }) {
  useMapEvents({ click: (e) => onMapClick(e.latlng) })
  return null
}

export default function RegionSelector({ value, onChange }) {
  const [predefined, setPredefined] = useState([])
  const [search,     setSearch]     = useState('')
  const [mapOpen,    setMapOpen]    = useState(false)

  useEffect(() => {
    fetchRegions().then(setPredefined).catch(() => {})
  }, [])

  const handleMapClick = useCallback(
    ({ lat, lng }) =>
      onChange({
        lat: parseFloat(lat.toFixed(4)),
        lon: parseFloat(lng.toFixed(4)),
        name: `Custom (${lat.toFixed(3)}, ${lng.toFixed(3)})`,
      }),
    [onChange],
  )

  const select = (r) => { onChange({ lat: r.lat, lon: r.lon, name: r.name }); setSearch('') }

  const filtered = predefined.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.country.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search city or country…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-8 py-2.5 text-sm border border-slate-200 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white
                     placeholder-slate-400 transition"
          aria-label="Search region"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {search && (
        <div className="border border-slate-200 rounded-lg bg-white shadow-lg max-h-48 overflow-y-auto">
          {filtered.length > 0 ? (
            filtered.map((r) => (
              <button
                key={r.name}
                onClick={() => select(r)}
                className="w-full text-left px-4 py-2.5 hover:bg-primary-50 transition
                           text-sm border-b border-slate-100 last:border-0 flex items-start gap-2"
              >
                <MapPin className="w-4 h-4 text-primary-600 mt-0.5 shrink-0" />
                <div>
                  <span className="font-medium text-slate-800">{r.name}</span>
                  <span className="text-slate-400 ml-1 text-xs">· {r.country}</span>
                  <div className="text-xs text-slate-400">{r.description}</div>
                </div>
              </button>
            ))
          ) : (
            <p className="p-3 text-sm text-slate-400 text-center">No results</p>
          )}
        </div>
      )}

      {/* Selected chip */}
      {value && (
        <div className="flex items-center gap-2 px-3 py-2.5 bg-primary-50 border border-primary-200 rounded-lg">
          <MapPin className="w-4 h-4 text-primary-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-primary-800 truncate">{value.name}</p>
            <p className="text-xs text-primary-500">{value.lat.toFixed(3)}°, {value.lon.toFixed(3)}°</p>
          </div>
          <button onClick={() => onChange(null)} aria-label="Clear region"
                  className="text-primary-400 hover:text-primary-700 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Quick grid */}
      {!search && (
        <>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Quick select</p>
          <div className="grid grid-cols-2 gap-1.5">
            {predefined.slice(0, 10).map((r) => (
              <button
                key={r.name}
                onClick={() => select(r)}
                className={`text-left px-3 py-2 rounded-lg text-xs border transition
                  ${value?.name === r.name
                    ? 'bg-primary-100 border-primary-400 text-primary-800 font-semibold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-primary-50 hover:border-primary-300'
                  }`}
              >
                <div className="font-medium truncate">{r.name}</div>
                <div className="text-[10px] text-slate-400">{r.country}</div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Map toggle */}
      <button
        onClick={() => setMapOpen((v) => !v)}
        className="w-full flex items-center justify-center gap-2 py-2 text-sm
                   text-primary-700 border border-primary-200 rounded-lg
                   hover:bg-primary-50 transition"
      >
        <MapPin className="w-4 h-4" />
        {mapOpen ? 'Hide map' : 'Pick location on map'}
      </button>

      {/* Leaflet map */}
      {mapOpen && (
        <div className="h-56 rounded-xl overflow-hidden border border-slate-200 shadow-inner">
          <MapContainer
            center={value ? [value.lat, value.lon] : [22, 78]}
            zoom={value ? 7 : 4}
            className="h-full w-full"
            scrollWheelZoom={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ClickHandler onMapClick={handleMapClick} />
            {value && (
              <Marker position={[value.lat, value.lon]}>
                <Popup>{value.name}</Popup>
              </Marker>
            )}
          </MapContainer>
        </div>
      )}
    </div>
  )
}
