from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Account, User
from app.schemas import LookupRequest
from app.telethon_manager import telethon_manager
from app.telethon_manager.lookup import lookup_group

router = APIRouter(prefix="/api/lookup", tags=["lookup"])


@router.post("")
async def lookup(payload: LookupRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    stmt = select(Account).where(Account.is_authorized == True)  # noqa: E712
    if user.role != "admin":
        stmt = stmt.where(Account.user_id == user.id)
    if payload.account_id:
        stmt = stmt.where(Account.id == payload.account_id)
    account = db.execute(stmt).scalars().first()
    if not account:
        raise HTTPException(400, "Avtorizatsiyadan o'tgan akkount topilmadi - avval Telegram akkountni ulang")

    try:
        client = await telethon_manager.get_client(account.id, account.session_name)
    except Exception as e:
        raise HTTPException(500, f"Telegram client ulanmadi: {e}")

    try:
        result = await lookup_group(client, payload.query)
    except RuntimeError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, str(e))

    result["account_used"] = {
        "id": account.id,
        "phone": account.phone,
        "display_name": account.display_name,
    }
    return result
