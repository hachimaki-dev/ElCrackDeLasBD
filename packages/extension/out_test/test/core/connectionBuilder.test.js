"use strict";
/**
 * Tests del ConnectionBuilder — Strategy de construcción de comandos.
 */
Object.defineProperty(exports, "__esModule", { value: true });
var assert = require("assert");
var connectionBuilder_1 = require("../../src/core/connection/connectionBuilder");
var registry_1 = require("../../src/core/engines/registry");
suite('ConnectionBuilder', function () {
    test('PostgreSQL: buildConnectionCommand genera comando psql correcto', function () {
        var engine = (0, registry_1.getEngineById)('postgres');
        assert.ok(engine);
        var command = (0, connectionBuilder_1.buildConnectionCommand)(engine, { host: 'localhost', port: 5432 });
        assert.ok(command.startsWith('psql'), 'Debe comenzar con psql');
        assert.ok(command.includes('localhost'), 'Debe incluir el host');
        assert.ok(command.includes('5432'), 'Debe incluir el puerto');
        assert.ok(command.includes('labuser'), 'Debe incluir el usuario');
        assert.ok(command.includes('labdb'), 'Debe incluir la base de datos');
    });
    test('MySQL: buildConnectionCommand genera comando mysql correcto', function () {
        var engine = (0, registry_1.getEngineById)('mysql');
        assert.ok(engine);
        var command = (0, connectionBuilder_1.buildConnectionCommand)(engine, { host: 'localhost', port: 3306 });
        assert.ok(command.startsWith('mysql'), 'Debe comenzar con mysql');
        assert.ok(command.includes('3306'), 'Debe incluir el puerto');
    });
    test('SQLite: buildConnectionCommand genera ruta al archivo de BD', function () {
        var engine = (0, registry_1.getEngineById)('sqlite');
        assert.ok(engine);
        var command = (0, connectionBuilder_1.buildConnectionCommand)(engine, { host: 'localhost', port: 0 });
        assert.ok(command.startsWith('sqlite3'), 'Debe comenzar con sqlite3');
        assert.ok(command.includes('labdb'), 'Debe incluir el nombre de la BD');
    });
    test('Oracle: buildConnectionCommand usa formato user/pass@host:port/PDB', function () {
        var engine = (0, registry_1.getEngineById)('oracle');
        assert.ok(engine);
        var command = (0, connectionBuilder_1.buildConnectionCommand)(engine, { host: 'localhost', port: 1521 });
        assert.ok(command.startsWith('sqlplus'), 'Debe comenzar con sqlplus');
        assert.ok(command.includes('1521'), 'Debe incluir el puerto');
        assert.ok(command.includes('FREEPDB1'), 'Debe incluir el PDB');
    });
    test('SQL Server: buildConnectionCommand usa formato -S host,port', function () {
        var engine = (0, registry_1.getEngineById)('sqlserver');
        assert.ok(engine);
        var command = (0, connectionBuilder_1.buildConnectionCommand)(engine, { host: 'localhost', port: 1433 });
        assert.ok(command.startsWith('sqlcmd'), 'Debe comenzar con sqlcmd');
        assert.ok(command.includes('1433'), 'Debe incluir el puerto');
    });
    test('buildConnectionDetails retorna todos los campos de conexión', function () {
        var engine = (0, registry_1.getEngineById)('postgres');
        assert.ok(engine);
        var details = (0, connectionBuilder_1.buildConnectionDetails)(engine, { host: 'localhost', port: 5432 });
        assert.strictEqual(details.host, 'localhost');
        assert.strictEqual(details.port, 5432);
        assert.strictEqual(details.user, 'labuser');
        assert.strictEqual(details.password, 'labpassword');
        assert.strictEqual(details.database, 'labdb');
    });
    test('los placeholders se resuelven correctamente', function () {
        var engine = (0, registry_1.getEngineById)('mariadb');
        assert.ok(engine);
        var command = (0, connectionBuilder_1.buildConnectionCommand)(engine, { host: '127.0.0.1', port: 3307 });
        // Verificar que no queden placeholders sin resolver
        assert.ok(!command.includes('{host}'), 'No debe quedar {host} sin resolver');
        assert.ok(!command.includes('{port}'), 'No debe quedar {port} sin resolver');
        assert.ok(!command.includes('{user}'), 'No debe quedar {user} sin resolver');
        assert.ok(!command.includes('{password}'), 'No debe quedar {password} sin resolver');
        assert.ok(!command.includes('{database}'), 'No debe quedar {database} sin resolver');
    });
});
