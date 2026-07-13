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
import { resolveDockerOptions } from './dockerConfigResolver';
import { Result, success, failure, PullProgress } from '../engines/engine.types';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';

const execAsync = promisify(exec);

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
    this.docker = dockerodeInstance ?? new Dockerode(resolveDockerOptions());
  }

  private async getWindowsDockerPaths(): Promise<string[]> {
    const paths: string[] = [
      'C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe',
      'C:\\Program Files\\Docker\\Docker\\frontend\\Docker Desktop.exe',
      'C:\\Program Files\\Docker\\Docker\\frontend\\DockerDesktop.exe',
      'D:\\Program Files\\Docker\\Docker\\Docker Desktop.exe',
      'D:\\Program Files\\Docker\\Docker\\frontend\\Docker Desktop.exe',
    ];

    // Cargar variables de entorno comunes
    const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
    const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
    const localAppData = process.env.LOCALAPPDATA;
    const userProfile = process.env.USERPROFILE;

    paths.push(`${programFiles}\\Docker\\Docker\\Docker Desktop.exe`);
    paths.push(`${programFiles}\\Docker\\Docker\\frontend\\Docker Desktop.exe`);
    paths.push(`${programFilesX86}\\Docker\\Docker\\Docker Desktop.exe`);
    paths.push(`${programFilesX86}\\Docker\\Docker\\frontend\\Docker Desktop.exe`);

    if (localAppData) {
      paths.push(`${localAppData}\\Docker\\Docker\\Docker Desktop.exe`);
      paths.push(`${localAppData}\\Docker\\Docker\\frontend\\Docker Desktop.exe`);
    }
    if (userProfile) {
      paths.push(`${userProfile}\\Applications\\Docker Desktop.exe`);
    }

    // Consulta de Registro 1: App Paths para Docker Desktop.exe
    try {
      const { stdout: appPath } = await execAsync(
        `powershell -Command "(Get-ItemProperty -Path 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\Docker Desktop.exe' -ErrorAction SilentlyContinue).'(default)'"`
      );
      if (appPath && appPath.trim()) {
        paths.unshift(appPath.trim());
      }
    } catch {
      // Ignorar si falla la consulta
    }

    // Consulta de Registro 2: Clave de instalación de Docker Inc
    try {
      const { stdout: installPath } = await execAsync(
        `powershell -Command "(Get-ItemProperty -Path 'HKLM:\\SOFTWARE\\Docker Inc.\\Docker' -ErrorAction SilentlyContinue).InstallPath"`
      );
      if (installPath && installPath.trim()) {
        const cleanPath = installPath.trim();
        paths.unshift(`${cleanPath}\\Docker Desktop.exe`);
        paths.unshift(`${cleanPath}\\Docker\\Docker Desktop.exe`);
        paths.unshift(`${cleanPath}\\frontend\\Docker Desktop.exe`);
      }
    } catch {
      // Ignorar si falla la consulta
    }

    return Array.from(new Set(paths.filter(Boolean)));
  }

  private getMacDockerPaths(): string[] {
    return [
      '/Applications/Docker.app',
      process.env.HOME ? `${process.env.HOME}/Applications/Docker.app` : ''
    ].filter(p => p !== '');
  }

  /**
   * Verifica si Docker está instalado en el sistema usando el CLI.
   * Si no está en el PATH, intenta buscar en las rutas por defecto según el SO.
   * @param osPlatform - Plataforma actual (darwin, win32, linux)
   * @returns true si el comando docker existe o está en ruta por defecto, false si no.
   */
  async isDockerInstalled(osPlatform?: string): Promise<boolean> {
    try {
      await execAsync('docker --version');
      return true;
    } catch {
      // Fallback a rutas comunes si docker no está en el PATH
      if (osPlatform === 'darwin') {
        return this.getMacDockerPaths().some(p => fs.existsSync(p));
      } else if (osPlatform === 'win32') {
        const winPaths = await this.getWindowsDockerPaths();
        return winPaths.some(p => fs.existsSync(p));
      }
      return false;
    }
  }

  /**
   * Intenta levantar Docker Desktop de forma automática según el SO.
   * @param os El sistema operativo detectado (darwin, win32, linux)
   * @returns true si se lanzó el comando sin error.
   */
  async startDockerDesktop(os: string): Promise<boolean> {
    try {
      if (os === 'darwin') {
        const paths = this.getMacDockerPaths();
        for (const p of paths) {
          if (fs.existsSync(p)) {
            await execAsync(`open -a "${p}"`);
            return true;
          }
        }
      } else if (os === 'win32') {
        const paths = await this.getWindowsDockerPaths();
        for (const p of paths) {
          if (fs.existsSync(p)) {
            await execAsync(`powershell -Command "Start-Process '${p}'"`);
            return true;
          }
        }
      } else if (os === 'linux') {
        // En Linux usamos systemctl --user start docker-desktop, asumiendo Docker Desktop.
        await execAsync('systemctl --user start docker-desktop');
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async checkDockerAvailability(): Promise<Result<void>> {
    try {
      // Use Promise.race to enforce a timeout on the ping request,
      // as it might hang indefinitely while Docker Desktop is starting.
      const pingPromise = this.docker.ping();
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Ping timeout')), 2000);
      });

      await Promise.race([pingPromise, timeoutPromise]);
      return success(undefined);
    } catch (error) {
      return failure({
        code: 'DOCKER_NOT_RUNNING',
        message: 'Docker no está corriendo o está tardando demasiado en responder.',
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
  async pullImage(imageName: string, onProgress?: ProgressCallback): Promise<Result<void>> {
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
    shmSize?: number;
    binds?: string[];
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

      const hostConfig: Dockerode.HostConfig = {
        PortBindings: options.portBindings,
      };
      if (options.shmSize) {
        hostConfig.ShmSize = options.shmSize;
      }
      if (options.binds && options.binds.length > 0) {
        hostConfig.Binds = options.binds;
      }

      const container = await this.docker.createContainer({
        name: options.name,
        Image: options.image,
        Env: envArray,
        ExposedPorts: options.exposedPorts,
        HostConfig: hostConfig,
      });

      await container.start();
      return success(container);
    } catch (error) {
      // Detectar error de puerto en uso
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes('port is already allocated') ||
        errorMessage.includes('address already in use')
      ) {
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

  /**
   * Obtiene el estado del healthcheck del contenedor.
   *
   * @param containerName - Nombre del contenedor
   * @returns El estado ('starting', 'healthy', 'unhealthy') o null si no tiene healthcheck o no existe.
   */
  async getContainerHealthStatus(
    containerName: string,
  ): Promise<'starting' | 'healthy' | 'unhealthy' | null> {
    try {
      const container = await this.getContainerByName(containerName);
      if (!container) return null;

      const info = await container.inspect();
      return (info.State as any).Health?.Status ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Ejecuta un comando dentro de un contenedor en ejecución.
   *
   * @param containerName - Nombre del contenedor
   * @param cmd - Comando a ejecutar (ej. ['bash', '-c', 'echo hi'])
   * @param user - Usuario opcional para ejecutar el comando
   * @returns Result con la salida estándar (stdout) y de error (stderr)
   */
  async execCommand(
    containerName: string,
    cmd: string[],
    user?: string,
  ): Promise<Result<{ stdout: string; stderr: string }>> {
    try {
      const container = await this.getContainerByName(containerName);
      if (!container) {
        return failure({ code: 'ENGINE_NOT_FOUND', message: 'Contenedor no encontrado' });
      }

      const exec = await container.exec({
        Cmd: cmd,
        AttachStdout: true,
        AttachStderr: true,
        User: user,
      });

      const stream = await exec.start({ Detach: false });

      return new Promise((resolve) => {
        let stdout = '';
        let stderr = '';

        container.modem.demuxStream(
          stream,
          {
            write: (chunk: Buffer) => {
              stdout += chunk.toString('utf8');
            },
          },
          {
            write: (chunk: Buffer) => {
              stderr += chunk.toString('utf8');
            },
          },
        );

        stream.on('end', async () => {
          try {
            const inspect = await exec.inspect();
            if (inspect.ExitCode !== 0) {
              resolve(
                failure({
                  code: 'DOCKER_EXEC_FAILED',
                  message: `Comando falló con exit code ${inspect.ExitCode}. Stderr: ${stderr}`,
                }),
              );
            } else {
              resolve(success({ stdout, stderr }));
            }
          } catch (e: any) {
            resolve(failure({ code: 'DOCKER_EXEC_FAILED', message: e.message, cause: e }));
          }
        });

        stream.on('error', (err: any) => {
          resolve(failure({ code: 'DOCKER_EXEC_FAILED', message: err.message, cause: err }));
        });
      });
    } catch (error) {
      return failure({
        code: 'DOCKER_EXEC_FAILED',
        message: `Error al ejecutar comando: ${error instanceof Error ? error.message : String(error)}`,
        cause: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }
}
