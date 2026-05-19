#!/bin/bash
# Onix Platform - VPS deploy / yangilash skripti
# Ubuntu 22.04+ uchun
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/avazbek-011/onix-platform.git}"
APP_DIR="/opt/onix-platform"
APP_USER="onix"

echo "==> Onix Platform deploy boshlandi"

# 0. Foydalanuvchi yaratish (faqat birinchi marta)
if ! id -u "$APP_USER" >/dev/null 2>&1; then
    echo "==> '$APP_USER' foydalanuvchisi yaratilmoqda"
    sudo useradd -m -s /bin/bash "$APP_USER"
fi

# 1. Tizim paketlari (faqat birinchi marta)
if ! command -v nginx >/dev/null; then
    echo "==> Tizim paketlari o'rnatilmoqda"
    sudo apt update
    sudo apt install -y python3 python3-venv python3-pip nodejs npm nginx git certbot python3-certbot-nginx
fi

# 2. Repo
if [ ! -d "$APP_DIR/.git" ]; then
    echo "==> Repo klonlanmoqda"
    sudo mkdir -p "$APP_DIR"
    sudo chown "$APP_USER:$APP_USER" "$APP_DIR"
    sudo -u "$APP_USER" git clone "$REPO_URL" "$APP_DIR"
else
    echo "==> Repo yangilanmoqda"
    sudo -u "$APP_USER" git -C "$APP_DIR" pull --rebase
fi

# 3. Backend
echo "==> Backend sozlanmoqda"
cd "$APP_DIR/backend"
sudo -u "$APP_USER" python3 -m venv venv
sudo -u "$APP_USER" ./venv/bin/pip install --upgrade pip
sudo -u "$APP_USER" ./venv/bin/pip install -r requirements.txt
sudo -u "$APP_USER" ./venv/bin/pip install "bcrypt==4.0.1"

if [ ! -f .env ]; then
    sudo -u "$APP_USER" cp .env.example .env
    echo "⚠️  /opt/onix-platform/backend/.env ni tahrirlang (TG_API_ID, TG_API_HASH, ADMIN_PASSWORD)"
fi

# 4. Frontend
echo "==> Frontend o'rnatilmoqda"
cd "$APP_DIR/frontend"
if [ ! -f .env.local ]; then
    sudo -u "$APP_USER" bash -c "echo 'NEXT_PUBLIC_API_URL=https://guruh.codingtech.uz' > .env.local"
fi
sudo -u "$APP_USER" npm ci || sudo -u "$APP_USER" npm install
sudo -u "$APP_USER" npm run build

# 5. systemd servislar
echo "==> systemd servislar o'rnatilmoqda"
sudo cp "$APP_DIR/deploy/onix-backend.service" /etc/systemd/system/
sudo cp "$APP_DIR/deploy/onix-frontend.service" /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable onix-backend onix-frontend
sudo systemctl restart onix-backend onix-frontend

# 6. nginx
if [ ! -f /etc/nginx/sites-enabled/guruh.codingtech.uz ]; then
    echo "==> nginx sozlanmoqda"
    sudo cp "$APP_DIR/deploy/nginx.conf" /etc/nginx/sites-available/guruh.codingtech.uz
    sudo ln -sf /etc/nginx/sites-available/guruh.codingtech.uz /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl reload nginx
    echo "⚠️  SSL uchun: sudo certbot --nginx -d guruh.codingtech.uz"
fi

echo ""
echo "✅ Deploy yakunlandi!"
echo ""
echo "Holatni tekshirish:"
echo "  sudo systemctl status onix-backend onix-frontend"
echo "  sudo journalctl -u onix-backend -f"
echo ""
echo "Sayt: https://guruh.codingtech.uz"
