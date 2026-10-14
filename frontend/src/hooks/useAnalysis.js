import { useState, useCallback } from 'react'
import { runAnalysis } from '../services/api'

export function useAnalysis() {
  const [loading, setLoading]  = useState(false)
  const [error,   setError]    = useState(null)
  const [result,  setResult]   = useState(null)

  const analyze = useCallback(async (params) => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await runAnalysis(params)
      setResult(data)
      return data
    } catch (e) {
      setError(e.message || 'Analysis failed')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setResult(null)
    setError(null)
  }, [])

  return { loading, error, result, analyze, reset }
}
