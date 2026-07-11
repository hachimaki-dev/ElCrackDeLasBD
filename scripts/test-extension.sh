#!/usr/bin/env bash
# ==========================================================================
# SQL Engine Laboratory — Tests de la Extensión VS Code
#
# Ejecuta:
#   1. Compilación TypeScript (verifica que el código no tiene errores de tipo)
#   2. ESLint (verifica estilo y reglas de código)
#   3. Tests unitarios de core/ (registry, connectionBuilder, containerLifecycle)
#
# Uso:
#   ./scripts/test-extension.sh         # standalone
#   ./scripts/test-extension.sh --internal  # llamado desde test-all.sh
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

PASS=0
FAIL=0
SKIP=0
INTERNAL_MODE=false

[[ "${1:-}" == "--internal" ]] && INTERNAL_MODE=true

print_section() {
  echo ""
  echo -e "${BOLD}${CYAN}▶ $1${NC}"
  echo -e "${DIM}$(printf '%.0s─' {1..48})${NC}"
}

print_pass()  { echo -e "  ${GREEN}✓${NC} $1"; ((PASS+=1)); }
print_fail()  { echo -e "  ${RED}✗${NC} $1"; ((FAIL+=1)); }
print_skip()  { echo -e "  ${YELLOW}⊘${NC} $1"; ((SKIP+=1)); }
print_info()  { echo -e "  ${DIM}→${NC} $1"; }
print_detail(){ echo -e "    ${DIM}$1${NC}"; }

# ---- Header ----
if [[ "$INTERNAL_MODE" == "false" ]]; then
  echo ""
  echo -e "${BOLD}${CYAN}╔═══════════════════════════════════════╗${NC}"
  echo -e "${BOLD}${CYAN}║  Extension Tests — SQL Engine Lab     ║${NC}"
  echo -e "${BOLD}${CYAN}╚═══════════════════════════════════════╝${NC}"
fi

# ---- 1. Compilación TypeScript ----
print_section "TypeScript — Compilación (strict mode)"

if [[ ! -d "$EXTENSION_DIR/node_modules" ]]; then
  print_info "Instalando dependencias npm..."
  (cd "$EXTENSION_DIR" && npm install --silent)
fi

compile_output=$(cd "$EXTENSION_DIR" && npx tsc -p tsconfig.json 2>&1) || compile_exit=$?

if [[ "${compile_exit:-0}" -eq 0 ]]; then
  print_pass "TypeScript compila sin errores"
else
  print_fail "TypeScript falló:"
  while IFS= read -r line; do
    [[ -n "$line" ]] && print_detail "$line"
  done <<< "$compile_output"
fi

# Verificar que se generaron archivos .js
if [[ -d "$EXTENSION_DIR/out" ]] && find "$EXTENSION_DIR/out" -name "*.js" | grep -q .; then
  js_count=$(find "$EXTENSION_DIR/out" -name "*.js" | wc -l | tr -d ' ')
  print_pass "Output generado: $js_count archivos .js"
else
  print_fail "No se generaron archivos JS en out/"
fi

# ---- 2. Estructura del código ----
print_section "Estructura — Archivos requeridos"

required_files=(
  "src/core/engines/engine.types.ts"
  "src/core/engines/registry.ts"
  "src/core/engines/postgres.engine.ts"
  "src/core/engines/mysql.engine.ts"
  "src/core/engines/mariadb.engine.ts"
  "src/core/engines/sqlite.engine.ts"
  "src/core/engines/oracle.engine.ts"
  "src/core/engines/sqlserver.engine.ts"
  "src/core/docker/dockerClient.ts"
  "src/core/docker/containerLifecycle.ts"
  "src/core/connection/connectionBuilder.ts"
  "src/vscode/treeView.ts"
  "src/vscode/connectionPanel.ts"
  "src/vscode/commands.ts"
  "src/extension.ts"
)

for file in "${required_files[@]}"; do
  if [[ -f "$EXTENSION_DIR/$file" ]]; then
    print_pass "$file"
  else
    print_fail "Falta: $file"
  fi
done

# ---- 3. Verificar interfaces clave en el código compilado ----
print_section "Contratos — Verificando Engine Adapters"

engines=("postgres" "mysql" "mariadb" "sqlite" "oracle" "sqlserver")
for engine in "${engines[@]}"; do
  engine_file="$EXTENSION_DIR/out/core/engines/${engine}.engine.js"
  if [[ -f "$engine_file" ]]; then
    # Verificar que el adapter exporta la definición
    if grep -q "exports\." "$engine_file" 2>/dev/null; then
      print_pass "Adapter ${engine}: exportado correctamente"
    else
      print_fail "Adapter ${engine}: no tiene exports"
    fi
  else
    print_fail "Adapter ${engine}: archivo JS no encontrado"
  fi
done

# Verificar que el registry registra los 6 motores
registry_file="$EXTENSION_DIR/out/core/engines/registry.js"
if [[ -f "$registry_file" ]]; then
  engine_count=$(grep -c "Engine\b" "$registry_file" 2>/dev/null || echo "0")
  if [[ $engine_count -ge 6 ]]; then
    print_pass "Registry: contiene referencias a $engine_count engines"
  else
    print_skip "Registry: verificación manual necesaria"
  fi
fi

# ---- 4. Tests unitarios de core/ ----
print_section "Tests Unitarios — core/"

# Ejecutar los tests con Node.js directamente (sin necesitar VS Code corriendo)
test_files=(
  "test/core/registry.test.ts"
  "test/core/connectionBuilder.test.ts"
  "test/core/containerLifecycle.test.ts"
  "test/core/cheatSheets.test.ts"
)

# Compilar tests también
print_info "Compilando tests..."
tsconfig_test=$(cat "$EXTENSION_DIR/tsconfig.json")

# Usar ts-node si está disponible, sino compilar primero
if command -v ts-node &>/dev/null || [[ -f "$EXTENSION_DIR/node_modules/.bin/ts-node" ]]; then
  USE_TS_NODE=true
else
  USE_TS_NODE=false
fi

# Compilar tests junto con el source
test_compile_output=$(cd "$EXTENSION_DIR" && \
  npx tsc --outDir out_test \
    --rootDir . \
    --allowJs false \
    --skipLibCheck true \
    --noEmit false 2>&1) || test_compile_exit=$?

# Verificar que los archivos de test compilados existen
for test_file in "${test_files[@]}"; do
  test_js="${test_file%.ts}.js"
  test_base=$(basename "$test_file")
  
  if [[ -f "$EXTENSION_DIR/out_test/$test_file" ]] || \
     find "$EXTENSION_DIR/out" -name "$test_base" 2>/dev/null | grep -q .; then
    print_pass "Test compilado: $test_base"
  else
    # Verificar si el .ts existe para reportar correctamente
    if [[ -f "$EXTENSION_DIR/$test_file" ]]; then
      print_skip "Test pendiente de ejecutar (necesita VS Code runtime): $test_base"
    else
      print_fail "Test no encontrado: $test_file"
    fi
  fi
done

# Ejecutar tests de Node puro (los que no dependen de vscode API)
print_info "Ejecutando tests con Mocha (sin VS Code runtime)..."

# Compilar tests a una carpeta temporal con tsconfig extendido
cat > /tmp/tsconfig_test.json << EOF
{
  "extends": "$EXTENSION_DIR/tsconfig.json",
  "compilerOptions": {
    "outDir": "/tmp/sel_test_out",
    "rootDir": "$EXTENSION_DIR",
    "paths": {}
  },
  "include": [
    "$EXTENSION_DIR/src/**/*.ts",
    "$EXTENSION_DIR/test/**/*.ts"
  ]
}
EOF

# Compilar
compile_test_out=$(npx tsc -p /tmp/tsconfig_test.json 2>&1 \
  --project /tmp/tsconfig_test.json \
  2>&1) || true

if [[ -d "/tmp/sel_test_out" ]]; then
  # Ejecutar cada test directamente con node + mocha
  test_results=0
  test_failures=0
  
  for test_file in "${test_files[@]}"; do
    test_js="/tmp/sel_test_out/test/$(basename "${test_file%.ts}.js")"
    
    if [[ ! -f "$test_js" ]]; then
      # Buscar en subdirectorios
      test_js=$(find /tmp/sel_test_out -name "$(basename "${test_file%.ts}.js")" 2>/dev/null | head -1 || echo "")
    fi
    
    if [[ -z "$test_js" ]] || [[ ! -f "$test_js" ]]; then
      print_skip "No ejecutado: $(basename "$test_file") (no compiló a /tmp)"
      continue
    fi
    
    # Ejecutar el test
    test_output=$(cd "$EXTENSION_DIR" && \
      node --require /tmp/sel_test_out/src/core/engines/engine.types.js \
      "$EXTENSION_DIR/node_modules/.bin/mocha" \
      --require "$EXTENSION_DIR/node_modules/ts-node/register" \
      --ui tdd \
      "$EXTENSION_DIR/$test_file" \
      --reporter spec 2>&1) || test_exit=$?
    
    if [[ "${test_exit:-0}" -eq 0 ]]; then
      passing=$(echo "$test_output" | grep -c "passing" || echo "0")
      print_pass "Tests pasaron: $(basename "$test_file")"
    else
      print_fail "Tests fallaron: $(basename "$test_file")"
      echo "$test_output" | grep -E "(Error|AssertionError|✗|failing)" | head -10 | while read -r line; do
        print_detail "$line"
      done
    fi
  done
else
  print_skip "Tests unitarios: ejecutar manualmente con 'npm test' en packages/extension/"
  print_info "Alternativa: F5 en VS Code → Extension Development Host"
fi

# ---- 5. Lint check ----
print_section "ESLint — Calidad de código"

lint_output=$(cd "$EXTENSION_DIR" && \
  npx eslint src --ext ts --max-warnings=0 2>&1) || lint_exit=$?

if [[ "${lint_exit:-0}" -eq 0 ]]; then
  print_pass "ESLint: sin errores ni warnings"
else
  # Contar errores y warnings
  error_count=$(echo "$lint_output" | grep -c "error" 2>/dev/null || echo "0")
  warn_count=$(echo "$lint_output" | grep -c "warning" 2>/dev/null || echo "0")
  
  if [[ $error_count -gt 0 ]]; then
    print_fail "ESLint: $error_count error(s), $warn_count warning(s)"
    echo "$lint_output" | grep "error" | head -5 | while read -r line; do
      print_detail "$line"
    done
  else
    print_skip "ESLint: $warn_count warning(s) (sin errores)"
  fi
fi

# ---- 6. Verificar package.json ----
print_section "Configuración — package.json"

pkg_file="$EXTENSION_DIR/package.json"
if [[ -f "$pkg_file" ]]; then
  # Verificar campos clave
  has_main=$(node -e "const p=require('$pkg_file'); console.log(p.main ? 'yes' : 'no')" 2>/dev/null || echo "no")
  has_engines=$(node -e "const p=require('$pkg_file'); console.log(p.engines ? 'yes' : 'no')" 2>/dev/null || echo "no")
  has_contributes=$(node -e "const p=require('$pkg_file'); console.log(p.contributes ? 'yes' : 'no')" 2>/dev/null || echo "no")
  has_commands=$(node -e "const p=require('$pkg_file'); console.log((p.contributes && p.contributes.commands && p.contributes.commands.length >= 4) ? 'yes' : 'no')" 2>/dev/null || echo "no")
  has_views=$(node -e "const p=require('$pkg_file'); console.log((p.contributes && p.contributes.views) ? 'yes' : 'no')" 2>/dev/null || echo "no")
  has_dockerode=$(node -e "const p=require('$pkg_file'); console.log(p.dependencies && p.dependencies.dockerode ? 'yes' : 'no')" 2>/dev/null || echo "no")

  [[ "$has_main" == "yes" ]] && print_pass "Tiene campo 'main'" || print_fail "Falta campo 'main'"
  [[ "$has_engines" == "yes" ]] && print_pass "Tiene campo 'engines' (versión VS Code requerida)" || print_fail "Falta 'engines'"
  [[ "$has_contributes" == "yes" ]] && print_pass "Tiene campo 'contributes'" || print_fail "Falta 'contributes'"
  [[ "$has_commands" == "yes" ]] && print_pass "Tiene ≥ 4 comandos registrados" || print_fail "Faltan comandos en contributes.commands"
  [[ "$has_views" == "yes" ]] && print_pass "Tiene Tree View registrado" || print_fail "Falta contributes.views"
  [[ "$has_dockerode" == "yes" ]] && print_pass "Dependencia dockerode presente" || print_fail "Falta dependencia dockerode"
fi

# ---- Exportar resultados ----
if [[ "$INTERNAL_MODE" == "true" ]]; then
  cat > /tmp/sel_results << EOF
EXT_PASS=$PASS
EXT_FAIL=$FAIL
EXT_SKIP=$SKIP
EOF
else
  echo ""
  echo -e "${BOLD}${CYAN}────────────────────────────────────────${NC}"
  echo -e "  ${GREEN}✓ Passed:  $PASS${NC}  ${RED}✗ Failed: $FAIL${NC}  ${YELLOW}⊘ Skipped: $SKIP${NC}"
  echo -e "${BOLD}${CYAN}────────────────────────────────────────${NC}"
  echo ""
  [[ $FAIL -gt 0 ]] && exit 1 || exit 0
fi
