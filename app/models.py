from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    name: Mapped[str] = mapped_column(String(120), default="")
    email: Mapped[str] = mapped_column(String(255), default="")
    role: Mapped[str] = mapped_column(String(32), default="admin")
    must_setup: Mapped[bool] = mapped_column(Boolean, default=True)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    verification_codes: Mapped[list["EmailVerification"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class EmailVerification(Base):
    __tablename__ = "email_verifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    code_hash: Mapped[str] = mapped_column(String(255))
    email: Mapped[str] = mapped_column(String(255))
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    used: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    user: Mapped[User] = relationship(back_populates="verification_codes")


class SiteSetting(Base):
    __tablename__ = "site_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    key: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    value: Mapped[str] = mapped_column(Text, default="")


class HomeCard(Base):
    __tablename__ = "home_cards"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    image_path: Mapped[str] = mapped_column(String(500), default="")
    image_side: Mapped[str] = mapped_column(String(16), default="left")
    card_size: Mapped[str] = mapped_column(String(16), default="md")
    image_size: Mapped[str] = mapped_column(String(16), default="md")
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(160))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    products: Mapped[list["Product"]] = relationship(
        back_populates="category", cascade="all, delete-orphan"
    )


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    price: Mapped[float] = mapped_column(Float, default=0)
    image_path: Mapped[str] = mapped_column(String(500), default="")
    discount_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    discount_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    category: Mapped[Category] = relationship(back_populates="products")


class Location(Base):
    __tablename__ = "locations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    address: Mapped[str] = mapped_column(String(400), default="")
    location_type: Mapped[str] = mapped_column(String(32), default="presencial")
    hours_week_open: Mapped[str] = mapped_column(String(16), default="08:00")
    hours_week_close: Mapped[str] = mapped_column(String(16), default="18:00")
    hours_sunday_open: Mapped[str] = mapped_column(String(16), default="09:00")
    hours_sunday_close: Mapped[str] = mapped_column(String(16), default="14:00")
    how_to_arrive_url: Mapped[str] = mapped_column(String(500), default="")
    virtual_weekday_morning: Mapped[str] = mapped_column(String(80), default="")
    virtual_weekday_afternoon: Mapped[str] = mapped_column(String(80), default="")
    virtual_weekend: Mapped[str] = mapped_column(String(80), default="")
    delivery_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    delivery_name: Mapped[str] = mapped_column(String(120), default="")
    delivery_desktop_url: Mapped[str] = mapped_column(String(500), default="")
    delivery_mobile_deep_link: Mapped[str] = mapped_column(String(500), default="")
    delivery_store_url: Mapped[str] = mapped_column(String(500), default="")
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class ContactMessage(Base):
    __tablename__ = "contact_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(160))
    email: Mapped[str] = mapped_column(String(255))
    message: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
