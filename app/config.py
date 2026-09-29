from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    secret_key: str = "cambia-esta-clave-secreta-por-una-larga-y-aleatoria"
    access_token_expire_minutes: int = 480
    algorithm: str = "HS256"

    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    smtp_use_tls: bool = True

    initial_admin_user: str = "Admin"
    initial_admin_password: str = "Admin"

    database_path: str = "data/app.db"
    uploads_dir: str = "uploads"
    max_upload_bytes: int = 5 * 1024 * 1024


settings = Settings()
