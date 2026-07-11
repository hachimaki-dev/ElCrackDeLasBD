import * as vscode from 'vscode';
import { EngineId } from '../engines/engine.types';

/**
 * Llave base para guardar en el globalState.
 */
const PROGRESS_STORAGE_KEY = 'sqlEngineLab.tutorialProgress';

export class ProgressManager {
  constructor(private globalState: vscode.Memento) {}

  /**
   * Obtiene la lista de módulos completados (ej. ["1-1", "1-2"]) para un motor específico.
   */
  public getCompletedModules(engineId: EngineId): string[] {
    const allProgress = this.getAllProgress();
    return allProgress[engineId] || [];
  }

  /**
   * Marca un módulo específico como completado para un motor.
   */
  public async markModuleAsCompleted(engineId: EngineId, moduleId: string): Promise<void> {
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
  public async clearProgress(): Promise<void> {
    await this.globalState.update(PROGRESS_STORAGE_KEY, undefined);
  }

  /**
   * Obtiene el diccionario completo de progresos de todos los motores.
   */
  private getAllProgress(): Record<string, string[]> {
    return this.globalState.get<Record<string, string[]>>(PROGRESS_STORAGE_KEY) || {};
  }
}
