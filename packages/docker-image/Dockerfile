####################################################################
# SQL Engine Laboratory — Multi-Engine Docker Image
#
# Imagen única que contiene 6 motores SQL. Solo uno corre a la vez,
# controlado por la variable de entorno ENGINE.
#
# Motores soportados: postgres, mysql, mariadb, sqlite, oracle, sqlserver
#
# Build multi-arquitectura:
#   docker buildx build --platform linux/amd64,linux/arm64 \
#     -t hachimakidev/sql-engine-lab:latest --push .
#
# Uso:
#   docker run -e ENGINE=<motor> -p <puerto>:<puerto> hachimakidev/sql-engine-lab:latest
####################################################################

# ==================================================================
# Stage 1: Oracle base — extraer binarios de gvenzl/oracle-free
# ==================================================================
FROM --platform=linux/amd64 gvenzl/oracle-free:23.5-slim AS oracle-stage

# ==================================================================
# Stage 2: SQL Server base — extraer binarios de mcr.microsoft.com/mssql/server
# ==================================================================
FROM --platform=linux/amd64 mcr.microsoft.com/mssql/server:2022-latest AS sqlserver-stage

# ==================================================================
# Stage 3: Final — debian:bookworm-slim con todos los motores
# ==================================================================
FROM --platform=linux/amd64 debian:bookworm-slim AS final

LABEL maintainer="SQL Engine Laboratory"
LABEL description="Multi-engine SQL laboratory — one engine at a time via ENV ENGINE"
LABEL org.opencontainers.image.source="https://github.com/tuusuario/sql-engine-lab"

# Evitar prompts interactivos durante instalación
ENV DEBIAN_FRONTEND=noninteractive

# ---- Instalar dependencias base ----
# Cambiamos los repositorios a HTTPS para evitar errores 403 Forbidden en algunas redes/proxies
# y desactivamos la verificación SSL temporalmente para redes corporativas que interceptan el tráfico
RUN sed -i 's/http:/https:/g' /etc/apt/sources.list.d/debian.sources 2>/dev/null || sed -i 's/http:/https:/g' /etc/apt/sources.list 2>/dev/null || true
RUN echo 'Acquire::https::Verify-Peer "false";' > /etc/apt/apt.conf.d/99insecure && \
    apt-get update && apt-get install -y --no-install-recommends \
    supervisor \
    curl \
    gnupg2 \
    lsb-release \
    ca-certificates \
    locales \
    gosu \
    procps \
    && rm -rf /var/lib/apt/lists/*

# ---- Configurar locale ----
RUN sed -i '/en_US.UTF-8/s/^# //g' /etc/locale.gen && locale-gen
ENV LANG=en_US.UTF-8
ENV LANGUAGE=en_US:en
ENV LC_ALL=en_US.UTF-8

# ---- Instalar SQLite (el más simple, no requiere daemon) ----
RUN apt-get update && apt-get install -y --no-install-recommends \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# ---- Instalar PostgreSQL ----
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# ---- Instalar MariaDB ----
RUN apt-get update && apt-get install -y --no-install-recommends \
    mariadb-server \
    mariadb-client \
    && rm -rf /var/lib/apt/lists/*

# ---- Instalar MySQL ----
# Oracle no provee paquetes ARM64 nativos de MySQL para Debian en su repositorio oficial.
# Para mantener compatibilidad en Apple Silicon (M1/M2/M3) sin forzar emulación amd64 completa,
# usamos default-mysql-server (que provee la interfaz y binarios compatibles de MySQL vía MariaDB)
RUN apt-get update && apt-get install -y --no-install-recommends \
    default-mysql-server \
    default-mysql-client \
    && rm -rf /var/lib/apt/lists/*

# ---- Crear usuarios requeridos por los motores ----
RUN groupadd -g 54321 oinstall \
    && groupadd -g 54322 dba \
    && useradd -u 54321 -g oinstall -G dba -d /opt/oracle -s /bin/bash oracle \
    && groupadd -g 10001 mssql \
    && useradd -u 10001 -g mssql -d /var/opt/mssql -s /bin/bash mssql

# ---- Copiar Oracle Free desde stage ----
# Copiamos el Oracle Home completo y dependencias necesarias con los permisos correctos
COPY --chown=oracle:dba --from=oracle-stage /opt/oracle /opt/oracle

# Instalar dependencias de runtime para Oracle
RUN apt-get update && apt-get install -y --no-install-recommends \
    libaio1 \
    && rm -rf /var/lib/apt/lists/*

# Variables de entorno para Oracle
ENV ORACLE_HOME=/opt/oracle/product/23ai/dbhomeFree
ENV PATH="${ORACLE_HOME}/bin:${PATH}"
ENV ORACLE_SID=FREE

# ---- Copiar SQL Server desde stage ----
COPY --chown=mssql:mssql --from=sqlserver-stage /opt/mssql /opt/mssql

# Instalar dependencias de runtime para SQL Server
RUN apt-get update && apt-get install -y --no-install-recommends \
    libldap-2.5-0 \
    libsasl2-2 \
    libsss-nss-idmap0 \
    libatomic1 \
    && rm -rf /var/lib/apt/lists/* \
    && ln -sf /opt/mssql/bin/sqlservr /usr/local/bin/sqlservr

# Instalar herramientas de cliente SQL Server (sqlcmd)
RUN curl -fsSL https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor -o /usr/share/keyrings/microsoft.gpg \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/microsoft.gpg] https://packages.microsoft.com/debian/12/prod bookworm main" \
       > /etc/apt/sources.list.d/mssql-release.list \
    && apt-get update && ACCEPT_EULA=Y apt-get install -y --no-install-recommends \
       mssql-tools18 \
       unixodbc \
    && rm -rf /var/lib/apt/lists/*

ENV PATH="/opt/mssql-tools18/bin:${PATH}"

# ---- Crear directorios de datos y usuario de laboratorio ----
RUN mkdir -p /var/lib/sql-engine-lab/data \
    && mkdir -p /var/log/sql-engine-lab \
    && mkdir -p /var/run/sql-engine-lab \
    && mkdir -p /run/mysqld \
    && mkdir -p /run/postgresql \
    && chmod -R 777 /var/lib/sql-engine-lab \
    && chmod -R 777 /var/log/sql-engine-lab \
    && chmod -R 777 /var/run/sql-engine-lab \
    && chmod -R 777 /run/mysqld \
    && chmod -R 777 /run/postgresql \
    && mkdir -p /tmp/.oracle && chmod 1777 /tmp/.oracle \
    && mkdir -p /var/tmp/.oracle && chmod 1777 /var/tmp/.oracle \
    && chmod -R 777 /opt/oracle/audit 2>/dev/null || true \
    && chmod -R 777 /opt/oracle/diag 2>/dev/null || true

# ---- Copiar scripts de inicialización por motor ----
COPY engines/ /opt/sql-engine-lab/engines/
RUN chmod -R +x /opt/sql-engine-lab/engines/

# ---- Copiar configuración de supervisord ----
COPY supervisord.conf /etc/supervisor/conf.d/sql-engine-lab.conf

# ---- Copiar entrypoint ----
COPY entrypoint.sh /opt/sql-engine-lab/entrypoint.sh
RUN chmod +x /opt/sql-engine-lab/entrypoint.sh

# ---- Variables de entorno por defecto (pueden ser overrideadas) ----
ENV ENGINE=""
ENV LAB_USER=labuser
ENV LAB_PASSWORD=labpassword
ENV LAB_DATABASE=labdb

# ---- Healthcheck genérico ----
# El healthcheck real depende del motor activo; entrypoint.sh crea
# un script /tmp/healthcheck.sh específico para el motor seleccionado
HEALTHCHECK --interval=10s --timeout=5s --start-period=60s --retries=12 \
    CMD /tmp/healthcheck.sh || exit 1

# ---- Exponer puertos comunes (el motor activo usa uno solo) ----
# PostgreSQL: 5432, MySQL: 3306, MariaDB: 3307, Oracle: 1521, SQL Server: 1433
EXPOSE 5432 3306 3307 1521 1433

ENTRYPOINT ["/opt/sql-engine-lab/entrypoint.sh"]
