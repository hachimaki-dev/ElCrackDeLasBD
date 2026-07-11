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
const postgres_engine_1 = require("./postgres.engine");
const mysql_engine_1 = require("./mysql.engine");
const mariadb_engine_1 = require("./mariadb.engine");
const sqlite_engine_1 = require("./sqlite.engine");
const oracle_engine_1 = require("./oracle.engine");
const sqlserver_engine_1 = require("./sqlserver.engine");
/**
 * Catálogo completo de motores, en el orden en que se muestran en la UI.
 * El orden sigue la recomendación de PLAN.md §4: de más fácil a más difícil.
 */
const ALL_ENGINES = [
    sqlite_engine_1.sqliteEngine,
    postgres_engine_1.postgresEngine,
    mariadb_engine_1.mariadbEngine,
    mysql_engine_1.mysqlEngine,
    oracle_engine_1.oracleEngine,
    sqlserver_engine_1.sqlserverEngine,
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