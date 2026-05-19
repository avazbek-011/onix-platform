# Onix Platform — Deploy yo'riqnomasi

> **⚠️ Xavfsizlik bayoni:** Bu deploy serverdagi **boshqa loyihalarga tegmaydi**:
> - Faqat `/opt/onix-platform/` ichida ishlaydi
> - Faqat `onix` foydalanuvchisi nomidan
> - nginx ni faqat **graceful reload** qiladi (boshqa saytlar uzilmaydi)
> - Faqat `onix-*` systemd servislari bilan ishlaydi
> - Portlar (20150, 20151) oldindan bo'shligini tekshiradi
> - `apt upgrade` qilmaydi (faqat yo'q paketlarni qo'shadi)

Domen: **https://guruh.codingtech.uz**

## Port taqsimoti

| Komponent | Port | Tavsif |
|-----------|------|--------|
| Backend (FastAPI) | **20150** | 127.0.0.1 — faqat ichki |
| Frontend (Next.js) | **20151** | 127.0.0.1 — faqat ichki |
| Nginx (mavjud) | 80/443 | Domen orqali proxy |

Portlar **20150-20200** oralig'idan tanlangan — boshqa loyihalarga to'qnashmaydi.

---

## 🛡️ Avtomatik deploy (xavfsiz skript bilan)

VPS server (Ubuntu 22.04+) da:

### 1. DNS ni sozlash
Hosting/domen panelida `guruh.codingtech.uz` ni VPS IP manziliga yo'naltiring (A record).

### 2. Skriptni ishga tushirish
```bash
ssh user@server.ip

# Skriptni yuklab olish va ishga tushirish
curl -fsSL https://raw.githubusercontent.com/avazbek-011/onix-platform/main/deploy/deploy.sh -o /tmp/onix-deploy.sh
chmod +x /tmp/onix-deploy.sh
sudo /tmp/onix-deploy.sh
```

Skript avtomatik tekshiradi va xavfsiz bajaradi:
- ✅ Portlar bo'shligi (20150, 20151) — band bo'lsa to'xtaydi
- ✅ Domen boshqa nginx konfigda ishlatilmaganligi — bor bo'lsa to'xtaydi
- ✅ Faqat YO'Q paketlarni o'rnatadi
- ✅ Faqat `onix` foydalanuvchi bilan ishlaydi
- ✅ nginx graceful reload (boshqa saytlar uzilmaydi)

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

Saqlangach restart:
```bash
sudo systemctl restart onix-backend
```

### 4. SSL sertifikat
```bash
sudo certbot --nginx -d guruh.codingtech.uz
```

Certbot mavjud nginx konfigingizning faqat **guruh.codingtech.uz** bloklariga SSL qo'shadi — boshqa saytlarga tegmaydi.

### 5. Tayyor!
**https://guruh.codingtech.uz** — login: `admin` / `.env` da belgilangan parol.

---

## 📝 Qo'lda deploy (skriptsiz)

Agar skriptga ishonmasangiz, qadamlarni qo'lda bajaring:

### 1. Foydalanuvchi va paketlar
```bash
sudo useradd -m -s /bin/bash onix
sudo apt install -y python3-venv python3-pip nodejs npm nginx git
```

### 2. Repo
```bash
sudo mkdir -p /opt/onix-platform
sudo chown onix:onix /opt/onix-platform
sudo -u onix git clone https://github.com/avazbek-011/onix-platform.git /opt/onix-platform
```

### 3. Backend
```bash
cd /opt/onix-platform/backend
sudo -u onix python3 -m venv venv
sudo -u onix ./venv/bin/pip install -r requirements.txt
sudo -u onix ./venv/bin/pip install "bcrypt==4.0.1"
sudo -u onix cp .env.example .env
sudo nano .env  # TG keylar, parol kiriting
sudo chmod 600 .env
```

### 4. Frontend
```bash
cd /opt/onix-platform/frontend
echo 'NEXT_PUBLIC_API_URL=https://guruh.codingtech.uz' | sudo -u onix tee .env.local
sudo -u onix npm ci
sudo -u onix npm run build
```

### 5. systemd
```bash
sudo cp /opt/onix-platform/deploy/onix-backend.service  /etc/systemd/system/
sudo cp /opt/onix-platform/deploy/onix-frontend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now onix-backend onix-frontend
```

### 6. nginx (mavjud nginx-ga zarar bermay)
```bash
# Avval domen boshqa konfigda yo'qligini tekshirish
grep -rl "server_name guruh.codingtech.uz" /etc/nginx/sites-enabled/

# Bo'sh bo'lsa - davom etamiz
sudo cp /opt/onix-platform/deploy/nginx.conf /etc/nginx/sites-available/guruh.codingtech.uz.conf
sudo ln -sf /etc/nginx/sites-available/guruh.codingtech.uz.conf /etc/nginx/sites-enabled/

# Konfigni sinash (xato bo'lsa, hech narsa o'zgarmaydi)
sudo nginx -t

# Graceful reload - boshqa saytlar uzilmaydi
sudo nginx -s reload
```

### 7. SSL
```bash
sudo certbot --nginx -d guruh.codingtech.uz
```

---

## 🔄 Yangilash (har safar)

GitHub-ga yangi commit yuklaganingizdan keyin:

```bash
sudo /opt/onix-platform/deploy/deploy.sh
```

Yoki qo'lda:
```bash
sudo -u onix git -C /opt/onix-platform pull
sudo -u onix /opt/onix-platform/backend/venv/bin/pip install -r /opt/onix-platform/backend/requirements.txt
cd /opt/onix-platform/frontend && sudo -u onix npm install && sudo -u onix npm run build
sudo systemctl restart onix-backend onix-frontend
```

---

## 🛠 Foydali buyruqlar

```bash
# Faqat onix servislari holati
sudo systemctl status onix-backend onix-frontend

# Faqat onix log
sudo journalctl -u onix-backend -f
sudo journalctl -u onix-frontend -f

# Faqat onix restart
sudo systemctl restart onix-backend
sudo systemctl restart onix-frontend

# nginx (FAQAT bizning saytni emas, hammasini sinab ko'radi):
sudo nginx -t
sudo nginx -s reload   # graceful, boshqa saytlar uzilmaydi

# Bizning saytni o'chirish (boshqalariga tegmaydi):
sudo rm /etc/nginx/sites-enabled/guruh.codingtech.uz.conf
sudo nginx -s reload
sudo systemctl stop onix-backend onix-frontend
```

---

## 🚨 Boshqa loyihalarga zarar yetmasligi uchun

Quyidagilarni **HECH QACHON** qilmang:

❌ `sudo systemctl restart nginx` — barcha saytlar uziladi  
✅ `sudo nginx -s reload` — faqat konfigni qayta o'qiydi  

❌ `sudo apt upgrade` — boshqa loyihalar buzilishi mumkin  
✅ `sudo apt install <kerakli-paket>` — faqat yo'qni o'rnatadi  

❌ `sudo rm /etc/nginx/sites-enabled/*` — barcha saytlar o'chadi  
✅ `sudo rm /etc/nginx/sites-enabled/guruh.codingtech.uz.conf` — faqat shu  

❌ Default `/etc/nginx/sites-available/default` ga tegmang  
✅ Alohida `.conf` fayl bilan ishlang  

---

## 📁 Fayl tuzilishi (serverda)

```
/opt/onix-platform/           ← Faqat shu yerda joylashadi
├── backend/
│   ├── venv/                 ← Izolyatsiyalangan Python paketlar
│   ├── .env                  ← chmod 600, onix:onix
│   ├── onix.db
│   └── sessions/             ← Telethon sessiyalari
├── frontend/
│   ├── node_modules/         ← Lokal, global emas
│   ├── .next/
│   └── .env.local
└── deploy/

/etc/systemd/system/
├── onix-backend.service       ← Yagona "onix-" prefiks
└── onix-frontend.service

/etc/nginx/sites-available/
└── guruh.codingtech.uz.conf   ← Yagona fayl, mavjudlar tegilmaydi
```

---

## ⚠️ Xavfsizlik tavsiyalari

- `backend/.env`:
  ```bash
  sudo chmod 600 /opt/onix-platform/backend/.env
  sudo chown onix:onix /opt/onix-platform/backend/.env
  ```
- Boshliq parolini birinchi kirgan zahoti o'zgartiring.
- Firewall (UFW):
  ```bash
  sudo ufw allow ssh
  sudo ufw allow 'Nginx Full'
  sudo ufw enable
  # 20150-20200 ochilmasin — faqat 127.0.0.1 da ishlaydi
  ```
- Backup:
  ```bash
  sudo tar czf onix-backup-$(date +%F).tar.gz /opt/onix-platform/backend/onix.db /opt/onix-platform/backend/sessions/
  ```
