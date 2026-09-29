from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_admin
from app.models import Location, User
from app.schemas import LocationIn

router = APIRouter(prefix="/api/admin/locations", tags=["locations"])


def loc_out(loc: Location) -> dict:
    return {
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
        "sort_order": loc.sort_order,
    }


@router.get("")
def list_locations(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    return [loc_out(l) for l in db.query(Location).order_by(Location.sort_order, Location.id).all()]


@router.post("")
def create_location(payload: LocationIn, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    loc = Location(**payload.model_dump())
    db.add(loc)
    db.commit()
    db.refresh(loc)
    return loc_out(loc)


@router.put("/{location_id}")
def update_location(
    location_id: int, payload: LocationIn, _: User = Depends(require_admin), db: Session = Depends(get_db)
):
    loc = db.get(Location, location_id)
    if not loc:
        raise HTTPException(status_code=404, detail="Sede no encontrada.")
    for key, value in payload.model_dump().items():
        setattr(loc, key, value)
    db.commit()
    return loc_out(loc)


@router.delete("/{location_id}")
def delete_location(location_id: int, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    loc = db.get(Location, location_id)
    if not loc:
        raise HTTPException(status_code=404, detail="Sede no encontrada.")
    db.delete(loc)
    db.commit()
    return {"ok": True}
