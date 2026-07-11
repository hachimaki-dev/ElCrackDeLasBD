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
    /**
     * Verifica que Docker esté corriendo y accesible.
     *
     * @returns Result vacío si Docker está disponible, o error DOCKER_NOT_RUNNING
     */
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
}
//# sourceMappingURL=dockerClient.d.ts.map