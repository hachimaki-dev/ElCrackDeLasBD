/**
 * Tests para el resolvedor de configuración de Docker (dockerConfigResolver).
 */

import * as assert from 'assert';
import * as path from 'path';
import { resolveDockerOptions, ResolverEnv } from '../../src/core/docker/dockerConfigResolver';

suite('Docker Config Resolver', () => {
  // Helper para construir un entorno mockeado limpio
  function createMockEnv(overrides: Partial<ResolverEnv> = {}): ResolverEnv {
    const files: Record<string, string> = {};
    const directories: Record<string, string[]> = {};

    return {
      env: {},
      platform: 'linux',
      homedir: '/home/user',
      fsExistsSync: (p: string) => {
        return p in files || p in directories;
      },
      fsReadFileSync: (p: string) => {
        if (p in files) {
          return files[p];
        }
        throw new Error(`File not found: ${p}`);
      },
      fsReaddirSync: (p: string) => {
        if (p in directories) {
          return directories[p];
        }
        throw new Error(`Directory not found: ${p}`);
      },
      ...overrides,
    };
  }

  test('respeta DOCKER_HOST con unix://', () => {
    const mockEnv = createMockEnv({
      env: { DOCKER_HOST: 'unix:///var/run/custom.sock' },
    });
    const options = resolveDockerOptions(mockEnv);
    assert.deepStrictEqual(options, { socketPath: '/var/run/custom.sock' });
  });

  test('respeta DOCKER_HOST con npipe://', () => {
    const mockEnv = createMockEnv({
      env: { DOCKER_HOST: 'npipe:////./pipe/custom_engine' },
    });
    const options = resolveDockerOptions(mockEnv);
    assert.deepStrictEqual(options, { socketPath: '//./pipe/custom_engine' });
  });

  test('respeta DOCKER_HOST con tcp://', () => {
    const mockEnv = createMockEnv({
      env: { DOCKER_HOST: 'tcp://127.0.0.1:4243' },
    });
    const options = resolveDockerOptions(mockEnv);
    assert.deepStrictEqual(options, { host: '127.0.0.1', port: 4243 });
  });

  test('respeta DOCKER_HOST con tcp:// sin puerto', () => {
    const mockEnv = createMockEnv({
      env: { DOCKER_HOST: 'tcp://10.0.0.1' },
    });
    const options = resolveDockerOptions(mockEnv);
    assert.deepStrictEqual(options, { host: '10.0.0.1', port: 2375 });
  });

  test('lee el contexto activo desde ~/.docker/config.json y resuelve su meta.json', () => {
    const homedir = '/home/user';
    const configPath = path.join(homedir, '.docker', 'config.json');
    const metaDir = path.join(homedir, '.docker', 'contexts', 'meta');
    const contextHash = 'a1b2c3d4';
    const metaJsonPath = path.join(metaDir, contextHash, 'meta.json');

    const files: Record<string, string> = {
      [configPath]: JSON.stringify({ currentContext: 'desktop-linux' }),
      [metaJsonPath]: JSON.stringify({
        Name: 'desktop-linux',
        Endpoints: {
          docker: {
            Host: 'unix:///home/user/.docker/desktop/docker.sock',
          },
        },
      }),
    };

    const directories: Record<string, string[]> = {
      [metaDir]: [contextHash],
    };

    const mockEnv = createMockEnv({
      homedir,
      fsExistsSync: (p) => p in files || p in directories,
      fsReadFileSync: (p) => files[p],
      fsReaddirSync: (p) => directories[p],
    });

    const options = resolveDockerOptions(mockEnv);
    assert.deepStrictEqual(options, { socketPath: '/home/user/.docker/desktop/docker.sock' });
  });

  test('ignora contexto si es default y procede al fallback de plataformas', () => {
    const homedir = '/home/user';
    const configPath = path.join(homedir, '.docker', 'config.json');
    const defaultSock = '/var/run/docker.sock';

    const files: Record<string, string> = {
      [configPath]: JSON.stringify({ currentContext: 'default' }),
      [defaultSock]: '',
    };

    const mockEnv = createMockEnv({
      homedir,
      fsExistsSync: (p) => p in files,
      fsReadFileSync: (p) => files[p],
    });

    const options = resolveDockerOptions(mockEnv);
    assert.deepStrictEqual(options, { socketPath: '/var/run/docker.sock' });
  });

  test('retorna pipe de Windows en plataforma win32', () => {
    const mockEnv = createMockEnv({
      platform: 'win32',
    });
    const options = resolveDockerOptions(mockEnv);
    assert.deepStrictEqual(options, { socketPath: '//./pipe/docker_engine' });
  });

  test('prueba los fallbacks de unix en orden: /var/run/docker.sock', () => {
    const targetPath = '/var/run/docker.sock';
    const files: Record<string, string> = {
      [targetPath]: '',
    };

    const mockEnv = createMockEnv({
      platform: 'linux',
      fsExistsSync: (p) => p in files,
    });

    const options = resolveDockerOptions(mockEnv);
    assert.deepStrictEqual(options, { socketPath: targetPath });
  });

  test('prueba los fallbacks de unix en orden: /run/docker.sock', () => {
    const targetPath = '/run/docker.sock';
    const files: Record<string, string> = {
      [targetPath]: '',
    };

    const mockEnv = createMockEnv({
      platform: 'linux',
      fsExistsSync: (p) => p in files,
    });

    const options = resolveDockerOptions(mockEnv);
    assert.deepStrictEqual(options, { socketPath: targetPath });
  });

  test('prueba los fallbacks de unix en orden: ~/.docker/run/docker.sock', () => {
    const homedir = '/home/user';
    const targetPath = path.join(homedir, '.docker', 'run', 'docker.sock');
    const files: Record<string, string> = {
      [targetPath]: '',
    };

    const mockEnv = createMockEnv({
      platform: 'linux',
      homedir,
      fsExistsSync: (p) => p in files,
    });

    const options = resolveDockerOptions(mockEnv);
    assert.deepStrictEqual(options, { socketPath: targetPath });
  });

  test('prueba los fallbacks de unix en orden: ~/.docker/desktop/docker.sock', () => {
    const homedir = '/home/user';
    const targetPath = path.join(homedir, '.docker', 'desktop', 'docker.sock');
    const files: Record<string, string> = {
      [targetPath]: '',
    };

    const mockEnv = createMockEnv({
      platform: 'linux',
      homedir,
      fsExistsSync: (p) => p in files,
    });

    const options = resolveDockerOptions(mockEnv);
    assert.deepStrictEqual(options, { socketPath: targetPath });
  });

  test('retorna el socket por defecto de Unix si ninguna ruta candidata existe', () => {
    const mockEnv = createMockEnv({
      platform: 'linux',
      fsExistsSync: () => false,
    });

    const options = resolveDockerOptions(mockEnv);
    assert.deepStrictEqual(options, { socketPath: '/var/run/docker.sock' });
  });
});
