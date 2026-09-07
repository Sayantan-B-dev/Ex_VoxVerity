import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router
from app.realtime.routes import router as realtime_router
from app.realtime.signaling import router as signaling_router
from app.core.config import settings
from app.core.rate_limit import RateLimitMiddleware
from app.core.ws_auth import configure_ws_security
from app.models.aasist_wrapper import get_aasist
from app.models.ecapa_wrapper import get_ecapa

logger = logging.getLogger(__name__)

app = FastAPI(
    title="VoxVerity AI Service",
    description="Voice integrity analysis and risk scoring service",
    version="0.1.0",
)

# CORS - allow browser requests from configured origins
cors_origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security middleware
app.add_middleware(RateLimitMiddleware)

app.include_router(router, prefix="/v1")
app.include_router(realtime_router)
app.include_router(signaling_router)


@app.on_event("startup")
async def load_models():
    """Attempt to load AI models at startup."""
    # Configure WebSocket security from settings
    ws_origins = {o.strip() for o in settings.ws_allowed_origins.split(",") if o.strip()}
    configure_ws_security(
        allowed_origins=ws_origins,
        max_connections_per_ip=settings.ws_max_connections_per_ip,
        room_ttl_seconds=settings.ws_room_ttl_seconds,
        session_ttl_seconds=settings.ws_session_ttl_seconds,
        token_secret=settings.ws_token_secret,
    )
    logger.info(
        f"WebSocket security configured: origins={len(ws_origins)}, "
        f"max_conn/IP={settings.ws_max_connections_per_ip}, "
        f"room_ttl={settings.ws_room_ttl_seconds}s, "
        f"session_ttl={settings.ws_session_ttl_seconds}s, "
        f"token_auth=enabled"
    )

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
