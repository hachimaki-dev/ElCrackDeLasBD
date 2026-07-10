# SQL Engine Laboratory — Estándares de Ingeniería para Agentes

Este documento es el complemento técnico de `PLAN.md`. Mientras `PLAN.md` define **qué** construir, este documento define **cómo** construirlo: patrones, estructura, estilo, documentación y reglas de colaboración, pensado para que el código sea producido y mantenido por una combinación de agentes de IA (Claude Code, GitHub Copilot, Google Antigravity, u otros) y un desarrollador humano, sin que la calidad ni la coherencia se degraden entre sesiones o entre agentes distintos.

Cualquier agente que trabaje en este repositorio debe leer este documento **antes** de escribir código, y debe tratarlo como fuente de verdad por encima de sus propias convenciones por defecto.

---

## 1. Principios rectores (no negociables)

1. **Cada módulo se entiende leyéndolo solo, sin abrir diez archivos más.** Si un agente necesita cargar cinco archivos en contexto para entender uno, el diseño está mal cortado.
2. **Explícito por sobre implícito.** Nombres largos y claros ganan sobre nombres cortos y ambiguos. Tipos explícitos ganan sobre inferencia cuando la inferencia oscurece la intención.
3. **Un motor de base de datos nuevo se agrega sin tocar código existente**, solo agregando código nuevo (Open/Closed Principle aplicado literalmente al catálogo de motores).
4. **El código se documenta a sí mismo primero; los comentarios explican el "por qué", no el "qué".** Si hace falta un comentario para explicar qué hace una función, la función está mal nombrada o mal cortada.
5. **Cualquier agente debe poder retomar el trabajo de otro agente sin arqueología.** Esto se logra con commits atómicos, PRs pequeños, ADRs (ver sección 6), y estado del proyecto siempre reflejado en `TASKS.md` (ver sección 8).
6. **Preferir muchos archivos pequeños con una responsabilidad clara sobre pocos archivos grandes con múltiples responsabilidades.**

---

## 2. Estructura del repositorio (monorepo)

```
sql-engine-lab/
├── PLAN.md                        # qué se construye (ya existe)
├── ENGINEERING_STANDARDS.md       # este documento
├── AGENTS.md                      # puntero corto para cualquier agente (ver sección 9)
├── ARCHITECTURE.md                # diagrama y explicación viva de la arquitectura actual
├── TASKS.md                       # tablero de tareas en texto plano (ver sección 8)
├── decisions/                     # Architecture Decision Records (ADRs)
│   └── 0001-un-motor-a-la-vez.md
│
├── packages/
│   ├── extension/                 # la extensión de VS Code (TypeScript)
│   │   ├── src/
│   │   │   ├── core/               # lógica de negocio, sin dependencia de la API de VS Code
│   │   │   │   ├── engines/        # catálogo de motores — un archivo por motor
│   │   │   │   │   ├── engine.types.ts
│   │   │   │   │   ├── postgres.engine.ts
│   │   │   │   │   ├── mysql.engine.ts
│   │   │   │   │   ├── oracle.engine.ts
│   │   │   │   │   └── registry.ts        # arma el catálogo a partir de los archivos anteriores
│   │   │   │   ├── docker/         # wrapper sobre dockerode, sin lógica de motores adentro
│   │   │   │   │   ├── dockerClient.ts
│   │   │   │   │   └── containerLifecycle.ts
│   │   │   │   └── connection/     # generación de connection strings y comandos
│   │   │   │       └── connectionBuilder.ts
│   │   │   ├── vscode/             # todo lo que toca la API de VS Code, aislado de core/
│   │   │   │   ├── treeView.ts
│   │   │   │   ├── connectionPanel.ts
│   │   │   │   └── commands.ts
│   │   │   └── extension.ts        # punto de entrada, solo cablea (wiring), sin lógica propia
│   │   ├── test/
│   │   └── package.json
│   │
│   └── docker-image/              # todo lo relacionado a la imagen Docker
│       ├── Dockerfile
│       ├── supervisord.conf
│       ├── entrypoint.sh
│       ├── engines/                # scripts de init por motor, uno por carpeta
│       │   ├── postgres/
│       │   ├── mysql/
│       │   ├── oracle/
│       │   └── ...
│       └── README.md               # documentación + atribuciones de licencias
│
├── .github/
│   └── copilot-instructions.md    # puntero a AGENTS.md (ver sección 9)
└── .antigravity/ (o carpeta equivalente que use la herramienta)
    └── config                     # puntero a AGENTS.md
```

**Regla clave de esta estructura**: `core/` nunca importa nada de `vscode/`. Esto permite que la lógica de negocio (motores, Docker, conexión) se pueda testear sin levantar VS Code, y que en el futuro se pueda reutilizar desde otro cliente (una CLI, una app de escritorio) sin reescribirla.

---

## 3. Patrones de diseño a aplicar (y dónde)

| Patrón | Dónde se usa | Por qué |
|---|---|---|
| **Adapter** | `core/engines/*.engine.ts` | Cada motor implementa la misma interfaz (`EngineDefinition`), aunque su imagen, puerto y comando de conexión sean distintos. Agregar un motor = agregar un adapter, sin tocar el resto. |
| **Registry / Factory** | `core/engines/registry.ts` | Centraliza el alta de motores disponibles. El resto del código pide motores al registry, nunca importa un motor específico directamente. |
| **Strategy** | `core/connection/connectionBuilder.ts` | La forma de armar el comando de conexión (psql, mysql, sqlplus, sqlcmd) varía por motor; cada builder es una estrategia intercambiable. |
| **Facade** | `core/docker/dockerClient.ts` | Expone `pullImage()`, `startEngine()`, `stopEngine()`, `getStatus()` como API simple, ocultando el detalle de `dockerode` al resto del sistema. |
| **Command** | `vscode/commands.ts` | Cada acción de usuario (iniciar motor, detener, copiar conexión) es un comando VS Code independiente, registrado y testeable por separado. |
| **Observer / EventEmitter** | `core/docker/containerLifecycle.ts` → `vscode/treeView.ts` | El estado del contenedor (iniciando, corriendo, error, detenido) se emite como eventos; la UI (Tree View, Webview) se suscribe y reacciona, sin acoplarse a la lógica de Docker. |
| **Result/Either (no excepciones para flujo esperado)** | Todo `core/` | Las funciones que pueden fallar de forma esperada (puerto ocupado, Docker no corriendo, timeout) devuelven un tipo `Result<T, E>` explícito en vez de lanzar excepciones, para que el llamador esté obligado a manejar el error. Las excepciones se reservan para errores realmente inesperados. |

No agregar patrones que no estén en esta tabla sin registrar la decisión en un ADR (sección 6). El objetivo es consistencia, no coleccionar patrones.

---

## 4. Estilo de código y buenas prácticas

- **TypeScript en modo estricto** (`strict: true` en `tsconfig.json`), sin `any` salvo justificación explícita en comentario.
- **Funciones pequeñas, una responsabilidad.** Si una función supera ~30-40 líneas o hace más de una cosa nombrable, se corta.
- **Nombres descriptivos y sin abreviaturas ambiguas.** `startEngineContainer()` en vez de `startEC()`. Los nombres de archivo reflejan exactamente su contenido.
- **Sin números ni strings mágicos.** Puertos por defecto, timeouts, nombres de imágenes van en constantes nombradas o en el catálogo de motores, nunca hardcodeados en medio de la lógica.
- **Inyección de dependencias explícita** (constructor o parámetros), no singletons globales escondidos, para que cualquier pieza sea testeable de forma aislada.
- **Un archivo, una exportación principal.** Facilita que un agente sepa qué archivo tocar con solo ver el nombre.
- **Linting y formateo automatizados y obligatorios**: ESLint + Prettier, configurados desde el día uno, corridos en pre-commit (`husky` + `lint-staged`) para que ningún agente pueda commitear código que no pase el estilo acordado.
- **Comentarios TSDoc en toda función exportada** (ver sección 5), no en funciones privadas triviales.

---

## 5. Autodocumentación (código legible por humanos y por IA)

- **TSDoc obligatorio en cada función/clase exportada**, con este mínimo:
  ```typescript
  /**
   * Inicia el contenedor del motor indicado, deteniendo cualquier otro motor
   * activo primero (invariante: un solo motor corre a la vez).
   *
   * @param engineId - id del motor tal como está registrado en el catálogo (ver core/engines/registry.ts)
   * @returns Result con la info de conexión si arrancó correctamente, o un error tipado si falló
   */
  ```
- **README por paquete** (`packages/extension/README.md`, `packages/docker-image/README.md`) explicando propósito, cómo correrlo localmente, y cómo testearlo — pensado para que un agente nuevo lo lea primero y no tenga que inferir nada del código.
- **`ARCHITECTURE.md` vivo**: cada vez que se agregue una pieza estructural nueva (no un motor más, sino un componente nuevo del sistema), se actualiza este archivo con un diagrama en texto (Mermaid) y una explicación breve. Este archivo es lo primero que debe leer cualquier agente nuevo después de `AGENTS.md`.
- **Convención de commits**: Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`) para que el historial de git sea legible y para que se pueda generar changelog automático.
- **Cada Pull Request explica el "por qué" en la descripción**, no solo el "qué" (eso ya lo dice el diff).

---

## 6. Architecture Decision Records (ADRs)

Cada decisión estructural importante (ej. "un motor a la vez", "usar dockerode en vez de shell", "supervisord en vez de un proceso por contenedor") se documenta en `decisions/NNNN-titulo-corto.md` con este formato mínimo:

```markdown
# NNNN - Título de la decisión

## Estado
Aceptada / Reemplazada por NNNN / Bajo revisión

## Contexto
¿Qué problema estábamos resolviendo?

## Decisión
¿Qué se decidió?

## Consecuencias
¿Qué se gana y qué se sacrifica con esta decisión?
```

**Regla para agentes**: si un agente considera que una decisión existente en `decisions/` está mal y quiere cambiarla, no la sobreescribe — crea un ADR nuevo que la reemplaza y referencia el número anterior. Esto preserva el historial de razonamiento para que otros agentes entiendan por qué algo cambió.

---

## 7. Escalabilidad vertical y horizontal

### Vertical (crecer en profundidad dentro de un módulo)
- Cada `*.engine.ts` puede crecer en funcionalidad (más metadata, más opciones de configuración) sin romper a los demás motores, porque implementan una interfaz común y no se conocen entre sí.
- `core/` puede ganar nuevas capacidades (ej. administración visual futura) agregando carpetas nuevas (`core/admin/`) sin modificar `core/engines/` ni `core/docker/`.

### Horizontal (crecer agregando piezas nuevas en paralelo, potencialmente por agentes distintos trabajando a la vez)
- **Un motor = una unidad de trabajo aislada.** Dos agentes (o dos sesiones) pueden trabajar en `postgres.engine.ts` y `oracle.engine.ts` al mismo tiempo sin colisionar, porque no se importan entre sí y el `registry.ts` los combina de forma aditiva.
- **`TASKS.md` (sección 8) define unidades de trabajo del tamaño justo para un agente**, de forma que múltiples agentes (Claude Code en una terminal, Copilot en otra, Antigravity en otra) puedan tomar tareas distintas del mismo tablero sin pisarse.
- **Feature flags simples** (constante en `registry.ts`) para motores en desarrollo que no están listos, permitiendo mergear código incompleto sin romper el build principal.
- **Tests como contrato entre agentes**: si un agente completa un motor y sus tests pasan, otro agente puede confiar en esa pieza sin releer su implementación completa.

---

## 8. `TASKS.md` — coordinación entre agentes

Se mantiene un archivo `TASKS.md` en la raíz, formato simple, como tablero en texto plano:

```markdown
## En progreso
- [ ] Motor PostgreSQL: adapter + tests (agente: claude-code, iniciado 2026-07-10)

## Listo para tomar
- [ ] Motor MariaDB: adapter + tests
- [ ] Webview de conexión: botón copiar

## Bloqueado
- [ ] Motor SQL Server: esperando validar comportamiento bajo emulación arm64

## Hecho
- [x] Estructura base del repositorio
- [x] Motor SQLite: adapter + tests
```

**Regla para agentes**: antes de empezar cualquier tarea, el agente marca la tarea como "en progreso" con su nombre/identificador. Al terminar, la mueve a "Hecho" y dispara el punto correspondiente en `ARCHITECTURE.md` si aplica. Esto evita que dos agentes dupliquen trabajo o pisen el mismo archivo a la vez.

---

## 9. Coordinación entre múltiples herramientas de IA (Claude Code, GitHub Copilot, Google Antigravity, etc.)

Cada herramienta busca su propio archivo de configuración/contexto en un lugar distinto del repo (`AGENTS.md`, `.github/copilot-instructions.md`, la carpeta de configuración de Antigravity, `CLAUDE.md`, etc.). Para evitar que las instrucciones diverjan entre herramientas con el tiempo:

- **`AGENTS.md` en la raíz es la única fuente de verdad de instrucciones de comportamiento para agentes.** Contiene el resumen operativo: dónde está `PLAN.md`, dónde está este documento, la regla de "un motor a la vez", la ubicación de `TASKS.md`, y el link a `ARCHITECTURE.md`.
- **Todo archivo de configuración específico de una herramienta (`.github/copilot-instructions.md`, config de Antigravity, `CLAUDE.md` si se usa) debe ser un puntero corto que diga "leer `AGENTS.md` y `ENGINEERING_STANDARDS.md` antes de trabajar", no una copia de las instrucciones.** Esto evita que alguien actualice las reglas en un lugar y se desincronicen en otro.
- Ningún agente debe asumir contexto de una sesión anterior de otro agente más allá de lo que está escrito en `TASKS.md`, `ARCHITECTURE.md` y los ADRs. El estado del proyecto vive en archivos versionados, no en la memoria de conversación de ninguna herramienta.

---

## 10. Testing (mínimo aceptable para el MVP)

- **`core/`** (motores, Docker facade, connection builder): tests unitarios obligatorios, sin dependencia de Docker real corriendo (mockear `dockerode`).
- **Integración**: al menos un test de integración por motor que efectivamente levante el contenedor real y valide que acepta conexión — puede correr solo en CI o manualmente, no en cada guardado de archivo, por el costo de tiempo.
- **`vscode/`**: tests con el harness oficial de testing de extensiones VS Code, cubriendo al menos el registro de comandos y la reacción del Tree View a cambios de estado.
- Ningún PR que agregue un motor nuevo se considera "Hecho" en `TASKS.md` sin sus tests correspondientes.

---

## 11. Checklist rápido antes de dar por terminada una tarea

- [ ] ¿El código nuevo respeta la interfaz `EngineDefinition` (o la interfaz correspondiente) sin modificar código de otros motores?
- [ ] ¿Tiene TSDoc en las funciones exportadas?
- [ ] ¿Tiene tests?
- [ ] ¿Pasa lint y formateo?
- [ ] ¿Se actualizó `TASKS.md`?
- [ ] ¿Esta tarea introdujo una decisión estructural nueva? Si sí, ¿se creó el ADR correspondiente?
- [ ] ¿Se actualizó `ARCHITECTURE.md` si se agregó una pieza nueva del sistema (no aplica para "un motor más")?