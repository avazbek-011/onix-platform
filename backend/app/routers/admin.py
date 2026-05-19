"""Boshliq paneli endpointlari."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth import hash_password, require_admin
from app.database import get_db
from app.models import Account, Group, User
from app.schemas import AdminUserSummary, GroupOut, UserCreate, UserOut, UserUpdate

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(require_admin)])


@router.get("/users", response_model=list[AdminUserSummary])
def list_users(db: Session = Depends(get_db)):
    users = list(db.execute(select(User).order_by(User.created_at.desc())).scalars().all())
    result = []
    for u in users:
        acc_count = db.execute(select(func.count(Account.id)).where(Account.user_id == u.id)).scalar() or 0
        grp_count = db.execute(select(func.count(Group.id)).where(Group.user_id == u.id)).scalar() or 0
        grp_loc = db.execute(
            select(func.count(Group.id)).where(Group.user_id == u.id, Group.manual_lat.isnot(None))
        ).scalar() or 0
        result.append(AdminUserSummary(
            id=u.id, username=u.username, full_name=u.full_name, role=u.role,
            is_active=u.is_active, created_at=u.created_at,
            accounts_count=acc_count, groups_count=grp_count, groups_with_location=grp_loc,
        ))
    return result


@router.post("/users", response_model=UserOut)
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
    if db.execute(select(User).where(User.username == payload.username)).scalar_one_or_none():
        raise HTTPException(400, "Bu login band")
    user = User(
        username=payload.username,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        role=payload.role,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/users/{user_id}", response_model=UserOut)
def update_user(user_id: int, payload: UserUpdate, db: Session = Depends(get_db)):
    user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    if not user:
        raise HTTPException(404, "Foydalanuvchi topilmadi")
    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.password:
        user.password_hash = hash_password(payload.password)
    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.role is not None:
        user.role = payload.role
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), admin=Depends(require_admin)):
    if user_id == admin.id:
        raise HTTPException(400, "O'zingizni o'chira olmaysiz")
    user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    if not user:
        raise HTTPException(404, "Foydalanuvchi topilmadi")
    db.delete(user)
    db.commit()
    return {"ok": True}


@router.get("/users/{user_id}", response_model=UserOut)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    if not user:
        raise HTTPException(404, "Foydalanuvchi topilmadi")
    return user


@router.get("/users/{user_id}/groups", response_model=list[GroupOut])
def user_groups(user_id: int, db: Session = Depends(get_db)):
    return list(db.execute(
        select(Group).where(Group.user_id == user_id).order_by(Group.saved_at.desc())
    ).scalars().all())
