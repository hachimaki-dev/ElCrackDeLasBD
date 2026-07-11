"use strict";
/**
 * Tests de ContainerLifecycle — con DockerClient mockeado.
 * Estos tests validan la lógica de ciclo de vida sin necesitar Docker real corriendo.
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
const containerLifecycle_1 = require("../../src/core/docker/containerLifecycle");
const engine_types_1 = require("../../src/core/engines/engine.types");
/** Mock de DockerClient que simula Docker disponible y contenedor funcional */
function createSuccessfulDockerMock() {
    return {
        checkDockerAvailability: async () => (0, engine_types_1.success)(undefined),
        pullImage: async () => (0, engine_types_1.success)(undefined),
        imageExists: async () => true, // imagen ya existe → no hace pull
        createAndStartContainer: async () => (0, engine_types_1.success)({ start: async () => { }, inspect: async () => ({ State: { Running: true } }) }),
        stopAndRemoveContainer: async () => (0, engine_types_1.success)(undefined),
        isContainerRunning: async () => true,
        getContainerByName: async () => null,
    };
}
/** Mock de DockerClient que simula Docker NO disponible */
function createDockerNotRunningMock() {
    return {
        checkDockerAvailability: async () => (0, engine_types_1.failure)({
            code: 'DOCKER_NOT_RUNNING',
            message: 'Docker no está corriendo',
        }),
        pullImage: async () => (0, engine_types_1.success)(undefined),
        imageExists: async () => false,
        createAndStartContainer: async () => (0, engine_types_1.success)({}),
        stopAndRemoveContainer: async () => (0, engine_types_1.success)(undefined),
        isContainerRunning: async () => false,
        getContainerByName: async () => null,
    };
}
suite('ContainerLifecycle', () => {
    test('getStatus inicial es "stopped"', () => {
        const mock = createSuccessfulDockerMock();
        const lifecycle = new containerLifecycle_1.ContainerLifecycle(mock);
        lifecycle.on('error', () => { });
        assert.strictEqual(lifecycle.getStatus(), 'stopped');
    });
    test('getCurrentEngine inicial es null', () => {
        const mock = createSuccessfulDockerMock();
        const lifecycle = new containerLifecycle_1.ContainerLifecycle(mock);
        lifecycle.on('error', () => { });
        assert.strictEqual(lifecycle.getCurrentEngine(), null);
    });
    test('startEngine con motor inválido retorna error UNKNOWN_ENGINE', async () => {
        const mock = createSuccessfulDockerMock();
        const lifecycle = new containerLifecycle_1.ContainerLifecycle(mock);
        lifecycle.on('error', () => { });
        const result = await lifecycle.startEngine('nonexistent');
        assert.strictEqual(result.ok, false);
        if (!result.ok) {
            assert.strictEqual(result.error.code, 'UNKNOWN_ENGINE');
        }
    });
    test('startEngine falla si Docker no está corriendo', async () => {
        const mock = createDockerNotRunningMock();
        const lifecycle = new containerLifecycle_1.ContainerLifecycle(mock);
        lifecycle.on('error', () => { });
        const result = await lifecycle.startEngine('postgres');
        assert.strictEqual(result.ok, false);
        if (!result.ok) {
            assert.strictEqual(result.error.code, 'DOCKER_NOT_RUNNING');
        }
    });
    test('stopEngine cuando no hay motor activo retorna success', async () => {
        const mock = createSuccessfulDockerMock();
        const lifecycle = new containerLifecycle_1.ContainerLifecycle(mock);
        lifecycle.on('error', () => { });
        const result = await lifecycle.stopEngine();
        assert.strictEqual(result.ok, true);
    });
    test('emite evento statusChanged durante el ciclo de vida', async () => {
        const mock = createSuccessfulDockerMock();
        const lifecycle = new containerLifecycle_1.ContainerLifecycle(mock);
        lifecycle.on('error', () => { });
        const statusChanges = [];
        lifecycle.on('statusChanged', (state) => {
            statusChanges.push(state.status);
        });
        // Solo verificamos que Docker not running emite el estado 'error'
        const notRunningMock = createDockerNotRunningMock();
        const lifecycle2 = new containerLifecycle_1.ContainerLifecycle(notRunningMock);
        lifecycle2.on('error', () => { });
        lifecycle2.on('statusChanged', (state) => {
            statusChanges.push(state.status);
        });
        await lifecycle2.startEngine('postgres');
        assert.ok(statusChanges.includes('pulling') || statusChanges.includes('error'), 'Debe emitir al menos un evento de estado');
    });
    test('Result<T> success tiene ok=true y value', () => {
        const result = (0, engine_types_1.success)(42);
        assert.strictEqual(result.ok, true);
        if (result.ok) {
            assert.strictEqual(result.value, 42);
        }
    });
    test('Result<T> failure tiene ok=false y error', () => {
        const error = { code: 'DOCKER_NOT_RUNNING', message: 'Error de prueba' };
        const result = (0, engine_types_1.failure)(error);
        assert.strictEqual(result.ok, false);
        if (!result.ok) {
            assert.strictEqual(result.error.code, 'DOCKER_NOT_RUNNING');
        }
    });
});
//# sourceMappingURL=containerLifecycle.test.js.map