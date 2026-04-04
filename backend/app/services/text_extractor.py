from pathlib import Path
import re

import pdfplumber
from docx import Document


def clean_text(text: str) -> str:
    if not text:
        return ""

    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = text.strip()

    lines = [line.strip() for line in text.split("\n")]
    text = "\n".join(lines)

    text = re.sub(r"\n{3,}", "\n\n", text)

    return text.strip()


def extract_text_from_txt(file_path: Path) -> str:
    try:
        return clean_text(file_path.read_text(encoding="utf-8"))
    except UnicodeDecodeError:
        return clean_text(file_path.read_text(encoding="utf-8", errors="ignore"))


def _extract_table_text(table) -> list[str]:
    """
    Extract text from a table, including nested tables inside cells.
    """
    parts = []

    for row in table.rows:
        row_cells = []

        for cell in row.cells:
            cell_parts = []

            # Walk content inside the cell in order
            for item in cell.iter_inner_content():
                item_type = type(item).__name__

                if item_type == "Paragraph":
                    text = item.text.strip()
                    if text:
                        cell_parts.append(text)

                elif item_type == "Table":
                    nested_text_parts = _extract_table_text(item)
                    if nested_text_parts:
                        cell_parts.append("\n".join(nested_text_parts))

            cell_text = " ".join(cell_parts).strip()
            row_cells.append(cell_text)

        # Keep row structure somewhat visible
        if any(row_cells):
            parts.append(" | ".join(row_cells))

    return parts


def extract_text_from_docx(file_path: Path) -> str:
    document = Document(file_path)
    parts = []

    # Walk paragraphs and tables in document order
    for item in document.iter_inner_content():
        item_type = type(item).__name__

        if item_type == "Paragraph":
            text = item.text.strip()
            if text:
                parts.append(text)

        elif item_type == "Table":
            table_parts = _extract_table_text(item)
            if table_parts:
                parts.extend(table_parts)

    return clean_text("\n".join(parts))


def extract_text_from_pdf(file_path: Path) -> str:
    extracted_pages = []

    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text() or ""
            if page_text.strip():
                extracted_pages.append(page_text)

    return clean_text("\n\n".join(extracted_pages))


def extract_text_from_file(file_path: Path, extension: str) -> tuple[str, str | None]:
    extension = extension.lower()

    if extension == ".txt":
        text = extract_text_from_txt(file_path)
        warning = None if text else "The text file was uploaded, but no readable text was found."
        return text, warning

    if extension == ".docx":
        text = extract_text_from_docx(file_path)
        warning = None if text else "The DOCX file was uploaded, but no readable text was found."
        return text, warning

    if extension == ".pdf":
        text = extract_text_from_pdf(file_path)
        if text:
            return text, None
        return "", "No text could be extracted from this PDF. It may be scanned or image-based."

    return "", "Unsupported file format."
