from pathlib import Path
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Onix Platform"
    secret_key: str = "change-me"
    access_token_expire_minutes: int = 60 * 24 * 7

    admin_username: str = "admin"
    admin_password: str = "admin123"

    database_url: str = "sqlite+aiosqlite:///./onix.db"

    tg_api_id: int = 0
    tg_api_hash: str = ""

    @field_validator("tg_api_id", mode="before")
    @classmethod
    def _empty_to_zero(cls, v):
        if v in (None, "", "0"):
            return 0
        return v

    cors_origins: str = "http://localhost:3000"

    sessions_dir: str = "./sessions"

    join_delay_seconds: int = 60
    dm_delay_seconds: int = 30
    group_post_delay_seconds: int = 120

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def sessions_path(self) -> Path:
        p = Path(self.sessions_dir)
        p.mkdir(parents=True, exist_ok=True)
        return p


settings = Settings()
