#!/usr/bin/env bash
# ==========================================================================
# SQL Engine Laboratory — MySQL Initialization
#
# Inicializa el data directory de MySQL (vía default-mysql-server de Debian,
# que instala MariaDB como backend compatible con MySQL).
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
if [[ ! -d "$MYSQL_DATA" ]] || [[ -z "$(ls -A "$MYSQL_DATA" 2>/dev/null)" ]]; then
    log_info "Inicializando data directory de MySQL en $MYSQL_DATA..."
    
    mkdir -p "$MYSQL_DATA"
    mkdir -p "$(dirname "$MYSQL_SOCKET")"
    chown mysql:mysql "$MYSQL_DATA"
    
    # Usar mariadb-install-db (default-mysql-server en Debian = MariaDB)
    mariadb-install-db --datadir="$MYSQL_DATA" --user=mysql --skip-test-db 2>&1 || true
    
    # Arrancar temporalmente para crear usuario y BD
    mysqld --datadir="$MYSQL_DATA" \
           --socket="$MYSQL_SOCKET" \
           --port=3306 \
           --bind-address=0.0.0.0 \
           --user=mysql &
    MYSQL_PID=$!
    
    # Esperar a que MySQL/MariaDB esté listo
    for i in $(seq 1 30); do
        if mysqladmin ping --socket="$MYSQL_SOCKET" &>/dev/null; then
            break
        fi
        sleep 1
    done
    
    # Crear usuario y base de datos del laboratorio
    mysql --socket="$MYSQL_SOCKET" -u root <<-EOSQL
        CREATE DATABASE IF NOT EXISTS \`${LAB_DATABASE}\`;
        CREATE USER IF NOT EXISTS '${LAB_USER}'@'%' IDENTIFIED BY '${LAB_PASSWORD}';
        GRANT ALL PRIVILEGES ON \`${LAB_DATABASE}\`.* TO '${LAB_USER}'@'%';
        ALTER USER 'root'@'localhost' IDENTIFIED BY '${LAB_PASSWORD}';
        GRANT ALL PRIVILEGES ON *.* TO 'root'@'localhost' WITH GRANT OPTION;
        FLUSH PRIVILEGES;
EOSQL
    
    log_info "Usuario '${LAB_USER}' y base de datos '${LAB_DATABASE}' creados."
    
    # Detener el servidor temporal
    mysqladmin --socket="$MYSQL_SOCKET" -u root --password="${LAB_PASSWORD}" shutdown
    wait $MYSQL_PID 2>/dev/null || true
    
    log_info "MySQL inicializado correctamente."
else
    log_info "Data directory de MySQL ya existe. Sincronizando contraseñas..."
    
    # Arrancar temporalmente
    mysqld --datadir="$MYSQL_DATA" \
           --socket="$MYSQL_SOCKET" \
           --port=3306 \
           --bind-address=0.0.0.0 \
           --user=mysql &
    MYSQL_PID=$!
    
    # Esperar a que MySQL/MariaDB esté listo
    for i in $(seq 1 30); do
        if mysqladmin ping --socket="$MYSQL_SOCKET" &>/dev/null; then
            break
        fi
        sleep 1
    done
    
    # Sincronizar contraseñas usando socket local (root sin password o con password si está configurado via ENV_PASSWORD no importa porque en local no requiere auth si no está en pg_hba... wait, MySQL con socket local a veces sí)
    # Actually for local socket it might require password if it was set. But wait, we don't know the OLD password.
    # We can skip password check if we start with --skip-grant-tables
    kill $MYSQL_PID
    wait $MYSQL_PID 2>/dev/null || true
    
    mysqld --datadir="$MYSQL_DATA" \
           --socket="$MYSQL_SOCKET" \
           --port=3306 \
           --bind-address=0.0.0.0 \
           --user=mysql \
           --skip-grant-tables &
    MYSQL_PID=$!
    
    for i in $(seq 1 30); do
        if mysqladmin ping --socket="$MYSQL_SOCKET" &>/dev/null; then
            break
        fi
        sleep 1
    done
    
    mysql --socket="$MYSQL_SOCKET" -u root <<-EOSQL
        FLUSH PRIVILEGES;
        ALTER USER '${LAB_USER}'@'%' IDENTIFIED BY '${LAB_PASSWORD}';
        ALTER USER 'root'@'localhost' IDENTIFIED BY '${LAB_PASSWORD}';
        FLUSH PRIVILEGES;
EOSQL
    
    log_info "Contraseñas sincronizadas."
    
    # Detener el servidor
    mysqladmin --socket="$MYSQL_SOCKET" -u root --password="${LAB_PASSWORD}" shutdown
    wait $MYSQL_PID 2>/dev/null || true
fi

# ---- Asegurar permisos correctos ----
chown -R mysql:mysql "$MYSQL_DATA"
