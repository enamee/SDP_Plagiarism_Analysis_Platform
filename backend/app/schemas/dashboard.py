from datetime import datetime

from pydantic import BaseModel


class RecentDocumentItem(BaseModel):
   id: int
   title: str
   source_type: str
   extension: str
   extracted_char_count: int
   extraction_warning: str | None
   created_at: datetime


class DashboardSummaryResponse(BaseModel):
   total_documents: int
   manual_documents: int
   file_documents: int
   warning_documents: int
   total_extracted_characters: int
   recent_documents: list[RecentDocumentItem]
