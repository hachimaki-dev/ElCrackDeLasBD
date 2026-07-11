"use strict";
/**
 * SQL Engine Laboratory — SQLite Engine Adapter
 *
 * Definición del motor SQLite para el catálogo de motores.
 * SQLite es un caso especial: no es un daemon, no usa puerto de red.
 * El comando de conexión apunta al archivo de BD dentro del contenedor.
 * Puerto: 0 (no aplica)
 * Cliente nativo: sqlite3
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sqliteEngine = void 0;
exports.sqliteEngine = {
    id: 'sqlite',
    displayName: 'SQLite',
    description: 'Motor embebido ultraliviano — no requiere servidor, ideal para prototipos',
    defaultPort: 0,
    dockerEnvValue: 'sqlite',
    connectionTemplate: {
        command: 'sqlite3',
        argsTemplate: '/var/lib/sql-engine-lab/data/sqlite/{database}.sqlite',
        defaultUser: '',
        defaultPassword: '',
        defaultDatabase: 'labdb',
    },
    // SQLite es instantáneo — no necesita healthcheck largo
    healthcheckTimeoutMs: 5_000,
    iconId: 'file',
};
//# sourceMappingURL=sqlite.engine.js.map