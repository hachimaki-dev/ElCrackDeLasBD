/**
 * SQL Engine Laboratory — Docker Config Resolver
 *
 * Resuelve la configuración de conexión de Docker (puerto, host, socket) de forma
 * dinámica basándose en la plataforma y el contexto activo de Docker.
 */
import Dockerode from 'dockerode';
/**
 * Representa el entorno necesario para resolver la configuración de Docker.
 * Permite inyectar mocks durante los tests unitarios.
 */
export interface ResolverEnv {
    env: Record<string, string | undefined>;
    platform: string;
    homedir: string;
    fsExistsSync: (filePath: string) => boolean;
    fsReadFileSync: (filePath: string) => string;
    fsReaddirSync: (filePath: string) => string[];
    /** Callback opcional para logging diagnóstico. Si se provee, el resolver reporta cada paso. */
    onLog?: (message: string) => void;
}
/**
 * Resuelve las opciones de inicialización de Dockerode basándose en las
 * variables de entorno, el contexto activo de Docker Desktop, y rutas por defecto.
 *
 * @param overrides - Overrides para mocks durante testing
 * @returns Las opciones de configuración recomendadas para Dockerode
 */
export declare function resolveDockerOptions(overrides?: Partial<ResolverEnv>): Dockerode.DockerOptions;
//# sourceMappingURL=dockerConfigResolver.d.ts.map