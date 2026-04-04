from pydantic import BaseModel, Field


class GraphRequest(BaseModel):
    document_ids: list[int] = Field(default_factory=list)
    min_similarity: float = 0.2


class GraphNode(BaseModel):
    id: int
    label: str
    extension: str


class GraphEdge(BaseModel):
    source: int
    target: int
    similarity: float
    percentage: float


class GraphResponse(BaseModel):
    node_count: int
    edge_count: int
    nodes: list[GraphNode]
    edges: list[GraphEdge]
