import logging
from fastapi import FastAPI
from app.api.routes import router
from app.core.config import settings
from app.models.aasist_wrapper import get_aasist
from app.models.ecapa_wrapper import get_ecapa

logger = logging.getLogger(__name__)

app = FastAPI(
    title="VoxVerity AI Service",
    description="Voice integrity analysis and risk scoring service",
    version="0.1.0",
)

app.include_router(router, prefix="/v1")


@app.on_event("startup")
async def load_models():
    """Attempt to load AI models at startup."""
    aasist = get_aasist()
    if aasist.load():
        logger.info("AASIST-L model loaded successfully")
    else:
        logger.warning(f"AASIST-L model not loaded: {aasist.status['error']}")

    ecapa = get_ecapa()
    if ecapa.load():
        logger.info("ECAPA-TDNN model loaded successfully")
    else:
        logger.warning(f"ECAPA-TDNN model not loaded: {ecapa.status['error']}")


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "ai-service"}


@app.get("/ready")
async def ready():
    return {"status": "ready"}


@app.get("/version")
async def version():
    aasist = get_aasist()
    return {
        "version": "0.1.0",
        "python": "3.13",
        "models": {
            "aasist_l": {
                "status": "loaded" if aasist.status["loaded"] else "not_loaded",
                "version": aasist.status["version"],
                "error": aasist.status["error"],
            },
            "ecapa_tdnn": {
                "status": "loaded" if get_ecapa().status["loaded"] else "not_loaded",
                "version": get_ecapa().status["version"],
                "error": get_ecapa().status["error"],
            },
        },
    }
