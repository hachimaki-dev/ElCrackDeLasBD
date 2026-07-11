/**
 * SQL Engine Laboratory — Docker Config Resolver
 *
 * Resuelve la configuración de conexión de Docker (puerto, host, socket) de forma
 * dinámica basándose en la plataforma y el contexto activo de Docker.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import Dockerode from 'dockerode';

/**
 * Interfaz para representar la estructura del archivo ~/.docker/config.json.
 */
interface DockerConfig {
  currentContext?: string;
}

/**
 * Interfaz para representar la estructura del archivo meta.json del contexto.
 */
interface DockerContextMeta {
  Name?: string;
  Endpoints?: {
    docker?: {
      Host?: string;
    };
  };
}

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
}

/**
 * Entorno por defecto que utiliza las APIs reales de Node.js.
 */
const defaultEnv: ResolverEnv = {
  env: process.env,
  platform: process.platform,
  homedir: os.homedir(),
  fsExistsSync: fs.existsSync,
  fsReadFileSync: (filePath) => fs.readFileSync(filePath, 'utf8'),
  fsReaddirSync: fs.readdirSync,
};

/**
 * Resuelve las opciones de inicialización de Dockerode basándose en las
 * variables de entorno, el contexto activo de Docker Desktop, y rutas por defecto.
 *
 * @param overrides - Overrides para mocks durante testing
 * @returns Las opciones de configuración recomendadas para Dockerode
 */
export function resolveDockerOptions(overrides?: Partial<ResolverEnv>): Dockerode.DockerOptions {
  const resolvedEnv: ResolverEnv = { ...defaultEnv, ...overrides };
  const { env, platform, homedir, fsExistsSync, fsReadFileSync, fsReaddirSync } = resolvedEnv;

  // 1. Respetar DOCKER_HOST si está definido en el entorno
  if (env.DOCKER_HOST) {
    return parseDockerHost(env.DOCKER_HOST);
  }

  // 2. Intentar leer la configuración de contextos de Docker
  const configPath = path.join(homedir, '.docker', 'config.json');
  if (fsExistsSync(configPath)) {
    try {
      const config = JSON.parse(fsReadFileSync(configPath)) as DockerConfig;
      const currentContext = config.currentContext;

      if (currentContext && currentContext !== 'default') {
        const metaDir = path.join(homedir, '.docker', 'contexts', 'meta');
        if (fsExistsSync(metaDir)) {
          const subdirs = fsReaddirSync(metaDir);
          for (const subdir of subdirs) {
            const metaJsonPath = path.join(metaDir, subdir, 'meta.json');
            if (fsExistsSync(metaJsonPath)) {
              try {
                const meta = JSON.parse(fsReadFileSync(metaJsonPath)) as DockerContextMeta;
                if (meta.Name === currentContext && meta.Endpoints?.docker?.Host) {
                  return parseDockerHost(meta.Endpoints.docker.Host);
                }
              } catch {
                // Ignorar error al parsear un meta.json específico y continuar
              }
            }
          }
        }
      }
    } catch {
      // Ignorar error de parsing de config.json
    }
  }

  // 3. Fallback a rutas por defecto por plataforma
  if (platform === 'win32') {
    return { socketPath: '//./pipe/docker_engine' };
  }

  // Rutas candidatas para Linux / macOS
  const candidates = [
    '/var/run/docker.sock',
    '/run/docker.sock',
    path.join(homedir, '.docker', 'run', 'docker.sock'),
    path.join(homedir, '.docker', 'desktop', 'docker.sock'),
  ];

  for (const candidate of candidates) {
    if (fsExistsSync(candidate)) {
      return { socketPath: candidate };
    }
  }

  // Por defecto, retornar el socket estándar de Unix
  return { socketPath: '/var/run/docker.sock' };
}

/**
 * Parsea un host string de Docker y retorna las opciones correspondientes para Dockerode.
 *
 * @param host - El string del host (ej: "unix:///var/run/docker.sock" o "tcp://localhost:2375")
 * @returns Las opciones de configuración de Dockerode
 */
function parseDockerHost(host: string): Dockerode.DockerOptions {
  if (host.startsWith('unix://')) {
    return { socketPath: host.substring(7) };
  }
  if (host.startsWith('npipe://')) {
    return { socketPath: host.substring(8) };
  }
  if (host.startsWith('tcp://')) {
    try {
      // Reemplazar tcp:// con http:// para que el constructor URL de Node lo maneje correctamente
      const url = new URL(host.replace(/^tcp:/, 'http:'));
      return {
        host: url.hostname,
        port: url.port ? parseInt(url.port, 10) : 2375,
      };
    } catch {
      return {};
    }
  }
  // Si no tiene prefijo conocido pero parece una ruta de Unix, asumirla como socketPath
  if (host.startsWith('/') || host.startsWith('./') || host.includes('\\')) {
    return { socketPath: host };
  }
  return {};
}
