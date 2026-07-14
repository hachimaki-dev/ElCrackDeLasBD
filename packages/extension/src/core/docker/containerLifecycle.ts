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
import {
  EngineDefinition,
  EngineId,
  EngineState,
  EngineStatus,
  ConnectionInfo,
  Result,
  EngineError,
  success,
  failure,
  DOCKER_IMAGE_CONFIG,
  ConfigurationProvider,
} from '../engines/engine.types';
import { getEngineById } from '../engines/registry';
import { DockerClient } from './dockerClient';
import { buildConnectionCommand, buildConnectionDetails } from '../connection/connectionBuilder';
import { detectPlatform, getEmulationWarning, PlatformInfo } from './platformInfo';

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
export class ContainerLifecycle extends EventEmitter {
  private currentEngineId: EngineId | null = null;
  private currentStatus: EngineStatus = 'stopped';
  private currentConnectionInfo: ConnectionInfo | null = null;
  private readonly dockerClient: DockerClient;
  private readonly configProvider?: ConfigurationProvider;
  private readonly platform: PlatformInfo;

  constructor(dockerClient: DockerClient, configProvider?: ConfigurationProvider) {
    super();
    this.dockerClient = dockerClient;
    this.configProvider = configProvider;
    this.platform = detectPlatform();
    this.emitLog(`Platform detected: ${this.platform.displayString}`);
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
  async startEngine(engineId: EngineId): Promise<Result<ConnectionInfo>> {
    // Buscar definición del motor
    const engine = getEngineById(engineId);
    if (!engine) {
      const error: EngineError = {
        code: 'UNKNOWN_ENGINE',
        message: `Motor '${engineId}' no encontrado en el catálogo`,
      };
      this.emit('error', error);
      return failure(error);
    }

    // Verificar Docker
    this.updateStatus(engineId, 'pulling', 'Verificando Docker...');
    const dockerCheck = await this.dockerClient.checkDockerAvailability();
    if (!dockerCheck.ok) {
      this.updateStatus(engineId, 'error', dockerCheck.error.message);
      this.emit('error', dockerCheck.error);
      return failure(dockerCheck.error);
    }

    // Emitir warning de emulación si aplica
    const emulationWarning = getEmulationWarning(engineId, this.platform);
    if (emulationWarning) {
      this.emit('emulationWarning', { engineId, message: emulationWarning });
      this.emitLog(`[EMULATION] ${emulationWarning}`);
    }

    // Detener motor activo si hay uno corriendo (invariante: un motor a la vez)
    if (this.currentEngineId && this.currentEngineId !== engineId) {
      const stopResult = await this.stopEngine();
      if (!stopResult.ok) {
        return failure(stopResult.error);
      }
    }

    // Pull de la imagen si no existe localmente
    const fullImageName =
      engineId === 'oracle'
        ? 'gvenzl/oracle-free:23.5-slim'
        : `${DOCKER_IMAGE_CONFIG.imageName}:${DOCKER_IMAGE_CONFIG.imageTag}`;
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
        return failure(pullResult.error);
      }
    }

    this.updateStatus(engineId, 'starting', `Iniciando ${engine.displayName}...`);

    let allocatedPort = engine.defaultPort;
    const maxRetries = 10;
    let startResult;

    // Obtener credenciales del usuario
    const config = this.configProvider ? this.configProvider.getConfig() : undefined;
    const envUser =
      config?.labUser ||
      engine.connectionTemplate.defaultUser ||
      DOCKER_IMAGE_CONFIG.defaultEnv.LAB_USER;
    const envPassword =
      config?.labPassword ||
      engine.connectionTemplate.defaultPassword ||
      DOCKER_IMAGE_CONFIG.defaultEnv.LAB_PASSWORD;
    const envDatabase =
      config?.labDatabase ||
      engine.connectionTemplate.defaultDatabase ||
      DOCKER_IMAGE_CONFIG.defaultEnv.LAB_DATABASE;

    // Nota: La validación estricta de complejidad fue eliminada porque
    // gvenzl/oracle-free acepta contraseñas simples en entornos de desarrollo local.

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      allocatedPort = engine.defaultPort === 0 ? 0 : engine.defaultPort + attempt;
      const portBindings = this.buildPortBindings(engine, allocatedPort);
      const exposedPorts = this.buildExposedPorts(engine);

      const envVars: Record<string, string> =
        engine.id === 'oracle'
          ? { ORACLE_PASSWORD: envPassword }
          : {
              ENGINE: engine.dockerEnvValue,
              LAB_USER: envUser,
              LAB_PASSWORD: envPassword,
              LAB_DATABASE: envDatabase,
            };

      startResult = await this.dockerClient.createAndStartContainer({
        name: DOCKER_IMAGE_CONFIG.containerName,
        image: fullImageName,
        env: envVars,
        portBindings,
        exposedPorts,
        shmSize: engine.dockerShmSize,
        binds: engine.id === 'oracle' ? ['oracle-volume:/opt/oracle/oradata'] : [],
      });

      if (startResult.ok) {
        break; // Éxito
      }

      if (
        startResult.error.code === 'PORT_IN_USE' &&
        engine.defaultPort !== 0 &&
        attempt < maxRetries
      ) {
        this.updateStatus(
          engineId,
          'starting',
          `Puerto ${allocatedPort} ocupado. Probando ${allocatedPort + 1}...`,
        );
      } else {
        break; // Otro error, o no hay más reintentos, o es SQLite
      }
    }

    if (!startResult || !startResult.ok) {
      this.updateStatus(engineId, 'error', startResult!.error.message);
      this.emit('error', startResult!.error);
      return failure(startResult!.error);
    }

    // Esperar healthcheck
    this.updateStatus(engineId, 'starting', `Esperando que ${engine.displayName} esté listo...`);
    const healthcheckResult = await this.waitForHealthcheck(engine);

    if (!healthcheckResult.ok) {
      this.updateStatus(engineId, 'error', healthcheckResult.error.message);
      this.emit('error', healthcheckResult.error);
      // Limpiar el contenedor fallido
      await this.dockerClient.stopAndRemoveContainer(DOCKER_IMAGE_CONFIG.containerName);
      return failure(healthcheckResult.error);
    }

    // Configurar credenciales en tiempo de ejecución para Oracle
    if (engine.id === 'oracle') {
      this.updateStatus(engineId, 'starting', 'Configurando credenciales de Oracle...');
      const resetResult = await this.dockerClient.execCommand(
        DOCKER_IMAGE_CONFIG.containerName,
        ['resetPassword', envPassword],
        'oracle',
      );
      if (!resetResult.ok) {
        this.emitLog(`Failed to reset SYS password: ${resetResult.error.message}`);
      }

      const setupScript = `WHENEVER SQLERROR CONTINUE;
ALTER SESSION SET CONTAINER=FREEPDB1;
BEGIN
  EXECUTE IMMEDIATE 'DROP USER ${envUser} CASCADE';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -1918 THEN
      RAISE;
    END IF;
END;
/
WHENEVER SQLERROR EXIT FAILURE;
CREATE USER ${envUser} IDENTIFIED BY "${envPassword}";
GRANT CONNECT, RESOURCE, DBA TO ${envUser};
EXIT;
`;
      const setupResult = await this.dockerClient.execCommand(
        DOCKER_IMAGE_CONFIG.containerName,
        ['bash', '-c', `sqlplus -s / as sysdba << "EOF"\n${setupScript}\nEOF\n`],
        'oracle',
      );
      if (!setupResult.ok) {
        this.emitLog(`Failed to configure sandbox user: ${setupResult.error.message}`);
      }
    }

    // Motor listo — generar info de conexión
    this.currentEngineId = engineId;
    this.currentStatus = 'running';

    const connectionDetails = buildConnectionDetails(
      engine,
      {
        host: 'localhost',
        port: allocatedPort,
      },
      config,
    );

    const connectionInfo: ConnectionInfo = {
      ...connectionDetails,
      connectionCommand: buildConnectionCommand(engine, connectionDetails, false),
      ...(engine.connectionTemplate.adminUser
        ? { adminConnectionCommand: buildConnectionCommand(engine, connectionDetails, true) }
        : {}),
    };

    this.updateStatus(
      engineId,
      'running',
      `${engine.displayName} listo en puerto ${allocatedPort}`,
    );
    this.currentConnectionInfo = connectionInfo;
    this.emit('engineStarted', connectionInfo);

    return success(connectionInfo);
  }

  /**
   * Detiene el motor activo y limpia el contenedor.
   *
   * @returns Result vacío si se detuvo correctamente
   */
  async stopEngine(): Promise<Result<void>> {
    if (!this.currentEngineId) {
      return success(undefined);
    }

    const engineId = this.currentEngineId;
    this.updateStatus(engineId, 'stopping', 'Deteniendo motor...');

    const stopResult = await this.dockerClient.stopAndRemoveContainer(
      DOCKER_IMAGE_CONFIG.containerName,
    );

    if (!stopResult.ok) {
      this.updateStatus(engineId, 'error', stopResult.error.message);
      this.emit('error', stopResult.error);
      return failure(stopResult.error);
    }

    this.updateStatus(engineId, 'stopped', 'Motor detenido');
    this.emit('engineStopped', engineId);

    this.currentEngineId = null;
    this.currentStatus = 'stopped';
    this.currentConnectionInfo = null;

    return success(undefined);
  }

  /**
   * Retorna el ID del motor actualmente corriendo, o null si no hay ninguno.
   */
  getCurrentEngine(): EngineId | null {
    return this.currentEngineId;
  }

  /**
   * Retorna el estado actual del ciclo de vida.
   */
  getStatus(): EngineStatus {
    return this.currentStatus;
  }

  /**
   * Retorna la información de conexión activa del motor en ejecución, o null si no hay ninguno.
   */
  getCurrentConnectionInfo(): ConnectionInfo | null {
    return this.currentConnectionInfo;
  }

  /**
   * Actualiza la información de conexión activa en runtime (base de datos o usuario).
   * Genera nuevamente el comando de conexión.
   */
  public updateConnectionDetails(database?: string, user?: string, password?: string): void {
    if (!this.currentConnectionInfo || !this.currentEngineId) return;
    
    const engine = getEngineById(this.currentEngineId);
    if (!engine) return;

    const updatedUser = user || this.currentConnectionInfo.user;
    const updatedDb = database || this.currentConnectionInfo.database;
    const updatedPwd = password || this.currentConnectionInfo.password;

    const details = {
      host: this.currentConnectionInfo.host,
      port: this.currentConnectionInfo.port,
      user: updatedUser,
      password: updatedPwd,
      database: updatedDb,
    };

    const connectionCommand = buildConnectionCommand(
      engine,
      details,
      false
    );

    const adminConnectionCommand = engine.connectionTemplate.adminUser
      ? buildConnectionCommand(engine, details, true)
      : undefined;

    this.currentConnectionInfo = {
      host: details.host,
      port: details.port,
      user: details.user,
      password: details.password,
      database: details.database,
      connectionCommand,
      adminConnectionCommand,
    };

    // Emitir que la conexión cambió
    this.emit('engineStarted', this.currentConnectionInfo);
  }

  /**
   * Espera a que el healthcheck del motor pase.
   * Usa polling con el timeout definido por el motor.
   */
  private async waitForHealthcheck(engine: EngineDefinition): Promise<Result<void>> {
    const startTime = Date.now();
    const pollIntervalMs = 2000;

    while (Date.now() - startTime < engine.healthcheckTimeoutMs) {
      const isRunning = await this.dockerClient.isContainerRunning(
        DOCKER_IMAGE_CONFIG.containerName,
      );

      if (!isRunning) {
        return failure({
          code: 'ENGINE_START_FAILED',
          message: `El contenedor de ${engine.displayName} se detuvo inesperadamente durante el arranque`,
        });
      }

      // Verificar si el motor responde al healthcheck nativo de Docker
      const healthStatus = await this.dockerClient.getContainerHealthStatus(
        DOCKER_IMAGE_CONFIG.containerName,
      );

      if (healthStatus === 'healthy') {
        return success(undefined);
      } else if (healthStatus === 'unhealthy') {
        return failure({
          code: 'HEALTHCHECK_FAILED',
          message: `El contenedor de ${engine.displayName} falló su healthcheck interno. Revisa los logs de Docker.`,
        });
      }

      // Si no tiene healthcheck o no se pudo leer (ej. SQLite o iniciando),
      // usamos un timeout mínimo de seguridad o un check manual.
      if (healthStatus === null) {
        if (engine.id === 'oracle') {
          // Oracle 23ai Free nativo no tiene Docker Healthcheck, usamos su script interno
          const hcResult = await this.dockerClient.execCommand(
            DOCKER_IMAGE_CONFIG.containerName,
            ['/opt/oracle/healthcheck.sh'],
            'oracle',
          );
          if (hcResult.ok) {
            return success(undefined);
          }
        } else {
          const minimumWaitMs = engine.id === 'sqlite' ? 1000 : 5000;
          if (Date.now() - startTime >= minimumWaitMs) {
            const stillRunning = await this.dockerClient.isContainerRunning(
              DOCKER_IMAGE_CONFIG.containerName,
            );
            if (stillRunning) {
              return success(undefined);
            }
          }
        }
      }

      const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);
      this.updateStatus(
        engine.id,
        'starting',
        `Esperando ${engine.displayName}... (${elapsedSeconds}s) [Status: ${healthStatus || 'N/A'}]`,
      );

      await this.sleep(pollIntervalMs);
    }

    return failure({
      code: 'HEALTHCHECK_TIMEOUT',
      message: `${engine.displayName} no respondió después de ${Math.round(engine.healthcheckTimeoutMs / 1000)} segundos`,
    });
  }

  /**
   * Construye los port bindings para Docker según el motor y el puerto objetivo.
   * SQLite no necesita port bindings (puerto 0).
   */
  private buildPortBindings(
    engine: EngineDefinition,
    targetPort: number,
  ): Record<string, Array<{ HostPort: string }>> {
    if (engine.defaultPort === 0) {
      return {};
    }

    return {
      [`${engine.defaultPort}/tcp`]: [{ HostPort: String(targetPort) }],
    };
  }

  /**
   * Construye los exposed ports para Docker según el motor.
   */
  private buildExposedPorts(engine: EngineDefinition): Record<string, Record<string, never>> {
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
  private updateStatus(engineId: EngineId, status: EngineStatus, message?: string): void {
    this.currentStatus = status;

    const state: EngineState = {
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
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Emite un log diagnóstico que puede ser capturado por el Output Channel.
   */
  private emitLog(message: string): void {
    this.emit('diagnosticLog', `[ContainerLifecycle] ${message}`);
  }

  /**
   * Retorna la plataforma detectada (para uso en diagnósticos).
   */
  getPlatformInfo(): PlatformInfo {
    return this.platform;
  }
}
