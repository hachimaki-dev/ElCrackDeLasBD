"use strict";
/**
 * SQL Engine Laboratory — Platform Info
 *
 * Detecta el sistema operativo, arquitectura y contexto de ejecución.
 * Proporciona warnings de emulación para motores que no tienen soporte
 * nativo en la arquitectura del host.
 *
 * Este módulo es puro (sin side-effects) y testeable por inyección de dependencias.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectPlatform = detectPlatform;
exports.getEmulationWarning = getEmulationWarning;
exports.getArm64NativeNote = getArm64NativeNote;
exports.requiresEmulation = requiresEmulation;
/**
 * Entorno por defecto usando APIs reales de Node.js.
 */
const defaultPlatformEnv = {
    platform: process.platform,
    arch: process.arch,
};
/**
 * Nombres legibles de SO por plataforma de Node.js.
 */
const OS_DISPLAY_NAMES = {
    darwin: 'macOS',
    linux: 'Linux',
    win32: 'Windows',
};
/**
 * Motores que SOLO tienen imágenes Docker amd64 (x86_64).
 * Estos motores correrán bajo emulación en hosts arm64.
 *
 * IMPORTANTE: Oracle Free (gvenzl/oracle-free) desde la versión 23.5
 * tiene soporte arm64 nativo — NO está en esta lista.
 * Solo SQL Server queda aquí porque Microsoft no publica imagen arm64.
 */
const AMD64_ONLY_ENGINES = new Set([
    'sqlserver',
]);
/**
 * Notas para motores que corren nativos en arm64 pero con consideraciones especiales.
 */
const ARM64_NATIVE_NOTES = {
    oracle: 'Oracle Free (gvenzl/oracle-free:23.5+) corre nativo en arm64. ' +
        'El arranque puede tomar 1-2 minutos en cualquier plataforma.',
};
/**
 * Detecta la plataforma actual del host.
 *
 * @param overrides - Overrides para inyección en tests
 * @returns Información completa de la plataforma
 */
function detectPlatform(overrides) {
    const env = { ...defaultPlatformEnv, ...overrides };
    const isArm = env.arch === 'arm64' || env.arch === 'arm';
    const isAppleSilicon = env.platform === 'darwin' && env.arch === 'arm64';
    const osName = OS_DISPLAY_NAMES[env.platform] ?? env.platform;
    let displayString = `${osName} ${env.arch}`;
    if (isAppleSilicon) {
        displayString += ' (Apple Silicon)';
    }
    return {
        os: env.platform,
        arch: env.arch,
        isAppleSilicon,
        isArm,
        displayString,
    };
}
// ==========================================================================
// Emulation Warnings
// ==========================================================================
/**
 * Mensajes de warning por motor cuando corre bajo emulación.
 */
const EMULATION_WARNINGS = {
    sqlserver: 'SQL Server corre bajo emulación (amd64 sobre arm64). ' +
        'El rendimiento será menor. Esta es una limitación conocida de Microsoft ' +
        '(no publican imagen arm64 nativa).',
};
/**
 * Retorna un warning de emulación si el motor no soporta la arquitectura
 * del host de forma nativa, o null si no aplica.
 *
 * @param engineId - Motor a verificar
 * @param platform - Info de plataforma (de detectPlatform())
 * @returns Mensaje de warning o null si corre nativo
 */
function getEmulationWarning(engineId, platform) {
    if (!platform.isArm) {
        return null; // En x86_64 todos corren nativos
    }
    if (AMD64_ONLY_ENGINES.has(engineId)) {
        return EMULATION_WARNINGS[engineId] ?? `${engineId} correrá bajo emulación en ${platform.displayString}.`;
    }
    return null;
}
/**
 * Retorna una nota informativa para motores arm64 nativos con consideraciones
 * especiales, o null si no hay nada que reportar.
 *
 * @param engineId - Motor a verificar
 * @param platform - Info de plataforma
 * @returns Nota informativa o null
 */
function getArm64NativeNote(engineId, platform) {
    if (!platform.isArm) {
        return null;
    }
    return ARM64_NATIVE_NOTES[engineId] ?? null;
}
/**
 * Retorna true si el motor requiere emulación en la plataforma dada.
 *
 * @param engineId - Motor a verificar
 * @param platform - Info de plataforma
 * @returns true si necesita emulación
 */
function requiresEmulation(engineId, platform) {
    return platform.isArm && AMD64_ONLY_ENGINES.has(engineId);
}
//# sourceMappingURL=platformInfo.js.map