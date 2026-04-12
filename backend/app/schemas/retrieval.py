from pydantic import BaseModel


class ShortlistCandidate(BaseModel):
    document_id: int
    title: str
    course_code: str
    assignment_name: str
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
    returned_candidates: int
    results: list[ShortlistCandidate]
