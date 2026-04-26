# Explainable Plagiarism Analysis Platform - Full Project Deep Dive

## 1. Project Background and Intent

This project is built to solve a practical academic problem: detecting potential plagiarism in student submissions while still providing explainability.

Typical plagiarism tools either output only a final percentage or rely only on keyword overlap. This platform is designed to be more transparent and educational by combining:

- Document-level similarity scoring
- Sentence-level matched evidence
- Corpus-level retrieval and reranking
- Intra-document style-shift analysis
- Visual relationship graph
- PDF report export for review and audit

In short, the project answers three questions clearly:

- Why this project: to support fair and explainable plagiarism screening in educational workflows.
- What this project does: upload, extract, index, compare, retrieve, graph, and report text similarity.
- How this project does it: a FastAPI + SQLite backend with TF-IDF, optional semantic embeddings, and a React dashboard frontend.

## 2. What the System Does End-to-End

### 2.1 High-Level Workflow

1. A user uploads a file (`.txt`, `.pdf`, `.docx`) or submits manual text.
2. Backend extracts text, cleans it, computes metadata, and stores everything in SQLite.
3. The same document is inserted into an SQLite FTS5 index for retrieval.
4. User can run pairwise comparison, corpus check, batch check, graph generation, style-shift analysis, or report export.
5. Frontend visualizes score outputs plus sentence evidence and allows downloading reports.

### 2.2 Data Lifecycle

1. Input layer:
   - File upload or manual entry through `POST /api/documents/upload`.
2. Processing layer:
   - Text extraction + normalization + sentence/token statistics.
3. Storage layer:
   - Raw/extracted files in `backend/uploads/` and `backend/uploads/extracted/`.
   - Structured record in `documents` table.
4. Retrieval/index layer:
   - FTS5 row synchronized in `documents_fts`.
5. Analysis layer:
   - Similarity and style-shift algorithms run on demand per endpoint.
6. Reporting layer:
   - PDF output saved in `backend/reports/` and streamed to client.

## 3. Architecture and Code Structure

## 3.1 Backend Stack

- Framework: FastAPI
- Server: Uvicorn
- Validation: Pydantic
- ORM/DB access: SQLAlchemy
- DB: SQLite + FTS5 virtual table
- NLP/similarity: scikit-learn TF-IDF + cosine similarity
- Optional semantic layer: sentence-transformers (loaded if available at runtime)
- Extraction: pdfplumber + PyMuPDF + python-docx + pytesseract OCR fallback
- Reporting: ReportLab PDF generation

### 3.2 Frontend Stack

- React + React Router SPA
- Vite dev/build system
- Tailwind CSS styling
- Fetch-based API client in `frontend/src/services/documentService.js`

### 3.3 Core Backend Runtime Flow

`backend/app/main.py`:

1. Loads environment values from `.env`.
2. Creates SQLite tables and ensures FTS virtual table exists.
3. Registers CORS to allow frontend origin (`http://localhost:5173`).
4. Registers request middleware:
   - Logs request start/end events.
   - Adds processing-time header `X-Process-Time`.
5. Registers all routers for document, comparison, retrieval, style-shift, graph, report, dashboard, admin, and debug APIs.

## 4. Database Design and Record Semantics

Main entity: `DocumentRecord` (`backend/app/models/document.py`)

Important fields:

- Identity: `id`
- User metadata: `title`, `comparison_group`, `document_type`, `topic_tag`, `scope_key`
- Source metadata: `source_type`, `original_filename`, `stored_filename`, `extracted_filename`, `extension`, `content_type`, `size_bytes`
- Text statistics: `extracted_char_count`, `sentence_count`, `token_count`
- Text payloads: `extracted_text`, `normalized_text`, `search_text`
- Extraction status: `extraction_warning`
- Audit time: `created_at`

FTS table (`documents_fts`) is synchronized with document row IDs for fast shortlist retrieval.

## 5. API Capabilities and Their Roles

### 5.1 Document Ingestion and Maintenance

- `POST /api/documents/upload`
  - Handles file/manual input modes.
  - Validates required metadata.
  - Extracts text and computes sentence/token/char counts.
  - Writes extracted text to disk and DB.
  - Builds searchable text blob and updates FTS.

- `GET /api/documents`
  - Returns document list ordered by newest IDs.

- `GET /api/documents/{document_id}`
  - Returns complete document detail.

- `PUT /api/documents/{document_id}/metadata`
  - Updates title/group/type/tags.
  - Rebuilds `scope_key` and `search_text` and re-indexes FTS.

- `PUT /api/documents/{document_id}/reprocess`
  - Re-runs extraction logic for already-uploaded files.
  - Useful when extraction pipeline improves later.

### 5.2 Similarity and Evidence APIs

- `POST /api/compare/documents`
  - Pairwise similarity between two selected documents.
  - Returns overall score and sentence evidence (`top_matches`).
  - Includes debug component breakdown.

- `GET /api/retrieval/shortlist/{document_id}`
  - Runs FTS shortlist only.

- `GET /api/corpus-check/{document_id}`
  - Two-stage process: FTS shortlist then deep similarity reranking.

- `POST /api/batch-check`
  - Evaluates all combinations among selected documents.
  - Filters by minimum similarity and returns top pairs.

- `POST /api/graph`
  - Converts comparisons into graph edges based on min threshold.

- `POST /api/style-shift`
  - Analyzes writing style consistency inside one document.

- `GET /api/reports/comparison`
  - Generates downloadable PDF report for a pairwise comparison.

### 5.3 Monitoring and Admin APIs

- `GET /api/dashboard/summary`
  - Aggregated counters and recent documents for UI dashboard.

- `GET /api/debug/logs`, `DELETE /api/debug/logs`
  - Read/clear backend event logs.

- `DELETE /api/admin/documents/{id}`
  - Deletes document, files, and FTS row.

- `DELETE /api/admin/reset-data`
  - Clears all demo records/files/reports and resets FTS.

## 6. Algorithmic Engine - How Scores Are Generated

## 6.1 Exact Input-to-Score Pipeline

From `backend/app/services/preprocessing.py` and `backend/app/services/similarity.py`, each comparison follows this deterministic sequence:

1. Normalize raw texts:
  - Unicode NFKC normalization.
  - Lowercase conversion.
  - Character filter: keep only `[a-z0-9\u0980-\u09ff\s]`.
  - Whitespace collapse.
2. Build lexical vector spaces:
  - Word analyzer with n-grams `(1, 2)`.
  - Character analyzer `char_wb` with n-grams `(3, 5)`.
3. Compute cosine similarity in each space.
4. Optionally compute semantic similarity via embedding dot product on normalized vectors.
5. Fuse scores with fixed weights.
6. Clamp score to `[0, 1]`, convert to percentage, assign label.

This means every reported score is mathematically traceable to two or three components (word, char, optional semantic).

### 6.2 Mathematical Definitions (TF-IDF and Cosine)

Let documents be $D_a$ and $D_b$ after normalization.

For a term $t$ in document $d$:

$$
	ext{tf}(t,d) = \text{term frequency of } t \text{ in } d
$$

$$
	ext{idf}(t) = \log\left(\frac{N+1}{\text{df}(t)+1}\right) + 1
$$

where:

- $N$ = number of documents in the fitted corpus for that vectorizer call (here, 2 for pairwise doc-level scoring).
- $\text{df}(t)$ = number of documents containing term $t$.

TF-IDF weight:

$$
w_{t,d} = \text{tf}(t,d) \cdot \text{idf}(t)
$$

Cosine similarity between vectors $\mathbf{x}$ and $\mathbf{y}$:

$$
\cos(\mathbf{x},\mathbf{y}) = \frac{\mathbf{x}\cdot\mathbf{y}}{\|\mathbf{x}\|\,\|\mathbf{y}\|}
$$

In code, scikit-learn gives this directly via `cosine_similarity`.

### 6.3 Document-Level Score (Exact Fusion Equations)

Define:

- $S_w$ = word-level cosine score
- $S_c$ = character-level cosine score
- $S_s$ = semantic score (if available and enabled)

#### Case A: Lexical-only path

If semantic scoring is disabled or model unavailable:

$$
S_{doc} = 0.65\,S_w + 0.35\,S_c
$$

#### Case B: Semantic + lexical path

If semantic scoring is active:

$$
S_{doc} = 0.55\,S_s + 0.30\,S_w + 0.15\,S_c
$$

#### Post-processing

$$
S_{doc} \leftarrow \min(1, \max(0, S_{doc}))
$$

$$
	ext{percentage} = 100 \times S_{doc}
$$

Label mapping in `classify_similarity`:

- $S_{doc} \ge 0.75$ -> High Similarity
- $0.45 \le S_{doc} < 0.75$ -> Moderate Similarity
- $S_{doc} < 0.45$ -> Low Similarity

### 6.4 Sentence Matching (Point-by-Point)

For each sentence pair $(i,j)$ after sentence splitting and min-length filtering:

1. Compute word and char sentence similarities:
  - $s_w(i,j)$ from word TF-IDF matrix.
  - $s_c(i,j)$ from char TF-IDF matrix.
2. Build lexical candidate score:

$$
s_{lex}(i,j) = 0.7\,s_w(i,j) + 0.3\,s_c(i,j)
$$

3. Keep candidate if $s_{lex}(i,j) \ge \tau$ where initial threshold is function input (default 0.2 in finder).
4. Sort candidates descending.
5. Optional semantic rerank (top capped set):
  - Candidate cap: `SEMANTIC_SENTENCE_CANDIDATE_LIMIT` (default 250).
  - For candidates with semantic score $s_s(i,j)$:

$$
s(i,j) = w_s\,s_s(i,j) + w_w\,s_w(i,j) + w_c\,s_c(i,j)
$$

with defaults:

- $w_s = 0.5$
- $w_w = 0.35$
- $w_c = 0.15$

6. Greedy one-to-one assignment:
  - Iterate sorted pairs.
  - Select pair if sentence $i$ and sentence $j$ are both unused.
  - Mark both as used.
  - Continue until `top_k` reached.

### 6.5 Threshold Policy in Compare Endpoint

Inside `compare_two_documents`, effective sentence threshold is chosen as:

- If semantic explicitly disabled (`use_semantic_scoring=False`):
  - $\tau_{final} = 0.30$
- Otherwise:
  - $\tau_{final} = 0.40$

This is stricter than the low-level finder default and is intended to return stronger evidence sentences in API responses.

### 6.6 Worked Numerical Example (Document Score)

Suppose the algorithm gets:

- $S_w = 0.68$
- $S_c = 0.52$
- $S_s = 0.74$

Semantic path score:

$$
S_{doc} = 0.55(0.74) + 0.30(0.68) + 0.15(0.52)
$$

$$
S_{doc} = 0.407 + 0.204 + 0.078 = 0.689
$$

Percentage:

$$
68.9\%
$$

Label:

- $0.45 \le 0.689 < 0.75$ -> Moderate Similarity

### 6.7 Semantic Score Computation Details

The semantic component is computed as follows:

1. Encode normalized full texts with `SentenceTransformer`.
2. Use `normalize_embeddings=True`.
3. Dot product of normalized vectors equals cosine similarity:

$$
S_s = \mathbf{e}_a \cdot \mathbf{e}_b
$$

4. Clamp to `[0, 1]` in implementation.

If model load fails or dependency is missing, the system automatically falls back to lexical-only scoring without crashing.

### 6.8 Retrieval + Reranking Math (Corpus Check)

The corpus pipeline is two-stage:

1. Retrieval stage (FTS):
  - Build token set from source metadata + source normalized text prefix.
  - Remove stopwords and short terms.
  - Query using OR-combined terms in SQLite FTS5.
2. Reranking stage:
  - For each shortlisted candidate, compute full $S_{doc}$ using section 6.3 formulas.
  - Sort descending by $S_{doc}$.
  - Return top results.

Complexity intuition:

- Naive corpus compare: $O(M)$ deep comparisons over all corpus documents.
- Shortlist pipeline: $O(K)$ deep comparisons where $K \ll M$ after retrieval filtering.

### 6.9 Style-Shift Algorithm (Formal Feature Equations)

For each chunk $c$ of consecutive sentences, define:

- Word list $W_c$
- Sentence set $\Sigma_c$
- Chunk text $T_c$

Feature 1: average sentence length

$$
f_1(c) = \frac{1}{|\Sigma_c|}\sum_{\sigma \in \Sigma_c} |\text{tokens}(\sigma)|
$$

Feature 2: average word length

$$
f_2(c) = \frac{1}{|W_c|}\sum_{w \in W_c} |w|
$$

Feature 3: lexical diversity

$$
f_3(c) = \frac{|\text{unique}(W_c)|}{|W_c|}
$$

Feature 4: punctuation density

$$
f_4(c) = \frac{\#\{\text{punctuation in } T_c\}}{\max(|W_c|,1)}
$$

Across all chunks, compute population mean $\mu_k$ and population standard deviation $\sigma_k$ for each feature $k \in \{1,2,3,4\}$.

Per-feature anomaly contribution:

$$
z_k(c) =
\begin{cases}
\left|\frac{f_k(c)-\mu_k}{\sigma_k}\right|, & \sigma_k > 0 \\
0, & \sigma_k = 0
\end{cases}
$$

Chunk anomaly score:

$$
A(c) = \frac{z_1(c)+z_2(c)+z_3(c)+z_4(c)}{4}
$$

Suspicion rule:

$$
	ext{suspicious}(c) = [A(c) \ge \theta]
$$

where default threshold $\theta = 1.2$.

### 6.10 Why These Particular Weights and Signals

The implementation intentionally mixes complementary signals:

- Word TF-IDF captures direct lexical overlap.
- Char TF-IDF adds robustness to OCR noise, inflection, and minor edits.
- Semantic embeddings capture paraphrase-level similarity.

Weighting is asymmetric because direct lexical overlap remains strong evidence for plagiarism, while semantic helps recover meaning-level matches where wording changes.

### 6.11 Debug Traceability (What You Can Audit)

If `include_debug=True`, the compare response exposes:

- scorer path used (`lexical-only` or `semantic+lexical`)
- `word_lexical_score`
- `char_lexical_score`
- `semantic_score` (or null)

So every final score can be explained quantitatively as:

$$
	ext{final} = \sum (\text{component weight} \times \text{component score})
$$

with concrete component values returned by the API itself.

## 7. Text Extraction Strategy and Why It Is Layered

From `backend/app/services/text_extractor.py`:

### 7.1 TXT

- UTF-8 read with fallback ignore mode.

### 7.2 DOCX

- Reads paragraphs and tables in order.
- Supports nested tables inside cells.

### 7.3 PDF (multi-engine)

- Engine A: pdfplumber (word extraction + layout grouping)
- Engine B: PyMuPDF word extraction and custom line reconstruction
- Quality-scoring function compares outputs and selects best result
- If spacing artifacts are detected, optional OCR enhancement path is attempted

### 7.4 OCR Fallback

- Renders pages via pypdfium2
- Extracts text with pytesseract (`eng+ben`)
- Accepts OCR text if quality score improves enough

This layered strategy is used because no single extractor is universally reliable across all PDF structures.

## 8. Frontend Workflow and UX Behavior

From `frontend/src/App.jsx`, `layouts/AppLayout.jsx`, and page/service files:

- Dashboard
- Upload Documents
- Compare Documents
- Corpus Check
- Batch Check
- Similarity Graph
- Reports
- Debug Logs

Frontend service module centralizes all API calls in `documentService.js`, with consistent error handling from backend `detail` messages.

Notable UX design choices:

- Compare page supports semantic toggle and sentence-level highlight linking.
- Corpus page explicitly exposes two-stage retrieval parameters (`shortlistTopK`, `resultTopK`, scope options).
- Debug logs page surfaces backend operational transparency for development and demo purposes.

## 9. Package-by-Package Explanation (Backend)

Source: `backend/requirements.txt`

Note: This requirements file pins both direct and supporting/transitive packages. Some are framework internals rather than directly imported in project files.

| Package | Why it is in this project |
|---|---|
| annotated-doc | typing support utility used by modern Python tooling dependencies |
| annotated-types | type annotation helper used by Pydantic v2 ecosystem |
| anyio | async compatibility layer used by FastAPI/Starlette/http stack |
| certifi | CA certificates bundle for secure HTTP/TLS operations |
| cffi | C-extension bridge needed by crypto/runtime dependencies |
| charset-normalizer | robust text encoding detection/normalization in HTTP stack |
| click | CLI command framework used by FastAPI/Uvicorn tooling |
| colorama | colored terminal output support on Windows |
| cryptography | cryptographic primitives used by security-related dependencies |
| dnspython | DNS toolkit used by network/email-validation stack |
| email-validator | validates email fields in Pydantic/FastAPI models when needed |
| fastapi | main backend web framework |
| fastapi-cli | developer CLI for `fastapi dev/run` workflows |
| fastapi-cloud-cli | FastAPI ecosystem cloud/deployment helper dependency |
| fastar | runtime helper from FastAPI ecosystem dependency chain |
| greenlet | concurrency primitive used by SQLAlchemy internals |
| h11 | pure-Python HTTP/1.1 protocol layer |
| httpcore | core transport layer for HTTP client stack |
| httptools | high-performance HTTP parser used by server stack |
| httpx | modern HTTP client dependency in ecosystem stack |
| idna | internationalized domain handling in networking stack |
| Jinja2 | templating library used by framework ecosystem |
| joblib | utility used by scikit-learn for parallel/caching utilities |
| lxml | XML/HTML parsing support dependency for document ecosystem |
| markdown-it-py | markdown parser used by rich/help-text ecosystem |
| MarkupSafe | safe HTML string utility used by Jinja2 |
| mdurl | URL parser used by markdown-it-py |
| numpy | numerical arrays and vector math for similarity computations |
| pdfminer.six | PDF text parsing backend used by pdfplumber |
| pdfplumber | PDF text extraction engine |
| pillow | image processing library used by OCR and rendering paths |
| pycparser | C parser dependency used by cffi |
| pydantic | request/response schema validation and parsing |
| pydantic-extra-types | additional pydantic field types support |
| pydantic-settings | environment/config settings support in pydantic stack |
| pydantic_core | high-performance core engine for Pydantic v2 |
| Pygments | syntax highlighting used by CLI output tooling |
| PyMuPDF | alternate PDF extraction engine (fitz) |
| pypdfium2 | PDF rendering for OCR fallback path |
| pytesseract | OCR text extraction bridge to Tesseract binary |
| python-docx | DOCX document extraction (paragraphs/tables) |
| python-dotenv | loads environment vars from `.env` |
| python-multipart | multipart/form-data support for file uploads |
| PyYAML | YAML parsing support in tooling/dependency ecosystem |
| reportlab | PDF report generation engine |
| rich | rich terminal formatting for modern CLI utilities |
| rich-toolkit | helper package from rich/CLI ecosystem |
| rignore | ignore-pattern helper dependency from tooling stack |
| scikit-learn | TF-IDF and cosine similarity algorithms |
| scipy | scientific computation dependency used by scikit-learn |
| sentry-sdk | optional error/monitoring SDK support |
| shellingham | shell detection utility used by CLI packages |
| SQLAlchemy | ORM and DB engine management |
| starlette | ASGI framework layer under FastAPI |
| threadpoolctl | thread control utility used by scikit-learn/scipy stack |
| typer | typed CLI framework used by FastAPI CLI tooling |
| typing-inspection | typing introspection helper used by pydantic stack |
| typing_extensions | forward-compatible typing features |
| urllib3 | HTTP transport library used by network dependencies |
| uvicorn | ASGI server for FastAPI app |
| watchfiles | filesystem watcher for development autoreload |
| websockets | websocket protocol support in ASGI stack |

### Important Runtime Note

Semantic scoring requires `sentence_transformers` import to be available at runtime. The code is written to degrade gracefully to lexical-only if the semantic model dependency is unavailable.

## 10. Package-by-Package Explanation (Frontend)

Source: `frontend/package.json`

### Production dependencies

| Package | Why it is used |
|---|---|
| react | core UI component framework |
| react-dom | browser renderer for React components |
| react-router-dom | SPA routing between all workflow pages |
| tailwindcss | utility CSS framework for fast consistent UI styling |
| @tailwindcss/vite | integration plugin between Tailwind and Vite |

### Development dependencies

| Package | Why it is used |
|---|---|
| vite | dev server + bundler |
| @vitejs/plugin-react | React-specific Vite support (including refresh behavior) |
| eslint | linting and quality checks |
| @eslint/js | base ESLint rules package |
| eslint-plugin-react-hooks | enforces safe React Hooks patterns |
| eslint-plugin-react-refresh | lint rules for refresh-safe React code |
| globals | shared global-variable definitions for linting |
| @types/react | React type definitions for tooling/editor support |
| @types/react-dom | ReactDOM type definitions for tooling/editor support |

## 11. How Scores Flow Through Features

### Pairwise Compare

1. User selects A and B.
2. API computes overall score + sentence matches.
3. UI renders percentage, label, matched sentence links.

### Corpus Check

1. Retrieve shortlist using FTS query.
2. Deep compare source with each candidate.
3. Sort by overall similarity and return top results.

### Batch Check

1. Compute all pair combinations.
2. Keep only results above `min_similarity`.
3. Sort descending and cap by `max_pairs`.

### Graph

1. Compute pairwise similarity among selected/all docs.
2. Create edge only when similarity >= threshold.
3. UI plots nodes and weighted edges.

### Style Shift

1. Chunk a single document.
2. Feature statistics and anomaly scoring.
3. Return suspicious chunk evidence.

### Report Export

1. Recompute pairwise comparison.
2. Build PDF with metadata + top sentence matches.
3. Return downloadable file response.

## 12. Why This Architecture Works for the Project Goals

- Explainability first:
  - Top sentence evidence is always returned, not only a final number.
- Practical robustness:
  - Hybrid lexical+semantic scoring handles both direct overlap and paraphrase.
- Retrieval scalability:
  - FTS shortlist limits expensive deep comparisons.
- Real-world document handling:
  - Multiple extraction engines + OCR fallback improve coverage.
- Maintainability:
  - Clear service modules (`similarity`, `retrieval`, `style_shift`, `text_extractor`) and route boundaries.

## 13. Current Constraints and Engineering Trade-offs

- Semantic model availability is runtime-dependent.
- OCR quality depends on local Tesseract installation and source scan quality.
- SQLite is excellent for local and moderate workloads but not for very high write concurrency.
- Sentence splitting is heuristic and may over/under-segment edge cases.
- Graph logic focuses on similarity edges rather than advanced force-graph optimization.

## 14. Suggested Presentation Narrative (For Viva / Demo)

You can present the project in this sequence:

1. Problem statement: plagiarism detection needs explainability, not black-box percentages.
2. System design: upload -> extract -> index -> analyze -> visualize -> export.
3. Algorithm core: TF-IDF word+char hybrid, optional multilingual semantic model.
4. Score interpretation: thresholds, labels, and sentence evidence.
5. Advanced capability: corpus retrieval pipeline and style-shift authorship signal.
6. Engineering quality: logging, admin reset, reprocessing endpoint, FTS indexing.
7. Limitations and future path: stronger semantic packaging, richer graph layout, advanced authorship features.

---

This document is implementation-grounded from your current codebase and is intended as a complete technical background + workflow explanation for project reports, demos, and viva discussion.