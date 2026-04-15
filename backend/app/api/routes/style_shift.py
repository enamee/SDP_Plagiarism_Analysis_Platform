from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.document import DocumentRecord
from app.schemas.style_shift import StyleShiftRequest, StyleShiftResponse
from app.services.style_shift import analyze_style_shift
from app.core.logger import log_event

router = APIRouter(prefix="/api/style-shift", tags=["style-shift"])


@router.post("", response_model=StyleShiftResponse)
def run_style_shift_analysis(payload: StyleShiftRequest, db: Session = Depends(get_db)):
    document = db.get(DocumentRecord, payload.document_id)

    if not document:
        raise HTTPException(status_code=404, detail="Document not found.")

    if not document.extracted_text.strip():
        raise HTTPException(status_code=400, detail="Document has no extracted text.")

    log_event(
        "style_shift.start",
        "Style-shift analysis started",
        document_id=document.id,
        document_title=document.title,
        chunk_size=payload.chunk_size,
        anomaly_threshold=payload.anomaly_threshold,
    )

    try:
        result = analyze_style_shift(
            text=document.extracted_text,
            chunk_size=payload.chunk_size,
            anomaly_threshold=payload.anomaly_threshold,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    log_event(
        "style_shift.complete",
        "Style-shift analysis completed",
        document_id=document.id,
        total_chunks=result["total_chunks"],
        suspicious_chunk_count=result["suspicious_chunk_count"],
        average_anomaly_score=result["average_anomaly_score"],
    )

    return {
        "document_id": document.id,
        "document_title": document.title,
        "total_chunks": result["total_chunks"],
        "suspicious_chunk_count": result["suspicious_chunk_count"],
        "average_anomaly_score": result["average_anomaly_score"],
        "chunks": result["chunks"],
    }
