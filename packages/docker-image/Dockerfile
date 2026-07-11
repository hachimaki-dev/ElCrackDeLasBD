####################################################################
# SQL Engine Laboratory — Multi-Engine Docker Image
#
# Imagen única que contiene 6 motores SQL. Solo uno corre a la vez,
# controlado por la variable de entorno ENGINE.
#
# Motores soportados: postgres, mysql, mariadb, sqlite, oracle, sqlserver
#
# Compatibilidad de arquitecturas:
#   - arm64 nativo: postgres, mysql, mariadb, sqlite, oracle (gvenzl/oracle-free 23.5+)
#   - amd64 only (emulación en arm64): sqlserver (limitación de Microsoft)
#
# Build para desarrollo local (usa la arch nativa del host):
#   docker build -t sql-engine-lab:dev .
#
# Build multi-arquitectura para publicación:
#   docker buildx build --platform linux/amd64,linux/arm64 \
#     -t hachimakidev/sql-engine-lab:latest --push .
#
# Uso:
#   docker run -e ENGINE=<motor> -p <puerto>:<puerto> hachimakidev/sql-engine-lab:latest
####################################################################

# ==================================================================
# Stage 1: Oracle base — extraer binarios de gvenzl/oracle-free
# Soporta arm64 nativo desde 23.5 — NO forzar --platform=linux/amd64
# Ref: https://hub.docker.com/r/gvenzl/oracle-free
# ==================================================================
FROM gvenzl/oracle-free:23.5-slim AS oracle-stage

# ==================================================================
# Stage 2: SQL Server base
# Microsoft NO publica imagen arm64 para mssql-server, así que usamos
# mssql-server (amd64) forzada para todas las arquitecturas.
# ==================================================================
# Stage 2: SQL Server base
# Microsoft NO publica imagen arm64 para mssql-server, así que usamos
# mssql-server (amd64) forzada para todas las arquitecturas.
# ==================================================================
FROM --platform=linux/amd64 mcr.microsoft.com/mssql/server:2022-latest AS sqlserver-stage

# ==================================================================
# Stage 3: Final — debian:bookworm-slim
# Sin --platform para que use la arquitectura nativa del host.
# Esto permite que postgres, mysql, mariadb, sqlite y oracle
# corran nativos en arm64 (Apple Silicon) sin emulación.
# ==================================================================
FROM debian:bookworm-slim AS final

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
COPY --chown=oracle:dba --from=oracle-stage /usr/bin/7zzs /usr/bin/7zzs

# Instalar dependencias de runtime para Oracle
RUN apt-get update && apt-get install -y --no-install-recommends \
    libaio1 \
    && rm -rf /var/lib/apt/lists/*

# Variables de entorno para Oracle
ENV ORACLE_BASE=/opt/oracle
ENV ORACLE_BASE_CONFIG=/opt/oracle/product/23ai/dbhomeFree
ENV ORACLE_BASE_HOME=/opt/oracle/product/23ai/dbhomeFree
ENV ORACLE_HOME=/opt/oracle/product/23ai/dbhomeFree
ENV ORACLE_SID=FREE
ENV NLS_LANG=.AL32UTF8
ENV PATH="${ORACLE_HOME}/bin:/opt/oracle:${PATH}"

# ---- Copiar SQL Server desde stage ----
COPY --chown=mssql:mssql --from=sqlserver-stage /opt/mssql /opt/mssql
# Copiar herramientas de cliente SQL Server (sqlcmd) desde el stage
COPY --from=sqlserver-stage /opt/mssql-tools18 /opt/mssql-tools18
RUN HOSTARCH=$(dpkg --print-architecture) && \
    if [ "$HOSTARCH" = "arm64" ]; then \
      dpkg --add-architecture amd64 && apt-get update && apt-get install -y --no-install-recommends \
      libldap-2.5-0:amd64 \
      libsasl2-2:amd64 \
      libsss-nss-idmap0:amd64 \
      libatomic1:amd64 \
      libnuma1:amd64 \
      libgssapi-krb5-2:amd64 \
      libkrb5-3:amd64 \
      libk5crypto3:amd64 \
      libcom-err2:amd64 \
      libuuid1:amd64 \
      libpam0g:amd64 \
      libudev1:amd64 \
      libssl3:amd64 \
      libc6:amd64 \
      libstdc++6:amd64 \
      libgcc-s1:amd64 \
      zlib1g:amd64 \
      libkeyutils1:amd64 \
      libaudit1:amd64 \
      libcap-ng0:amd64 \
      unixodbc \
      bzip2 \
      && curl -L https://github.com/microsoft/go-sqlcmd/releases/download/v1.8.2/sqlcmd-linux-arm64.tar.bz2 -o /tmp/sqlcmd.tar.bz2 \
      && tar -xvjf /tmp/sqlcmd.tar.bz2 -C /tmp \
      && mkdir -p /opt/mssql-tools18/bin \
      && mv /tmp/sqlcmd /opt/mssql-tools18/bin/sqlcmd \
      && chmod +x /opt/mssql-tools18/bin/sqlcmd \
      && rm -f /tmp/sqlcmd.tar.bz2; \
    else \
      apt-get update && apt-get install -y --no-install-recommends \
      libldap-2.5-0 \
      libsasl2-2 \
      libsss-nss-idmap0 \
      libatomic1 \
      libnuma1 \
      libgssapi-krb5-2 \
      libkrb5-3 \
      libk5crypto3 \
      libcom-err2 \
      libuuid1 \
      libpam0g \
      libudev1 \
      libssl3 \
      libc6 \
      libstdc++6 \
      libgcc-s1 \
      zlib1g \
      libkeyutils1 \
      libaudit1 \
      libcap-ng0 \
      unixodbc; \
    fi \
    && rm -rf /var/lib/apt/lists/* \
    && ln -sf /opt/mssql/bin/sqlservr /usr/local/bin/sqlservr

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
