from pydantic import BaseModel

from app.schemas.compare import SentenceMatch


class CorpusCandidateResult(BaseModel):
    candidate_document_id: int
    candidate_title: str
    candidate_extension: str
    candidate_scope_key: str
    same_scope: bool
    retrieval_rank_score: float
    overall_similarity: float
    overall_percentage: float
    similarity_label: str
    top_matches: list[SentenceMatch]


class CorpusCheckResponse(BaseModel):
    source_document_id: int
    source_document_title: str
    scope_key: str
    fts_query: str
    same_scope_first: bool
    scope_only: bool
    shortlist_candidates_retrieved: int
    detailed_candidates_checked: int
    returned_candidates: int
    shortlist_top_k: int
    result_top_k: int
    results: list[CorpusCandidateResult]
