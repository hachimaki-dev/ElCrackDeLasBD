/**
 * Tests del Engine Registry y los adapters de motores.
 */

import * as assert from 'assert';
import {
  getAllEngines,
  getEngineById,
  getEngineCount,
  isValidEngineId,
} from '../../src/core/engines/registry';
import { EngineId } from '../../src/core/engines/engine.types';

suite('Engine Registry', () => {
  test('getAllEngines retorna exactamente 6 motores', () => {
    const engines = getAllEngines();
    assert.strictEqual(engines.length, 6);
  });

  test('los IDs de los 6 motores están presentes', () => {
    const expectedIds: EngineId[] = ['postgres', 'mysql', 'mariadb', 'sqlite', 'oracle', 'sqlserver'];
    const engines = getAllEngines();
    const ids = engines.map((e) => e.id);

    for (const expected of expectedIds) {
      assert.ok(ids.includes(expected), `Falta el motor: ${expected}`);
    }
  });

  test('getEngineById retorna el motor correcto', () => {
    const pg = getEngineById('postgres');
    assert.ok(pg, 'PostgreSQL debe existir');
    assert.strictEqual(pg.id, 'postgres');
    assert.strictEqual(pg.displayName, 'PostgreSQL');
    assert.strictEqual(pg.defaultPort, 5432);
  });

  test('getEngineById retorna undefined para un ID inválido', () => {
    // cast forzado para testear el caso de ID inválido
    const result = getEngineById('nonexistent' as EngineId);
    assert.strictEqual(result, undefined);
  });

  test('getEngineCount retorna 6', () => {
    assert.strictEqual(getEngineCount(), 6);
  });

  test('isValidEngineId reconoce todos los motores válidos', () => {
    const validIds = ['postgres', 'mysql', 'mariadb', 'sqlite', 'oracle', 'sqlserver'];
    for (const id of validIds) {
      assert.ok(isValidEngineId(id), `${id} debería ser válido`);
    }
  });

  test('isValidEngineId rechaza strings inválidos', () => {
    assert.ok(!isValidEngineId('mongodb'));
    assert.ok(!isValidEngineId(''));
    assert.ok(!isValidEngineId('POSTGRES'));
  });

  suite('Engine Adapters — contrato de EngineDefinition', () => {
    for (const engine of getAllEngines()) {
      test(`${engine.displayName}: tiene todos los campos requeridos`, () => {
        assert.ok(engine.id, 'Debe tener id');
        assert.ok(engine.displayName, 'Debe tener displayName');
        assert.ok(engine.description, 'Debe tener description');
        assert.ok(engine.dockerEnvValue, 'Debe tener dockerEnvValue');
        assert.ok(engine.connectionTemplate, 'Debe tener connectionTemplate');
        assert.ok(engine.connectionTemplate.command, 'Debe tener connectionTemplate.command');
        assert.ok(engine.connectionTemplate.argsTemplate, 'Debe tener connectionTemplate.argsTemplate');
        assert.ok(engine.healthcheckTimeoutMs > 0, 'healthcheckTimeoutMs debe ser positivo');
        assert.ok(engine.defaultPort >= 0, 'defaultPort debe ser >= 0');
      });

      test(`${engine.displayName}: el defaultPort es el esperado`, () => {
        const expectedPorts: Record<EngineId, number> = {
          postgres: 5432,
          mysql: 3306,
          mariadb: 3307,
          sqlite: 0,
          oracle: 1521,
          sqlserver: 1433,
        };
        assert.strictEqual(
          engine.defaultPort,
          expectedPorts[engine.id],
          `Puerto incorrecto para ${engine.id}`,
        );
      });
    }
  });
});
