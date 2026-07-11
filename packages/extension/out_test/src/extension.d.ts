/**
 * SQL Engine Laboratory — Extension Entry Point
 *
 * Punto de entrada de la extensión. Solo hace wiring (cablea) las piezas:
 * - Crea instancias de DockerClient, ContainerLifecycle
 * - Registra el Tree View
 * - Registra los comandos
 * - Configura los disposables para cleanup
 *
 * No contiene lógica propia — eso está en core/ y vscode/.
 */
import * as vscode from 'vscode';
/**
 * Activación de la extensión.
 * VS Code llama a esta función cuando se activa la extensión
 * (definido en package.json via activationEvents).
 *
 * @param context - Contexto de la extensión provisto por VS Code
 */
export declare function activate(context: vscode.ExtensionContext): void;
/**
 * Desactivación de la extensión.
 * VS Code llama a esta función cuando se desactiva la extensión.
 * Los disposables en context.subscriptions se limpian automáticamente.
 */
export declare function deactivate(): void;
//# sourceMappingURL=extension.d.ts.map