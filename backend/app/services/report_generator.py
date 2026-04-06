from pathlib import Path
from uuid import uuid4

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas


BASE_DIR = Path(__file__).resolve().parents[2]   # backend/
REPORT_DIR = BASE_DIR / "reports"
REPORT_DIR.mkdir(parents=True, exist_ok=True)


def wrap_text(text: str, max_chars: int = 95) -> list[str]:
   """
   Simple text wrapper for PDF lines.
   """
   words = text.split()
   if not words:
       return [""]

   lines = []
   current_line = words[0]

   for word in words[1:]:
       candidate = f"{current_line} {word}"
       if len(candidate) <= max_chars:
           current_line = candidate
       else:
           lines.append(current_line)
           current_line = word

   lines.append(current_line)
   return lines


def draw_wrapped_text(pdf: canvas.Canvas, text: str, x: int, y: int, max_chars: int = 95, line_height: int = 14):
   lines = wrap_text(text, max_chars=max_chars)

   for line in lines:
       pdf.drawString(x, y, line)
       y -= line_height

   return y


def generate_comparison_report_pdf(
   document_a_title: str,
   document_b_title: str,
   overall_percentage: float,
   similarity_label: str,
   top_matches: list[dict],
) -> tuple[Path, str]:
   filename = f"comparison_report_{uuid4().hex}.pdf"
   filepath = REPORT_DIR / filename

   pdf = canvas.Canvas(str(filepath), pagesize=A4)
   width, height = A4

   margin_x = 50
   y = height - 50

   # Title
   pdf.setFont("Helvetica-Bold", 16)
   pdf.drawString(margin_x, y, "Plagiarism Comparison Report")
   y -= 30

   # Metadata
   pdf.setFont("Helvetica", 11)
   pdf.drawString(margin_x, y, f"Document A: {document_a_title}")
   y -= 18
   pdf.drawString(margin_x, y, f"Document B: {document_b_title}")
   y -= 18
   pdf.drawString(margin_x, y, f"Overall Similarity: {overall_percentage}%")
   y -= 18
   pdf.drawString(margin_x, y, f"Assessment: {similarity_label}")
   y -= 30

   # Intro note
   pdf.setFont("Helvetica-Oblique", 10)
   y = draw_wrapped_text(
       pdf,
       "This report summarizes the comparison result and shows the top matching sentence pairs detected by the system.",
       margin_x,
       y,
       max_chars=95,
       line_height=14,
   )
   y -= 20

   # Matches
   pdf.setFont("Helvetica-Bold", 13)
   pdf.drawString(margin_x, y, "Top Matching Sentences")
   y -= 22

   if not top_matches:
       pdf.setFont("Helvetica", 11)
       pdf.drawString(margin_x, y, "No strong sentence-level matches were found.")
   else:
       for index, match in enumerate(top_matches, start=1):
           if y < 140:
               pdf.showPage()
               y = height - 50

           pdf.setFont("Helvetica-Bold", 11)
           pdf.drawString(
               margin_x,
               y,
               f"Match #{index} - Similarity: {(match['similarity'] * 100):.2f}%"
           )
           y -= 18

           pdf.setFont("Helvetica-Bold", 10)
           pdf.drawString(margin_x, y, "Sentence from Document A:")
           y -= 14

           pdf.setFont("Helvetica", 10)
           y = draw_wrapped_text(
               pdf,
               match["sentence_a"],
               margin_x + 10,
               y,
               max_chars=90,
               line_height=13,
           )
           y -= 10

           pdf.setFont("Helvetica-Bold", 10)
           pdf.drawString(margin_x, y, "Sentence from Document B:")
           y -= 14

           pdf.setFont("Helvetica", 10)
           y = draw_wrapped_text(
               pdf,
               match["sentence_b"],
               margin_x + 10,
               y,
               max_chars=90,
               line_height=13,
           )
           y -= 20

   pdf.save()
   return filepath, filename
