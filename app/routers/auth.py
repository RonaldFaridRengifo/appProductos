from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.mailer import send_email, smtp_configured
from app.models import EmailVerification, User
from app.schemas import LoginIn, SetupIn, VerifyEmailIn
from app.security import create_access_token, generate_code, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


def user_out(user: User) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "must_setup": user.must_setup,
        "email_verified": user.email_verified,
        "smtp_configured": smtp_configured(),
    }


@router.post("/login")
def login(payload: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos.")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Usuario desactivado.")
    token = create_access_token({"sub": str(user.id), "role": user.role})
    return {"token": token, "user": user_out(user)}


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return user_out(user)


@router.post("/send-code")
def send_code(payload: VerifyEmailIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not user.must_setup and user.role != "admin":
        raise HTTPException(status_code=403, detail="No autorizado.")
    if not smtp_configured():
        raise HTTPException(
            status_code=400,
            detail="El envío de correo no está configurado. Puede continuar sin código de verificación.",
        )
    code = generate_code()
    db.add(
        EmailVerification(
            user_id=user.id,
            code_hash=hash_password(code),
            email=str(payload.email),
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=15),
        )
    )
    db.commit()
    send_email(
        str(payload.email),
        "Código de verificación",
        f"Su código de verificación es: {code}\nCaduca en 15 minutos.",
    )
    return {"ok": True, "message": "Código enviado."}


@router.post("/setup")
def setup(payload: SetupIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not user.must_setup:
        raise HTTPException(status_code=400, detail="La cuenta ya está configurada.")

    exists = db.query(User).filter(User.username == payload.username, User.id != user.id).first()
    if exists:
        raise HTTPException(status_code=400, detail="Ese usuario ya existe.")

    if smtp_configured():
        if not payload.verification_code:
            raise HTTPException(status_code=400, detail="Ingrese el código de verificación enviado al correo.")
        codes = (
            db.query(EmailVerification)
            .filter(
                EmailVerification.user_id == user.id,
                EmailVerification.email == str(payload.email),
                EmailVerification.used.is_(False),
            )
            .order_by(EmailVerification.id.desc())
            .all()
        )
        valid = None
        now = datetime.now(timezone.utc)
        for item in codes:
            expires = item.expires_at
            if expires.tzinfo is None:
                expires = expires.replace(tzinfo=timezone.utc)
            if expires < now:
                continue
            if verify_password(payload.verification_code, item.code_hash):
                valid = item
                break
        if not valid:
            raise HTTPException(status_code=400, detail="Código de verificación inválido o vencido.")
        valid.used = True
        user.email_verified = True
    else:
        user.email_verified = False

    user.username = payload.username
    user.password_hash = hash_password(payload.password)
    user.email = str(payload.email)
    user.name = payload.name
    user.must_setup = False
    db.commit()
    token = create_access_token({"sub": str(user.id), "role": user.role})
    return {"token": token, "user": user_out(user)}
