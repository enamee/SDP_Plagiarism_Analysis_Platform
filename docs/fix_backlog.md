# Fix Backlog and Progress

This file tracks post-semantic rollout issues and commit-by-commit fixes.

## Completed

- [x] Commit checkpoint after semantic + QoL batch
  - Commit: 5cab88f
  - Message: feat: add semantic scoring controls and compare/graph QoL

- [x] Bangla highlighting not visible in Compare, and linked highlight missing in details page
  - Commit: a8683b2
  - Message: fix: restore Bangla highlights and add linked details highlighting

- [x] Dashboard recent-doc metadata missing due backend response schema filtering
  - Commit: 75a749c
  - Message: fix: include metadata fields in dashboard recent documents

- [x] OCR success shown as warning status
  - Commit: a327ee1
  - Message: fix: show OCR-processed docs as processed in dashboard

- [x] Dashboard blank metadata labels now show fallback text
  - Commit: 19ca879
  - Message: fix: show N/A fallback for empty dashboard metadata

## Pending

- [ ] Improve extraction quality for some LaTeX PDFs where spaces between words are missing.
- [ ] Improve sentence splitting robustness for style-shift and sentence matching edge cases:
  - no-space punctuation boundaries from extracted PDFs,
  - ordered list markers like 1. 2. 3.,
  - punctuation-only fragments and noisy splits.
- [ ] Recheck style-shift chunk behavior with chunk_size=5 on problematic PDFs after sentence-splitting improvements.
