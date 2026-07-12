# SQL Engine Laboratory — Tablero de Tareas

## En progreso
_(nada)_
## Listo para tomar (Próximos pasos post-MVP)

### Imagen Docker
- [ ] Publicar imagen en Docker Hub: `docker buildx build --platform linux/amd64,linux/arm64 -t hachimakidev/sql-engine-lab:latest --push .`
- [ ] Tests de integración: probar cada motor con `docker run` manual
- [ ] ADR sobre la estrategia de versionado de la imagen (`:latest` vs `:1.0.0`)

### Extensión VS Code
- [ ] Crear ícono SVG para la extensión (`resources/icon.svg` y `resources/icon.png`)
- [ ] Publicar en VS Code Marketplace (`vsce publish`)
- [ ] Tests de integración VS Code (`vscode/treeView.test.ts`)
- [ ] Soporte para credenciales personalizadas via settings de VS Code

### Fase 2 (post-MVP)
- [ ] Terminal integrada auto-conectada al motor activo
- [ ] Administración visual (usuarios, tablas, queries)
- [ ] Sistema de laboratorios exportables
- [ ] Comparación entre motores

## Bloqueado
_(nada)_

## Hecho

### Fase 0 — Scaffolding
- [x] Estructura base del repositorio (monorepo)
- [x] AGENTS.md, ARCHITECTURE.md, TASKS.md, README.md
- [x] ADR 0001: un motor a la vez
- [x] .github/copilot-instructions.md, .agents/config
- [x] Git init + Conventional Commits

### Fase 1 — Imagen Docker
- [x] Dockerfile multi-stage (debian:bookworm-slim base + oracle + sqlserver stages)
- [x] supervisord.conf (todos los programas en autostart=false)
- [x] entrypoint.sh (validación de ENGINE, healthcheck dinámico, señales)
- [x] Motor SQLite: script de init
- [x] Motor PostgreSQL: script de init
- [x] Motor MariaDB: script de init (puerto 3307)
- [x] Motor MySQL: script de init
- [x] Motor Oracle: script de init (gvenzl/oracle-free 23.5, FREEPDB1)
- [x] Motor SQL Server: script de init (Developer Edition, arm64 bajo emulación)
- [x] README de imagen Docker con licencias y atribuciones

### Fase 2 — Extensión VS Code
- [x] Scaffold: package.json, tsconfig.json (strict), ESLint, Prettier, Husky
- [x] engine.types.ts (EngineDefinition, Result<T,E>, todos los tipos)
- [x] postgres.engine.ts, mysql.engine.ts, mariadb.engine.ts, sqlite.engine.ts, oracle.engine.ts, sqlserver.engine.ts
- [x] registry.ts (Registry/Factory pattern)
- [x] dockerClient.ts (Facade sobre dockerode)
- [x] containerLifecycle.ts (Observer/EventEmitter, invariante un motor a la vez)
- [x] connectionBuilder.ts (Strategy pattern)
- [x] treeView.ts (Tree View con íconos de estado en vivo)
- [x] connectionPanel.ts (Webview con datos de conexión y botón copiar)
- [x] commands.ts (5 comandos VS Code con manejo de errores)
- [x] extension.ts (entry point — solo wiring)
- [x] Tests unitarios: registry, connectionBuilder, containerLifecycle
- [x] Detección automática de Docker socket y SO (agente: antigravity, completado 2026-07-10)
- [x] Rediseño completo de UX/UI del Webview con pestañas, estado de carga y comandos de prueba (agente: antigravity, completado 2026-07-10)
- [x] Resiliencia de puertos dinámicos y configuración de credenciales visual con InputBox (agente: antigravity, completado 2026-07-10)
- [x] Soporte cross-platform: detección de SO, estrategia Docker adaptativa, logging diagnóstico (agente: antigravity, finalizado 2026-07-11)
- [x] Sincronización de contraseñas persistentes y resolución de timeouts de arranque para todos los motores, delegando la inicialización de Oracle al script nativo de gvenzl (agente: antigravity, completado 2026-07-11)
- [x] Reestructuración multi-stage dinámica (`TARGETARCH`) del Dockerfile para habilitar soporte nativo ARM64 de SQL Server usando Azure SQL Edge, y corrección de entrypoint de Oracle Free (agente: antigravity, completado 2026-07-11)
- [x] Creación de Hojas SQL interactivas con ejecución remota vía docker exec y gestor de perfiles persistentes, manteniendo abstracción del ciclo de vida de motores (agente: antigravity, completado 2026-07-11)
- [x] Rediseño de interfaz de tutoriales estilo "Hackerman Profesional" sofisticado y arquitectura de libro con capítulos interactivos y secciones de datos enriquecidos (agente: antigravity, completado 2026-07-12)
