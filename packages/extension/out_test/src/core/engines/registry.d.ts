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
import { EngineDefinition, EngineId } from './engine.types';
/**
 * Retorna la lista completa de motores soportados, en orden de display.
 *
 * @returns Array inmutable de EngineDefinition
 */
export declare function getAllEngines(): readonly EngineDefinition[];
/**
 * Busca un motor por su ID.
 *
 * @param engineId - Identificador del motor (ej: 'postgres', 'mysql')
 * @returns La definición del motor si existe, undefined si no
 */
export declare function getEngineById(engineId: EngineId): EngineDefinition | undefined;
/**
 * Retorna la cantidad de motores registrados.
 */
export declare function getEngineCount(): number;
/**
 * Verifica si un string es un EngineId válido.
 *
 * @param value - String a verificar
 * @returns true si el valor es un EngineId registrado
 */
export declare function isValidEngineId(value: string): value is EngineId;
//# sourceMappingURL=registry.d.ts.map