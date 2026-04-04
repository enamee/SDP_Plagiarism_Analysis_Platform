import re


def normalize_text(text: str) -> str:
   """
   Basic normalization for similarity comparison.
   """
   if not text:
       return ""

   text = text.lower()
   text = text.replace("\r\n", "\n").replace("\r", "\n")
   text = re.sub(r"\s+", " ", text)
   text = re.sub(r"[^a-z0-9\s]", " ", text)
   text = re.sub(r"\s+", " ", text)

   return text.strip()


def split_into_sentences(text: str) -> list[str]:
   """
   Simple sentence splitting using punctuation.
   Good enough for version 1.
   """
   if not text:
       return []

   text = text.replace("\r\n", "\n").replace("\r", "\n").strip()
   if not text:
       return []

   sentences = re.split(r'(?<=[.!?])\s+', text)
   cleaned = [sentence.strip() for sentence in sentences if sentence.strip()]

   return cleaned


def prepare_sentences_for_matching(text: str, min_length: int = 20) -> list[str]:
   """
   Split into sentences and keep only reasonably useful ones.
   """
   sentences = split_into_sentences(text)
   return [sentence for sentence in sentences if len(sentence.strip()) >= min_length]
