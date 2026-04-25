# Deploying homeDisplay on a Raspberry Pi

This guide walks you through setting up the homeDisplay wall-mounted dashboard on a Raspberry Pi 5, from a fresh OS install to a fully working kiosk that starts on boot.

## Hardware

- Raspberry Pi 5 (4 GB+ RAM recommended)
- MicroSD card (32 GB+) or NVMe SSD via HAT
- 1080p monitor (HDMI)
- Power supply (USB-C, 27 W for Pi 5)
- Ethernet or Wi-Fi connectivity

## Quick setup (recommended)

A single script handles steps 2–9 below automatically. After flashing the OS and cloning the repo:

```bash
cd ~/homeDisplay
bash deploy/setup.sh
sudo reboot
```

The script is idempotent — safe to re-run. It auto-detects the current user and install path, so it works whether you log in as `pi` or another username.

If you prefer to do each step manually, follow the detailed instructions below.

---

## 1. Flash Raspberry Pi OS

1. Download [Raspberry Pi Imager](https://www.raspberrypi.com/software/).
2. Flash **Raspberry Pi OS (64-bit, Desktop)** — you need the desktop variant for Chromium kiosk.
3. In the imager's settings (gear icon), pre-configure:
   - Hostname: `homedisplay`
   - Username/password
   - Wi-Fi (if not using Ethernet)
   - Enable SSH
4. Boot the Pi, SSH in or use a keyboard to confirm it's running.

## 2. System setup

```bash
# Update everything
sudo apt update && sudo apt upgrade -y

# Install Node.js 22 (LTS)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node -v   # should be v22.x
npm -v

# Install git if not already present
sudo apt install -y git
```

## 3. Clone and install the app

```bash
cd ~
git clone <your-repo-url> homeDisplay
cd homeDisplay
npm run install:all
```

## 4. Build the frontend apps

```bash
npm run build
```

This builds both `client/dist` and `admin/dist`.

## 5. Configure environment

```bash
# Copy the example and edit as needed
cp server/.env.example server/.env
nano server/.env
```

Key settings to review:
- `FLIGHTS_CENTER_LAT` / `FLIGHTS_CENTER_LON` — your home coordinates (defaults to Singapore)
- `FLIGHTS_DATA_URL` — if you have a local ADS-B antenna (readsb/FR24/dump1090)
- `OPENSKY_CLIENT_ID` / `OPENSKY_CLIENT_SECRET` — optional, for higher API limits

## 6. Test manually

```bash
# Start the server (serves the built client + admin + API)
npm start
```

Open `http://<pi-ip>:8787` from another machine to verify everything works. Press Ctrl+C to stop.

## 7. Set up the systemd service

This makes the app start automatically on boot and restart on crashes.

```bash
sudo cp ~/homeDisplay/deploy/homedisplay.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable homedisplay
sudo systemctl start homedisplay
```

Check it's running:

```bash
sudo systemctl status homedisplay
journalctl -u homedisplay -f   # live logs
```

## 8. Set up Chromium kiosk

The kiosk script launches Chromium in full-screen mode pointing at the local server.

```bash
# Make the kiosk script executable
chmod +x ~/homeDisplay/deploy/kiosk.sh
```

### Autostart on login

```bash
mkdir -p ~/.config/autostart
cp ~/homeDisplay/deploy/homedisplay-kiosk.desktop ~/.config/autostart/
```

### Auto-login to desktop

```bash
sudo raspi-config
```

Navigate to: **System Options > Boot / Auto Login > Desktop Autologin**

Reboot and the display should come up automatically:

```bash
sudo reboot
```

## 9. Prevent screen blanking

The Pi will blank the screen after inactivity by default. To disable:

```bash
# Copy the screen-blanking prevention config
sudo cp ~/homeDisplay/deploy/no-blank.conf /etc/xdg/lxsession/LXDE-pi/
```

Or add these lines manually to `~/.config/wayfire.ini` (if using Wayland/labwc on Bookworm):

```ini
[idle]
dpms_timeout=0
screensaver_timeout=0
```

## 10. Accessing the admin

From any device on the same network, open:

```
http://<pi-ip>:8787/admin/
```

Or from the display itself, click the gear icon in the top-right corner.

## Updating

```bash
cd ~/homeDisplay
git pull
npm run install:all
npm run build
sudo systemctl restart homedisplay
```

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Black screen after boot | Check `systemctl status homedisplay` and `journalctl -u homedisplay` |
| Screen goes blank after a while | See step 9 (screen blanking prevention) |
| "Cannot connect" in Chromium | The server may not be ready yet; kiosk.sh has a retry loop |
| Flights show "error" | Check `server/.env` — OpenSky may be rate-limited; consider adding credentials |
| Admin not loading | Make sure you ran `npm run build` and the server is serving static files |
