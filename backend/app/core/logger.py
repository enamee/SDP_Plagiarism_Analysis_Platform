import json
import logging
from collections import deque
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[2]   # backend/
LOG_DIR = BASE_DIR / "logs"
LOG_FILE = LOG_DIR / "system.log"
LOGGER_NAME = "plagiarism_system"


def get_app_logger() -> logging.Logger:
    LOG_DIR.mkdir(parents=True, exist_ok=True)

    logger = logging.getLogger(LOGGER_NAME)

    if logger.handlers:
        return logger

    logger.setLevel(logging.INFO)
    logger.propagate = False

    formatter = logging.Formatter(
        "%(asctime)s | %(levelname)s | %(message)s"
    )

    stream_handler = logging.StreamHandler()
    stream_handler.setFormatter(formatter)

    file_handler = logging.FileHandler(LOG_FILE, encoding="utf-8")
    file_handler.setFormatter(formatter)

    logger.addHandler(stream_handler)
    logger.addHandler(file_handler)

    return logger


def log_event(event_type: str, message: str, **details):
    logger = get_app_logger()

    payload = {
        "event": event_type,
        "message": message,
    }

    if details:
        payload["details"] = details

    logger.info(json.dumps(payload, ensure_ascii=False, default=str))


def read_log_lines(limit: int = 200) -> list[str]:
    LOG_DIR.mkdir(parents=True, exist_ok=True)

    if not LOG_FILE.exists():
        LOG_FILE.write_text("", encoding="utf-8")
        return []

    with LOG_FILE.open("r", encoding="utf-8") as file:
        return list(deque((line.rstrip("\n") for line in file), maxlen=limit))


def clear_log_file():
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    LOG_FILE.write_text("", encoding="utf-8")
