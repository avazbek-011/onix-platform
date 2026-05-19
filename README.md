# Onix Platform

Onix uy-joy marketing platformasi. Yashnabod tumanidagi Telegram guruhlarga userbot orqali qo'shilib, a'zolar ma'lumotlarini yig'adi va boshliqqa chiroyli dashboardda ko'rsatadi. Dashboard orqali guruhlarga post yoki a'zolarga shaxsiy reklama xabarlari yuborish mumkin.

## Tarkibi

- **backend/** — FastAPI + SQLAlchemy + Telethon
- **frontend/** — Next.js 14 + TailwindCSS dashboard
- **sessions/** — Telethon sessiya fayllari (avtomatik yaratiladi)

## Talablar

- Python 3.11+
- Node.js 20+
- Telegram API kalitlari (https://my.telegram.org dan oling — bepul)

## ⚠️ Muhim ogohlantirish

Telegram userbot va mass-DM Telegram qoidalariga zid bo'lishi mumkin. Akkountlarni asraydi:
- **Yangi akkountni** birdaniga 100 ta guruhga qo'shmang — kuniga 5-10 ta.
- DM yuborishlar orasiga **kamida 30 soniya** masofa qo'ying (allaqachon kodga qo'shilgan).
- Yangi raqamlarni iliq qiling — bir necha kun normal foydalaning.
- **Asosiy raqamingizni ishlatmang** — alohida SIM olganingiz ma'qul.

---

## Sozlash (Mahalliy)

### 1. Backend

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
notepad .env
```

`.env` faylida quyidagilarni to'ldiring:
- `TG_API_ID` va `TG_API_HASH` — https://my.telegram.org → API development tools
- `ADMIN_USERNAME` va `ADMIN_PASSWORD` — dashboardga kirish uchun
- `SECRET_KEY` — uzun tasodifiy string

Serverni ishga tushiring:
```powershell
python run.py
```

Backend `http://localhost:8000` da ishlaydi. Swagger docs: `http://localhost:8000/docs`

### 2. Frontend

Yangi PowerShell oynasida:
```powershell
cd frontend
npm install
Copy-Item .env.local.example .env.local
npm run dev
```

Brauzerda oching: **http://localhost:3000**

### 3. Birinchi qadamlar

1. **Login** — `.env` dagi `ADMIN_USERNAME` / `ADMIN_PASSWORD` bilan kiring.
2. **Akkountlar** sahifasiga o'ting → **Yangi akkount** → telefon raqam kiriting (`+998901234567`).
3. **Login** tugmasini bosing → Telegramga kelgan kodni kiriting (2FA bo'lsa, parolni ham).
4. Akkount **Faol** holatga o'tadi.
5. **Guruhlar** sahifasi → **Guruhga qo'shilish** → invite-link yoki @username yozing.
6. Yoki: agar siz qo'lda allaqachon guruhga qo'shilgan bo'lsangiz → **Sync** tugmasini bosing.
7. Har bir guruh uchun **Download (📥)** — a'zolar ro'yxatini DB ga yig'ish.
8. **Reklamalar** → **Yangi kampaniya** → matn, guruhlar, usulni tanlang va boshlang.

---

## Reklama usullari

- **Guruhga post** — userbot guruhga to'g'ridan-to'g'ri yozadi. Tezroq, lekin guruh adminlari ban qilishi mumkin va siz guruhdan chiqib ketishingiz mumkin.
- **A'zolarga DM** — har bir a'zoga shaxsan yozadi. Sekinroq (30s/xabar), lekin ko'rinish darajasi ancha yuqori. PrivacyRestricted bo'lganlar avtomatik o'tkazib yuboriladi.

---

## VPS ga ko'chirish (production)

1. Hetzner / DigitalOcean / Vultr — Ubuntu 22.04 server oling.
2. Python 3.11, Node 20, PostgreSQL o'rnating.
3. `.env` da `DATABASE_URL` ni PostgreSQL ga o'zgartiring.
4. Backend ni `systemd` orqali ishga tushiring (`uvicorn app.main:app --host 0.0.0.0 --port 8000`).
5. Frontend ni `npm run build && npm start` yoki Vercelda deploy qiling.
6. Nginx + Let's Encrypt SSL.
7. Telethon session fayllarini xavfsiz joyda saqlang (`sessions/` papka).

---

## Texnik tafsilotlar

### API endpointlar (qisqacha)

| Method | URL                                  | Tavsif                                |
|--------|--------------------------------------|---------------------------------------|
| POST   | `/api/auth/login`                    | Admin login → JWT token               |
| GET    | `/api/accounts/`                     | Akkountlar ro'yxati                   |
| POST   | `/api/accounts/`                     | Yangi akkount yaratish                |
| POST   | `/api/accounts/auth/start`           | SMS kod yuborish                      |
| POST   | `/api/accounts/auth/complete`        | Login yakunlash                       |
| GET    | `/api/groups/`                       | Guruhlar ro'yxati                     |
| POST   | `/api/groups/join`                   | Guruhga qo'shilish                    |
| POST   | `/api/groups/sync/{account_id}`      | Userbot dialoglarini sinxronlash      |
| POST   | `/api/groups/{id}/refresh`           | A'zolar sonini yangilash              |
| POST   | `/api/groups/collect-members`        | A'zolar ro'yxatini yig'ish (fonda)    |
| POST   | `/api/ads/campaigns`                 | Reklama kampaniyasini boshlash        |
| GET    | `/api/ads/logs`                      | Yuborish loglari                      |
| GET    | `/api/stats/dashboard`               | Bosh sahifa statistikasi              |

### Rate-limit sozlamalari

`.env` da:
- `JOIN_DELAY_SECONDS=60` — guruhga qo'shilishlar orasidagi pauza
- `DM_DELAY_SECONDS=30` — DM lar orasidagi pauza
- `GROUP_POST_DELAY_SECONDS=120` — guruh postlari orasidagi pauza

---

## Litsenziya

Ichki foydalanish uchun. Telegram ToS ni hurmat qiling.
