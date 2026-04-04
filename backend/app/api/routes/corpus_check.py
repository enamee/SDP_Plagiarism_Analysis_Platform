from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.document import DocumentRecord
from app.schemas.corpus import CorpusCheckResponse
from app.services.similarity import compare_two_documents

router = APIRouter(prefix="/api/corpus-check", tags=["corpus-check"])


@router.get("/{document_id}", response_model=CorpusCheckResponse)
def run_corpus_check(
   document_id: int,
   top_k: int = 5,
   db: Session = Depends(get_db),
):
   if top_k < 1:
       raise HTTPException(status_code=400, detail="top_k must be at least 1.")

   source_document = db.get(DocumentRecord, document_id)

   if not source_document:
       raise HTTPException(status_code=404, detail="Source document not found.")

   if not source_document.extracted_text.strip():
       raise HTTPException(
           status_code=400,
           detail="Source document has no extracted text."
       )

   statement = select(DocumentRecord).where(DocumentRecord.id != document_id)
   candidates = db.scalars(statement).all()

   ranked_results = []

   for candidate in candidates:
       if not candidate.extracted_text.strip():
           continue

       comparison = compare_two_documents(
           source_document.extracted_text,
           candidate.extracted_text
       )

       ranked_results.append({
           "candidate_document_id": candidate.id,
           "candidate_title": candidate.title,
           "candidate_extension": candidate.extension,
           "overall_similarity": comparison["overall_similarity"],
           "overall_percentage": comparison["overall_percentage"],
           "similarity_label": comparison["similarity_label"],
           "top_matches": comparison["top_matches"][:3],
       })

   ranked_results.sort(
       key=lambda item: item["overall_similarity"],
       reverse=True
   )

   top_results = ranked_results[:top_k]

   return {
       "source_document_id": source_document.id,
       "source_document_title": source_document.title,
       "total_candidates_checked": len(ranked_results),
       "returned_candidates": len(top_results),
       "results": top_results,
   }
