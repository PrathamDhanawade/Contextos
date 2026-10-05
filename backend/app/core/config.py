from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    SUPABASE_URL: str
    SUPABASE_SECRET_KEY: str
    GEMINI_API_KEY: str = ""  # unused; embeddings are local MPNet / Modal
    GROQ_API_KEY: str

    # "full" = local ingestion + chat; "retrieval" = Render chat/search only
    APP_MODE: str = "full"

    MEMORY_SIMILARITY_THRESHOLD: float = 0.60

    # Comma-separated extra CORS origins (e.g. https://your-app.onrender.com)
    CORS_ORIGINS: str = ""

    # Modal (or other) all-mpnet-base-v2 HTTP endpoint — required on Render
    # Example: https://shubhampawar4036--contextos-embeddings-embedder-embed.modal.run
    EMBEDDING_SERVICE_URL: str = ""
    EMBEDDING_SERVICE_TOKEN: str = ""
    EMBEDDING_TIMEOUT_SECONDS: float = 60.0

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def is_retrieval_mode(self) -> bool:
        return self.APP_MODE.strip().lower() in {
            "retrieval",
            "api",
            "production",
            "prod",
        }

    @property
    def is_full_mode(self) -> bool:
        return not self.is_retrieval_mode

    def cors_origin_list(self) -> list[str]:
        defaults = [
            "http://localhost:5500",
            "http://127.0.0.1:5500",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:8080",
            "http://127.0.0.1:8080",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "https://contextos-nu.vercel.app",
        ]
        extra = [
            origin.strip()
            for origin in self.CORS_ORIGINS.split(",")
            if origin.strip()
        ]
        return [*defaults, *extra]


settings = Settings()
