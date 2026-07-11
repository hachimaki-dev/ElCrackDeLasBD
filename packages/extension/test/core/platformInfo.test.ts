/**
 * Tests para la detección de plataforma y warnings de emulación (platformInfo).
 */

import * as assert from 'assert';
import {
  detectPlatform,
  getEmulationWarning,
  getArm64NativeNote,
  requiresEmulation,
  PlatformDetectionEnv,
} from '../../src/core/docker/platformInfo';

suite('Platform Info', () => {
  // ================================================================
  // detectPlatform
  // ================================================================

  suite('detectPlatform', () => {
    test('detecta macOS arm64 como Apple Silicon', () => {
      const platform = detectPlatform({ platform: 'darwin', arch: 'arm64' });
      assert.strictEqual(platform.os, 'darwin');
      assert.strictEqual(platform.arch, 'arm64');
      assert.strictEqual(platform.isAppleSilicon, true);
      assert.strictEqual(platform.isArm, true);
      assert.ok(platform.displayString.includes('macOS'));
      assert.ok(platform.displayString.includes('Apple Silicon'));
    });

    test('detecta macOS x64 (Intel Mac)', () => {
      const platform = detectPlatform({ platform: 'darwin', arch: 'x64' });
      assert.strictEqual(platform.os, 'darwin');
      assert.strictEqual(platform.arch, 'x64');
      assert.strictEqual(platform.isAppleSilicon, false);
      assert.strictEqual(platform.isArm, false);
      assert.ok(platform.displayString.includes('macOS'));
      assert.ok(!platform.displayString.includes('Apple Silicon'));
    });

    test('detecta Linux x64', () => {
      const platform = detectPlatform({ platform: 'linux', arch: 'x64' });
      assert.strictEqual(platform.os, 'linux');
      assert.strictEqual(platform.arch, 'x64');
      assert.strictEqual(platform.isAppleSilicon, false);
      assert.strictEqual(platform.isArm, false);
      assert.ok(platform.displayString.includes('Linux'));
    });

    test('detecta Linux arm64 (ej: Raspberry Pi, AWS Graviton)', () => {
      const platform = detectPlatform({ platform: 'linux', arch: 'arm64' });
      assert.strictEqual(platform.os, 'linux');
      assert.strictEqual(platform.arch, 'arm64');
      assert.strictEqual(platform.isAppleSilicon, false);
      assert.strictEqual(platform.isArm, true);
    });

    test('detecta Windows x64', () => {
      const platform = detectPlatform({ platform: 'win32', arch: 'x64' });
      assert.strictEqual(platform.os, 'win32');
      assert.strictEqual(platform.arch, 'x64');
      assert.strictEqual(platform.isAppleSilicon, false);
      assert.strictEqual(platform.isArm, false);
      assert.ok(platform.displayString.includes('Windows'));
    });

    test('detecta Windows arm64', () => {
      const platform = detectPlatform({ platform: 'win32', arch: 'arm64' });
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
      const platform = detectPlatform({ platform: 'darwin', arch: 'arm64' });
      const warning = getEmulationWarning('sqlserver', platform);
      assert.notStrictEqual(warning, null);
      assert.ok(warning!.includes('emulación'));
    });

    test('Oracle en arm64 NO retorna warning (tiene soporte nativo)', () => {
      const platform = detectPlatform({ platform: 'darwin', arch: 'arm64' });
      const warning = getEmulationWarning('oracle', platform);
      assert.strictEqual(warning, null);
    });

    test('PostgreSQL en arm64 NO retorna warning', () => {
      const platform = detectPlatform({ platform: 'darwin', arch: 'arm64' });
      const warning = getEmulationWarning('postgres', platform);
      assert.strictEqual(warning, null);
    });

    test('MySQL en arm64 NO retorna warning', () => {
      const platform = detectPlatform({ platform: 'darwin', arch: 'arm64' });
      const warning = getEmulationWarning('mysql', platform);
      assert.strictEqual(warning, null);
    });

    test('MariaDB en arm64 NO retorna warning', () => {
      const platform = detectPlatform({ platform: 'darwin', arch: 'arm64' });
      const warning = getEmulationWarning('mariadb', platform);
      assert.strictEqual(warning, null);
    });

    test('SQLite en arm64 NO retorna warning', () => {
      const platform = detectPlatform({ platform: 'darwin', arch: 'arm64' });
      const warning = getEmulationWarning('sqlite', platform);
      assert.strictEqual(warning, null);
    });

    test('ningún motor retorna warning en x64 (todos nativos)', () => {
      const platform = detectPlatform({ platform: 'linux', arch: 'x64' });
      assert.strictEqual(getEmulationWarning('postgres', platform), null);
      assert.strictEqual(getEmulationWarning('mysql', platform), null);
      assert.strictEqual(getEmulationWarning('oracle', platform), null);
      assert.strictEqual(getEmulationWarning('sqlserver', platform), null);
      assert.strictEqual(getEmulationWarning('sqlite', platform), null);
      assert.strictEqual(getEmulationWarning('mariadb', platform), null);
    });
  });

  // ================================================================
  // getArm64NativeNote
  // ================================================================

  suite('getArm64NativeNote', () => {
    test('Oracle en arm64 retorna nota sobre soporte nativo', () => {
      const platform = detectPlatform({ platform: 'darwin', arch: 'arm64' });
      const note = getArm64NativeNote('oracle', platform);
      assert.notStrictEqual(note, null);
      assert.ok(note!.includes('nativo'));
    });

    test('PostgreSQL en arm64 no tiene nota especial', () => {
      const platform = detectPlatform({ platform: 'darwin', arch: 'arm64' });
      const note = getArm64NativeNote('postgres', platform);
      assert.strictEqual(note, null);
    });

    test('ningún motor tiene nota en x64', () => {
      const platform = detectPlatform({ platform: 'linux', arch: 'x64' });
      assert.strictEqual(getArm64NativeNote('oracle', platform), null);
      assert.strictEqual(getArm64NativeNote('postgres', platform), null);
    });
  });

  // ================================================================
  // requiresEmulation
  // ================================================================

  suite('requiresEmulation', () => {
    test('SQL Server requiere emulación en arm64', () => {
      const platform = detectPlatform({ platform: 'darwin', arch: 'arm64' });
      assert.strictEqual(requiresEmulation('sqlserver', platform), true);
    });

    test('Oracle NO requiere emulación en arm64', () => {
      const platform = detectPlatform({ platform: 'darwin', arch: 'arm64' });
      assert.strictEqual(requiresEmulation('oracle', platform), false);
    });

    test('PostgreSQL NO requiere emulación en arm64', () => {
      const platform = detectPlatform({ platform: 'darwin', arch: 'arm64' });
      assert.strictEqual(requiresEmulation('postgres', platform), false);
    });

    test('nada requiere emulación en x64', () => {
      const platform = detectPlatform({ platform: 'linux', arch: 'x64' });
      assert.strictEqual(requiresEmulation('sqlserver', platform), false);
      assert.strictEqual(requiresEmulation('oracle', platform), false);
      assert.strictEqual(requiresEmulation('postgres', platform), false);
    });
  });
});
