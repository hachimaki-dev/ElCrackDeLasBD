/**
 * SQL Engine Laboratory — SQL Cheat Sheets
 *
 * Cheat sheets de SQL específicos para cada motor.
 * Cada cheat sheet contiene los fundamentos de SQL adaptados
 * a la sintaxis particular del motor, incluyendo:
 * - DDL (CREATE, ALTER, DROP)
 * - DML (INSERT, SELECT, UPDATE, DELETE)
 * - Funciones específicas del motor
 * - Tips y particularidades
 */
import { EngineId } from '../engines/engine.types';
/**
 * Estructura de una sección del cheat sheet.
 */
export interface CheatSheetSection {
    /** Título de la sección */
    readonly title: string;
    /** Fragmentos de código SQL con descripción */
    readonly items: ReadonlyArray<{
        /** Descripción breve del comando */
        readonly label: string;
        /** Código SQL de ejemplo */
        readonly sql: string;
    }>;
}
/**
 * Cheat sheet completo de un motor.
 */
export interface CheatSheet {
    /** Nombre del motor */
    readonly engineName: string;
    /** Tips o notas específicas del motor */
    readonly tips: readonly string[];
    /** Secciones del cheat sheet */
    readonly sections: readonly CheatSheetSection[];
}
/**
 * Retorna el cheat sheet correspondiente a un motor.
 *
 * @param engineId - ID del motor
 * @returns CheatSheet con fundamentos SQL adaptados al motor
 */
export declare function getCheatSheet(engineId: EngineId): CheatSheet;
//# sourceMappingURL=cheatSheets.d.ts.map