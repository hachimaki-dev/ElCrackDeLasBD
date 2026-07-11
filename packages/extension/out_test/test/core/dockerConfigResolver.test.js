"use strict";
/**
 * Tests para el resolvedor de configuración de Docker (dockerConfigResolver).
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
const path = __importStar(require("path"));
const dockerConfigResolver_1 = require("../../src/core/docker/dockerConfigResolver");
suite('Docker Config Resolver', () => {
    // Helper para construir un entorno mockeado limpio
    function createMockEnv(overrides = {}) {
        const files = {};
        const directories = {};
        return {
            env: {},
            platform: 'linux',
            homedir: '/home/user',
            fsExistsSync: (p) => {
                return p in files || p in directories;
            },
            fsReadFileSync: (p) => {
                if (p in files) {
                    return files[p];
                }
                throw new Error(`File not found: ${p}`);
            },
            fsReaddirSync: (p) => {
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
        const options = (0, dockerConfigResolver_1.resolveDockerOptions)(mockEnv);
        assert.deepStrictEqual(options, { socketPath: '/var/run/custom.sock' });
    });
    test('respeta DOCKER_HOST con npipe://', () => {
        const mockEnv = createMockEnv({
            env: { DOCKER_HOST: 'npipe:////./pipe/custom_engine' },
        });
        const options = (0, dockerConfigResolver_1.resolveDockerOptions)(mockEnv);
        assert.deepStrictEqual(options, { socketPath: '//./pipe/custom_engine' });
    });
    test('respeta DOCKER_HOST con tcp://', () => {
        const mockEnv = createMockEnv({
            env: { DOCKER_HOST: 'tcp://127.0.0.1:4243' },
        });
        const options = (0, dockerConfigResolver_1.resolveDockerOptions)(mockEnv);
        assert.deepStrictEqual(options, { host: '127.0.0.1', port: 4243 });
    });
    test('respeta DOCKER_HOST con tcp:// sin puerto', () => {
        const mockEnv = createMockEnv({
            env: { DOCKER_HOST: 'tcp://10.0.0.1' },
        });
        const options = (0, dockerConfigResolver_1.resolveDockerOptions)(mockEnv);
        assert.deepStrictEqual(options, { host: '10.0.0.1', port: 2375 });
    });
    test('lee el contexto activo desde ~/.docker/config.json y resuelve su meta.json', () => {
        const homedir = '/home/user';
        const configPath = path.join(homedir, '.docker', 'config.json');
        const metaDir = path.join(homedir, '.docker', 'contexts', 'meta');
        const contextHash = 'a1b2c3d4';
        const metaJsonPath = path.join(metaDir, contextHash, 'meta.json');
        const files = {
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
        const directories = {
            [metaDir]: [contextHash],
        };
        const mockEnv = createMockEnv({
            homedir,
            fsExistsSync: (p) => p in files || p in directories,
            fsReadFileSync: (p) => files[p],
            fsReaddirSync: (p) => directories[p],
        });
        const options = (0, dockerConfigResolver_1.resolveDockerOptions)(mockEnv);
        assert.deepStrictEqual(options, { socketPath: '/home/user/.docker/desktop/docker.sock' });
    });
    test('ignora contexto si es default y procede al fallback de plataformas', () => {
        const homedir = '/home/user';
        const configPath = path.join(homedir, '.docker', 'config.json');
        const defaultSock = '/var/run/docker.sock';
        const files = {
            [configPath]: JSON.stringify({ currentContext: 'default' }),
            [defaultSock]: '',
        };
        const mockEnv = createMockEnv({
            homedir,
            fsExistsSync: (p) => p in files,
            fsReadFileSync: (p) => files[p],
        });
        const options = (0, dockerConfigResolver_1.resolveDockerOptions)(mockEnv);
        assert.deepStrictEqual(options, { socketPath: '/var/run/docker.sock' });
    });
    test('retorna pipe de Windows en plataforma win32', () => {
        const mockEnv = createMockEnv({
            platform: 'win32',
        });
        const options = (0, dockerConfigResolver_1.resolveDockerOptions)(mockEnv);
        assert.deepStrictEqual(options, { socketPath: '//./pipe/docker_engine' });
    });
    test('prueba los fallbacks de unix en orden: /var/run/docker.sock', () => {
        const targetPath = '/var/run/docker.sock';
        const files = {
            [targetPath]: '',
        };
        const mockEnv = createMockEnv({
            platform: 'linux',
            fsExistsSync: (p) => p in files,
        });
        const options = (0, dockerConfigResolver_1.resolveDockerOptions)(mockEnv);
        assert.deepStrictEqual(options, { socketPath: targetPath });
    });
    test('prueba los fallbacks de unix en orden: /run/docker.sock', () => {
        const targetPath = '/run/docker.sock';
        const files = {
            [targetPath]: '',
        };
        const mockEnv = createMockEnv({
            platform: 'linux',
            fsExistsSync: (p) => p in files,
        });
        const options = (0, dockerConfigResolver_1.resolveDockerOptions)(mockEnv);
        assert.deepStrictEqual(options, { socketPath: targetPath });
    });
    test('prueba los fallbacks de unix en orden: ~/.docker/run/docker.sock', () => {
        const homedir = '/home/user';
        const targetPath = path.join(homedir, '.docker', 'run', 'docker.sock');
        const files = {
            [targetPath]: '',
        };
        const mockEnv = createMockEnv({
            platform: 'linux',
            homedir,
            fsExistsSync: (p) => p in files,
        });
        const options = (0, dockerConfigResolver_1.resolveDockerOptions)(mockEnv);
        assert.deepStrictEqual(options, { socketPath: targetPath });
    });
    test('prueba los fallbacks de unix en orden: ~/.docker/desktop/docker.sock', () => {
        const homedir = '/home/user';
        const targetPath = path.join(homedir, '.docker', 'desktop', 'docker.sock');
        const files = {
            [targetPath]: '',
        };
        const mockEnv = createMockEnv({
            platform: 'linux',
            homedir,
            fsExistsSync: (p) => p in files,
        });
        const options = (0, dockerConfigResolver_1.resolveDockerOptions)(mockEnv);
        assert.deepStrictEqual(options, { socketPath: targetPath });
    });
    test('retorna el socket por defecto de Unix si ninguna ruta candidata existe', () => {
        const mockEnv = createMockEnv({
            platform: 'linux',
            fsExistsSync: () => false,
        });
        const options = (0, dockerConfigResolver_1.resolveDockerOptions)(mockEnv);
        assert.deepStrictEqual(options, { socketPath: '/var/run/docker.sock' });
    });
    test('resuelve el socket de macOS Docker Desktop con contexto desktop-linux (caso real Mac M1)', () => {
        const homedir = '/Users/hachimaki';
        const configPath = path.join(homedir, '.docker', 'config.json');
        const metaDir = path.join(homedir, '.docker', 'contexts', 'meta');
        const contextHash = 'fe9c6bd7a66301f49ca9b6a70b217107';
        const metaJsonPath = path.join(metaDir, contextHash, 'meta.json');
        const files = {
            [configPath]: JSON.stringify({ currentContext: 'desktop-linux' }),
            [metaJsonPath]: JSON.stringify({
                Name: 'desktop-linux',
                Endpoints: {
                    docker: {
                        Host: 'unix:///Users/hachimaki/.docker/run/docker.sock',
                    },
                },
            }),
        };
        const directories = {
            [metaDir]: [contextHash],
        };
        const mockEnv = createMockEnv({
            platform: 'darwin',
            homedir,
            fsExistsSync: (p) => p in files || p in directories,
            fsReadFileSync: (p) => files[p],
            fsReaddirSync: (p) => directories[p],
        });
        const options = (0, dockerConfigResolver_1.resolveDockerOptions)(mockEnv);
        assert.deepStrictEqual(options, {
            socketPath: '/Users/hachimaki/.docker/run/docker.sock',
        });
    });
    test('el callback onLog recibe mensajes de resolución', () => {
        const logs = [];
        const mockEnv = createMockEnv({
            platform: 'linux',
            fsExistsSync: () => false,
            onLog: (msg) => logs.push(msg),
        });
        (0, dockerConfigResolver_1.resolveDockerOptions)(mockEnv);
        assert.ok(logs.length > 0, 'Debería haber al menos un mensaje de log');
        assert.ok(logs.some(log => log.includes('platform')), 'Debería mencionar la plataforma');
        assert.ok(logs.some(log => log.includes('candidates') || log.includes('socket')), 'Debería mencionar la búsqueda de sockets');
    });
    test('el callback onLog no falla si no se provee', () => {
        const mockEnv = createMockEnv({
            platform: 'linux',
            fsExistsSync: () => false,
        });
        // No debería lanzar error aunque no haya onLog
        assert.doesNotThrow(() => (0, dockerConfigResolver_1.resolveDockerOptions)(mockEnv));
    });
});
//# sourceMappingURL=dockerConfigResolver.test.js.map