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
cloudflared tunnel --url http://localhost:11434 > /tmp/quill_tunnel.log 2>&1 &
TUNNEL_PID=$!

# Wait and find the URL
echo "⏳ Waiting for tunnel URL..."
while ! grep -q "trycloudflare.com" /tmp/quill_tunnel.log; do
  sleep 1
done

TUNNEL_URL=$(grep -o "https://[a-zA-Z0-9.-]*\.trycloudflare.com" /tmp/quill_tunnel.log | head -n 1)

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  SCANNABLE LLM ENDPOINT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
qrencode -t utf8 "$TUNNEL_URL/v1"
echo ""
echo "  URL: $TUNNEL_URL/v1"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Trap Ctrl+C to cleanly shut everything down
trap "echo ''; echo '🛑 Shutting down...'; kill $OLLAMA_PID $TUNNEL_PID 2>/dev/null; rm /tmp/quill_tunnel.log; exit 0" SIGINT SIGTERM

# Keep the script running
wait $TUNNEL_PID
