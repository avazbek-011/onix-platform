from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field


# ============ AUTH ============

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class LoginRequest(BaseModel):
    username: str
    password: str


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=64)
    password: str = Field(min_length=4, max_length=128)
    full_name: str | None = None
    role: Literal["admin", "manager"] = "manager"


class UserUpdate(BaseModel):
    full_name: str | None = None
    password: str | None = None
    is_active: bool | None = None
    role: Literal["admin", "manager"] | None = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    username: str
    full_name: str | None
    role: str
    is_active: bool
    created_at: datetime


# ============ ACCOUNTS ============

class AccountCreate(BaseModel):
    phone: str
    display_name: str | None = None
    notes: str | None = None


class AccountOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    phone: str
    session_name: str
    display_name: str | None
    notes: str | None
    is_authorized: bool
    is_active: bool
    created_at: datetime


class AccountAuthStart(BaseModel):
    phone: str


class AccountAuthCode(BaseModel):
    phone: str
    code: str
    password: str | None = None


# ============ LOOKUP ============

class LookupRequest(BaseModel):
    query: str
    account_id: int | None = None


# ============ GROUPS ============

class GroupSaveRequest(BaseModel):
    query: str
    account_id: int | None = None


class GroupOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    tg_id: int
    title: str
    username: str | None
    invite_link: str | None
    about: str | None
    members_count: int
    online_count: int
    is_megagroup: bool
    is_broadcast: bool
    auto_district: str | None
    auto_address_hints: str | None
    auto_lat: float | None
    auto_lng: float | None
    manual_address: str | None
    manual_lat: float | None
    manual_lng: float | None
    notes: str | None
    last_sync_at: datetime | None
    saved_at: datetime


class GroupLocationUpdate(BaseModel):
    manual_address: str | None = None
    manual_lat: float | None = None
    manual_lng: float | None = None
    notes: str | None = None


class GeocodeQuery(BaseModel):
    query: str


# ============ ADMIN ============

class AdminUserSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    username: str
    full_name: str | None
    role: str
    is_active: bool
    created_at: datetime
    accounts_count: int
    groups_count: int
    groups_with_location: int


TokenResponse.model_rebuild()
