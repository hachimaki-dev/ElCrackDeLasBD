#!/usr/bin/env bash
# ==========================================================================
# SQL Engine Laboratory — SQLite Initialization
#
# SQLite es un motor embebido — no corre como daemon. Este script simplemente
# crea el archivo de base de datos y una tabla de ejemplo para que el usuario
# pueda empezar a trabajar inmediatamente.
#
# Variables de entorno utilizadas:
#   LAB_DATABASE - Nombre del archivo de BD (default: labdb)
# ==========================================================================

set -euo pipefail

readonly SQLITE_DATA="/var/lib/sql-engine-lab/data/sqlite"
readonly SQLITE_DB="${SQLITE_DATA}/${LAB_DATABASE:-labdb}.sqlite"

log_info() { echo "[SQLITE-INIT] INFO  $*"; }

# ---- Crear directorio y archivo de BD ----
mkdir -p "$SQLITE_DATA"

if [[ ! -f "$SQLITE_DB" ]]; then
    log_info "Creando base de datos SQLite en $SQLITE_DB..."
    
    # Crear la BD con una tabla de ejemplo para que no esté vacía
    sqlite3 "$SQLITE_DB" <<-EOSQL
        -- Tabla de ejemplo para validar que SQLite funciona
        CREATE TABLE IF NOT EXISTS welcome (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            message TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        INSERT INTO welcome (message) VALUES ('¡Bienvenido a SQL Engine Laboratory — SQLite!');
        INSERT INTO welcome (message) VALUES ('SQLite está listo para usar. Ejecuta: .tables para ver las tablas.');
EOSQL
    
    log_info "Base de datos SQLite creada con tabla de bienvenida."
else
    log_info "Base de datos SQLite ya existe en $SQLITE_DB. Saltando inicialización."
fi

log_info "Comando de conexión: sqlite3 $SQLITE_DB"
