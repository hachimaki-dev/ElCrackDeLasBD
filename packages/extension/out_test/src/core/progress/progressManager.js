"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProgressManager = void 0;
const gamificationEngine_1 = require("./gamificationEngine");
/**
 * Llave base para guardar en el globalState.
 */
const PROGRESS_STORAGE_KEY = 'sqlEngineLab.tutorialProgressV2';
class ProgressManager {
    globalState;
    constructor(globalState) {
        this.globalState = globalState;
    }
    /**
     * Obtiene la estructura completa de progreso para un motor específico.
     */
    getEngineProgress(engineId) {
        const allProgress = this.getAllProgress();
        if (!allProgress[engineId]) {
            // Estado inicial si no existe
            return {
                completedModules: [],
                xp: { ddl: 0, dml: 0, optimization: 0, architecture: 0 },
                level: 1,
                badges: [],
                streak: 0
            };
        }
        return allProgress[engineId];
    }
    /**
     * Obtiene la lista de módulos completados (ej. ["1-1", "1-2"]) para compatibilidad hacia atrás parcial.
     */
    getCompletedModules(engineId) {
        return this.getEngineProgress(engineId).completedModules;
    }
    /**
     * Marca un módulo específico como completado para un motor y aplica la gamificación.
     */
    async markModuleAsCompleted(engineId, moduleId) {
        const allProgress = this.getAllProgress();
        let currentProgress = this.getEngineProgress(engineId);
        // Solo procesar si no está ya marcado
        if (!currentProgress.completedModules.includes(moduleId)) {
            currentProgress.completedModules.push(moduleId);
            // Aplicar recompensas de gamificación
            const reward = gamificationEngine_1.GamificationEngine.getRewardForModule(moduleId);
            currentProgress = gamificationEngine_1.GamificationEngine.applyReward(currentProgress, reward);
            allProgress[engineId] = currentProgress;
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