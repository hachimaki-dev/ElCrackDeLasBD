"use strict";
/**
 * SQL Engine Laboratory — MySQL Engine Adapter
 *
 * Definición del motor MySQL para el catálogo de motores.
 * Puerto por defecto: 3306
 * Cliente nativo: mysql
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.mysqlEngine = void 0;
exports.mysqlEngine = {
    id: 'mysql',
    displayName: 'MySQL',
    description: 'Base de datos relacional open-source, la más popular del mundo',
    defaultPort: 3306,
    dockerEnvValue: 'mysql',
    connectionTemplate: {
        command: 'mysql',
        argsTemplate: '-h {host} -P {port} -u {user} -p{password} {database}',
        defaultUser: 'labuser',
        defaultPassword: 'labpassword',
        defaultDatabase: 'labdb',
        adminUser: 'root',
        adminPasswordRequiresInput: true,
        adminPasswordMessage: 'Sin contraseña por defecto en localhost',
        testCommands: [
            'SELECT VERSION();',
            'CREATE TABLE test (id INT AUTO_INCREMENT PRIMARY KEY, nombre VARCHAR(50));',
            "INSERT INTO test (nombre) VALUES ('Hola Lab');",
            'SELECT * FROM test;'
        ],
    },
    healthcheckTimeoutMs: 20000,
    startupSpeed: 'fast',
    iconId: 'database',
};
//# sourceMappingURL=mysql.engine.js.map