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

## Requisitos previos

Antes de comenzar, asegúrate de tener instalado y configurado lo siguiente en tu sistema:
- **Node.js** (v20 o superior recomendado) y `npm`
- **Docker** o **Docker Desktop** (asegúrate de que el servicio esté corriendo)
- **Visual Studio Code**

---

## Guía de Inicio Rápido (Tras Clonar)

Sigue estos pasos para compilar e iniciar la aplicación localmente:

### Paso 1: Instalar dependencias y compilar la extensión
Desde la raíz del repositorio clonado, instala las dependencias de la extensión de VS Code y compila el código TypeScript:

```bash
# Entrar al directorio de la extensión
cd packages/extension

# Instalar dependencias de desarrollo y producción
npm install

# Compilar el código TypeScript
npm run compile
```

### Paso 2: Construir la imagen Docker local
La extensión levanta los motores utilizando una imagen Docker multi-motor unificada. Debes construir esta imagen localmente:

```bash
# Volver a la raíz y entrar al directorio de la imagen Docker
cd ../docker-image

# Construir la imagen Docker con el tag esperado
docker build -t sql-engine-lab:dev .
```

### Paso 3: Lanzar la extensión en modo de desarrollo
1. Abre el repositorio completo en Visual Studio Code:
   ```bash
   code ../..
   ```
2. Presiona `F5` (o ve a la pestaña *Run and Debug* y haz clic en **Extension**) para iniciar una nueva ventana de VS Code (*Extension Development Host*) con la extensión cargada.
3. En la barra lateral izquierda aparecerá la sección de **SQL Engine Lab** con el listado de motores disponibles.

---

## Ejecución de Pruebas Unitarias y Linting

Para asegurarte de que todo funciona correctamente después de inicializar la aplicación, puedes ejecutar los linters y las pruebas unitarias:

```bash
# Desde la raíz del repositorio
./scripts/test-extension.sh
```

Este script compila los archivos de prueba, ejecuta el formateador/linter y corre todas las pruebas unitarias utilizando Mocha.

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
