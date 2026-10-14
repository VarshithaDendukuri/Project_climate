"""
Export router — CSV and PDF download of analysis results.
"""
import io
import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.services.db_service import db_service
from app.utils.export import generate_csv, generate_pdf

logger = logging.getLogger(__name__)
router = APIRouter()


def _safe_id(analysis_id: str) -> bool:
    """Allow only UUID-like strings (hex + hyphens)."""
    return all(c in "0123456789abcdefABCDEF-" for c in analysis_id) and len(analysis_id) <= 36


@router.get("/export/csv/{analysis_id}")
async def export_csv(analysis_id: str):
    if not _safe_id(analysis_id):
        raise HTTPException(status_code=400, detail="Invalid analysis ID")

    data = await db_service.get_analysis_by_id(analysis_id)
    if not data:
        raise HTTPException(status_code=404, detail="Analysis not found or expired")

    region_name = data.get("region", {}).get("name", "unknown").replace(" ", "_")
    filename = f"heatwave_{region_name}_{data.get('start_year')}_{data.get('end_year')}.csv"

    return StreamingResponse(
        io.BytesIO(generate_csv(data.get("yearly_stats", []))),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/export/pdf/{analysis_id}")
async def export_pdf(analysis_id: str):
    if not _safe_id(analysis_id):
        raise HTTPException(status_code=400, detail="Invalid analysis ID")

    data = await db_service.get_analysis_by_id(analysis_id)
    if not data:
        raise HTTPException(status_code=404, detail="Analysis not found or expired")

    try:
        pdf_bytes = generate_pdf(data)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    region_name = data.get("region", {}).get("name", "unknown").replace(" ", "_")
    filename = f"heatwave_{region_name}_{data.get('start_year')}_{data.get('end_year')}.pdf"

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
