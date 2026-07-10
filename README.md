# SQL Engine Laboratory

> Levanta cualquier motor SQL con un clic desde VS Code — sin tocar Docker.

Una extensión de Visual Studio Code que abstrae por completo la descarga de imágenes, el arranque de contenedores y la entrega de credenciales de conexión para 6 motores SQL.

## Motores soportados

| Motor | Puerto | Cliente nativo |
|---|---|---|
| SQLite | — | `sqlite3` |
| PostgreSQL | 5432 | `psql` |
| MariaDB | 3307 | `mariadb` |
| MySQL | 3306 | `mysql` |
| Oracle Free 23ai | 1521 | `sqlplus` |
| SQL Server 2022 | 1433 | `sqlcmd` |

## Estructura del repositorio

```
sql-engine-lab/
├── PLAN.md                     # Qué se construye (MVP y visión)
├── ENGINEERING_STANDARDS.md    # Cómo se construye (patrones, estilo)
├── AGENTS.md                   # Instrucciones para agentes de IA
├── ARCHITECTURE.md             # Diagrama vivo de la arquitectura
├── TASKS.md                    # Tablero de tareas
├── decisions/                  # Architecture Decision Records (ADRs)
└── packages/
    ├── extension/              # Extensión VS Code (TypeScript)
    └── docker-image/           # Imagen Docker multi-motor
```

## Inicio rápido (desarrollo)

### Imagen Docker

```bash
cd packages/docker-image

# Build local
docker build -t sql-engine-lab:dev .

# Probar motor (sin extensión)
docker run -e ENGINE=postgres -p 5432:5432 sql-engine-lab:dev
psql -h localhost -p 5432 -U labuser -d labdb
```

### Extensión

```bash
cd packages/extension
npm install
npm run compile
# Abrir VS Code → F5 → Extension Development Host
```

## Credenciales por defecto

| Campo | Valor |
|---|---|
| Usuario | `labuser` |
| Password | `labpassword` |
| Base de datos | `labdb` |

## Documentación

- [PLAN.md](./PLAN.md) — Flujo de usuario y etapas del MVP
- [ENGINEERING_STANDARDS.md](./ENGINEERING_STANDARDS.md) — Patrones, testing, convenciones
- [ARCHITECTURE.md](./ARCHITECTURE.md) — Diagrama de arquitectura
- [packages/docker-image/README.md](./packages/docker-image/README.md) — Imagen Docker + licencias
- [packages/extension/README.md](./packages/extension/README.md) — Extensión VS Code

## Licencias

- Extensión: MIT
- Imagen Docker: ver [packages/docker-image/README.md](./packages/docker-image/README.md) para atribuciones por motor
