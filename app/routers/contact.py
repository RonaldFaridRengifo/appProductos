from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_admin
from app.mailer import send_email, smtp_configured
from app.models import ContactMessage, User
from app.schemas import ContactIn
from app.seed import get_setting

router = APIRouter(prefix="/api/contact", tags=["contact"])


@router.post("")
def send_contact(payload: ContactIn, db: Session = Depends(get_db)):
    destination = get_setting(db, "contact_email")
    if not destination:
        admin = db.query(User).filter(User.role == "admin").first()
        if admin and admin.email:
            destination = admin.email

    db.add(ContactMessage(name=payload.name, email=str(payload.email), message=payload.message))
    db.commit()

    if destination and smtp_configured():
        try:
            send_email(
                destination,
                f"Nuevo mensaje de contacto de {payload.name}",
                f"Nombre: {payload.name}\nCorreo: {payload.email}\n\n{payload.message}",
            )
            return {"ok": True, "message": "Su mensaje fue enviado con éxito. Gracias por escribirnos."}
        except Exception:
            return {
                "ok": True,
                "message": "Su mensaje fue recibido y guardado. Pronto nos pondremos en contacto.",
            }

    return {
        "ok": True,
        "message": "Su solicitud ha sido registrada correctamente. Gracias por escribirnos.",
    }


@router.get("/messages")
def list_messages(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.query(ContactMessage).order_by(ContactMessage.id.desc()).limit(100).all()
    return [
        {
            "id": m.id,
            "name": m.name,
            "email": m.email,
            "message": m.message,
            "created_at": m.created_at.isoformat() if m.created_at else "",
        }
        for m in rows
    ]
