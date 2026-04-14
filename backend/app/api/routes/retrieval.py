from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import engine, get_db
from app.models.document import DocumentRecord
from app.schemas.retrieval import ShortlistResponse
from app.services.retrieval import run_fts_shortlist

router = APIRouter(prefix="/api/retrieval", tags=["retrieval"])


@router.get("/shortlist/{document_id}", response_model=ShortlistResponse)
def get_shortlist(
    document_id: int,
    top_k: int = 10,
    same_scope_first: bool = True,
    scope_only: bool = False,
    db: Session = Depends(get_db),
):
    if top_k < 1:
        raise HTTPException(status_code=400, detail="top_k must be at least 1.")

    source_document = db.get(DocumentRecord, document_id)

    if not source_document:
        raise HTTPException(status_code=404, detail="Source document not found.")

    if not source_document.extracted_text.strip():
        raise HTTPException(status_code=400, detail="Source document has no extracted text.")

    shortlist = run_fts_shortlist(
        db=db,
        engine=engine,
        source_document=source_document,
        top_k=top_k,
        same_scope_first=same_scope_first,
        scope_only=scope_only,
    )

    return {
        "source_document_id": source_document.id,
        "source_document_title": source_document.title,
        "scope_key": source_document.scope_key,
        "fts_query": shortlist["fts_query"],
        "same_scope_first": same_scope_first,
        "scope_only": scope_only,
        "returned_candidates": len(shortlist["results"]),
        "results": shortlist["results"],
    }
