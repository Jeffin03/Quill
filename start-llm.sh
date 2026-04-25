#!/bin/bash
# ══════════════════════════════════════════
# Quill — LLM + Tunnel Launcher
# Starts Ollama with CORS enabled and
# opens a Cloudflare tunnel to expose it.
# ══════════════════════════════════════════

echo "✒️  Starting Quill LLM Stack..."
echo ""

# Kill any existing Ollama instance to restart with CORS
echo "🤖 Starting Ollama (CORS enabled)..."
sudo killall ollama 2>/dev/null
pkill -f "ollama serve" 2>/dev/null
sleep 3

# Start Ollama with CORS and Host enabled in the background
OLLAMA_HOST=0.0.0.0:11434 OLLAMA_ORIGINS="*" ollama serve &
OLLAMA_PID=$!
sleep 3

# Start Cloudflare tunnel in the background
echo "🌐 Starting Cloudflare Tunnel..."
# Increased timeout to 5 minutes for slow CPU generations
cloudflared tunnel --url http://localhost:11434 --proxy-connect-timeout 300s > /tmp/quill_tunnel.log 2>&1 &
TUNNEL_PID=$!

# Wait and find the URL
echo "⏳ Waiting for tunnel URL..."
while ! grep -q "https://.*\.trycloudflare\.com" /tmp/quill_tunnel.log; do
  sleep 1
done
sleep 1 # Wait a beat for the line to finish writing

# Grab anything that looks like a trycloudflare link
TUNNEL_URL=$(grep -o "https://.*\.trycloudflare\.com" /tmp/quill_tunnel.log | sed 's/ //g' | tr -d '|' | head -n 1)

if [ -z "$TUNNEL_URL" ]; then
  echo "❌ Error: Could not find tunnel URL in logs."
  echo "--- LOG CONTENT ---"
  cat /tmp/quill_tunnel.log
  exit 1
fi

if ! command -v qrencode &> /dev/null; then
  echo "⚠️  qrencode not found. Run: yay -S qrencode"
  echo "   URL: $TUNNEL_URL/v1"
else
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  SCANNABLE LLM ENDPOINT"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  qrencode -t utf8 "$TUNNEL_URL/v1"
  echo ""
  echo "  URL: $TUNNEL_URL/v1"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
fi
echo ""

# Trap Ctrl+C to cleanly shut everything down
trap "echo ''; echo '🛑 Shutting down...'; kill $OLLAMA_PID $TUNNEL_PID 2>/dev/null; rm /tmp/quill_tunnel.log; exit 0" SIGINT SIGTERM

# Keep the script running
wait $TUNNEL_PID
