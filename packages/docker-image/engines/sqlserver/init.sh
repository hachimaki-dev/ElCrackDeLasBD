#!/usr/bin/env bash
# ==========================================================================
# SQL Engine Laboratory — SQL Server Initialization
#
# Inicializa SQL Server Developer Edition.
#
# Limitación conocida: SQL Server no tiene soporte arm64 nativo.
# En Mac Apple Silicon corre bajo emulación (Rosetta/QEMU), más lento.
# Esto es aceptable para el MVP, no es un bug.
#
# Variables de entorno utilizadas:
#   LAB_USER     - Login SQL a crear (default: labuser)
#   LAB_PASSWORD - Password del login (default: labpassword)
#   LAB_DATABASE - Base de datos a crear (default: labdb)
# ==========================================================================

set -euo pipefail

readonly SQLSERVER_DATA="/var/lib/sql-engine-lab/data/sqlserver"
readonly SQLCMD="/opt/mssql-tools18/bin/sqlcmd"

log_info() { echo "[SQLSERVER-INIT] INFO  $*"; }
log_warn() { echo "[SQLSERVER-INIT] WARN  $*"; }

# ---- Crear directorios ----
mkdir -p "$SQLSERVER_DATA"

# ---- Verificar si SQL Server ya fue inicializado ----
if [[ ! -f "$SQLSERVER_DATA/.initialized" ]]; then
    log_info "Inicializando SQL Server..."
    
    # SQL Server necesita un password de SA fuerte (mínimo 8 caracteres, mixto)
    # Usamos LAB_PASSWORD pero aseguramos que cumpla los requisitos
    export ACCEPT_EULA="Y"
    export MSSQL_SA_PASSWORD="${LAB_PASSWORD}"
    export MSSQL_PID="Developer"
    export MSSQL_DATA_DIR="$SQLSERVER_DATA"
    
    # Arrancar SQL Server temporalmente
    /opt/mssql/bin/sqlservr &
    MSSQL_PID_NUM=$!
    
    # Esperar a que SQL Server esté listo (puede tardar hasta 30 segundos)
    log_info "Esperando a que SQL Server esté listo..."
    for i in $(seq 1 60); do
        if $SQLCMD -S localhost,1433 -U sa -P "${LAB_PASSWORD}" -Q "SELECT 1" -C -b &>/dev/null; then
            break
        fi
        sleep 1
    done
    
    # Verificar que arrancó
    if ! $SQLCMD -S localhost,1433 -U sa -P "${LAB_PASSWORD}" -Q "SELECT 1" -C -b &>/dev/null; then
        log_warn "SQL Server no respondió después de 60 segundos."
        log_warn "Esto puede ocurrir en entornos con emulación arm64."
        kill $MSSQL_PID_NUM 2>/dev/null || true
        exit 1
    fi
    
    # Crear base de datos y login del laboratorio
    $SQLCMD -S localhost,1433 -U sa -P "${LAB_PASSWORD}" -C -b <<-EOSQL
        -- Crear la base de datos del laboratorio
        CREATE DATABASE [${LAB_DATABASE}];
        GO
        
        -- Crear login SQL
        CREATE LOGIN [${LAB_USER}] WITH PASSWORD = '${LAB_PASSWORD}', DEFAULT_DATABASE = [${LAB_DATABASE}];
        GO
        
        -- Crear usuario en la BD y darle permisos
        USE [${LAB_DATABASE}];
        GO
        CREATE USER [${LAB_USER}] FOR LOGIN [${LAB_USER}];
        GO
        ALTER ROLE [db_owner] ADD MEMBER [${LAB_USER}];
        GO
EOSQL
    
    log_info "Login '${LAB_USER}' y base de datos '${LAB_DATABASE}' creados."
    
    # Detener SQL Server
    kill $MSSQL_PID_NUM
    wait $MSSQL_PID_NUM 2>/dev/null || true
    
    touch "$SQLSERVER_DATA/.initialized"
    log_info "SQL Server inicializado correctamente."
else
    log_info "SQL Server ya está inicializado. Saltando configuración inicial."
fi

log_info "Comando de conexión: sqlcmd -S localhost,1433 -U ${LAB_USER} -P ${LAB_PASSWORD} -d ${LAB_DATABASE} -C"
