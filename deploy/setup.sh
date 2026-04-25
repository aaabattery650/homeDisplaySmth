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

# Prompt for sudo upfront so the rest of the script runs unattended
info "This script needs sudo for system configuration."
sudo -v
# Keep sudo alive in the background for long-running steps (npm install, build)
while true; do sudo -n true; sleep 50; kill -0 "$$" || exit; done 2>/dev/null &

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

# ── 2. Pull latest code, install deps & build ─────────────────────────────
cd "$REPO_DIR"

PREV_HEAD="$(git rev-parse HEAD 2>/dev/null || echo "")"

if git rev-parse --is-inside-work-tree &>/dev/null; then
  info "Pulling latest code"
  git pull --ff-only || warn "git pull failed — continuing with current checkout"
  ok "Code up to date"
fi

CURR_HEAD="$(git rev-parse HEAD 2>/dev/null || echo "")"
BUILD_MARKER="$REPO_DIR/client/dist/.build-commit"
LAST_BUILD="$(cat "$BUILD_MARKER" 2>/dev/null || echo "")"
NEED_RESTART=false

# Only run npm install if lock files changed or node_modules missing
LOCK_HASH="$(cat "$REPO_DIR/package-lock.json" "$REPO_DIR/server/package-lock.json" "$REPO_DIR/client/package-lock.json" "$REPO_DIR/admin/package-lock.json" 2>/dev/null | md5sum | cut -d' ' -f1)"
LOCK_MARKER="$REPO_DIR/node_modules/.lock-hash"
LAST_LOCK="$(cat "$LOCK_MARKER" 2>/dev/null || echo "")"

if [[ "$LOCK_HASH" != "$LAST_LOCK" ]] || [[ ! -d "$REPO_DIR/node_modules" ]]; then
  info "Installing npm dependencies"
  npm run install:all
  mkdir -p "$REPO_DIR/node_modules"
  echo "$LOCK_HASH" > "$LOCK_MARKER"
  ok "Dependencies installed"
else
  skip "npm dependencies (lock files unchanged)"
fi

if [[ "$CURR_HEAD" != "$LAST_BUILD" ]]; then
  info "Building frontend (source changed)"
  npm run build
  echo "$CURR_HEAD" > "$BUILD_MARKER"
  NEED_RESTART=true
  ok "Client and admin built"
else
  skip "Frontend build (already at $CURR_HEAD)"
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
elif $NEED_RESTART; then
  sudo systemctl restart "$SERVICE_NAME"
  ok "Service restarted (new build)"
else
  skip "Service (already running, no changes)"
fi

# ── 4b. Install helper scripts ────────────────────────────────────────────
chmod +x "$DEPLOY_DIR/rotate-screen"
if [[ ! -L /usr/local/bin/rotate-screen ]] || [[ "$(readlink -f /usr/local/bin/rotate-screen)" != "$DEPLOY_DIR/rotate-screen" ]]; then
  sudo ln -sf "$DEPLOY_DIR/rotate-screen" /usr/local/bin/rotate-screen
  ok "rotate-screen command installed"
else
  skip "rotate-screen command"
fi

# ── 5. Kiosk autostart ─────────────────────────────────────────────────────
info "Detecting desktop environment"
chmod +x "$DEPLOY_DIR/kiosk.sh"

KIOSK_CMD="$DEPLOY_DIR/kiosk.sh"
DESKTOP_ENV="unknown"

# Detect by checking what's actually installed on disk
# Order matters — more specific checks first
if [[ -d "/etc/xdg/labwc" ]] || [[ -d "$HOME/.config/labwc" ]]; then
  DESKTOP_ENV="labwc"
fi
if [[ -f "$HOME/.config/wayfire.ini" ]]; then
  DESKTOP_ENV="wayfire"
fi
if [[ -d "/etc/xdg/lxsession/LXDE-pi" ]]; then
  DESKTOP_ENV="lxde"
fi
# rpd-x = Raspberry Pi Desktop (Bookworm on Pi 3/4, uses wayfire)
if [[ -d "/etc/xdg/lxsession/rpd-x" ]]; then
  DESKTOP_ENV="wayfire"
fi

ok "Detected: $DESKTOP_ENV"

KIOSK_INSTALLED=false

# wayfire (Bookworm on Pi 3/4 — "rpd-x" session)
if [[ "$DESKTOP_ENV" == "wayfire" ]]; then
  WAYFIRE_CONF="$HOME/.config/wayfire.ini"
  if [[ -f "$WAYFIRE_CONF" ]] && grep -qF "$KIOSK_CMD" "$WAYFIRE_CONF"; then
    skip "wayfire autostart entry"
  else
    if [[ -f "$WAYFIRE_CONF" ]] && grep -q "\[autostart\]" "$WAYFIRE_CONF"; then
      # Append under existing [autostart] section
      sed -i "/^\[autostart\]/a homedisplay = $KIOSK_CMD" "$WAYFIRE_CONF"
    else
      # Add new [autostart] section
      cat >> "$WAYFIRE_CONF" <<EOF

[autostart]
homedisplay = $KIOSK_CMD
EOF
    fi
    ok "wayfire autostart entry added"
  fi
  KIOSK_INSTALLED=true
fi

# labwc / Wayland (Pi 5 Bookworm default)
if [[ "$DESKTOP_ENV" == "labwc" ]]; then
  LABWC_DIR="$HOME/.config/labwc"
  LABWC_AUTOSTART="$LABWC_DIR/autostart"
  mkdir -p "$LABWC_DIR"
  if [[ -f "$LABWC_AUTOSTART" ]] && grep -qF "$KIOSK_CMD" "$LABWC_AUTOSTART"; then
    skip "labwc autostart entry"
  else
    echo "$KIOSK_CMD &" >> "$LABWC_AUTOSTART"
    ok "labwc autostart entry added"
  fi
  KIOSK_INSTALLED=true
fi

# LXDE / X11 (Bullseye and older)
if [[ "$DESKTOP_ENV" == "lxde" ]]; then
  LXDE_AUTOSTART_DIR="$HOME/.config/lxsession/LXDE-pi"
  LXDE_AUTOSTART="$LXDE_AUTOSTART_DIR/autostart"
  mkdir -p "$LXDE_AUTOSTART_DIR"
  if [[ ! -f "$LXDE_AUTOSTART" ]] && [[ -f "/etc/xdg/lxsession/LXDE-pi/autostart" ]]; then
    cp /etc/xdg/lxsession/LXDE-pi/autostart "$LXDE_AUTOSTART"
  fi
  if grep -qF "$KIOSK_CMD" "$LXDE_AUTOSTART" 2>/dev/null; then
    skip "LXDE autostart entry"
  else
    echo "@$KIOSK_CMD" >> "$LXDE_AUTOSTART"
    ok "LXDE autostart entry added"
  fi
  KIOSK_INSTALLED=true
fi

# XDG .desktop fallback (works on some setups)
mkdir -p "$HOME/.config/autostart"
DESKTOP_TMP="$(mktemp)"
sed "s|Exec=/home/pi/homeDisplay/deploy/kiosk.sh|Exec=$KIOSK_CMD|" \
  "$DEPLOY_DIR/homedisplay-kiosk.desktop" > "$DESKTOP_TMP"

DESKTOP_DEST="$HOME/.config/autostart/homedisplay-kiosk.desktop"
if [[ -f "$DESKTOP_DEST" ]] && diff -q "$DESKTOP_TMP" "$DESKTOP_DEST" &>/dev/null; then
  rm "$DESKTOP_TMP"
  skip "XDG autostart desktop entry"
else
  cp "$DESKTOP_TMP" "$DESKTOP_DEST"
  rm "$DESKTOP_TMP"
  ok "XDG autostart desktop entry installed"
fi

if ! $KIOSK_INSTALLED; then
  warn "Could not detect desktop environment — kiosk autostart may not work. Set it up manually."
fi

# ── 6. Screen-blanking prevention ──────────────────────────────────────────
info "Checking screen blanking"

if [[ "$DESKTOP_ENV" == "lxde" ]]; then
  LXDE_DIR="/etc/xdg/lxsession/LXDE-pi"
  if [[ -d "$LXDE_DIR" ]]; then
    if ! diff -q "$DEPLOY_DIR/no-blank.conf" "$LXDE_DIR/no-blank.conf" &>/dev/null 2>&1; then
      sudo cp "$DEPLOY_DIR/no-blank.conf" "$LXDE_DIR/"
      ok "LXDE no-blank config installed"
    else
      skip "LXDE no-blank config"
    fi
  fi
fi

if [[ "$DESKTOP_ENV" == "wayfire" || "$DESKTOP_ENV" == "labwc" ]]; then
  WAYFIRE_CONF="$HOME/.config/wayfire.ini"
  if [[ -f "$WAYFIRE_CONF" ]]; then
    if grep -q "\[idle\]" "$WAYFIRE_CONF"; then
      # Update existing idle section to disable timeouts
      sed -i 's/^dpms_timeout=.*/dpms_timeout=0/' "$WAYFIRE_CONF"
      sed -i 's/^screensaver_timeout=.*/screensaver_timeout=0/' "$WAYFIRE_CONF"
      skip "Wayland idle config (verified)"
    else
      cat >> "$WAYFIRE_CONF" <<'EOF'

[idle]
dpms_timeout=0
screensaver_timeout=0
EOF
      ok "Wayland idle timeouts disabled"
    fi
  fi
fi

# ── 7. Display rotation (180°) ────────────────────────────────────────────
# Bookworm Pi can run wayfire or labwc (or both configs exist). We write
# rotation to all applicable places and also apply it immediately.
info "Checking display rotation"

# Apply immediately to the current session
if command -v wlr-randr &>/dev/null; then
  wlr-randr --output HDMI-A-1 --transform 180 2>/dev/null || true
  ok "Display rotated 180° (current session)"
fi

# Persist in wayfire.ini if it exists
WAYFIRE_CONF="$HOME/.config/wayfire.ini"
if [[ -f "$WAYFIRE_CONF" ]]; then
  if grep -q "transform = 180" "$WAYFIRE_CONF"; then
    skip "wayfire.ini rotation"
  else
    HDMI_OUTPUT="HDMI-A-1"
    if command -v wlr-randr &>/dev/null; then
      DETECTED="$(wlr-randr 2>/dev/null | grep -oP '^HDMI-A-\d+' | head -1 || true)"
      if [[ -n "$DETECTED" ]]; then HDMI_OUTPUT="$DETECTED"; fi
    fi
    if grep -q "\[output:$HDMI_OUTPUT\]" "$WAYFIRE_CONF" 2>/dev/null; then
      sed -i "/^\[output:$HDMI_OUTPUT\]/a transform = 180" "$WAYFIRE_CONF"
    else
      cat >> "$WAYFIRE_CONF" <<EOF

[output:$HDMI_OUTPUT]
transform = 180
EOF
    fi
    ok "wayfire.ini rotation added"
  fi
fi

# Persist in labwc autostart if labwc dir exists
LABWC_AUTOSTART="$HOME/.config/labwc/autostart"
if [[ -d "$HOME/.config/labwc" ]] || [[ -d "/etc/xdg/labwc" ]]; then
  mkdir -p "$HOME/.config/labwc"
  if [[ -f "$LABWC_AUTOSTART" ]] && grep -qF "wlr-randr" "$LABWC_AUTOSTART"; then
    skip "labwc autostart rotation"
  else
    LABWC_TMP="$(mktemp)"
    echo 'wlr-randr --output HDMI-A-1 --transform 180' > "$LABWC_TMP"
    if [[ -f "$LABWC_AUTOSTART" ]]; then
      cat "$LABWC_AUTOSTART" >> "$LABWC_TMP"
    fi
    mv "$LABWC_TMP" "$LABWC_AUTOSTART"
    ok "labwc autostart rotation added"
  fi
fi

# LXDE (X11, Bullseye)
if [[ "$DESKTOP_ENV" == "lxde" ]]; then
  LXDE_AUTOSTART="$HOME/.config/lxsession/LXDE-pi/autostart"
  if [[ -f "$LXDE_AUTOSTART" ]] && grep -qF "xrandr --output" "$LXDE_AUTOSTART"; then
    skip "LXDE xrandr rotation"
  else
    echo "@xrandr --output HDMI-1 --rotate inverted" >> "$LXDE_AUTOSTART"
    ok "LXDE rotation added"
  fi
fi

# ── 8. Desktop auto-login ──────────────────────────────────────────────────
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

# ── 9. Disable GNOME Keyring prompt ────────────────────────────────────────
# Chromium triggers a keyring unlock dialog on auto-login. Removing the
# default keyring file prevents the popup; the --password-store=basic flag
# in kiosk.sh ensures Chromium never asks for one again.
info "Checking GNOME Keyring"
KEYRING_DIR="$HOME/.local/share/keyrings"
if [[ -f "$KEYRING_DIR/Default_keyring.keyring" ]] || [[ -f "$KEYRING_DIR/default" ]]; then
  rm -f "$KEYRING_DIR/Default_keyring.keyring" "$KEYRING_DIR/default"
  ok "Removed default keyring (no more unlock popup)"
else
  skip "GNOME Keyring (already clean)"
fi

# ── Done ────────────────────────────────────────────────────────────────────
echo ""
info "Setup complete! Reboot to start the kiosk:"
echo "    sudo reboot"
echo ""
echo "  Dashboard:  http://$(hostname -I | awk '{print $1}'):8787"
echo "  Admin:      http://$(hostname -I | awk '{print $1}'):8787/admin/"
echo "  Logs:       journalctl -u $SERVICE_NAME -f"
