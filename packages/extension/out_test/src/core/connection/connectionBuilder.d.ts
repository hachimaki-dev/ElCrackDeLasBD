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
import { EngineDefinition, ConnectionInfo, EngineConfig } from '../engines/engine.types';
/**
 * Datos parciales de conexión (host y port) usados para construir el comando completo.
 */
interface PartialConnectionInfo {
    readonly host: string;
    readonly port: number;
}
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
export declare function buildConnectionCommand(engine: EngineDefinition, connectionInfo: PartialConnectionInfo | ConnectionInfo, isAdmin?: boolean): string;
/**
 * Construye los detalles de conexión completos para mostrar en la UI.
 *
 * @param engine - Definición del motor
 * @param partialInfo - Host y puerto del contenedor
 * @returns ConnectionInfo completo (sin el comando, que se construye aparte)
 */
export declare function buildConnectionDetails(engine: EngineDefinition, partialInfo: PartialConnectionInfo, config?: EngineConfig): Omit<ConnectionInfo, 'connectionCommand'>;
export {};
//# sourceMappingURL=connectionBuilder.d.ts.map