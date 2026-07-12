import * as vscode from 'vscode';
import { EngineId } from '../engines/engine.types';
import { EngineProgress, GamificationEngine } from './gamificationEngine';

/**
 * Llave base para guardar en el globalState.
 */
const PROGRESS_STORAGE_KEY = 'sqlEngineLab.tutorialProgressV2';

export class ProgressManager {
  constructor(private globalState: vscode.Memento) {}

  /**
   * Obtiene la estructura completa de progreso para un motor específico.
   */
  public getEngineProgress(engineId: EngineId): EngineProgress {
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
  public getCompletedModules(engineId: EngineId): string[] {
    return this.getEngineProgress(engineId).completedModules;
  }

  /**
   * Marca un módulo específico como completado para un motor y aplica la gamificación.
   */
  public async markModuleAsCompleted(engineId: EngineId, moduleId: string): Promise<void> {
    const allProgress = this.getAllProgress();
    let currentProgress = this.getEngineProgress(engineId);

    // Solo procesar si no está ya marcado
    if (!currentProgress.completedModules.includes(moduleId)) {
      currentProgress.completedModules.push(moduleId);
      
      // Aplicar recompensas de gamificación
      const reward = GamificationEngine.getRewardForModule(moduleId);
      currentProgress = GamificationEngine.applyReward(currentProgress, reward);

      allProgress[engineId] = currentProgress;
      await this.globalState.update(PROGRESS_STORAGE_KEY, allProgress);
    }
  }

  /**
   * Limpia el progreso de todos los motores (útil para debug o "resetear progreso").
   */
  public async clearProgress(): Promise<void> {
    await this.globalState.update(PROGRESS_STORAGE_KEY, undefined);
  }

  /**
   * Obtiene el diccionario completo de progresos de todos los motores.
   */
  private getAllProgress(): Record<string, EngineProgress> {
    return this.globalState.get<Record<string, EngineProgress>>(PROGRESS_STORAGE_KEY) || {};
  }
}
