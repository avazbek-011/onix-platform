"""Guruhlar bilan ishlash - saqlash, joylashuv, yangilash."""
import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Account, Group, User
from app.schemas import (
    GeocodeQuery,
    GroupLocationUpdate,
    GroupOut,
    GroupSaveRequest,
)
from app.telethon_manager import telethon_manager
from app.telethon_manager.lookup import geocode, lookup_group

router = APIRouter(prefix="/api/groups", tags=["groups"])


def _pick_account(db: Session, user: User, account_id: int | None) -> Account:
    stmt = select(Account).where(Account.is_authorized == True)  # noqa: E712
    if user.role != "admin":
        stmt = stmt.where(Account.user_id == user.id)
    if account_id:
        stmt = stmt.where(Account.id == account_id)
    account = db.execute(stmt).scalars().first()
    if not account:
        raise HTTPException(400, "Avtorizatsiyadan o'tgan akkount topilmadi - avval Telegram akkountni ulang")
    return account


@router.get("/mine", response_model=list[GroupOut])
def my_groups(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return list(
        db.execute(
            select(Group).where(Group.user_id == user.id).order_by(Group.saved_at.desc())
        ).scalars().all()
    )


@router.get("/{group_id}", response_model=GroupOut)
def get_group(group_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    group = db.execute(select(Group).where(Group.id == group_id)).scalar_one_or_none()
    if not group:
        raise HTTPException(404, "Guruh topilmadi")
    if user.role != "admin" and group.user_id != user.id:
        raise HTTPException(403, "Sizga bu guruhni ko'rish ruxsati yo'q")
    return group


@router.post("/save", response_model=GroupOut)
async def save_group(payload: GroupSaveRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    account = _pick_account(db, user, payload.account_id)
    try:
        client = await telethon_manager.get_client(account.id, account.session_name)
    except Exception as e:
        raise HTTPException(500, f"Telegram client ulanmadi: {e}")

    try:
        info = await lookup_group(client, payload.query)
    except RuntimeError as e:
        raise HTTPException(400, str(e))

    if info.get("join_required"):
        raise HTTPException(400, "Bu yopiq guruh - avval Telegramda guruhga qo'shilib oling, keyin qayta urinib ko'ring")

    tg_id = info.get("tg_id")
    if not tg_id:
        raise HTTPException(400, "Guruh ID si aniqlanmadi")

    existing = db.execute(
        select(Group).where(Group.user_id == user.id, Group.tg_id == tg_id)
    ).scalar_one_or_none()

    if existing:
        existing.title = info["title"]
        existing.username = info.get("username")
        existing.about = info.get("about")
        existing.members_count = info.get("members_count", 0)
        existing.online_count = info.get("online_count", 0) or 0
        existing.is_megagroup = info.get("is_megagroup", False)
        existing.is_broadcast = info.get("is_broadcast", False)
        existing.auto_district = info.get("district")
        hints = info.get("address_hints", [])
        existing.auto_address_hints = json.dumps(hints, ensure_ascii=False) if hints else None
        loc = info.get("location")
        if loc:
            existing.auto_lat = loc["lat"]
            existing.auto_lng = loc["lng"]
        existing.last_sync_at = datetime.utcnow()
        db.commit()
        db.refresh(existing)
        return existing

    hints = info.get("address_hints", [])
    loc = info.get("location")
    group = Group(
        user_id=user.id,
        tg_id=tg_id,
        title=info["title"],
        username=info.get("username"),
        invite_link=payload.query if "+" in payload.query or "joinchat" in payload.query else None,
        about=info.get("about"),
        members_count=info.get("members_count", 0),
        online_count=info.get("online_count", 0) or 0,
        is_megagroup=info.get("is_megagroup", False),
        is_broadcast=info.get("is_broadcast", False),
        auto_district=info.get("district"),
        auto_address_hints=json.dumps(hints, ensure_ascii=False) if hints else None,
        auto_lat=loc["lat"] if loc else None,
        auto_lng=loc["lng"] if loc else None,
        last_sync_at=datetime.utcnow(),
    )
    db.add(group)
    db.commit()
    db.refresh(group)
    return group


@router.post("/{group_id}/refresh", response_model=GroupOut)
async def refresh(group_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    group = db.execute(select(Group).where(Group.id == group_id)).scalar_one_or_none()
    if not group:
        raise HTTPException(404, "Guruh topilmadi")
    if user.role != "admin" and group.user_id != user.id:
        raise HTTPException(403, "Ruxsat yo'q")

    account = _pick_account(db, user if user.role == "admin" else user, None)
    try:
        client = await telethon_manager.get_client(account.id, account.session_name)
    except Exception as e:
        raise HTTPException(500, f"Telegram client ulanmadi: {e}")

    query = f"@{group.username}" if group.username else str(group.tg_id)
    try:
        info = await lookup_group(client, query)
    except RuntimeError as e:
        raise HTTPException(400, str(e))

    group.title = info.get("title", group.title)
    group.members_count = info.get("members_count", group.members_count)
    group.online_count = info.get("online_count", 0) or 0
    group.about = info.get("about", group.about)
    group.last_sync_at = datetime.utcnow()
    db.commit()
    db.refresh(group)
    return group


@router.patch("/{group_id}/location", response_model=GroupOut)
def update_location(
    group_id: int,
    payload: GroupLocationUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    group = db.execute(select(Group).where(Group.id == group_id)).scalar_one_or_none()
    if not group:
        raise HTTPException(404, "Guruh topilmadi")
    if user.role != "admin" and group.user_id != user.id:
        raise HTTPException(403, "Ruxsat yo'q")
    if payload.manual_address is not None:
        group.manual_address = payload.manual_address
    if payload.manual_lat is not None:
        group.manual_lat = payload.manual_lat
    if payload.manual_lng is not None:
        group.manual_lng = payload.manual_lng
    if payload.notes is not None:
        group.notes = payload.notes
    db.commit()
    db.refresh(group)
    return group


@router.delete("/{group_id}")
def delete_group(group_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    group = db.execute(select(Group).where(Group.id == group_id)).scalar_one_or_none()
    if not group:
        raise HTTPException(404, "Guruh topilmadi")
    if user.role != "admin" and group.user_id != user.id:
        raise HTTPException(403, "Ruxsat yo'q")
    db.delete(group)
    db.commit()
    return {"ok": True}


@router.post("/geocode")
async def geocode_endpoint(payload: GeocodeQuery, user: User = Depends(get_current_user)):
    result = await geocode(payload.query)
    return result or {}
