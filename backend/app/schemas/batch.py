from pydantic import BaseModel, Field

from app.schemas.compare import SentenceMatch


class BatchCheckRequest(BaseModel):
   document_ids: list[int] = Field(min_length=2)
   min_similarity: float = 0.2
   max_pairs: int = 20


class BatchPairResult(BaseModel):
   document_a_id: int
   document_a_title: str
   document_b_id: int
   document_b_title: str
   overall_similarity: float
   overall_percentage: float
   similarity_label: str
   top_matches: list[SentenceMatch]


class BatchCheckResponse(BaseModel):
   selected_document_count: int
   total_pairs_checked: int
   returned_pairs: int
   results: list[BatchPairResult]
