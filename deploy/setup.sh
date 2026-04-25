#!/usr/bin/env bash
# setup.sh — One-shot deploy script for homeDisplay on Raspberry Pi OS (64-bit Desktop).
# Run from the repo root:  bash deploy/setup.sh
#
# What it does:
#   1. Installs Node.js 22 LTS + git (skips if already present)
#   2. Installs npm dependencies and builds the frontend
#   3. Copies .env.example → .env if no .env exists
#   4. Installs the systemd service (auto-start on boot)
#   5. Sets up Chromium kiosk autostart + screen-blanking prevention
#   6. Configures desktop auto-login
#
# Safe to re-run — each step checks current state before acting.

set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DEPLOY_DIR="$REPO_DIR/deploy"
SERVICE_NAME="homedisplay"
CURRENT_USER="$(whoami)"

info()  { echo -e "\033[1;34m==>\033[0m $*"; }
ok()    { echo -e "\033[1;32m  ✓\033[0m $*"; }
warn()  { echo -e "\033[1;33m  !\033[0m $*"; }
skip()  { echo -e "\033[0;37m  –\033[0m $* (already done)"; }

# ── 0. Preflight ────────────────────────────────────────────────────────────
if [[ ! -f "$REPO_DIR/package.json" ]]; then
  echo "Error: Run this script from the repo root (bash deploy/setup.sh)" >&2
  exit 1
fi

# ── 1. System packages ─────────────────────────────────────────────────────
NEED_APT=false

if ! command -v node &>/dev/null || ! node -v | grep -q "^v22"; then
  NEED_APT=true
fi
if ! command -v git &>/dev/null; then
  NEED_APT=true
fi

if $NEED_APT; then
  info "Updating system packages"
  sudo apt update -y && sudo apt upgrade -y

  if ! command -v node &>/dev/null || ! node -v | grep -q "^v22"; then
    info "Installing Node.js 22 LTS"
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt install -y nodejs
  fi

  if ! command -v git &>/dev/null; then
    sudo apt install -y git
  fi
else
  skip "System packages (Node $(node -v), git)"
fi

ok "Node $(node -v), git installed"

# ── 2. App dependencies & build ────────────────────────────────────────────
cd "$REPO_DIR"

if [[ ! -d "$REPO_DIR/node_modules" ]] || [[ ! -d "$REPO_DIR/server/node_modules" ]] || [[ ! -d "$REPO_DIR/client/node_modules" ]]; then
  info "Installing npm dependencies"
  npm run install:all
  ok "Dependencies installed"
else
  skip "npm dependencies"
fi

if [[ ! -d "$REPO_DIR/client/dist" ]] || [[ ! -d "$REPO_DIR/admin/dist" ]]; then
  info "Building frontend"
  npm run build
  ok "Client and admin built"
else
  skip "Frontend build (client/dist and admin/dist exist)"
fi

# ── 3. Environment file ────────────────────────────────────────────────────
if [[ ! -f "$REPO_DIR/server/.env" ]]; then
  info "Creating server/.env from .env.example"
  cp "$REPO_DIR/server/.env.example" "$REPO_DIR/server/.env"
  warn "Edit server/.env to set your coordinates and flight source"
else
  skip "server/.env"
fi

# ── 4. Systemd service ─────────────────────────────────────────────────────
info "Checking systemd service"

# Generate the patched service file
SERVICE_TMP="$(mktemp)"
sed \
  -e "s|User=pi|User=$CURRENT_USER|" \
  -e "s|WorkingDirectory=/home/pi/homeDisplay|WorkingDirectory=$REPO_DIR|" \
  "$DEPLOY_DIR/homedisplay.service" > "$SERVICE_TMP"

INSTALLED="/etc/systemd/system/${SERVICE_NAME}.service"

if [[ -f "$INSTALLED" ]] && diff -q "$SERVICE_TMP" "$INSTALLED" &>/dev/null; then
  rm "$SERVICE_TMP"
  skip "Systemd service (unchanged)"
else
  sudo cp "$SERVICE_TMP" "$INSTALLED"
  rm "$SERVICE_TMP"
  sudo systemctl daemon-reload
  ok "Systemd service installed"
fi

if ! systemctl is-enabled "$SERVICE_NAME" &>/dev/null; then
  sudo systemctl enable "$SERVICE_NAME"
  ok "Service enabled"
fi

if ! systemctl is-active "$SERVICE_NAME" &>/dev/null; then
  sudo systemctl start "$SERVICE_NAME"
  ok "Service started"
else
  skip "Service (already running)"
fi

# ── 5. Kiosk autostart ─────────────────────────────────────────────────────
info "Checking kiosk autostart"
chmod +x "$DEPLOY_DIR/kiosk.sh"

mkdir -p "$HOME/.config/autostart"

DESKTOP_TMP="$(mktemp)"
sed "s|Exec=/home/pi/homeDisplay/deploy/kiosk.sh|Exec=$DEPLOY_DIR/kiosk.sh|" \
  "$DEPLOY_DIR/homedisplay-kiosk.desktop" > "$DESKTOP_TMP"

DESKTOP_DEST="$HOME/.config/autostart/homedisplay-kiosk.desktop"
if [[ -f "$DESKTOP_DEST" ]] && diff -q "$DESKTOP_TMP" "$DESKTOP_DEST" &>/dev/null; then
  rm "$DESKTOP_TMP"
  skip "Kiosk desktop entry"
else
  cp "$DESKTOP_TMP" "$DESKTOP_DEST"
  rm "$DESKTOP_TMP"
  ok "Kiosk desktop entry installed"
fi

# ── 6. Screen-blanking prevention ──────────────────────────────────────────
info "Checking screen blanking"

# X11 / LXDE
LXDE_DIR="/etc/xdg/lxsession/LXDE-pi"
if [[ -d "$LXDE_DIR" ]]; then
  if ! diff -q "$DEPLOY_DIR/no-blank.conf" "$LXDE_DIR/no-blank.conf" &>/dev/null 2>&1; then
    sudo cp "$DEPLOY_DIR/no-blank.conf" "$LXDE_DIR/"
    ok "LXDE no-blank config installed"
  else
    skip "LXDE no-blank config"
  fi
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
    skip "Wayland idle config"
  fi
fi

# ── 7. Desktop auto-login ──────────────────────────────────────────────────
if command -v raspi-config &>/dev/null; then
  # Check current boot behaviour (B4 = desktop autologin)
  CURRENT_BOOT="$(sudo raspi-config nonint get_boot_cli 2>/dev/null || echo "")"
  if [[ "$CURRENT_BOOT" == "0" ]]; then
    skip "Desktop auto-login"
  else
    info "Enabling desktop auto-login"
    sudo raspi-config nonint do_boot_behaviour B4 2>/dev/null || warn "raspi-config auto-login failed — set manually via sudo raspi-config"
    ok "Auto-login configured"
  fi
else
  warn "raspi-config not found — set desktop auto-login manually"
fi

# ── Done ────────────────────────────────────────────────────────────────────
echo ""
info "Setup complete! Reboot to start the kiosk:"
echo "    sudo reboot"
echo ""
echo "  Dashboard:  http://$(hostname -I | awk '{print $1}'):8787"
echo "  Admin:      http://$(hostname -I | awk '{print $1}'):8787/admin/"
echo "  Logs:       journalctl -u $SERVICE_NAME -f"
