from pydantic import BaseModel


class CompareDocumentsRequest(BaseModel):
   document_a_id: int
   document_b_id: int
   use_semantic_scoring: bool | None = None
   sentence_match_threshold: float | None = None


class SentenceMatch(BaseModel):
   sentence_a: str
   sentence_b: str
   similarity: float


class SimilarityDebug(BaseModel):
   scorer_path: str
   semantic_requested: bool | None = None
   word_lexical_score: float
   char_lexical_score: float
   semantic_score: float | None = None


class CompareDocumentsResponse(BaseModel):
   document_a_id: int
   document_b_id: int
   document_a_title: str
   document_b_title: str
   overall_similarity: float
   overall_percentage: float
   similarity_label: str
   top_matches: list[SentenceMatch]
   debug: SimilarityDebug | None = None
