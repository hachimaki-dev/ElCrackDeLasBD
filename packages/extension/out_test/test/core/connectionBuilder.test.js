"use strict";
/**
 * Tests del ConnectionBuilder — Strategy de construcción de comandos.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const assert = __importStar(require("assert"));
const connectionBuilder_1 = require("../../src/core/connection/connectionBuilder");
const registry_1 = require("../../src/core/engines/registry");
suite('ConnectionBuilder', () => {
    test('PostgreSQL: buildConnectionCommand genera comando psql correcto', () => {
        const engine = (0, registry_1.getEngineById)('postgres');
        assert.ok(engine);
        const command = (0, connectionBuilder_1.buildConnectionCommand)(engine, { host: 'localhost', port: 5432 });
        assert.ok(command.startsWith('docker exec -it sql-engine-lab psql'), 'Debe comenzar con docker exec -it sql-engine-lab psql');
        assert.ok(command.includes('127.0.0.1'), 'Debe incluir el host local interno (127.0.0.1)');
        assert.ok(command.includes('5432'), 'Debe incluir el puerto');
        assert.ok(command.includes('labuser'), 'Debe incluir el usuario');
        assert.ok(command.includes('labdb'), 'Debe incluir la base de datos');
    });
    test('MySQL: buildConnectionCommand genera comando mysql correcto', () => {
        const engine = (0, registry_1.getEngineById)('mysql');
        assert.ok(engine);
        const command = (0, connectionBuilder_1.buildConnectionCommand)(engine, { host: 'localhost', port: 3306 });
        assert.ok(command.startsWith('docker exec -it sql-engine-lab mysql'), 'Debe comenzar con docker exec -it sql-engine-lab mysql');
        assert.ok(command.includes('127.0.0.1'), 'Debe incluir 127.0.0.1 para forzar TCP');
        assert.ok(command.includes('3306'), 'Debe incluir el puerto');
    });
    test('SQLite: buildConnectionCommand genera ruta al archivo de BD', () => {
        const engine = (0, registry_1.getEngineById)('sqlite');
        assert.ok(engine);
        const command = (0, connectionBuilder_1.buildConnectionCommand)(engine, { host: 'localhost', port: 0 });
        assert.ok(command.startsWith('docker exec -it sql-engine-lab sqlite3'), 'Debe comenzar con docker exec -it sql-engine-lab sqlite3');
        assert.ok(command.includes('labdb'), 'Debe incluir el nombre de la BD');
    });
    test('Oracle: buildConnectionCommand usa formato user/pass@host:port/PDB', () => {
        const engine = (0, registry_1.getEngineById)('oracle');
        assert.ok(engine);
        const command = (0, connectionBuilder_1.buildConnectionCommand)(engine, { host: 'localhost', port: 1521 });
        assert.ok(command.startsWith('docker exec -it sql-engine-lab sqlplus'), 'Debe comenzar con docker exec -it sql-engine-lab sqlplus');
        assert.ok(command.includes('1521'), 'Debe incluir el puerto');
        assert.ok(command.includes('FREEPDB1'), 'Debe incluir el PDB');
        assert.ok(command.includes('127.0.0.1'), 'Debe incluir 127.0.0.1');
    });
    test('SQL Server: buildConnectionCommand usa formato -S host,port', () => {
        const engine = (0, registry_1.getEngineById)('sqlserver');
        assert.ok(engine);
        const command = (0, connectionBuilder_1.buildConnectionCommand)(engine, { host: 'localhost', port: 1433 });
        assert.ok(command.startsWith('docker exec -it sql-engine-lab sqlcmd'), 'Debe comenzar con docker exec -it sql-engine-lab sqlcmd');
        assert.ok(command.includes('1433'), 'Debe incluir el puerto');
        assert.ok(command.includes('127.0.0.1'), 'Debe incluir 127.0.0.1');
    });
    test('buildConnectionDetails retorna todos los campos de conexión (defaults)', () => {
        const engine = (0, registry_1.getEngineById)('postgres');
        assert.ok(engine);
        const details = (0, connectionBuilder_1.buildConnectionDetails)(engine, { host: 'localhost', port: 5432 });
        assert.strictEqual(details.host, 'localhost');
        assert.strictEqual(details.port, 5432);
        assert.strictEqual(details.user, 'labuser');
        assert.strictEqual(details.password, 'LabPassword123!');
        assert.strictEqual(details.database, 'labdb');
    });
    test('buildConnectionDetails respeta launchConfig personalizado', () => {
        const engine = (0, registry_1.getEngineById)('postgres');
        assert.ok(engine);
        const launchConfig = { labUser: 'admin', labPassword: 'password123', labDatabase: 'proddb' };
        const details = (0, connectionBuilder_1.buildConnectionDetails)(engine, { host: 'localhost', port: 5432 }, launchConfig);
        assert.strictEqual(details.user, 'admin');
        assert.strictEqual(details.password, 'password123');
        assert.strictEqual(details.database, 'proddb');
    });
    test('los placeholders se resuelven correctamente', () => {
        const engine = (0, registry_1.getEngineById)('mariadb');
        assert.ok(engine);
        const command = (0, connectionBuilder_1.buildConnectionCommand)(engine, { host: '127.0.0.1', port: 3307 });
        // Verificar que no queden placeholders sin resolver
        assert.ok(!command.includes('{host}'), 'No debe quedar {host} sin resolver');
        assert.ok(!command.includes('{port}'), 'No debe quedar {port} sin resolver');
        assert.ok(!command.includes('{user}'), 'No debe quedar {user} sin resolver');
        assert.ok(!command.includes('{password}'), 'No debe quedar {password} sin resolver');
        assert.ok(!command.includes('{database}'), 'No debe quedar {database} sin resolver');
    });
});
//# sourceMappingURL=connectionBuilder.test.js.map