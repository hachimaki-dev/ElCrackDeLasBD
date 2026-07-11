"use strict";
/**
 * SQL Engine Laboratory — Connection Builder
 *
 * Strategy pattern para construir comandos de conexión.
 * Cada motor tiene una forma distinta de armar su comando de conexión
 * (psql, mysql, sqlplus, sqlcmd), pero la interfaz es la misma.
 *
 * Los placeholders {host}, {port}, {user}, {password}, {database} se resuelven
 * a partir de la ConnectionTemplate del motor y los datos de conexión reales.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildConnectionCommand = buildConnectionCommand;
exports.buildConnectionDetails = buildConnectionDetails;
const engine_types_1 = require("../engines/engine.types");
/**
 * Construye el comando de conexión completo para un motor, listo para copiar y pegar.
 *
 * @param engine - Definición del motor con la template de conexión
 * @param connectionInfo - Datos de conexión parciales o completos
 * @returns Comando de conexión formateado (ej: "docker exec -it sql-engine-lab psql -h 127.0.0.1 -p 5432 -U labuser -d labdb")
 *
 * @example
 * ```typescript
 * const engine = getEngineById('postgres');
 * const command = buildConnectionCommand(engine, { host: '127.0.0.1', port: 5432 });
 * // → "docker exec -it sql-engine-lab psql -h 127.0.0.1 -p 5432 -U labuser -d labdb"
 * ```
 */
function buildConnectionCommand(engine, connectionInfo, isAdmin = false) {
    const template = engine.connectionTemplate;
    const user = isAdmin
        ? template.adminUser || template.defaultUser
        : 'user' in connectionInfo ? connectionInfo.user : template.defaultUser;
    let password = '';
    if (isAdmin) {
        const isSharedPassword = template.adminPassword === engine_types_1.DOCKER_IMAGE_CONFIG.defaultEnv.LAB_PASSWORD;
        if (isSharedPassword && 'password' in connectionInfo) {
            password = connectionInfo.password;
        }
        else {
            password = template.adminPassword || '';
        }
    }
    else {
        password = 'password' in connectionInfo ? connectionInfo.password : template.defaultPassword;
    }
    const database = 'database' in connectionInfo ? connectionInfo.database : template.defaultDatabase;
    const host = '127.0.0.1';
    // El comando siempre se ejecuta dentro del contenedor vía docker exec,
    // por lo que SIEMPRE debemos apuntar al puerto interno por defecto del motor,
    // ignorando cualquier puerto mapeado dinámicamente en el host.
    const internalPort = engine.defaultPort === 0 ? 0 : engine.defaultPort;
    const resolvedArgs = resolveTemplate(template.argsTemplate, {
        host,
        port: String(internalPort),
        user,
        password,
        database,
    });
    const containerName = engine_types_1.DOCKER_IMAGE_CONFIG.containerName;
    // SQLite no usa el mismo formato comando + args
    if (engine.id === 'sqlite') {
        return `docker exec -it ${containerName} ${template.command} ${resolvedArgs}`;
    }
    return `docker exec -it ${containerName} ${template.command} ${resolvedArgs}`;
}
/**
 * Construye los detalles de conexión completos para mostrar en la UI.
 *
 * @param engine - Definición del motor
 * @param partialInfo - Host y puerto del contenedor
 * @returns ConnectionInfo completo (sin el comando, que se construye aparte)
 */
function buildConnectionDetails(engine, partialInfo, config) {
    const template = engine.connectionTemplate;
    return {
        host: partialInfo.host,
        port: partialInfo.port || engine.defaultPort,
        user: config?.labUser || template.defaultUser,
        password: config?.labPassword || template.defaultPassword,
        database: config?.labDatabase || template.defaultDatabase,
    };
}
/**
 * Resuelve placeholders {key} en una template string.
 *
 * @param template - String con placeholders en formato {key}
 * @param values - Mapa de key→value para reemplazar
 * @returns Template con placeholders resueltos
 */
function resolveTemplate(template, values) {
    let resolved = template;
    for (const [key, value] of Object.entries(values)) {
        resolved = resolved.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }
    return resolved;
}
//# sourceMappingURL=connectionBuilder.js.map