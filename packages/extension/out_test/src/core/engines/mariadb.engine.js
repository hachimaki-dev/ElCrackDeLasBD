"use strict";
/**
 * SQL Engine Laboratory — MariaDB Engine Adapter
 *
 * Definición del motor MariaDB para el catálogo de motores.
 * Puerto por defecto: 3307 (distinto a MySQL para evitar confusión en la configuración,
 * aunque solo un motor corre a la vez).
 * Cliente nativo: mariadb
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.mariadbEngine = void 0;
exports.mariadbEngine = {
    id: 'mariadb',
    displayName: 'MariaDB',
    description: 'Fork open-source de MySQL, compatible y con mejoras de rendimiento',
    defaultPort: 3307,
    dockerEnvValue: 'mariadb',
    connectionTemplate: {
        command: 'mariadb',
        argsTemplate: '-h {host} -P {port} -u {user} -p{password} {database}',
        defaultUser: 'labuser',
        defaultPassword: 'labpassword',
        defaultDatabase: 'labdb',
    },
    healthcheckTimeoutMs: 30_000,
    iconId: 'database',
};
//# sourceMappingURL=mariadb.engine.js.map