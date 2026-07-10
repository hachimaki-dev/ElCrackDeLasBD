#!/usr/bin/env bash
# ==========================================================================
# SQL Engine Laboratory — MariaDB Initialization
#
# Inicializa el data directory de MariaDB, crea el usuario y la base de datos
# del laboratorio. Solo se ejecuta si el data directory no existe aún.
#
# Nota: MariaDB corre en puerto 3307 para no colisionar con MySQL (aunque
# solo un motor corre a la vez, esto evita confusiones en la configuración).
#
# Variables de entorno utilizadas:
#   LAB_USER     - Usuario a crear (default: labuser)
#   LAB_PASSWORD - Password del usuario (default: labpassword)
#   LAB_DATABASE - Base de datos a crear (default: labdb)
# ==========================================================================

set -euo pipefail

readonly MARIADB_DATA="/var/lib/sql-engine-lab/data/mariadb"
readonly MARIADB_SOCKET="/var/run/sql-engine-lab/mariadb.sock"

log_info() { echo "[MARIADB-INIT] INFO  $*"; }
log_warn() { echo "[MARIADB-INIT] WARN  $*"; }

# ---- Crear usuario mysql del sistema si no existe ----
# MariaDB usa el usuario 'mysql' del sistema por convención
if ! id -u mysql &>/dev/null; then
    useradd -r -s /bin/false -m -d /var/lib/mysql mysql
fi

# ---- Inicializar data directory si es la primera vez ----
if [[ ! -d "$MARIADB_DATA" ]] || [[ ! -f "$MARIADB_DATA/mysql/user.frm" ]]; then
    log_info "Inicializando data directory de MariaDB en $MARIADB_DATA..."
    
    mkdir -p "$MARIADB_DATA"
    mkdir -p "$(dirname "$MARIADB_SOCKET")"
    chown mysql:mysql "$MARIADB_DATA"
    
    # Inicializar MariaDB
    mariadb-install-db --datadir="$MARIADB_DATA" --user=mysql
    
    # Arrancar temporalmente para crear usuario y BD
    mariadbd --datadir="$MARIADB_DATA" \
             --socket="$MARIADB_SOCKET" \
             --port=3307 \
             --bind-address=0.0.0.0 \
             --user=mysql &
    MARIADB_PID=$!
    
    # Esperar a que MariaDB esté listo
    for i in $(seq 1 30); do
        if mariadb-admin ping -h 127.0.0.1 -P 3307 --socket="$MARIADB_SOCKET" &>/dev/null; then
            break
        fi
        sleep 1
    done
    
    # Crear usuario y base de datos del laboratorio
    mariadb -u root --socket="$MARIADB_SOCKET" <<-EOSQL
        CREATE DATABASE IF NOT EXISTS \`${LAB_DATABASE}\`;
        CREATE USER IF NOT EXISTS '${LAB_USER}'@'%' IDENTIFIED BY '${LAB_PASSWORD}';
        GRANT ALL PRIVILEGES ON \`${LAB_DATABASE}\`.* TO '${LAB_USER}'@'%';
        CREATE USER IF NOT EXISTS '${LAB_USER}'@'localhost' IDENTIFIED BY '${LAB_PASSWORD}';
        GRANT ALL PRIVILEGES ON \`${LAB_DATABASE}\`.* TO '${LAB_USER}'@'localhost';
        ALTER USER 'root'@'localhost' IDENTIFIED BY '${LAB_PASSWORD}';
        GRANT ALL PRIVILEGES ON *.* TO 'root'@'localhost' WITH GRANT OPTION;
        FLUSH PRIVILEGES;
EOSQL
    
    log_info "Usuario '${LAB_USER}' y base de datos '${LAB_DATABASE}' creados."
    
    # Detener el servidor temporal
    mariadb-admin -u root --password="${LAB_PASSWORD}" --socket="$MARIADB_SOCKET" shutdown
    wait $MARIADB_PID 2>/dev/null || true
    
    log_info "MariaDB inicializado correctamente."
else
    log_info "Data directory de MariaDB ya existe. Saltando inicialización."
fi

# ---- Asegurar permisos correctos ----
chown -R mysql:mysql "$MARIADB_DATA"
