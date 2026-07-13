/**
 * SQL Engine Laboratory — Engine Tree View
 *
 * Tree View Provider que muestra la lista de motores SQL en el panel lateral.
 * Se suscribe a eventos de ContainerLifecycle para reflejar el estado en tiempo real.
 *
 * Cada elemento del árbol muestra:
 * - Nombre del motor con ícono de estado (detenido/iniciando/corriendo/error)
 * - Descripción corta
 * - Botones contextuales (Iniciar / Detener / Ver Conexión)
 */

import * as vscode from 'vscode';
import {
  EngineDefinition,
  EngineId,
  EngineState,
  EngineStatus,
} from '../core/engines/engine.types';
import { getAllEngines } from '../core/engines/registry';
import { ContainerLifecycle } from '../core/docker/containerLifecycle';

/**
 * Elemento individual del Tree View — representa un motor SQL.
 */
export class EngineTreeItem extends vscode.TreeItem {
  constructor(
    readonly engine: EngineDefinition,
    readonly status: EngineStatus,
  ) {
    super(engine.displayName, vscode.TreeItemCollapsibleState.None);

    this.description = EngineTreeItem.buildDescription(status);
    this.tooltip = engine.description;
    this.iconPath = EngineTreeItem.buildIcon(status);
    this.contextValue = EngineTreeItem.buildContextValue(status);

    // Al hacer clic en un motor corriendo, mostrar info de conexión
    if (status === 'running') {
      this.command = {
        command: 'sqlEngineLab.showConnectionInfo',
        title: 'Ver Info de Conexión',
        arguments: [engine.id],
      };
    }
  }

  private static buildDescription(status: EngineStatus): string {
    const descriptions: Record<EngineStatus, string> = {
      stopped: 'Detenido',
      pulling: 'Descargando imagen...',
      starting: 'Iniciando...',
      running: '● Corriendo',
      stopping: 'Deteniendo...',
      error: '⚠ Error',
    };
    return descriptions[status];
  }

  private static buildIcon(status: EngineStatus): vscode.ThemeIcon {
    const icons: Record<EngineStatus, { id: string; color?: vscode.ThemeColor }> = {
      stopped: { id: 'circle-outline' },
      pulling: { id: 'loading~spin', color: new vscode.ThemeColor('charts.yellow') },
      starting: { id: 'loading~spin', color: new vscode.ThemeColor('charts.yellow') },
      running: { id: 'circle-filled', color: new vscode.ThemeColor('charts.green') },
      stopping: { id: 'loading~spin', color: new vscode.ThemeColor('charts.orange') },
      error: { id: 'error', color: new vscode.ThemeColor('charts.red') },
    };
    const icon = icons[status];
    return new vscode.ThemeIcon(icon.id, icon.color);
  }

  private static buildContextValue(status: EngineStatus): string {
    if (status === 'running') return 'engine-running';
    if (status === 'stopped' || status === 'error') return 'engine-stopped';
    return 'engine-busy';
  }
}

/**
 * Provider del Tree View de motores SQL.
 * Implementa vscode.TreeDataProvider y se actualiza via eventos de ContainerLifecycle.
 */
export class EngineTreeViewProvider implements vscode.TreeDataProvider<EngineTreeItem> {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<EngineTreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  /** Estado de cada motor en el árbol */
  private readonly engineStatuses = new Map<EngineId, EngineStatus>();
  
  private isReady = false;

  constructor(private readonly lifecycle: ContainerLifecycle) {
    // Inicializar todos los motores como detenidos
    for (const engine of getAllEngines()) {
      this.engineStatuses.set(engine.id, 'stopped');
    }

    // Suscribirse a eventos del ciclo de vida para actualizar la UI
    this.lifecycle.on('statusChanged', (state: EngineState) => {
      this.engineStatuses.set(state.engineId, state.status);
      // Si el motor se detiene, resetear todos a stopped para consistencia visual
      if (state.status === 'stopped') {
        this.resetAllToStopped();
      }
      this._onDidChangeTreeData.fire(undefined);
    });

    this.lifecycle.on('engineStopped', (_engineId: EngineId) => {
      this.resetAllToStopped();
      this._onDidChangeTreeData.fire(undefined);
    });
  }

  getTreeItem(element: EngineTreeItem): vscode.TreeItem {
    return element;
  }

  setIsReady(isReady: boolean): void {
    this.isReady = isReady;
    this.refresh();
  }

  getChildren(): EngineTreeItem[] {
    if (!this.isReady) {
      return [];
    }
    return getAllEngines().map(
      (engine) => new EngineTreeItem(engine, this.engineStatuses.get(engine.id) ?? 'stopped'),
    );
  }

  /**
   * Fuerza un refresh completo del Tree View.
   * Usado por el comando "Refrescar".
   */
  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  private resetAllToStopped(): void {
    for (const engineId of this.engineStatuses.keys()) {
      this.engineStatuses.set(engineId, 'stopped');
    }
  }

  dispose(): void {
    this._onDidChangeTreeData.dispose();
  }
}
