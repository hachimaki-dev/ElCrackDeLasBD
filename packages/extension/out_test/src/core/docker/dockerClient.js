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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DockerClient = void 0;
const dockerode_1 = __importDefault(require("dockerode"));
const dockerConfigResolver_1 = require("./dockerConfigResolver");
const engine_types_1 = require("../engines/engine.types");
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs = __importStar(require("fs"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
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
    async getWindowsDockerPaths() {
        const paths = [
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
            const { stdout: appPath } = await execAsync(`powershell -Command "(Get-ItemProperty -Path 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\Docker Desktop.exe' -ErrorAction SilentlyContinue).'(default)'"`);
            if (appPath && appPath.trim()) {
                paths.unshift(appPath.trim());
            }
        }
        catch {
            // Ignorar si falla la consulta
        }
        // Consulta de Registro 2: Clave de instalación de Docker Inc
        try {
            const { stdout: installPath } = await execAsync(`powershell -Command "(Get-ItemProperty -Path 'HKLM:\\SOFTWARE\\Docker Inc.\\Docker' -ErrorAction SilentlyContinue).InstallPath"`);
            if (installPath && installPath.trim()) {
                const cleanPath = installPath.trim();
                paths.unshift(`${cleanPath}\\Docker Desktop.exe`);
                paths.unshift(`${cleanPath}\\Docker\\Docker Desktop.exe`);
                paths.unshift(`${cleanPath}\\frontend\\Docker Desktop.exe`);
            }
        }
        catch {
            // Ignorar si falla la consulta
        }
        // Búsqueda dinámica con where.exe docker para inferir la ruta de instalación
        try {
            const { stdout: whereDocker } = await execAsync(`where.exe docker`);
            if (whereDocker && whereDocker.trim()) {
                const firstPath = whereDocker.split('\n')[0].trim();
                if (firstPath.toLowerCase().includes('docker')) {
                    // Si where.exe devuelve C:\Program Files\Docker\Docker\resources\bin\docker.exe
                    // Inferimos el directorio base subiendo un par de niveles
                    const pathSegments = firstPath.split('\\');
                    let baseDir = '';
                    const resourcesIndex = pathSegments.findIndex(s => s.toLowerCase() === 'resources');
                    if (resourcesIndex !== -1) {
                        baseDir = pathSegments.slice(0, resourcesIndex).join('\\');
                    }
                    else {
                        // Si no tiene resources, subimos un nivel (asumiendo que está en una carpeta bin o similar)
                        baseDir = pathSegments.slice(0, -1).join('\\');
                    }
                    if (baseDir) {
                        paths.unshift(`${baseDir}\\Docker Desktop.exe`);
                        paths.unshift(`${baseDir}\\frontend\\Docker Desktop.exe`);
                    }
                }
            }
        }
        catch {
            // Ignorar si where.exe falla
        }
        return Array.from(new Set(paths.filter(Boolean)));
    }
    getMacDockerPaths() {
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
    async isDockerInstalled(osPlatform) {
        try {
            await execAsync('docker --version');
            return true;
        }
        catch {
            // Fallback a rutas comunes si docker no está en el PATH
            if (osPlatform === 'darwin') {
                return this.getMacDockerPaths().some(p => fs.existsSync(p));
            }
            else if (osPlatform === 'win32') {
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
    async startDockerDesktop(os) {
        try {
            if (os === 'darwin') {
                const paths = this.getMacDockerPaths();
                for (const p of paths) {
                    if (fs.existsSync(p)) {
                        await execAsync(`open -a "${p}"`);
                        return true;
                    }
                }
            }
            else if (os === 'win32') {
                const paths = await this.getWindowsDockerPaths();
                for (const p of paths) {
                    if (fs.existsSync(p)) {
                        await execAsync(`powershell -Command "Start-Process '${p}'"`);
                        return true;
                    }
                }
            }
            else if (os === 'linux') {
                // En Linux, primero intentamos Docker Desktop
                try {
                    await execAsync('systemctl --user start docker-desktop');
                    return true;
                }
                catch {
                    // Si falla, asumimos que es Docker Engine nativo.
                    // Usamos pkexec para pedir permisos de sudo con interfaz gráfica nativa.
                    try {
                        await execAsync('pkexec systemctl start docker');
                        return true;
                    }
                    catch {
                        // Fallback para distribuciones sin systemd
                        try {
                            await execAsync('pkexec service docker start');
                            return true;
                        }
                        catch {
                            return false;
                        }
                    }
                }
            }
            return false;
        }
        catch {
            return false;
        }
    }
    async checkDockerAvailability() {
        try {
            // Use Promise.race to enforce a timeout on the ping request,
            // as it might hang indefinitely while Docker Desktop is starting.
            const pingPromise = this.docker.ping();
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Ping timeout')), 2000);
            });
            await Promise.race([pingPromise, timeoutPromise]);
            return (0, engine_types_1.success)(undefined);
        }
        catch (error) {
            return (0, engine_types_1.failure)({
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
            const hostConfig = {
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
    /**
     * Obtiene el estado del healthcheck del contenedor.
     *
     * @param containerName - Nombre del contenedor
     * @returns El estado ('starting', 'healthy', 'unhealthy') o null si no tiene healthcheck o no existe.
     */
    async getContainerHealthStatus(containerName) {
        try {
            const container = await this.getContainerByName(containerName);
            if (!container)
                return null;
            const info = await container.inspect();
            return info.State.Health?.Status ?? null;
        }
        catch {
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
    async execCommand(containerName, cmd, user) {
        try {
            const container = await this.getContainerByName(containerName);
            if (!container) {
                return (0, engine_types_1.failure)({ code: 'ENGINE_NOT_FOUND', message: 'Contenedor no encontrado' });
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
                container.modem.demuxStream(stream, {
                    write: (chunk) => {
                        stdout += chunk.toString('utf8');
                    },
                }, {
                    write: (chunk) => {
                        stderr += chunk.toString('utf8');
                    },
                });
                stream.on('end', async () => {
                    try {
                        const inspect = await exec.inspect();
                        if (inspect.ExitCode !== 0) {
                            resolve((0, engine_types_1.failure)({
                                code: 'DOCKER_EXEC_FAILED',
                                message: `Comando falló con exit code ${inspect.ExitCode}. Stderr: ${stderr}`,
                            }));
                        }
                        else {
                            resolve((0, engine_types_1.success)({ stdout, stderr }));
                        }
                    }
                    catch (e) {
                        resolve((0, engine_types_1.failure)({ code: 'DOCKER_EXEC_FAILED', message: e.message, cause: e }));
                    }
                });
                stream.on('error', (err) => {
                    resolve((0, engine_types_1.failure)({ code: 'DOCKER_EXEC_FAILED', message: err.message, cause: err }));
                });
            });
        }
        catch (error) {
            return (0, engine_types_1.failure)({
                code: 'DOCKER_EXEC_FAILED',
                message: `Error al ejecutar comando: ${error instanceof Error ? error.message : String(error)}`,
                cause: error instanceof Error ? error : new Error(String(error)),
            });
        }
    }
}
exports.DockerClient = DockerClient;
//# sourceMappingURL=dockerClient.js.map