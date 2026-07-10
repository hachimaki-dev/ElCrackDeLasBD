# SQL Engine Laboratory — Plan de Ejecución MVP

## 1. Objetivo del proyecto

Construir una extensión de Visual Studio Code llamada **SQL Engine Laboratory** que permita a un usuario levantar, con un clic, un motor de base de datos SQL corriendo en Docker, y obtener inmediatamente los datos de conexión para usarlo desde su propia terminal (integrada o del sistema) con el cliente nativo del motor (psql, mysql, sqlplus, sqlcmd, etc.).

El usuario **nunca interactúa con Docker directamente**. La extensión abstrae por completo la descarga de imágenes, el arranque/parada de contenedores y la entrega de credenciales.

Este documento define el **alcance del MVP**, no la visión completa del producto (que incluye a futuro: administración visual, terminal auto-conectada, laboratorios exportables, comparación entre motores — ver sección 7).

---

## 2. Decisiones de arquitectura ya tomadas (no reabrir sin justificación)

| Decisión | Resolución |
|---|---|
| ¿Una imagen o varias? | **Una sola imagen Docker**, publicada en Docker Hub bajo la cuenta personal del autor del proyecto. |
| ¿Cuántos motores corren a la vez dentro del contenedor? | **Uno solo.** Se usa `supervisord` con `autostart=false` en todos los programas; una variable de entorno `ENGINE` define cuál arranca al iniciar el contenedor. |
| ¿Cómo se cambia de motor? | Deteniendo el contenedor activo y arrancando uno nuevo con `ENGINE` distinto (MVP), o vía `supervisorctl` dentro del mismo contenedor (mejora post-MVP). |
| Imagen base para Oracle | `gvenzl/oracle-free` (soporta arm64 nativo desde 23.5, sin emulación en Apple Silicon). Se usa como base/inspiración respetando su licencia y dando atribución en el README; Oracle Database en sí se rige por los *Oracle Free Use Terms and Conditions*. |
| Imagen base para SQL Server | `mcr.microsoft.com/mssql/server`. **No tiene soporte arm64 nativo** — en Mac Apple Silicon corre bajo emulación (Rosetta/QEMU vía Docker Desktop), más lento. Esto es una limitación conocida y aceptada, no un bug a resolver en el MVP. |
| Resto de motores | Imágenes oficiales: `postgres`, `mysql`, `mariadb`. SQLite no requiere servidor/contenedor propio (es embebido) — se resuelve distinto, ver nota en sección 4. |
| Entorno de desarrollo principal | Mac con Apple Silicon (arm64). Toda imagen debe buildearse multi-arquitectura (`amd64` + `arm64`) vía `docker buildx`. |
| Alcance del MVP | Un solo click para levantar un motor + pantalla con datos de conexión y botón "copiar". **Sin** administración visual, **sin** terminal auto-conectada, **sin** laboratorios. |

---

## 3. Flujo de usuario del MVP (única fuente de verdad del comportamiento esperado)

1. Usuario instala la extensión desde el Marketplace de VS Code (o VSIX en fase beta).
2. Ve un panel lateral (Tree View) con la lista de motores soportados: PostgreSQL, MySQL, MariaDB, SQLite, Oracle, SQL Server.
3. Hace clic en "Iniciar" sobre un motor.
4. La extensión:
   a. Verifica que Docker esté corriendo (si no, muestra mensaje claro pidiendo iniciar Docker Desktop).
   b. Si es la primera vez, hace `docker pull` de la imagen (`tuusuario/sql-engine-lab:latest`) mostrando progreso.
   c. Ejecuta `docker run` con `-e ENGINE=<motor>`, mapeo de puerto por defecto del motor, y variables de usuario/password (generadas o fijas para el MVP).
   d. Espera el healthcheck del motor (cada motor tarda distinto en estar listo; Oracle es el más lento, puede tardar 1-2 minutos).
5. Cuando el motor está listo, la extensión muestra en un panel o Webview:
   - Host, puerto, usuario, password
   - El comando de conexión ya armado para el cliente nativo (ej. `psql -h localhost -p 5432 -U labuser -d labdb`)
   - Botón "Copiar comando"
6. El usuario pega el comando en su terminal (cualquiera, no necesariamente la integrada) y empieza a trabajar.
7. Botón "Detener" para parar el motor activo / contenedor.
8. Si el usuario quiere cambiar de motor, la extensión detiene el actual antes de levantar el nuevo (un motor a la vez, siempre).

---

## 4. Alcance técnico por etapas

### Etapa 1 — La imagen Docker (antes que la extensión; se puede probar con `docker run` manual sin escribir código de extensión todavía)

1. Crear cuenta en Docker Hub (si no existe) y definir nombre del repositorio, ej. `tuusuario/sql-engine-lab`.
2. Dockerfile que:
   - Usa una base Linux liviana (ej. `debian:bookworm-slim` o similar) o multi-stage combinando las imágenes base de cada motor.
   - Instala/copia binarios de: PostgreSQL, MySQL, MariaDB, SQLite (cliente), Oracle Free (basado en `gvenzl/oracle-free`), SQL Server (`mssql-server`).
   - Instala `supervisord`.
   - Todos los programas en `supervisord.conf` con `autostart=false`.
3. `entrypoint.sh`: lee `$ENGINE`, valida que sea uno soportado, ejecuta `supervisorctl start <engine>` (o inicializa el proceso correspondiente), y mantiene el contenedor vivo mostrando logs del motor activo.
4. **Orden recomendado de incorporación de motores** (de más fácil a más difícil, para poder buildear y probar incrementalmente):
   1. SQLite (no requiere servidor real, es el más simple — validar primero cómo encaja en el modelo "un motor a la vez" ya que no es un daemon)
   2. PostgreSQL
   3. MariaDB
   4. MySQL
   5. Oracle Free (`gvenzl/oracle-free` como base/referencia)
   6. SQL Server (dejar para el final; es el más pesado y el único sin arm64 nativo)
5. Build multi-arquitectura:
   ```
   docker buildx build --platform linux/amd64,linux/arm64 -t tuusuario/sql-engine-lab:latest --push .
   ```
6. Documentar en el README de Docker Hub: atribución a `gvenzl/oracle-free`, link a Oracle Free Use Terms, y licencias de los demás motores (todas permisivas: PostgreSQL license, GPL para MySQL/MariaDB community, MIT-like para SQLite).
7. Probar manualmente (`docker run -e ENGINE=postgres ...`) cada motor antes de pasar a la Etapa 2, confirmando: arranca, acepta conexiones, persiste datos si se usa volumen, se detiene limpio.

**Criterio de salida de la Etapa 1**: los 6 motores (o al menos los primeros 4-5) arrancan individualmente desde la imagen publicada en Docker Hub, vía `docker run` manual, sin necesidad de la extensión todavía.

### Etapa 2 — La extensión de VS Code

1. Generar el scaffold con `yo code` (Yeoman generator oficial de extensiones VS Code), TypeScript.
2. Dependencia clave: `dockerode` (cliente Docker API para Node.js) — preferido sobre invocar `docker` por shell, por robustez multiplataforma.
3. Estructura mínima:
   - `src/extension.ts`: activación, registro de comandos.
   - `src/engines.ts`: catálogo de motores soportados (id, nombre, puerto default, template de comando de conexión con placeholders).
   - `src/dockerManager.ts`: wrapper sobre dockerode — `pullImage()`, `startEngine(engineId)`, `stopEngine()`, `getStatus()`.
   - `src/treeView.ts`: Tree View lateral listando motores y su estado (detenido/iniciando/corriendo).
   - `src/connectionPanel.ts`: Webview o QuickPick que muestra host/puerto/usuario/password/comando + botón copiar.
4. Manejo de errores explícito y visible al usuario (no silencioso) para: Docker no corriendo, puerto ocupado, timeout de healthcheck, fallo de pull.
5. Empaquetar como `.vsix` con `vsce package` para pruebas locales antes de publicar al Marketplace.

**Criterio de salida de la Etapa 2 / MVP completo**: desde la extensión instalada, un usuario nuevo puede iniciar cualquiera de los motores incorporados en la Etapa 1, ver sus datos de conexión, copiarlos, conectarse desde su propia terminal, y detener el motor — todo sin haber escrito un comando de Docker.

---

## 5. Fuera de alcance del MVP (explícitamente pospuesto, no eliminado)

- Administración visual (usuarios, roles, tablas, esquemas, backups) por motor.
- Apertura automática de terminal integrada ya conectada al cliente nativo.
- Sistema de laboratorios exportables/importables (datasets de ejemplo, escenarios).
- Comparación educativa entre motores (equivalencias, diferencias conceptuales).
- Ejecución simultánea de más de un motor a la vez.
- Cambio de motor "en caliente" dentro del mismo contenedor sin reiniciarlo (se empieza deteniendo/arrancando el contenedor completo).

Estas quedan como **Fase 2 y posteriores**, y la arquitectura (Engine Adapter Pattern del lado de la extensión, catálogo desacoplado de motores) debe dejarse pensada para no requerir rediseño cuando se aborden.

---

## 6. Riesgos y supuestos que el agente ejecutor debe tener presentes

- **SQL Server en arm64**: funcionará bajo emulación en Mac Apple Silicon. Es esperable que sea lento en el entorno de desarrollo; no tratar la lentitud como bug durante el desarrollo en esa máquina.
- **Oracle Free en arm64**: desde la versión 23.5 tiene soporte nativo — confirmar que la imagen base usada (`gvenzl/oracle-free`) esté en una tag ≥23.5 para evitar emulación innecesaria.
- **Tamaño de la imagen final**: con 6 motores instalados, la imagen puede ser considerablemente pesada (varios GB). Esto es aceptable para el MVP; optimización de tamaño (capas, multi-stage builds) es una mejora posterior, no un bloqueante.
- **Un motor a la vez es una decisión de producto, no solo técnica**: no agregar la capacidad de correr dos motores simultáneos "porque es fácil" sin antes confirmar con el responsable del proyecto, ya que cambia el modelo de recursos y de UI.
- **Licencias**: no remover ni omitir atribuciones de las imágenes base de terceros (especialmente Oracle) al publicar la imagen propia en Docker Hub.

---

## 7. Visión completa del producto (contexto, no para ejecutar todavía)

Para que el agente entienda hacia dónde escala esto después del MVP: la extensión aspira a ser un "laboratorio universal" plug & play para múltiples motores SQL, con administración visual completa, terminal nativa auto-conectada, laboratorios reutilizables exportables/importables para uso educativo y profesional, y un módulo comparativo entre motores. La arquitectura del MVP (catálogo de motores desacoplado, wrapper de Docker aislado del resto de la extensión) debe construirse pensando en no bloquear ese crecimiento, pero **nada de la sección 5 se implementa hasta que el MVP de la sección 3 esté funcionando de punta a punta**.