from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import engine, get_db
from app.core.logger import log_event
from app.models.document import DocumentRecord
from app.schemas.corpus import CorpusCheckResponse
from app.services.retrieval import run_fts_shortlist
from app.services.similarity import compare_two_documents

router = APIRouter(prefix="/api/corpus-check", tags=["corpus-check"])


@router.get("/{document_id}", response_model=CorpusCheckResponse)
def run_corpus_check(
    document_id: int,
    result_top_k: int = 5,
    shortlist_top_k: int = 20,
    same_scope_first: bool = True,
    scope_only: bool = False,
    use_semantic_scoring: bool | None = None,
    sentence_match_threshold: float | None = None,
    db: Session = Depends(get_db),
):
    if result_top_k < 1:
        raise HTTPException(status_code=400, detail="result_top_k must be at least 1.")

    if shortlist_top_k < 1:
        raise HTTPException(status_code=400, detail="shortlist_top_k must be at least 1.")

    if sentence_match_threshold is not None:
        if sentence_match_threshold < 0 or sentence_match_threshold > 1:
            raise HTTPException(
                status_code=400,
                detail="sentence_match_threshold must be between 0 and 1.",
            )

    source_document = db.get(DocumentRecord, document_id)

    if not source_document:
        raise HTTPException(status_code=404, detail="Source document not found.")

    if not source_document.extracted_text.strip():
        raise HTTPException(
            status_code=400,
            detail="Source document has no extracted text."
        )

    log_event(
        "corpus_check.start",
        "Detailed corpus check started",
        source_document_id=source_document.id,
        source_title=source_document.title,
        result_top_k=result_top_k,
        shortlist_top_k=shortlist_top_k,
        same_scope_first=same_scope_first,
        scope_only=scope_only,
    )

    shortlist = run_fts_shortlist(
        db=db,
        engine=engine,
        source_document=source_document,
        top_k=shortlist_top_k,
        same_scope_first=same_scope_first,
        scope_only=scope_only,
    )

    if not shortlist["results"]:
        log_event(
            "corpus_check.complete",
            "Detailed corpus check completed with no shortlist candidates",
            source_document_id=source_document.id,
            returned_candidates=0,
        )

        return {
            "source_document_id": source_document.id,
            "source_document_title": source_document.title,
            "scope_key": source_document.scope_key,
            "fts_query": shortlist["fts_query"],
            "same_scope_first": same_scope_first,
            "scope_only": scope_only,
            "shortlist_candidates_retrieved": 0,
            "detailed_candidates_checked": 0,
            "returned_candidates": 0,
            "shortlist_top_k": shortlist_top_k,
            "result_top_k": result_top_k,
            "results": [],
        }

    ranked_results = []

    for item in shortlist["results"]:
        candidate = db.get(DocumentRecord, item["document_id"])

        if not candidate:
            continue

        if not candidate.extracted_text.strip():
            continue

        comparison = compare_two_documents(
            source_document.extracted_text,
            candidate.extracted_text,
            sentence_top_k=None,
            sentence_threshold=sentence_match_threshold,
            max_sentences_per_document=None,
            use_semantic_scoring=use_semantic_scoring,
        )

        ranked_results.append({
            "candidate_document_id": candidate.id,
            "candidate_title": candidate.title,
            "candidate_extension": candidate.extension,
            "candidate_scope_key": candidate.scope_key,
            "same_scope": item["same_scope"],
            "retrieval_rank_score": item["rank_score"],
            "overall_similarity": comparison["overall_similarity"],
            "overall_percentage": comparison["overall_percentage"],
            "similarity_label": comparison["similarity_label"],
            "top_matches": comparison["top_matches"],
        })

    ranked_results.sort(
        key=lambda item: item["overall_similarity"],
        reverse=True
    )

    top_results = ranked_results[:result_top_k]

    log_event(
        "corpus_check.complete",
        "Detailed corpus check completed",
        source_document_id=source_document.id,
        shortlist_candidates_retrieved=len(shortlist["results"]),
        detailed_candidates_checked=len(ranked_results),
        returned_candidates=len(top_results),
        fts_query=shortlist["fts_query"],
    )

    return {
        "source_document_id": source_document.id,
        "source_document_title": source_document.title,
        "scope_key": source_document.scope_key,
        "fts_query": shortlist["fts_query"],
        "same_scope_first": same_scope_first,
        "scope_only": scope_only,
        "shortlist_candidates_retrieved": len(shortlist["results"]),
        "detailed_candidates_checked": len(ranked_results),
        "returned_candidates": len(top_results),
        "shortlist_top_k": shortlist_top_k,
        "result_top_k": result_top_k,
        "results": top_results,
    }
