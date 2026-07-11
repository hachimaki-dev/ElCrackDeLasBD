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
/**
 * Construye el comando de conexión completo para un motor, listo para copiar y pegar.
 *
 * @param engine - Definición del motor con la template de conexión
 * @param connectionInfo - Datos de conexión parciales o completos
 * @returns Comando de conexión formateado (ej: "psql -h localhost -p 5432 -U labuser -d labdb")
 *
 * @example
 * ```typescript
 * const engine = getEngineById('postgres');
 * const command = buildConnectionCommand(engine, { host: 'localhost', port: 5432 });
 * // → "psql -h localhost -p 5432 -U labuser -d labdb"
 * ```
 */
function buildConnectionCommand(engine, connectionInfo) {
    const template = engine.connectionTemplate;
    const user = 'user' in connectionInfo ? connectionInfo.user : template.defaultUser;
    const password = 'password' in connectionInfo ? connectionInfo.password : template.defaultPassword;
    const database = 'database' in connectionInfo ? connectionInfo.database : template.defaultDatabase;
    const resolvedArgs = resolveTemplate(template.argsTemplate, {
        host: connectionInfo.host,
        port: String(connectionInfo.port),
        user,
        password,
        database,
    });
    // SQLite no usa el mismo formato comando + args
    if (engine.id === 'sqlite') {
        return `${template.command} ${resolvedArgs}`;
    }
    return `${template.command} ${resolvedArgs}`;
}
/**
 * Construye los detalles de conexión completos para mostrar en la UI.
 *
 * @param engine - Definición del motor
 * @param partialInfo - Host y puerto del contenedor
 * @returns ConnectionInfo completo (sin el comando, que se construye aparte)
 */
function buildConnectionDetails(engine, partialInfo) {
    const template = engine.connectionTemplate;
    return {
        host: partialInfo.host,
        port: partialInfo.port || engine.defaultPort,
        user: template.defaultUser,
        password: template.defaultPassword,
        database: template.defaultDatabase,
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