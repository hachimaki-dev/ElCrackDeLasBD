"use strict";
/**
 * SQL Engine Laboratory — SQL Server Engine Adapter
 *
 * Definición del motor SQL Server para el catálogo de motores.
 * Puerto por defecto: 1433
 * Cliente nativo: sqlcmd
 *
 * Limitación conocida: SQL Server no tiene soporte arm64 nativo.
 * En Mac Apple Silicon corre bajo emulación (Rosetta/QEMU) vía Docker Desktop,
 * con rendimiento reducido. Esto es una limitación documentada, no un bug.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sqlserverEngine = void 0;
exports.sqlserverEngine = {
    id: 'sqlserver',
    displayName: 'SQL Server',
    description: 'Microsoft SQL Server Developer — motor enterprise gratuito para desarrollo',
    defaultPort: 1433,
    dockerEnvValue: 'sqlserver',
    connectionTemplate: {
        command: 'sqlcmd',
        argsTemplate: '-S {host},{port} -U {user} -P {password} -d {database} -C',
        defaultUser: 'labuser',
        defaultPassword: 'labpassword',
        defaultDatabase: 'labdb',
    },
    // SQL Server tarda en arrancar, más aún bajo emulación arm64
    healthcheckTimeoutMs: 90_000,
    iconId: 'database',
};
//# sourceMappingURL=sqlserver.engine.js.map