#!/usr/bin/env bash
# ==========================================================================
# SQL Engine Laboratory — Script de Pruebas Maestro
#
# Uso:
#   ./scripts/test-all.sh              # Ejecuta todo
#   ./scripts/test-all.sh --no-docker  # Solo tests de extensión (sin Docker)
#   ./scripts/test-all.sh --only docker # Solo tests Docker
#   ./scripts/test-all.sh --only extension # Solo tests de extensión
#
# Requisitos:
#   - Docker Desktop corriendo (para tests Docker)
#   - Node.js 18+ instalado
#   - Las dependencias npm deben estar instaladas (npm install en packages/extension/)
# ==========================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# ---- Colores ----
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

# ---- Tracking de resultados ----
PASS=0
FAIL=0
SKIP=0
START_TIME=$(date +%s)

# ---- Opciones ----
RUN_DOCKER=true
RUN_EXTENSION=true
ONLY_SUITE=""

for arg in "$@"; do
  case $arg in
    --no-docker) RUN_DOCKER=false ;;
    --only) shift; ONLY_SUITE="${1:-}" ;;
    --only=*) ONLY_SUITE="${arg#--only=}" ;;
  esac
done

if [[ -n "$ONLY_SUITE" ]]; then
  case "$ONLY_SUITE" in
    docker) RUN_EXTENSION=false ;;
    extension) RUN_DOCKER=false ;;
    *) echo -e "${RED}Opción --only inválida: $ONLY_SUITE${NC}" && exit 1 ;;
  esac
fi

# ---- Funciones de UI ----
print_header() {
  echo ""
  echo -e "${BOLD}${CYAN}╔════════════════════════════════════════════════╗${NC}"
  echo -e "${BOLD}${CYAN}║   SQL Engine Laboratory — Test Suite           ║${NC}"
  echo -e "${BOLD}${CYAN}╚════════════════════════════════════════════════╝${NC}"
  echo ""
}

print_section() {
  echo ""
  echo -e "${BOLD}${CYAN}▶ $1${NC}"
  echo -e "${DIM}$(printf '%.0s─' {1..50})${NC}"
}

print_pass() { echo -e "  ${GREEN}✓${NC} $1"; ((PASS+=1)); }
print_fail() { echo -e "  ${RED}✗${NC} $1"; ((FAIL+=1)); }
print_skip() { echo -e "  ${YELLOW}⊘${NC} $1"; ((SKIP+=1)); }
print_info() { echo -e "  ${DIM}→${NC} $1"; }

print_summary() {
  local end_time=$(date +%s)
  local elapsed=$((end_time - START_TIME))
  echo ""
  echo -e "${BOLD}${CYAN}═══════════════════════════════════════════════${NC}"
  echo -e "${BOLD} Resumen de Tests${NC}"
  echo -e "${CYAN}───────────────────────────────────────────────${NC}"
  echo -e "  ${GREEN}✓ Passed:  $PASS${NC}"
  echo -e "  ${RED}✗ Failed:  $FAIL${NC}"
  echo -e "  ${YELLOW}⊘ Skipped: $SKIP${NC}"
  echo -e "  ${DIM}⏱ Tiempo:  ${elapsed}s${NC}"
  echo -e "${CYAN}═══════════════════════════════════════════════${NC}"
  echo ""

  if [[ $FAIL -gt 0 ]]; then
    echo -e "${RED}${BOLD}❌ TEST SUITE FALLIDA ($FAIL fallo/s)${NC}"
    exit 1
  else
    echo -e "${GREEN}${BOLD}✅ TODOS LOS TESTS PASARON${NC}"
    exit 0
  fi
}

# ---- Verificar prerequisitos ----
check_prerequisites() {
  print_section "Verificando Prerequisitos"

  # Node.js
  if command -v node &>/dev/null; then
    local node_version
    node_version=$(node --version)
    print_pass "Node.js $node_version"
  else
    print_fail "Node.js no encontrado — instalar desde https://nodejs.org"
    FAIL=$((FAIL + 99)) # forzar fallo
    return 1
  fi

  # npm
  if command -v npm &>/dev/null; then
    print_pass "npm $(npm --version)"
  else
    print_fail "npm no encontrado"
    return 1
  fi

  # node_modules de la extensión
  if [[ -d "$PROJECT_ROOT/packages/extension/node_modules" ]]; then
    print_pass "Dependencias npm instaladas"
  else
    print_info "Instalando dependencias npm..."
    if (cd "$PROJECT_ROOT/packages/extension" && npm install --silent); then
      print_pass "Dependencias npm instaladas"
    else
      print_fail "Error instalando dependencias npm"
      return 1
    fi
  fi

  # Docker (solo si se van a correr tests Docker)
  if [[ "$RUN_DOCKER" == "true" ]]; then
    if command -v docker &>/dev/null; then
      if docker info &>/dev/null 2>&1; then
        print_pass "Docker corriendo ($(docker version --format '{{.Server.Version}}' 2>/dev/null || echo 'versión desconocida'))"
      else
        print_skip "Docker instalado pero no corriendo — tests Docker se saltarán"
        RUN_DOCKER=false
      fi
    else
      print_skip "Docker no instalado — tests Docker se saltarán"
      RUN_DOCKER=false
    fi
  fi
}

# ---- Correr cada suite ----
main() {
  print_header

  check_prerequisites || true

  if [[ "$RUN_EXTENSION" == "true" ]]; then
    bash "$SCRIPT_DIR/test-extension.sh" --internal
    # Leer resultados del archivo temporal
    if [[ -f /tmp/sel_results ]]; then
      source /tmp/sel_results
      PASS=$((PASS + EXT_PASS))
      FAIL=$((FAIL + EXT_FAIL))
      SKIP=$((SKIP + EXT_SKIP))
      rm -f /tmp/sel_results
    fi
  fi

  if [[ "$RUN_DOCKER" == "true" ]]; then
    bash "$SCRIPT_DIR/test-docker.sh" --internal
    # Leer resultados del archivo temporal
    if [[ -f /tmp/sdl_results ]]; then
      source /tmp/sdl_results
      PASS=$((PASS + DOC_PASS))
      FAIL=$((FAIL + DOC_FAIL))
      SKIP=$((SKIP + DOC_SKIP))
      rm -f /tmp/sdl_results
    fi
  fi

  print_summary
}

main "$@"
