/**
 * SQL Engine Laboratory — Extension Entry Point
 *
 * Punto de entrada de la extensión. Solo hace wiring (cablea) las piezas:
 * - Crea instancias de DockerClient, ContainerLifecycle
 * - Crea el OutputChannel para diagnóstico
 * - Registra el Tree View
 * - Registra los comandos
 * - Conecta eventos de diagnóstico al OutputChannel
 * - Configura los disposables para cleanup
 *
 * No contiene lógica propia — eso está en core/ y vscode/.
 */

import * as vscode from 'vscode';
import { DockerClient } from './core/docker/dockerClient';
import { ContainerLifecycle } from './core/docker/containerLifecycle';
import { EngineTreeViewProvider } from './vscode/treeView';
import { registerCommands } from './vscode/commands';
import { VsCodeConfigurationProvider } from './vscode/configProvider';
import { detectPlatform } from './core/docker/platformInfo';
import { CredentialVault } from './core/credentials/vault';
import { QueryRunner } from './core/runner/queryRunner';
import { SheetManager } from './vscode/sheet/sheetManager';
import { registerSheetCommands } from './vscode/sheet/sheetCommands';
import { ProgressManager } from './core/progress/progressManager';

/**
 * Activación de la extensión.
 * VS Code llama a esta función cuando se activa la extensión
 * (definido en package.json via activationEvents).
 *
 * @param context - Contexto de la extensión provisto por VS Code
 */
export function activate(context: vscode.ExtensionContext): void {
  // ---- Crear OutputChannel para diagnóstico ----
  const outputChannel = vscode.window.createOutputChannel('SQL Engine Lab');
  const platform = detectPlatform();
  outputChannel.appendLine(`SQL Engine Laboratory activada`);
  outputChannel.appendLine(`Plataforma: ${platform.displayString}`);
  outputChannel.appendLine(`Timestamp: ${new Date().toISOString()}`);
  outputChannel.appendLine('');

  // ---- Crear instancias de las piezas core ----
  const dockerClient = new DockerClient();
  const configProvider = new VsCodeConfigurationProvider();
  const lifecycle = new ContainerLifecycle(dockerClient, configProvider);

  // ---- Instancias de Hojas SQL ----
  const vault = new CredentialVault(context.secrets, context.globalState);
  const sheetManager = new SheetManager();
  const queryRunner = new QueryRunner();
  const progressManager = new ProgressManager(context.globalState);

  // ---- Conectar eventos de diagnóstico al OutputChannel ----
  lifecycle.on('diagnosticLog', (message: string) => {
    outputChannel.appendLine(message);
  });

  lifecycle.on('emulationWarning', (data: { engineId: string; message: string }) => {
    outputChannel.appendLine(`⚠️ [EMULACIÓN] ${data.message}`);
    void vscode.window.showWarningMessage(`SQL Engine Lab: ${data.message}`);
  });

  // ---- Registrar Tree View ----
  const treeProvider = new EngineTreeViewProvider(lifecycle);
  const treeView = vscode.window.createTreeView('sqlEngineLab.engineList', {
    treeDataProvider: treeProvider,
    showCollapseAll: false,
  });

  // ---- Registrar comandos ----
  const commandDisposables = registerCommands(
    context,
    lifecycle,
    treeProvider,
    dockerClient,
    outputChannel,
    progressManager,
  );

  const sheetDisposables = registerSheetCommands(
    context,
    sheetManager,
    vault,
    queryRunner,
    lifecycle,
  );

  // ---- Agregar todos los disposables al contexto ----
  // VS Code los limpiará automáticamente al desactivar la extensión
  context.subscriptions.push(
    treeView,
    treeProvider,
    outputChannel,
    ...commandDisposables,
    ...sheetDisposables,
    // Disposable para lifecycle (detener contenedor activo al desactivar)
    new vscode.Disposable(() => {
      void lifecycle.stopEngine();
    }),
  );
}

/**
 * Desactivación de la extensión.
 * VS Code llama a esta función cuando se desactiva la extensión.
 * Los disposables en context.subscriptions se limpian automáticamente.
 */
export function deactivate(): void {
  // Los disposables registrados en activate() se limpian automáticamente.
  // No necesitamos hacer nada adicional aquí.
}
