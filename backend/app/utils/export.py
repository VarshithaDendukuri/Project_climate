"""CSV and PDF export utilities."""
import io
import csv
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)


def generate_csv(yearly_stats: List[Dict[str, Any]]) -> bytes:
    """Return UTF-8 encoded CSV of yearly heatwave statistics."""
    output = io.StringIO()
    fields = ["year", "event_count", "total_heatwave_days",
              "max_duration", "avg_duration", "max_temp_recorded", "avg_max_temp"]
    writer = csv.DictWriter(output, fieldnames=fields, extrasaction="ignore")
    writer.writeheader()
    writer.writerows(yearly_stats)
    return output.getvalue().encode("utf-8")


def generate_pdf(data: Dict[str, Any]) -> bytes:
    """Generate a styled PDF summary report with ReportLab."""
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.lib import colors
        from reportlab.platypus import (
            SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
        )
        from reportlab.lib.enums import TA_CENTER

        buf = io.BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=A4,
                                rightMargin=2*cm, leftMargin=2*cm,
                                topMargin=2*cm, bottomMargin=2*cm)
        styles = getSampleStyleSheet()
        BLUE = colors.HexColor("#1d4ed8")
        LIGHT = colors.HexColor("#eff6ff")
        story = []

        # ── Title ─────────────────────────────────────────────────────────
        title_style = ParagraphStyle("T", parent=styles["Heading1"],
                                     fontSize=18, textColor=BLUE, spaceAfter=4)
        story.append(Paragraph("Climate Hazard Trend Analyzer — Report", title_style))
        story.append(HRFlowable(width="100%", thickness=1, color=BLUE))
        story.append(Spacer(1, 0.3*cm))

        # ── Metadata ──────────────────────────────────────────────────────
        meta = ParagraphStyle("M", parent=styles["Normal"], fontSize=10, spaceAfter=3)
        region = data.get("region", {})
        story.append(Paragraph(
            f"<b>Region:</b> {region.get('name','N/A')} "
            f"(Lat {region.get('lat','?')}, Lon {region.get('lon','?')})", meta))
        story.append(Paragraph(
            f"<b>Period:</b> {data.get('start_year')} – {data.get('end_year')} &nbsp;&nbsp; "
            f"<b>Hazard:</b> {str(data.get('hazard_type','')).title()} &nbsp;&nbsp; "
            f"<b>Threshold (95th pct):</b> {data.get('threshold_temp','?')} °C", meta))
        story.append(Paragraph(f"<b>Generated:</b> {data.get('computed_at','')}", meta))
        story.append(Spacer(1, 0.4*cm))

        h2 = ParagraphStyle("H2", parent=styles["Heading2"], fontSize=13, textColor=BLUE, spaceAfter=6)

        # ── Insights ──────────────────────────────────────────────────────
        story.append(Paragraph("Summary Insights", h2))
        ins_style = ParagraphStyle("Ins", parent=styles["Normal"], fontSize=10, leftIndent=10, spaceAfter=4)
        for ins in data.get("summary_insights", []):
            story.append(Paragraph(f"• {ins.get('text','')}", ins_style))
        story.append(Spacer(1, 0.4*cm))

        # ── Trend ─────────────────────────────────────────────────────────
        trend = data.get("trend", {})
        if trend:
            story.append(Paragraph("Trend Analysis", h2))
            rows = [
                ["Metric", "Value"],
                ["Direction", trend.get("trend_direction","").title()],
                ["Slope (events/yr)", f"{trend.get('slope',0):.4f}"],
                ["R²", f"{trend.get('r_squared',0):.4f}"],
                ["P-value", f"{trend.get('p_value',1):.4f}"],
                ["Significant (p<0.05)", "Yes" if trend.get("is_significant") else "No"],
            ]
            if trend.get("mann_kendall_tau") is not None:
                rows += [
                    ["Mann-Kendall τ", f"{trend['mann_kendall_tau']:.4f}"],
                    ["Mann-Kendall p",  f"{trend['mann_kendall_p']:.4f}"],
                ]
            t = Table(rows, colWidths=[9*cm, 8*cm])
            t.setStyle(TableStyle([
                ("BACKGROUND",(0,0),(-1,0), BLUE),
                ("TEXTCOLOR",(0,0),(-1,0), colors.white),
                ("FONTNAME",(0,0),(-1,0),"Helvetica-Bold"),
                ("FONTSIZE",(0,0),(-1,-1), 9),
                ("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.white, LIGHT]),
                ("GRID",(0,0),(-1,-1), 0.5, colors.HexColor("#bfdbfe")),
                ("TOPPADDING",(0,0),(-1,-1), 5),
                ("BOTTOMPADDING",(0,0),(-1,-1), 5),
                ("LEFTPADDING",(0,0),(-1,-1), 8),
            ]))
            story.append(t)
            story.append(Spacer(1, 0.4*cm))

        # ── Yearly table ──────────────────────────────────────────────────
        story.append(Paragraph("Yearly Heatwave Statistics", h2))
        ys = data.get("yearly_stats", [])
        if ys:
            header = [["Year","Events","HW Days","Max Dur","Avg Dur","Max Temp °C"]]
            rows2 = header + [
                [str(r.get("year","")), str(r.get("event_count",0)),
                 str(r.get("total_heatwave_days",0)), str(r.get("max_duration",0)),
                 f"{r.get('avg_duration',0):.1f}", f"{r.get('max_temp_recorded',0):.1f}"]
                for r in ys
            ]
            t2 = Table(rows2, colWidths=[2.5*cm,2.5*cm,2.5*cm,2.5*cm,2.5*cm,3*cm])
            t2.setStyle(TableStyle([
                ("BACKGROUND",(0,0),(-1,0), BLUE),
                ("TEXTCOLOR",(0,0),(-1,0), colors.white),
                ("FONTNAME",(0,0),(-1,0),"Helvetica-Bold"),
                ("FONTSIZE",(0,0),(-1,-1), 8),
                ("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.white, LIGHT]),
                ("GRID",(0,0),(-1,-1), 0.5, colors.HexColor("#bfdbfe")),
                ("ALIGN",(1,0),(-1,-1),"CENTER"),
                ("TOPPADDING",(0,0),(-1,-1), 4),
                ("BOTTOMPADDING",(0,0),(-1,-1), 4),
            ]))
            story.append(t2)

        # ── Footer ────────────────────────────────────────────────────────
        story.append(Spacer(1, 0.5*cm))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.grey))
        footer = ParagraphStyle("F", parent=styles["Normal"], fontSize=8,
                                textColor=colors.grey, alignment=TA_CENTER)
        story.append(Paragraph(
            "Climate Hazard Trend Analyzer · Data: Open-Meteo Archive API · "
            "Heatwave: 3+ consecutive days above 95th percentile max temperature", footer))

        doc.build(story)
        return buf.getvalue()

    except ImportError:
        raise RuntimeError("PDF generation requires reportlab — pip install reportlab")
