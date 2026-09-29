from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_admin
from app.models import User
from app.schemas import CollaboratorIn, CollaboratorUpdate
from app.security import hash_password

router = APIRouter(prefix="/api/admin/users", tags=["users"])


def user_out(u: User) -> dict:
    return {
        "id": u.id,
        "username": u.username,
        "name": u.name,
        "email": u.email,
        "role": u.role,
        "is_active": u.is_active,
    }


@router.get("")
def list_users(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    return [user_out(u) for u in db.query(User).order_by(User.id).all()]


@router.post("")
def create_collaborator(payload: CollaboratorIn, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(status_code=400, detail="Ese usuario ya existe.")
    user = User(
        username=payload.username,
        password_hash=hash_password(payload.password),
        name=payload.name,
        role="collaborator",
        must_setup=False,
        email_verified=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user_out(user)


@router.put("/{user_id}")
def update_collaborator(
    user_id: int,
    payload: CollaboratorUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")
    if user.role == "admin" and user.id != admin.id:
        raise HTTPException(status_code=400, detail="No puede editar otro administrador.")
    if payload.username:
        exists = db.query(User).filter(User.username == payload.username, User.id != user.id).first()
        if exists:
            raise HTTPException(status_code=400, detail="Ese usuario ya existe.")
        user.username = payload.username
    if payload.name:
        user.name = payload.name
    if payload.password:
        user.password_hash = hash_password(payload.password)
    db.commit()
    return user_out(user)


@router.delete("/{user_id}")
def delete_user(user_id: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="El administrador no puede eliminarse a sí mismo.")
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")
    if user.role == "admin":
        raise HTTPException(status_code=400, detail="No puede eliminar al administrador.")
    db.delete(user)
    db.commit()
    return {"ok": True}
