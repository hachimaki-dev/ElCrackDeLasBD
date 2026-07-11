# SQL Engine Laboratory — Instrucciones para Agentes

**Antes de escribir cualquier código, lee estos documentos en orden:**

1. **[PLAN.md](./PLAN.md)** — Qué se construye (alcance del MVP, flujo de usuario, etapas).
2. **[ENGINEERING_STANDARDS.md](./ENGINEERING_STANDARDS.md)** — Cómo se construye (patrones, estilo, documentación, testing).
3. **[ARCHITECTURE.md](./ARCHITECTURE.md)** — Diagrama y explicación de la arquitectura actual.
4. **[TASKS.md](./TASKS.md)** — Tablero de tareas. **Marca tu tarea como "en progreso" antes de empezar.**

---

## Reglas operativas clave

- **Un motor de BD corre a la vez** — decisión de producto, no técnica. No cambiar sin ADR.
- **`core/` nunca importa de `vscode/`** — la lógica de negocio es independiente de VS Code.
- **Un motor nuevo = código nuevo, no modificar código existente** (Open/Closed Principle).
- **Remoción para MVP con preservación de escalabilidad:** Si un motor da demasiados problemas o retrasa el MVP, se debe "sacar de la ecuación" removiéndolo de la UI (ej. quitándolo de `registry.ts`), pero **NUNCA** se debe borrar su código base. Esto asegura que el sistema siga siendo escalable y que la reintroducción del motor a futuro sea automática.
- **TypeScript estricto** (`strict: true`), sin `any` salvo justificación explícita.
- **Result<T, E> para errores esperados**, excepciones solo para errores inesperados.
- **Conventional Commits** (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`).
- **TSDoc en toda función exportada.**
- **Tests obligatorios** para cualquier motor o componente nuevo.

## Antes de dar por terminada una tarea

- [ ] ¿Respeta las interfaces existentes sin modificar código de otros motores?
- [ ] ¿Tiene TSDoc en funciones exportadas?
- [ ] ¿Tiene tests?
- [ ] ¿Pasa lint y formateo?
- [ ] ¿Se actualizó TASKS.md?
- [ ] ¿Decisión estructural nueva? → Crear ADR en `decisions/`.
- [ ] ¿Pieza nueva del sistema? → Actualizar ARCHITECTURE.md.
