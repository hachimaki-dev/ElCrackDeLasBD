#!/usr/bin/env bash
# ==========================================================================
# SQL Engine Laboratory — Setup y Verificación del Entorno
#
# Verifica e instala todos los prerequisitos necesarios para desarrollar
# y testear el proyecto:
#
#   - Node.js 18+ y npm
#   - Docker Desktop (solo verifica, no instala)
#   - Dependencias npm de la extensión
#   - docker buildx (para build multi-arquitectura)
#   - Clientes nativos de cada motor (solo verifica, recomienda instalar)
#
# Uso:
#   ./scripts/setup.sh          # Verificar e instalar lo que sea automático
#   ./scripts/setup.sh --check  # Solo verificar, sin instalar nada
# ==========================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
EXTENSION_DIR="$PROJECT_ROOT/packages/extension"

# ---- Colores ----
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

CHECK_ONLY=false
[[ "${1:-}" == "--check" ]] && CHECK_ONLY=true

ISSUES=0

pass()  { echo -e "  ${GREEN}✓${NC} $1"; }
fail()  { echo -e "  ${RED}✗${NC} $1"; ((ISSUES+=1)); }
warn()  { echo -e "  ${YELLOW}⚠${NC} $1"; }
info()  { echo -e "  ${DIM}→${NC} $1"; }
section(){ echo ""; echo -e "${BOLD}${CYAN}▶ $1${NC}"; echo -e "${DIM}$(printf '%.0s─' {1..48})${NC}"; }

echo ""
echo -e "${BOLD}${CYAN}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║  SQL Engine Laboratory — Setup & Check         ║${NC}"
echo -e "${BOLD}${CYAN}╚════════════════════════════════════════════════╝${NC}"

# ---- Node.js ----
section "Node.js y npm"

if command -v node &>/dev/null; then
  node_version_full=$(node --version)
  node_major=$(node -e "console.log(process.versions.node.split('.')[0])")
  if [[ $node_major -ge 18 ]]; then
    pass "Node.js $node_version_full (≥ 18 requerido)"
  else
    fail "Node.js $node_version_full — se requiere v18+. Instalar desde https://nodejs.org"
  fi
else
  fail "Node.js no encontrado. Instalar desde https://nodejs.org"
fi

if command -v npm &>/dev/null; then
  pass "npm $(npm --version)"
else
  fail "npm no encontrado (se instala con Node.js)"
fi

# ---- Dependencias npm del Webview UI ----
section "Dependencias npm (packages/webview-ui)"

WEBVIEW_DIR="$PROJECT_ROOT/packages/webview-ui"

if [[ -d "$WEBVIEW_DIR/node_modules" ]]; then
  pass "webview-ui: node_modules/ presente"
else
  if [[ "$CHECK_ONLY" == "false" ]]; then
    info "Instalando dependencias de webview-ui..."
    if (cd "$WEBVIEW_DIR" && npm install); then
      pass "Dependencias de webview-ui instaladas correctamente"
    else
      fail "npm install en webview-ui falló"
    fi
  else
    fail "webview-ui: node_modules/ no encontrado. Ejecutar: cd packages/webview-ui && npm install"
  fi
fi

# ---- Construcción de webview-ui ----
section "Construcción de webview-ui"

if [[ "$CHECK_ONLY" == "false" ]]; then
  info "Construyendo webview-ui..."
  if (cd "$WEBVIEW_DIR" && npm run build); then
    pass "webview-ui construido correctamente"
  else
    fail "npm run build en webview-ui falló"
  fi
else
  info "Modo check-only: omitiendo build de webview-ui"
fi

# ---- Dependencias npm de la extensión ----
section "Dependencias npm (packages/extension)"

if [[ -d "$EXTENSION_DIR/node_modules" ]]; then
  # Verificar que dockerode está instalado
  if [[ -d "$EXTENSION_DIR/node_modules/dockerode" ]]; then
    dockerode_ver=$(node -e "console.log(require('$EXTENSION_DIR/node_modules/dockerode/package.json').version)" 2>/dev/null || echo "?")
    pass "dockerode $dockerode_ver instalado"
  else
    fail "dockerode no instalado"
  fi
  
  if [[ -d "$EXTENSION_DIR/node_modules/typescript" ]]; then
    ts_ver=$(node -e "console.log(require('$EXTENSION_DIR/node_modules/typescript/package.json').version)" 2>/dev/null || echo "?")
    pass "TypeScript $ts_ver instalado"
  else
    fail "TypeScript no instalado"
  fi
  
  pass "node_modules/ presente"
else
  if [[ "$CHECK_ONLY" == "false" ]]; then
    info "Instalando dependencias npm de la extensión..."
    if (cd "$EXTENSION_DIR" && npm install); then
      pass "Dependencias de la extensión instaladas correctamente"
    else
      fail "npm install de la extensión falló"
    fi
  else
    fail "node_modules/ no encontrado. Ejecutar: cd packages/extension && npm install"
  fi
fi

# ---- Compilación TypeScript ----
section "Compilación TypeScript"

compile_out=$(cd "$EXTENSION_DIR" && npx tsc -p tsconfig.json 2>&1) || compile_exit=$?

if [[ "${compile_exit:-0}" -eq 0 ]]; then
  js_count=$(find "$EXTENSION_DIR/out" -name "*.js" 2>/dev/null | wc -l | tr -d ' ')
  pass "Compilación exitosa ($js_count archivos generados en out/)"
else
  fail "TypeScript tiene errores de compilación:"
  echo "$compile_out" | head -10 | while IFS= read -r line; do
    info "  $line"
  done
fi

# ---- Docker ----
section "Docker"

if command -v docker &>/dev/null; then
  docker_client_ver=$(docker version --format '{{.Client.Version}}' 2>/dev/null || echo "?")
  pass "Docker CLI $docker_client_ver"
  
  if docker info &>/dev/null 2>&1; then
    docker_server_ver=$(docker version --format '{{.Server.Version}}' 2>/dev/null || echo "?")
    pass "Docker Engine $docker_server_ver (corriendo)"
  else
    fail "Docker no está corriendo — iniciar Docker Desktop"
  fi
  
  # Verificar buildx para multi-arquitectura
  if docker buildx version &>/dev/null 2>&1; then
    buildx_ver=$(docker buildx version | head -1)
    pass "docker buildx disponible ($buildx_ver)"
  else
    warn "docker buildx no disponible — no se podrán hacer builds multi-arquitectura"
    info "Instalar: https://github.com/docker/buildx"
  fi
else
  fail "Docker no instalado. Instalar desde https://www.docker.com/products/docker-desktop/"
fi

# ---- Clientes nativos SQL (opcionales) ----
section "Clientes nativos SQL (opcionales — para tests locales)"
info "Los tests Docker ejecutan queries dentro del contenedor si el cliente no está disponible."
echo ""

check_client() {
  local name="$1"
  local cmd="$2"
  local install_hint="$3"
  
  if command -v "$cmd" &>/dev/null; then
    local ver
    ver=$(bash -c "$cmd --version 2>&1 | head -1" 2>/dev/null || echo "versión desconocida")
    pass "$name ($cmd): $ver"
  else
    warn "$name ($cmd): no instalado"
    info "  Instalar: $install_hint"
  fi
}

check_client "PostgreSQL client" "psql" "brew install postgresql"
check_client "MySQL client" "mysql" "brew install mysql-client"
check_client "MariaDB client" "mariadb" "brew install mariadb-client"
check_client "SQLite3" "sqlite3" "brew install sqlite (o incluido en macOS)"
check_client "SQL*Plus (Oracle)" "sqlplus" "Descargar Oracle Instant Client: https://www.oracle.com/database/technologies/instant-client.html"
check_client "sqlcmd (SQL Server)" "sqlcmd" "brew install microsoft/mssql-release/mssql-tools18"

# ---- Estructura del repositorio ----
section "Estructura del Repositorio"

required_dirs=(
  "packages/docker-image"
  "packages/docker-image/engines/postgres"
  "packages/docker-image/engines/mysql"
  "packages/docker-image/engines/mariadb"
  "packages/docker-image/engines/sqlite"
  "packages/docker-image/engines/oracle"
  "packages/docker-image/engines/sqlserver"
  "packages/extension/src/core/engines"
  "packages/extension/src/core/docker"
  "packages/extension/src/core/connection"
  "packages/extension/src/vscode"
  "packages/extension/test/core"
  "decisions"
)

for dir in "${required_dirs[@]}"; do
  if [[ -d "$PROJECT_ROOT/$dir" ]]; then
    pass "$dir/"
  else
    fail "Directorio faltante: $dir/"
  fi
done

required_files=(
  "packages/docker-image/Dockerfile"
  "packages/docker-image/supervisord.conf"
  "packages/docker-image/entrypoint.sh"
  "packages/extension/src/extension.ts"
  "packages/extension/package.json"
  "packages/extension/tsconfig.json"
  "AGENTS.md"
  "ARCHITECTURE.md"
  "TASKS.md"
  "decisions/0001-un-motor-a-la-vez.md"
)

for file in "${required_files[@]}"; do
  if [[ -f "$PROJECT_ROOT/$file" ]]; then
    pass "$file"
  else
    fail "Archivo faltante: $file"
  fi
done

# ---- Permisos de scripts ----
section "Permisos de Scripts"

scripts=(
  "scripts/test-all.sh"
  "scripts/test-docker.sh"
  "scripts/test-extension.sh"
  "scripts/setup.sh"
  "packages/docker-image/entrypoint.sh"
  "packages/docker-image/engines/postgres/init.sh"
  "packages/docker-image/engines/mysql/init.sh"
  "packages/docker-image/engines/mariadb/init.sh"
  "packages/docker-image/engines/sqlite/init.sh"
  "packages/docker-image/engines/oracle/init.sh"
  "packages/docker-image/engines/sqlserver/init.sh"
)

for script in "${scripts[@]}"; do
  filepath="$PROJECT_ROOT/$script"
  if [[ -f "$filepath" ]]; then
    if [[ -x "$filepath" ]]; then
      pass "$script (ejecutable)"
    else
      if [[ "$CHECK_ONLY" == "false" ]]; then
        chmod +x "$filepath"
        pass "$script (permisos corregidos)"
      else
        fail "$script no tiene permisos de ejecución. Ejecutar: chmod +x $script"
      fi
    fi
  else
    warn "$script no encontrado"
  fi
done

# ---- Git ----
section "Git"

if [[ -d "$PROJECT_ROOT/.git" ]]; then
  pass "Repositorio git inicializado"
  commit_count=$(git -C "$PROJECT_ROOT" rev-list --count HEAD 2>/dev/null || echo "0")
  pass "$commit_count commits en el repositorio"
  last_commit=$(git -C "$PROJECT_ROOT" log -1 --format="%h %s" 2>/dev/null || echo "ninguno")
  info "Último commit: $last_commit"
else
  fail "Git no inicializado. Ejecutar: git init"
fi

# ---- Resumen ----
echo ""
echo -e "${BOLD}${CYAN}═══════════════════════════════════════════════${NC}"
if [[ $ISSUES -eq 0 ]]; then
  echo -e "${GREEN}${BOLD} ✅ Entorno listo — todos los checks pasaron${NC}"
  echo ""
  echo -e "${DIM} Próximos pasos:${NC}"
  echo -e "   ${CYAN}./scripts/test-extension.sh${NC}  → Tests de la extensión"
  echo -e "   ${CYAN}./scripts/test-docker.sh${NC}     → Tests de la imagen Docker"
  echo -e "   ${CYAN}./scripts/test-all.sh${NC}        → Todo junto"
else
  echo -e "${RED}${BOLD} ⚠ $ISSUES problema(s) encontrado(s)${NC}"
  echo -e "${DIM} Resolverlos antes de correr los tests.${NC}"
fi
echo -e "${CYAN}═══════════════════════════════════════════════${NC}"
echo ""
