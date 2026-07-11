# ADR 0002: Excepción de Imagen Nativa para Oracle Free

## Status
Aceptado

## Contexto
El plan original (`PLAN.md`) dictaba el uso de una **única imagen Docker** (`sql-engine-lab:dev`) para contener todos los motores SQL. Durante la implementación, descubrimos que extraer Oracle 23ai Free de su imagen base nativa (`gvenzl/oracle-free:23.5-slim`) e inyectarlo en nuestro entorno unificado (`debian:bookworm-slim`) causa un error fatal en el arranque del motor: `ORA-00443: background process "OFSD" did not start`. 

Este fallo se debe a que Oracle requiere configuraciones específicas del kernel, privilegios y dependencias de OS (Oracle Linux) que se pierden al unificarlo en Debian, resultando en un entorno inestable.

El usuario clasificó a Oracle como "vital y la mayor prioridad", por lo que no puede ser removido temporalmente del MVP.

## Decisión
Se ha decidido realizar una excepción arquitectónica exclusivamente para el motor de Oracle:
1. Oracle ya no correrá dentro de la mega-imagen `sql-engine-lab`.
2. El contenedor se instanciará directamente desde la imagen `gvenzl/oracle-free:23.5-slim`.
3. Se montará un volumen persistente (`oracle-volume:/opt/oracle/oradata`) para prevenir la inicialización pesada en cada reinicio.
4. Las contraseñas del sistema y del sandbox de laboratorio se sincronizarán mediante ejecuciones asíncronas de la utilidad `resetPassword` nativa de la imagen a través de `docker exec` luego de que el motor pase su healthcheck, asegurando que la conexión sea fluida independientemente del volumen persistente.

## Consecuencias
- **Positivas:** Permite que Oracle funcione de manera estable y nativa, salvando el MVP. Mantiene el estado y datos del usuario entre reinicios.
- **Negativas:** Rompe ligeramente la homogeneidad del diseño "una imagen para todo", requiriendo lógicas condicionales específicas en `containerLifecycle.ts`.
