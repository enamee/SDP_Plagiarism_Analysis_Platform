from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DocumentListItem(BaseModel):
   model_config = ConfigDict(from_attributes=True)

   id: int
   title: str
   source_type: str
   original_filename: str | None
   extension: str
   extracted_char_count: int
   extraction_warning: str | None
   created_at: datetime
