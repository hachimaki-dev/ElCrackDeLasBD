"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContainerLifecycle = void 0;
const events_1 = require("events");
const engine_types_1 = require("../engines/engine.types");
const registry_1 = require("../engines/registry");
const connectionBuilder_1 = require("../connection/connectionBuilder");
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
 */
class ContainerLifecycle extends events_1.EventEmitter {
    currentEngineId = null;
    currentStatus = 'stopped';
    dockerClient;
    constructor(dockerClient) {
        super();
        this.dockerClient = dockerClient;
    }
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
    async startEngine(engineId) {
        // Buscar definición del motor
        const engine = (0, registry_1.getEngineById)(engineId);
        if (!engine) {
            const error = {
                code: 'UNKNOWN_ENGINE',
                message: `Motor '${engineId}' no encontrado en el catálogo`,
            };
            this.emit('error', error);
            return (0, engine_types_1.failure)(error);
        }
        // Verificar Docker
        this.updateStatus(engineId, 'pulling', 'Verificando Docker...');
        const dockerCheck = await this.dockerClient.checkDockerAvailability();
        if (!dockerCheck.ok) {
            this.updateStatus(engineId, 'error', dockerCheck.error.message);
            this.emit('error', dockerCheck.error);
            return (0, engine_types_1.failure)(dockerCheck.error);
        }
        // Detener motor activo si hay uno corriendo (invariante: un motor a la vez)
        if (this.currentEngineId && this.currentEngineId !== engineId) {
            const stopResult = await this.stopEngine();
            if (!stopResult.ok) {
                return (0, engine_types_1.failure)(stopResult.error);
            }
        }
        // Pull de la imagen si no existe localmente
        const fullImageName = `${engine_types_1.DOCKER_IMAGE_CONFIG.imageName}:${engine_types_1.DOCKER_IMAGE_CONFIG.imageTag}`;
        const imageExists = await this.dockerClient.imageExists(fullImageName);
        if (!imageExists) {
            this.updateStatus(engineId, 'pulling', 'Descargando imagen Docker...');
            const pullResult = await this.dockerClient.pullImage(fullImageName, (progress) => {
                this.emit('pullProgress', progress);
                const message = progress.percentage
                    ? `Descargando: ${progress.percentage}%`
                    : `Descargando: ${progress.status}`;
                this.updateStatus(engineId, 'pulling', message);
            });
            if (!pullResult.ok) {
                this.updateStatus(engineId, 'error', pullResult.error.message);
                this.emit('error', pullResult.error);
                return (0, engine_types_1.failure)(pullResult.error);
            }
        }
        // Crear y arrancar contenedor
        this.updateStatus(engineId, 'starting', `Iniciando ${engine.displayName}...`);
        const portBindings = this.buildPortBindings(engine);
        const exposedPorts = this.buildExposedPorts(engine);
        const startResult = await this.dockerClient.createAndStartContainer({
            name: engine_types_1.DOCKER_IMAGE_CONFIG.containerName,
            image: fullImageName,
            env: {
                ENGINE: engine.dockerEnvValue,
                LAB_USER: engine.connectionTemplate.defaultUser || engine_types_1.DOCKER_IMAGE_CONFIG.defaultEnv.LAB_USER,
                LAB_PASSWORD: engine.connectionTemplate.defaultPassword || engine_types_1.DOCKER_IMAGE_CONFIG.defaultEnv.LAB_PASSWORD,
                LAB_DATABASE: engine.connectionTemplate.defaultDatabase || engine_types_1.DOCKER_IMAGE_CONFIG.defaultEnv.LAB_DATABASE,
            },
            portBindings,
            exposedPorts,
        });
        if (!startResult.ok) {
            this.updateStatus(engineId, 'error', startResult.error.message);
            this.emit('error', startResult.error);
            return (0, engine_types_1.failure)(startResult.error);
        }
        // Esperar healthcheck
        this.updateStatus(engineId, 'starting', `Esperando que ${engine.displayName} esté listo...`);
        const healthcheckResult = await this.waitForHealthcheck(engine);
        if (!healthcheckResult.ok) {
            this.updateStatus(engineId, 'error', healthcheckResult.error.message);
            this.emit('error', healthcheckResult.error);
            // Limpiar el contenedor fallido
            await this.dockerClient.stopAndRemoveContainer(engine_types_1.DOCKER_IMAGE_CONFIG.containerName);
            return (0, engine_types_1.failure)(healthcheckResult.error);
        }
        // Motor listo — generar info de conexión
        this.currentEngineId = engineId;
        this.currentStatus = 'running';
        const connectionDetails = (0, connectionBuilder_1.buildConnectionDetails)(engine, {
            host: 'localhost',
            port: engine.defaultPort,
        });
        const connectionInfo = {
            ...connectionDetails,
            connectionCommand: (0, connectionBuilder_1.buildConnectionCommand)(engine, connectionDetails),
        };
        this.updateStatus(engineId, 'running', `${engine.displayName} listo en puerto ${engine.defaultPort}`);
        this.emit('engineStarted', connectionInfo);
        return (0, engine_types_1.success)(connectionInfo);
    }
    /**
     * Detiene el motor activo y limpia el contenedor.
     *
     * @returns Result vacío si se detuvo correctamente
     */
    async stopEngine() {
        if (!this.currentEngineId) {
            return (0, engine_types_1.success)(undefined);
        }
        const engineId = this.currentEngineId;
        this.updateStatus(engineId, 'stopping', 'Deteniendo motor...');
        const stopResult = await this.dockerClient.stopAndRemoveContainer(engine_types_1.DOCKER_IMAGE_CONFIG.containerName);
        if (!stopResult.ok) {
            this.updateStatus(engineId, 'error', stopResult.error.message);
            this.emit('error', stopResult.error);
            return (0, engine_types_1.failure)(stopResult.error);
        }
        this.updateStatus(engineId, 'stopped', 'Motor detenido');
        this.emit('engineStopped', engineId);
        this.currentEngineId = null;
        this.currentStatus = 'stopped';
        return (0, engine_types_1.success)(undefined);
    }
    /**
     * Retorna el ID del motor actualmente corriendo, o null si no hay ninguno.
     */
    getCurrentEngine() {
        return this.currentEngineId;
    }
    /**
     * Retorna el estado actual del ciclo de vida.
     */
    getStatus() {
        return this.currentStatus;
    }
    /**
     * Espera a que el healthcheck del motor pase.
     * Usa polling con el timeout definido por el motor.
     */
    async waitForHealthcheck(engine) {
        const startTime = Date.now();
        const pollIntervalMs = 2000;
        while (Date.now() - startTime < engine.healthcheckTimeoutMs) {
            const isRunning = await this.dockerClient.isContainerRunning(engine_types_1.DOCKER_IMAGE_CONFIG.containerName);
            if (!isRunning) {
                return (0, engine_types_1.failure)({
                    code: 'ENGINE_START_FAILED',
                    message: `El contenedor de ${engine.displayName} se detuvo inesperadamente durante el arranque`,
                });
            }
            // Verificar si el motor responde al healthcheck
            // Para el MVP, confiamos en que si el contenedor sigue corriendo después de un tiempo razonable,
            // el motor está listo (el healthcheck de Docker validará internamente)
            const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);
            this.updateStatus(engine.id, 'starting', `Esperando ${engine.displayName}... (${elapsedSeconds}s)`);
            await this.sleep(pollIntervalMs);
            // Heurística simple: si el contenedor lleva corriendo al menos X segundos, considerarlo listo
            // El healthcheck de Docker validará internamente; aquí nos damos un margen mínimo
            const minimumWaitMs = engine.id === 'sqlite' ? 1000 : 5000;
            if (Date.now() - startTime >= minimumWaitMs) {
                const stillRunning = await this.dockerClient.isContainerRunning(engine_types_1.DOCKER_IMAGE_CONFIG.containerName);
                if (stillRunning) {
                    return (0, engine_types_1.success)(undefined);
                }
            }
        }
        return (0, engine_types_1.failure)({
            code: 'HEALTHCHECK_TIMEOUT',
            message: `${engine.displayName} no respondió después de ${Math.round(engine.healthcheckTimeoutMs / 1000)} segundos`,
        });
    }
    /**
     * Construye los port bindings para Docker según el motor.
     * SQLite no necesita port bindings (puerto 0).
     */
    buildPortBindings(engine) {
        if (engine.defaultPort === 0) {
            return {};
        }
        return {
            [`${engine.defaultPort}/tcp`]: [{ HostPort: String(engine.defaultPort) }],
        };
    }
    /**
     * Construye los exposed ports para Docker según el motor.
     */
    buildExposedPorts(engine) {
        if (engine.defaultPort === 0) {
            return {};
        }
        return {
            [`${engine.defaultPort}/tcp`]: {},
        };
    }
    /**
     * Actualiza el estado interno y emite evento statusChanged.
     */
    updateStatus(engineId, status, message) {
        this.currentStatus = status;
        const state = {
            engineId,
            status,
            message,
            since: new Date(),
        };
        this.emit('statusChanged', state);
    }
    /**
     * Utility para esperar N milisegundos.
     */
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
exports.ContainerLifecycle = ContainerLifecycle;
//# sourceMappingURL=containerLifecycle.js.map