import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: BASE,
  timeout: 120_000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const msg =
      err.response?.data?.detail ||
      err.response?.data?.message ||
      err.message ||
      'Unexpected error'
    return Promise.reject(new Error(msg))
  },
)

export const fetchRegions = () => api.get('/regions').then((r) => r.data)
export const runAnalysis  = (payload) => api.post('/analyze', payload).then((r) => r.data)
export const getHealth    = () => api.get('/health').then((r) => r.data)

export default api
