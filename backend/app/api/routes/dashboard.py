from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.document import DocumentRecord
from app.schemas.dashboard import DashboardSummaryResponse

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(db: Session = Depends(get_db)):
   documents = db.scalars(
       select(DocumentRecord).order_by(DocumentRecord.created_at.desc())
   ).all()

   total_documents = len(documents)
   manual_documents = sum(1 for doc in documents if doc.source_type == "manual")
   file_documents = sum(1 for doc in documents if doc.source_type == "file")
   warning_documents = sum(1 for doc in documents if doc.extraction_warning)
   total_extracted_characters = sum(doc.extracted_char_count for doc in documents)

   recent_documents = documents[:5]

   return {
       "total_documents": total_documents,
       "manual_documents": manual_documents,
       "file_documents": file_documents,
       "warning_documents": warning_documents,
       "total_extracted_characters": total_extracted_characters,
       "recent_documents": recent_documents,
   }
