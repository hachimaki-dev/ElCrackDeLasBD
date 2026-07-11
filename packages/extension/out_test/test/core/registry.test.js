"use strict";
/**
 * Tests del Engine Registry y los adapters de motores.
 */
Object.defineProperty(exports, "__esModule", { value: true });
var assert = require("assert");
var registry_1 = require("../../src/core/engines/registry");
suite('Engine Registry', function () {
    test('getAllEngines retorna exactamente 6 motores', function () {
        var engines = (0, registry_1.getAllEngines)();
        assert.strictEqual(engines.length, 6);
    });
    test('los IDs de los 6 motores están presentes', function () {
        var expectedIds = ['postgres', 'mysql', 'mariadb', 'sqlite', 'oracle', 'sqlserver'];
        var engines = (0, registry_1.getAllEngines)();
        var ids = engines.map(function (e) { return e.id; });
        for (var _i = 0, expectedIds_1 = expectedIds; _i < expectedIds_1.length; _i++) {
            var expected = expectedIds_1[_i];
            assert.ok(ids.includes(expected), "Falta el motor: ".concat(expected));
        }
    });
    test('getEngineById retorna el motor correcto', function () {
        var pg = (0, registry_1.getEngineById)('postgres');
        assert.ok(pg, 'PostgreSQL debe existir');
        assert.strictEqual(pg.id, 'postgres');
        assert.strictEqual(pg.displayName, 'PostgreSQL');
        assert.strictEqual(pg.defaultPort, 5432);
    });
    test('getEngineById retorna undefined para un ID inválido', function () {
        // cast forzado para testear el caso de ID inválido
        var result = (0, registry_1.getEngineById)('nonexistent');
        assert.strictEqual(result, undefined);
    });
    test('getEngineCount retorna 6', function () {
        assert.strictEqual((0, registry_1.getEngineCount)(), 6);
    });
    test('isValidEngineId reconoce todos los motores válidos', function () {
        var validIds = ['postgres', 'mysql', 'mariadb', 'sqlite', 'oracle', 'sqlserver'];
        for (var _i = 0, validIds_1 = validIds; _i < validIds_1.length; _i++) {
            var id = validIds_1[_i];
            assert.ok((0, registry_1.isValidEngineId)(id), "".concat(id, " deber\u00EDa ser v\u00E1lido"));
        }
    });
    test('isValidEngineId rechaza strings inválidos', function () {
        assert.ok(!(0, registry_1.isValidEngineId)('mongodb'));
        assert.ok(!(0, registry_1.isValidEngineId)(''));
        assert.ok(!(0, registry_1.isValidEngineId)('POSTGRES'));
    });
    suite('Engine Adapters — contrato de EngineDefinition', function () {
        var _loop_1 = function (engine) {
            test("".concat(engine.displayName, ": tiene todos los campos requeridos"), function () {
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
            test("".concat(engine.displayName, ": el defaultPort es el esperado"), function () {
                var expectedPorts = {
                    postgres: 5432,
                    mysql: 3306,
                    mariadb: 3307,
                    sqlite: 0,
                    oracle: 1521,
                    sqlserver: 1433,
                };
                assert.strictEqual(engine.defaultPort, expectedPorts[engine.id], "Puerto incorrecto para ".concat(engine.id));
            });
        };
        for (var _i = 0, _a = (0, registry_1.getAllEngines)(); _i < _a.length; _i++) {
            var engine = _a[_i];
            _loop_1(engine);
        }
    });
});
