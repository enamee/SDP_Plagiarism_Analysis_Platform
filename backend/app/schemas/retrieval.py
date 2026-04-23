from pydantic import BaseModel


class ShortlistCandidate(BaseModel):
    document_id: int
    title: str
    comparison_group: str
    document_type: str
    scope_key: str
    extension: str
    same_scope: bool
    rank_score: float


class ShortlistResponse(BaseModel):
    source_document_id: int
    source_document_title: str
    scope_key: str
    fts_query: str
    same_scope_first: bool
    scope_only: bool
    returned_candidates: int
    results: list[ShortlistCandidate]
