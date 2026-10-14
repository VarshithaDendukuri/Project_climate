from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    mongodb_url: str = "mongodb://localhost:27017"
    mongodb_db_name: str = "climate_hazard_db"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    allowed_origins: str = "http://localhost:5173,http://localhost:3000"
    weather_cache_ttl: int = 604800   # 7 days
    analysis_cache_ttl: int = 86400   # 24 hours
    rate_limit_requests: int = 30
    rate_limit_window: int = 60

    @property
    def cors_origins(self) -> List[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]

    class Config:
        env_file = ".env"


settings = Settings()
