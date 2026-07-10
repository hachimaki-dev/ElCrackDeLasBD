#!/usr/bin/env bash
# ==========================================================================
# SQL Engine Laboratory — Oracle Free Supervisor Startup Script
#
# Este script es llamado por supervisord para arrancar Oracle.
# Arranca el listener y la base de datos, crea el usuario del laboratorio
# si es la primera vez, y mantiene el proceso en foreground.
# ==========================================================================

set -uo pipefail

export ORACLE_HOME="/opt/oracle/product/23ai/dbhomeFree"
export ORACLE_SID="FREE"
export ORACLE_BASE="/opt/oracle"
export PATH="$ORACLE_HOME/bin:$PATH"
export LD_LIBRARY_PATH="$ORACLE_HOME/lib:${LD_LIBRARY_PATH:-}"

log_info() { echo "[ORACLE-RUN] INFO  $*"; }
log_warn() { echo "[ORACLE-RUN] WARN  $*"; }

# Arrancar el listener
log_info "Arrancando Oracle TNS Listener..."
lsnrctl start 2>&1 || {
    log_warn "Listener falló al arrancar. Intentando de nuevo en 5s..."
    sleep 5
    lsnrctl start 2>&1 || true
}

# Arrancar la base de datos
log_info "Arrancando Oracle Database..."
sqlplus / as sysdba <<EOSQL
STARTUP;
ALTER PLUGGABLE DATABASE ALL OPEN;
EXIT;
EOSQL

# Crear usuario del laboratorio si no existe
log_info "Verificando usuario del laboratorio..."
sqlplus / as sysdba <<EOSQL
ALTER SESSION SET CONTAINER = FREEPDB1;

-- Crear usuario solo si no existe
DECLARE
    v_count NUMBER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM all_users WHERE username = UPPER('${LAB_USER:-labuser}');
    IF v_count = 0 THEN
        EXECUTE IMMEDIATE 'CREATE USER ${LAB_USER:-labuser} IDENTIFIED BY ${LAB_PASSWORD:-labpassword}';
        EXECUTE IMMEDIATE 'GRANT CONNECT, RESOURCE, CREATE TABLE, CREATE VIEW, CREATE SEQUENCE TO ${LAB_USER:-labuser}';
        EXECUTE IMMEDIATE 'ALTER USER ${LAB_USER:-labuser} QUOTA UNLIMITED ON USERS';
    END IF;
END;
/

EXIT;
EOSQL

log_info "Oracle Free está listo."
log_info "Conexión: sqlplus ${LAB_USER:-labuser}/${LAB_PASSWORD:-labpassword}@localhost:1521/FREEPDB1"

# Mantener el proceso en foreground (supervisord necesita esto)
# Tail del alert log de Oracle
tail -f "$ORACLE_BASE/diag/rdbms/free/FREE/trace/alert_FREE.log" 2>/dev/null || \
    tail -f /dev/null
