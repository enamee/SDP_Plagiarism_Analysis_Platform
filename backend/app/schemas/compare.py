from pydantic import BaseModel


class CompareDocumentsRequest(BaseModel):
   document_a_id: int
   document_b_id: int


class SentenceMatch(BaseModel):
   sentence_a: str
   sentence_b: str
   similarity: float


class CompareDocumentsResponse(BaseModel):
   document_a_id: int
   document_b_id: int
   document_a_title: str
   document_b_title: str
   overall_similarity: float
   overall_percentage: float
   similarity_label: str
   top_matches: list[SentenceMatch]
