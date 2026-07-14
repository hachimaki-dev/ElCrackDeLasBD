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
import { Result, PullProgress } from '../engines/engine.types';
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
export declare class DockerClient {
    private readonly docker;
    constructor(dockerodeInstance?: Dockerode);
    private getWindowsDockerPaths;
    private getMacDockerPaths;
    /**
     * Verifica si Docker está instalado en el sistema usando el CLI.
     * Si no está en el PATH, intenta buscar en las rutas por defecto según el SO.
     * @param osPlatform - Plataforma actual (darwin, win32, linux)
     * @returns true si el comando docker existe o está en ruta por defecto, false si no.
     */
    isDockerInstalled(osPlatform?: string): Promise<boolean>;
    /**
     * Intenta levantar Docker Desktop de forma automática según el SO.
     * @param os El sistema operativo detectado (darwin, win32, linux)
     * @returns true si se lanzó el comando sin error.
     */
    startDockerDesktop(os: string): Promise<boolean>;
    checkDockerAvailability(): Promise<Result<void>>;
    /**
     * Descarga una imagen de Docker Hub con reporte de progreso.
     *
     * @param imageName - Nombre completo de la imagen (ej: "sqlenginelab/sql-engine-lab:latest")
     * @param onProgress - Callback para reportar progreso de descarga
     * @returns Result vacío si la descarga fue exitosa
     */
    pullImage(imageName: string, onProgress?: ProgressCallback): Promise<Result<void>>;
    /**
     * Verifica si una imagen existe localmente.
     *
     * @param imageName - Nombre de la imagen a verificar
     * @returns true si la imagen existe localmente
     */
    imageExists(imageName: string): Promise<boolean>;
    /**
     * Obtiene un contenedor por nombre.
     *
     * @param containerName - Nombre del contenedor
     * @returns El contenedor dockerode si existe, null si no
     */
    getContainerByName(containerName: string): Promise<Dockerode.Container | null>;
    /**
     * Crea y arranca un contenedor con la configuración especificada.
     *
     * @param options - Opciones de creación del contenedor
     * @returns Result con el contenedor creado
     */
    createAndStartContainer(options: {
        name: string;
        image: string;
        env: Record<string, string>;
        portBindings: Record<string, Array<{
            HostPort: string;
        }>>;
        exposedPorts: Record<string, Record<string, never>>;
        shmSize?: number;
        binds?: string[];
    }): Promise<Result<Dockerode.Container>>;
    /**
     * Detiene y elimina un contenedor.
     *
     * @param containerName - Nombre del contenedor a detener
     * @returns Result vacío si se detuvo correctamente
     */
    stopAndRemoveContainer(containerName: string): Promise<Result<void>>;
    /**
     * Verifica si un contenedor está corriendo.
     *
     * @param containerName - Nombre del contenedor
     * @returns true si el contenedor existe y está corriendo
     */
    isContainerRunning(containerName: string): Promise<boolean>;
    /**
     * Obtiene el estado del healthcheck del contenedor.
     *
     * @param containerName - Nombre del contenedor
     * @returns El estado ('starting', 'healthy', 'unhealthy') o null si no tiene healthcheck o no existe.
     */
    getContainerHealthStatus(containerName: string): Promise<'starting' | 'healthy' | 'unhealthy' | null>;
    /**
     * Ejecuta un comando dentro de un contenedor en ejecución.
     *
     * @param containerName - Nombre del contenedor
     * @param cmd - Comando a ejecutar (ej. ['bash', '-c', 'echo hi'])
     * @param user - Usuario opcional para ejecutar el comando
     * @returns Result con la salida estándar (stdout) y de error (stderr)
     */
    execCommand(containerName: string, cmd: string[], user?: string): Promise<Result<{
        stdout: string;
        stderr: string;
    }>>;
}
//# sourceMappingURL=dockerClient.d.ts.map