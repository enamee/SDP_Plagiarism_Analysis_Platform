# Plagiarism Analysis System - Algorithm Explanation

This document explains how the plagiarism analysis system computes similarity scores and matches sentences between documents.

## Overview

The system uses a **hybrid approach** combining:
- **Lexical Scoring**: Word and character-level TF-IDF similarity
- **Semantic Scoring**: Embedding-based similarity for deeper semantic understanding
- **Sentence Matching**: One-to-one pairing of similar sentences using TF-IDF scores

## Architecture Diagram

```
Document A                          Document B
    ↓                                    ↓
Text Extraction → Normalization ← Text Extraction
    ↓                                    ↓
Sentence Splitting (≥20 chars filter)   ↓
    ↓                                    ↓
┌─────────────────────────────────────────────┐
│         SENTENCE MATCHING PIPELINE          │
├─────────────────────────────────────────────┤
│ 1. Build TF-IDF similarity matrices         │
│    - Word-level (1-2 grams)                 │
│    - Character-level (3-5 grams)            │
│ 2. Compute cosine similarity scores         │
│ 3. Filter candidates above threshold (0.2)  │
│ 4. One-to-one pairing (greedy matching)     │
│ 5. Return top-k matches (default: 5)        │
└─────────────────────────────────────────────┘
    ↓
Sentence Matches
    ↓
┌─────────────────────────────────────────────┐
│      DOCUMENT-LEVEL SIMILARITY PIPELINE     │
├─────────────────────────────────────────────┤
│ 1. Normalize texts (Unicode + lowercase)    │
│ 2. Compute word-level TF-IDF (65% weight)   │
│ 3. Compute char-level TF-IDF (35% weight)   │
│ 4. [Optional] Compute semantic embedding    │
│ 5. Fuse scores into overall similarity      │
└─────────────────────────────────────────────┘
    ↓
Overall Similarity Score & Breakdown
```

## 1. Sentence Matching

### Input Preparation

Before matching, sentences are preprocessed:

```
Raw Text
  ↓
split_into_sentences() → removes punctuation-only fragments
  ↓
prepare_sentences_for_matching() → filters sentences < 20 chars
  ↓
Cleaned Sentences (ready for matching)
```

**Example**:
```
Original:   "Hello world. . This is great!"
After prep: ["Hello world.", "This is great!"]
            (the standalone "." is filtered out)
```

### TF-IDF Similarity Matrix

The system builds **two similarity matrices**:

1. **Word-level TF-IDF** (1-2 word grams)
   - Uses bag-of-words with n-grams (1 and 2 consecutive words)
   - Better for semantic similarity and word choice
   - Weight in score: **70%**

2. **Character-level TF-IDF** (3-5 character grams)
   - Uses character n-grams (3-5 consecutive characters)
   - Better for typos, OCR artifacts, and spelling variations
   - Weight in score: **30%**

**How it works**:
```
Sentence A: "The quick brown fox"
Sentence B: "A quick brown fox"

Word similarity: 0.85 (3 out of 4 words match)
Char similarity: 0.92 (character sequences mostly match)

Combined: 0.7 × 0.85 + 0.3 × 0.92 = 0.865
```

### Matching Strategy

For each pair of sentences (one from Document A, one from Document B):

1. **Score Calculation**:
   ```
   score = (0.7 × word_similarity) + (0.3 × char_similarity)
   ```

2. **Threshold Filtering**:
   - Only pairs with `score ≥ 0.2` are considered matches
   - This prevents spurious matches from random text

3. **One-to-One Pairing** (Greedy Matching):
   - Process candidates in descending score order
   - Once a sentence is matched, it cannot be matched again
   - Ensures each sentence maps to at most one other sentence

**Example**:
```
Candidates (sorted by score):
  Sent A1 vs Sent B2: 0.92 ✓ (selected, both marked as used)
  Sent A1 vs Sent B3: 0.89 ✗ (A1 already used)
  Sent A2 vs Sent B2: 0.85 ✗ (B2 already used)
  Sent A2 vs Sent B1: 0.78 ✓ (selected)
  ...
```

4. **Return Top-K Matches**:
   - Default: top 5 matches
   - Configurable per request
   - Ordered by similarity score (highest first)

## 2. Document-Level Similarity

### Text Normalization

Before computing document similarity:

1. **Unicode Normalization** (NFKC):
   - Converts multi-byte characters to standard forms
   - Ensures consistency across platforms

2. **Lowercasing**:
   - Converts all text to lowercase
   - Makes matching case-insensitive

3. **Character Filtering**:
   - Keeps: letters (A-Z, Bangla ৯৮০-০৯৯), numbers, spaces
   - Removes: punctuation, special symbols, accents

**Example**:
```
Original: "Café café.ঁ Dhaka123!"
Normalized: "cafe cafe dhaka123"
```

### Lexical Scoring (Always Computed)

Uses the same word and character-level TF-IDF as sentence matching, but on the **full documents**:

1. **Word-Level TF-IDF**:
   - 1-2 word n-grams across entire document
   - Captures vocabulary overlap

2. **Character-Level TF-IDF**:
   - 3-5 character n-grams across entire document
   - Catches structural similarities even with different vocabulary

**Combined Lexical Score**:
```
lexical_score = (0.65 × word_score) + (0.35 × char_score)
```

### Semantic Scoring (Optional)

When `use_semantic_scoring=true`:

1. **Embedding Model**:
   - Uses `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`
   - Pre-trained on multilingual paraphrase detection
   - Supports English and Bangla

2. **Embedding Process**:
   ```
   normalized_text_a → [Embedding Model] → 768-dim vector
   normalized_text_b → [Embedding Model] → 768-dim vector
   ```

3. **Similarity Computation**:
   - Cosine similarity between normalized vectors
   - Range: 0 (completely different) to 1 (identical)

**Why Semantic Scoring Matters**:
```
Text A: "The book was interesting"
Text B: "I found the novel fascinating"

Lexical Score: 0.45 (only "the" matches)
Semantic Score: 0.87 (similar meaning)

Overall (hybrid): 0.55 × 0.87 + 0.30 × 0.45 + 0.15 × char = 0.72
```

### Overall Similarity Fusion

**If Semantic Scoring is DISABLED** (lexical-only):
```
overall = (0.65 × word_lexical) + (0.35 × char_lexical)
```

**If Semantic Scoring is ENABLED** (semantic+lexical):
```
overall = (0.55 × semantic) + (0.30 × word_lexical) + (0.15 × char_lexical)

Weights:
  - Semantic: 55% (primary signal for meaning)
  - Word Lexical: 30% (vocabulary overlap)
  - Character Lexical: 15% (typo/OCR robustness)
```

### Similarity Classification

Based on overall score:
- **High Similarity**: ≥ 0.75
- **Moderate Similarity**: ≥ 0.45 and < 0.75
- **Low Similarity**: < 0.45

## 3. Debug Output

When `include_debug=true`, the API returns detailed scoring breakdown:

```json
{
  "debug": {
    "scorer_path": "semantic+lexical",
    "semantic_requested": true,
    "word_lexical_score": 0.62,
    "char_lexical_score": 0.58,
    "semantic_score": 0.71,
    "overall_similarity": 0.6532
  }
}
```

### Interpreting Debug Output

1. **scorer_path**:
   - `"lexical-only"`: Semantic model unavailable or disabled
   - `"semantic+lexical"`: Full hybrid scoring used

2. **Individual Scores**:
   - `word_lexical_score`: Vocabulary overlap (0-1)
   - `char_lexical_score`: Character-level similarity (0-1)
   - `semantic_score`: Embedding similarity (0-1 or null)

3. **Score Interpretation**:
   ```
   High word but low semantic?
     → Documents use similar vocabulary but different meanings
   
   High semantic but low lexical?
     → Documents express similar ideas with different words
   
   High character but low word?
     → Documents share character sequences but different word structure
   ```

## 4. Algorithm Tuning Parameters

### Sentence Matching
- **Minimum Sentence Length**: 20 characters
  - Prevents noise from short fragments
  - Adjustable in `prepare_sentences_for_matching()`

- **Similarity Threshold**: 0.2
  - Minimum score for a pair to be considered a match
  - Configurable via `find_top_sentence_matches(threshold=...)`

- **Top-K Results**: Usually 5
  - Number of matches to return
  - Adjustable per request

### Document Similarity
- **Word TF-IDF N-grams**: (1, 2)
  - Unigrams and bigrams
  - Balanced: unigrams catch individual words, bigrams catch phrases

- **Character TF-IDF N-grams**: (3, 5)
  - 3-5 consecutive characters
  - Robust to OCR errors and typos

- **Semantic Model**: `paraphrase-multilingual-MiniLM-L12-v2`
  - Multilingual (English, Bangla, etc.)
  - Fast (12-layer, 384-dim) vs. larger models
  - Pre-trained on paraphrase detection

## 5. Workflow Examples

### Example 1: Identical Documents

```
Document A: "The quick brown fox jumps over the lazy dog"
Document B: "The quick brown fox jumps over the lazy dog"

Sentence Match: 1.0 (perfect match)
Word Lexical: 1.0 (all words identical)
Char Lexical: 1.0 (all characters identical)
Semantic: 1.0 (embedding similarity is perfect)

Overall: 1.0 → Classification: High Similarity
```

### Example 2: Similar But Not Identical

```
Document A: "The quick brown fox jumps over the lazy dog"
Document B: "A quick brown fox jumps over a lazy dog"

Sentence Match: 0.95 (one word differs)
Word Lexical: 0.92 (minor vocabulary difference)
Char Lexical: 0.97 (character-level very similar)
Semantic: 0.98 (meaning is same)

Overall: 0.55 × 0.98 + 0.30 × 0.92 + 0.15 × 0.97 = 0.954
→ Classification: High Similarity
```

### Example 3: Paraphrased Content

```
Document A: "The book was interesting and kept me engaged"
Document B: "I found the novel fascinating and hard to put down"

Sentence Match: 0.52 (similar meaning but different words)
Word Lexical: 0.35 (different vocabulary)
Char Lexical: 0.48 (some character overlap)
Semantic: 0.82 (similar meaning detected)

Overall: 0.55 × 0.82 + 0.30 × 0.35 + 0.15 × 0.48 = 0.612
→ Classification: Moderate Similarity
```

### Example 4: Completely Different Documents

```
Document A: "Python is a programming language"
Document B: "Cats are domestic animals"

Sentence Match: 0.05 (no meaningful similarity)
Word Lexical: 0.02 (no vocabulary overlap except "a")
Char Lexical: 0.15 (some random character matches)
Semantic: 0.12 (completely different topics)

Overall: 0.55 × 0.12 + 0.30 × 0.02 + 0.15 × 0.15 = 0.089
→ Classification: Low Similarity
```

## 6. Multilingual Support

The system supports English and Bangla text:

### Text Processing
- **English**: Standard ASCII + Unicode letters
- **Bangla**: Unicode range ৯৮০-०९९ (U+0980-U+09FF)

### Semantic Scoring
- Model supports both languages
- No language detection needed; just pass mixed text

### Sentence Splitting
- Recognizes Bangla sentence markers: `।` (Danda), `॥` (Double Danda)
- Works alongside English markers: `.`, `!`, `?`

**Example**:
```
Bengali: "এটি একটি বাক্য।পরবর্তী বাক্য।"
Split: ["এটি একটি বাক্য।", "পরবর্তী বাক্য।"]

Mixed: "Hello world. আমার নাম। Goodbye."
Split: ["Hello world.", "আমার নাম।", "Goodbye."]
```

## 7. Performance Characteristics

### Time Complexity
- **Sentence Matching**: O(m × n) where m, n are sentence counts
  - TF-IDF matrix building: linear in document size
  - Candidate generation: O(m × n)
  - Greedy selection: O(m × n × log(m × n))

- **Document Similarity**: O(V) where V is vocabulary size
  - TF-IDF vectorization: O(V) per document
  - Cosine similarity: O(V²)

- **Semantic Scoring**: ~100-500ms
  - Depends on embedding model and document length

### Space Complexity
- **Sentence Matrices**: O(m × n) for sparse similarity matrices
- **TF-IDF Vectors**: O(V) where V is vocabulary size
- **Embeddings**: O(1) per document (fixed 768-dim vector)

### Optimization Notes
- Large documents (>50 sentences) capped at 50 sentences per matching
- Vectorization uses sparse matrices to save memory
- Semantic model is cached globally after first load

## 8. Known Limitations

1. **PDF Formatting**: Line breaks within sentences may split content
   - Mitigation: Use the 20-char minimum and threshold filtering
   - Future: Implement PDF-specific layout analysis

2. **Short Sentences**: Sentences < 20 characters are excluded from matching
   - Reason: Prevent noise from fragments
   - Trade-off: May miss important short phrases

3. **Semantic Model**:
   - Multilingual but English-biased in training
   - May be less accurate for low-resource languages
   - Requires ~500MB disk space for model download

4. **OCR Artifacts**: Character-level matching helps but doesn't fully correct
   - Mitigation: Use 35% weight on char similarity
   - Recommendation: Reprocess with better OCR if accuracy critical

## 9. Comparison Modes

### Batch Check
- Compares all pairs of selected documents
- Returns top-N pairs by similarity
- Useful for detecting suspicious clusters

### Corpus Check
- Compares one document against a group
- Finds most similar documents from corpus
- Useful for retrieval and ranking

### Comparison (Pairwise)
- Detailed sentence-level matching for two documents
- Shows exact matching pairs
- Useful for detailed analysis

### Graph View
- Visualizes document relationships
- Thickness represents similarity strength
- Helps identify plagiarism networks

## 10. Future Improvements

- [ ] Semantic weighting based on confidence scores
- [ ] Dynamic threshold adjustment
- [ ] Language-specific parameter tuning
- [ ] Support for longer documents with chunking
- [ ] Fine-tuned semantic model for plagiarism detection
- [ ] Support for code and technical document analysis
