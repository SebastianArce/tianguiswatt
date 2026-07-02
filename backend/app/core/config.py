"""Application configuration via environment variables (pydantic-settings)."""

from typing import Annotated

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    """Typed settings; override via ``RP_*`` env vars or a local ``.env``."""

    model_config = SettingsConfigDict(env_prefix="RP_", env_file=".env", extra="ignore")

    app_name: str = "TianguisWatt API"
    # Comma-separated origins allowed by CORS (the SPA's URL when it lives on another host).
    # Empty in dev (same-origin via the Vite proxy) → the CORS middleware stays off.
    # NoDecode: keep the raw env string (don't JSON-parse it) so the validator can split it.
    backend_cors_origins: Annotated[list[str], NoDecode] = []

    @field_validator("backend_cors_origins", mode="before")
    @classmethod
    def _split_csv(cls, v: object) -> object:
        if isinstance(v, str):
            return [o.strip() for o in v.split(",") if o.strip()]
        return v


settings = Settings()
