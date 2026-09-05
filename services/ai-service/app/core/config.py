from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    service_name: str = "ai-service"
    debug: bool = False
    host: str = "0.0.0.0"
    port: int = 8000

    # CORS origins (comma-separated)
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    # Model settings
    aasist_model_path: str = "model_artifacts/aasist_l.pth"
    ecapa_model_path: str = "model_artifacts/ecapa_tdnn.pth"

    # Audio settings
    sample_rate: int = 16000
    chunk_duration_ms: int = 3000
    model_window_samples: int = 64600  # AASIST-L ~4.04s at 16kHz

    class Config:
        env_file = ".env"


settings = Settings()
