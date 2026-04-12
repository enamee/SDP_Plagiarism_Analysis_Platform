import re


def normalize_text(text: str) -> str:
    """
    Lowercase, remove punctuation noise, and compress whitespace.
    """
    if not text:
        return ""

    text = text.lower()
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text)

    return text.strip()


def split_into_sentences(text: str) -> list[str]:
    """
    Simple sentence splitting for version 1.
    """
    if not text:
        return []

    text = text.replace("\r\n", "\n").replace("\r", "\n").strip()
    if not text:
        return []

    sentences = re.split(r'(?<=[.!?])\s+', text)
    return [sentence.strip() for sentence in sentences if sentence.strip()]


def tokenize_words(text: str) -> list[str]:
    """
    Basic word tokenizer for English text.
    """
    if not text:
        return []

    return re.findall(r"[a-z0-9']+", text.lower())


def prepare_sentences_for_matching(text: str, min_length: int = 20) -> list[str]:
    sentences = split_into_sentences(text)
    return [sentence for sentence in sentences if len(sentence.strip()) >= min_length]


def slugify_text(value: str) -> str:
    """
    Convert arbitrary metadata text into a compact slug-like form.
    """
    if not value:
        return ""

    value = value.lower().strip()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = re.sub(r"-+", "-", value).strip("-")

    return value


def build_scope_key(
    course_code: str,
    assignment_name: str,
    document_type: str,
    semester: str | None = None,
    section: str | None = None,
) -> str:
    """
    Build a reusable scope key for later subset-based retrieval.
    """
    parts = [
        slugify_text(course_code),
        slugify_text(assignment_name),
        slugify_text(document_type),
    ]

    if semester and semester.strip():
        parts.append(slugify_text(semester))

    if section and section.strip():
        parts.append(slugify_text(section))

    return "::".join(parts)


def build_search_text(
    title: str,
    course_code: str,
    assignment_name: str,
    document_type: str,
    semester: str | None,
    section: str | None,
    topic_tag: str | None,
    extracted_text: str,
) -> str:
    """
    Create a single searchable text blob that combines metadata and normalized content.
    This will be useful later for FTS-based shortlist retrieval.
    """
    raw_text = " ".join(
        [
            title or "",
            course_code or "",
            assignment_name or "",
            document_type or "",
            semester or "",
            section or "",
            topic_tag or "",
            extracted_text or "",
        ]
    )

    return normalize_text(raw_text)
