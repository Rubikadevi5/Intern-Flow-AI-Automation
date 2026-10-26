# InternFlow AI

InternFlow AI is a local-first internship review operations app with a React/Vite frontend and FastAPI/SQLite backend. The default experience runs in clearly labelled demo mode without external credentials.

## Run locally

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The backend seeds the eight requested candidates safely on first startup and never duplicates them on restart.

## Integrations

Copy `.env.example` to `.env`. OpenAI, Gmail, and Calendar credentials stay on the backend. Demo mode never sends real email or creates real calendar events. Configure OAuth consent and redirect URLs in Google Cloud before enabling those integrations.