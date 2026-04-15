from itertools import combinations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.document import DocumentRecord
from app.schemas.batch import BatchCheckRequest, BatchCheckResponse
from app.services.similarity import compare_two_documents
from app.core.logger import log_event

router = APIRouter(prefix="/api/batch-check", tags=["batch-check"])


@router.post("", response_model=BatchCheckResponse)
def run_batch_check(payload: BatchCheckRequest, db: Session = Depends(get_db)):
   unique_ids = list(dict.fromkeys(payload.document_ids))

   if len(unique_ids) < 2:
       raise HTTPException(
           status_code=400,
           detail="Please select at least two different documents."
       )

   if payload.min_similarity < 0 or payload.min_similarity > 1:
       raise HTTPException(
           status_code=400,
           detail="min_similarity must be between 0 and 1."
       )

   if payload.max_pairs < 1:
       raise HTTPException(
           status_code=400,
           detail="max_pairs must be at least 1."
       )

   log_event(
        "batch_check.start",
        "Batch check started",
        selected_document_count=len(unique_ids),
        min_similarity=payload.min_similarity,
        max_pairs=payload.max_pairs,
   )

   documents = []
   for document_id in unique_ids:
       document = db.get(DocumentRecord, document_id)

       if not document:
           raise HTTPException(
               status_code=404,
               detail=f"Document with ID {document_id} not found."
           )

       if not document.extracted_text.strip():
           raise HTTPException(
               status_code=400,
               detail=f"Document '{document.title}' has no extracted text."
           )

       documents.append(document)

   pair_results = []

   for document_a, document_b in combinations(documents, 2):
       comparison = compare_two_documents(
           document_a.extracted_text,
           document_b.extracted_text
       )

       if comparison["overall_similarity"] >= payload.min_similarity:
           pair_results.append({
               "document_a_id": document_a.id,
               "document_a_title": document_a.title,
               "document_b_id": document_b.id,
               "document_b_title": document_b.title,
               "overall_similarity": comparison["overall_similarity"],
               "overall_percentage": comparison["overall_percentage"],
               "similarity_label": comparison["similarity_label"],
               "top_matches": comparison["top_matches"][:3],
           })

   pair_results.sort(
       key=lambda item: item["overall_similarity"],
       reverse=True
   )

   top_results = pair_results[:payload.max_pairs]

   total_pairs_checked = len(list(combinations(documents, 2)))

   log_event(
           "batch_check.complete",
           "Batch check completed",
           selected_document_count=len(documents),
           total_pairs_checked=total_pairs_checked,
           returned_pairs=len(top_results),
    )

   return {
       "selected_document_count": len(documents),
       "total_pairs_checked": total_pairs_checked,
       "returned_pairs": len(top_results),
       "results": top_results,
   }
