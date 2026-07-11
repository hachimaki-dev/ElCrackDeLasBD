/**
 * SQL Engine Laboratory — Docker Environment Doctor
 *
 * Sistema de diagnóstico y preparación automática del entorno Docker.
 * Funciona como un "doctor" que:
 *   1. Detecta el SO y arquitectura (Mac M1/M2/M3/M4, Linux, Windows)
 *   2. Verifica que Docker esté instalado y corriendo
 *   3. Verifica la conexión al socket Docker
 *   4. Verifica si la imagen del laboratorio existe localmente
 *   5. Reporta qué motores corren nativos vs bajo emulación
 *   6. Genera un plan de acción para lo que falta
 *
 * Diseñado para ser consumido tanto por usuarios humanos (via Output Channel)
 * como por agentes de IA que necesitan contexto sobre el entorno.
 */
import { DockerClient } from './dockerClient';
import { PlatformInfo } from './platformInfo';
import { ResolverEnv } from './dockerConfigResolver';
import { EngineId } from '../engines/engine.types';
/**
 * Resultado de un chequeo individual del doctor.
 */
export interface DoctorCheck {
    /** Nombre legible del chequeo */
    readonly name: string;
    /** Estado del chequeo */
    readonly status: 'pass' | 'fail' | 'warn' | 'info';
    /** Mensaje descriptivo del resultado */
    readonly message: string;
    /** Acción sugerida si el chequeo no pasó */
    readonly action?: string;
    /** Si true, el doctor puede intentar resolver esto automáticamente */
    readonly autoFixable?: boolean;
}
/**
 * Información de compatibilidad por motor.
 */
export interface EngineCompatibility {
    /** ID del motor */
    readonly engineId: EngineId;
    /** Nombre para display */
    readonly displayName: string;
    /** Si corre nativo en la plataforma actual */
    readonly runsNative: boolean;
    /** Si requiere emulación */
    readonly requiresEmulation: boolean;
    /** Warning o nota informativa */
    readonly note: string | null;
}
/**
 * Reporte completo del doctor.
 */
export interface DoctorReport {
    /** Timestamp ISO del reporte */
    readonly timestamp: string;
    /** Información de la plataforma detectada */
    readonly platform: PlatformInfo;
    /** Resultado de cada chequeo */
    readonly checks: DoctorCheck[];
    /** Compatibilidad por motor */
    readonly engineCompatibility: EngineCompatibility[];
    /** Log de resolución del socket Docker */
    readonly resolutionLog: string[];
    /** Opciones Docker resueltas */
    readonly resolvedDockerOptions: {
        socketPath?: string;
        host?: string;
        port?: number;
    };
    /** Resumen: cuántos checks pasaron, fallaron, etc. */
    readonly summary: {
        total: number;
        passed: number;
        failed: number;
        warnings: number;
        allCriticalPassed: boolean;
    };
}
/**
 * Ejecuta el diagnóstico completo del entorno ("Doctor").
 * Verifica todo lo necesario para que la extensión funcione correctamente
 * en la plataforma actual.
 *
 * @param dockerClient - Cliente Docker para verificaciones
 * @param resolverOverrides - Overrides opcionales para testing
 * @returns Reporte completo del doctor
 */
export declare function runDoctor(dockerClient: DockerClient, resolverOverrides?: Partial<ResolverEnv>): Promise<DoctorReport>;
/**
 * Formatea el reporte del doctor como texto legible para el Output Channel.
 *
 * @param report - Reporte del doctor
 * @returns String multi-línea formateado
 */
export declare function formatDoctorReport(report: DoctorReport): string;
/**
 * Ejecuta el doctor y retorna el reporte formateado en un solo paso.
 * Convenience function para uso directo desde comandos de VS Code.
 *
 * @param dockerClient - Cliente Docker
 * @returns String formateado del reporte
 */
export declare function runDoctorFormatted(dockerClient: DockerClient): Promise<string>;
//# sourceMappingURL=dockerDiagnostics.d.ts.map