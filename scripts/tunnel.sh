#!/usr/bin/env bash
# Expose the local Idea Platform through a named Cloudflare Tunnel
# on your zone: https://idea.z-agent.ccwu.cc
#
# Usage:
#   ./scripts/tunnel.sh              # start named tunnel (starts Next.js if needed)
#   ./scripts/tunnel.sh --dev        # always start `npm run dev` then tunnel
#   ./scripts/tunnel.sh --quick      # fallback: random *.trycloudflare.com
#   PORT=3001 ./scripts/tunnel.sh
set -euo pipefail

PORT="${PORT:-3001}"
HOSTNAME="${TUNNEL_HOSTNAME:-idea.z-agent.ccwu.cc}"
TOKEN_FILE="${CLOUDFLARED_TOKEN_FILE:-$HOME/.cloudflared/idea-platform.token}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

START_DEV=0
QUICK=0
for arg in "$@"; do
  case "$arg" in
    --dev|-d) START_DEV=1 ;;
    --quick|-q) QUICK=1 ;;
    --help|-h)
      sed -n '2,12p' "$0"
      exit 0
      ;;
  esac
done

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "未找到 cloudflared。macOS 安装："
  echo "  brew install cloudflared"
  exit 1
fi

APP_PID=""
TUNNEL_PID=""
cleanup() {
  if [[ -n "${TUNNEL_PID}" ]] && kill -0 "$TUNNEL_PID" 2>/dev/null; then
    kill "$TUNNEL_PID" 2>/dev/null || true
  fi
  if [[ -n "${APP_PID}" ]] && kill -0 "$APP_PID" 2>/dev/null; then
    kill "$APP_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

port_bound() {
  lsof -nP -iTCP:"${PORT}" -sTCP:LISTEN >/dev/null 2>&1
}

http_ready() {
  curl -sf -o /dev/null --max-time 2 "http://127.0.0.1:${PORT}/"
}

if port_bound; then
  echo "端口 ${PORT} 已被占用，等待 HTTP 就绪…"
  for _ in $(seq 1 20); do
    if http_ready; then
      break
    fi
    sleep 0.5
  done
  if ! http_ready; then
    echo "http://127.0.0.1:${PORT} 没有正常响应。确认 Next.js 已启动。"
    exit 1
  fi
elif [[ "$START_DEV" -eq 1 ]] || [[ "${AUTO_START:-1}" -eq 1 ]]; then
  echo "本地 ${PORT} 未就绪，正在启动 Next.js…"
  npm run dev -- --port "$PORT" >/tmp/idea-platform-next.log 2>&1 &
  APP_PID=$!
  for _ in $(seq 1 60); do
    if http_ready; then
      break
    fi
    if ! kill -0 "$APP_PID" 2>/dev/null; then
      echo "Next.js 启动失败，见 /tmp/idea-platform-next.log"
      exit 1
    fi
    sleep 1
  done
  if ! http_ready; then
    echo "等待 Next.js 超时，见 /tmp/idea-platform-next.log"
    exit 1
  fi
else
  echo "http://127.0.0.1:${PORT} 没有服务。先运行 npm run dev，或加上 --dev。"
  exit 1
fi

LOG="/tmp/idea-platform-tunnel.log"
: >"$LOG"

if [[ "$QUICK" -eq 0 ]] && [[ -f "$TOKEN_FILE" ]]; then
  echo "正在连接命名隧道 → https://${HOSTNAME}"
  cloudflared tunnel --no-autoupdate run --token-file "$TOKEN_FILE" >>"$LOG" 2>&1 &
  TUNNEL_PID=$!
  URL="https://${HOSTNAME}"
  echo "$URL" >"$ROOT/.tunnel-url"
  sleep 2
  if ! kill -0 "$TUNNEL_PID" 2>/dev/null; then
    echo "cloudflared 退出，日志："
    cat "$LOG"
    exit 1
  fi
  echo
  echo "公网地址： $URL"
  echo "本地地址： http://127.0.0.1:${PORT}"
  echo
  echo "Ctrl+C 结束隧道。"
  wait "$TUNNEL_PID"
  exit $?
fi

if [[ "$QUICK" -eq 0 ]]; then
  echo "未找到命名隧道 token：$TOKEN_FILE"
  echo "改用快速隧道 *.trycloudflare.com（加 --quick 可跳过这句提示）。"
fi

echo "正在通过 Cloudflare 快速隧道暴露 http://127.0.0.1:${PORT} …"
cloudflared tunnel --no-autoupdate --url "http://127.0.0.1:${PORT}" >>"$LOG" 2>&1 &
TUNNEL_PID=$!

URL=""
for _ in $(seq 1 40); do
  if ! kill -0 "$TUNNEL_PID" 2>/dev/null; then
    echo "cloudflared 退出，日志："
    cat "$LOG"
    exit 1
  fi
  URL="$(grep -Eo 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG" | tail -n 1 || true)"
  if [[ -n "$URL" ]]; then
    break
  fi
  sleep 0.4
done

if [[ -z "$URL" ]]; then
  echo "未能解析公网地址，完整日志："
  cat "$LOG"
  exit 1
fi

echo "$URL" >"$ROOT/.tunnel-url"
echo
echo "公网地址： $URL"
echo "本地地址： http://127.0.0.1:${PORT}"
echo
echo "Ctrl+C 结束隧道。任何拿到这个 URL 的人都可以访问当前本地服务。"
wait "$TUNNEL_PID"
