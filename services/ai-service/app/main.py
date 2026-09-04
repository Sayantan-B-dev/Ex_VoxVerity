from fastapi import FastAPI
from app.api.routes import router
from app.core.config import settings

app = FastAPI(
    title="VoxVerity AI Service",
    description="Voice integrity analysis and risk scoring service",
    version="0.1.0",
)

app.include_router(router, prefix="/v1")


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "ai-service"}


@app.get("/ready")
async def ready():
    return {"status": "ready"}


@app.get("/version")
async def version():
    return {
        "version": "0.1.0",
        "python": "3.13",
        "models": {
            "aasist_l": {"status": "not_loaded", "version": "v1.0"},
            "ecapa_tdnn": {"status": "not_loaded", "version": "v1.0"},
        },
    }
