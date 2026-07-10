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

readonly ORACLE_DATA="/var/lib/sql-engine-lab/data/oracle"
readonly ORACLE_HOME="/opt/oracle/product/23ai/dbhomeFree"

log_info() { echo "[ORACLE-INIT] INFO  $*"; }
log_warn() { echo "[ORACLE-INIT] WARN  $*"; }

# ---- Crear usuario oracle del sistema si no existe ----
if ! id -u oracle &>/dev/null; then
    groupadd -r dba 2>/dev/null || true
    groupadd -r oinstall 2>/dev/null || true
    useradd -r -g oinstall -G dba -s /bin/bash -m -d /home/oracle oracle
fi

# ---- Crear directorios necesarios ----
mkdir -p "$ORACLE_DATA"
mkdir -p /opt/oracle/oradata

# ---- Verificar si Oracle ya está inicializado ----
if [[ ! -f "$ORACLE_DATA/.initialized" ]]; then
    log_info "Inicializando Oracle Free Database..."
    log_warn "Este proceso puede tardar 1-2 minutos la primera vez."
    
    # Asegurar permisos
    chown -R oracle:oinstall "$ORACLE_DATA"
    chown -R oracle:oinstall /opt/oracle/oradata
    
    # Configurar el listener
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
    
    # Arrancar Oracle temporalmente para crear usuario en el PDB
    log_info "Arrancando Oracle para configuración inicial..."
    
    gosu oracle bash -c "
        export ORACLE_HOME='$ORACLE_HOME'
        export ORACLE_SID=FREE
        export PATH='$ORACLE_HOME/bin:\$PATH'
        
        # Arrancar el listener
        lsnrctl start
        
        # Arrancar la base de datos
        sqlplus / as sysdba <<EOSQL
            STARTUP;
            ALTER PLUGGABLE DATABASE ALL OPEN;
            
            -- Crear usuario en FREEPDB1
            ALTER SESSION SET CONTAINER = FREEPDB1;
            CREATE USER ${LAB_USER} IDENTIFIED BY ${LAB_PASSWORD};
            GRANT CONNECT, RESOURCE, CREATE TABLE, CREATE VIEW, CREATE SEQUENCE TO ${LAB_USER};
            ALTER USER ${LAB_USER} QUOTA UNLIMITED ON USERS;
            
            EXIT;
EOSQL
    "
    
    # Detener Oracle
    gosu oracle bash -c "
        export ORACLE_HOME='$ORACLE_HOME'
        export ORACLE_SID=FREE
        export PATH='$ORACLE_HOME/bin:\$PATH'
        
        sqlplus / as sysdba <<EOSQL
            SHUTDOWN IMMEDIATE;
            EXIT;
EOSQL
        lsnrctl stop
    "
    
    touch "$ORACLE_DATA/.initialized"
    log_info "Oracle Free inicializado correctamente."
    log_info "Usuario '${LAB_USER}' creado en PDB FREEPDB1."
else
    log_info "Oracle ya está inicializado. Saltando configuración inicial."
fi

log_info "Comando de conexión: sqlplus ${LAB_USER}/${LAB_PASSWORD}@localhost:1521/FREEPDB1"
