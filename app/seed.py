from sqlalchemy.orm import Session

from app.config import settings
from app.models import SiteSetting, User
from app.security import hash_password

DEFAULT_SETTINGS = {
    "company_name": "Mi empresa",
    "logo_path": "",
    "header_color": "#1f3a2e",
    "background_color": "#f6f1e8",
    "contact_email": "",
    "delivery_enabled": "false",
    "delivery_name": "Domicilio",
    "delivery_desktop_url": "",
    "delivery_mobile_deep_link": "",
    "delivery_store_url": "",
}


def get_setting(db: Session, key: str, default: str = "") -> str:
    row = db.query(SiteSetting).filter(SiteSetting.key == key).first()
    return row.value if row else default


def set_setting(db: Session, key: str, value: str) -> None:
    row = db.query(SiteSetting).filter(SiteSetting.key == key).first()
    if row:
        row.value = value
    else:
        db.add(SiteSetting(key=key, value=value))


def seed(db: Session) -> None:
    if not db.query(User).first():
        db.add(
            User(
                username=settings.initial_admin_user,
                password_hash=hash_password(settings.initial_admin_password),
                name="Administrador",
                role="admin",
                must_setup=True,
                email_verified=False,
            )
        )
    for key, value in DEFAULT_SETTINGS.items():
        if not db.query(SiteSetting).filter(SiteSetting.key == key).first():
            db.add(SiteSetting(key=key, value=value))
    db.commit()
