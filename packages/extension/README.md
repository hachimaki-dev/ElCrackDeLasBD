# SQL Engine Laboratory — Extensión VS Code

Levanta cualquier motor SQL con un clic y obtén los datos de conexión listos para usar.

## Motores soportados

| Motor | Puerto |
|---|---|
| SQLite | — |
| PostgreSQL | 5432 |
| MariaDB | 3307 |
| MySQL | 3306 |
| Oracle Free | 1521 |
| SQL Server | 1433 |

## Requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) corriendo
- VS Code 1.85+

## Cómo usar

1. Abre el panel lateral **SQL Engine Lab** (ícono en la Activity Bar)
2. Haz clic en **Iniciar** junto al motor que quieres usar
3. La extensión descarga la imagen, arranca el contenedor y muestra los datos de conexión
4. Copia el comando de conexión y pégalo en tu terminal
5. Haz clic en **Detener** cuando termines

## Desarrollo local

```bash
# Instalar dependencias
npm install

# Compilar TypeScript
npm run compile

# Modo watch (recompila al guardar)
npm run watch

# Linting
npm run lint

# Tests
npm test

# Empaquetar extensión
npm run package
```

## Estructura del código

```
src/
├── core/                    # Lógica de negocio — sin dependencia de VS Code
│   ├── engines/             # Adapters de motores (Open/Closed Principle)
│   │   ├── engine.types.ts  # Interfaces y tipos centrales
│   │   ├── registry.ts      # Catálogo de motores
│   │   ├── postgres.engine.ts
│   │   ├── mysql.engine.ts
│   │   ├── mariadb.engine.ts
│   │   ├── sqlite.engine.ts
│   │   ├── oracle.engine.ts
│   │   └── sqlserver.engine.ts
│   ├── docker/              # Facade sobre dockerode
│   │   ├── dockerClient.ts
│   │   └── containerLifecycle.ts
│   └── connection/          # Strategy para comandos de conexión
│       └── connectionBuilder.ts
├── vscode/                  # Capa VS Code
│   ├── treeView.ts          # Tree View lateral
│   ├── connectionPanel.ts   # Webview de datos de conexión
│   └── commands.ts          # Comandos de VS Code
└── extension.ts             # Entry point — solo wiring
```

Ver [ENGINEERING_STANDARDS.md](../../ENGINEERING_STANDARDS.md) para los patrones y estándares del proyecto.
