#!/bin/bash
# =========================================================
# NJADDER — Auto Installer (Termux / VPS / Linux / macOS)
# =========================================================
# Usage:
#   curl -sSL https://raw.githubusercontent.com/mnew8260-lgtm/njadder/main/install.sh | bash
#   OR:
#   bash install.sh
# =========================================================
set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

print_info()  { echo -e "${CYAN}[INFO]${NC} $1"; }
print_ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
print_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo ""
echo "═══════════════════════════════════════════════════"
echo "  🌐 NJADDER v6.2 — Auto Installer"
echo "═══════════════════════════════════════════════════"
echo ""

# ─── Detect environment ────────────────────────────────────
ENV="linux"
if [ -n "$PREFIX" ] && echo "$PREFIX" | grep -q "com.termux"; then
  ENV="termux"
elif [ "$(uname)" = "Darwin" ]; then
  ENV="macos"
fi
print_info "Environment: $ENV"

# ─── Install dependencies ──────────────────────────────────
print_info "Installing dependencies..."

if [ "$ENV" = "termux" ]; then
  pkg update -y >/dev/null 2>&1 || true
  pkg install -y git nodejs-lts python build-essential openssl >/dev/null 2>&1 || {
    print_warn "Some packages failed to install. Continuing..."
  }
elif command -v apt >/dev/null 2>&1; then
  sudo apt update -y >/dev/null 2>&1 || apt update -y >/dev/null 2>&1 || true
  sudo apt install -y git curl nodejs npm python3 build-essential >/dev/null 2>&1 || apt install -y git curl nodejs npm python3 build-essential >/dev/null 2>&1 || true
elif command -v yum >/dev/null 2>&1; then
  sudo yum install -y git curl nodejs npm python3 gcc-c++ make >/dev/null 2>&1 || true
elif [ "$ENV" = "macos" ]; then
  if ! command -v brew >/dev/null 2>&1; then
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  fi
  brew install git node python >/dev/null 2>&1 || true
fi

print_ok "Dependencies installed"

# ─── Verify Node.js ────────────────────────────────────────
if ! command -v node >/dev/null 2>&1; then
  print_error "Node.js not found. Install it manually."
  exit 1
fi
NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VER" -lt 18 ]; then
  print_error "Node.js version too old. Need 18+. Current: $(node -v)"
  exit 1
fi
print_ok "Node.js: $(node -v)"

# ─── Clone or update repo ──────────────────────────────────
INSTALL_DIR="${HOME}/njadder"
if [ -d "$INSTALL_DIR/.git" ]; then
  print_info "Updating existing installation at $INSTALL_DIR..."
  cd "$INSTALL_DIR"
  git pull origin main >/dev/null 2>&1 || true
else
  print_info "Cloning repository to $INSTALL_DIR..."
  git clone https://github.com/mnew8260-lgtm/njadder.git "$INSTALL_DIR" >/dev/null 2>&1
  cd "$INSTALL_DIR"
fi
print_ok "Repository ready"

# ─── Install npm packages ──────────────────────────────────
print_info "Installing npm packages (this may take a few minutes)..."
# Use --no-optional to skip optional deps that may fail on some platforms
npm install --no-optional >/dev/null 2>&1 || {
  print_warn "npm install had issues. Retrying with legacy peer deps..."
  npm install --legacy-peer-deps >/dev/null 2>&1 || {
    print_error "npm install failed. Try manually: cd $INSTALL_DIR && npm install"
    exit 1
  }
}
print_ok "Packages installed"

# ─── Create .env.local ─────────────────────────────────────
if [ ! -f ".env.local" ]; then
  print_info "Creating .env.local with default database..."
  cat > .env.local << 'EOF'
DATABASE_URL=postgresql://neondb_owner:npg_0CL3WFlbKQeo@ep-patient-water-b4s860f8-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require
EOF
  print_ok ".env.local created (default DB — change it for production)"
else
  print_ok ".env.local already exists"
fi

# ─── Build ─────────────────────────────────────────────────
print_info "Building project (may take 1-3 minutes)..."
# Limit Node memory for low-RAM environments (Termux, small VPS)
export NODE_OPTIONS="--max-old-space-size=1024"
npm run build >/dev/null 2>&1 || {
  print_warn "Build failed with 1GB memory limit. Retrying with 512MB..."
  export NODE_OPTIONS="--max-old-space-size=512"
  npm run build >/dev/null 2>&1 || {
    print_error "Build failed. Try manually: cd $INSTALL_DIR && npm run build"
    exit 1
  }
}
print_ok "Build successful"

# ─── Install PM2 ───────────────────────────────────────────
if ! command -v pm2 >/dev/null 2>&1; then
  print_info "Installing PM2..."
  npm install -g pm2 >/dev/null 2>&1 || {
    print_warn "Failed to install PM2 globally. Using npm directly."
  }
fi

# ─── Start the server ──────────────────────────────────────
if command -v pm2 >/dev/null 2>&1; then
  print_info "Starting with PM2..."
  pm2 delete njadder >/dev/null 2>&1 || true
  pm2 start npm --name "njadder" -- start >/dev/null 2>&1
  pm2 save >/dev/null 2>&1
  
  # Setup startup (may need sudo on Linux)
  if [ "$ENV" = "termux" ]; then
    print_info "Setting up PM2 startup (Termux)..."
    pm2 startup termux >/dev/null 2>&1 || true
  elif [ "$ENV" = "linux" ]; then
    print_info "Setting up PM2 startup (Linux)..."
    pm2 startup systemd >/dev/null 2>&1 || true
  fi
  
  print_ok "NJADDER running with PM2 (auto-restart on reboot)"
else
  print_info "Starting with npm (background)..."
  nohup npm run start > /tmp/njadder.log 2>&1 &
  print_ok "NJADDER started in background (PID: $!)"
fi

# ─── Get IP ────────────────────────────────────────────────
LOCAL_IP="localhost"
if [ "$ENV" = "termux" ]; then
  LOCAL_IP=$(ip addr show wlan0 2>/dev/null | grep "inet " | awk '{print $2}' | cut -d/ -f1 || echo "localhost")
elif command -v hostname >/dev/null 2>&1; then
  LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")
fi

# ─── Done ──────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════"
echo -e "${GREEN}  ✅ NJADDER INSTALLED SUCCESSFULLY!${NC}"
echo "═══════════════════════════════════════════════════"
echo ""
echo "  📍 Directory: $INSTALL_DIR"
echo "  🌐 URL:       http://$LOCAL_IP:3000"
echo "  📧 Login:     admin@njadder.app"
echo "  🔑 Password:  admin123"
echo ""
echo "  ─── Management commands ───"
echo "  pm2 logs njadder          # View logs"
echo "  pm2 restart njadder       # Restart"
echo "  pm2 stop njadder          # Stop"
echo "  pm2 status                # Status"
echo ""
echo "  ─── Update (later) ───"
echo "  cd $INSTALL_DIR && git pull && npm run build && pm2 restart njadder"
echo ""
echo "═══════════════════════════════════════════════════"
echo ""
