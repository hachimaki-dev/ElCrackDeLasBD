/**
 * SQL Engine Laboratory — VS Code Commands
 *
 * Registro y manejo de todos los comandos de la extensión.
 * Cada acción de usuario es un comando independiente:
 * - sqlEngineLab.startEngine
 * - sqlEngineLab.stopEngine
 * - sqlEngineLab.showConnectionInfo
 * - sqlEngineLab.copyConnectionCommand
 * - sqlEngineLab.refreshEngines
 *
 * Maneja errores de forma explícita y visible (no silenciosa).
 */
import * as vscode from 'vscode';
import { ContainerLifecycle } from '../core/docker/containerLifecycle';
import { EngineTreeViewProvider } from './treeView';
/**
 * Registra todos los comandos de la extensión en el contexto de VS Code.
 * Retorna un array de Disposables para cleanup al desactivar la extensión.
 *
 * @param context - Contexto de la extensión
 * @param lifecycle - Instancia del gestor de ciclo de vida de contenedores
 * @param treeProvider - Provider del Tree View para refrescar tras acciones
 * @returns Array de Disposables para registrar en context.subscriptions
 */
export declare function registerCommands(context: vscode.ExtensionContext, lifecycle: ContainerLifecycle, treeProvider: EngineTreeViewProvider): vscode.Disposable[];
//# sourceMappingURL=commands.d.ts.map