from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.document import DocumentRecord
from app.schemas.compare import CompareDocumentsRequest, CompareDocumentsResponse
from app.services.similarity import compare_two_documents

router = APIRouter(prefix="/api/compare", tags=["comparison"])


@router.post("/documents", response_model=CompareDocumentsResponse)
def compare_documents(payload: CompareDocumentsRequest, db: Session = Depends(get_db)):
   if payload.document_a_id == payload.document_b_id:
       raise HTTPException(
           status_code=400,
           detail="Please choose two different documents."
       )

   document_a = db.get(DocumentRecord, payload.document_a_id)
   document_b = db.get(DocumentRecord, payload.document_b_id)

   if not document_a:
       raise HTTPException(status_code=404, detail="Document A not found.")

   if not document_b:
       raise HTTPException(status_code=404, detail="Document B not found.")

   if not document_a.extracted_text.strip():
       raise HTTPException(status_code=400, detail="Document A has no extracted text.")

   if not document_b.extracted_text.strip():
       raise HTTPException(status_code=400, detail="Document B has no extracted text.")

   result = compare_two_documents(document_a.extracted_text, document_b.extracted_text)

   return {
       "document_a_id": document_a.id,
       "document_b_id": document_b.id,
       "document_a_title": document_a.title,
       "document_b_title": document_b.title,
       "overall_similarity": result["overall_similarity"],
       "overall_percentage": result["overall_percentage"],
       "similarity_label": result["similarity_label"],
       "top_matches": result["top_matches"],
   }
