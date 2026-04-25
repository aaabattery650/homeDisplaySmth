#!/usr/bin/env bash
# setup.sh — One-shot deploy script for homeDisplay on Raspberry Pi OS (64-bit Desktop).
# Run from the repo root:  bash deploy/setup.sh
#
# What it does:
#   1. Installs Node.js 22 LTS + git
#   2. Installs npm dependencies and builds the frontend
#   3. Copies .env.example → .env if no .env exists
#   4. Installs the systemd service (auto-start on boot)
#   5. Sets up Chromium kiosk autostart + screen-blanking prevention
#   6. Configures desktop auto-login
#
# Safe to re-run — each step is idempotent.

set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DEPLOY_DIR="$REPO_DIR/deploy"
SERVICE_NAME="homedisplay"

info()  { echo -e "\033[1;34m==>\033[0m $*"; }
ok()    { echo -e "\033[1;32m  ✓\033[0m $*"; }
warn()  { echo -e "\033[1;33m  !\033[0m $*"; }

# ── 0. Preflight ────────────────────────────────────────────────────────────
if [[ ! -f "$REPO_DIR/package.json" ]]; then
  echo "Error: Run this script from the repo root (bash deploy/setup.sh)" >&2
  exit 1
fi

# ── 1. System packages ─────────────────────────────────────────────────────
info "Updating system packages"
sudo apt update -y && sudo apt upgrade -y
ok "System up to date"

if ! command -v node &>/dev/null || ! node -v | grep -q "^v22"; then
  info "Installing Node.js 22 LTS"
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt install -y nodejs
fi
ok "Node $(node -v)"

if ! command -v git &>/dev/null; then
  sudo apt install -y git
fi
ok "git installed"

# ── 2. App dependencies & build ────────────────────────────────────────────
info "Installing npm dependencies"
cd "$REPO_DIR"
npm run install:all
ok "Dependencies installed"

info "Building frontend"
npm run build
ok "Client and admin built"

# ── 3. Environment file ────────────────────────────────────────────────────
if [[ ! -f "$REPO_DIR/server/.env" ]]; then
  info "Creating server/.env from .env.example"
  cp "$REPO_DIR/server/.env.example" "$REPO_DIR/server/.env"
  warn "Edit server/.env to set your coordinates and flight source"
else
  ok "server/.env already exists — skipping"
fi

# ── 4. Systemd service ─────────────────────────────────────────────────────
info "Installing systemd service"

# Patch WorkingDirectory and User to match this install
CURRENT_USER="$(whoami)"
SERVICE_TMP="$(mktemp)"
sed \
  -e "s|User=pi|User=$CURRENT_USER|" \
  -e "s|WorkingDirectory=/home/pi/homeDisplay|WorkingDirectory=$REPO_DIR|" \
  "$DEPLOY_DIR/homedisplay.service" > "$SERVICE_TMP"

sudo cp "$SERVICE_TMP" /etc/systemd/system/${SERVICE_NAME}.service
rm "$SERVICE_TMP"
sudo systemctl daemon-reload
sudo systemctl enable "$SERVICE_NAME"
sudo systemctl restart "$SERVICE_NAME"
ok "Service enabled and started"

# ── 5. Kiosk autostart ─────────────────────────────────────────────────────
info "Configuring kiosk autostart"
chmod +x "$DEPLOY_DIR/kiosk.sh"

mkdir -p "$HOME/.config/autostart"

# Patch Exec path in desktop entry to match this install
DESKTOP_TMP="$(mktemp)"
sed "s|Exec=/home/pi/homeDisplay/deploy/kiosk.sh|Exec=$DEPLOY_DIR/kiosk.sh|" \
  "$DEPLOY_DIR/homedisplay-kiosk.desktop" > "$DESKTOP_TMP"
cp "$DESKTOP_TMP" "$HOME/.config/autostart/homedisplay-kiosk.desktop"
rm "$DESKTOP_TMP"
ok "Kiosk desktop entry installed"

# ── 6. Screen-blanking prevention ──────────────────────────────────────────
info "Disabling screen blanking"

# X11 / LXDE
LXDE_DIR="/etc/xdg/lxsession/LXDE-pi"
if [[ -d "$LXDE_DIR" ]]; then
  sudo cp "$DEPLOY_DIR/no-blank.conf" "$LXDE_DIR/"
  ok "LXDE no-blank config installed"
fi

# Wayland / labwc (Bookworm default)
WAYFIRE_CONF="$HOME/.config/wayfire.ini"
if [[ -f "$WAYFIRE_CONF" ]]; then
  if ! grep -q "\[idle\]" "$WAYFIRE_CONF"; then
    cat >> "$WAYFIRE_CONF" <<'EOF'

[idle]
dpms_timeout=0
screensaver_timeout=0
EOF
    ok "Wayland idle timeouts disabled"
  else
    ok "Wayland idle section already present"
  fi
fi

# ── 7. Desktop auto-login ──────────────────────────────────────────────────
info "Enabling desktop auto-login"
sudo raspi-config nonint do_boot_behaviour B4 2>/dev/null || warn "raspi-config auto-login failed — set manually via sudo raspi-config"
ok "Auto-login configured"

# ── Done ────────────────────────────────────────────────────────────────────
echo ""
info "Setup complete! Reboot to start the kiosk:"
echo "    sudo reboot"
echo ""
echo "  Dashboard:  http://$(hostname -I | awk '{print $1}'):8787"
echo "  Admin:      http://$(hostname -I | awk '{print $1}'):8787/admin/"
echo "  Logs:       journalctl -u $SERVICE_NAME -f"
