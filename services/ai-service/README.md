# VoxVerity AI Service

FastAPI service for voice integrity analysis.

## Setup

```bash
cd services/ai-service
python -m venv .venv
.venv\Scripts\activate       # Windows
# source .venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
```

## Run

```bash
uvicorn app.main:app --reload --port 8000
```

## API Docs

Open http://localhost:8000/docs for Swagger UI.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Service health check |
| GET | /ready | Readiness probe |
| GET | /version | Version and model info |
| POST | /v1/sessions | Create analysis session |
| GET | /v1/sessions/{id} | Get session details |
| POST | /v1/sessions/{id}/chunks | Ingest audio chunk |
| GET | /v1/models | List registered models |
| GET | /v1/config | Service configuration |

## Tests

```bash
pytest tests/ -v
```
