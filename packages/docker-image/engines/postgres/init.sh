#!/usr/bin/env bash
# ==========================================================================
# SQL Engine Laboratory — PostgreSQL Initialization
#
# Inicializa el data directory de PostgreSQL, crea el usuario y la base de datos
# del laboratorio. Solo se ejecuta si el data directory no existe aún.
#
# Variables de entorno utilizadas:
#   LAB_USER     - Usuario a crear (default: labuser)
#   LAB_PASSWORD - Password del usuario (default: labpassword)
#   LAB_DATABASE - Base de datos a crear (default: labdb)
# ==========================================================================

set -euo pipefail

readonly PG_DATA="/var/lib/sql-engine-lab/data/postgres"
readonly PG_VERSION="15"
readonly PG_BIN="/usr/lib/postgresql/${PG_VERSION}/bin"

log_info() { echo "[POSTGRES-INIT] INFO  $*"; }
log_warn() { echo "[POSTGRES-INIT] WARN  $*"; }

# ---- Crear usuario postgres del sistema si no existe ----
if ! id -u postgres &>/dev/null; then
    useradd -r -s /bin/false -m -d /var/lib/postgresql postgres
fi

# ---- Inicializar data directory si es la primera vez ----
if [[ ! -d "$PG_DATA" ]] || [[ ! -f "$PG_DATA/PG_VERSION" ]]; then
    log_info "Inicializando data directory de PostgreSQL en $PG_DATA..."
    
    mkdir -p "$PG_DATA"
    chown postgres:postgres "$PG_DATA"
    chmod 700 "$PG_DATA"
    
    # initdb como usuario postgres
    gosu postgres "$PG_BIN/initdb" -D "$PG_DATA" --encoding=UTF8 --locale=en_US.UTF-8
    
    # Configurar pg_hba.conf para aceptar conexiones con password
    cat > "$PG_DATA/pg_hba.conf" << 'EOF'
# TYPE  DATABASE        USER            ADDRESS                 METHOD
local   all             all                                     trust
host    all             all             0.0.0.0/0               md5
host    all             all             ::/0                    md5
EOF
    
    # Configurar postgresql.conf para escuchar en todas las interfaces
    echo "listen_addresses = '*'" >> "$PG_DATA/postgresql.conf"
    echo "port = 5432" >> "$PG_DATA/postgresql.conf"
    
    # Arrancar temporalmente para crear usuario y BD
    gosu postgres "$PG_BIN/pg_ctl" -D "$PG_DATA" -l "$PG_DATA/init.log" start
    
    # Esperar a que PostgreSQL esté listo (via socket local, no TCP)
    for i in $(seq 1 30); do
        if gosu postgres "$PG_BIN/pg_isready" -p 5432 &>/dev/null; then
            break
        fi
        sleep 1
    done
    
    # Crear usuario y base de datos del laboratorio
    # Usamos socket local (sin -h) para que pg_hba.conf use "trust" en vez de "md5"
    gosu postgres "$PG_BIN/psql" -p 5432 <<-EOSQL
        CREATE USER ${LAB_USER} WITH PASSWORD '${LAB_PASSWORD}' CREATEDB;
        CREATE DATABASE ${LAB_DATABASE} OWNER ${LAB_USER};
        GRANT ALL PRIVILEGES ON DATABASE ${LAB_DATABASE} TO ${LAB_USER};
        ALTER USER postgres WITH PASSWORD '${LAB_PASSWORD}';
EOSQL
    
    log_info "Usuario '${LAB_USER}' y base de datos '${LAB_DATABASE}' creados."
    
    # Detener el servidor temporal
    gosu postgres "$PG_BIN/pg_ctl" -D "$PG_DATA" stop -m fast
    
    log_info "PostgreSQL inicializado correctamente."
else
    log_info "Data directory de PostgreSQL ya existe. Sincronizando contraseñas..."
    
    # Arrancar temporalmente para sincronizar la contraseña
    gosu postgres "$PG_BIN/pg_ctl" -D "$PG_DATA" -l "$PG_DATA/init.log" start
    
    # Esperar a que PostgreSQL esté listo
    for i in $(seq 1 30); do
        if gosu postgres "$PG_BIN/pg_isready" -p 5432 &>/dev/null; then
            break
        fi
        sleep 1
    done
    
    # Actualizar la contraseña del usuario del laboratorio y postgres
    gosu postgres "$PG_BIN/psql" -p 5432 <<-EOSQL
        ALTER USER ${LAB_USER} WITH PASSWORD '${LAB_PASSWORD}';
        ALTER USER postgres WITH PASSWORD '${LAB_PASSWORD}';
EOSQL
    
    log_info "Contraseñas sincronizadas."
    
    # Detener el servidor temporal
    gosu postgres "$PG_BIN/pg_ctl" -D "$PG_DATA" stop -m fast
fi

# ---- Asegurar permisos correctos ----
chown -R postgres:postgres "$PG_DATA"
