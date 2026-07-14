/**
 * SQL Engine Laboratory — Core Type Definitions
 *
 * Este archivo define las interfaces centrales del sistema.
 * Todas las piezas del sistema (engines, docker, connection) dependen de estos tipos.
 *
 * Decisiones de diseño:
 * - Result<T, E> en vez de excepciones para errores esperados (ENGINEERING_STANDARDS.md §3)
 * - EngineDefinition como interfaz Adapter que cada motor implementa (Open/Closed Principle)
 * - Tipos estrictos para IDs de motor (EngineId) en vez de strings genéricos
 */

// ==========================================================================
// Engine Types
// ==========================================================================

/**
 * Identificadores válidos de motores SQL soportados.
 * Agregar un motor nuevo = agregar un literal a este union type.
 */
export type EngineId = 'postgres' | 'mysql' | 'mariadb' | 'sqlite' | 'oracle' | 'sqlserver';

/**
 * Template para construir el comando de conexión al motor desde la terminal del usuario.
 * Los placeholders {host}, {port}, {user}, {password}, {database} se resuelven en runtime.
 */
export interface ConnectionTemplate {
  /** Nombre del binario cliente (ej: "psql", "mysql", "sqlplus") */
  readonly command: string;
  /** Template de argumentos con placeholders (ej: "-h {host} -p {port} -U {user} -d {database}") */
  readonly argsTemplate: string;
  /** Usuario por defecto del laboratorio */
  readonly defaultUser: string;
  /** Password por defecto del laboratorio */
  readonly defaultPassword: string;
  /** Base de datos por defecto del laboratorio */
  readonly defaultDatabase: string;
  /** Usuario administrador por defecto del motor (ej: sa, root, postgres) */
  readonly adminUser?: string;
  /** Password del usuario administrador (si aplica) */
  readonly adminPassword?: string;
  /** Si es true, el motor no tiene password de admin por defecto (ej. MySQL local) o requiere input manual. Sirve para mostrar un mensaje claro en la UI. */
  readonly adminPasswordRequiresInput?: boolean;
  /** Mensaje personalizado para mostrar al usuario sobre la password de admin (ej. 'Sin contraseña por defecto') */
  readonly adminPasswordMessage?: string;
  /** Comandos de prueba de ejemplo (ej: 'SELECT 1;', 'CREATE TABLE...') */
  readonly testCommands?: string[];
}

/**
 * Definición completa de un motor SQL.
 * Cada motor implementa esta interfaz como un Adapter (ENGINEERING_STANDARDS.md §3).
 * Agregar un motor nuevo = crear un archivo que exporte un EngineDefinition,
 * sin tocar código existente.
 */
export interface EngineDefinition {
  /** Identificador único del motor (usado como valor de la variable ENGINE en Docker) */
  readonly id: EngineId;
  /** Nombre para mostrar en la UI */
  readonly displayName: string;
  /** Tamaño de memoria compartida (shm-size) en bytes necesario para el contenedor en Docker */
  readonly dockerShmSize?: number;
  /** Descripción corta del motor */
  readonly description: string;
  /** Puerto por defecto del motor (0 para SQLite que no usa puerto) */
  readonly defaultPort: number;
  /** Valor de la variable de entorno ENGINE para Docker */
  readonly dockerEnvValue: string;
  /** Template del comando de conexión desde la terminal */
  readonly connectionTemplate: ConnectionTemplate;
  /** Timeout en milisegundos para el healthcheck (Oracle necesita más que PostgreSQL) */
  readonly healthcheckTimeoutMs: number;
  /** Indicador de velocidad de inicio esperado, útil para dar feedback en la UI */
  readonly startupSpeed: 'fast' | 'slow';
  /** Icono para la UI (codicon de VS Code) */
  readonly iconId: string;
}

// ==========================================================================
// Engine Status
// ==========================================================================

/**
 * Estados posibles de un motor SQL.
 * El ciclo de vida es: stopped → pulling → starting → running → stopping → stopped
 * El estado 'error' puede ocurrir desde cualquier transición.
 */
export type EngineStatus = 'stopped' | 'pulling' | 'starting' | 'running' | 'stopping' | 'error';

/**
 * Información del estado actual de un motor con metadata adicional.
 */
export interface EngineState {
  /** ID del motor */
  readonly engineId: EngineId;
  /** Estado actual */
  readonly status: EngineStatus;
  /** Mensaje descriptivo del estado (ej: "Descargando imagen...", "Puerto 5432 listo") */
  readonly message?: string;
  /** Timestamp de cuándo entró en este estado */
  readonly since: Date;
}

// ==========================================================================
// Connection Info
// ==========================================================================

/**
 * Datos de conexión completos para un motor corriendo.
 * Se genera después de que el motor arranca exitosamente.
 */
export interface ConnectionInfo {
  /** Host para conectarse (típicamente "localhost") */
  readonly host: string;
  /** Puerto mapeado en el host */
  readonly port: number;
  /** Usuario de la BD */
  readonly user: string;
  /** Password de la BD */
  readonly password: string;
  /** Nombre de la BD */
  readonly database: string;
  /** Comando completo listo para copiar y pegar en la terminal */
  readonly connectionCommand: string;
  /** Comando de conexión como administrador (si aplica) */
  readonly adminConnectionCommand?: string;
}

/**
 * Configuración de lanzamiento de un motor.
 * Permite al usuario personalizar las credenciales con las que se crea
 * el contenedor Docker. Si no se especifica, se usan los defaults.
 */
export interface LaunchConfig {
  /** Usuario personalizado (default: labuser) */
  readonly user?: string;
  /** Password personalizada (default: labpassword) */
  readonly password?: string;
  /** Nombre de la base de datos (default: labdb) */
  readonly database?: string;
}

// ==========================================================================
// Result Type (para errores esperados, no excepciones)
// ==========================================================================

/**
 * Resultado exitoso.
 */
export interface Success<T> {
  readonly ok: true;
  readonly value: T;
}

/**
 * Resultado con error.
 */
export interface Failure<E> {
  readonly ok: false;
  readonly error: E;
}

/**
 * Tipo Result para manejar errores esperados sin excepciones.
 * Las funciones que pueden fallar de forma predecible devuelven Result<T, E>
 * en vez de lanzar excepciones (ENGINEERING_STANDARDS.md §3).
 *
 * @example
 * ```typescript
 * function startEngine(id: EngineId): Promise<Result<ConnectionInfo, EngineError>> {
 *   // ...
 * }
 *
 * const result = await startEngine('postgres');
 * if (result.ok) {
 *   showConnectionInfo(result.value);
 * } else {
 *   showError(result.error.message);
 * }
 * ```
 */
export type Result<T, E = EngineError> = Success<T> | Failure<E>;

/**
 * Crea un Result exitoso.
 */
export function success<T>(value: T): Success<T> {
  return { ok: true, value };
}

/**
 * Crea un Result con error.
 */
export function failure<E>(error: E): Failure<E> {
  return { ok: false, error };
}

// ==========================================================================
// Error Types
// ==========================================================================

/**
 * Códigos de error conocidos del sistema.
 * Cada código mapea a un tipo de error esperado y manejable.
 */
export type EngineErrorCode =
  | 'DOCKER_NOT_RUNNING'
  | 'DOCKER_PULL_FAILED'
  | 'ENGINE_START_FAILED'
  | 'ENGINE_STOP_FAILED'
  | 'ENGINE_ALREADY_RUNNING'
  | 'PORT_IN_USE'
  | 'HEALTHCHECK_FAILED'
  | 'HEALTHCHECK_TIMEOUT'
  | 'UNKNOWN_ENGINE'
  | 'WEAK_PASSWORD'
  | 'CONTAINER_ERROR'
  | 'QUERY_EXECUTION_FAILED'
  | 'DOCKER_EXEC_FAILED'
  | 'ENGINE_NOT_FOUND';

/**
 * Error tipado del sistema de motores.
 * Contiene un código para que el llamador pueda tomar decisiones
 * programáticas sobre cómo manejar el error.
 */
export interface EngineError {
  /** Código del error para manejo programático */
  readonly code: EngineErrorCode;
  /** Mensaje descriptivo para mostrar al usuario */
  readonly message: string;
  /** Error original si este error envuelve otro */
  readonly cause?: Error;
}

// ==========================================================================
// Event Types
// ==========================================================================

/**
 * Eventos emitidos por ContainerLifecycle que la UI puede observar.
 */
export interface LifecycleEvents {
  statusChanged: (state: EngineState) => void;
  engineStarted: (connectionInfo: ConnectionInfo) => void;
  engineStopped: (engineId: EngineId) => void;
  error: (error: EngineError) => void;
  pullProgress: (progress: PullProgress) => void;
}

/**
 * Progreso de descarga de la imagen Docker.
 */
export interface PullProgress {
  /** Porcentaje de completitud (0-100), o undefined si no se puede determinar */
  readonly percentage?: number;
  /** Mensaje de estado del pull */
  readonly status: string;
}

// ==========================================================================
// Docker Config
// ==========================================================================

import * as fs from 'fs';
import * as path from 'path';

/**
 * Contrato maestro (Bóveda de la Verdad).
 * Busca el archivo 'lab-contract.json' subiendo por los directorios de forma resiliente.
 */
function findContractPath(): string {
  // Primero intentar subiendo desde process.cwd()
  let currentDir = process.cwd();
  while (true) {
    const checkPath = path.join(currentDir, 'lab-contract.json');
    if (fs.existsSync(checkPath)) {
      return checkPath;
    }
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      break;
    }
    currentDir = parentDir;
  }

  // Si no se encuentra, intentar subiendo desde __dirname
  currentDir = __dirname;
  while (true) {
    const checkPath = path.join(currentDir, 'lab-contract.json');
    if (fs.existsSync(checkPath)) {
      return checkPath;
    }
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      break;
    }
    currentDir = parentDir;
  }
  // Fallback si no lo encuentra (lanzará el error esperado al leerlo)
  return path.resolve(__dirname, '..', '..', '..', '..', '..', 'lab-contract.json');
}

const contractPath = findContractPath();
let contractData: any;
try {
  contractData = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
} catch (e) {
  // En caso extremo, lanzar error más claro
  throw new Error(`No se pudo leer lab-contract.json en la ruta: ${contractPath}`);
}

export const LAB_CONTRACT = contractData;

/**
 * Configuración de la imagen Docker del laboratorio.
 */
export const DOCKER_IMAGE_CONFIG = {
  imageName: contractData.docker.imageName,
  imageTag: contractData.docker.imageTag,
  containerName: contractData.docker.containerName,
  defaultEnv: contractData.defaultEnv,
} as const;

// ==========================================================================
// Configuration Types
// ==========================================================================

/**
 * Configuración de credenciales definida por el usuario.
 */
export interface EngineConfig {
  readonly labUser: string;
  readonly labPassword: string;
  readonly labDatabase: string;
}

/**
 * Interfaz para proveer configuración al Core sin acoplarlo a VS Code.
 */
export interface ConfigurationProvider {
  getConfig(): EngineConfig;
}
