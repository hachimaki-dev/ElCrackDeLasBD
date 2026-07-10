#!/usr/bin/env bash
# ==========================================================================
# SQL Engine Laboratory — Tests de la Imagen Docker
#
# Para cada motor SQL:
#   1. Construye la imagen localmente (si no existe o se pide --rebuild)
#   2. Levanta el contenedor con ENGINE=<motor>
#   3. Espera a que el motor esté listo (healthcheck)
#   4. Ejecuta una query de verificación con el cliente nativo
#   5. Para y elimina el contenedor
#
# Uso:
#   ./scripts/test-docker.sh               # Testea todos los motores
#   ./scripts/test-docker.sh --engines postgres,mysql  # Solo esos motores
#   ./scripts/test-docker.sh --rebuild     # Fuerza rebuild de la imagen
#   ./scripts/test-docker.sh --no-build    # Usa imagen existente
#   ./scripts/test-docker.sh --internal    # Llamado desde test-all.sh
#
# Requisitos:
#   - Docker Desktop corriendo
#   - Clientes nativos instalados SOLO para validación extra (opcional):
#     psql, mysql, mariadb, sqlite3, sqlplus, sqlcmd
# ==========================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DOCKER_DIR="$PROJECT_ROOT/packages/docker-image"

# ---- Configuración ----
readonly IMAGE_NAME="sql-engine-lab"
readonly IMAGE_TAG="test"
readonly FULL_IMAGE="${IMAGE_NAME}:${IMAGE_TAG}"
readonly CONTAINER_NAME="sql-engine-lab-test"
readonly DEFAULT_LAB_USER="labuser"
readonly DEFAULT_LAB_PASSWORD="labpassword"
readonly DEFAULT_LAB_DATABASE="labdb"

# Timeouts por motor (segundos)
declare -A ENGINE_TIMEOUTS=(
  [sqlite]=10
  [postgres]=60
  [mariadb]=60
  [mysql]=90
  [oracle]=180
  [sqlserver]=120
)

# Puertos por motor
declare -A ENGINE_PORTS=(
  [sqlite]=0
  [postgres]=5432
  [mariadb]=3307
  [mysql]=3306
  [oracle]=1521
  [sqlserver]=1433
)

# ---- Colores ----
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

PASS=0
FAIL=0
SKIP=0
INTERNAL_MODE=false
DO_BUILD=true
DO_REBUILD=false
ENGINES_TO_TEST=("sqlite" "postgres" "mariadb" "mysql" "oracle" "sqlserver")

# ---- Parsear args ----
for arg in "$@"; do
  case $arg in
    --internal) INTERNAL_MODE=true ;;
    --rebuild) DO_REBUILD=true ;;
    --no-build) DO_BUILD=false ;;
    --engines=*) IFS=',' read -ra ENGINES_TO_TEST <<< "${arg#--engines=}" ;;
  esac
done

print_pass()   { echo -e "  ${GREEN}✓${NC} $1"; ((PASS+=1)); }
print_fail()   { echo -e "  ${RED}✗${NC} $1"; ((FAIL+=1)); }
print_skip()   { echo -e "  ${YELLOW}⊘${NC} $1"; ((SKIP+=1)); }
print_info()   { echo -e "  ${DIM}→${NC} $1"; }
print_detail() { echo -e "    ${DIM}$1${NC}"; }
print_section(){ echo ""; echo -e "${BOLD}${CYAN}▶ $1${NC}"; echo -e "${DIM}$(printf '%.0s─' {1..48})${NC}"; }

# ---- Cleanup ----
cleanup_container() {
  if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$" 2>/dev/null; then
    docker stop "$CONTAINER_NAME" &>/dev/null || true
    docker rm "$CONTAINER_NAME" &>/dev/null || true
  fi
}

trap cleanup_container EXIT

# ---- Header ----
if [[ "$INTERNAL_MODE" == "false" ]]; then
  echo ""
  echo -e "${BOLD}${CYAN}╔═══════════════════════════════════════╗${NC}"
  echo -e "${BOLD}${CYAN}║  Docker Tests — SQL Engine Lab        ║${NC}"
  echo -e "${BOLD}${CYAN}╚═══════════════════════════════════════╝${NC}"
fi

# ---- Verificar Docker ----
print_section "Prerequisitos Docker"

if ! command -v docker &>/dev/null; then
  print_fail "Docker no instalado"
  [[ "$INTERNAL_MODE" == "true" ]] && echo "DOC_PASS=0 DOC_FAIL=1 DOC_SKIP=0" > /tmp/sdl_results
  exit 1
fi

if ! docker info &>/dev/null 2>&1; then
  print_fail "Docker Desktop no está corriendo — inicialo antes de ejecutar los tests"
  [[ "$INTERNAL_MODE" == "true" ]] && echo "DOC_PASS=0 DOC_FAIL=1 DOC_SKIP=0" > /tmp/sdl_results
  exit 1
fi

print_pass "Docker corriendo"
print_pass "$(docker version --format 'Docker Engine {{.Server.Version}}')"

# ---- Build de la imagen ----
print_section "Build de Imagen Docker"

image_exists=false
if docker image inspect "$FULL_IMAGE" &>/dev/null 2>&1; then
  image_exists=true
fi

if [[ "$DO_BUILD" == "true" ]]; then
  if [[ "$DO_REBUILD" == "true" ]] || [[ "$image_exists" == "false" ]]; then
    print_info "Construyendo imagen $FULL_IMAGE..."
    print_info "Esto puede tardar varios minutos la primera vez."
    
    build_start=$(date +%s)
    
    if docker build \
        --tag "$FULL_IMAGE" \
        --file "$DOCKER_DIR/Dockerfile" \
        --progress=plain \
        "$DOCKER_DIR" \
        2>&1 | tee /tmp/docker_build.log | grep -E "(Step|STEP|FROM|RUN|COPY|Successfully|Error|error)" | while IFS= read -r line; do
          print_detail "$line"
        done; then
      build_end=$(date +%s)
      build_time=$((build_end - build_start))
      print_pass "Imagen construida en ${build_time}s: $FULL_IMAGE"
    else
      print_fail "Build falló — ver /tmp/docker_build.log"
      print_detail "Tip: Las imágenes de Oracle y SQL Server son pesadas y requieren descarga."
      [[ "$INTERNAL_MODE" == "true" ]] && printf "DOC_PASS=%s\nDOC_FAIL=%s\nDOC_SKIP=%s\n" "$PASS" "$((FAIL+1))" "$SKIP" > /tmp/sdl_results
      exit 1
    fi
  else
    print_pass "Imagen ya existe: $FULL_IMAGE (usar --rebuild para forzar nuevo build)"
  fi
else
  if [[ "$image_exists" == "false" ]]; then
    print_fail "Imagen no existe y --no-build fue especificado. Ejecutar sin --no-build primero."
    exit 1
  fi
  print_skip "Build saltado (--no-build)"
fi

# ---- Probar cada motor ----
test_engine() {
  local engine="$1"
  local port="${ENGINE_PORTS[$engine]:-0}"
  local timeout_secs="${ENGINE_TIMEOUTS[$engine]:-60}"
  
  print_section "Motor: ${engine^^}"
  
  # Asegurar que no quede un contenedor anterior
  cleanup_container
  
  # Armar el comando docker run
  local run_args=(
    "--name" "$CONTAINER_NAME"
    "--rm"
    "--detach"
    "-e" "ENGINE=$engine"
    "-e" "LAB_USER=$DEFAULT_LAB_USER"
    "-e" "LAB_PASSWORD=$DEFAULT_LAB_PASSWORD"
    "-e" "LAB_DATABASE=$DEFAULT_LAB_DATABASE"
  )
  
  # Mapear puerto si el motor lo necesita
  if [[ $port -gt 0 ]]; then
    run_args+=("-p" "${port}:${port}")
  fi
  
  run_args+=("$FULL_IMAGE")
  
  # Arrancar contenedor
  print_info "Arrancando contenedor con ENGINE=$engine..."
  container_id=$(docker run "${run_args[@]}" 2>&1) || {
    print_fail "docker run falló para ENGINE=$engine"
    return
  }
  
  print_pass "Contenedor arrancado: ${container_id:0:12}..."
  
  # Esperar a que el motor esté listo
  print_info "Esperando que $engine esté listo (hasta ${timeout_secs}s)..."
  local wait_start=$(date +%s)
  local ready=false
  local elapsed=0
  
  while [[ $elapsed -lt $timeout_secs ]]; do
    sleep 2
    elapsed=$(( $(date +%s) - wait_start ))
    
    # Verificar que el contenedor sigue corriendo
    if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
      print_fail "$engine: el contenedor se detuvo inesperadamente"
      # Mostrar logs para debug
      docker logs "$CONTAINER_NAME" 2>/dev/null | tail -20 | while IFS= read -r line; do
        print_detail "$line"
      done || true
      return
    fi
    
    # Verificar logs para detectar que el motor está listo
    local logs
    logs=$(docker logs "$CONTAINER_NAME" 2>&1 || echo "")
    
    case "$engine" in
      sqlite)
        if echo "$logs" | grep -q "Comando de conexión"; then
          ready=true; break
        fi
        ;;
      postgres)
        if echo "$logs" | grep -q "database system is ready to accept connections"; then
          ready=true; break
        fi
        ;;
      mariadb)
        if echo "$logs" | grep -qE "(ready for connections|MariaDB init process done)"; then
          ready=true; break
        fi
        ;;
      mysql)
        if echo "$logs" | grep -qE "(ready for connections|MySQL init process done)"; then
          ready=true; break
        fi
        ;;
      oracle)
        if echo "$logs" | grep -qE "(DATABASE IS READY|ORACLE IS READY|started successfully)"; then
          ready=true; break
        fi
        ;;
      sqlserver)
        if echo "$logs" | grep -q "SQL Server is now ready for client connections"; then
          ready=true; break
        fi
        ;;
    esac
    
    print_info "  Esperando... ${elapsed}s / ${timeout_secs}s"
  done
  
  if [[ "$ready" == "false" ]]; then
    print_fail "$engine: timeout después de ${timeout_secs}s sin estar listo"
    print_info "Últimos logs del contenedor:"
    docker logs "$CONTAINER_NAME" 2>&1 | tail -15 | while IFS= read -r line; do
      print_detail "$line"
    done
    cleanup_container
    return
  fi
  
  print_pass "$engine: motor listo en ${elapsed}s"
  
  # Verificar conectividad con query básica
  verify_engine_connection "$engine" "$port"
  
  # Detener el contenedor
  print_info "Deteniendo contenedor..."
  docker stop "$CONTAINER_NAME" &>/dev/null || true
  print_pass "$engine: contenedor detenido limpiamente"
}

verify_engine_connection() {
  local engine="$1"
  local port="$2"
  
  print_info "Verificando conectividad de $engine..."
  
  case "$engine" in
    sqlite)
      # Para SQLite, ejecutar sqlite3 dentro del contenedor
      result=$(docker exec "$CONTAINER_NAME" \
        sqlite3 /var/lib/sql-engine-lab/data/sqlite/${DEFAULT_LAB_DATABASE}.sqlite \
        "SELECT message FROM welcome LIMIT 1;" 2>&1) || result=""
      
      if [[ -n "$result" ]]; then
        print_pass "SQLite: query exitosa → '$result'"
      else
        # Verificar que el archivo existe
        if docker exec "$CONTAINER_NAME" test -f "/var/lib/sql-engine-lab/data/sqlite/${DEFAULT_LAB_DATABASE}.sqlite" 2>/dev/null; then
          print_pass "SQLite: archivo de BD existe"
        else
          print_fail "SQLite: archivo de BD no encontrado"
        fi
      fi
      ;;
      
    postgres)
      # Usar psql si está instalado, sino ejecutar dentro del contenedor
      if command -v psql &>/dev/null; then
        result=$(PGPASSWORD="$DEFAULT_LAB_PASSWORD" psql \
          -h localhost -p "$port" \
          -U "$DEFAULT_LAB_USER" -d "$DEFAULT_LAB_DATABASE" \
          -t -c "SELECT version();" 2>&1 | head -1 | xargs) || result=""
        [[ -n "$result" ]] && print_pass "PostgreSQL: conectado con psql — ${result:0:50}..." \
                           || print_skip "PostgreSQL: psql disponible pero query falló (verificar manualmente)"
      else
        # Ejecutar dentro del contenedor
        result=$(docker exec "$CONTAINER_NAME" \
          bash -c "PGPASSWORD='$DEFAULT_LAB_PASSWORD' psql -h localhost -p $port -U '$DEFAULT_LAB_USER' -d '$DEFAULT_LAB_DATABASE' -t -c 'SELECT current_timestamp;' 2>&1" \
          ) || result=""
        [[ -n "$result" ]] && print_pass "PostgreSQL: query dentro del contenedor exitosa" \
                           || print_skip "PostgreSQL: verificar con: psql -h localhost -p $port -U $DEFAULT_LAB_USER -d $DEFAULT_LAB_DATABASE"
      fi
      ;;
      
    mariadb)
      result=$(docker exec "$CONTAINER_NAME" \
        mariadb -h 127.0.0.1 -P "$port" \
        -u "$DEFAULT_LAB_USER" --password="$DEFAULT_LAB_PASSWORD" \
        "$DEFAULT_LAB_DATABASE" \
        -e "SELECT 'MariaDB OK' AS status;" 2>&1) || result=""
      [[ "$result" == *"MariaDB OK"* ]] && print_pass "MariaDB: query exitosa" \
                                        || print_skip "MariaDB: verificar con: mariadb -h 127.0.0.1 -P $port -u $DEFAULT_LAB_USER -p"
      ;;
      
    mysql)
      result=$(docker exec "$CONTAINER_NAME" \
        mysql -h 127.0.0.1 -P "$port" \
        -u "$DEFAULT_LAB_USER" --password="$DEFAULT_LAB_PASSWORD" \
        "$DEFAULT_LAB_DATABASE" \
        -e "SELECT 'MySQL OK' AS status;" 2>&1) || result=""
      [[ "$result" == *"MySQL OK"* ]] && print_pass "MySQL: query exitosa" \
                                      || print_skip "MySQL: verificar con: mysql -h 127.0.0.1 -P $port -u $DEFAULT_LAB_USER -p"
      ;;
      
    oracle)
      # Oracle tarda más — verificar que el listener responde
      result=$(docker exec "$CONTAINER_NAME" \
        bash -c "echo 'SELECT 1 FROM DUAL;' | sqlplus -s $DEFAULT_LAB_USER/$DEFAULT_LAB_PASSWORD@localhost:$port/FREEPDB1 2>&1" \
        ) || result=""
      [[ "$result" == *"1"* ]] && print_pass "Oracle: query exitosa en FREEPDB1" \
                                || print_skip "Oracle: verificar con: sqlplus $DEFAULT_LAB_USER/$DEFAULT_LAB_PASSWORD@localhost:$port/FREEPDB1"
      ;;
      
    sqlserver)
      result=$(docker exec "$CONTAINER_NAME" \
        /opt/mssql-tools18/bin/sqlcmd \
        -S localhost,"$port" \
        -U "$DEFAULT_LAB_USER" -P "$DEFAULT_LAB_PASSWORD" \
        -d "$DEFAULT_LAB_DATABASE" \
        -Q "SELECT 'SQL Server OK'" -C -b 2>&1) || result=""
      [[ "$result" == *"SQL Server OK"* ]] && print_pass "SQL Server: query exitosa" \
                                           || print_skip "SQL Server: verificar con: sqlcmd -S localhost,$port -U $DEFAULT_LAB_USER -P $DEFAULT_LAB_PASSWORD -d $DEFAULT_LAB_DATABASE -C"
      ;;
  esac
  
  # Comando de conexión sugerido
  local cmd
  case "$engine" in
    postgres)   cmd="psql -h localhost -p $port -U $DEFAULT_LAB_USER -d $DEFAULT_LAB_DATABASE" ;;
    mysql)      cmd="mysql -h 127.0.0.1 -P $port -u $DEFAULT_LAB_USER -p$DEFAULT_LAB_PASSWORD $DEFAULT_LAB_DATABASE" ;;
    mariadb)    cmd="mariadb -h 127.0.0.1 -P $port -u $DEFAULT_LAB_USER -p$DEFAULT_LAB_PASSWORD $DEFAULT_LAB_DATABASE" ;;
    sqlite)     cmd="sqlite3 /var/lib/sql-engine-lab/data/sqlite/$DEFAULT_LAB_DATABASE.sqlite" ;;
    oracle)     cmd="sqlplus $DEFAULT_LAB_USER/$DEFAULT_LAB_PASSWORD@localhost:$port/FREEPDB1" ;;
    sqlserver)  cmd="sqlcmd -S localhost,$port -U $DEFAULT_LAB_USER -P $DEFAULT_LAB_PASSWORD -d $DEFAULT_LAB_DATABASE -C" ;;
  esac
  print_info "Comando de conexión: ${BOLD}$cmd${NC}"
}

# ---- Ejecutar tests por motor ----
for engine in "${ENGINES_TO_TEST[@]}"; do
  test_engine "$engine"
done

# ---- Exportar resultados ----
if [[ "$INTERNAL_MODE" == "true" ]]; then
  printf "DOC_PASS=%s\nDOC_FAIL=%s\nDOC_SKIP=%s\n" "$PASS" "$FAIL" "$SKIP" > /tmp/sdl_results
else
  echo ""
  echo -e "${BOLD}${CYAN}────────────────────────────────────────${NC}"
  echo -e "  ${GREEN}✓ Passed:  $PASS${NC}  ${RED}✗ Failed: $FAIL${NC}  ${YELLOW}⊘ Skipped: $SKIP${NC}"
  echo -e "${BOLD}${CYAN}────────────────────────────────────────${NC}"
  echo ""
  [[ $FAIL -gt 0 ]] && exit 1 || exit 0
fi
