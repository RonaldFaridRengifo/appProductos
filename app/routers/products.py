from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_staff
from app.models import Category, Product, User
from app.schemas import ProductIn
from app.uploads import save_image

router = APIRouter(prefix="/api/admin/products", tags=["products"])


def product_out(p: Product) -> dict:
    return {
        "id": p.id,
        "category_id": p.category_id,
        "title": p.title,
        "description": p.description,
        "price": p.price,
        "image_path": p.image_path,
        "discount_enabled": p.discount_enabled,
        "discount_price": p.discount_price,
        "sort_order": p.sort_order,
    }


@router.get("")
def list_products(_: User = Depends(require_staff), db: Session = Depends(get_db)):
    rows = db.query(Product).order_by(Product.sort_order, Product.id).all()
    return [product_out(p) for p in rows]


@router.post("")
def create_product(payload: ProductIn, _: User = Depends(require_staff), db: Session = Depends(get_db)):
    if not db.get(Category, payload.category_id):
        raise HTTPException(status_code=400, detail="La categoría no existe.")
    if payload.discount_enabled and payload.discount_price is None:
        raise HTTPException(status_code=400, detail="Indique el precio con descuento.")
    product = Product(**payload.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product_out(product)


@router.put("/{product_id}")
def update_product(
    product_id: int, payload: ProductIn, _: User = Depends(require_staff), db: Session = Depends(get_db)
):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado.")
    if not db.get(Category, payload.category_id):
        raise HTTPException(status_code=400, detail="La categoría no existe.")
    if payload.discount_enabled and payload.discount_price is None:
        raise HTTPException(status_code=400, detail="Indique el precio con descuento.")
    data = payload.model_dump()
    if not payload.discount_enabled:
        data["discount_price"] = product.discount_price
    for key, value in data.items():
        setattr(product, key, value)
    db.commit()
    return product_out(product)


@router.delete("/{product_id}")
def delete_product(product_id: int, _: User = Depends(require_staff), db: Session = Depends(get_db)):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado.")
    db.delete(product)
    db.commit()
    return {"ok": True}


@router.post("/{product_id}/image")
def upload_image(
    product_id: int,
    file: UploadFile = File(...),
    _: User = Depends(require_staff),
    db: Session = Depends(get_db),
):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado.")
    product.image_path = save_image(file, "products", f"product-{product_id}")
    db.commit()
    return product_out(product)
