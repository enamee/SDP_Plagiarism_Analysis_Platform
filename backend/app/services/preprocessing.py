import re
import unicodedata


def normalize_text(text: str) -> str:
    """
    Lowercase, keep English/Bangla letters, and compress whitespace.
    """
    if not text:
        return ""

    text = unicodedata.normalize("NFKC", text)
    text = text.lower()
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[^a-z0-9\u0980-\u09ff\s]", " ", text)
    text = re.sub(r"\s+", " ", text)

    return text.strip()


def split_into_sentences(text: str) -> list[str]:
    """
    Sentence splitting for English and Bangla text with support for
    punctuation without trailing spaces and common OCR/PDF artifacts.
    """
    if not text:
        return []

    text = text.replace("\r\n", "\n").replace("\r", "\n").strip()
    if not text:
        return []

    # Normalize repeated whitespace while preserving paragraph breaks.
    text = re.sub(r"[\t\f\v]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)

    # Add an explicit boundary when sentence punctuation is immediately
    # followed by a letter/number without a space.
    text = re.sub(
        r"([.!?।॥]+)(?=[A-Za-z0-9\u0980-\u09ff])",
        r"\1 ",
        text,
    )

    # Split by sentence-ending punctuation or hard line breaks.
    raw_sentences = re.split(r"(?<=[.!?।॥])\s+|\n+", text)

    cleaned_sentences = []
    index = 0
    while index < len(raw_sentences):
        candidate = raw_sentences[index].strip()
        if not candidate:
            index += 1
            continue

        # Merge ordered-list markers like "1." or "2)" into the next sentence.
        if re.fullmatch(r"\d+[.)]", candidate):
            next_index = index + 1
            if next_index < len(raw_sentences):
                next_candidate = raw_sentences[next_index].strip()
                if next_candidate:
                    candidate = f"{candidate} {next_candidate}"
                    index = next_index

        # Drop punctuation-only fragments (e.g., '.....') that skew chunking.
        if not re.search(r"[a-z0-9\u0980-\u09ff]", candidate.lower()):
            index += 1
            continue

        cleaned_sentences.append(candidate)
        index += 1

    return cleaned_sentences


def tokenize_words(text: str) -> list[str]:
    """
    Basic word tokenizer for English and Bangla text.
    """
    if not text:
        return []

    return re.findall(r"[a-z0-9'\u0980-\u09ff]+", text.lower())


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


def build_scope_key(comparison_group: str) -> str:
    """
    Scope is determined only by the comparison group.
    """
    return slugify_text(comparison_group)


def parse_topic_tags(topic_tag: str | None) -> list[str]:
    """
    Support multiple tags in one input field.
    Example:
      'plagiarism, academic writing, nlp'
    becomes:
      ['plagiarism', 'academic writing', 'nlp']
    """
    if not topic_tag:
        return []

    raw_parts = re.split(r"[,;\n]+", topic_tag)

    tags = []
    seen = set()

    for part in raw_parts:
        cleaned = part.strip().lower()
        cleaned = re.sub(r"\s+", " ", cleaned)

        if not cleaned:
            continue

        if cleaned in seen:
            continue

        seen.add(cleaned)
        tags.append(cleaned)

    return tags


def serialize_topic_tags(tags: list[str]) -> str | None:
    """
    Convert normalized tag list back into one stored string.
    """
    if not tags:
        return None

    return ", ".join(tags)


def build_search_text(
    title: str,
    comparison_group: str,
    document_type: str,
    topic_tag: str | None,
    extracted_text: str,
) -> str:
    """
    Create a searchable text blob combining generic metadata and normalized content.
    Multiple topic tags are expanded into searchable text.
    """
    topic_tags = parse_topic_tags(topic_tag)

    raw_text = " ".join(
        [
            title or "",
            comparison_group or "",
            document_type or "",
            " ".join(topic_tags),
            extracted_text or "",
        ]
    )

    return normalize_text(raw_text)
