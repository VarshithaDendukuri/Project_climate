# Climate Hazard Trend Analyzer

A full-stack web application that ingests historical weather data, detects heatwave events,
and visualizes multi-decade climate hazard trends for any selected region.

Built for the **Full-Stack Developer** case study at **Dygnify Ventures Pvt Ltd**.

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                  Frontend  (React + Vite)                │
│  RegionSelector  ·  TimeRangeSelector  ·  HazardSelector │
│  TrendChart  ·  HeatmapChart  ·  DurationChart           │
│  SummaryInsights  ·  ExportButtons  ·  Leaflet map       │
└────────────────────────┬─────────────────────────────────┘
                         │  Axios / HTTP
┌────────────────────────▼─────────────────────────────────┐
│               Backend  (FastAPI / Python 3.12)           │
│  POST /api/analyze      GET /api/regions                 │
│  GET  /api/export/csv   GET /api/export/pdf              │
│  WeatherService → HazardService → TrendService           │
└──────────┬──────────────────────────────┬────────────────┘
           │                              │
     MongoDB  (Motor)            Open-Meteo Archive API
     weather_cache               (free · no key needed)
     analysis_cache
```

---

## Tech Stack

| Layer       | Technology                                    |
|-------------|-----------------------------------------------|
| Frontend    | React 18 + Vite + Tailwind CSS                |
| Charts      | Recharts                                      |
| Maps        | React-Leaflet + OpenStreetMap                 |
| Backend     | FastAPI (Python 3.12)                         |
| Database    | MongoDB 7 via Motor (async, NoSQL)            |
| Weather API | Open-Meteo Archive API (ERA5 reanalysis)      |
| Trend tests | OLS regression + Mann-Kendall (pymannkendall) |
| PDF export  | ReportLab                                     |
| Rate limit  | slowapi (60 req / min / IP)                   |
| Containers  | Docker + Docker Compose                       |

---

## Data Source

**Open-Meteo Archive API** — `https://archive-api.open-meteo.com`

- Completely free, no API key required
- ERA5 reanalysis data from 1940 onward, ~25 km resolution
- Variables used: `temperature_2m_max`, `temperature_2m_min`, `temperature_2m_mean`
- Fetched in 10-year chunks to avoid timeouts; polite 300 ms delay between chunks

---

## Heatwave Detection Logic

> A **heatwave** is defined as **3 or more consecutive days** where the daily maximum
> temperature exceeds the **95th percentile** of all daily max temperatures recorded
> for that location over the full analysis period.

This is a WMO-inspired, percentile-based, location-agnostic definition —
a "hot" day in Nagpur is not the same threshold as a "hot" day in London.

### Step-by-step

1. Fetch all daily max temps for the region and time range
2. `threshold = np.percentile(all_temps, 95)`
3. Mark each day as "hot" if `max_temp > threshold`
4. Run-length encode consecutive hot days
5. Extract runs ≥ 3 days as heatwave events
6. Aggregate per year: event count, total days, max / avg duration

---

## Trend Analysis

| Method          | Library         | Purpose                                      |
|-----------------|-----------------|----------------------------------------------|
| 5-yr rolling avg | numpy          | Smooth annual noise in charts                |
| OLS regression  | numpy + scipy   | Slope, intercept, R², p-value                |
| Mann-Kendall    | pymannkendall   | Non-parametric monotonic trend significance  |

Trend is marked **statistically significant** when `p < 0.05`.
Insight text is generated honestly — over-claiming is avoided.

---

## Data Quality Handling

| Issue               | Handling                                              |
|---------------------|-------------------------------------------------------|
| Missing days        | Reindex full calendar; linear interpolation ≤ 3 days  |
| Outliers            | Physical bounds (−90 °C to +60 °C) + 4×IQR filter   |
| Duplicate dates     | Dropped                                               |
| API chunking        | 10-year blocks with retry-safe error handling         |
| Coverage report     | Returned in every API response                        |

---

## Security & Performance

| Feature            | Implementation                                   |
|--------------------|--------------------------------------------------|
| Rate limiting      | 60 req / min / IP via slowapi                    |
| Input validation   | Pydantic v2 with range checks + name sanitization |
| Weather cache      | MongoDB TTL index — 7-day expiry                 |
| Analysis cache     | MongoDB TTL index — 24-hour expiry               |
| CORS               | Explicit origin allowlist in config              |
| Safe API access    | httpx with 60 s timeout, chunked fetching        |
| Export safety      | UUID-only analysis IDs, no path traversal        |

---

## Bonus Features

- [x] **Leaflet map** — click anywhere to drop a pin and select a custom location
- [x] **CSV export** — yearly heatwave statistics as `.csv`
- [x] **PDF export** — full styled report via ReportLab
- [x] **Mann-Kendall test** — non-parametric trend significance

---

## Quick Start — Local Development

### Prerequisites
- Python 3.12+
- Node.js 20+
- MongoDB running on `localhost:27017`

### Backend

```bash
cd backend
cp .env.example .env        # edit if MongoDB is not on localhost

python -m venv venv
# Windows:
venv\Scripts\activate
# macOS / Linux:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Swagger UI: http://localhost:8000/docs

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:5173

### Docker Compose (all-in-one)

```bash
docker-compose up --build
```

| Service   | URL                    |
|-----------|------------------------|
| Frontend  | http://localhost:3000  |
| Backend   | http://localhost:8000  |
| MongoDB   | localhost:27017        |

---

## Deployment

### Render (recommended free tier)

1. Push repo to GitHub
2. **Backend** → New Web Service → root `backend/`
   - Build: `pip install -r requirements.txt`
   - Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Env var: `MONGODB_URL` → MongoDB Atlas connection string
3. **Frontend** → New Static Site → root `frontend/`
   - Build: `npm run build`
   - Publish dir: `dist`
   - Env var: `VITE_API_URL` → your Render backend URL + `/api`

### MongoDB Atlas (free tier)
Create a free M0 cluster at https://cloud.mongodb.com and paste the
connection string as `MONGODB_URL`.

---

## API Reference

| Method | Path                        | Description                   |
|--------|-----------------------------|-------------------------------|
| GET    | `/api/health`               | Database + API health check   |
| GET    | `/api/regions`              | List of 18 predefined regions |
| POST   | `/api/analyze`              | Run full analysis pipeline    |
| GET    | `/api/export/csv/{id}`      | Download yearly stats as CSV  |
| GET    | `/api/export/pdf/{id}`      | Download full report as PDF   |

### POST /api/analyze — request body

```json
{
  "region":     { "lat": 19.076, "lon": 72.877, "name": "Mumbai" },
  "start_year": 1990,
  "end_year":   2023,
  "hazard_type": "heatwave"
}
```

---

## Assumptions

1. **Percentile baseline** is computed over the user-selected period (not a fixed
   reference period like 1981–2010). This keeps the analysis self-contained.
2. **Open-Meteo ERA5** data is treated as ground truth. No additional bias correction
   is applied; gaps are noted in the quality report.
3. Heatwave events are attributed to their **start year** for annual aggregation.
4. Maximum analysis window capped at **73 years** to prevent timeouts.
5. First-run latency for a 30-year dataset can be **15–60 s** (API chunking).
   All subsequent calls for the same region/range return from cache instantly.

---

## What I Would Improve with More Time

- **Calendar-percentile threshold**: compare each day only against the same
  calendar day-of-year (removes seasonal bias)
- **Multi-hazard support**: drought (SPI), heavy rainfall (99th pct precipitation), cold snaps
- **Spatial bounding box**: aggregate over a lat/lon grid, not just a single point
- **WebSocket progress bar**: real-time fetch progress for long first-run queries
- **Frontend test suite**: Vitest + React Testing Library
- **Backend test suite**: pytest + pytest-asyncio + httpx mock client

---

## AI Tools Used

**Kiro** (AI development environment) was used to scaffold the full project structure,
write and review all backend services, React components, and this README.
The heatwave detection logic, Mann-Kendall integration, data quality pipeline,
and statistical trend analysis were designed collaboratively and manually verified.

All architecture decisions, assumption choices, and climate logic were reasoned through
by the developer and validated against Open-Meteo API documentation and WMO guidelines.
