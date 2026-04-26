from pydantic import BaseModel, Field

from app.schemas.compare import SentenceMatch


class GraphRequest(BaseModel):
    document_ids: list[int] = Field(default_factory=list)
    min_similarity: float = 0.2
    use_semantic_scoring: bool | None = None


class GraphNode(BaseModel):
    id: int
    label: str
    extension: str


class GraphEdge(BaseModel):
    source: int
    target: int
    source_title: str
    target_title: str
    similarity: float
    percentage: float
    similarity_label: str
    top_matches: list[SentenceMatch]


class GraphResponse(BaseModel):
    node_count: int
    edge_count: int
    nodes: list[GraphNode]
    edges: list[GraphEdge]
