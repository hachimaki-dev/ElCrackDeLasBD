# 0001 - Un solo motor de base de datos corre a la vez

## Estado
Aceptada

## Contexto
La extensión SQL Engine Laboratory permite levantar múltiples motores de base de datos (PostgreSQL, MySQL, MariaDB, SQLite, Oracle, SQL Server) desde un único contenedor Docker. Necesitábamos decidir si permitir que varios motores corran simultáneamente o restringir a uno solo.

## Decisión
**Solo un motor corre a la vez.** Si el usuario quiere cambiar de motor, la extensión detiene el contenedor activo antes de levantar uno nuevo con la variable `ENGINE` distinta.

En el MVP, esto implica detener el contenedor completo y arrancar uno nuevo. En una mejora post-MVP, podría hacerse via `supervisorctl` dentro del mismo contenedor sin reiniciarlo.

## Consecuencias

### Se gana
- **Simplicidad de la UI**: solo un estado que mostrar, sin ambigüedad sobre cuál motor está activo.
- **Simplicidad de recursos**: no hay conflictos de puertos ni consumo multiplicado de RAM/CPU.
- **Modelo mental claro**: el usuario siempre sabe qué motor está corriendo.
- **Healthcheck simple**: solo hay que monitorear un proceso.

### Se sacrifica
- No se puede comparar motores lado a lado ejecutando queries en paralelo (feature pospuesta, ver PLAN.md §5).
- El cambio de motor implica downtime (el contenedor se detiene y se levanta otro).
- Se pierde el estado (datos) del motor anterior al cambiar (aceptable para un laboratorio; persistencia via volúmenes es mejora futura).
