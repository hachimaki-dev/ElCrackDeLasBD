"use strict";
/**
 * SQL Engine Laboratory — PostgreSQL Engine Adapter
 *
 * Definición del motor PostgreSQL para el catálogo de motores.
 * Puerto por defecto: 5432
 * Cliente nativo: psql
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.postgresEngine = void 0;
const engine_types_1 = require("./engine.types");
exports.postgresEngine = {
    id: 'postgres',
    displayName: 'PostgreSQL',
    description: 'Base de datos relacional open-source, robusta y extensible',
    defaultPort: 5432,
    dockerEnvValue: 'postgres',
    connectionTemplate: {
        command: 'psql',
        argsTemplate: '-h {host} -p {port} -U {user} -d {database}',
        defaultUser: 'labuser',
        defaultPassword: 'labpassword',
        defaultDatabase: 'labdb',
        adminUser: 'postgres',
        adminPassword: engine_types_1.DOCKER_IMAGE_CONFIG.defaultEnv.LAB_PASSWORD,
        adminPasswordMessage: 'Misma que el usuario del laboratorio',
        testCommands: [
            'SELECT version();',
            'CREATE TABLE test (id serial PRIMARY KEY, nombre varchar(50));',
            "INSERT INTO test (nombre) VALUES ('Hola Lab');",
            'SELECT * FROM test;'
        ],
    },
    healthcheckTimeoutMs: 15000,
    startupSpeed: 'fast',
    iconId: 'database',
};
//# sourceMappingURL=postgres.engine.js.map