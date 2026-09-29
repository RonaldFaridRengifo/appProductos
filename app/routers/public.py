from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Category, HomeCard, Location, Product
from app.seed import get_setting

router = APIRouter(prefix="/api/public", tags=["public"])


def serialize_product(p: Product) -> dict:
    current = p.discount_price if p.discount_enabled and p.discount_price is not None else p.price
    return {
        "id": p.id,
        "category_id": p.category_id,
        "title": p.title,
        "description": p.description,
        "price": p.price,
        "discount_enabled": p.discount_enabled,
        "discount_price": p.discount_price if p.discount_enabled else None,
        "current_price": current,
        "image_path": p.image_path,
        "sort_order": p.sort_order,
    }


@router.get("/site")
def site(db: Session = Depends(get_db)):
    delivery_enabled = get_setting(db, "delivery_enabled") == "true"
    return {
        "company_name": get_setting(db, "company_name", "Mi empresa"),
        "logo_path": get_setting(db, "logo_path"),
        "header_color": get_setting(db, "header_color", "#1f3a2e"),
        "background_color": get_setting(db, "background_color", "#f6f1e8"),
        "delivery_enabled": delivery_enabled,
        "delivery_name": get_setting(db, "delivery_name", "Domicilio"),
        "delivery_desktop_url": get_setting(db, "delivery_desktop_url"),
        "delivery_mobile_deep_link": get_setting(db, "delivery_mobile_deep_link"),
        "delivery_store_url": get_setting(db, "delivery_store_url"),
    }


@router.get("/home")
def home(db: Session = Depends(get_db)):
    cards = db.query(HomeCard).order_by(HomeCard.sort_order, HomeCard.id).all()
    return [
        {
            "id": c.id,
            "title": c.title,
            "description": c.description,
            "image_path": c.image_path,
            "image_side": c.image_side,
            "card_size": c.card_size,
            "image_size": c.image_size,
            "sort_order": c.sort_order,
        }
        for c in cards
    ]


@router.get("/catalog")
def catalog(db: Session = Depends(get_db)):
    categories = db.query(Category).order_by(Category.sort_order, Category.id).all()
    result = []
    for cat in categories:
        products = sorted(cat.products, key=lambda p: (p.sort_order, p.id))
        result.append(
            {
                "id": cat.id,
                "name": cat.name,
                "sort_order": cat.sort_order,
                "products": [serialize_product(p) for p in products],
            }
        )
    return result


@router.get("/locations")
def locations(db: Session = Depends(get_db)):
    rows = db.query(Location).order_by(Location.sort_order, Location.id).all()
    return [
        {
            "id": loc.id,
            "name": loc.name,
            "address": loc.address,
            "location_type": loc.location_type,
            "hours_week_open": loc.hours_week_open,
            "hours_week_close": loc.hours_week_close,
            "hours_sunday_open": loc.hours_sunday_open,
            "hours_sunday_close": loc.hours_sunday_close,
            "how_to_arrive_url": loc.how_to_arrive_url,
            "virtual_weekday_morning": loc.virtual_weekday_morning,
            "virtual_weekday_afternoon": loc.virtual_weekday_afternoon,
            "virtual_weekend": loc.virtual_weekend,
            "delivery_enabled": loc.delivery_enabled,
            "delivery_name": loc.delivery_name,
            "delivery_desktop_url": loc.delivery_desktop_url,
            "delivery_mobile_deep_link": loc.delivery_mobile_deep_link,
            "delivery_store_url": loc.delivery_store_url,
        }
        for loc in rows
    ]
