import os
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from jwt.exceptions import InvalidTokenError

from app.config import settings


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def create_access_token(data: dict) -> str:
    payload = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    payload["exp"] = expire
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    except InvalidTokenError:
        return None


def generate_code(length: int = 6) -> str:
    return "".join(str(secrets.randbelow(10)) for _ in range(length))


def ensure_dirs() -> None:
    os.makedirs(os.path.dirname(settings.database_path) or ".", exist_ok=True)
    os.makedirs(settings.uploads_dir, exist_ok=True)
    os.makedirs(os.path.join(settings.uploads_dir, "logo"), exist_ok=True)
    os.makedirs(os.path.join(settings.uploads_dir, "home"), exist_ok=True)
    os.makedirs(os.path.join(settings.uploads_dir, "products"), exist_ok=True)
