from pathlib import Path
from uuid import uuid4


BASE_DIR = Path(__file__).resolve().parents[2]   # backend/
REPORT_DIR = BASE_DIR / "reports"
REPORT_DIR.mkdir(parents=True, exist_ok=True)


def generate_comparison_report_txt(
    document_a_title: str,
    document_b_title: str,
    overall_percentage: float,
    similarity_label: str,
    top_matches: list[dict],
) -> tuple[Path, str]:
    filename = f"comparison_report_{uuid4().hex}.txt"
    filepath = REPORT_DIR / filename

    lines = [
        "Similarity Comparison Report",
        "=" * 30,
        "",
        f"Document A: {document_a_title}",
        f"Document B: {document_b_title}",
        f"Overall Similarity: {overall_percentage}%",
        f"Assessment: {similarity_label}",
        "",
        "Top Matching Sentences",
        "-" * 24,
    ]

    if not top_matches:
        lines.append("No strong sentence-level matches were found.")
    else:
        for index, match in enumerate(top_matches, start=1):
            lines.extend(
                [
                    "",
                    f"Match #{index} - Similarity: {(match['similarity'] * 100):.2f}%",
                    "Sentence from Document A:",
                    str(match.get("sentence_a", "")),
                    "Sentence from Document B:",
                    str(match.get("sentence_b", "")),
                ]
            )

    filepath.write_text("\n".join(lines), encoding="utf-8")
    return filepath, filename
