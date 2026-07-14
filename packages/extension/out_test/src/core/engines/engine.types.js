"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DOCKER_IMAGE_CONFIG = exports.LAB_CONTRACT = void 0;
exports.success = success;
exports.failure = failure;
/**
 * Crea un Result exitoso.
 */
function success(value) {
    return { ok: true, value };
}
/**
 * Crea un Result con error.
 */
function failure(error) {
    return { ok: false, error };
}
// ==========================================================================
// Docker Config
// ==========================================================================
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Contrato maestro (Bóveda de la Verdad).
 * Busca el archivo 'lab-contract.json' subiendo por los directorios de forma resiliente.
 */
function findContractPath() {
    let currentDir = __dirname;
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
let contractData;
try {
    contractData = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
}
catch (e) {
    // En caso extremo, lanzar error más claro
    throw new Error(`No se pudo leer lab-contract.json en la ruta: ${contractPath}`);
}
exports.LAB_CONTRACT = contractData;
/**
 * Configuración de la imagen Docker del laboratorio.
 */
exports.DOCKER_IMAGE_CONFIG = {
    imageName: contractData.docker.imageName,
    imageTag: contractData.docker.imageTag,
    containerName: contractData.docker.containerName,
    defaultEnv: contractData.defaultEnv,
};
//# sourceMappingURL=engine.types.js.map