from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/monitor_db"
    REDIS_URL: str = "redis://localhost:6379"
    PROMETHEUS_URL: str = "http://localhost:9090"
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    ML_MODEL_DIR: str = "../ml/models"
    ML_DETECT_INTERVAL: int = 30  # seconds

    class Config:
        env_file = ".env"

settings = Settings()
