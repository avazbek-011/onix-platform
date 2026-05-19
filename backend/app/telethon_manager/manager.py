"""Telethon client manager - ko'p akkountni boshqaradi."""
from __future__ import annotations

import asyncio
import logging
from pathlib import Path

from telethon import TelegramClient
from telethon.errors import SessionPasswordNeededError
from telethon.sessions import SQLiteSession

from app.config import settings

log = logging.getLogger(__name__)


class PendingAuth:
    def __init__(self, client: TelegramClient, phone_code_hash: str):
        self.client = client
        self.phone_code_hash = phone_code_hash


class TelethonManager:
    """Bir nechta TelegramClient ni saqlaydi va boshqaradi."""

    def __init__(self) -> None:
        self._clients: dict[int, TelegramClient] = {}
        self._pending: dict[str, PendingAuth] = {}
        self._lock = asyncio.Lock()

    def _session_path(self, session_name: str) -> str:
        return str(settings.sessions_path / session_name)

    def _make_client(self, session_name: str) -> TelegramClient:
        if not settings.tg_api_id or not settings.tg_api_hash:
            raise RuntimeError("TG_API_ID va TG_API_HASH .env faylda sozlanmagan")
        return TelegramClient(
            self._session_path(session_name),
            settings.tg_api_id,
            settings.tg_api_hash,
            device_model="Onix Platform",
            system_version="Win10",
            app_version="1.0",
        )

    async def start_login(self, phone: str, session_name: str) -> dict:
        """SMS kod yuborish bosqichi."""
        client = self._make_client(session_name)
        await client.connect()

        if await client.is_user_authorized():
            await client.disconnect()
            return {"status": "already_authorized"}

        sent = await client.send_code_request(phone)
        self._pending[phone] = PendingAuth(client, sent.phone_code_hash)
        return {"status": "code_sent"}

    async def complete_login(self, phone: str, code: str, password: str | None = None) -> dict:
        """SMS kod (yoki 2FA parol) bilan login yakunlash."""
        pending = self._pending.get(phone)
        if not pending:
            raise RuntimeError("Avval start_login chaqirilishi kerak")

        client = pending.client
        try:
            await client.sign_in(phone=phone, code=code, phone_code_hash=pending.phone_code_hash)
        except SessionPasswordNeededError:
            if not password:
                return {"status": "password_required"}
            await client.sign_in(password=password)

        me = await client.get_me()
        self._pending.pop(phone, None)
        await client.disconnect()
        return {
            "status": "authorized",
            "tg_user_id": me.id,
            "username": me.username,
            "first_name": me.first_name,
        }

    async def get_client(self, account_id: int, session_name: str) -> TelegramClient:
        """Faol clientni qaytaradi (kerak bo'lsa ulaydi)."""
        async with self._lock:
            client = self._clients.get(account_id)
            if client and client.is_connected():
                return client

            client = self._make_client(session_name)
            await client.connect()
            if not await client.is_user_authorized():
                await client.disconnect()
                raise RuntimeError(f"Account {account_id} avtorizatsiyadan o'tmagan")
            self._clients[account_id] = client
            return client

    async def disconnect_account(self, account_id: int) -> None:
        async with self._lock:
            client = self._clients.pop(account_id, None)
            if client:
                await client.disconnect()

    async def shutdown(self) -> None:
        async with self._lock:
            for client in self._clients.values():
                try:
                    await client.disconnect()
                except Exception:
                    pass
            self._clients.clear()
            for pending in self._pending.values():
                try:
                    await pending.client.disconnect()
                except Exception:
                    pass
            self._pending.clear()


telethon_manager = TelethonManager()
