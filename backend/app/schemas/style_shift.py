from pydantic import BaseModel, Field


class StyleShiftRequest(BaseModel):
    document_id: int
    chunk_size: int = Field(default=5, ge=2, le=20)
    anomaly_threshold: float = Field(default=1.2, ge=0.0, le=10.0)


class StyleFeatureSnapshot(BaseModel):
    avg_sentence_length: float
    avg_word_length: float
    lexical_diversity: float
    punctuation_density: float


class StyleChunkResult(BaseModel):
    chunk_index: int
    sentence_count: int
    excerpt: str
    anomaly_score: float
    is_suspicious: bool
    features: StyleFeatureSnapshot


class StyleShiftResponse(BaseModel):
    document_id: int
    document_title: str
    total_chunks: int
    suspicious_chunk_count: int
    average_anomaly_score: float
    chunks: list[StyleChunkResult]
