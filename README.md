# Explainable Plagiarism Analysis Platform

A web-based system project for analyzing plagiarism in academic documents.

## Tech Stack
- Frontend: React + Vite + Tailwind CSS
- Backend: FastAPI
- Database: SQLite (later)
- Algorithms: Classical NLP and similarity methods

## Project Goals
- Compare one document against another
- Compare one document against a corpus
- Batch compare multiple submissions
- Visualize a class-wide similarity graph
- Detect style shifts inside a document
- Export reports

---

## Project Structure

```text
plagiarism-analysis-platform/
│
├── backend/
│   ├── app/
│   ├── uploads/
│   ├── requirements.txt
│   └── .gitignore
│
├── frontend/
│   ├── src/
│   ├── package.json
│   └── .gitignore
│
├── docs/
├── samples/
├── .gitignore
└── README.md
```


## Setup

### Prerequisites

Make sure these are installed on your computer:
- Git
- Python 3.11+
- Node.js
- npm

### 1. Clone the repository

```bash
git clone https://github.com/enamee/SDP_Plagiarism_Analysis_Platform.git
cd SDP_Plagiarism_Analysis_Platform
```

### 2. Set up the backend

Go to the backend folder:

```bash
cd backend
```

Create a virtual environment.

On Linux/macOS:
```bash
python -m venv .venv
source .venv/bin/activate
```

On Windows Command Prompt:
```cmd
python -m venv .venv
.venv\Scripts\activate
```

Install backend dependencies:

```bash
pip install -r requirements.txt
```

### 3. Set up the frontend

Open a new terminal and go to the frontend folder:

```bash
cd frontend
npm install
```

This installs all frontend packages from package.json.

## How to Run the Project

### Run the backend

Open Terminal 1.

On Linux/macOS:
```bash
cd backend
source .venv/bin/activate
fastapi dev app/main.py
```

On Windows Command Prompt:
```cmd
cd backend
.venv\Scripts\activate
fastapi dev app/main.py
```

Backend will run at:
- http://127.0.0.1:8000
- Health check: http://127.0.0.1:8000/health
- API docs: http://127.0.0.1:8000/docs

### Run the frontend

Open Terminal 2:

```bash
cd frontend
npm run dev
```

Frontend will run at:
- http://localhost:5173
