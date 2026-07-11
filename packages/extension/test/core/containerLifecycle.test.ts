/**
 * Tests de ContainerLifecycle — con DockerClient mockeado.
 * Estos tests validan la lógica de ciclo de vida sin necesitar Docker real corriendo.
 */

import * as assert from 'assert';
import { ContainerLifecycle } from '../../src/core/docker/containerLifecycle';
import { DockerClient } from '../../src/core/docker/dockerClient';
import { success, failure, EngineState } from '../../src/core/engines/engine.types';

/** Mock de DockerClient que simula Docker disponible y contenedor funcional */
function createSuccessfulDockerMock(): DockerClient {
  return {
    checkDockerAvailability: async () => success(undefined),
    pullImage: async () => success(undefined),
    imageExists: async () => true, // imagen ya existe → no hace pull
    createAndStartContainer: async () =>
      success({ start: async () => {}, inspect: async () => ({ State: { Running: true } }) } as never),
    stopAndRemoveContainer: async () => success(undefined),
    isContainerRunning: async () => true,
    getContainerByName: async () => null,
  } as unknown as DockerClient;
}

/** Mock de DockerClient que simula Docker NO disponible */
function createDockerNotRunningMock(): DockerClient {
  return {
    checkDockerAvailability: async () =>
      failure({
        code: 'DOCKER_NOT_RUNNING' as const,
        message: 'Docker no está corriendo',
      }),
    pullImage: async () => success(undefined),
    imageExists: async () => false,
    createAndStartContainer: async () => success({} as never),
    stopAndRemoveContainer: async () => success(undefined),
    isContainerRunning: async () => false,
    getContainerByName: async () => null,
  } as unknown as DockerClient;
}

suite('ContainerLifecycle', () => {
  test('getStatus inicial es "stopped"', () => {
    const mock = createSuccessfulDockerMock();
    const lifecycle = new ContainerLifecycle(mock);
    assert.strictEqual(lifecycle.getStatus(), 'stopped');
  });

  test('getCurrentEngine inicial es null', () => {
    const mock = createSuccessfulDockerMock();
    const lifecycle = new ContainerLifecycle(mock);
    assert.strictEqual(lifecycle.getCurrentEngine(), null);
  });

  test('startEngine con motor inválido retorna error UNKNOWN_ENGINE', async () => {
    const mock = createSuccessfulDockerMock();
    const lifecycle = new ContainerLifecycle(mock);
    lifecycle.on('error', () => {});

    const result = await lifecycle.startEngine('nonexistent' as never);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.strictEqual(result.error.code, 'UNKNOWN_ENGINE');
    }
  });

  test('startEngine falla si Docker no está corriendo', async () => {
    const mock = createDockerNotRunningMock();
    const lifecycle = new ContainerLifecycle(mock);
    lifecycle.on('error', () => {});

    const result = await lifecycle.startEngine('postgres');
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.strictEqual(result.error.code, 'DOCKER_NOT_RUNNING');
    }
  });

  test('stopEngine cuando no hay motor activo retorna success', async () => {
    const mock = createSuccessfulDockerMock();
    const lifecycle = new ContainerLifecycle(mock);

    const result = await lifecycle.stopEngine();
    assert.strictEqual(result.ok, true);
  });

  test('emite evento statusChanged durante el ciclo de vida', async () => {
    const mock = createSuccessfulDockerMock();
    const lifecycle = new ContainerLifecycle(mock);

    const statusChanges: string[] = [];
    lifecycle.on('statusChanged', (state: EngineState) => {
      statusChanges.push(state.status);
    });

    // Solo verificamos que Docker not running emite el estado 'error'
    const notRunningMock = createDockerNotRunningMock();
    const lifecycle2 = new ContainerLifecycle(notRunningMock);
    lifecycle2.on('error', () => {});
    lifecycle2.on('statusChanged', (state: EngineState) => {
      statusChanges.push(state.status);
    });

    await lifecycle2.startEngine('postgres');

    assert.ok(statusChanges.includes('pulling') || statusChanges.includes('error'),
      'Debe emitir al menos un evento de estado');
  });

  test('Result<T> success tiene ok=true y value', () => {
    const result = success(42);
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.value, 42);
    }
  });

  test('Result<T> failure tiene ok=false y error', () => {
    const error = { code: 'DOCKER_NOT_RUNNING' as const, message: 'Error de prueba' };
    const result = failure(error);
    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.strictEqual(result.error.code, 'DOCKER_NOT_RUNNING');
    }
  });
});
