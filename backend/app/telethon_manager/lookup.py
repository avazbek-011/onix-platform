"""Guruh ID/havolasi bo'yicha ma'lumot va lokatsiya qidirish."""
from __future__ import annotations

import logging
import re
from typing import Any

import httpx
from telethon import TelegramClient
from telethon.errors import ChannelPrivateError, FloodWaitError, UsernameInvalidError, UsernameNotOccupiedError
from telethon.tl.functions.channels import GetFullChannelRequest
from telethon.tl.functions.messages import CheckChatInviteRequest, GetFullChatRequest
from telethon.tl.types import Channel, Chat, ChatInvite, ChatInviteAlready

log = logging.getLogger(__name__)

UZ_DISTRICTS = [
    "Yashnabod", "Yashnobod", "Yunusobod", "Yunusabad", "Yunusabod",
    "Mirzo Ulug'bek", "Mirzo-Ulug'bek", "Olmazor", "Chilonzor", "Chilanzar",
    "Sergeli", "Yakkasaroy", "Yakkasaroy", "Mirobod", "Mirabad",
    "Shayxontohur", "Bektemir", "Uchtepa", "Yangihayot",
]

ADDRESS_PATTERNS = [
    re.compile(r"([A-Za-z'']+(?:\s+[A-Za-z'']+)*)\s+(\d{1,3})[-\s]?(?:uy|dom|kvartal|mavze|mfy|mahalla|ko'cha|kocha|tor)", re.IGNORECASE),
    re.compile(r"(\d{1,3})[-\s]?(?:uy|dom|kvartal|mavze)\b", re.IGNORECASE),
    re.compile(r"(?:ko'cha|kocha|street|ko'chasi)\s+(\d{1,3})", re.IGNORECASE),
]

TASHKENT_BBOX = "69.0,41.15,69.55,41.45"


def _extract_district(text: str) -> str | None:
    if not text:
        return None
    low = text.lower()
    for d in UZ_DISTRICTS:
        if d.lower() in low:
            return d
    return None


def _extract_address_hints(text: str) -> list[str]:
    if not text:
        return []
    hints: list[str] = []
    for pat in ADDRESS_PATTERNS:
        for m in pat.finditer(text):
            hints.append(m.group(0))
    return list(dict.fromkeys(hints))


def _parse_link(link_or_id: str) -> tuple[str, str]:
    s = link_or_id.strip()
    if s.startswith("https://t.me/+") or s.startswith("t.me/+"):
        return s.split("+", 1)[1].split("?", 1)[0], "invite"
    if "joinchat/" in s:
        return s.split("joinchat/", 1)[1].split("?", 1)[0], "invite"
    if s.startswith("@"):
        return s[1:], "username"
    if s.startswith("https://t.me/") or s.startswith("t.me/"):
        return s.split("t.me/", 1)[1].split("?", 1)[0].strip("/"), "username"
    if s.lstrip("-").isdigit():
        return s, "id"
    return s, "username"


async def geocode(query: str) -> dict | None:
    """OpenStreetMap Nominatim orqali manzilni topish."""
    if not query.strip():
        return None
    try:
        async with httpx.AsyncClient(timeout=10) as cli:
            r = await cli.get(
                "https://nominatim.openstreetmap.org/search",
                params={
                    "q": f"{query}, Tashkent, Uzbekistan",
                    "format": "json",
                    "limit": 1,
                    "viewbox": TASHKENT_BBOX,
                    "bounded": 1,
                    "addressdetails": 1,
                },
                headers={"User-Agent": "OnixPlatform/1.0 (real-estate lookup)"},
            )
            data = r.json()
            if not data:
                return None
            best = data[0]
            return {
                "display_name": best.get("display_name"),
                "lat": float(best["lat"]),
                "lng": float(best["lon"]),
                "type": best.get("type"),
            }
    except Exception as e:
        log.warning("Geocoding failed for %r: %s", query, e)
        return None


async def lookup_group(client: TelegramClient, link_or_id: str) -> dict[str, Any]:
    """Guruh ID / havola / username bo'yicha to'liq ma'lumot."""
    target, kind = _parse_link(link_or_id)

    entity = None
    invite_only = False
    invite_info: dict | None = None

    try:
        if kind == "invite":
            check = await client(CheckChatInviteRequest(target))
            if isinstance(check, ChatInviteAlready):
                entity = check.chat
            elif isinstance(check, ChatInvite):
                invite_only = True
                invite_info = {
                    "title": check.title,
                    "participants_count": getattr(check, "participants_count", 0),
                    "is_channel": bool(check.channel),
                    "is_megagroup": bool(check.megagroup),
                    "is_broadcast": bool(check.broadcast),
                    "photo_present": bool(check.photo),
                }
        elif kind == "id":
            tg_id = int(target)
            entity = await client.get_entity(tg_id)
        else:
            entity = await client.get_entity(target)
    except (UsernameInvalidError, UsernameNotOccupiedError):
        raise RuntimeError("Bunday username/havola topilmadi")
    except ChannelPrivateError:
        raise RuntimeError("Guruh yopiq — siz uning a'zosi bo'lishingiz yoki invite-link kiritishingiz kerak")
    except FloodWaitError as e:
        raise RuntimeError(f"Telegram cheklov qo'ydi: {e.seconds} soniya kuting")
    except ValueError as e:
        raise RuntimeError(f"ID/havola formati noto'g'ri: {e}")
    except Exception as e:
        raise RuntimeError(f"Xato: {e}")

    if invite_only and invite_info:
        district = _extract_district(invite_info["title"])
        hints = _extract_address_hints(invite_info["title"])
        location = None
        if district or hints:
            q = " ".join([district or "", *hints]).strip()
            location = await geocode(q) if q else None
        return {
            "kind": "invite_preview",
            "title": invite_info["title"],
            "members_count": invite_info["participants_count"],
            "is_megagroup": invite_info["is_megagroup"],
            "is_broadcast": invite_info["is_broadcast"],
            "username": None,
            "tg_id": None,
            "about": None,
            "district": district,
            "address_hints": hints,
            "location": location,
            "join_required": True,
            "invite_hash": target,
        }

    if entity is None:
        raise RuntimeError("Guruh ma'lumotini olib bo'lmadi")

    about = None
    members_count = 0
    online_count = 0
    photo_present = bool(getattr(entity, "photo", None))

    try:
        if isinstance(entity, Channel):
            full = await client(GetFullChannelRequest(entity))
            about = full.full_chat.about
            members_count = full.full_chat.participants_count or 0
            online_count = full.full_chat.online_count or 0
        elif isinstance(entity, Chat):
            full = await client(GetFullChatRequest(entity.id))
            about = getattr(full.full_chat, "about", None)
            members_count = entity.participants_count or 0
    except Exception as e:
        log.warning("Full info olishda xato: %s", e)

    title = getattr(entity, "title", "") or ""
    text_for_parsing = f"{title}\n{about or ''}"
    district = _extract_district(text_for_parsing)
    hints = _extract_address_hints(text_for_parsing)

    location = None
    geocode_query_parts: list[str] = []
    if district:
        geocode_query_parts.append(district)
    geocode_query_parts.extend(hints[:2])
    if geocode_query_parts:
        location = await geocode(" ".join(geocode_query_parts))

    if not location and district:
        location = await geocode(district)

    return {
        "kind": "group",
        "tg_id": entity.id,
        "title": title,
        "username": getattr(entity, "username", None),
        "members_count": members_count,
        "online_count": online_count,
        "is_megagroup": bool(getattr(entity, "megagroup", False)),
        "is_broadcast": bool(getattr(entity, "broadcast", False)),
        "photo_present": photo_present,
        "about": about,
        "district": district,
        "address_hints": hints,
        "location": location,
        "join_required": False,
    }
