/**
 * SQL Engine Laboratory — Docker Client Facade
 *
 * Facade sobre la librería dockerode. Expone una API simple para interactuar
 * con Docker sin que el resto del sistema conozca los detalles de dockerode.
 *
 * Responsabilidades:
 * - Verificar que Docker esté corriendo
 * - Hacer pull de imágenes con reporte de progreso
 * - Consultar el estado de contenedores
 *
 * No incluye lógica de motores — eso está en ContainerLifecycle.
 */

import Dockerode from 'dockerode';
import {
  Result,
  success,
  failure,
  PullProgress,
} from '../engines/engine.types';

/**
 * Callback para reportar progreso de descarga de imagen.
 */
export type ProgressCallback = (progress: PullProgress) => void;

/**
 * Facade sobre dockerode que abstrae la API de Docker.
 * Se inyecta como dependencia en ContainerLifecycle.
 *
 * @example
 * ```typescript
 * const client = new DockerClient();
 * const available = await client.checkDockerAvailability();
 * if (!available.ok) {
 *   showError('Docker no está corriendo');
 * }
 * ```
 */
export class DockerClient {
  private readonly docker: Dockerode;

  constructor(dockerodeInstance?: Dockerode) {
    this.docker = dockerodeInstance ?? new Dockerode();
  }

  /**
   * Verifica que Docker esté corriendo y accesible.
   *
   * @returns Result vacío si Docker está disponible, o error DOCKER_NOT_RUNNING
   */
  async checkDockerAvailability(): Promise<Result<void>> {
    try {
      await this.docker.ping();
      return success(undefined);
    } catch (error) {
      return failure({
        code: 'DOCKER_NOT_RUNNING',
        message:
          'Docker no está corriendo. Por favor, inicia Docker Desktop antes de continuar.',
        cause: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }

  /**
   * Descarga una imagen de Docker Hub con reporte de progreso.
   *
   * @param imageName - Nombre completo de la imagen (ej: "sqlenginelab/sql-engine-lab:latest")
   * @param onProgress - Callback para reportar progreso de descarga
   * @returns Result vacío si la descarga fue exitosa
   */
  async pullImage(
    imageName: string,
    onProgress?: ProgressCallback,
  ): Promise<Result<void>> {
    try {
      const stream = await this.docker.pull(imageName);

      return new Promise<Result<void>>((resolve) => {
        this.docker.modem.followProgress(
          stream,
          // onFinished
          (error: Error | null) => {
            if (error) {
              resolve(
                failure({
                  code: 'DOCKER_PULL_FAILED',
                  message: `Error al descargar la imagen ${imageName}: ${error.message}`,
                  cause: error,
                }),
              );
            } else {
              resolve(success(undefined));
            }
          },
          // onProgress
          (event: { status?: string; progressDetail?: { current?: number; total?: number } }) => {
            if (onProgress) {
              const percentage =
                event.progressDetail?.current && event.progressDetail?.total
                  ? Math.round((event.progressDetail.current / event.progressDetail.total) * 100)
                  : undefined;

              onProgress({
                status: event.status ?? 'Descargando...',
                percentage,
              });
            }
          },
        );
      });
    } catch (error) {
      return failure({
        code: 'DOCKER_PULL_FAILED',
        message: `No se pudo iniciar la descarga de ${imageName}`,
        cause: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }

  /**
   * Verifica si una imagen existe localmente.
   *
   * @param imageName - Nombre de la imagen a verificar
   * @returns true si la imagen existe localmente
   */
  async imageExists(imageName: string): Promise<boolean> {
    try {
      const image = this.docker.getImage(imageName);
      await image.inspect();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Obtiene un contenedor por nombre.
   *
   * @param containerName - Nombre del contenedor
   * @returns El contenedor dockerode si existe, null si no
   */
  async getContainerByName(containerName: string): Promise<Dockerode.Container | null> {
    try {
      const containers = await this.docker.listContainers({
        all: true,
        filters: { name: [containerName] },
      });

      if (containers.length === 0) {
        return null;
      }

      return this.docker.getContainer(containers[0].Id);
    } catch {
      return null;
    }
  }

  /**
   * Crea y arranca un contenedor con la configuración especificada.
   *
   * @param options - Opciones de creación del contenedor
   * @returns Result con el contenedor creado
   */
  async createAndStartContainer(options: {
    name: string;
    image: string;
    env: Record<string, string>;
    portBindings: Record<string, Array<{ HostPort: string }>>;
    exposedPorts: Record<string, Record<string, never>>;
  }): Promise<Result<Dockerode.Container>> {
    try {
      // Remover contenedor anterior si existe
      const existing = await this.getContainerByName(options.name);
      if (existing) {
        try {
          await existing.stop();
        } catch {
          // Puede que ya esté detenido
        }
        await existing.remove();
      }

      const envArray = Object.entries(options.env).map(([key, value]) => `${key}=${value}`);

      const container = await this.docker.createContainer({
        name: options.name,
        Image: options.image,
        Env: envArray,
        ExposedPorts: options.exposedPorts,
        HostConfig: {
          PortBindings: options.portBindings,
        },
      });

      await container.start();
      return success(container);
    } catch (error) {
      // Detectar error de puerto en uso
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('port is already allocated') || errorMessage.includes('address already in use')) {
        return failure({
          code: 'PORT_IN_USE',
          message: `El puerto ya está en uso. Cierra la aplicación que lo esté ocupando o cambia el puerto.`,
          cause: error instanceof Error ? error : new Error(errorMessage),
        });
      }

      return failure({
        code: 'ENGINE_START_FAILED',
        message: `Error al crear/arrancar el contenedor: ${errorMessage}`,
        cause: error instanceof Error ? error : new Error(errorMessage),
      });
    }
  }

  /**
   * Detiene y elimina un contenedor.
   *
   * @param containerName - Nombre del contenedor a detener
   * @returns Result vacío si se detuvo correctamente
   */
  async stopAndRemoveContainer(containerName: string): Promise<Result<void>> {
    try {
      const container = await this.getContainerByName(containerName);
      if (!container) {
        return success(undefined);
      }

      try {
        // eslint-disable-next-line id-length
        await container.stop({ t: 10 });
      } catch {
        // Puede que ya esté detenido
      }

      await container.remove();
      return success(undefined);
    } catch (error) {
      return failure({
        code: 'ENGINE_STOP_FAILED',
        message: `Error al detener el contenedor: ${error instanceof Error ? error.message : String(error)}`,
        cause: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }

  /**
   * Verifica si un contenedor está corriendo.
   *
   * @param containerName - Nombre del contenedor
   * @returns true si el contenedor existe y está corriendo
   */
  async isContainerRunning(containerName: string): Promise<boolean> {
    try {
      const container = await this.getContainerByName(containerName);
      if (!container) {
        return false;
      }

      const info = await container.inspect();
      return info.State.Running;
    } catch {
      return false;
    }
  }
}
