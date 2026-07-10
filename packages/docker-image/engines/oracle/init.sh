#!/usr/bin/env bash
# ==========================================================================
# SQL Engine Laboratory — Oracle Free Initialization
#
# Inicializa Oracle Free (basado en gvenzl/oracle-free 23.5).
# Oracle tiene un proceso de inicialización más lento que los demás motores
# (puede tardar 1-2 minutos la primera vez).
#
# Atribución: Esta configuración se basa en el trabajo de Gerald Venzl
# (gvenzl/oracle-free). Oracle Database Free se rige por los
# Oracle Free Use Terms and Conditions.
#
# Variables de entorno utilizadas:
#   LAB_USER     - Usuario a crear en el PDB (default: labuser)
#   LAB_PASSWORD - Password del usuario (default: labpassword)
#   LAB_DATABASE - No se usa directamente; Oracle usa PDBs (FREEPDB1)
# ==========================================================================

set -euo pipefail

readonly ORACLE_HOME="/opt/oracle/product/23ai/dbhomeFree"
readonly ORACLE_BASE="/opt/oracle"

log_info() { echo "[ORACLE-INIT] INFO  $*"; }
log_warn() { echo "[ORACLE-INIT] WARN  $*"; }

# ---- Crear usuario oracle del sistema si no existe ----
if ! id -u oracle &>/dev/null; then
    groupadd -r dba 2>/dev/null || true
    groupadd -r oinstall 2>/dev/null || true
    useradd -r -g oinstall -G dba -s /bin/bash -m -d /home/oracle oracle
fi

# ---- Crear directorios necesarios ----
mkdir -p /opt/oracle/oradata
mkdir -p /var/log/sql-engine-lab

# ---- Asegurar permisos ----
chown -R oracle:oinstall /opt/oracle/oradata
chown -R oracle:oinstall "$ORACLE_HOME" 2>/dev/null || true

# ---- Verificar que los binarios de Oracle existan ----
if [[ ! -f "$ORACLE_HOME/bin/sqlplus" ]]; then
    log_warn "Los binarios de Oracle no se encontraron en $ORACLE_HOME/bin/"
    log_warn "Esto puede ocurrir si la copia del stage falló."
    log_warn "Listando contenido de /opt/oracle:"
    ls -la /opt/oracle/ 2>/dev/null || true
    ls -la "$ORACLE_HOME/bin/" 2>/dev/null || true
    exit 1
fi

# ---- Configurar el listener ----
mkdir -p "$ORACLE_HOME/network/admin"
cat > "$ORACLE_HOME/network/admin/listener.ora" << EOF
LISTENER =
  (DESCRIPTION_LIST =
    (DESCRIPTION =
      (ADDRESS = (PROTOCOL = TCP)(HOST = 0.0.0.0)(PORT = 1521))
    )
  )

DEFAULT_SERVICE_LISTENER = FREE
EOF

cat > "$ORACLE_HOME/network/admin/tnsnames.ora" << EOF
FREE =
  (DESCRIPTION =
    (ADDRESS = (PROTOCOL = TCP)(HOST = localhost)(PORT = 1521))
    (CONNECT_DATA =
      (SERVER = DEDICATED)
      (SERVICE_NAME = FREE)
    )
  )

FREEPDB1 =
  (DESCRIPTION =
    (ADDRESS = (PROTOCOL = TCP)(HOST = localhost)(PORT = 1521))
    (CONNECT_DATA =
      (SERVER = DEDICATED)
      (SERVICE_NAME = FREEPDB1)
    )
  )
EOF

chown oracle:oinstall "$ORACLE_HOME/network/admin/listener.ora"
chown oracle:oinstall "$ORACLE_HOME/network/admin/tnsnames.ora"

log_info "Oracle Free configurado."
log_info "Nota: Oracle se arrancará via supervisord."
log_info "Comando de conexión: sqlplus ${LAB_USER}/${LAB_PASSWORD}@localhost:1521/FREEPDB1"
