from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.security import decode_token

bearer = HTTPBearer(auto_error=False)


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    if not creds:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Debe iniciar sesión.")
    payload = decode_token(creds.credentials)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sesión inválida.")
    user = db.get(User, int(payload["sub"]))
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no disponible.")
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Solo el administrador puede realizar esta acción.")
    if user.must_setup:
        raise HTTPException(status_code=403, detail="Debe completar la configuración inicial.")
    return user


def require_staff(user: User = Depends(get_current_user)) -> User:
    if user.role not in ("admin", "collaborator"):
        raise HTTPException(status_code=403, detail="No tiene permiso.")
    if user.must_setup:
        raise HTTPException(status_code=403, detail="Debe completar la configuración inicial.")
    return user
