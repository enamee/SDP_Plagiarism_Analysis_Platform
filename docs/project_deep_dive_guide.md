# Explainable Plagiarism Analysis Platform - Complete Deep Dive

## 1) Why this project exists

Your project solves a real academic integrity problem: teachers and institutions need a system that can do more than just "one percentage score."  
You designed a platform that is:

- **Explainable**: It shows sentence-level evidence, not only a final number.
- **Practical**: It accepts real-world file types (`.txt`, `.pdf`, `.docx`) and manual input.
- **Scalable in workflow**: It supports pairwise check, one-vs-corpus check, batch checking, graph visualization, style-shift analysis, and report export.

So in short:

- **What you are doing**: Building an end-to-end plagiarism analysis platform.
- **Why you are doing it**: To provide transparent, multi-angle plagiarism detection for academic documents.
- **How you are doing it**: Hybrid NLP scoring + structured backend API + interactive frontend + local persistence + explainability features.

---

## 2) System architecture at a glance

### Frontend (React + Vite + Tailwind)
- Provides all user workflows (upload, compare, corpus check, batch check, graph, reports, debug logs).
- Calls backend APIs through `frontend/src/services/documentService.js`.
- Shows both summaries and detailed evidence (top matches and highlighted text).

### Backend (FastAPI + SQLAlchemy + SQLite)
- Receives files/text and metadata.
- Extracts and preprocesses text.
- Stores full document records in SQLite.
- Keeps an FTS5 index in sync for shortlist retrieval.
- Runs similarity and style-shift algorithms.
- Exposes all features via typed API endpoints.

### Data layer
- Main table: `documents` (`DocumentRecord` model).
- Auxiliary virtual table: `documents_fts` for fast retrieval shortlist.

---

## 3) Core workflow (end to end)

1. User uploads a file or manual text (`/api/documents/upload`).
2. Backend extracts text (format-specific pipeline, OCR fallback for problematic PDFs).
3. Backend normalizes text, computes counts (chars/sentences/tokens), builds search text, stores document.
4. Backend upserts the document into FTS index.
5. User runs one of analysis modes:
   - Compare two docs
   - Corpus check (shortlist + rerank)
   - Batch check (all selected pairs)
   - Similarity graph
   - Style-shift analysis
6. Optional: User exports comparison report PDF.
7. Dashboard/debug pages monitor dataset and system logs.

## 3.0) Elaborate walkthrough (exactly what happens during each check)

This section is a direct runtime narrative: from clicking a button in the UI to receiving scores and evidence.

### 3.0.1 Runtime architecture path for every action

Every check follows the same system path:

1. UI layer (React page): user selects inputs and submits.
2. Service layer (`documentService.js`): frontend sends HTTP request.
3. API layer (FastAPI route): validates request schema and guard rules.
4. Data fetch layer (SQLAlchemy): loads required document rows.
5. Algorithm layer (service modules): executes scoring/retrieval/style logic.
6. Response assembly: packs score, label, and evidence.
7. UI render layer: frontend shows cards, tables, highlights, or graph.

So the architecture is not just static; it is a repeated request pipeline where each layer has one clear responsibility.

### 3.0.2 What happens in Compare check (A vs B) - detailed

1. User selects Document A and Document B and optionally semantic toggle.
2. Frontend calls `POST /api/compare/documents`.
3. Backend checks:
   - IDs must be different.
   - both docs must exist.
   - both docs must have extracted text.
4. Backend computes document-level similarity components:
   - word TF-IDF cosine,
   - char TF-IDF cosine,
   - optional semantic cosine.
5. Backend fuses these components into one final score.
6. Backend computes sentence-level evidence:
   - sentence split,
   - sentence pair scoring,
   - threshold filtering,
   - one-to-one greedy match selection.
7. Backend returns:
   - overall score,
   - percentage,
   - label,
   - top matched sentence pairs,
   - optional debug breakdown.
8. Frontend renders summary + clickable highlighted sentence evidence.

### 3.0.3 What happens in Corpus check (one vs many) - detailed

This is a two-stage architecture by design.

Stage 1: Retrieval (fast candidate narrowing)

1. Build lexical query tokens from source metadata and source normalized text.
2. Remove stopwords, very short terms, and duplicates.
3. Query FTS5 virtual table.
4. Collect shortlist candidates with scope-aware ordering/filtering.

Stage 2: Rerank (accurate deep scoring)

5. For each shortlisted candidate, run full compare algorithm.
6. Sort candidates by final similarity descending.
7. Return top result set with sentence-level evidence.

Why this matters:

- avoids expensive deep comparisons against every document,
- preserves quality by doing detailed scoring only on likely matches.

### 3.0.4 What happens in Batch check (many-vs-many) - detailed

1. User selects multiple documents and threshold settings.
2. Backend deduplicates selected IDs.
3. Backend creates all unique pairs using combinations.
4. For each pair, backend runs full compare algorithm.
5. Only keeps pairs above minimum similarity threshold.
6. Sorts by strongest similarity and truncates to max pairs.
7. Returns ranked suspicious pairs plus sentence evidence for each pair.

This is exhaustive over selected documents, so its cost grows quadratically with selection size.

### 3.0.5 What happens in Graph check - detailed

1. User optionally selects documents; if none selected, backend uses all documents with text.
2. Backend builds graph nodes from selected document set.
3. Backend computes pairwise similarity for all unique pairs.
4. If pair similarity >= threshold, backend adds an edge.
5. Edge contains score, label, and top sentence evidence.
6. Frontend draws the graph and supports drilldown into edge details.

So the graph is not decorative; it is a structural projection of pairwise similarity computations.

### 3.0.6 What happens in Style-shift check - detailed

1. User chooses one document, chunk size, and anomaly threshold.
2. Backend splits text into cleaned sentences.
3. Backend forms sentence chunks of fixed size.
4. For every chunk, backend computes style features.
5. Backend computes document-level feature baselines (mean/std).
6. Backend computes per-chunk z-score deviations for all features.
7. Backend averages z-scores into one anomaly score per chunk.
8. Backend flags chunk suspicious if anomaly >= threshold.
9. Frontend displays suspicious chunks and feature snapshots.

This check answers a different question than plagiarism overlap: whether writing style changes unexpectedly inside one document.

### 3.0.7 What happens before any check (ingestion dependency)

All checks depend on successful ingestion quality:

1. Extract text from TXT/DOCX/PDF (with OCR fallback path).
2. Normalize and compute metadata counts.
3. Save document and extracted artifacts.
4. Build `search_text` and upsert FTS index.

If extraction is weak, all later checks are affected. That is why your extraction pipeline is a critical architecture pillar.

### 3.0.8 One-line mental model for viva

Your system does this repeatedly:

- ingest and normalize text,
- generate candidates quickly,
- score deeply with hybrid signals,
- present human-readable evidence,
- keep everything auditable through logs and structured outputs.

---

## 3.1) Detailed architecture (layer-by-layer)

Think of your system as 7 cooperating layers:

1. **Presentation layer (React pages)**
   - Collects user inputs and displays outputs.
   - No algorithmic scoring runs in frontend.
   - Frontend is orchestration + visualization only.

2. **Transport layer (HTTP JSON/Form)**
   - `documentService.js` sends requests.
   - For upload: multipart form-data.
   - For checks: JSON payload or query params.

3. **API boundary layer (FastAPI routes + Pydantic schemas)**
   - Validates inputs early.
   - Rejects invalid checks with clear HTTP errors.
   - Converts raw request data into typed internal objects.

4. **Business logic layer (services)**
   - Text extraction (`text_extractor.py`)
   - Preprocessing (`preprocessing.py`)
   - Similarity scoring (`similarity.py`)
   - Retrieval shortlist (`retrieval.py`)
   - Style anomaly scoring (`style_shift.py`)
   - Report generation (`report_generator.py`)

5. **Persistence layer (SQLAlchemy + SQLite)**
   - Main document records in `documents`.
   - FTS virtual table `documents_fts` for retrieval.

6. **Index layer (FTS5)**
   - Optimized lexical candidate retrieval.
   - Used before expensive detailed scoring in corpus flow.

7. **Observability layer (structured logs + debug APIs)**
   - Every major action emits events.
   - Debug page reads these logs live.

### Architecture principle used repeatedly

You consistently separate:

- **candidate generation** (fast, broad filtering)
- **candidate scoring** (expensive, accurate comparison)
- **result explanation** (human-readable evidence)

This is why the system is both practical and explainable.

## 3.2) What happens every time we do a check (runtime traces)

Below is the exact execution story from button click to final UI.

## 3.2.1 Compare check (Document A vs Document B)

Frontend:

1. User selects `documentAId`, `documentBId`, semantic toggle.
2. `ComparePage` calls:
   - `POST /api/compare/documents`
   - plus `GET /api/documents/{id}` for both documents (highlight panels).

Backend (`compare.py` route):

3. Validate IDs are different.
4. Fetch both `DocumentRecord`s.
5. Validate both have non-empty extracted text.
6. Log `comparison.start`.
7. Call `compare_two_documents(...)` in `similarity.py`.

Algorithm core:

8. Normalize both texts.
9. Compute document-level score components:
   - word lexical cosine
   - char lexical cosine
   - optional semantic cosine
10. Fuse into overall similarity by branch formula.
11. Sentence pipeline:
   - split and filter sentences
   - build word+char sentence similarity matrices
   - build candidates above threshold
   - optional semantic rerank
   - greedy one-to-one selection
12. Build response:
   - `overall_similarity`, `overall_percentage`, `similarity_label`
   - `top_matches`
   - debug score breakdown.
13. Log `comparison.complete`.

Frontend rendering:

14. Show summary cards and label.
15. Show debug channel breakdown.
16. Show all sentence matches.
17. Highlight matched sentences in full extracted texts (click-linked pairing).

## 3.2.2 Corpus check (one source vs many)

Frontend:

1. User selects source document and retrieval/scoring controls.
2. Optional shortlist preview calls:
   - `GET /api/retrieval/shortlist/{document_id}`
3. Full corpus check calls:
   - `GET /api/corpus-check/{document_id}`

Backend retrieval phase:

4. Validate source doc exists and has text.
5. Build FTS query from title/group/type/topic + leading content tokens.
6. Remove low-value terms (short/stopword/repeated).
7. Execute FTS MATCH query against `documents_fts`.
8. Fetch candidate document records.
9. Apply scope policy:
   - `scope_only`: drop different scopes
   - `same_scope_first`: reorder prioritization.

Backend rerank phase:

10. For each shortlisted candidate:
   - run full `compare_two_documents(source, candidate)`
11. Rank by `overall_similarity` descending.
12. Return top `result_top_k`.
13. Log counts:
   - shortlist retrieved
   - detailed checked
   - final returned.

Frontend rendering:

14. Show query used (`fts_query`) for explainability.
15. Show retrieval metadata (same scope, rank score).
16. Show detailed similarity results and top sentence evidence.

## 3.2.3 Batch check (many-vs-many pair sweep)

Frontend:

1. User selects multiple docs, threshold, max pairs, semantic toggle.
2. Calls `POST /api/batch-check`.

Backend:

3. Deduplicate document IDs.
4. Validate minimum 2 docs, threshold range, max_pairs.
5. Fetch all selected documents and validate text exists.
6. Generate all unique pairs with combinations:
   - total pairs = `n*(n-1)/2`
7. For each pair:
   - run `compare_two_documents`
   - keep only if `overall_similarity >= min_similarity`
8. Sort retained pairs by similarity desc.
9. Truncate to `max_pairs`.
10. Return summary + pair details + top sentence matches per pair.

Frontend:

11. Show summary counts (selected, checked, returned).
12. Show suspicious pairs ranked from strongest similarity downward.
13. User can open detailed comparison page per pair.

## 3.2.4 Graph check (network of similarity relations)

Frontend:

1. User optionally selects docs (or none = all docs), threshold, semantic toggle.
2. Calls `POST /api/graph`.

Backend:

3. Resolve document set:
   - selected docs, or all docs with non-empty text.
4. Require at least 2 valid docs.
5. Build `nodes` list from documents.
6. Iterate all unique pairs.
7. For each pair:
   - run `compare_two_documents`
   - if score >= threshold, add edge with score, label, top matches.
8. Return graph (`nodes`, `edges`, counts).

Frontend:

9. Compute circular node coordinates.
10. Draw SVG:
   - node circles
   - edge lines with thickness/opacity proportional to similarity
   - edge percentage labels.
11. Clicking an edge opens full comparison detail page.

## 3.2.5 Style-shift check (single-document intrinsic anomaly)

Frontend:

1. User selects document, chunk size, anomaly threshold.
2. Calls `POST /api/style-shift`.

Backend:

3. Validate document and extracted text.
4. Run `analyze_style_shift(...)`.
5. Sentence split and clean.
6. Divide into consecutive chunks of `chunk_size`.
7. Compute per-chunk features:
   - avg sentence length
   - avg word length
   - lexical diversity
   - punctuation density.
8. Compute global mean/std baseline across chunks.
9. For each chunk:
   - compute absolute z-scores for all 4 features
   - anomaly score = average z-score
   - suspicious if score >= threshold.
10. Return chunk list + suspicious count + average anomaly.

Frontend:

11. Show summary metrics.
12. Show score bar chart style view.
13. Show per-chunk details and feature snapshots.

## 3.3) What happens before any check can run (ingestion dependency)

Every check depends on upload/reprocess pipeline quality.

Upload/reprocess runtime sequence:

1. Receive file/manual text and metadata.
2. Validate required fields.
3. If file:
   - persist raw upload
   - extract text with format-specific pipeline
   - apply OCR fallback/enhancement as needed.
4. Normalize text and compute counts.
5. Build searchable text blob (`search_text`).
6. Save/refresh `DocumentRecord`.
7. Upsert corresponding FTS row.
8. Emit logs.

So each check is only as strong as extraction + preprocessing quality for participating documents.

## 3.4) Timing and computational behavior per check

- **Compare**: one pair, full deep scoring. Usually fastest detailed mode.
- **Corpus**: fast shortlist + limited deep rerank. Best tradeoff for one-vs-many.
- **Batch**: exhaustive selected pairs; cost grows quadratically.
- **Graph**: similar pairwise cost to batch, plus graph serialization.
- **Style-shift**: no pairwise cross-doc cost; complexity depends on sentence count and chunking.

---

## 4) Backend modules in depth

## 4.1 API composition and app bootstrap

`backend/app/main.py`:
- Loads env.
- Creates DB tables and FTS virtual table on startup.
- Adds CORS for frontend (`http://localhost:5173`).
- Registers all route modules.
- Adds request logging middleware with timing header `X-Process-Time`.

This gives you a clean modular API surface:

- `/api/documents` (upload, list, detail, update, reprocess)
- `/api/compare`
- `/api/corpus-check`
- `/api/batch-check`
- `/api/graph`
- `/api/style-shift`
- `/api/reports`
- `/api/dashboard`
- `/api/retrieval`
- `/api/admin`
- `/api/debug`

## 4.2 Database model

`DocumentRecord` stores:

- Metadata: title, comparison_group, document_type, topic_tag, scope_key.
- Source info: source_type, filenames, extension, content type, size.
- Text artifacts: extracted_text, normalized_text, search_text.
- Metrics: extracted_char_count, sentence_count, token_count.
- Warnings + created timestamp.

This schema is strong for both operational use and explainability.

## 4.3 Text extraction pipeline

`backend/app/services/text_extractor.py` is one of your strongest components.

### Supported inputs
- TXT
- DOCX (including nested tables via recursive cell traversal)
- PDF (two native extractors + OCR fallback)

### PDF strategy
1. Extract using PyMuPDF-based layout rebuilder.
2. Extract using pdfplumber layout rebuilder.
3. Score extraction quality (`_text_quality_score`) and select better text.
4. Detect spacing artifacts (`_looks_like_spacing_artifact`).
5. If needed, OCR enhancement with `pypdfium2 + pytesseract`.

This multi-path design is much better than a single-library PDF extraction approach.

### Cleaning logic
- Normalizes newlines.
- Compresses whitespace.
- Adds sentence boundary gap when punctuation is directly followed by next sentence start.
- Removes over-noisy blank sections.

## 4.4 Preprocessing and language support

`backend/app/services/preprocessing.py`:

- `normalize_text`: Unicode NFKC, lowercase, keep English/Bangla alnum + spaces.
- `split_into_sentences`: robust split for English + Bangla punctuation (`. ! ? । ॥`), list marker merge (`1.` / `2)`), punctuation-only filtering.
- `tokenize_words`: multilingual token extraction.
- `build_scope_key`: slug from `comparison_group`.
- `parse_topic_tags` / `serialize_topic_tags`: multi-tag normalization.
- `build_search_text`: combines metadata + content for retrieval index.

This preprocessing is the foundation for both retrieval and scoring reliability.

## 4.5 Similarity engine (how scores are generated)

Main file: `backend/app/services/similarity.py`

### 4.5.1 Mathematical primitives used in your code

All scoring paths in this project reduce to two core operations:

1. **TF-IDF vectorization**
2. **Cosine similarity**

For a term `t` in document `d`:

- `tf(t,d)` = frequency of term `t` inside `d`
- `idf(t)` = `log((N + 1) / (df(t) + 1)) + 1` (smoothed form used by scikit-learn)
- `tfidf(t,d)` = `tf(t,d) * idf(t)`

For vectors `x` and `y`:

- `cosine(x,y) = (x · y) / (||x|| * ||y||)`

Because the vectors are L2-normalized by the vectorizer pipeline, cosine is stable in `[0,1]` for this use case.

### 4.5.2 Input normalization before scoring

Before any TF-IDF/semantic score:

1. Unicode NFKC normalization
2. lowercase conversion
3. removal of non `[a-z0-9\u0980-\u09ff\s]` symbols
4. whitespace compression

So the algorithm compares standardized representations, not raw noisy text.

### 4.5.3 Document-level lexical scoring (exact formula path)

Your code computes two lexical similarities on full normalized documents:

1. **Word-channel score**
   - vectorizer: `TfidfVectorizer(analyzer="word", ngram_range=(1,2))`
   - score: `word_score = cosine(word_tfidf(doc_a), word_tfidf(doc_b))`

2. **Character-channel score**
   - vectorizer: `TfidfVectorizer(analyzer="char_wb", ngram_range=(3,5))`
   - score: `char_score = cosine(char_tfidf(doc_a), char_tfidf(doc_b))`

Then lexical fusion:

- `lexical_only_overall = 0.65 * word_score + 0.35 * char_score`

Why this weighting is meaningful:

- word channel captures phrase overlap and vocabulary reuse.
- char channel captures near-copy patterns, OCR distortions, spelling variation.
- heavier weight on word channel keeps semantics of phrase overlap primary.

### 4.5.4 Semantic scoring (exact computation)

If enabled and model loads successfully:

- model: `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`
- embeddings:
  - `e_a = encode(doc_a, normalize_embeddings=True)`
  - `e_b = encode(doc_b, normalize_embeddings=True)`
- semantic similarity:
  - `semantic = e_a · e_b`
  - clipped to `[0,1]` in code.

Because vectors are normalized, dot product is cosine similarity.

### 4.5.5 Final document-level fusion (exact branch formulas)

Branch A: semantic unavailable or disabled

- `overall = 0.65 * word_score + 0.35 * char_score`
- `scorer_path = "lexical-only"`

Branch B: semantic available

- `overall = 0.55 * semantic + 0.30 * word_score + 0.15 * char_score`
- `scorer_path = "semantic+lexical"`

The semantic channel dominates in Branch B (55%), but lexical channels still anchor explainability and robustness.

### 4.5.6 Sentence-level matching algorithm (point-to-point)

This part powers `top_matches`.

Step 1. Sentence extraction and filtering

- split sentences using multilingual punctuation rules.
- remove punctuation-only fragments.
- enforce `min_length >= 20` characters (`prepare_sentences_for_matching`).

Let:

- `A = [a1, a2, ..., am]` sentences of doc A
- `B = [b1, b2, ..., bn]` sentences of doc B

Step 2. Build two similarity matrices

- `W[i,j] = cosine(word_tfidf(ai), word_tfidf(bj))`
- `C[i,j] = cosine(char_tfidf(ai), char_tfidf(bj))`

Step 3. Compute lexical candidate score per pair

- `S_lex[i,j] = 0.7 * W[i,j] + 0.3 * C[i,j]`

Step 4. Threshold candidate generation

- keep `(i,j)` only if `S_lex[i,j] >= threshold`
- default threshold chosen in `compare_two_documents`:
  - `0.40` when semantic is allowed
  - `0.30` when semantic explicitly disabled

Step 5. Optional semantic rerank on top lexical candidates

- choose top `L` lexical candidates (`L = SEMANTIC_SENTENCE_CANDIDATE_LIMIT`, default 250)
- compute sentence embedding cosine for those pairs:
  - `Sem[i,j] = cosine(embed(ai), embed(bj))`
- rerank score:
  - `S_final[i,j] = ws * Sem[i,j] + ww * W[i,j] + wc * C[i,j]`
  - defaults:
    - `ws = 0.50`
    - `ww = 0.35`
    - `wc = 0.15`

If semantic sentence rerank is unavailable, algorithm stays on lexical `S_lex`.

Step 6. Greedy one-to-one assignment

- sort candidates by score descending.
- iterate in order:
  - select pair `(i,j)` only if `i` unused and `j` unused and score still `>= threshold`.
- mark sentence `i` and `j` as used.
- continue until `top_k` reached (or all candidates exhausted).

This creates interpretable one-to-one alignments and avoids one sentence being matched to many targets.

### 4.5.7 Worked numeric example (document-level)

Suppose:

- `word_score = 0.62`
- `char_score = 0.58`
- `semantic = 0.71`

With semantic path:

- `overall = 0.55*0.71 + 0.30*0.62 + 0.15*0.58`
- `overall = 0.3905 + 0.1860 + 0.0870`
- `overall = 0.6635` (66.35%)

Label mapping:

- `0.6635` falls in `[0.45, 0.75)` -> **Moderate Similarity**

### 4.5.8 Worked numeric example (sentence-level rerank)

For one candidate pair:

- `W = 0.64`
- `C = 0.72`
- lexical score:
  - `S_lex = 0.7*0.64 + 0.3*0.72 = 0.664`
- semantic sentence score:
  - `Sem = 0.81`

Reranked:

- `S_final = 0.50*0.81 + 0.35*0.64 + 0.15*0.72`
- `S_final = 0.405 + 0.224 + 0.108`
- `S_final = 0.737`

This pair moves upward in ranking because semantic evidence is strong.

### 4.5.9 Complexity notes from implementation behavior

- Pairwise document compare:
  - lexical vectorization over 2 docs is lightweight.
  - semantic cost dominated by transformer inference.
- Sentence matching:
  - matrix creation roughly scales with `m*n` sentence pairs.
  - optional rerank bounds semantic cost via top candidate cap (default 250).
- Batch/graph:
  - pair count is combinational `n*(n-1)/2`.
  - this is why corpus mode uses retrieval shortlist first.

### 4.5.10 Score output and debug interpretation

When `include_debug=True`, output contains:

- `scorer_path`
- `word_lexical_score`
- `char_lexical_score`
- `semantic_score`

Interpretation pattern:

- high word + high char + high semantic -> likely direct/near-direct similarity.
- low word + low char + high semantic -> paraphrase/translation-like overlap.
- high char + lower word -> formatting/noise/partial token mutation behavior.

### Labels
- `>= 0.75`: High Similarity
- `>= 0.45`: Moderate Similarity
- `< 0.45`: Low Similarity

This is a full hybrid scoring pipeline with explicit formulas, bounded score ranges, and evidence-level traceability.

## 4.6 Retrieval layer (FTS shortlist)

Files:
- `backend/app/services/fts_index.py`
- `backend/app/services/retrieval.py`

### Why retrieval exists
Comparing one source document against all documents with deep scoring is expensive.  
You solve this by **two-stage retrieval + rerank**:

1. Build an FTS query from title/group/type/topic + beginning of normalized text.
2. Remove stopwords and short tokens, deduplicate terms.
3. Fetch candidates from `documents_fts`.
4. Optionally prioritize same scope (`scope_key`) or restrict to same scope only.
5. Only then run full similarity comparison on shortlist.

This design is fast and scalable.

## 4.7 Style-shift detection (intrinsic analysis)

`backend/app/services/style_shift.py`

### Steps
1. Split text into sentences.
2. Chunk by fixed sentence count (`chunk_size`, default 5).
3. For each chunk compute features:
   - average sentence length
   - average word length
   - lexical diversity
   - punctuation density
4. Compute global baselines (mean + population std) per feature.
5. For each chunk, compute absolute z-score per feature.
6. `anomaly_score = mean(feature_z_scores)`.
7. Flag suspicious chunk when `anomaly_score >= anomaly_threshold` (default 1.2).

This is statistically explainable and easy to present in viva/demo.

## 4.8 Report generation

`backend/app/services/report_generator.py` uses ReportLab to create downloadable PDF:
- document titles
- overall percentage
- assessment label
- top matching sentence pairs

## 4.9 Logging and observability

`backend/app/core/logger.py` + debug route:
- JSON event logs to `backend/logs/system.log`.
- Tail-like retrieval (`read_log_lines`) for live debug UI.
- Clear logs endpoint for demo hygiene.

---

## 5) API behavior by feature

## 5.1 Documents
- Upload (`POST /api/documents/upload`)
- List (`GET /api/documents`)
- Detail (`GET /api/documents/{id}`)
- Metadata update (`PUT /api/documents/{id}/metadata`)
- Reprocess (`PUT /api/documents/{id}/reprocess`)

## 5.2 Analysis
- Pair compare (`POST /api/compare/documents`)
- Corpus check (`GET /api/corpus-check/{id}`)
- Batch check (`POST /api/batch-check`)
- Graph build (`POST /api/graph`)
- Style shift (`POST /api/style-shift`)

## 5.3 Retrieval and reporting
- FTS shortlist (`GET /api/retrieval/shortlist/{id}`)
- Comparison PDF (`GET /api/reports/comparison`)

## 5.4 Admin and debug
- Delete document (`DELETE /api/admin/documents/{id}`)
- Reset all data (`DELETE /api/admin/reset-data`)
- Read logs (`GET /api/debug/logs`)
- Clear logs (`DELETE /api/debug/logs`)

---

## 6) Frontend workflow mapping

### Routing
`frontend/src/App.jsx` + `AppLayout.jsx` create a dashboard-like shell with left navigation.

### Service layer
`documentService.js` centralizes all backend calls and error handling.

### Key pages
- `UploadPage`: metadata + file/manual ingestion.
- `DashboardPage`: summary metrics, recent docs, all docs table, edit/reprocess/delete/reset.
- `ComparePage`: pairwise comparison with semantic toggle, debug score display, sentence highlighting and linking.
- `CorpusCheckPage`: shortlist preview and detailed rerank results.
- `BatchCheckPage`: pairwise sweep across selected docs.
- `GraphPage`: SVG circular graph, clickable edges to open detailed comparison page.
- `ComparisonDetailsPage`: reusable detailed match explorer from batch/corpus/graph contexts.
- `ReportsPage`: style-shift execution + chunk-level anomaly visualization.
- `DebugLogsPage`: live backend log console.

### UX design choice
The app emphasizes explainability by always showing:
- score summaries
- categorical labels
- sentence-level evidence
- drilldown details

---

## 7) Package-by-package explanation

## 7.1 Frontend packages (`frontend/package.json`)

- `react`, `react-dom`: UI rendering and component model.
- `react-router-dom`: page routing/navigation.
- `vite`: dev server + build tooling.
- `@vitejs/plugin-react`: React transform support in Vite.
- `tailwindcss`, `@tailwindcss/vite`: utility CSS framework integration.
- `eslint`, `@eslint/js`, `globals`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`: linting and React code-quality checks.
- `@types/react`, `@types/react-dom`: type metadata for tooling (even in JS projects, useful to ecosystem tools).

## 7.2 Backend packages (directly used in code)

- `fastapi`, `starlette`, `uvicorn`: API framework and ASGI runtime.
- `pydantic`, `pydantic_core`, `annotated-types`, `typing_extensions`, `typing-inspection`: schema validation and API typing.
- `sqlalchemy`, `greenlet`: ORM and SQLite interaction.
- `python-dotenv`: `.env` loading.
- `python-multipart`: file upload/form parsing.
- `numpy`: embedding vector math (dot similarity).
- `scikit-learn`, `scipy`, `joblib`, `threadpoolctl`: TF-IDF and cosine similarity pipeline.
- `python-docx`, `lxml`: DOCX parsing including structured content.
- `pdfplumber`, `pdfminer.six`, `pypdfium2`, `PyMuPDF`, `pillow`, `pytesseract`: multi-path PDF extraction + OCR.
- `reportlab`: PDF report generation.

## 7.3 Backend ecosystem/transitive packages present in requirements

These are included mainly because FastAPI CLI stack, HTTP stack, rich console tooling, networking, and crypto dependencies pull them in:

- `annotated-doc`
- `anyio`
- `certifi`
- `cffi`
- `charset-normalizer`
- `click`
- `colorama`
- `cryptography`
- `dnspython`
- `email-validator`
- `fastapi-cli`
- `fastapi-cloud-cli`
- `fastar`
- `h11`
- `httpcore`
- `httptools`
- `httpx`
- `idna`
- `Jinja2`
- `markdown-it-py`
- `MarkupSafe`
- `mdurl`
- `pycparser`
- `pydantic-extra-types`
- `pydantic-settings`
- `Pygments`
- `PyYAML`
- `rich`
- `rich-toolkit`
- `rignore`
- `sentry-sdk`
- `shellingham`
- `typer`
- `urllib3`
- `watchfiles`
- `websockets`

In your current codebase, many of these are not imported directly by your own modules, but are normal supporting dependencies for the framework/toolchain stack.

---

## 8) Scoring interpretation guide (zero to advanced)

## Beginner level
- Score near 1.0 means strong similarity.
- Score near 0.0 means low similarity.
- `High/Moderate/Low` label helps quick interpretation.

## Intermediate level
- Word lexical score catches phrase/token overlap.
- Char lexical score catches near-copy, OCR noise, and spelling variation patterns.
- Semantic score catches paraphrase-like meaning overlap even when wording differs.

## Advanced level
- Corpus check uses retrieval shortlist first, so final similarity is computed on likely candidates.
- Sentence matching is one-to-one greedy; this avoids inflated counts from one sentence matching many.
- Semantic scoring can be toggled; lexical-only fallback keeps the system robust when model is unavailable.
- Thresholds and weights are tunable through code/env for domain calibration.

---

## 9) Explainability strengths of your project

- Full document score with visible label.
- Sentence-level matched evidence with per-pair scores.
- Debug view shows lexical/semantic component values.
- Graph edges make relationship patterns visible.
- Style-shift flags suspicious internal sections with feature-level metrics.
- Exportable PDF for formal reporting.

---

## 10) Current limitations (realistic view)

- PDF extraction quality still depends on document structure and scan quality.
- Style-shift is statistical and heuristic, not full authorship attribution.
- Graph layout is intentionally simple (circular) for clarity.
- No user auth/roles yet (single local operator workflow).
- No distributed storage/indexing yet (local SQLite and local files).

---

## 11) Practical improvement roadmap

1. Add test suite for extraction, similarity, and API contracts.
2. Add configurable weight profiles (e.g., lexical-heavy vs semantic-heavy).
3. Add asynchronous job queue for large corpus analyses.
4. Add role-based access and audit history.
5. Add richer graph layout (force-directed) and edge filtering UI.
6. Add confidence calibration and benchmark datasets.

---

## 12) Final project identity statement

This is not just a plagiarism percentage calculator.  
It is a full **Explainable Plagiarism Analysis Platform** with:

- robust ingestion and extraction,
- retrieval-aware candidate narrowing,
- hybrid lexical + semantic similarity scoring,
- evidence-driven sentence matching,
- intrinsic style-shift detection,
- interactive visualization,
- exportable reporting,
- and operational management/debug tooling.

That end-to-end design is exactly what makes it strong as a serious academic system project.
