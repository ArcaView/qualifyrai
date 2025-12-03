"""Application configuration using pydantic-settings."""
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings from environment variables.

    Internal processing API - not for consumer use.
    """

    # App
    APP_ENV: str = "development"
    APP_SECRET: str = "dev-secret-change-in-prod"
    API_VERSION: str = "0.1.0"

    # File upload limits
    MAX_FILE_MB: int = 5
    MAX_PAGES: int = 12
    
    # Timeouts (seconds)
    PARSE_TIMEOUT_S: int = 5
    SCORE_TIMEOUT_S: int = 3
    LLM_TIMEOUT_S: int = 10
    
    # Database
    POSTGRES_URL: Optional[str] = None
    
    # Redis
    REDIS_URL: Optional[str] = "redis://localhost:6379/0"
    
    # S3-compatible storage
    S3_ENDPOINT: Optional[str] = None
    S3_BUCKET: Optional[str] = None
    S3_ACCESS_KEY: Optional[str] = None
    S3_SECRET_KEY: Optional[str] = None
    S3_REGION: str = "eu-west-2"
    
    # Data handling
    PERSIST_DEFAULT: bool = False
    RETURN_RAW_TEXT: bool = False
    DATA_REGION: str = "UK"
    
    # LLM
    LLM_PROVIDER: str = "openai"  # "openai", "anthropic", "none"
    LLM_API_KEY: Optional[str] = None
    LLM_ENABLED: bool = False
    LLM_MODEL: str = "gpt-4"

    # LLM Parsing
    LLM_PARSE_ENABLED: bool = True  # Use LLM for CV parsing (more accurate)
    LLM_PARSE_FALLBACK: bool = True  # Fall back to rules if LLM fails
    
    # Observability
    LOG_LEVEL: str = "INFO"
    ENABLE_METRICS: bool = True
    
    # Security
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:8000,http://localhost:8080"

    @property
    def allowed_origins_list(self) -> list[str]:
        """Parse ALLOWED_ORIGINS string into list."""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(',')]
        
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


# Global settings instance
settings = Settings()