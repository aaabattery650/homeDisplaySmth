#!/usr/bin/env bash
# Launch Chromium in kiosk mode pointing at the local homeDisplay server.
# Used by the autostart desktop entry.

URL="http://127.0.0.1:8787"
DISPLAY_FLAGS=(
  --kiosk
  --noerrdialogs
  --disable-infobars
  --disable-session-crashed-bubble
  --disable-restore-session-state
  --disable-features=TranslateUI
  --check-for-update-interval=31536000
  --no-first-run
  --start-fullscreen
  --autoplay-policy=no-user-gesture-required

  # Performance: reduce memory and GPU pressure on Pi 3
  --process-per-site
  --ignore-gpu-blocklist
  --enable-gpu-rasterization
  --enable-zero-copy
  --num-raster-threads=2
  --disable-smooth-scrolling
  --disable-low-end-device-mode
  --enable-accelerated-video-decode
)

# Wait for the server to be ready (up to 30 seconds)
for i in $(seq 1 30); do
  if curl -sf "$URL/health" > /dev/null 2>&1; then
    break
  fi
  echo "Waiting for server... ($i/30)"
  sleep 1
done

# Rotate display 180° (for upside-down mounted monitors)
if command -v wlr-randr &>/dev/null; then
  # Wayland (Bookworm labwc / wayfire)
  HDMI="$(wlr-randr 2>/dev/null | grep -oP '^HDMI-A-\d+' | head -1)"
  if [[ -n "$HDMI" ]]; then
    wlr-randr --output "$HDMI" --transform 180 2>/dev/null || true
  fi
elif command -v xrandr &>/dev/null; then
  # X11 fallback
  xrandr --output HDMI-1 --rotate inverted 2>/dev/null || true
fi

# Disable screen blanking (X11)
if command -v xset &> /dev/null; then
  xset s off
  xset -dpms
  xset s noblank
fi

# Clear any Chromium crash flags from a previous unclean shutdown
CHROMIUM_DIR="$HOME/.config/chromium/Default"
if [ -f "$CHROMIUM_DIR/Preferences" ]; then
  sed -i 's/"exited_cleanly":false/"exited_cleanly":true/' "$CHROMIUM_DIR/Preferences" 2>/dev/null
  sed -i 's/"exit_type":"Crashed"/"exit_type":"Normal"/' "$CHROMIUM_DIR/Preferences" 2>/dev/null
fi

# Use whichever chromium binary is available
if command -v chromium-browser &>/dev/null; then
  BROWSER=chromium-browser
else
  BROWSER=chromium
fi

exec "$BROWSER" "${DISPLAY_FLAGS[@]}" "$URL"
