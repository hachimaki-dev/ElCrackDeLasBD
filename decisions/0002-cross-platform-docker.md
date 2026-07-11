# 0002 - Soporte Cross-Platform para Docker Image y Extensión

## Estado
Aceptada

## Contexto
La imagen Docker (`sql-engine-lab`) se construyó inicialmente con `--platform=linux/amd64` hardcodeado
en las 3 instrucciones FROM del Dockerfile. Esto funcionaba en Linux x64 pero al clonar el proyecto
en una Mac con Apple Silicon (arm64), toda la imagen corría bajo emulación QEMU/Rosetta, degradando
el rendimiento de **todos** los motores — incluyendo PostgreSQL, MySQL, MariaDB y SQLite que tienen
soporte nativo arm64.

Además, la extensión no tenía forma de informar al usuario sobre la plataforma detectada ni de
advertir sobre motores que necesariamente correrían bajo emulación.

## Decisión

1. **Dockerfile**: Quitar `--platform=linux/amd64` del stage `final` (debian:bookworm-slim) para que
   use la arquitectura nativa del host. Mantener `--platform=linux/amd64` solo en los stages de
   Oracle y SQL Server, que no tienen imágenes arm64 oficiales.

2. **Extensión**: Agregar módulos `platformInfo.ts` y `dockerDiagnostics.ts` en `core/docker/` que
   detectan el SO y arquitectura, generan warnings de emulación para motores que lo requieran, y
   producen reportes diagnósticos accesibles via Output Channel y comando de VS Code.

3. **Logging**: Agregar un callback de logging opcional a `dockerConfigResolver.ts` y un
   `OutputChannel` dedicado en VS Code para que tanto el usuario como agentes de IA puedan ver
   qué socket se resolvió, qué plataforma se detectó, y qué warnings aplican.

## Consecuencias

### Se gana
- PostgreSQL, MySQL, MariaDB y SQLite corren **nativos** en arm64 (~3-5x más rápido que emulación).
- Debugging cross-platform mucho más fácil con logs estructurados.
- UX mejorada: el usuario sabe de antemano si un motor será lento por emulación.
- El build de desarrollo local funciona sin warnings innecesarios.

### Se sacrifica
- Los binarios de Oracle y SQL Server copiados desde stages amd64 a un contenedor arm64 necesitan
  que el kernel del host tenga `binfmt_misc` registrado (Docker Desktop para Mac ya lo incluye).
- `mssql-tools18` se copia desde el stage en lugar de instalarse via apt (el repo de Microsoft
  no tiene paquetes arm64).
- La imagen final puede tener un tamaño ligeramente mayor por incluir binarios de ambas arquitecturas
  en los stages de Oracle/SQL Server.
