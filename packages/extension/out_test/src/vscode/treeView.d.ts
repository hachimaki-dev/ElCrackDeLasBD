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
import { EngineDefinition, EngineStatus } from '../core/engines/engine.types';
import { ContainerLifecycle } from '../core/docker/containerLifecycle';
/**
 * Elemento individual del Tree View — representa un motor SQL.
 */
export declare class EngineTreeItem extends vscode.TreeItem {
    readonly engine: EngineDefinition;
    readonly status: EngineStatus;
    constructor(engine: EngineDefinition, status: EngineStatus);
    private static buildDescription;
    private static buildIcon;
    private static buildContextValue;
}
/**
 * Provider del Tree View de motores SQL.
 * Implementa vscode.TreeDataProvider y se actualiza via eventos de ContainerLifecycle.
 */
export declare class EngineTreeViewProvider implements vscode.TreeDataProvider<EngineTreeItem> {
    private readonly lifecycle;
    private readonly _onDidChangeTreeData;
    readonly onDidChangeTreeData: vscode.Event<EngineTreeItem | undefined>;
    /** Estado de cada motor en el árbol */
    private readonly engineStatuses;
    constructor(lifecycle: ContainerLifecycle);
    getTreeItem(element: EngineTreeItem): vscode.TreeItem;
    getChildren(): EngineTreeItem[];
    /**
     * Fuerza un refresh completo del Tree View.
     * Usado por el comando "Refrescar".
     */
    refresh(): void;
    private resetAllToStopped;
    dispose(): void;
}
//# sourceMappingURL=treeView.d.ts.map