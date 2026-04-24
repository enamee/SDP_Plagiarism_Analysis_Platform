from pathlib import Path
import re

import pdfplumber
import pypdfium2 as pdfium
from docx import Document

try:
    import pytesseract
except Exception:  # pragma: no cover - optional dependency at runtime
    pytesseract = None


def clean_text(text: str) -> str:
    if not text:
        return ""

    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = text.strip()

    lines = [line.strip() for line in text.split("\n")]
    text = "\n".join(lines)

    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"([.!?।॥])(?=[A-Za-z0-9\u0980-\u09ff])", r"\1 ", text)
    text = re.sub(r"\s{2,}", " ", text)

    return text.strip()


def _text_quality_score(text: str) -> float:
    cleaned = clean_text(text)
    if not cleaned:
        return 0.0

    tokens = re.findall(r"\S+", cleaned)
    if not tokens:
        return 0.0

    whitespace_ratio = cleaned.count(" ") / max(len(cleaned), 1)
    avg_token_length = sum(len(token) for token in tokens) / len(tokens)

    # Higher is better. Excessively long tokens generally indicate merged words.
    length_penalty = max(0.0, (avg_token_length - 8.0) / 10.0)
    return max(0.0, min((whitespace_ratio * 4.0) - length_penalty, 1.0))


def _looks_like_spacing_artifact(text: str) -> bool:
    cleaned = clean_text(text)
    if len(cleaned) < 300:
        return False

    tokens = re.findall(r"\S+", cleaned)
    if len(tokens) < 50:
        return False

    avg_token_length = sum(len(token) for token in tokens) / len(tokens)
    whitespace_ratio = cleaned.count(" ") / max(len(cleaned), 1)

    return whitespace_ratio < 0.11 or avg_token_length > 10.0


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


def extract_text_from_pdf_with_ocr(
    file_path: Path,
    tesseract_lang: str = "eng+ben",
) -> tuple[str, str | None]:
    if pytesseract is None:
        return "", "OCR fallback unavailable: pytesseract is not installed."

    ocr_pages = []

    try:
        pdf = pdfium.PdfDocument(str(file_path))
    except Exception:
        return "", "OCR fallback failed: could not open PDF for image rendering."

    try:
        for page in pdf:
            page_image = page.render(scale=2.0).to_pil()
            page_text = pytesseract.image_to_string(page_image, lang=tesseract_lang)
            if page_text.strip():
                ocr_pages.append(page_text)
    except Exception as exc:
        return "", f"OCR fallback failed: {exc}"
    finally:
        pdf.close()

    ocr_text = clean_text("\n\n".join(ocr_pages))
    if ocr_text:
        return ocr_text, "Text extracted using OCR fallback (scanned/image-based PDF)."

    return "", "No text could be extracted from this PDF, including OCR fallback."


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
            if _looks_like_spacing_artifact(text):
                ocr_text, _ = extract_text_from_pdf_with_ocr(file_path)
                if ocr_text:
                    native_score = _text_quality_score(text)
                    ocr_score = _text_quality_score(ocr_text)

                    if ocr_score >= native_score + 0.1:
                        return ocr_text, "Text extracted using OCR enhancement (better spacing/layout)."

            return text, None

        ocr_text, ocr_warning = extract_text_from_pdf_with_ocr(file_path)
        if ocr_text:
            return ocr_text, ocr_warning

        return "", ocr_warning

    return "", "Unsupported file format."
