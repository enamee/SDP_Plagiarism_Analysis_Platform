from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.document import DocumentRecord
from app.services.report_generator import generate_comparison_report_pdf
from app.services.similarity import compare_two_documents

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/comparison")
def download_comparison_report(
   document_a_id: int,
   document_b_id: int,
   db: Session = Depends(get_db),
):
   if document_a_id == document_b_id:
       raise HTTPException(
           status_code=400,
           detail="Please choose two different documents."
       )

   document_a = db.get(DocumentRecord, document_a_id)
   document_b = db.get(DocumentRecord, document_b_id)

   if not document_a:
       raise HTTPException(status_code=404, detail="Document A not found.")

   if not document_b:
       raise HTTPException(status_code=404, detail="Document B not found.")

   if not document_a.extracted_text.strip():
       raise HTTPException(status_code=400, detail="Document A has no extracted text.")

   if not document_b.extracted_text.strip():
       raise HTTPException(status_code=400, detail="Document B has no extracted text.")

   comparison = compare_two_documents(
       document_a.extracted_text,
       document_b.extracted_text
   )

   filepath, filename = generate_comparison_report_pdf(
       document_a_title=document_a.title,
       document_b_title=document_b.title,
       overall_percentage=comparison["overall_percentage"],
       similarity_label=comparison["similarity_label"],
       top_matches=comparison["top_matches"],
   )

   return FileResponse(
       path=str(filepath),
       filename=filename,
       media_type="application/pdf",
   )
