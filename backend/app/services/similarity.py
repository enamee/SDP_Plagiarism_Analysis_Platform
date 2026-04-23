from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.services.preprocessing import normalize_text, prepare_sentences_for_matching


def _compute_pairwise_tfidf_score(
    text_a: str,
    text_b: str,
    analyzer: str,
    ngram_range: tuple[int, int],
) -> float:
    vectorizer = TfidfVectorizer(analyzer=analyzer, ngram_range=ngram_range)
    matrix = vectorizer.fit_transform([text_a, text_b])
    score = cosine_similarity(matrix[0:1], matrix[1:2])[0][0]
    return float(score)


def _build_similarity_matrix(
    sentences_a: list[str],
    sentences_b: list[str],
    analyzer: str,
    ngram_range: tuple[int, int],
):
    vectorizer = TfidfVectorizer(analyzer=analyzer, ngram_range=ngram_range)
    combined = sentences_a + sentences_b
    matrix = vectorizer.fit_transform(combined)

    a_matrix = matrix[:len(sentences_a)]
    b_matrix = matrix[len(sentences_a):]

    return cosine_similarity(a_matrix, b_matrix)


def classify_similarity(score: float) -> str:
    if score >= 0.75:
        return "High Similarity"
    if score >= 0.45:
        return "Moderate Similarity"
    return "Low Similarity"


def compute_document_similarity(text_a: str, text_b: str) -> float:
    normalized_a = normalize_text(text_a)
    normalized_b = normalize_text(text_b)

    if not normalized_a or not normalized_b:
        return 0.0

    # Hybrid lexical scoring is more stable for OCR noise and multilingual text.
    word_score = _compute_pairwise_tfidf_score(
        normalized_a,
        normalized_b,
        analyzer="word",
        ngram_range=(1, 2),
    )
    char_score = _compute_pairwise_tfidf_score(
        normalized_a,
        normalized_b,
        analyzer="char_wb",
        ngram_range=(3, 5),
    )

    return float((0.65 * word_score) + (0.35 * char_score))


def find_top_sentence_matches(
    text_a: str,
    text_b: str,
    top_k: int | None = 5,
    threshold: float = 0.2,
    max_sentences_per_document: int | None = 50,
) -> list[dict]:
    sentences_a = prepare_sentences_for_matching(text_a)
    sentences_b = prepare_sentences_for_matching(text_b)

    if not sentences_a or not sentences_b:
        return []

    if max_sentences_per_document is not None:
        # Safety cap for version 1 so very large docs do not become too slow
        sentences_a = sentences_a[:max_sentences_per_document]
        sentences_b = sentences_b[:max_sentences_per_document]

    word_similarity_matrix = _build_similarity_matrix(
        sentences_a,
        sentences_b,
        analyzer="word",
        ngram_range=(1, 2),
    )
    char_similarity_matrix = _build_similarity_matrix(
        sentences_a,
        sentences_b,
        analyzer="char_wb",
        ngram_range=(3, 5),
    )

    candidates = []
    for i, sentence_a in enumerate(sentences_a):
        for j, sentence_b in enumerate(sentences_b):
            score = float((0.7 * word_similarity_matrix[i][j]) + (0.3 * char_similarity_matrix[i][j]))
            if score >= threshold:
                candidates.append({
                    "index_a": i,
                    "index_b": j,
                    "sentence_a": sentence_a,
                    "sentence_b": sentence_b,
                    "similarity": score,
                })

    candidates.sort(key=lambda item: item["similarity"], reverse=True)

    selected = []
    used_a = set()
    used_b = set()

    for item in candidates:
        if item["index_a"] in used_a or item["index_b"] in used_b:
            continue

        selected.append({
            "sentence_a": item["sentence_a"],
            "sentence_b": item["sentence_b"],
            "similarity": round(item["similarity"], 4),
        })

        used_a.add(item["index_a"])
        used_b.add(item["index_b"])

        if top_k is not None and len(selected) >= top_k:
            break

    return selected


def compare_two_documents(
    text_a: str,
    text_b: str,
    sentence_top_k: int | None = 5,
    sentence_threshold: float = 0.2,
    max_sentences_per_document: int | None = 50,
) -> dict:
    overall_score = compute_document_similarity(text_a, text_b)
    top_matches = find_top_sentence_matches(
    text_a,
    text_b,
    top_k=sentence_top_k,
    threshold=sentence_threshold,
    max_sentences_per_document=max_sentences_per_document,
    )

    return {
        "overall_similarity": round(overall_score, 4),
        "overall_percentage": round(overall_score * 100, 2),
        "similarity_label": classify_similarity(overall_score),
        "top_matches": top_matches,
    }
