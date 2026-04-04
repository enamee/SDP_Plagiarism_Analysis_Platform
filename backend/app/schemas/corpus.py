from pydantic import BaseModel

from app.schemas.compare import SentenceMatch


class CorpusCandidateResult(BaseModel):
   candidate_document_id: int
   candidate_title: str
   candidate_extension: str
   overall_similarity: float
   overall_percentage: float
   similarity_label: str
   top_matches: list[SentenceMatch]


class CorpusCheckResponse(BaseModel):
   source_document_id: int
   source_document_title: str
   total_candidates_checked: int
   returned_candidates: int
   results: list[CorpusCandidateResult]
