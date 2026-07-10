# SQL Engine Laboratory — Docker Image

Imagen Docker multi-motor que contiene 6 motores SQL. Solo un motor corre a la vez, controlado por la variable de entorno `ENGINE`.

## Motores soportados

| Motor | Puerto | Comando de conexión |
|---|---|---|
| PostgreSQL | 5432 | `psql -h localhost -p 5432 -U labuser -d labdb` |
| MySQL | 3306 | `mysql -h 127.0.0.1 -P 3306 -u labuser -p labdb` |
| MariaDB | 3307 | `mariadb -h 127.0.0.1 -P 3307 -u labuser -p labdb` |
| SQLite | — | `sqlite3 /var/lib/sql-engine-lab/data/sqlite/labdb.sqlite` |
| Oracle Free | 1521 | `sqlplus labuser/labpassword@localhost:1521/FREEPDB1` |
| SQL Server | 1433 | `sqlcmd -S localhost,1433 -U labuser -P labpassword -d labdb -C` |

## Uso rápido

```bash
# Build local
docker build -t sql-engine-lab:dev .

# Iniciar PostgreSQL
docker run -e ENGINE=postgres -p 5432:5432 sql-engine-lab:dev

# Iniciar MySQL
docker run -e ENGINE=mysql -p 3306:3306 sql-engine-lab:dev

# Iniciar MariaDB
docker run -e ENGINE=mariadb -p 3307:3307 sql-engine-lab:dev

# Iniciar SQLite (no requiere mapeo de puerto)
docker run -e ENGINE=sqlite sql-engine-lab:dev

# Iniciar Oracle Free (primera vez tarda 1-2 minutos)
docker run -e ENGINE=oracle -p 1521:1521 sql-engine-lab:dev

# Iniciar SQL Server
docker run -e ENGINE=sqlserver -p 1433:1433 sql-engine-lab:dev
```

## Build multi-arquitectura

```bash
docker buildx build --platform linux/amd64,linux/arm64 \
  -t hachimakidev/sql-engine-lab:latest --push .
```

## Credenciales por defecto

| Variable | Valor por defecto |
|---|---|
| `LAB_USER` | `labuser` |
| `LAB_PASSWORD` | `labpassword` |
| `LAB_DATABASE` | `labdb` |

Estas pueden ser overrideadas al hacer `docker run`:
```bash
docker run -e ENGINE=postgres -e LAB_USER=miusuario -e LAB_PASSWORD=mipassword -e LAB_DATABASE=midb -p 5432:5432 sql-engine-lab:dev
```

## Variables de entorno

| Variable | Requerida | Descripción |
|---|---|---|
| `ENGINE` | **Sí** | Motor a arrancar: `postgres`, `mysql`, `mariadb`, `sqlite`, `oracle`, `sqlserver` |
| `LAB_USER` | No | Usuario de la BD (default: `labuser`) |
| `LAB_PASSWORD` | No | Password del usuario (default: `labpassword`) |
| `LAB_DATABASE` | No | Nombre de la BD (default: `labdb`) |

## Arquitectura interna

- **Base**: `debian:bookworm-slim`
- **Orquestador**: `supervisord` con `autostart=false` en todos los programas
- **Selección de motor**: `entrypoint.sh` lee `$ENGINE`, ejecuta `engines/<motor>/init.sh`, y luego arranca el programa correspondiente via `supervisorctl`
- **SQLite**: excepción — no es un daemon, el contenedor mantiene vivo con `tail -f`

## Atribuciones y licencias

| Motor | Imagen base / referencia | Licencia |
|---|---|---|
| PostgreSQL | Imagen oficial `postgres` | [PostgreSQL License](https://www.postgresql.org/about/licence/) |
| MySQL | Imagen oficial `mysql` | [GPL v2](https://www.mysql.com/about/legal/) (Community Edition) |
| MariaDB | Imagen oficial `mariadb` | [GPL v2](https://mariadb.com/kb/en/mariadb-license/) |
| SQLite | — | [Public Domain](https://www.sqlite.org/copyright.html) |
| Oracle Free | [`gvenzl/oracle-free`](https://github.com/gvenzl/oci-oracle-free) por Gerald Venzl | Oracle Database Free: [Oracle Free Use Terms](https://www.oracle.com/downloads/licenses/oracle-free-license.html) |
| SQL Server | [`mcr.microsoft.com/mssql/server`](https://hub.docker.com/_/microsoft-mssql-server) | [Microsoft EULA](https://go.microsoft.com/fwlink/?linkid=857698) (Developer Edition, gratuita para desarrollo) |

### Nota sobre Oracle
Esta imagen utiliza binarios de Oracle Database Free extraídos de la imagen `gvenzl/oracle-free` creada por [Gerald Venzl](https://github.com/gvenzl). Se da atribución al trabajo de Gerald Venzl y se respeta la licencia original. Oracle Database Free se distribuye bajo los [Oracle Free Use Terms and Conditions](https://www.oracle.com/downloads/licenses/oracle-free-license.html).

### Nota sobre SQL Server
SQL Server no tiene soporte arm64 nativo. En Mac con Apple Silicon (M1/M2/M3) corre bajo emulación via Docker Desktop (Rosetta/QEMU), lo que puede resultar en rendimiento reducido. Esto es una limitación conocida y documentada, no un bug de esta imagen.
