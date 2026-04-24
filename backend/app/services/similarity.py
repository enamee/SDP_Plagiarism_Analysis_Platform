import os

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.services.preprocessing import normalize_text, prepare_sentences_for_matching

try:
    from sentence_transformers import SentenceTransformer
except Exception:  # pragma: no cover - optional dependency at runtime
    SentenceTransformer = None


SEMANTIC_SCORING_ENABLED = os.getenv("SEMANTIC_SCORING_ENABLED", "1") == "1"
SEMANTIC_MODEL_NAME = os.getenv(
    "SEMANTIC_MODEL_NAME",
    "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
)
SEMANTIC_SENTENCE_CANDIDATE_LIMIT = int(
    os.getenv("SEMANTIC_SENTENCE_CANDIDATE_LIMIT", "250")
)
SEMANTIC_SENTENCE_WEIGHT = float(os.getenv("SEMANTIC_SENTENCE_WEIGHT", "0.5"))
WORD_SENTENCE_WEIGHT = float(os.getenv("WORD_SENTENCE_WEIGHT", "0.35"))
CHAR_SENTENCE_WEIGHT = float(os.getenv("CHAR_SENTENCE_WEIGHT", "0.15"))

_semantic_model = None
_semantic_model_load_attempted = False


def _round_optional(value: float | None, digits: int = 4) -> float | None:
    if value is None:
        return None
    return round(value, digits)


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


def _get_semantic_model():
    global _semantic_model
    global _semantic_model_load_attempted

    if _semantic_model_load_attempted:
        return _semantic_model

    _semantic_model_load_attempted = True

    if SentenceTransformer is None:
        return None

    try:
        _semantic_model = SentenceTransformer(SEMANTIC_MODEL_NAME)
    except Exception:
        _semantic_model = None

    return _semantic_model


def _compute_semantic_similarity(text_a: str, text_b: str) -> float | None:
    if not SEMANTIC_SCORING_ENABLED:
        return None

    model = _get_semantic_model()
    if model is None:
        return None

    try:
        embeddings = model.encode([text_a, text_b], normalize_embeddings=True)
        similarity = float(np.dot(embeddings[0], embeddings[1]))
        return max(0.0, min(similarity, 1.0))
    except Exception:
        return None


def _compute_semantic_similarity_with_override(
    text_a: str,
    text_b: str,
    use_semantic_scoring: bool | None,
) -> float | None:
    if use_semantic_scoring is False:
        return None

    if use_semantic_scoring is None:
        return _compute_semantic_similarity(text_a, text_b)

    model = _get_semantic_model()
    if model is None:
        return None

    try:
        embeddings = model.encode([text_a, text_b], normalize_embeddings=True)
        similarity = float(np.dot(embeddings[0], embeddings[1]))
        return max(0.0, min(similarity, 1.0))
    except Exception:
        return None


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


def _compute_semantic_scores_for_sentence_candidates(
    sentences_a: list[str],
    sentences_b: list[str],
    candidate_pairs: list[tuple[int, int]],
) -> dict[tuple[int, int], float]:
    model = _get_semantic_model()
    if model is None:
        return {}

    if not candidate_pairs:
        return {}

    indices_a = sorted({index_a for index_a, _ in candidate_pairs})
    indices_b = sorted({index_b for _, index_b in candidate_pairs})

    texts_a = [sentences_a[index] for index in indices_a]
    texts_b = [sentences_b[index] for index in indices_b]

    try:
        embeddings_a = model.encode(texts_a, normalize_embeddings=True)
        embeddings_b = model.encode(texts_b, normalize_embeddings=True)
    except Exception:
        return {}

    embeddings_by_a = {
        sentence_index: embeddings_a[position]
        for position, sentence_index in enumerate(indices_a)
    }
    embeddings_by_b = {
        sentence_index: embeddings_b[position]
        for position, sentence_index in enumerate(indices_b)
    }

    scores = {}
    for index_a, index_b in candidate_pairs:
        similarity = float(np.dot(embeddings_by_a[index_a], embeddings_by_b[index_b]))
        scores[(index_a, index_b)] = max(0.0, min(similarity, 1.0))

    return scores


def _use_semantic_sentence_matching(use_semantic_scoring: bool | None) -> bool:
    if use_semantic_scoring is False:
        return False

    if not SEMANTIC_SCORING_ENABLED and use_semantic_scoring is None:
        return False

    return _get_semantic_model() is not None


def classify_similarity(score: float) -> str:
    if score >= 0.75:
        return "High Similarity"
    if score >= 0.45:
        return "Moderate Similarity"
    return "Low Similarity"


def compute_document_similarity_components(
    text_a: str,
    text_b: str,
    use_semantic_scoring: bool | None = None,
) -> dict:
    normalized_a = normalize_text(text_a)
    normalized_b = normalize_text(text_b)

    if not normalized_a or not normalized_b:
        return {
            "overall_similarity": 0.0,
            "word_lexical_score": 0.0,
            "char_lexical_score": 0.0,
            "semantic_score": None,
            "scorer_path": "lexical-only",
            "semantic_requested": use_semantic_scoring,
        }

    # Hybrid lexical scoring is stable for OCR noise and multilingual text.
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

    semantic_score = _compute_semantic_similarity_with_override(
        normalized_a,
        normalized_b,
        use_semantic_scoring=use_semantic_scoring,
    )

    if semantic_score is None:
        overall_similarity = float((0.65 * word_score) + (0.35 * char_score))
        return {
            "overall_similarity": max(0.0, min(overall_similarity, 1.0)),
            "word_lexical_score": word_score,
            "char_lexical_score": char_score,
            "semantic_score": None,
            "scorer_path": "lexical-only",
            "semantic_requested": use_semantic_scoring,
        }

    combined_score = (
        (0.55 * semantic_score)
        + (0.30 * word_score)
        + (0.15 * char_score)
    )

    return {
        "overall_similarity": float(max(0.0, min(combined_score, 1.0))),
        "word_lexical_score": word_score,
        "char_lexical_score": char_score,
        "semantic_score": semantic_score,
        "scorer_path": "semantic+lexical",
        "semantic_requested": use_semantic_scoring,
    }


def compute_document_similarity(
    text_a: str,
    text_b: str,
    use_semantic_scoring: bool | None = None,
) -> float:
    components = compute_document_similarity_components(
        text_a,
        text_b,
        use_semantic_scoring=use_semantic_scoring,
    )
    return float(components["overall_similarity"])


def find_top_sentence_matches(
    text_a: str,
    text_b: str,
    top_k: int | None = 5,
    threshold: float = 0.2,
    max_sentences_per_document: int | None = 50,
    use_semantic_scoring: bool | None = None,
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
            lexical_score = float((0.7 * word_similarity_matrix[i][j]) + (0.3 * char_similarity_matrix[i][j]))
            if lexical_score >= threshold:
                candidates.append({
                    "index_a": i,
                    "index_b": j,
                    "sentence_a": sentence_a,
                    "sentence_b": sentence_b,
                    "similarity": lexical_score,
                    "word_similarity": float(word_similarity_matrix[i][j]),
                    "char_similarity": float(char_similarity_matrix[i][j]),
                })

    candidates.sort(key=lambda item: item["similarity"], reverse=True)

    if candidates and _use_semantic_sentence_matching(use_semantic_scoring):
        rerank_limit = min(len(candidates), SEMANTIC_SENTENCE_CANDIDATE_LIMIT)
        top_candidates = candidates[:rerank_limit]
        top_pairs = [(item["index_a"], item["index_b"]) for item in top_candidates]
        semantic_scores = _compute_semantic_scores_for_sentence_candidates(
            sentences_a,
            sentences_b,
            top_pairs,
        )

        if semantic_scores:
            for item in top_candidates:
                semantic_score = semantic_scores.get((item["index_a"], item["index_b"]))
                if semantic_score is None:
                    continue

                item["similarity"] = float(
                    (SEMANTIC_SENTENCE_WEIGHT * semantic_score)
                    + (WORD_SENTENCE_WEIGHT * item["word_similarity"])
                    + (CHAR_SENTENCE_WEIGHT * item["char_similarity"])
                )

            candidates.sort(key=lambda item: item["similarity"], reverse=True)

    selected = []
    used_a = set()
    used_b = set()

    for item in candidates:
        if item["index_a"] in used_a or item["index_b"] in used_b:
            continue

        if item["similarity"] < threshold:
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
    use_semantic_scoring: bool | None = None,
    include_debug: bool = False,
) -> dict:
    components = compute_document_similarity_components(
        text_a,
        text_b,
        use_semantic_scoring=use_semantic_scoring,
    )
    overall_score = float(components["overall_similarity"])
    top_matches = find_top_sentence_matches(
        text_a,
        text_b,
        top_k=sentence_top_k,
        threshold=sentence_threshold,
        max_sentences_per_document=max_sentences_per_document,
        use_semantic_scoring=use_semantic_scoring,
    )

    result = {
        "overall_similarity": round(overall_score, 4),
        "overall_percentage": round(overall_score * 100, 2),
        "similarity_label": classify_similarity(overall_score),
        "top_matches": top_matches,
    }

    if include_debug:
        result["debug"] = {
            "scorer_path": components["scorer_path"],
            "semantic_requested": components["semantic_requested"],
            "word_lexical_score": _round_optional(components["word_lexical_score"]),
            "char_lexical_score": _round_optional(components["char_lexical_score"]),
            "semantic_score": _round_optional(components["semantic_score"]),
        }

    return result
