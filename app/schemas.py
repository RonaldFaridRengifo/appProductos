from pydantic import BaseModel, EmailStr, Field


class LoginIn(BaseModel):
    username: str = Field(min_length=1, max_length=80)
    password: str = Field(min_length=1, max_length=128)


class SetupIn(BaseModel):
    username: str = Field(min_length=3, max_length=80)
    password: str = Field(min_length=8, max_length=128)
    email: EmailStr
    name: str = Field(min_length=2, max_length=120)
    verification_code: str | None = None


class VerifyEmailIn(BaseModel):
    email: EmailStr


class CollaboratorIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    username: str = Field(min_length=3, max_length=80)
    password: str = Field(min_length=8, max_length=128)


class CollaboratorUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    username: str | None = Field(default=None, min_length=3, max_length=80)
    password: str | None = Field(default=None, min_length=8, max_length=128)


class HomeCardIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = ""
    image_side: str = Field(pattern="^(left|right)$")
    card_size: str = Field(pattern="^(sm|md|lg|full)$")
    image_size: str = Field(pattern="^(sm|md|lg)$")
    sort_order: int = 0


class CategoryIn(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    sort_order: int = 0


class ProductIn(BaseModel):
    category_id: int
    title: str = Field(min_length=1, max_length=200)
    description: str = ""
    price: float = Field(ge=0)
    discount_enabled: bool = False
    discount_price: float | None = Field(default=None, ge=0)
    sort_order: int = 0


class LocationIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    address: str = ""
    location_type: str = Field(pattern="^(presencial|virtual)$")
    hours_week_open: str = "08:00"
    hours_week_close: str = "18:00"
    hours_sunday_open: str = "09:00"
    hours_sunday_close: str = "14:00"
    how_to_arrive_url: str = ""
    virtual_weekday_morning: str = ""
    virtual_weekday_afternoon: str = ""
    virtual_weekend: str = ""
    delivery_enabled: bool = False
    delivery_name: str = ""
    delivery_desktop_url: str = ""
    delivery_mobile_deep_link: str = ""
    delivery_store_url: str = ""
    sort_order: int = 0


class ContactIn(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    email: EmailStr
    message: str = Field(min_length=5, max_length=4000)


class SettingsIn(BaseModel):
    company_name: str = Field(min_length=1, max_length=120)
    header_color: str = Field(pattern="^#[0-9A-Fa-f]{6}$")
    background_color: str = Field(pattern="^#[0-9A-Fa-f]{6}$")
    contact_email: str = ""
    delivery_enabled: bool = False
    delivery_name: str = ""
    delivery_desktop_url: str = ""
    delivery_mobile_deep_link: str = ""
    delivery_store_url: str = ""
