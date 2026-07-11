"use strict";
/**
 * Tests para la detección de plataforma y warnings de emulación (platformInfo).
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
const platformInfo_1 = require("../../src/core/docker/platformInfo");
suite('Platform Info', () => {
    // ================================================================
    // detectPlatform
    // ================================================================
    suite('detectPlatform', () => {
        test('detecta macOS arm64 como Apple Silicon', () => {
            const platform = (0, platformInfo_1.detectPlatform)({ platform: 'darwin', arch: 'arm64' });
            assert.strictEqual(platform.os, 'darwin');
            assert.strictEqual(platform.arch, 'arm64');
            assert.strictEqual(platform.isAppleSilicon, true);
            assert.strictEqual(platform.isArm, true);
            assert.ok(platform.displayString.includes('macOS'));
            assert.ok(platform.displayString.includes('Apple Silicon'));
        });
        test('detecta macOS x64 (Intel Mac)', () => {
            const platform = (0, platformInfo_1.detectPlatform)({ platform: 'darwin', arch: 'x64' });
            assert.strictEqual(platform.os, 'darwin');
            assert.strictEqual(platform.arch, 'x64');
            assert.strictEqual(platform.isAppleSilicon, false);
            assert.strictEqual(platform.isArm, false);
            assert.ok(platform.displayString.includes('macOS'));
            assert.ok(!platform.displayString.includes('Apple Silicon'));
        });
        test('detecta Linux x64', () => {
            const platform = (0, platformInfo_1.detectPlatform)({ platform: 'linux', arch: 'x64' });
            assert.strictEqual(platform.os, 'linux');
            assert.strictEqual(platform.arch, 'x64');
            assert.strictEqual(platform.isAppleSilicon, false);
            assert.strictEqual(platform.isArm, false);
            assert.ok(platform.displayString.includes('Linux'));
        });
        test('detecta Linux arm64 (ej: Raspberry Pi, AWS Graviton)', () => {
            const platform = (0, platformInfo_1.detectPlatform)({ platform: 'linux', arch: 'arm64' });
            assert.strictEqual(platform.os, 'linux');
            assert.strictEqual(platform.arch, 'arm64');
            assert.strictEqual(platform.isAppleSilicon, false);
            assert.strictEqual(platform.isArm, true);
        });
        test('detecta Windows x64', () => {
            const platform = (0, platformInfo_1.detectPlatform)({ platform: 'win32', arch: 'x64' });
            assert.strictEqual(platform.os, 'win32');
            assert.strictEqual(platform.arch, 'x64');
            assert.strictEqual(platform.isAppleSilicon, false);
            assert.strictEqual(platform.isArm, false);
            assert.ok(platform.displayString.includes('Windows'));
        });
        test('detecta Windows arm64', () => {
            const platform = (0, platformInfo_1.detectPlatform)({ platform: 'win32', arch: 'arm64' });
            assert.strictEqual(platform.os, 'win32');
            assert.strictEqual(platform.isArm, true);
            assert.strictEqual(platform.isAppleSilicon, false);
        });
    });
    // ================================================================
    // getEmulationWarning
    // ================================================================
    suite('getEmulationWarning', () => {
        test('SQL Server en arm64 retorna warning', () => {
            const platform = (0, platformInfo_1.detectPlatform)({ platform: 'darwin', arch: 'arm64' });
            const warning = (0, platformInfo_1.getEmulationWarning)('sqlserver', platform);
            assert.notStrictEqual(warning, null);
            assert.ok(warning.includes('emulación'));
        });
        test('Oracle en arm64 NO retorna warning (tiene soporte nativo)', () => {
            const platform = (0, platformInfo_1.detectPlatform)({ platform: 'darwin', arch: 'arm64' });
            const warning = (0, platformInfo_1.getEmulationWarning)('oracle', platform);
            assert.strictEqual(warning, null);
        });
        test('PostgreSQL en arm64 NO retorna warning', () => {
            const platform = (0, platformInfo_1.detectPlatform)({ platform: 'darwin', arch: 'arm64' });
            const warning = (0, platformInfo_1.getEmulationWarning)('postgres', platform);
            assert.strictEqual(warning, null);
        });
        test('MySQL en arm64 NO retorna warning', () => {
            const platform = (0, platformInfo_1.detectPlatform)({ platform: 'darwin', arch: 'arm64' });
            const warning = (0, platformInfo_1.getEmulationWarning)('mysql', platform);
            assert.strictEqual(warning, null);
        });
        test('MariaDB en arm64 NO retorna warning', () => {
            const platform = (0, platformInfo_1.detectPlatform)({ platform: 'darwin', arch: 'arm64' });
            const warning = (0, platformInfo_1.getEmulationWarning)('mariadb', platform);
            assert.strictEqual(warning, null);
        });
        test('SQLite en arm64 NO retorna warning', () => {
            const platform = (0, platformInfo_1.detectPlatform)({ platform: 'darwin', arch: 'arm64' });
            const warning = (0, platformInfo_1.getEmulationWarning)('sqlite', platform);
            assert.strictEqual(warning, null);
        });
        test('ningún motor retorna warning en x64 (todos nativos)', () => {
            const platform = (0, platformInfo_1.detectPlatform)({ platform: 'linux', arch: 'x64' });
            assert.strictEqual((0, platformInfo_1.getEmulationWarning)('postgres', platform), null);
            assert.strictEqual((0, platformInfo_1.getEmulationWarning)('mysql', platform), null);
            assert.strictEqual((0, platformInfo_1.getEmulationWarning)('oracle', platform), null);
            assert.strictEqual((0, platformInfo_1.getEmulationWarning)('sqlserver', platform), null);
            assert.strictEqual((0, platformInfo_1.getEmulationWarning)('sqlite', platform), null);
            assert.strictEqual((0, platformInfo_1.getEmulationWarning)('mariadb', platform), null);
        });
    });
    // ================================================================
    // getArm64NativeNote
    // ================================================================
    suite('getArm64NativeNote', () => {
        test('Oracle en arm64 retorna nota sobre soporte nativo', () => {
            const platform = (0, platformInfo_1.detectPlatform)({ platform: 'darwin', arch: 'arm64' });
            const note = (0, platformInfo_1.getArm64NativeNote)('oracle', platform);
            assert.notStrictEqual(note, null);
            assert.ok(note.includes('nativo'));
        });
        test('PostgreSQL en arm64 no tiene nota especial', () => {
            const platform = (0, platformInfo_1.detectPlatform)({ platform: 'darwin', arch: 'arm64' });
            const note = (0, platformInfo_1.getArm64NativeNote)('postgres', platform);
            assert.strictEqual(note, null);
        });
        test('ningún motor tiene nota en x64', () => {
            const platform = (0, platformInfo_1.detectPlatform)({ platform: 'linux', arch: 'x64' });
            assert.strictEqual((0, platformInfo_1.getArm64NativeNote)('oracle', platform), null);
            assert.strictEqual((0, platformInfo_1.getArm64NativeNote)('postgres', platform), null);
        });
    });
    // ================================================================
    // requiresEmulation
    // ================================================================
    suite('requiresEmulation', () => {
        test('SQL Server requiere emulación en arm64', () => {
            const platform = (0, platformInfo_1.detectPlatform)({ platform: 'darwin', arch: 'arm64' });
            assert.strictEqual((0, platformInfo_1.requiresEmulation)('sqlserver', platform), true);
        });
        test('Oracle NO requiere emulación en arm64', () => {
            const platform = (0, platformInfo_1.detectPlatform)({ platform: 'darwin', arch: 'arm64' });
            assert.strictEqual((0, platformInfo_1.requiresEmulation)('oracle', platform), false);
        });
        test('PostgreSQL NO requiere emulación en arm64', () => {
            const platform = (0, platformInfo_1.detectPlatform)({ platform: 'darwin', arch: 'arm64' });
            assert.strictEqual((0, platformInfo_1.requiresEmulation)('postgres', platform), false);
        });
        test('nada requiere emulación en x64', () => {
            const platform = (0, platformInfo_1.detectPlatform)({ platform: 'linux', arch: 'x64' });
            assert.strictEqual((0, platformInfo_1.requiresEmulation)('sqlserver', platform), false);
            assert.strictEqual((0, platformInfo_1.requiresEmulation)('oracle', platform), false);
            assert.strictEqual((0, platformInfo_1.requiresEmulation)('postgres', platform), false);
        });
    });
});
//# sourceMappingURL=platformInfo.test.js.map