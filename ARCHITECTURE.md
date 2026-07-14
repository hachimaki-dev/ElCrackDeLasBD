# SQL Engine Laboratory — Arquitectura

Última actualización: 2026-07-10

## Diagrama general del sistema

```mermaid
graph TB
    subgraph "VS Code"
        UI["vscode/<br/>Tree View + Webview Panel"]
        CMD["vscode/commands.ts<br/>Comandos de usuario"]
    end

    subgraph "Core (sin dependencia de VS Code)"
        REG["core/engines/registry.ts<br/>Catálogo de motores"]
        ENG["core/engines/*.engine.ts<br/>Adapters por motor"]
        DCK["core/docker/dockerClient.ts<br/>Facade sobre dockerode"]
        LCY["core/docker/containerLifecycle.ts<br/>Ciclo de vida + EventEmitter"]
        CON["core/connection/connectionBuilder.ts<br/>Generador de comandos de conexión"]
        PLT["core/docker/platformInfo.ts<br/>Detección de SO y Arch"]
        DIA["core/docker/dockerDiagnostics.ts<br/>Sistema Doctor"]
        ADM["core/admin/adminService.ts<br/>Orquestador de Administración"]
        ADA["core/admin/adminAdapters.ts<br/>Adaptadores de Metadatos SQL"]
        RUN["core/runner/queryRunner.ts<br/>Ejecutor de Consultas en Contenedor"]
    end

    subgraph "Docker"
        IMG["sql-engine-lab:latest<br/>Imagen única multi-motor"]
        CTR["Contenedor<br/>(un motor activo a la vez)"]
    end

    USR["Terminal del usuario<br/>(psql, mysql, sqlplus, sqlcmd...)"]

    UI --> CMD
    CMD --> LCY
    CMD --> CON
    CMD --> DIA
    LCY --> DCK
    LCY --> REG
    LCY --> PLT
    DIA --> DCK
    DIA --> PLT
    REG --> ENG
    DCK --> CTR
    CTR --> IMG
    LCY -.->|eventos de estado| UI
    CON -.->|comando copiado| USR
    USR -->|conexión directa| CTR
    
    UI --> ADM
    ADM --> RUN
    ADM --> ADA
    RUN --> CTR
```

## Flujo de datos

1. **Usuario hace clic en "Iniciar"** en el Tree View → se ejecuta el comando `sqlEngineLab.startEngine`.
2. **`ContainerLifecycle`** consulta el `EngineRegistry` para obtener la definición del motor, luego usa `DockerClient` para pull + run del contenedor con la variable `ENGINE` correcta.
3. **`ContainerLifecycle`** emite eventos de estado (`pulling` → `starting` → `running`) que el Tree View y el Webview Panel observan para actualizar la UI.
4. **`ConnectionBuilder`** genera el comando de conexión (ej. `psql -h localhost -p 5432 -U labuser -d labdb`) usando la template del motor.
5. **Usuario copia el comando** y lo pega en cualquier terminal para conectarse al motor.
6. **Explorador Visual realiza consultas de catálogo** → La UI solicita metadatos a `AdminService`, que utiliza `AdminAdapters` para armar la query y `QueryRunner` para ejecutarla en el contenedor vía Docker socket, retornando la estructura (tablas, columnas, filas, usuarios).

## Principios de separación

| Capa | Responsabilidad | No toca |
|---|---|---|
| `vscode/` | UI, comandos, interacción con API de VS Code | Lógica de negocio, Docker |
| `core/engines/` | Definición de motores, catálogo | Docker, VS Code |
| `core/docker/` | Gestión de contenedores e imágenes | Motores específicos, VS Code |
| `core/connection/` | Generación de connection strings | Docker, VS Code |
| `core/admin/` | Administración visual (queries de catálogo, crear BDs, usuarios) | Interfaz de VS Code |
| `core/runner/` | Ejecución de consultas SQL directas en contenedor | Interfaz de VS Code |

## Imagen Docker

La imagen `sql-engine-lab` contiene 5 de los 6 motores SQL instalados (Postgres, MySQL, MariaDB, SQLite, SQL Server), pero solo uno corre a la vez. La selección se hace via la variable de entorno `ENGINE`. Internamente usa `supervisord` con `autostart=false` en todos los programas.

> [!NOTE]
> **Excepción de Arquitectura (ADR 0002):** El motor Oracle Free se ejecuta utilizando su imagen nativa (`gvenzl/oracle-free:23.5-slim`) directamente y un volumen persistente (`oracle-volume`), en lugar de la imagen unificada `sql-engine-lab`. Esto previene fallos fatales de inicialización del proceso en segundo plano (OFSD) causados por incompatibilidades con la base Debian.

```mermaid
graph LR
    ENV["ENV ENGINE=postgres"] --> EP["entrypoint.sh"]
    EP --> INIT["engines/postgres/init.sh"]
    INIT --> SUP["supervisord"]
    SUP --> PG["PostgreSQL (activo)"]
    SUP -.->|autostart=false| MY["MySQL (inactivo)"]
    SUP -.->|autostart=false| MA["MariaDB (inactivo)"]
    SUP -.->|autostart=false| OR["Oracle (inactivo)"]
    SUP -.->|autostart=false| SS["SQL Server (inactivo)"]
```
