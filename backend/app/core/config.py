from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent

DEFAULT_MODELS = {
    "anthropic": "claude-sonnet-5-5",
    "openai": "gpt-4.1-mini",
}


class Settings(BaseSettings):
    """Application settings, read from environment variables / a local .env file."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Shafrith Portfolio API"
    environment: str = "development"
    cors_origins: str = "http://localhost:5173,http://localhost:8080"
    trust_proxy_headers: bool = False
    database_url: str = "sqlite:///./data/portfolio.db"
    content_path: Path = BASE_DIR / "content" / "profile.json"

    # Ask my AI
    llm_provider: Literal["anthropic", "openai", "none"] = "anthropic"
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    llm_model: str = ""
    llm_max_tokens: int = 600
    openai_embedding_model: str = "text-embedding-3-small"
    rag_top_k: int = 4
    chat_max_message_chars: int = 500
    # 'Ask my AI': questions per visitor (IP) per window. Default: 10 per 24 hours.
    chat_rate_limit: int = 10
    chat_rate_window_seconds: int = 86400

    # Contact form
    contact_rate_limit: int = 5
    contact_rate_window_seconds: int = 3600
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_use_tls: bool = True
    smtp_from: str = ""
    contact_to_email: str = ""
    # Resend (HTTP email API). Used instead of SMTP when RESEND_API_KEY is set.
    resend_api_key: str = ""
    # resend.dev's test sender can only email the address you signed up to Resend with.
    resend_from: str = "Portfolio <onboarding@resend.dev>"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip().rstrip("/") for o in self.cors_origins.split(",") if o.strip()]

    @property
    def llm_api_key(self) -> str:
        if self.llm_provider == "anthropic":
            return self.anthropic_api_key
        if self.llm_provider == "openai":
            return self.openai_api_key
        return ""

    @property
    def resolved_llm_model(self) -> str:
        return self.llm_model or DEFAULT_MODELS.get(self.llm_provider, "")

    @property
    def resend_enabled(self) -> bool:
        return bool(self.resend_api_key and self.contact_to_email)

    @property
    def smtp_enabled(self) -> bool:
        # A username without a password means setup isn't finished yet; don't attempt to log in.
        if self.smtp_username and not self.smtp_password:
            return False
        return bool(self.smtp_host and self.contact_to_email)


@lru_cache
def get_settings() -> Settings:
    return Settings()
