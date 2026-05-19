# Onix Platform — Deploy yo'riqnomasi

Domen: **https://guruh.codingtech.uz**

| Komponent | Port | Tavsif |
|-----------|------|--------|
| Backend (FastAPI) | **20150** | Ichki, faqat 127.0.0.1 |
| Frontend (Next.js) | **20151** | Ichki, faqat 127.0.0.1 |
| Nginx | 80/443 | Ommaviy, SSL bilan |

Portlar **20150-20200** oralig'idan tanlangan — boshqa servislarga to'qnashmaydi.

---

## 🚀 Tezkor o'rnatish (1 marta)

VPS server (Ubuntu 22.04+) da quyidagilarni bajaring:

### 1. DNS ni sozlash
Hosting/domen panelida `guruh.codingtech.uz` ni VPS IP manziliga yo'naltiring (A record).

### 2. Deploy skriptini ishga tushirish
```bash
# root yoki sudoer foydalanuvchi bilan
ssh user@server.ip

# Skriptni yuklab olish
curl -fsSL https://raw.githubusercontent.com/avazbek-011/onix-platform/main/deploy/deploy.sh -o deploy.sh
chmod +x deploy.sh
sudo ./deploy.sh
```

Skript avtomatik:
- Tizim paketlarini o'rnatadi (python, nodejs, nginx, certbot)
- `onix` foydalanuvchisini yaratadi
- Repoyni `/opt/onix-platform` ga klonlaydi
- Backend ga `venv` va paketlarni o'rnatadi
- Frontend ni `npm run build` qiladi
- systemd servislarini yoqadi (`onix-backend`, `onix-frontend`)
- Nginx ni sozlaydi

### 3. `.env` ni tahrirlash
```bash
sudo nano /opt/onix-platform/backend/.env
```

Quyidagilarni o'zgartiring:
```env
SECRET_KEY=uzun-tasodifiy-string-bu-yerga
ADMIN_PASSWORD=kuchli-parol
TG_API_ID=34206677
TG_API_HASH=e46c550f98e46809a6eae1d003918c91
CORS_ORIGINS=https://guruh.codingtech.uz
```

Saqlangach:
```bash
sudo systemctl restart onix-backend
```

### 4. SSL sertifikat (HTTPS)
```bash
sudo certbot --nginx -d guruh.codingtech.uz
```

Email manzilingizni kiriting, qoidalarga roziligingizni bildiring, **Redirect HTTP to HTTPS** ni tanlang.

### 5. Tayyor!
Brauzerda oching: **https://guruh.codingtech.uz**

Login: `admin` / `.env` da belgilangan parol.

---

## 🔄 Yangilash (har safar)

GitHub-ga yangi commit yuklaganingizdan keyin:

```bash
sudo /opt/onix-platform/deploy/deploy.sh
```

Bu git pull qiladi, paketlarni yangilaydi, frontend ni qayta build qiladi va servislarni restart qiladi.

---

## 🔧 Foydali buyruqlar

```bash
# Servis holati
sudo systemctl status onix-backend onix-frontend nginx

# Loglarni real-time ko'rish
sudo journalctl -u onix-backend -f
sudo journalctl -u onix-frontend -f

# Restart
sudo systemctl restart onix-backend
sudo systemctl restart onix-frontend
sudo systemctl reload nginx

# Nginx config tekshirish
sudo nginx -t

# SSL yangilash (avtomatik certbot timer ishlaydi, lekin qo'lda):
sudo certbot renew --dry-run
```

---

## 📁 Fayl tuzilishi (serverda)

```
/opt/onix-platform/
├── backend/
│   ├── venv/                  # Python paketlar
│   ├── .env                   # Sirlar (HEC KIMGA bermang!)
│   ├── onix.db                # SQLite DB
│   └── sessions/              # Telethon sessiyalari (xavfsiz saqlang!)
├── frontend/
│   ├── node_modules/
│   ├── .next/                 # Build natijasi
│   └── .env.local             # NEXT_PUBLIC_API_URL
└── deploy/
    ├── nginx.conf
    ├── onix-backend.service
    ├── onix-frontend.service
    └── deploy.sh
```

---

## ⚠️ Xavfsizlik

- `backend/.env` — TG_API_HASH va parollar. Faqat `onix` foydalanuvchisi o'qishi kerak:
  ```bash
  sudo chmod 600 /opt/onix-platform/backend/.env
  sudo chown onix:onix /opt/onix-platform/backend/.env
  ```
- `backend/sessions/` — Telethon sessiya fayllari = Telegram akkountga to'liq kirish. Backup oling, lekin maxfiy saqlang.
- Boshliq parolini birinchi loginingizda **albatta o'zgartiring**.
- Firewall (UFW):
  ```bash
  sudo ufw allow ssh
  sudo ufw allow 'Nginx Full'
  sudo ufw enable
  ```
  Portlar 20150-20200 ochilmasin — ular faqat ichki ishlash uchun.

---

## 🐛 Muammoni hal qilish

### Backend ishlamayapti
```bash
sudo journalctl -u onix-backend -n 50
```

### Frontend xato beradi
```bash
sudo journalctl -u onix-frontend -n 50
cd /opt/onix-platform/frontend && sudo -u onix npm run build
```

### 502 Bad Gateway
Servislar yiqilgan. Restart qiling:
```bash
sudo systemctl restart onix-backend onix-frontend
```

### CORS xatosi
`.env` da `CORS_ORIGINS=https://guruh.codingtech.uz` ekanini tekshiring.
