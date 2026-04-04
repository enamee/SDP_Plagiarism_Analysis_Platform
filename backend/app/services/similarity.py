from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.services.preprocessing import normalize_text, prepare_sentences_for_matching


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

   vectorizer = TfidfVectorizer(ngram_range=(1, 2))
   matrix = vectorizer.fit_transform([normalized_a, normalized_b])

   score = cosine_similarity(matrix[0:1], matrix[1:2])[0][0]
   return float(score)


def find_top_sentence_matches(
   text_a: str,
   text_b: str,
   top_k: int = 5,
   threshold: float = 0.2,
) -> list[dict]:
   sentences_a = prepare_sentences_for_matching(text_a)
   sentences_b = prepare_sentences_for_matching(text_b)

   if not sentences_a or not sentences_b:
       return []

   # Safety cap for version 1 so very large docs do not become too slow
   sentences_a = sentences_a[:50]
   sentences_b = sentences_b[:50]

   vectorizer = TfidfVectorizer(ngram_range=(1, 2))
   combined = sentences_a + sentences_b
   matrix = vectorizer.fit_transform(combined)

   a_matrix = matrix[:len(sentences_a)]
   b_matrix = matrix[len(sentences_a):]

   similarity_matrix = cosine_similarity(a_matrix, b_matrix)

   candidates = []
   for i, sentence_a in enumerate(sentences_a):
       for j, sentence_b in enumerate(sentences_b):
           score = float(similarity_matrix[i][j])
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

       if len(selected) >= top_k:
           break

   return selected


def compare_two_documents(text_a: str, text_b: str) -> dict:
   overall_score = compute_document_similarity(text_a, text_b)
   top_matches = find_top_sentence_matches(text_a, text_b)

   return {
       "overall_similarity": round(overall_score, 4),
       "overall_percentage": round(overall_score * 100, 2),
       "similarity_label": classify_similarity(overall_score),
       "top_matches": top_matches,
   }
