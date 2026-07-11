/**
 * SQL Engine Laboratory — Container Lifecycle Manager
 *
 * Gestiona el ciclo de vida completo de un motor SQL:
 * pull → start → healthcheck → running → stop
 *
 * Emite eventos que la UI (Tree View, Webview) puede observar
 * sin acoplarse a la lógica de Docker.
 *
 * Invariante: solo un motor puede estar corriendo a la vez.
 * Si se pide iniciar un motor mientras otro corre, se detiene el activo primero.
 */
import { EventEmitter } from 'events';
import { EngineId, EngineStatus, ConnectionInfo, Result, ConfigurationProvider } from '../engines/engine.types';
import { DockerClient } from './dockerClient';
import { PlatformInfo } from './platformInfo';
/**
 * Gestor del ciclo de vida de contenedores de motores SQL.
 * Implementa el patrón Observer via EventEmitter para desacoplar
 * la lógica de Docker de la UI.
 *
 * @fires statusChanged - Cuando el estado de un motor cambia
 * @fires engineStarted - Cuando un motor está listo para recibir conexiones
 * @fires engineStopped - Cuando un motor se detuvo
 * @fires error - Cuando ocurre un error en el ciclo de vida
 * @fires pullProgress - Cuando hay progreso de descarga de imagen
 * @fires emulationWarning - Cuando un motor correrá bajo emulación en la plataforma actual
 * @fires diagnosticLog - Log de diagnóstico para Output Channel
 */
export declare class ContainerLifecycle extends EventEmitter {
    private currentEngineId;
    private currentStatus;
    private readonly dockerClient;
    private readonly configProvider?;
    private readonly platform;
    constructor(dockerClient: DockerClient, configProvider?: ConfigurationProvider);
    /**
     * Inicia un motor SQL, deteniendo cualquier otro motor activo primero.
     * Implementa la invariante de "un motor a la vez" (ADR 0001).
     *
     * Flujo: verificar Docker → detener motor activo → pull imagen → start contenedor →
     * esperar healthcheck → emitir connectionInfo
     *
     * @param engineId - ID del motor a iniciar (debe estar registrado en el catálogo)
     * @returns Result con la info de conexión si arrancó correctamente, o un error tipado
     */
    startEngine(engineId: EngineId): Promise<Result<ConnectionInfo>>;
    /**
     * Detiene el motor activo y limpia el contenedor.
     *
     * @returns Result vacío si se detuvo correctamente
     */
    stopEngine(): Promise<Result<void>>;
    /**
     * Retorna el ID del motor actualmente corriendo, o null si no hay ninguno.
     */
    getCurrentEngine(): EngineId | null;
    /**
     * Retorna el estado actual del ciclo de vida.
     */
    getStatus(): EngineStatus;
    /**
     * Espera a que el healthcheck del motor pase.
     * Usa polling con el timeout definido por el motor.
     */
    private waitForHealthcheck;
    /**
     * Construye los port bindings para Docker según el motor y el puerto objetivo.
     * SQLite no necesita port bindings (puerto 0).
     */
    private buildPortBindings;
    /**
     * Construye los exposed ports para Docker según el motor.
     */
    private buildExposedPorts;
    /**
     * Actualiza el estado interno y emite evento statusChanged.
     */
    private updateStatus;
    /**
     * Utility para esperar N milisegundos.
     */
    private sleep;
    /**
     * Emite un log diagnóstico que puede ser capturado por el Output Channel.
     */
    private emitLog;
    /**
     * Retorna la plataforma detectada (para uso en diagnósticos).
     */
    getPlatformInfo(): PlatformInfo;
}
//# sourceMappingURL=containerLifecycle.d.ts.map