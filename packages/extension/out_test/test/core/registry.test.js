"use strict";
/**
 * Tests del Engine Registry y los adapters de motores.
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
const registry_1 = require("../../src/core/engines/registry");
suite('Engine Registry', () => {
    test('getAllEngines retorna exactamente 6 motores', () => {
        const engines = (0, registry_1.getAllEngines)();
        assert.strictEqual(engines.length, 6);
    });
    test('los IDs de los 6 motores están presentes', () => {
        const expectedIds = ['postgres', 'mysql', 'mariadb', 'sqlite', 'oracle', 'sqlserver'];
        const engines = (0, registry_1.getAllEngines)();
        const ids = engines.map((e) => e.id);
        for (const expected of expectedIds) {
            assert.ok(ids.includes(expected), `Falta el motor: ${expected}`);
        }
    });
    test('getEngineById retorna el motor correcto', () => {
        const pg = (0, registry_1.getEngineById)('postgres');
        assert.ok(pg, 'PostgreSQL debe existir');
        assert.strictEqual(pg.id, 'postgres');
        assert.strictEqual(pg.displayName, 'PostgreSQL');
        assert.strictEqual(pg.defaultPort, 5432);
    });
    test('getEngineById retorna undefined para un ID inválido', () => {
        // cast forzado para testear el caso de ID inválido
        const result = (0, registry_1.getEngineById)('nonexistent');
        assert.strictEqual(result, undefined);
    });
    test('getEngineCount retorna 6', () => {
        assert.strictEqual((0, registry_1.getEngineCount)(), 6);
    });
    test('isValidEngineId reconoce todos los motores válidos', () => {
        const validIds = ['postgres', 'mysql', 'mariadb', 'sqlite', 'oracle', 'sqlserver'];
        for (const id of validIds) {
            assert.ok((0, registry_1.isValidEngineId)(id), `${id} debería ser válido`);
        }
    });
    test('isValidEngineId rechaza strings inválidos', () => {
        assert.ok(!(0, registry_1.isValidEngineId)('mongodb'));
        assert.ok(!(0, registry_1.isValidEngineId)(''));
        assert.ok(!(0, registry_1.isValidEngineId)('POSTGRES'));
    });
    suite('Engine Adapters — contrato de EngineDefinition', () => {
        for (const engine of (0, registry_1.getAllEngines)()) {
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
                const expectedPorts = {
                    postgres: 5432,
                    mysql: 3306,
                    mariadb: 3307,
                    sqlite: 0,
                    oracle: 1521,
                    sqlserver: 1433,
                };
                assert.strictEqual(engine.defaultPort, expectedPorts[engine.id], `Puerto incorrecto para ${engine.id}`);
            });
        }
    });
});
//# sourceMappingURL=registry.test.js.map