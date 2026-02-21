from __future__ import annotations

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    app_name: str = "Pathfinder API"
    debug: bool = False

    # Database
    database_url: str = "postgresql://pathfinder:pathfinder@localhost:5432/pathfinder"

    # Auth
    secret_key: str = "change-me-in-production-use-a-long-random-string"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days

    # OpenAI
    openai_api_key: str = ""
    openai_model: str = "gpt-4.1-mini"

    # ElevenLabs (optional)
    elevenlabs_api_key: str = ""
    elevenlabs_voice_id: str = ""
    elevenlabs_model_id: str = "eleven_flash_v2_5"

    # AI pipeline
    max_retries: int = 1
    retry_min_score: int = 3
    pretty_json: bool = False

    # Rate limiting (requests per minute per IP, generate per hour per user)
    rate_limit_per_minute: int = 30
    generate_limit_per_hour: int = 10

    # CORS
    cors_origins: str = "http://localhost:8080,http://localhost:5173,http://localhost:3000"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
