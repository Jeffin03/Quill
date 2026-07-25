#!/bin/bash
# ══════════════════════════════════════════
# Quill — LLM + Tunnel Launcher
# Starts Ollama with CORS enabled and
# opens a Cloudflare tunnel to expose it.
# ══════════════════════════════════════════

TUNNEL_LOG="/tmp/quill_tunnel.log"
OLLAMA_PID=""
TUNNEL_PID=""

# ── Helpers ────────────────────────────────

print_box() {
  local title="$1"
  local content="$2"
  local width=50
  local border=""
  for ((i=0; i<width; i++)); do border+="-"; done

  echo "+${border}+"
  printf "| %-$((width-2))s |\n" "$title"
  echo "+${border}+"
  echo -e "$content" | while IFS= read -r line; do
    printf "| %-$((width-2))s |\n" "  $line"
  done
  echo "+${border}+"
}

print_error() {
  local title="$1"
  local content="$2"
  local width=50
  local border=""
  for ((i=0; i<width; i++)); do border+="-"; done

  echo "+${border}+"
  printf "| %-$((width-2))s |\n" "ERROR: $title"
  echo "+${border}+"
  echo -e "$content" | while IFS= read -r line; do
    printf "| %-$((width-2))s |\n" "  $line"
  done
  echo "+${border}+"
}

cleanup() {
  echo ""
  echo "Shutting down..."
  [ -n "$OLLAMA_PID" ] && kill "$OLLAMA_PID" 2>/dev/null
  [ -n "$TUNNEL_PID" ] && kill "$TUNNEL_PID" 2>/dev/null
  rm -f "$TUNNEL_LOG"
  exit 0
}

trap cleanup SIGINT SIGTERM

# ── Check dependencies ─────────────────────

echo ""
echo "Checking dependencies..."
echo ""

MISSING=0

if ! command -v ollama &>/dev/null; then
  print_error "ollama not found" "Install: https://ollama.com/download\nOr: yay -S ollama"
  MISSING=1
fi

if ! command -v cloudflared &>/dev/null; then
  print_error "cloudflared not found" "Install: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/\nOr: yay -S cloudflared"
  MISSING=1
fi

if [ "$MISSING" -eq 1 ]; then
  echo ""
  echo "Install missing packages and re-run."
  exit 1
fi

print_box "Dependencies OK" "ollama: $(command -v ollama)\ncloudflared: $(command -v cloudflared)"
echo ""

# ── Start Ollama ───────────────────────────

echo "Starting Ollama (CORS enabled)..."

# Kill any existing Ollama instance
sudo killall ollama 2>/dev/null
pkill -f "ollama serve" 2>/dev/null
sleep 2

OLLAMA_HOST=0.0.0.0:11434 OLLAMA_ORIGINS="*" ollama serve &
OLLAMA_PID=$!
sleep 3

# Verify Ollama is running
if ! kill -0 "$OLLAMA_PID" 2>/dev/null; then
  print_error "Ollama failed to start" "Check if port 11434 is already in use.\nRun: sudo lsof -i :11434"
  exit 1
fi

# Quick health check
if ! curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
  print_error "Ollama not responding" "Server started but health check failed.\nCheck: curl http://localhost:11434/api/tags"
  exit 1
fi

print_box "Ollama Running" "PID: $OLLAMA_PID\nEndpoint: http://localhost:11434"
echo ""

# ── Start Cloudflare tunnel ────────────────

echo "Starting Cloudflare tunnel..."

rm -f "$TUNNEL_LOG"
systemd-inhibit --why="Quill Writing Session" --mode=block \
  cloudflared tunnel --url http://localhost:11434 --proxy-connect-timeout 300s \
  > "$TUNNEL_LOG" 2>&1 &
TUNNEL_PID=$!

# Wait for tunnel URL (max 30 seconds)
echo "Waiting for tunnel URL (timeout: 30s)..."
ELAPSED=0
while ! grep -q "https://.*\.trycloudflare\.com" "$TUNNEL_LOG" 2>/dev/null; do
  sleep 1
  ELAPSED=$((ELAPSED + 1))
  if [ "$ELAPSED" -ge 30 ]; then
    print_error "Tunnel timed out" "Could not get tunnel URL after 30 seconds.\n\nLog contents:\n$(cat "$TUNNEL_LOG" 2>/dev/null || echo '  (empty)')"
    cleanup
    exit 1
  fi
  # Check if cloudflared died
  if ! kill -0 "$TUNNEL_PID" 2>/dev/null; then
    print_error "Cloudflare tunnel process died" "Process exited unexpectedly.\n\nLog contents:\n$(cat "$TUNNEL_LOG" 2>/dev/null || echo '  (empty)')"
    cleanup
    exit 1
  fi
done

sleep 1
TUNNEL_URL=$(grep -o "https://.*\.trycloudflare\.com" "$TUNNEL_LOG" | sed 's/ //g' | tr -d '|' | head -n 1)

if [ -z "$TUNNEL_URL" ]; then
  print_error "Could not parse tunnel URL" "Log contents:\n$(cat "$TUNNEL_LOG")"
  cleanup
  exit 1
fi

# ── Show endpoint ──────────────────────────

LLM_ENDPOINT="$TUNNEL_URL/v1"

echo ""
print_box "LLM Endpoint Ready" "Tunnel: $TUNNEL_URL\nAPI: $LLM_ENDPOINT\n\nPaste this in Quill Settings -> Ollama"
echo ""

# ── QR Code (optional) ────────────────────

if command -v qrencode &>/dev/null; then
  echo "Scan to copy endpoint:"
  echo ""
  qrencode -t utf8 "$LLM_ENDPOINT"
  echo ""
  print_box "Scan with phone camera" "Opens the Ollama API endpoint"
else
  echo "Install qrencode for QR code display: yay -S qrencode"
  echo "URL: $LLM_ENDPOINT"
fi

echo ""
echo "Press Ctrl+C to stop."
echo ""

# Keep running until interrupted
wait "$TUNNEL_PID"
