# Viva Quick Notes

## Project title
Explainable Plagiarism Analysis Platform for Academic Documents

## Problem solved
The system helps detect suspicious similarity between academic documents and also identifies internal writing-style inconsistency within a single document.

## Why it is not a simple plagiarism checker
It includes:
- file ingestion
- text extraction
- database storage
- document vs document comparison
- one vs corpus retrieval
- batch pairwise checking
- similarity graph
- intrinsic style-shift detection
- PDF report export

## Tech stack
- React + Vite + Tailwind CSS
- FastAPI
- SQLite
- SQLAlchemy
- scikit-learn
- pdfplumber
- python-docx
- ReportLab

## Main modules

### 1. Upload and extraction
Accepts TXT, PDF, DOCX, and manual input.
Extracts plain text and stores it.

### 2. Database layer
Stores document metadata and extracted text in SQLite.

### 3. Document comparison
Uses TF-IDF and cosine similarity to compare two documents.

### 4. Corpus check
Uses one document as query and ranks other stored documents by similarity.

### 5. Batch check
Compares every pair among selected documents and ranks suspicious pairs.

### 6. Graph visualization
Represents documents as nodes and similarity relations as edges.

### 7. Style-shift detection
Splits one document into chunks and computes writing-style features:
- average sentence length
- average word length
- lexical diversity
- punctuation density

### 8. PDF report export
Generates downloadable comparison reports.

## Why SQLite
It is lightweight, local, easy for student projects, and enough for this scope.

## Why FastAPI
Clean API design, easy testing, automatic docs.

## Why React
Good UI separation and reusable components.

## Why TF-IDF + cosine similarity
Student-friendly, explainable, classical, and strong enough for a system project.

## Current limitations
- PDF extraction is harder than DOCX
- scanned PDFs are not handled well
- sentence splitting is simple
- style-shift detection is statistical, not perfect semantic authorship detection
- graph layout is simple circular layout

## Possible future improvements
- OCR for scanned PDFs
- better sentence segmentation
- plagiarism span highlighting by word range
- better graph layout
- class/teacher user roles
- report history and download center
