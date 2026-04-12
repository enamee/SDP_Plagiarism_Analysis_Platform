from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DocumentListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str

    course_code: str
    assignment_name: str
    document_type: str
    semester: str | None
    section: str | None
    topic_tag: str | None
    scope_key: str

    source_type: str
    original_filename: str | None
    extension: str

    extracted_char_count: int
    sentence_count: int
    token_count: int

    extraction_warning: str | None
    created_at: datetime


class DocumentDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str

    course_code: str
    assignment_name: str
    document_type: str
    semester: str | None
    section: str | None
    topic_tag: str | None
    scope_key: str

    source_type: str
    original_filename: str | None
    stored_filename: str
    extracted_filename: str

    extension: str
    content_type: str
    size_bytes: int

    extracted_char_count: int
    sentence_count: int
    token_count: int

    extracted_text: str
    normalized_text: str
    extraction_warning: str | None

    created_at: datetime
