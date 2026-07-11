/**
 * SQL Engine Laboratory — Platform Info
 *
 * Detecta el sistema operativo, arquitectura y contexto de ejecución.
 * Proporciona warnings de emulación para motores que no tienen soporte
 * nativo en la arquitectura del host.
 *
 * Este módulo es puro (sin side-effects) y testeable por inyección de dependencias.
 */
import { EngineId } from '../engines/engine.types';
/**
 * Información de la plataforma donde corre la extensión.
 */
export interface PlatformInfo {
    /** Sistema operativo: 'darwin' | 'linux' | 'win32' */
    readonly os: string;
    /** Arquitectura del CPU: 'arm64' | 'x64' | 'ia32' */
    readonly arch: string;
    /** true si es Apple Silicon (M1/M2/M3/M4) */
    readonly isAppleSilicon: boolean;
    /** true si la arquitectura es ARM (arm64 o arm) */
    readonly isArm: boolean;
    /** Resumen legible: ej. "macOS arm64 (Apple Silicon)" */
    readonly displayString: string;
}
/**
 * Dependencias inyectables para testing.
 */
export interface PlatformDetectionEnv {
    platform: string;
    arch: string;
}
/**
 * Detecta la plataforma actual del host.
 *
 * @param overrides - Overrides para inyección en tests
 * @returns Información completa de la plataforma
 */
export declare function detectPlatform(overrides?: Partial<PlatformDetectionEnv>): PlatformInfo;
/**
 * Retorna un warning de emulación si el motor no soporta la arquitectura
 * del host de forma nativa, o null si no aplica.
 *
 * @param engineId - Motor a verificar
 * @param platform - Info de plataforma (de detectPlatform())
 * @returns Mensaje de warning o null si corre nativo
 */
export declare function getEmulationWarning(engineId: EngineId, platform: PlatformInfo): string | null;
/**
 * Retorna una nota informativa para motores arm64 nativos con consideraciones
 * especiales, o null si no hay nada que reportar.
 *
 * @param engineId - Motor a verificar
 * @param platform - Info de plataforma
 * @returns Nota informativa o null
 */
export declare function getArm64NativeNote(engineId: EngineId, platform: PlatformInfo): string | null;
/**
 * Retorna true si el motor requiere emulación en la plataforma dada.
 *
 * @param engineId - Motor a verificar
 * @param platform - Info de plataforma
 * @returns true si necesita emulación
 */
export declare function requiresEmulation(engineId: EngineId, platform: PlatformInfo): boolean;
//# sourceMappingURL=platformInfo.d.ts.map