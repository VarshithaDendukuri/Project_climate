import { useState } from 'react'
import { FileSpreadsheet, FileText, Loader2 } from 'lucide-react'
import api from '../services/api'

async function downloadBlob(url, filename) {
  const response = await api.get(url, { responseType: 'blob' })
  const blob = new Blob([response.data], {
    type: response.headers['content-type'] || 'application/octet-stream',
  })
  const href = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = href
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(href)
}

export default function ExportButtons({ analysisId }) {
  const [csvLoading, setCsvLoading] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [csvError,   setCsvError]   = useState(null)
  const [pdfError,   setPdfError]   = useState(null)

  if (!analysisId) return null

  const handleCsv = async () => {
    setCsvLoading(true)
    setCsvError(null)
    try {
      await downloadBlob(
        `/export/csv/${analysisId}`,
        `heatwave_${analysisId.slice(0, 8)}.csv`,
      )
    } catch {
      setCsvError('CSV download failed')
    } finally {
      setCsvLoading(false)
    }
  }

  const handlePdf = async () => {
    setPdfLoading(true)
    setPdfError(null)
    try {
      await downloadBlob(
        `/export/pdf/${analysisId}`,
        `heatwave_${analysisId.slice(0, 8)}.pdf`,
      )
    } catch {
      setPdfError('PDF download failed')
    } finally {
      setPdfLoading(false)
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <div className="flex flex-col items-start gap-0.5">
        <button
          onClick={handleCsv}
          disabled={csvLoading}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200
                     rounded-xl text-xs font-medium text-slate-700 hover:bg-green-50
                     hover:border-green-300 hover:text-green-700 transition shadow-sm
                     disabled:opacity-60 disabled:cursor-not-allowed"
          aria-label="Export data as CSV"
        >
          {csvLoading
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <FileSpreadsheet className="w-3.5 h-3.5" />}
          CSV
        </button>
        {csvError && <span className="text-[10px] text-red-500 px-1">{csvError}</span>}
      </div>

      <div className="flex flex-col items-start gap-0.5">
        <button
          onClick={handlePdf}
          disabled={pdfLoading}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200
                     rounded-xl text-xs font-medium text-slate-700 hover:bg-red-50
                     hover:border-red-300 hover:text-red-700 transition shadow-sm
                     disabled:opacity-60 disabled:cursor-not-allowed"
          aria-label="Export report as PDF"
        >
          {pdfLoading
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <FileText className="w-3.5 h-3.5" />}
          PDF
        </button>
        {pdfError && <span className="text-[10px] text-red-500 px-1">{pdfError}</span>}
      </div>
    </div>
  )
}
