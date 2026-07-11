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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DOCKER_IMAGE_CONFIG = void 0;
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
/**
 * Configuración de la imagen Docker del laboratorio.
 */
exports.DOCKER_IMAGE_CONFIG = {
    /** Nombre de la imagen en Docker Hub */
    imageName: 'sql-engine-lab',
    /** Tag de la imagen */
    imageTag: 'dev',
    /** Nombre del contenedor que crea la extensión */
    containerName: 'sql-engine-lab',
    /** Variables de entorno por defecto */
    defaultEnv: {
        LAB_USER: 'labuser',
        LAB_PASSWORD: 'labpassword',
        LAB_DATABASE: 'labdb',
    },
};
//# sourceMappingURL=engine.types.js.map