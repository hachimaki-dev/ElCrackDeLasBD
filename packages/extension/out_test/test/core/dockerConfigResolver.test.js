"use strict";
/**
 * Tests para el resolvedor de configuración de Docker (dockerConfigResolver).
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
var assert = require("assert");
var path = require("path");
var dockerConfigResolver_1 = require("../../src/core/docker/dockerConfigResolver");
suite('Docker Config Resolver', function () {
    // Helper para construir un entorno mockeado limpio
    function createMockEnv(overrides) {
        if (overrides === void 0) { overrides = {}; }
        var files = {};
        var directories = {};
        return __assign({ env: {}, platform: 'linux', homedir: '/home/user', fsExistsSync: function (p) {
                return p in files || p in directories;
            }, fsReadFileSync: function (p) {
                if (p in files) {
                    return files[p];
                }
                throw new Error("File not found: ".concat(p));
            }, fsReaddirSync: function (p) {
                if (p in directories) {
                    return directories[p];
                }
                throw new Error("Directory not found: ".concat(p));
            } }, overrides);
    }
    test('respeta DOCKER_HOST con unix://', function () {
        var mockEnv = createMockEnv({
            env: { DOCKER_HOST: 'unix:///var/run/custom.sock' },
        });
        var options = (0, dockerConfigResolver_1.resolveDockerOptions)(mockEnv);
        assert.deepStrictEqual(options, { socketPath: '/var/run/custom.sock' });
    });
    test('respeta DOCKER_HOST con npipe://', function () {
        var mockEnv = createMockEnv({
            env: { DOCKER_HOST: 'npipe:////./pipe/custom_engine' },
        });
        var options = (0, dockerConfigResolver_1.resolveDockerOptions)(mockEnv);
        assert.deepStrictEqual(options, { socketPath: '//./pipe/custom_engine' });
    });
    test('respeta DOCKER_HOST con tcp://', function () {
        var mockEnv = createMockEnv({
            env: { DOCKER_HOST: 'tcp://127.0.0.1:4243' },
        });
        var options = (0, dockerConfigResolver_1.resolveDockerOptions)(mockEnv);
        assert.deepStrictEqual(options, { host: '127.0.0.1', port: 4243 });
    });
    test('respeta DOCKER_HOST con tcp:// sin puerto', function () {
        var mockEnv = createMockEnv({
            env: { DOCKER_HOST: 'tcp://10.0.0.1' },
        });
        var options = (0, dockerConfigResolver_1.resolveDockerOptions)(mockEnv);
        assert.deepStrictEqual(options, { host: '10.0.0.1', port: 2375 });
    });
    test('lee el contexto activo desde ~/.docker/config.json y resuelve su meta.json', function () {
        var _a, _b;
        var homedir = '/home/user';
        var configPath = path.join(homedir, '.docker', 'config.json');
        var metaDir = path.join(homedir, '.docker', 'contexts', 'meta');
        var contextHash = 'a1b2c3d4';
        var metaJsonPath = path.join(metaDir, contextHash, 'meta.json');
        var files = (_a = {},
            _a[configPath] = JSON.stringify({ currentContext: 'desktop-linux' }),
            _a[metaJsonPath] = JSON.stringify({
                Name: 'desktop-linux',
                Endpoints: {
                    docker: {
                        Host: 'unix:///home/user/.docker/desktop/docker.sock',
                    },
                },
            }),
            _a);
        var directories = (_b = {},
            _b[metaDir] = [contextHash],
            _b);
        var mockEnv = createMockEnv({
            homedir: homedir,
            fsExistsSync: function (p) { return p in files || p in directories; },
            fsReadFileSync: function (p) { return files[p]; },
            fsReaddirSync: function (p) { return directories[p]; },
        });
        var options = (0, dockerConfigResolver_1.resolveDockerOptions)(mockEnv);
        assert.deepStrictEqual(options, { socketPath: '/home/user/.docker/desktop/docker.sock' });
    });
    test('ignora contexto si es default y procede al fallback de plataformas', function () {
        var _a;
        var homedir = '/home/user';
        var configPath = path.join(homedir, '.docker', 'config.json');
        var defaultSock = '/var/run/docker.sock';
        var files = (_a = {},
            _a[configPath] = JSON.stringify({ currentContext: 'default' }),
            _a[defaultSock] = '',
            _a);
        var mockEnv = createMockEnv({
            homedir: homedir,
            fsExistsSync: function (p) { return p in files; },
            fsReadFileSync: function (p) { return files[p]; },
        });
        var options = (0, dockerConfigResolver_1.resolveDockerOptions)(mockEnv);
        assert.deepStrictEqual(options, { socketPath: '/var/run/docker.sock' });
    });
    test('retorna pipe de Windows en plataforma win32', function () {
        var mockEnv = createMockEnv({
            platform: 'win32',
        });
        var options = (0, dockerConfigResolver_1.resolveDockerOptions)(mockEnv);
        assert.deepStrictEqual(options, { socketPath: '//./pipe/docker_engine' });
    });
    test('prueba los fallbacks de unix en orden: /var/run/docker.sock', function () {
        var _a;
        var targetPath = '/var/run/docker.sock';
        var files = (_a = {},
            _a[targetPath] = '',
            _a);
        var mockEnv = createMockEnv({
            platform: 'linux',
            fsExistsSync: function (p) { return p in files; },
        });
        var options = (0, dockerConfigResolver_1.resolveDockerOptions)(mockEnv);
        assert.deepStrictEqual(options, { socketPath: targetPath });
    });
    test('prueba los fallbacks de unix en orden: /run/docker.sock', function () {
        var _a;
        var targetPath = '/run/docker.sock';
        var files = (_a = {},
            _a[targetPath] = '',
            _a);
        var mockEnv = createMockEnv({
            platform: 'linux',
            fsExistsSync: function (p) { return p in files; },
        });
        var options = (0, dockerConfigResolver_1.resolveDockerOptions)(mockEnv);
        assert.deepStrictEqual(options, { socketPath: targetPath });
    });
    test('prueba los fallbacks de unix en orden: ~/.docker/run/docker.sock', function () {
        var _a;
        var homedir = '/home/user';
        var targetPath = path.join(homedir, '.docker', 'run', 'docker.sock');
        var files = (_a = {},
            _a[targetPath] = '',
            _a);
        var mockEnv = createMockEnv({
            platform: 'linux',
            homedir: homedir,
            fsExistsSync: function (p) { return p in files; },
        });
        var options = (0, dockerConfigResolver_1.resolveDockerOptions)(mockEnv);
        assert.deepStrictEqual(options, { socketPath: targetPath });
    });
    test('prueba los fallbacks de unix en orden: ~/.docker/desktop/docker.sock', function () {
        var _a;
        var homedir = '/home/user';
        var targetPath = path.join(homedir, '.docker', 'desktop', 'docker.sock');
        var files = (_a = {},
            _a[targetPath] = '',
            _a);
        var mockEnv = createMockEnv({
            platform: 'linux',
            homedir: homedir,
            fsExistsSync: function (p) { return p in files; },
        });
        var options = (0, dockerConfigResolver_1.resolveDockerOptions)(mockEnv);
        assert.deepStrictEqual(options, { socketPath: targetPath });
    });
    test('retorna el socket por defecto de Unix si ninguna ruta candidata existe', function () {
        var mockEnv = createMockEnv({
            platform: 'linux',
            fsExistsSync: function () { return false; },
        });
        var options = (0, dockerConfigResolver_1.resolveDockerOptions)(mockEnv);
        assert.deepStrictEqual(options, { socketPath: '/var/run/docker.sock' });
    });
});
