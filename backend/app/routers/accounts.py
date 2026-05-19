import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Account, User
from app.schemas import AccountAuthCode, AccountAuthStart, AccountCreate, AccountOut
from app.telethon_manager import telethon_manager

router = APIRouter(prefix="/api/accounts", tags=["accounts"])


@router.get("/", response_model=list[AccountOut])
def list_accounts(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    stmt = select(Account).order_by(Account.created_at.desc())
    if user.role != "admin":
        stmt = stmt.where(Account.user_id == user.id)
    return list(db.execute(stmt).scalars().all())


@router.post("/", response_model=AccountOut)
def create_account(payload: AccountCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if db.execute(select(Account).where(Account.phone == payload.phone)).scalar_one_or_none():
        raise HTTPException(400, "Bu raqam allaqachon qo'shilgan")
    account = Account(
        user_id=user.id,
        phone=payload.phone,
        display_name=payload.display_name,
        notes=payload.notes,
        session_name=f"acc_{uuid.uuid4().hex[:10]}",
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


def _check_owner(account: Account, user: User) -> None:
    if user.role != "admin" and account.user_id != user.id:
        raise HTTPException(403, "Bu akkount sizga tegishli emas")


@router.post("/auth/start")
async def auth_start(payload: AccountAuthStart, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    account = db.execute(select(Account).where(Account.phone == payload.phone)).scalar_one_or_none()
    if not account:
        raise HTTPException(404, "Account topilmadi")
    _check_owner(account, user)
    try:
        return await telethon_manager.start_login(account.phone, account.session_name)
    except Exception as e:
        raise HTTPException(500, str(e))


@router.post("/auth/complete", response_model=AccountOut)
async def auth_complete(payload: AccountAuthCode, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    account = db.execute(select(Account).where(Account.phone == payload.phone)).scalar_one_or_none()
    if not account:
        raise HTTPException(404, "Account topilmadi")
    _check_owner(account, user)
    try:
        result = await telethon_manager.complete_login(payload.phone, payload.code, payload.password)
    except Exception as e:
        raise HTTPException(400, str(e))
    if result.get("status") == "authorized":
        account.is_authorized = True
        if not account.display_name:
            account.display_name = result.get("first_name") or result.get("username") or account.phone
        db.commit()
        db.refresh(account)
    elif result.get("status") == "password_required":
        raise HTTPException(400, "2FA parol kerak - 'password' maydonini ham yuboring")
    return account


@router.delete("/{account_id}")
async def delete_account(account_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    account = db.execute(select(Account).where(Account.id == account_id)).scalar_one_or_none()
    if not account:
        raise HTTPException(404, "Account topilmadi")
    _check_owner(account, user)
    await telethon_manager.disconnect_account(account_id)
    db.delete(account)
    db.commit()
    return {"ok": True}
