"use strict";
/**
 * SQL Engine Laboratory — Engine Registry
 *
 * Centraliza el catálogo de motores disponibles.
 * El resto del código pide motores al registry, nunca importa un motor directamente.
 *
 * Para agregar un motor nuevo:
 * 1. Crear el archivo `<motor>.engine.ts` con su EngineDefinition
 * 2. Importarlo aquí y agregarlo al array ALL_ENGINES
 * 3. No tocar nada más — el registry se encarga de exponerlo al sistema
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllEngines = getAllEngines;
exports.getEngineById = getEngineById;
exports.getEngineCount = getEngineCount;
exports.isValidEngineId = isValidEngineId;
const engine_types_1 = require("./engine.types");
/**
 * Catálogo completo de motores, cargados desde la Bóveda de la Verdad (lab-contract.json).
 * El orden de despliegue en la UI es dictado por este array.
 */
const ALL_ENGINES = [
    engine_types_1.LAB_CONTRACT.engines.sqlite,
    engine_types_1.LAB_CONTRACT.engines.postgres,
    engine_types_1.LAB_CONTRACT.engines.mariadb,
    engine_types_1.LAB_CONTRACT.engines.mysql,
    engine_types_1.LAB_CONTRACT.engines.oracle,
    engine_types_1.LAB_CONTRACT.engines.sqlserver,
];
/** Mapa indexado por EngineId para búsquedas O(1) */
const ENGINE_MAP = new Map(ALL_ENGINES.map((engine) => [engine.id, engine]));
/**
 * Retorna la lista completa de motores soportados, en orden de display.
 *
 * @returns Array inmutable de EngineDefinition
 */
function getAllEngines() {
    return ALL_ENGINES;
}
/**
 * Busca un motor por su ID.
 *
 * @param engineId - Identificador del motor (ej: 'postgres', 'mysql')
 * @returns La definición del motor si existe, undefined si no
 */
function getEngineById(engineId) {
    return ENGINE_MAP.get(engineId);
}
/**
 * Retorna la cantidad de motores registrados.
 */
function getEngineCount() {
    return ALL_ENGINES.length;
}
/**
 * Verifica si un string es un EngineId válido.
 *
 * @param value - String a verificar
 * @returns true si el valor es un EngineId registrado
 */
function isValidEngineId(value) {
    return ENGINE_MAP.has(value);
}
//# sourceMappingURL=registry.js.map