from pathlib import Path
import re

import pdfplumber
import pypdfium2 as pdfium
from docx import Document

try:
    import fitz  # PyMuPDF
except Exception:  # pragma: no cover - optional dependency at runtime
    fitz = None

try:
    import pytesseract
except Exception:  # pragma: no cover - optional dependency at runtime
    pytesseract = None


def _is_bullet_line(text: str) -> bool:
    return bool(re.match(r"^(?:[-*•]|\d+[.)]|[A-Za-z]\))\s+", text.strip()))


def _is_heading_line(text: str) -> bool:
    stripped = text.strip()
    if not stripped or len(stripped) > 90:
        return False

    if re.match(r"^\d+(?:\.\d+)*\s+\S+", stripped):
        return True

    if stripped.endswith(":") and len(stripped.split()) <= 8:
        return True

    words = stripped.split()
    if len(words) <= 6 and (stripped.isupper() or stripped == stripped.title()):
        return True

    return False


def _is_code_like_line(text: str) -> bool:
    stripped = text.strip()
    if not stripped:
        return False

    symbol_count = sum(stripped.count(char) for char in "{}[]();=<>/*\\|:")
    symbol_ratio = symbol_count / max(len(stripped), 1)

    if symbol_count >= 3 and symbol_ratio >= 0.08:
        return True

    if re.search(r"\b(?:def|class|return|if|else|for|while|function|import|from|public|private|void|int|float|double|print|printf|console\.log)\b", stripped):
        return True

    return False


def _is_structured_line(text: str) -> bool:
    return _is_bullet_line(text) or _is_heading_line(text) or _is_code_like_line(text)


def _group_pdf_words_into_lines(words: list[dict], y_tolerance: float = 2.5) -> list[dict]:
    grouped_lines: list[dict] = []

    for word in sorted(words, key=lambda item: (item.get("top", 0.0), item.get("x0", 0.0))):
        word_text = (word.get("text") or "").strip()
        if not word_text:
            continue

        top = float(word.get("top", 0.0))
        bottom = float(word.get("bottom", top))

        if not grouped_lines or abs(top - grouped_lines[-1]["top"]) > y_tolerance:
            grouped_lines.append(
                {
                    "words": [word],
                    "top": top,
                    "bottom": bottom,
                }
            )
            continue

        grouped_lines[-1]["words"].append(word)
        grouped_lines[-1]["top"] = min(grouped_lines[-1]["top"], top)
        grouped_lines[-1]["bottom"] = max(grouped_lines[-1]["bottom"], bottom)

    return grouped_lines


def _build_pdf_line_text(line_words: list[dict]) -> str:
    ordered_words = sorted(line_words, key=lambda item: (item.get("x0", 0.0), item.get("top", 0.0)))
    parts = []

    for word in ordered_words:
        word_text = (word.get("text") or "").strip()
        if word_text:
            parts.append(word_text)

    line_text = " ".join(parts)
    line_text = re.sub(r"\s+([,.;:!?।॥)\]\}])", r"\1", line_text)
    line_text = re.sub(r"([([{])\s+", r"\1", line_text)
    return line_text.strip()


def _should_join_pdf_lines(previous_line: str, current_line: str, vertical_gap: float) -> bool:
    previous_line = previous_line.strip()
    current_line = current_line.strip()

    if not previous_line or not current_line:
        return False

    if _is_structured_line(previous_line) or _is_structured_line(current_line):
        return False

    if vertical_gap > 6.0:
        return False

    if re.search(r"[.!?।॥:;]$", previous_line):
        return False

    if previous_line.endswith("-") and re.match(r"^[A-Za-z\u0980-\u09ff]", current_line):
        return True

    first_char = current_line[0]
    if first_char.islower() or first_char.isdigit() or first_char in "([{'\"“‘":
        return True

    return False


def _extract_layout_text_from_pdf_page(page) -> str:
    try:
        words = page.extract_words(keep_blank_chars=False, use_text_flow=True)
    except TypeError:
        words = page.extract_words()
    except Exception:
        words = []

    if not words:
        return page.extract_text() or ""

    line_groups = _group_pdf_words_into_lines(words)
    if not line_groups:
        return page.extract_text() or ""

    rebuilt_lines: list[dict] = []

    for line_group in line_groups:
        line_text = _build_pdf_line_text(line_group["words"])
        if not line_text:
            continue

        line_entry = {
            "text": line_text,
            "top": line_group["top"],
            "bottom": line_group["bottom"],
        }

        if not rebuilt_lines:
            rebuilt_lines.append(line_entry)
            continue

        previous_line = rebuilt_lines[-1]
        vertical_gap = line_entry["top"] - previous_line["bottom"]

        if _should_join_pdf_lines(previous_line["text"], line_entry["text"], vertical_gap):
            if previous_line["text"].endswith("-"):
                previous_line["text"] = f"{previous_line['text'][:-1]}{line_entry['text'].lstrip()}"
            else:
                previous_line["text"] = f"{previous_line['text']} {line_entry['text']}"

            previous_line["bottom"] = max(previous_line["bottom"], line_entry["bottom"])
            continue

        rebuilt_lines.append(line_entry)

    return "\n".join(line["text"] for line in rebuilt_lines)


def clean_text(text: str) -> str:
    if not text:
        return ""

    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = text.strip()

    lines = [line.strip() for line in text.split("\n")]
    text = "\n".join(lines)

    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(
        r"([.!?।॥]+)(?=[A-Z\u0980-\u09ff])",
        r"\1 ",
        text,
    )
    text = re.sub(r"[ \t]{2,}", " ", text)

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
            page_text = _extract_layout_text_from_pdf_page(page)
            if page_text.strip():
                extracted_pages.append(page_text)

    return clean_text("\n\n".join(extracted_pages))


def _extract_layout_text_from_pdf_page_pymupdf(page) -> str:
    words = page.get_text("words", sort=True) or []
    if not words:
        return page.get_text("text", sort=True) or ""

    lines_map: dict[tuple[int, int], list[tuple]] = {}
    ordered_keys: list[tuple[int, int]] = []

    for word in words:
        block_no = int(word[5])
        line_no = int(word[6])
        key = (block_no, line_no)

        if key not in lines_map:
            lines_map[key] = []
            ordered_keys.append(key)

        lines_map[key].append(word)

    line_texts = []
    for key in ordered_keys:
        line_words = sorted(lines_map[key], key=lambda item: float(item[0]))
        tokens = []
        for line_word in line_words:
            token = str(line_word[4]).strip()
            if token:
                tokens.append(token)

        if not tokens:
            continue

        line_text = " ".join(tokens)
        line_text = re.sub(r"\s+([,.;:!?।॥)\]\}])", r"\1", line_text)
        line_text = re.sub(r"([([{])\s+", r"\1", line_text)
        line_texts.append(line_text.strip())

    return "\n".join(line_text for line_text in line_texts if line_text)


def extract_text_from_pdf_pymupdf(file_path: Path) -> str:
    if fitz is None:
        return ""

    extracted_pages = []

    try:
        document = fitz.open(str(file_path))
    except Exception:
        return ""

    try:
        for page in document:
            page_text = _extract_layout_text_from_pdf_page_pymupdf(page)
            if page_text.strip():
                extracted_pages.append(page_text)
    except Exception:
        return ""
    finally:
        document.close()

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
        pymupdf_text = extract_text_from_pdf_pymupdf(file_path)
        pdfplumber_text = extract_text_from_pdf(file_path)

        selected_text = ""
        if pymupdf_text and pdfplumber_text:
            pymupdf_score = _text_quality_score(pymupdf_text)
            pdfplumber_score = _text_quality_score(pdfplumber_text)
            selected_text = pymupdf_text if pymupdf_score >= (pdfplumber_score - 0.03) else pdfplumber_text
        elif pymupdf_text:
            selected_text = pymupdf_text
        else:
            selected_text = pdfplumber_text

        if selected_text:
            if _looks_like_spacing_artifact(selected_text):
                ocr_text, _ = extract_text_from_pdf_with_ocr(file_path)
                if ocr_text:
                    native_score = _text_quality_score(selected_text)
                    ocr_score = _text_quality_score(ocr_text)

                    if ocr_score >= native_score + 0.08:
                        return ocr_text, "Text extracted using OCR enhancement (better spacing/layout)."

            return selected_text, None

        ocr_text, ocr_warning = extract_text_from_pdf_with_ocr(file_path)
        if ocr_text:
            return ocr_text, ocr_warning

        return "", ocr_warning

    return "", "Unsupported file format."
