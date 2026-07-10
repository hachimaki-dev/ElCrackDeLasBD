#!/usr/bin/env bash
# ==========================================================================
# SQL Engine Laboratory — MySQL Initialization
#
# Inicializa el data directory de MySQL, crea el usuario y la base de datos
# del laboratorio. Solo se ejecuta si el data directory no existe aún.
#
# Variables de entorno utilizadas:
#   LAB_USER     - Usuario a crear (default: labuser)
#   LAB_PASSWORD - Password del usuario (default: labpassword)
#   LAB_DATABASE - Base de datos a crear (default: labdb)
# ==========================================================================

set -euo pipefail

readonly MYSQL_DATA="/var/lib/sql-engine-lab/data/mysql"
readonly MYSQL_SOCKET="/var/run/sql-engine-lab/mysql.sock"

log_info() { echo "[MYSQL-INIT] INFO  $*"; }
log_warn() { echo "[MYSQL-INIT] WARN  $*"; }

# ---- Crear usuario mysql del sistema si no existe ----
if ! id -u mysql &>/dev/null; then
    useradd -r -s /bin/false -m -d /var/lib/mysql mysql
fi

# ---- Inicializar data directory si es la primera vez ----
if [[ ! -d "$MYSQL_DATA" ]] || [[ ! -f "$MYSQL_DATA/mysql/user.MYD" ]]; then
    log_info "Inicializando data directory de MySQL en $MYSQL_DATA..."
    
    mkdir -p "$MYSQL_DATA"
    mkdir -p "$(dirname "$MYSQL_SOCKET")"
    chown mysql:mysql "$MYSQL_DATA"
    
    # Inicializar MySQL sin password de root
    mysqld --initialize-insecure --datadir="$MYSQL_DATA" --user=mysql
    
    # Arrancar temporalmente para crear usuario y BD
    mysqld --datadir="$MYSQL_DATA" \
           --socket="$MYSQL_SOCKET" \
           --port=3306 \
           --bind-address=0.0.0.0 \
           --user=mysql &
    MYSQL_PID=$!
    
    # Esperar a que MySQL esté listo
    for i in $(seq 1 30); do
        if mysqladmin ping -h 127.0.0.1 -P 3306 --socket="$MYSQL_SOCKET" &>/dev/null; then
            break
        fi
        sleep 1
    done
    
    # Crear usuario y base de datos del laboratorio
    mysql -h 127.0.0.1 -P 3306 -u root --socket="$MYSQL_SOCKET" <<-EOSQL
        CREATE DATABASE IF NOT EXISTS \`${LAB_DATABASE}\`;
        CREATE USER IF NOT EXISTS '${LAB_USER}'@'%' IDENTIFIED BY '${LAB_PASSWORD}';
        GRANT ALL PRIVILEGES ON \`${LAB_DATABASE}\`.* TO '${LAB_USER}'@'%';
        FLUSH PRIVILEGES;
EOSQL
    
    log_info "Usuario '${LAB_USER}' y base de datos '${LAB_DATABASE}' creados."
    
    # Detener el servidor temporal
    mysqladmin -h 127.0.0.1 -P 3306 -u root --socket="$MYSQL_SOCKET" shutdown
    wait $MYSQL_PID 2>/dev/null || true
    
    log_info "MySQL inicializado correctamente."
else
    log_info "Data directory de MySQL ya existe. Saltando inicialización."
fi

# ---- Asegurar permisos correctos ----
chown -R mysql:mysql "$MYSQL_DATA"
