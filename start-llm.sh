#!/bin/bash

# ══════════════════════════════════════════
# Quill — LLM + Tunnel Launcher
# Starts Ollama or LM Studio with CORS enabled
# and opens a Cloudflare tunnel to expose it.
# ══════════════════════════════════════════

TUNNEL_LOG="/tmp/quill_tunnel.log"
LLM_PID=""
TUNNEL_PID=""
PROXY_PID=""
LLM_PORT=""
CORS_PROXY_PORT=""

# ── Helpers ────────────────────────────────

print_box() {
  local title="$1"
  local content="$2"
  local width=50
  local border=""
  for ((i = 0; i < width; i++)); do border+="-"; done

  echo "+${border}+"
  printf "| %-$((width - 2))s |\n" "$title"
  echo "+${border}+"
  echo -e "$content" | while IFS= read -r line; do
    printf "| %-$((width - 2))s |\n" "  $line"
  done
  echo "+${border}+"
}

print_error() {
  local title="$1"
  local content="$2"
  local width=50
  local border=""
  for ((i = 0; i < width; i++)); do border+="-"; done

  echo "+${border}+"
  printf "| %-$((width - 2))s |\n" "ERROR: $title"
  echo "+${border}+"
  echo -e "$content" | while IFS= read -r line; do
    printf "| %-$((width - 2))s |\n" "  $line"
  done
  echo "+${border}+"
}

cleanup() {
  echo ""
  echo "Shutting down..."
  [ -n "$LLM_PID" ] && kill "$LLM_PID" 2>/dev/null
  [ -n "$PROXY_PID" ] && kill "$PROXY_PID" 2>/dev/null
  [ -n "$TUNNEL_PID" ] && kill "$TUNNEL_PID" 2>/dev/null
  rm -f "$TUNNEL_LOG"
  exit 0
}

trap cleanup SIGINT SIGTERM

# ── Pick provider ──────────────────────────

echo ""
echo "Pick your LLM backend:"
echo ""
select PROVIDER in "ollama" "lm-studio"; do
  case $PROVIDER in
  ollama)
    LLM_PORT=11434
    break
    ;;
  lm-studio)
    LLM_PORT=1234
    break
    ;;
  esac
done

# ── Check dependencies ─────────────────────

echo ""
echo "Checking dependencies..."
echo ""

MISSING=0

case "$PROVIDER" in
ollama)
  if ! command -v ollama &>/dev/null; then
    print_error "ollama not found" "Install: https://ollama.com/download\nOr: yay -S ollama"
    MISSING=1
  fi
  ;;
lm-studio)
  if ! command -v lms &>/dev/null; then
    print_error "lms (LM Studio CLI) not found" "Install LM Studio: https://lmstudio.ai\nThen run: lms bootstrap"
    MISSING=1
  fi
  ;;
esac

if ! command -v cloudflared &>/dev/null; then
  print_error "cloudflared not found" "Install: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/\nOr: yay -S cloudflared"
  MISSING=1
fi

if [ "$MISSING" -eq 1 ]; then
  echo ""
  echo "Install missing packages and re-run."
  exit 1
fi

print_box "Dependencies OK" "provider: $PROVIDER\ncloudflared: $(command -v cloudflared)"
echo ""

# ── Start provider ─────────────────────────

case "$PROVIDER" in
ollama)
  echo "Starting Ollama (CORS enabled)..."
  sudo killall ollama 2>/dev/null
  pkill -f "ollama serve" 2>/dev/null
  sleep 2
  OLLAMA_HOST=0.0.0.0:$LLM_PORT OLLAMA_ORIGINS="*" ollama serve &
  LLM_PID=$!
  sleep 3
  if ! kill -0 "$LLM_PID" 2>/dev/null; then
    print_error "Ollama failed to start" "Check if port $LLM_PORT is already in use.\nRun: sudo lsof -i :$LLM_PORT"
    exit 1
  fi
  if ! curl -s http://localhost:$LLM_PORT/api/tags >/dev/null 2>&1; then
    print_error "Ollama not responding" "Server started but health check failed.\nCheck: curl http://localhost:$LLM_PORT/api/tags"
    exit 1
  fi
  print_box "Ollama Running" "PID: $LLM_PID\nEndpoint: http://localhost:$LLM_PORT"
  ;;
lm-studio)
  echo "Checking LM Studio server (start it from the GUI first)..."
  sleep 2
  if ! curl -s http://localhost:$LLM_PORT/v1/models >/dev/null 2>&1; then
    print_error "LM Studio not responding" "Open LM Studio GUI, enable the server (port $LLM_PORT), then re-run.\nVerify with: curl http://localhost:$LLM_PORT/v1/models"
    exit 1
  fi
  # Start CORS proxy — LM Studio doesn't set CORS headers, but the
  # cloudflared tunnel is cross-origin from the Quill app, so the
  # browser would block the response without them.
  CORS_PROXY_PORT=11435
  echo "Starting CORS proxy on port $CORS_PROXY_PORT..."
  node -e "
const http = require('http');
http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    });
    return res.end();
  }
  const opts = {
    hostname: '127.0.0.1',
    port: $LLM_PORT,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: '127.0.0.1:$LLM_PORT' },
  };
  const proxy = http.request(opts, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, { ...proxyRes.headers, 'Access-Control-Allow-Origin': '*' });
    proxyRes.pipe(res);
  });
  proxy.on('error', () => res.writeHead(502).end());
  req.pipe(proxy);
}).listen($CORS_PROXY_PORT, '0.0.0.0');
console.log('CORS proxy running on port $CORS_PROXY_PORT');
" &
  PROXY_PID=$!
  sleep 1
  if ! kill -0 "$PROXY_PID" 2>/dev/null; then
    print_error "CORS proxy failed to start"
    exit 1
  fi
  # Use the proxy port for the tunnel
  LLM_PORT=$CORS_PROXY_PORT
  print_box "LM Studio Running" "Endpoint: http://localhost:1234\nCORS proxy: http://0.0.0.0:$CORS_PROXY_PORT"
  ;;
esac
echo ""

# ── Start Cloudflare tunnel ────────────────

echo "Starting Cloudflare tunnel..."

rm -f "$TUNNEL_LOG"
systemd-inhibit --why="Quill Writing Session" --mode=block \
  cloudflared tunnel --url http://localhost:$LLM_PORT --proxy-connect-timeout 300s \
  >"$TUNNEL_LOG" 2>&1 &
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
print_box "LLM Endpoint Ready" "Provider: $PROVIDER\nTunnel: $TUNNEL_URL\nAPI: $LLM_ENDPOINT\n\nPaste this in Quill Settings"
echo ""

# ── QR Code (optional) ────────────────────
# Note: QR encodes the base tunnel URL only — the app adds /v1/models itself

if command -v qrencode &>/dev/null; then
  echo "Scan to copy tunnel URL:"
  echo ""
  qrencode -t utf8 "$TUNNEL_URL"
  echo ""
  print_box "Scan with phone camera" "Base URL: $TUNNEL_URL\nApp will append /v1/models automatically"
else
  echo "Install qrencode for QR code display: yay -S qrencode"
  echo "URL: $TUNNEL_URL"
fi

echo ""
echo "Press Ctrl+C to stop."
echo ""

# Keep running until interrupted
wait "$TUNNEL_PID"
