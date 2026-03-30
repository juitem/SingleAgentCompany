#!/bin/bash
# ============================================================
# SingleAgentCompany UX 서버 실행
# 로컬 네트워크에서 접근 가능한 웹서버를 시작합니다.
#
# 사용법: bash serve.sh [포트]
# 기본 포트: 8080
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PORT="${1:-8080}"

# 로컬 IP 확인
get_local_ip() {
  if [[ "$OSTYPE" == "darwin"* ]]; then
    ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "localhost"
  else
    hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost"
  fi
}

LOCAL_IP=$(get_local_ip)

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  SingleAgentCompany UX 서버 시작         ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "  로컬:    http://localhost:$PORT"
echo "  네트워크: http://$LOCAL_IP:$PORT"
echo ""
echo "  같은 Wi-Fi의 다른 기기에서 위 주소로 접속하세요."
echo "  종료: Ctrl+C"
echo ""

cd "$SCRIPT_DIR/ux"
python3 -m http.server "$PORT"
