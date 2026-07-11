#!/usr/bin/env bash
# ==========================================================================
# SQL Engine Laboratory — Entrypoint
#
# Lee la variable de entorno ENGINE, valida que sea un motor soportado,
# ejecuta el script de inicialización del motor seleccionado, y lanza
# supervisord para mantener el proceso del motor activo.
#
# Variables de entorno esperadas:
#   ENGINE       - Motor a arrancar (postgres|mysql|mariadb|sqlite|oracle|sqlserver)
#   LAB_USER     - Usuario de la BD (default: labuser)
#   LAB_PASSWORD - Password de la BD (default: labpassword)
#   LAB_DATABASE - Nombre de la BD (default: labdb)
# ==========================================================================

set -euo pipefail

# ---- Constantes ----
readonly SUPPORTED_ENGINES=("postgres" "mysql" "mariadb" "sqlite" "oracle" "sqlserver")
readonly ENGINES_DIR="/opt/sql-engine-lab/engines"
readonly LOG_DIR="/var/log/sql-engine-lab"
readonly DATA_DIR="/var/lib/sql-engine-lab/data"

# ---- Colores para output ----
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m' # No Color

log_info()  { echo -e "${CYAN}[SQL-ENGINE-LAB]${NC} ${GREEN}INFO${NC}  $*"; }
log_warn()  { echo -e "${CYAN}[SQL-ENGINE-LAB]${NC} ${YELLOW}WARN${NC}  $*"; }
log_error() { echo -e "${CYAN}[SQL-ENGINE-LAB]${NC} ${RED}ERROR${NC} $*"; }

# ---- Validar ENGINE ----
if [[ -z "${ENGINE:-}" ]]; then
    log_error "La variable de entorno ENGINE es obligatoria."
    log_error "Motores soportados: ${SUPPORTED_ENGINES[*]}"
    log_error "Uso: docker run -e ENGINE=postgres ..."
    exit 1
fi

# Validar que ENGINE sea un motor soportado
engine_valid=false
for supported in "${SUPPORTED_ENGINES[@]}"; do
    if [[ "$ENGINE" == "$supported" ]]; then
        engine_valid=true
        break
    fi
done

if [[ "$engine_valid" == "false" ]]; then
    log_error "Motor '$ENGINE' no es soportado."
    log_error "Motores soportados: ${SUPPORTED_ENGINES[*]}"
    exit 1
fi

log_info "Motor seleccionado: $ENGINE"
log_info "Usuario: ${LAB_USER:-labuser}"
log_info "Base de datos: ${LAB_DATABASE:-labdb}"

# ---- Defaults ----
export LAB_USER="${LAB_USER:-labuser}"
export LAB_PASSWORD="${LAB_PASSWORD:-labpassword}"
export LAB_DATABASE="${LAB_DATABASE:-labdb}"

# ---- Crear directorios ----
mkdir -p "$LOG_DIR" "$DATA_DIR" "/var/run/sql-engine-lab"

if [[ "$ENGINE" != "oracle" ]]; then
    init_script="${ENGINES_DIR}/${ENGINE}/init.sh"
    
    if [[ ! -f "$init_script" ]]; then
        log_error "Script de inicialización no encontrado: $init_script"
        exit 1
    fi
    
    log_info "Ejecutando inicialización de $ENGINE..."
    bash "$init_script"
    log_info "Inicialización de $ENGINE completada."
else
    log_info "Oracle Free: la inicialización se delega a runOracle.sh via supervisord."
fi

# ---- Extraer variables desde el contrato maestro ----
CONTRACT_FILE="/opt/sql-engine-lab/lab-contract.json"
if [[ -f "$CONTRACT_FILE" ]]; then
    # Extraemos el comando de healthcheck del motor
    HEALTHCHECK_CMD=$(jq -r ".engines.${ENGINE}.healthcheckCmd // empty" "$CONTRACT_FILE")
    
    if [[ -z "$HEALTHCHECK_CMD" ]]; then
        log_error "No se encontró healthcheckCmd para el motor $ENGINE en el contrato."
        exit 1
    fi
else
    log_error "No se encontró el contrato maestro $CONTRACT_FILE."
    exit 1
fi

# ---- Crear healthcheck específico del motor ----
create_healthcheck() {
    local hc_script="/tmp/healthcheck.sh"
    
    # Escribimos el script. Observa que bash evaluará (expandirá) las variables
    # de entorno como $LAB_USER al ejecutar jq o al hacer el echo -e, 
    # pero queremos que se evalúen CUANDO el script corra.
    # Como HEALTHCHECK_CMD contiene strings literales con '${LAB_USER}',
    # simplemente podemos volcarlo al archivo y bash lo evaluará cuando
    # Docker ejecute /tmp/healthcheck.sh.
    
    echo "#!/bin/bash" > "$hc_script"
    # Usamos eval para expandir el comando recuperado del JSON que tiene variables como ${LAB_USER}
    echo "eval \"$HEALTHCHECK_CMD\"" >> "$hc_script"
    
    chmod +x "$hc_script"
}

create_healthcheck

# ---- Arrancar motor via supervisord (excepto SQLite que no es daemon) ----
if [[ "$ENGINE" == "sqlite" ]]; then
    log_info "SQLite no requiere daemon. Archivo de BD listo en: $DATA_DIR/sqlite/labdb.sqlite"
    log_info "Comando de conexión: sqlite3 $DATA_DIR/sqlite/labdb.sqlite"
    log_info "Manteniendo contenedor vivo..."
    
    # Mantener contenedor vivo mostrando un mensaje periódico
    exec tail -f /dev/null
else
    log_info "Arrancando $ENGINE via supervisord..."
    
    # Arrancar supervisord en foreground, que a su vez arrancará el motor seleccionado
    # después de la inicialización
    exec /usr/bin/supervisord -c /etc/supervisor/conf.d/sql-engine-lab.conf &
    SUPERVISOR_PID=$!
    
    # Esperar un momento para que supervisord arranque
    sleep 2
    
    # Iniciar el programa específico del motor
    supervisorctl -c /etc/supervisor/conf.d/sql-engine-lab.conf start "$ENGINE"
    
    log_info "$ENGINE iniciado. Mostrando logs..."
    
    # Seguir los logs del motor activo
    tail -f "$LOG_DIR/${ENGINE}.log" "$LOG_DIR/${ENGINE}-error.log" 2>/dev/null &
    
    # Manejar señales para shutdown limpio
    trap 'log_info "Deteniendo $ENGINE..."; supervisorctl -c /etc/supervisor/conf.d/sql-engine-lab.conf stop "$ENGINE"; kill $SUPERVISOR_PID 2>/dev/null; log_info "$ENGINE detenido."; exit 0' SIGTERM SIGINT
    
    # Esperar a que supervisord termine
    wait $SUPERVISOR_PID
fi
