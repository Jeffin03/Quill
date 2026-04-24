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

# Start Cloudflare tunnel and capture the URL
echo "🌐 Starting Cloudflare Tunnel..."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Your tunnel URL will appear below."
echo "  Copy it and paste into Quill Settings"
echo "  as: https://xxxx.trycloudflare.com/v1"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Trap Ctrl+C to cleanly shut everything down
trap "echo ''; echo '🛑 Shutting down...'; kill $OLLAMA_PID 2>/dev/null; exit 0" SIGINT SIGTERM

cloudflared tunnel --url http://localhost:11434

# If cloudflared exits, also kill Ollama
kill $OLLAMA_PID 2>/dev/null
