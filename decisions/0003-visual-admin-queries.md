# 0003 - Administración Visual vía Ejecución de Consultas de Catálogo Internas

## Estado
Aceptada

## Contexto
Para dotar a la extensión de un gestor visual de base de datos (explorador de tablas, creación de esquemas, bases de datos y usuarios), necesitábamos una forma de interactuar con el motor SQL que estuviera corriendo dentro del contenedor de Docker.

Existían dos enfoques principales:
1. **Librerías externas de Node.js:** Instalar paquetes específicos por motor en la extensión (ej. `pg` para Postgres, `mysql2` para MySQL/MariaDB, `oracledb` para Oracle, `mssql` para SQL Server).
2. **Consultas internas vía CLI (docker exec):** Reutilizar el servicio `QueryRunner` para inyectar consultas SQL de catálogo y parsear la salida de consola de los clientes CLI preinstalados.

## Decisión
Se decidió utilizar **Consultas internas vía CLI (docker exec)**.

Esta decisión se tomó por los siguientes motivos:
- **Compatibilidad multiplataforma y emulación:** Las librerías de Node nativas (como `oracledb` o `mssql`) requieren compilar binarios específicos de arquitectura, lo cual suele fallar en Mac Apple Silicon bajo emulación Rosetta o entornos Windows heterogéneos. Al ejecutar comandos nativos dentro del contenedor Docker (que ya está compilado para la arquitectura correcta), eliminamos este riesgo de compatibilidad local en la máquina host.
- **Peso de la extensión:** Evitamos aumentar el tamaño de la extensión con dependencias redundantes, manteniendo el empaquetado final liviano y ágil.
- **Cohesión de diseño:** El contenedor de Docker es la única fuente de verdad. El uso de `QueryRunner` garantiza que las credenciales de administración se resuelvan y validen con los mismos puertos y lifecycle que utiliza el usuario.

## Consecuencias
- **Lo que ganamos:** Robustez extrema multiplataforma, bundle size reducido de la extensión y facilidad de añadir nuevos motores simplemente mapeando sus queries en archivos de adaptadores individuales (`DbAdminAdapter`).
- **Lo que sacrificamos:** El parseo de los resultados de stdout requiere escribir regex y funciones específicas para interpretar los formatos de consola de los clientes CLI (como psql, mysql y sqlite3). Sin embargo, este parseo se ha centralizado y es robusto.
