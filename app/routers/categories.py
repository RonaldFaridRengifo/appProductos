from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_admin, require_staff
from app.models import Category, User
from app.schemas import CategoryIn

router = APIRouter(prefix="/api/admin/categories", tags=["categories"])


def cat_out(c: Category) -> dict:
    return {"id": c.id, "name": c.name, "sort_order": c.sort_order, "product_count": len(c.products)}


@router.get("")
def list_categories(_: User = Depends(require_staff), db: Session = Depends(get_db)):
    return [cat_out(c) for c in db.query(Category).order_by(Category.sort_order, Category.id).all()]


@router.post("")
def create_category(payload: CategoryIn, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    cat = Category(name=payload.name, sort_order=payload.sort_order)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat_out(cat)


@router.put("/{category_id}")
def update_category(
    category_id: int, payload: CategoryIn, _: User = Depends(require_admin), db: Session = Depends(get_db)
):
    cat = db.get(Category, category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Categoría no encontrada.")
    cat.name = payload.name
    cat.sort_order = payload.sort_order
    db.commit()
    return cat_out(cat)


@router.delete("/{category_id}")
def delete_category(category_id: int, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    cat = db.get(Category, category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Categoría no encontrada.")
    db.delete(cat)
    db.commit()
    return {"ok": True}
