from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class DocumentRecord(Base):
   __tablename__ = "documents"

   id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

   title: Mapped[str] = mapped_column(String(255), nullable=False)
   source_type: Mapped[str] = mapped_column(String(20), nullable=False)

   original_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
   stored_filename: Mapped[str] = mapped_column(String(255), nullable=False)
   extracted_filename: Mapped[str] = mapped_column(String(255), nullable=False)

   extension: Mapped[str] = mapped_column(String(20), nullable=False)
   content_type: Mapped[str] = mapped_column(String(100), nullable=False)

   size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
   extracted_char_count: Mapped[int] = mapped_column(Integer, nullable=False)

   extracted_text: Mapped[str] = mapped_column(Text, nullable=False)
   extraction_warning: Mapped[str | None] = mapped_column(Text, nullable=True)

   created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
