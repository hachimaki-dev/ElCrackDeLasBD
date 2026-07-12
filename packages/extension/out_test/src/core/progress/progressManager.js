"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProgressManager = void 0;
/**
 * Llave base para guardar en el globalState.
 */
const PROGRESS_STORAGE_KEY = 'sqlEngineLab.tutorialProgress';
class ProgressManager {
    globalState;
    constructor(globalState) {
        this.globalState = globalState;
    }
    /**
     * Obtiene la lista de módulos completados (ej. ["1-1", "1-2"]) para un motor específico.
     */
    getCompletedModules(engineId) {
        const allProgress = this.getAllProgress();
        return allProgress[engineId] || [];
    }
    /**
     * Marca un módulo específico como completado para un motor.
     */
    async markModuleAsCompleted(engineId, moduleId) {
        const allProgress = this.getAllProgress();
        if (!allProgress[engineId]) {
            allProgress[engineId] = [];
        }
        // Solo agregar si no está ya marcado
        if (!allProgress[engineId].includes(moduleId)) {
            allProgress[engineId].push(moduleId);
            await this.globalState.update(PROGRESS_STORAGE_KEY, allProgress);
        }
    }
    /**
     * Limpia el progreso de todos los motores (útil para debug o "resetear progreso").
     */
    async clearProgress() {
        await this.globalState.update(PROGRESS_STORAGE_KEY, undefined);
    }
    /**
     * Obtiene el diccionario completo de progresos de todos los motores.
     */
    getAllProgress() {
        return this.globalState.get(PROGRESS_STORAGE_KEY) || {};
    }
}
exports.ProgressManager = ProgressManager;
//# sourceMappingURL=progressManager.js.map