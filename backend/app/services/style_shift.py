import re
from statistics import mean, pstdev

from app.services.preprocessing import split_into_sentences


def tokenize_words(text: str) -> list[str]:
    return re.findall(r"[a-zA-Z0-9']+", text.lower())


def chunk_sentences(sentences: list[str], chunk_size: int) -> list[list[str]]:
    chunks = []

    for i in range(0, len(sentences), chunk_size):
        chunk = sentences[i:i + chunk_size]
        if chunk:
            chunks.append(chunk)

    return chunks


def compute_chunk_features(chunk_sentences_list: list[str]) -> dict:
    chunk_text = " ".join(chunk_sentences_list)
    words = tokenize_words(chunk_text)

    sentence_lengths = []
    for sentence in chunk_sentences_list:
        sentence_words = tokenize_words(sentence)
        if sentence_words:
            sentence_lengths.append(len(sentence_words))

    avg_sentence_length = mean(sentence_lengths) if sentence_lengths else 0.0
    avg_word_length = (
        mean([len(word) for word in words]) if words else 0.0
    )
    lexical_diversity = (
        len(set(words)) / len(words) if words else 0.0
    )

    punctuation_count = sum(chunk_text.count(char) for char in ",;:!?")
    punctuation_density = punctuation_count / max(len(words), 1)

    return {
        "avg_sentence_length": round(avg_sentence_length, 4),
        "avg_word_length": round(avg_word_length, 4),
        "lexical_diversity": round(lexical_diversity, 4),
        "punctuation_density": round(punctuation_density, 4),
    }


def z_score(value: float, avg: float, spread: float) -> float:
    if spread == 0:
        return 0.0
    return abs((value - avg) / spread)


def analyze_style_shift(text: str, chunk_size: int = 5, anomaly_threshold: float = 1.2) -> dict:
    sentences = split_into_sentences(text)
    sentences = [sentence.strip() for sentence in sentences if sentence.strip()]

    if len(sentences) < chunk_size:
        raise ValueError(
            f"Document is too short for chunk_size={chunk_size}. "
            f"It needs at least {chunk_size} sentences."
        )

    sentence_chunks = chunk_sentences(sentences, chunk_size)

    chunk_feature_rows = []
    for chunk in sentence_chunks:
        features = compute_chunk_features(chunk)
        chunk_feature_rows.append({
            "sentences": chunk,
            "features": features,
        })

    avg_sentence_lengths = [row["features"]["avg_sentence_length"] for row in chunk_feature_rows]
    avg_word_lengths = [row["features"]["avg_word_length"] for row in chunk_feature_rows]
    lexical_diversities = [row["features"]["lexical_diversity"] for row in chunk_feature_rows]
    punctuation_densities = [row["features"]["punctuation_density"] for row in chunk_feature_rows]

    baselines = {
        "avg_sentence_length_mean": mean(avg_sentence_lengths),
        "avg_sentence_length_std": pstdev(avg_sentence_lengths),
        "avg_word_length_mean": mean(avg_word_lengths),
        "avg_word_length_std": pstdev(avg_word_lengths),
        "lexical_diversity_mean": mean(lexical_diversities),
        "lexical_diversity_std": pstdev(lexical_diversities),
        "punctuation_density_mean": mean(punctuation_densities),
        "punctuation_density_std": pstdev(punctuation_densities),
    }

    results = []

    for index, row in enumerate(chunk_feature_rows, start=1):
        features = row["features"]

        scores = [
            z_score(
                features["avg_sentence_length"],
                baselines["avg_sentence_length_mean"],
                baselines["avg_sentence_length_std"],
            ),
            z_score(
                features["avg_word_length"],
                baselines["avg_word_length_mean"],
                baselines["avg_word_length_std"],
            ),
            z_score(
                features["lexical_diversity"],
                baselines["lexical_diversity_mean"],
                baselines["lexical_diversity_std"],
            ),
            z_score(
                features["punctuation_density"],
                baselines["punctuation_density_mean"],
                baselines["punctuation_density_std"],
            ),
        ]

        anomaly_score = round(mean(scores), 4)
        excerpt = " ".join(row["sentences"])[:220]

        results.append({
            "chunk_index": index,
            "sentence_count": len(row["sentences"]),
            "excerpt": excerpt,
            "anomaly_score": anomaly_score,
            "is_suspicious": anomaly_score >= anomaly_threshold,
            "features": features,
        })

    average_anomaly_score = round(
        mean([item["anomaly_score"] for item in results]),
        4
    )

    suspicious_chunk_count = sum(1 for item in results if item["is_suspicious"])

    return {
        "total_chunks": len(results),
        "suspicious_chunk_count": suspicious_chunk_count,
        "average_anomaly_score": average_anomaly_score,
        "chunks": results,
    }
