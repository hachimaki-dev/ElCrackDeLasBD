# Contexto del Proyecto para Agentes de IA (SQL Engine Laboratory)

Este documento centraliza toda la información clave sobre el proyecto para que cualquier agente de IA entienda qué se está construyendo, cómo funciona por debajo, su arquitectura y cómo interactúa el usuario con el sistema.

---

## 1. ¿Qué es el proyecto? (Visión y Objetivo)

**SQL Engine Laboratory** es una extensión de Visual Studio Code diseñada para abstraer por completo la complejidad de instalar y configurar motores de bases de datos. 
Permite a un usuario levantar con un solo clic cualquier motor de base de datos SQL corriendo localmente mediante contenedores Docker, entregando de inmediato las credenciales y el comando de conexión (para la terminal) listo para usarse. 

**Reglas de negocio clave (MVP):**
- El usuario **NUNCA** interactúa con Docker directamente. La extensión hace todo el trabajo pesado.
- **Un motor a la vez:** Por decisiones de producto y consumo de recursos, solo puede correr un motor SQL de forma simultánea. Al cambiar de motor, el anterior se detiene automáticamente.

---

## 2. Configuración del Proyecto y Estructura

El repositorio utiliza una estructura modular (estilo monorepo) que separa responsabilidades:

```text
sql-engine-lab/
├── packages/
│   ├── extension/       # Código fuente de la extensión VS Code (Node.js/TypeScript)
│   ├── webview-ui/      # UI construida en React para los paneles interactivos
│   └── docker-image/    # Definición de las imágenes Docker (Dockerfile, scripts init)
├── scripts/             # Scripts de utilidad (ej. testing con test-extension.sh)
├── PLAN.md              # Documento del plan de negocio y MVP
├── ARCHITECTURE.md      # Detalles arquitectónicos y diagramas
└── ENGINEERING_STANDARDS.md # Estándares de código (Conventional Commits, Testing, TypeScript strict)
```

**Flujo de Desarrollo:**
- Si modificas el Core (extensión), ejecutas `npm run compile` dentro de `packages/extension`.
- Si modificas la UI, debes ejecutar `npm install` y `npm run build` en `packages/webview-ui` para que la extensión lea los assets empaquetados. **Nota vital:** Los cambios en React no se aplican solos al compilar la extensión.

---

## 3. Arquitectura del Sistema

El proyecto tiene una estricta separación de responsabilidades para mantener la lógica de dominio (Core) completamente desacoplada de la vista (VS Code UI).

### Capas Principales:
1. **VS Code Layer (`vscode/`)**: Contiene los comandos, Tree Views (barra lateral) y el Webview Panel. **Nunca** debe tener lógica de negocio.
2. **Core Layer (`core/`)**:
   - **`engines/`**: Un registro (`registry.ts`) y adaptadores específicos para cada motor, donde se configuran el puerto base y los parámetros de conexión.
   - **`docker/`**: Un wrapper robusto (`dockerClient.ts` sobre la librería `dockerode`) que orquesta el ciclo de vida de los contenedores (`containerLifecycle.ts`), manejo de imágenes, diagnóstico del SO (`dockerDiagnostics.ts`) sin usar bash scripts.
   - **`connection/`**: Lógica para ensamblar los comandos de conexión de BASH nativos listos para que el usuario haga copy-paste.

### Gestión Docker:
Se compila y se usa de base una única imagen Docker gigante (`sql-engine-lab:latest`) que incluye los binarios de múltiples motores. 
Para gestionar que corra un motor a la vez dentro de la imagen, se utiliza **`supervisord`** con `autostart=false` en todos los procesos. El script de entrada (Entrypoint) lee una variable de entorno (`ENV ENGINE=postgres`) y enciende unicamente el demonio solicitado.

> **Excepción (ADR 0002)**: Oracle Database usa su propia imagen oficial debido a problemas de compatibilidad en la base compartida de Debian/Linux.

---

## 4. ¿Cómo lo hace? (Mecánica Técnica)

1. Cuando se solicita arrancar un motor, `ContainerLifecycle` emite eventos de estado: `pulling` -> `starting` -> `running`.
2. Utiliza **`dockerode`** a través de sockets o APIs HTTP locales de Docker Desktop para hacer `pull` de la imagen si es necesario, y luego un `create` y `start` del contenedor, inyectando variables de usuario por defecto.
3. El sistema monitorea el *healthcheck* (cada motor tarda distinto, ej. Oracle es lento, SQLite/Postgres muy rápidos).
4. El Webview Panel de React en `webview-ui` escucha estos eventos mandados por `vscode.postMessage` para reaccionar mostrando loaders visuales y pantallas de bloqueo temporales hasta que la base esté en `running`.

---

## 5. UI y UX: Interacción actual con el usuario

La interfaz está dividida en dos componentes principales dentro de VS Code:

### A. La Barra Lateral (Tree View)
Es el punto de entrada principal. El usuario ve una lista de motores soportados (PostgreSQL, MySQL, MariaDB, SQLite, Oracle, SQL Server) con botones para "Iniciar" y "Detener". 

### B. El Panel Principal (React Webview)
Una vez que el usuario inicia un motor, se abre un dashboard interactivo en React. La experiencia es inmersiva y moderna. Tiene tres secciones principales (Pestañas):

1. **Mis Motores (Dashboard):**
   - Muestra el estado del motor activo (iniciando, descargando, corriendo).
   - Despliega el puerto mapeado y un recuadro de código que provee el comando exacto (ej. `psql -h localhost -p ...`) con un botón para **"Copiar Comando"**.
   - Posee pantallas interactivas de carga (pulso / spinners) mientras los contenedores se descargan (`pulling`) o inician (`starting`).

2. **Tutoriales (Experiencia Gamificada / UDL):**
   - Interfaz con diseño tipo "Libro de texto", que contiene un sidebar y un lector central.
   - Sirve como plataforma educativa. El usuario puede ver su **porcentaje de progreso**, capítulos bloqueados/completados y lecciones.
   - **UX de Aprendizaje**: Integra *Universal Design for Learning (UDL)* y mecánicas de motivación (*Octalysis*). Las lecciones (ej. DDL Básico, Joins) traen narrativa de rol (Lore/Misiones de DBA), Analogías Visuales, Deep Dives técnicos y botones de acción ("Abrir Sandbox", "Completar Reto").
   - El sistema avisa si un capítulo es avanzado y requiere prerequisitos (capítulos anteriores resueltos).

3. **Perfil Operativo (Gamificación):**
   - Una pantalla de estadísticas para el usuario. Le asigna niveles, insignias y muestra métricas de progreso detallado por áreas del conocimiento en bases de datos (DDL, DML, Optimización, Arquitectura).

### Flujo Típico de Usuario:
1. Instala la extensión y abre la vista "SQL Engine Lab".
2. Hace clic en Iniciar "PostgreSQL".
3. La interfaz se pone en modo `loading`.
4. El contenedor arranca; el Webview cambia a estado `running`.
5. El usuario copia el comando en pantalla, abre su propia terminal del sistema y lo pega.
6. El usuario navega a la pestaña de Tutoriales, lee la misión "Crear Tablas", abre el Sandbox, y al lograrlo, marca el reto como completado.
7. El sistema le otorga puntos (XP) y actualiza su perfil operativo.
