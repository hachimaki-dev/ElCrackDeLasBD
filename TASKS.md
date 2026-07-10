# SQL Engine Laboratory — Tablero de Tareas

## En progreso
- [ ] Estructura base del repositorio (agente: antigravity, iniciado 2026-07-10)

## Listo para tomar

### Imagen Docker (Fase 1)
- [ ] Dockerfile multi-stage con los 6 motores
- [ ] supervisord.conf
- [ ] entrypoint.sh
- [ ] Motor SQLite: script de init
- [ ] Motor PostgreSQL: script de init
- [ ] Motor MariaDB: script de init
- [ ] Motor MySQL: script de init
- [ ] Motor Oracle: script de init
- [ ] Motor SQL Server: script de init
- [ ] README de la imagen Docker (licencias, atribuciones)

### Extensión VS Code (Fase 2)
- [ ] Scaffold extensión TypeScript + dependencias
- [ ] engine.types.ts (interfaz EngineDefinition, Result<T,E>)
- [ ] postgres.engine.ts (adapter)
- [ ] mysql.engine.ts (adapter)
- [ ] mariadb.engine.ts (adapter)
- [ ] sqlite.engine.ts (adapter)
- [ ] oracle.engine.ts (adapter)
- [ ] sqlserver.engine.ts (adapter)
- [ ] registry.ts (catálogo de motores)
- [ ] dockerClient.ts (facade sobre dockerode)
- [ ] containerLifecycle.ts (ciclo de vida + eventos)
- [ ] connectionBuilder.ts (strategy de conexión)
- [ ] treeView.ts (Tree View lateral)
- [ ] connectionPanel.ts (Webview con datos de conexión)
- [ ] commands.ts (comandos VS Code)
- [ ] extension.ts (wiring)
- [ ] Tests unitarios de core/
- [ ] Tests de vscode/
- [ ] ESLint + Prettier + Husky config

### Integración (Fase 3)
- [ ] Empaquetado .vsix
- [ ] Documentación final

## Bloqueado
_(nada por ahora)_

## Hecho
_(nada por ahora)_
