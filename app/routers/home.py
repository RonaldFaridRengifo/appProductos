from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_admin
from app.models import HomeCard, User
from app.schemas import HomeCardIn
from app.uploads import save_image

router = APIRouter(prefix="/api/admin/home", tags=["home"])


def card_out(c: HomeCard) -> dict:
    return {
        "id": c.id,
        "title": c.title,
        "description": c.description,
        "image_path": c.image_path,
        "image_side": c.image_side,
        "card_size": c.card_size,
        "image_size": c.image_size,
        "sort_order": c.sort_order,
    }


@router.get("")
def list_cards(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    return [card_out(c) for c in db.query(HomeCard).order_by(HomeCard.sort_order, HomeCard.id).all()]


@router.post("")
def create_card(payload: HomeCardIn, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    card = HomeCard(**payload.model_dump())
    db.add(card)
    db.commit()
    db.refresh(card)
    return card_out(card)


@router.put("/{card_id}")
def update_card(
    card_id: int, payload: HomeCardIn, _: User = Depends(require_admin), db: Session = Depends(get_db)
):
    card = db.get(HomeCard, card_id)
    if not card:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Tarjeta no encontrada.")
    for key, value in payload.model_dump().items():
        setattr(card, key, value)
    db.commit()
    return card_out(card)


@router.delete("/{card_id}")
def delete_card(card_id: int, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    card = db.get(HomeCard, card_id)
    if not card:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Tarjeta no encontrada.")
    db.delete(card)
    db.commit()
    return {"ok": True}


@router.post("/{card_id}/image")
def upload_image(
    card_id: int,
    file: UploadFile = File(...),
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    from fastapi import HTTPException

    card = db.get(HomeCard, card_id)
    if not card:
        raise HTTPException(status_code=404, detail="Tarjeta no encontrada.")
    card.image_path = save_image(file, "home", f"card-{card_id}")
    db.commit()
    return card_out(card)
