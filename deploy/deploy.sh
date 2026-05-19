#!/bin/bash
# ============================================================
# Onix Platform - xavfsiz deploy skripti
# ============================================================
# Bu skript SERVERdagi boshqa loyihalarga TEGMAYDI:
#   - nginx ni "reload" qiladi (restart EMAS) - boshqa saytlar uzilmaydi
#   - apt upgrade qilmaydi (faqat yo'q paketlarni o'rnatadi)
#   - faqat /opt/onix-platform/ ichida ishlaydi
#   - faqat 'onix' foydalanuvchisi nomidan
#   - portlar 20150/20151 - oldin band emasligi tekshiriladi
# ============================================================
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/avazbek-011/onix-platform.git}"
APP_DIR="/opt/onix-platform"
APP_USER="onix"
DOMAIN="guruh.codingtech.uz"
BACKEND_PORT=20150
FRONTEND_PORT=20151

red()    { echo -e "\033[31m$1\033[0m"; }
green()  { echo -e "\033[32m$1\033[0m"; }
yellow() { echo -e "\033[33m$1\033[0m"; }
blue()   { echo -e "\033[34m$1\033[0m"; }

require_root() {
    if [ "$(id -u)" -ne 0 ]; then
        red "Bu skriptni 'sudo' bilan ishga tushiring"
        exit 1
    fi
}

check_port_free() {
    local port=$1
    local name=$2
    # Allow port to be busy if it's already used by our own systemd unit
    if ss -tlnp 2>/dev/null | grep -q ":${port} "; then
        if systemctl is-active --quiet "onix-${name}" 2>/dev/null; then
            blue "Port ${port} band, lekin onix-${name} ishlamoqda - OK"
        else
            red "Port ${port} band! Boshqa loyiha ishlamoqda. To'xtating yoki konfiguratsiyani o'zgartiring."
            ss -tlnp | grep ":${port} " || true
            exit 1
        fi
    fi
}

require_root

blue "==> Onix Platform deploy (xavfsiz rejim)"

# ============================================================
# 1. Port konflikti tekshirish
# ============================================================
blue "==> Port konflikti tekshirilmoqda"
check_port_free $BACKEND_PORT "backend"
check_port_free $FRONTEND_PORT "frontend"
green "    Portlar bo'sh"

# ============================================================
# 2. Faqat YO'Q paketlarni o'rnatish (apt upgrade qilmaymiz!)
# ============================================================
blue "==> Kerakli paketlar tekshirilmoqda"
NEEDED=()
command -v python3       >/dev/null || NEEDED+=("python3")
command -v pip3          >/dev/null || NEEDED+=("python3-pip")
python3 -m venv --help   >/dev/null 2>&1 || NEEDED+=("python3-venv")
command -v node          >/dev/null || NEEDED+=("nodejs")
command -v npm           >/dev/null || NEEDED+=("npm")
command -v nginx         >/dev/null || NEEDED+=("nginx")
command -v git           >/dev/null || NEEDED+=("git")
command -v certbot       >/dev/null || NEEDED+=("certbot" "python3-certbot-nginx")

if [ ${#NEEDED[@]} -gt 0 ]; then
    yellow "    O'rnatish kerak: ${NEEDED[*]}"
    apt-get update -qq
    DEBIAN_FRONTEND=noninteractive apt-get install -y "${NEEDED[@]}"
else
    green "    Hammasi mavjud"
fi

# ============================================================
# 3. Foydalanuvchi va papka
# ============================================================
if ! id -u "$APP_USER" >/dev/null 2>&1; then
    blue "==> '$APP_USER' foydalanuvchisi yaratilmoqda"
    useradd -m -s /bin/bash "$APP_USER"
fi

# ============================================================
# 4. Repo
# ============================================================
if [ ! -d "$APP_DIR/.git" ]; then
    blue "==> Repo klonlanmoqda: $REPO_URL"
    mkdir -p "$APP_DIR"
    chown "$APP_USER:$APP_USER" "$APP_DIR"
    sudo -u "$APP_USER" git clone "$REPO_URL" "$APP_DIR"
else
    blue "==> Repo yangilanmoqda"
    sudo -u "$APP_USER" git -C "$APP_DIR" pull --rebase
fi

# ============================================================
# 5. Backend (venv izolyatsiyalangan)
# ============================================================
blue "==> Backend sozlanmoqda"
cd "$APP_DIR/backend"

if [ ! -d venv ]; then
    sudo -u "$APP_USER" python3 -m venv venv
fi
sudo -u "$APP_USER" ./venv/bin/pip install --upgrade pip --quiet
sudo -u "$APP_USER" ./venv/bin/pip install -q -r requirements.txt
sudo -u "$APP_USER" ./venv/bin/pip install -q "bcrypt==4.0.1"

if [ ! -f .env ]; then
    sudo -u "$APP_USER" cp .env.example .env
    chmod 600 .env
    chown "$APP_USER:$APP_USER" .env
    yellow "    /opt/onix-platform/backend/.env ni tahrirlang (TG_API_ID, TG_API_HASH, ADMIN_PASSWORD)"
fi

# ============================================================
# 6. Frontend (lokal node_modules)
# ============================================================
blue "==> Frontend o'rnatilmoqda"
cd "$APP_DIR/frontend"

if [ ! -f .env.local ]; then
    sudo -u "$APP_USER" bash -c "echo 'NEXT_PUBLIC_API_URL=https://${DOMAIN}' > .env.local"
fi

sudo -u "$APP_USER" npm ci --silent 2>/dev/null || sudo -u "$APP_USER" npm install --silent
sudo -u "$APP_USER" npm run build

# ============================================================
# 7. systemd servislar (faqat onix-* nomli)
# ============================================================
blue "==> systemd servislari o'rnatilmoqda"
cp "$APP_DIR/deploy/onix-backend.service"  /etc/systemd/system/
cp "$APP_DIR/deploy/onix-frontend.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable onix-backend onix-frontend >/dev/null
systemctl restart onix-backend
sleep 2
systemctl restart onix-frontend

# ============================================================
# 8. nginx - faqat YANGI server bloki, mavjudlarga tegmaymiz
# ============================================================
NGINX_CONF="/etc/nginx/sites-available/${DOMAIN}.conf"
NGINX_LINK="/etc/nginx/sites-enabled/${DOMAIN}.conf"

# Mavjud konfiglar bilan to'qnashish tekshiruvi
EXISTING=$(grep -rl "server_name ${DOMAIN}" /etc/nginx/sites-enabled/ 2>/dev/null | grep -v "${DOMAIN}.conf" || true)
if [ -n "$EXISTING" ]; then
    red "DIQQAT: '${DOMAIN}' allaqachon boshqa nginx faylida ishlatilmoqda:"
    echo "$EXISTING"
    yellow "Ushbu fayllarni qo'lda tekshiring. Skript to'xtatildi."
    exit 1
fi

blue "==> nginx server bloki o'rnatilmoqda ($NGINX_CONF)"
cp "$APP_DIR/deploy/nginx.conf" "$NGINX_CONF"
ln -sf "$NGINX_CONF" "$NGINX_LINK"

# Konfiguratsiyani sinash - xato bo'lsa hech narsa o'zgartirilmaydi
if nginx -t 2>&1; then
    nginx -s reload
    green "    nginx graceful reload - boshqa saytlar uzilmadi"
else
    red "nginx konfiguratsiyada xato! Faylni qo'lda tekshiring: $NGINX_CONF"
    rm -f "$NGINX_LINK"
    exit 1
fi

# ============================================================
# 9. SSL (agar hali yo'q bo'lsa)
# ============================================================
if [ ! -d "/etc/letsencrypt/live/${DOMAIN}" ]; then
    yellow ""
    yellow "==> SSL sertifikat olish uchun:"
    yellow "    sudo certbot --nginx -d ${DOMAIN}"
    yellow ""
fi

# ============================================================
# Holatni ko'rsatish
# ============================================================
echo ""
green "============================================================"
green "✅ Deploy yakunlandi (boshqa loyihalarga zarar yetmadi)"
green "============================================================"
echo ""
echo "Sayt:     https://${DOMAIN}"
echo "Backend:  127.0.0.1:${BACKEND_PORT}"
echo "Frontend: 127.0.0.1:${FRONTEND_PORT}"
echo ""
echo "Holatni ko'rish:"
echo "  systemctl status onix-backend onix-frontend"
echo "  journalctl -u onix-backend -f"
echo ""
echo "Nginx (boshqa saytlarni o'chirmaydi):"
echo "  nginx -t && nginx -s reload"
