from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_admin
from app.models import User
from app.schemas import SettingsIn
from app.seed import get_setting, set_setting
from app.uploads import save_image

router = APIRouter(prefix="/api/admin/settings", tags=["settings"])


@router.get("")
def get_settings(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    return {
        "company_name": get_setting(db, "company_name"),
        "logo_path": get_setting(db, "logo_path"),
        "header_color": get_setting(db, "header_color"),
        "background_color": get_setting(db, "background_color"),
        "contact_email": get_setting(db, "contact_email"),
        "delivery_enabled": get_setting(db, "delivery_enabled") == "true",
        "delivery_name": get_setting(db, "delivery_name"),
        "delivery_desktop_url": get_setting(db, "delivery_desktop_url"),
        "delivery_mobile_deep_link": get_setting(db, "delivery_mobile_deep_link"),
        "delivery_store_url": get_setting(db, "delivery_store_url"),
    }


@router.put("")
def update_settings(payload: SettingsIn, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    set_setting(db, "company_name", payload.company_name)
    set_setting(db, "header_color", payload.header_color)
    set_setting(db, "background_color", payload.background_color)
    set_setting(db, "contact_email", payload.contact_email)
    set_setting(db, "delivery_enabled", "true" if payload.delivery_enabled else "false")
    set_setting(db, "delivery_name", payload.delivery_name)
    set_setting(db, "delivery_desktop_url", payload.delivery_desktop_url)
    set_setting(db, "delivery_mobile_deep_link", payload.delivery_mobile_deep_link)
    set_setting(db, "delivery_store_url", payload.delivery_store_url)
    db.commit()
    return {"ok": True}


@router.post("/logo")
def upload_logo(
    file: UploadFile = File(...),
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    content_type = (file.content_type or "").lower()
    if content_type not in ("image/png", "image/x-png") and not (file.filename or "").lower().endswith(".png"):
        raise HTTPException(status_code=400, detail="El logo debe ser un archivo PNG.")
    path = save_image(file, "logo", "company-logo")
    set_setting(db, "logo_path", path)
    db.commit()
    return {"logo_path": path}
