/**
 * Tests del ConnectionBuilder — Strategy de construcción de comandos.
 */

import * as assert from 'assert';
import { buildConnectionCommand, buildConnectionDetails } from '../../src/core/connection/connectionBuilder';
import { getEngineById } from '../../src/core/engines/registry';

suite('ConnectionBuilder', () => {
  test('PostgreSQL: buildConnectionCommand genera comando psql correcto', () => {
    const engine = getEngineById('postgres');
    assert.ok(engine);

    const command = buildConnectionCommand(engine, { host: 'localhost', port: 5432 });
    assert.ok(command.startsWith('psql'), 'Debe comenzar con psql');
    assert.ok(command.includes('localhost'), 'Debe incluir el host');
    assert.ok(command.includes('5432'), 'Debe incluir el puerto');
    assert.ok(command.includes('labuser'), 'Debe incluir el usuario');
    assert.ok(command.includes('labdb'), 'Debe incluir la base de datos');
  });

  test('MySQL: buildConnectionCommand genera comando mysql correcto', () => {
    const engine = getEngineById('mysql');
    assert.ok(engine);

    const command = buildConnectionCommand(engine, { host: 'localhost', port: 3306 });
    assert.ok(command.startsWith('mysql'), 'Debe comenzar con mysql');
    assert.ok(command.includes('3306'), 'Debe incluir el puerto');
  });

  test('SQLite: buildConnectionCommand genera ruta al archivo de BD', () => {
    const engine = getEngineById('sqlite');
    assert.ok(engine);

    const command = buildConnectionCommand(engine, { host: 'localhost', port: 0 });
    assert.ok(command.startsWith('sqlite3'), 'Debe comenzar con sqlite3');
    assert.ok(command.includes('labdb'), 'Debe incluir el nombre de la BD');
  });

  test('Oracle: buildConnectionCommand usa formato user/pass@host:port/PDB', () => {
    const engine = getEngineById('oracle');
    assert.ok(engine);

    const command = buildConnectionCommand(engine, { host: 'localhost', port: 1521 });
    assert.ok(command.startsWith('sqlplus'), 'Debe comenzar con sqlplus');
    assert.ok(command.includes('1521'), 'Debe incluir el puerto');
    assert.ok(command.includes('FREEPDB1'), 'Debe incluir el PDB');
  });

  test('SQL Server: buildConnectionCommand usa formato -S host,port', () => {
    const engine = getEngineById('sqlserver');
    assert.ok(engine);

    const command = buildConnectionCommand(engine, { host: 'localhost', port: 1433 });
    assert.ok(command.startsWith('sqlcmd'), 'Debe comenzar con sqlcmd');
    assert.ok(command.includes('1433'), 'Debe incluir el puerto');
  });

  test('buildConnectionDetails retorna todos los campos de conexión', () => {
    const engine = getEngineById('postgres');
    assert.ok(engine);

    const details = buildConnectionDetails(engine, { host: 'localhost', port: 5432 });
    assert.strictEqual(details.host, 'localhost');
    assert.strictEqual(details.port, 5432);
    assert.strictEqual(details.user, 'labuser');
    assert.strictEqual(details.password, 'labpassword');
    assert.strictEqual(details.database, 'labdb');
  });

  test('los placeholders se resuelven correctamente', () => {
    const engine = getEngineById('mariadb');
    assert.ok(engine);

    const command = buildConnectionCommand(engine, { host: '127.0.0.1', port: 3307 });
    // Verificar que no queden placeholders sin resolver
    assert.ok(!command.includes('{host}'), 'No debe quedar {host} sin resolver');
    assert.ok(!command.includes('{port}'), 'No debe quedar {port} sin resolver');
    assert.ok(!command.includes('{user}'), 'No debe quedar {user} sin resolver');
    assert.ok(!command.includes('{password}'), 'No debe quedar {password} sin resolver');
    assert.ok(!command.includes('{database}'), 'No debe quedar {database} sin resolver');
  });
});
