"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DockerClient = void 0;
const dockerode_1 = __importDefault(require("dockerode"));
const dockerConfigResolver_1 = require("./dockerConfigResolver");
const engine_types_1 = require("../engines/engine.types");
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
class DockerClient {
    docker;
    constructor(dockerodeInstance) {
        this.docker = dockerodeInstance ?? new dockerode_1.default((0, dockerConfigResolver_1.resolveDockerOptions)());
    }
    /**
     * Verifica que Docker esté corriendo y accesible.
     *
     * @returns Result vacío si Docker está disponible, o error DOCKER_NOT_RUNNING
     */
    async checkDockerAvailability() {
        try {
            await this.docker.ping();
            return (0, engine_types_1.success)(undefined);
        }
        catch (error) {
            return (0, engine_types_1.failure)({
                code: 'DOCKER_NOT_RUNNING',
                message: 'Docker no está corriendo. Por favor, inicia Docker Desktop antes de continuar.',
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
    async pullImage(imageName, onProgress) {
        try {
            const stream = await this.docker.pull(imageName);
            return new Promise((resolve) => {
                this.docker.modem.followProgress(stream, 
                // onFinished
                (error) => {
                    if (error) {
                        resolve((0, engine_types_1.failure)({
                            code: 'DOCKER_PULL_FAILED',
                            message: `Error al descargar la imagen ${imageName}: ${error.message}`,
                            cause: error,
                        }));
                    }
                    else {
                        resolve((0, engine_types_1.success)(undefined));
                    }
                }, 
                // onProgress
                (event) => {
                    if (onProgress) {
                        const percentage = event.progressDetail?.current && event.progressDetail?.total
                            ? Math.round((event.progressDetail.current / event.progressDetail.total) * 100)
                            : undefined;
                        onProgress({
                            status: event.status ?? 'Descargando...',
                            percentage,
                        });
                    }
                });
            });
        }
        catch (error) {
            return (0, engine_types_1.failure)({
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
    async imageExists(imageName) {
        try {
            const image = this.docker.getImage(imageName);
            await image.inspect();
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Obtiene un contenedor por nombre.
     *
     * @param containerName - Nombre del contenedor
     * @returns El contenedor dockerode si existe, null si no
     */
    async getContainerByName(containerName) {
        try {
            const containers = await this.docker.listContainers({
                all: true,
                filters: { name: [containerName] },
            });
            if (containers.length === 0) {
                return null;
            }
            return this.docker.getContainer(containers[0].Id);
        }
        catch {
            return null;
        }
    }
    /**
     * Crea y arranca un contenedor con la configuración especificada.
     *
     * @param options - Opciones de creación del contenedor
     * @returns Result con el contenedor creado
     */
    async createAndStartContainer(options) {
        try {
            // Remover contenedor anterior si existe
            const existing = await this.getContainerByName(options.name);
            if (existing) {
                try {
                    await existing.stop();
                }
                catch {
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
            return (0, engine_types_1.success)(container);
        }
        catch (error) {
            // Detectar error de puerto en uso
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('port is already allocated') ||
                errorMessage.includes('address already in use')) {
                return (0, engine_types_1.failure)({
                    code: 'PORT_IN_USE',
                    message: `El puerto ya está en uso. Cierra la aplicación que lo esté ocupando o cambia el puerto.`,
                    cause: error instanceof Error ? error : new Error(errorMessage),
                });
            }
            return (0, engine_types_1.failure)({
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
    async stopAndRemoveContainer(containerName) {
        try {
            const container = await this.getContainerByName(containerName);
            if (!container) {
                return (0, engine_types_1.success)(undefined);
            }
            try {
                // eslint-disable-next-line id-length
                await container.stop({ t: 10 });
            }
            catch {
                // Puede que ya esté detenido
            }
            await container.remove();
            return (0, engine_types_1.success)(undefined);
        }
        catch (error) {
            return (0, engine_types_1.failure)({
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
    async isContainerRunning(containerName) {
        try {
            const container = await this.getContainerByName(containerName);
            if (!container) {
                return false;
            }
            const info = await container.inspect();
            return info.State.Running;
        }
        catch {
            return false;
        }
    }
}
exports.DockerClient = DockerClient;
//# sourceMappingURL=dockerClient.js.map