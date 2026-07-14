import * as vscode from 'vscode';
import { EngineId } from '../engines/engine.types';
import { EngineProgress } from './gamificationEngine';
export declare class ProgressManager {
    private globalState;
    constructor(globalState: vscode.Memento);
    /**
     * Obtiene la estructura completa de progreso para un motor específico.
     */
    getEngineProgress(engineId: EngineId): EngineProgress;
    /**
     * Obtiene la lista de módulos completados (ej. ["1-1", "1-2"]) para compatibilidad hacia atrás parcial.
     */
    getCompletedModules(engineId: EngineId): string[];
    /**
     * Marca un módulo específico como completado para un motor y aplica la gamificación.
     */
    markModuleAsCompleted(engineId: EngineId, moduleId: string): Promise<void>;
    /**
     * Limpia el progreso de todos los motores (útil para debug o "resetear progreso").
     */
    clearProgress(): Promise<void>;
    /**
     * Obtiene el diccionario completo de progresos de todos los motores.
     */
    private getAllProgress;
}
//# sourceMappingURL=progressManager.d.ts.map