from datetime import datetime
from sqlalchemy import BigInteger, Boolean, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    """Tizim foydalanuvchisi - boshliq (admin) yoki xodim (manager)."""
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(256))
    full_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    role: Mapped[str] = mapped_column(String(16), default="manager")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    accounts: Mapped[list["Account"]] = relationship(back_populates="owner", cascade="all, delete-orphan")
    groups: Mapped[list["Group"]] = relationship(back_populates="owner", cascade="all, delete-orphan")


class Account(Base):
    """Telegram userbot account (Telethon)."""
    __tablename__ = "accounts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)

    phone: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    session_name: Mapped[str] = mapped_column(String(128), unique=True)
    display_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    is_authorized: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    owner: Mapped["User"] = relationship(back_populates="accounts")


class Group(Base):
    """Saqlangan Telegram guruh."""
    __tablename__ = "groups"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)

    tg_id: Mapped[int] = mapped_column(BigInteger, index=True)
    title: Mapped[str] = mapped_column(String(256))
    username: Mapped[str | None] = mapped_column(String(128), nullable=True)
    invite_link: Mapped[str | None] = mapped_column(String(256), nullable=True)
    about: Mapped[str | None] = mapped_column(Text, nullable=True)

    members_count: Mapped[int] = mapped_column(Integer, default=0)
    online_count: Mapped[int] = mapped_column(Integer, default=0)
    is_megagroup: Mapped[bool] = mapped_column(Boolean, default=True)
    is_broadcast: Mapped[bool] = mapped_column(Boolean, default=False)

    # Avtomatik aniqlangan (Telethon orqali)
    auto_district: Mapped[str | None] = mapped_column(String(64), nullable=True)
    auto_address_hints: Mapped[str | None] = mapped_column(Text, nullable=True)
    auto_lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    auto_lng: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Xodim qo'lda kiritgan joylashuv (yakuniy)
    manual_address: Mapped[str | None] = mapped_column(String(256), nullable=True)
    manual_lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    manual_lng: Mapped[float | None] = mapped_column(Float, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    last_sync_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    saved_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    owner: Mapped["User"] = relationship(back_populates="groups")
