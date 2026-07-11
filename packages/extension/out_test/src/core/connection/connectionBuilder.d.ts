/**
 * SQL Engine Laboratory — Connection Builder
 *
 * Strategy pattern para construir comandos de conexión.
 * Cada motor tiene una forma distinta de armar su comando de conexión
 * (psql, mysql, sqlplus, sqlcmd), pero la interfaz es la misma.
 *
 * Los comandos se generan con `docker exec` para que funcionen desde
 * cualquier terminal del usuario sin necesidad de instalar clientes nativos.
 *
 * Los placeholders {host}, {port}, {user}, {password}, {database} se resuelven
 * a partir de la ConnectionTemplate del motor y los datos de conexión reales.
 */
import { EngineDefinition, ConnectionInfo, LaunchConfig } from '../engines/engine.types';
/**
 * Datos parciales de conexión (host y port) usados para construir el comando completo.
 */
interface PartialConnectionInfo {
    readonly host: string;
    readonly port: number;
}
/**
 * Construye el comando de conexión completo para un motor, listo para copiar y pegar.
 * El comando usa `docker exec -it` para ejecutar el cliente dentro del contenedor,
 * así el usuario no necesita instalar psql, mysql, sqlplus, etc. en su máquina.
 *
 * @param engine - Definición del motor con la template de conexión
 * @param connectionInfo - Datos de conexión parciales o completos
 * @returns Comando de conexión formateado con docker exec
 *
 * @example
 * ```typescript
 * const engine = getEngineById('postgres');
 * const command = buildConnectionCommand(engine, { host: 'localhost', port: 5432 });
 * // → "docker exec -it sql-engine-lab psql -h localhost -p 5432 -U labuser -d labdb"
 * ```
 */
export declare function buildConnectionCommand(engine: EngineDefinition, connectionInfo: PartialConnectionInfo | ConnectionInfo): string;
/**
 * Construye los detalles de conexión completos para mostrar en la UI.
 *
 * @param engine - Definición del motor
 * @param partialInfo - Host y puerto del contenedor
 * @param launchConfig - Configuración opcional de credenciales personalizadas
 * @returns ConnectionInfo completo (sin el comando, que se construye aparte)
 */
export declare function buildConnectionDetails(engine: EngineDefinition, partialInfo: PartialConnectionInfo, launchConfig?: LaunchConfig): Omit<ConnectionInfo, 'connectionCommand'>;
export {};
//# sourceMappingURL=connectionBuilder.d.ts.map