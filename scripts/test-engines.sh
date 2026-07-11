#!/usr/bin/env bash
# ==========================================================================
# SQL Engine Laboratory — Test Suite
#
# Levanta los contenedores uno a uno usando la imagen local,
# espera el healthcheck, y prueba conexiones estándar y admin.
# ==========================================================================

set -euo pipefail

IMAGE="sql-engine-lab:dev"
CONTAINER_NAME="sql-engine-lab-test"
TEST_PASS="TestPass123"
TEST_USER="labuser"
TEST_DB="labdb"
MAX_WAIT_SECONDS=90

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}=== Iniciando Suite de Pruebas de SQL Engine Lab ===${NC}"
echo -e "Imagen: $IMAGE"
echo -e "Password de prueba: $TEST_PASS"
echo -e "---------------------------------------------------"

# Validar que la imagen existe
if ! docker image inspect "$IMAGE" > /dev/null 2>&1; then
    echo -e "${RED}Error: La imagen $IMAGE no existe localmente.${NC}"
    echo "Ejecuta: docker build -t sql-engine-lab:dev packages/docker-image/"
    exit 1
fi

function cleanup() {
    docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT

function test_engine() {
    local engine=$1
    local std_cmd=$2
    local admin_cmd=$3

    echo -e "\n${YELLOW}>>> Probando Motor: $engine <<<${NC}"
    cleanup

    # Iniciar contenedor
    docker run -d \
        --name "$CONTAINER_NAME" \
        -e ENGINE="$engine" \
        -e LAB_USER="$TEST_USER" \
        -e LAB_PASSWORD="$TEST_PASS" \
        -e LAB_DATABASE="$TEST_DB" \
        "$IMAGE" > /dev/null

    echo -n "Esperando inicialización y healthcheck..."
    local elapsed=0
    local healthy=false

    while [ $elapsed -lt $MAX_WAIT_SECONDS ]; do
        local status=$(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER_NAME" 2>/dev/null || echo "none")
        if [ "$status" == "healthy" ]; then
            healthy=true
            break
        elif [ "$status" == "unhealthy" ]; then
            echo -e "\n${RED}✗ Healthcheck fallido prematuramente.${NC}"
            docker logs "$CONTAINER_NAME" | tail -n 10
            return 1
        elif [ "$status" == "none" ] && [ "$engine" == "sqlite" ]; then
            # SQLite no tiene daemon, si está corriendo asume que está listo
            healthy=true
            break
        fi
        
        echo -n "."
        sleep 2
        elapsed=$((elapsed + 2))
    done

    if [ "$healthy" == "false" ]; then
        echo -e "\n${RED}✗ Timeout esperando healthcheck ($MAX_WAIT_SECONDS s)${NC}"
        docker logs "$CONTAINER_NAME" | tail -n 10
        return 1
    fi
    echo -e " ${GREEN}¡Listo!${NC}"

    # Test Conexión Normal
    echo -n "Prueba conexión estándar ($TEST_USER): "
    if eval "$std_cmd" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ PASS${NC}"
    else
        echo -e "${RED}❌ FAIL${NC}"
        echo "Comando ejecutado: $std_cmd"
        eval "$std_cmd" || true
        return 1
    fi

    # Test Conexión Admin
    if [ -n "$admin_cmd" ]; then
        echo -n "Prueba conexión administrador: "
        if eval "$admin_cmd" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ PASS${NC}"
        else
            echo -e "${RED}❌ FAIL${NC}"
            echo "Comando ejecutado: $admin_cmd"
            eval "$admin_cmd" || true
            return 1
        fi
    fi

    return 0
}

# Definir comandos de validación (docker exec)
# Se evalúan dentro del contenedor

CMD_POSTGRES_STD="docker exec -e PGPASSWORD=$TEST_PASS $CONTAINER_NAME psql -h localhost -p 5432 -U $TEST_USER -d $TEST_DB -c '\q'"
CMD_POSTGRES_ADM="docker exec -e PGPASSWORD=$TEST_PASS $CONTAINER_NAME psql -h localhost -p 5432 -U postgres -d $TEST_DB -c '\q'"

CMD_MYSQL_STD="docker exec $CONTAINER_NAME mysql -h 127.0.0.1 -P 3306 -u $TEST_USER -p$TEST_PASS -e 'SELECT 1;'"
CMD_MYSQL_ADM="docker exec $CONTAINER_NAME mysql -h 127.0.0.1 -P 3306 -u root -p$TEST_PASS -e 'SELECT 1;'"

CMD_MARIADB_STD="docker exec $CONTAINER_NAME mariadb -h 127.0.0.1 -P 3307 -u $TEST_USER -p$TEST_PASS -e 'SELECT 1;'"
CMD_MARIADB_ADM="docker exec $CONTAINER_NAME mariadb -h 127.0.0.1 -P 3307 -u root -p$TEST_PASS -e 'SELECT 1;'"

CMD_SQLITE_STD="docker exec $CONTAINER_NAME sqlite3 /var/lib/sql-engine-lab/data/sqlite/${TEST_DB}.sqlite '.databases'"
CMD_SQLITE_ADM="" # SQLite no tiene admin en este contexto

CMD_ORACLE_STD="echo 'EXIT' | docker exec -i $CONTAINER_NAME sqlplus -s $TEST_USER/$TEST_PASS@localhost:1521/FREEPDB1"
CMD_ORACLE_ADM="echo 'EXIT' | docker exec -i $CONTAINER_NAME sqlplus -s sys as sysdba/$TEST_PASS@localhost:1521/FREEPDB1"

CMD_SQLSERVER_STD="docker exec $CONTAINER_NAME /opt/mssql-tools18/bin/sqlcmd -S localhost,1433 -U $TEST_USER -P $TEST_PASS -Q 'SELECT 1' -C -b"
CMD_SQLSERVER_ADM="docker exec $CONTAINER_NAME /opt/mssql-tools18/bin/sqlcmd -S localhost,1433 -U sa -P $TEST_PASS -Q 'SELECT 1' -C -b"

FAILS=0

test_engine "sqlite" "$CMD_SQLITE_STD" "$CMD_SQLITE_ADM" || ((FAILS++))
test_engine "postgres" "$CMD_POSTGRES_STD" "$CMD_POSTGRES_ADM" || ((FAILS++))
test_engine "mysql" "$CMD_MYSQL_STD" "$CMD_MYSQL_ADM" || ((FAILS++))
test_engine "mariadb" "$CMD_MARIADB_STD" "$CMD_MARIADB_ADM" || ((FAILS++))
test_engine "sqlserver" "$CMD_SQLSERVER_STD" "$CMD_SQLSERVER_ADM" || ((FAILS++))
test_engine "oracle" "$CMD_ORACLE_STD" "$CMD_ORACLE_ADM" || ((FAILS++))

echo -e "\n---------------------------------------------------"
if [ $FAILS -eq 0 ]; then
    echo -e "${GREEN}🎉 TODOS LOS TESTS PASARON EXITOSAMENTE 🎉${NC}"
else
    echo -e "${RED}💥 $FAILS MOTOR(ES) FALLARON LOS TESTS 💥${NC}"
    exit 1
fi
