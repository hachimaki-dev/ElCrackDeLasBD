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
        adminUser: 'sa',
        adminPassword: 'labpassword',
        adminPasswordMessage: 'Misma que el usuario del laboratorio',
        testCommands: [
            "SELECT @@VERSION;",
            "CREATE TABLE test (id INT IDENTITY(1,1) PRIMARY KEY, nombre VARCHAR(50));",
            "INSERT INTO test (nombre) VALUES ('Hola Lab');",
            "SELECT * FROM test;"
        ],
    },
    // SQL Server tarda en arrancar, más aún bajo emulación arm64
    healthcheckTimeoutMs: 60000,
    startupSpeed: 'slow',
    iconId: 'database',
};
//# sourceMappingURL=sqlserver.engine.js.map