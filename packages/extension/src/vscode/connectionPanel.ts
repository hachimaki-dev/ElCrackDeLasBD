/**
 * SQL Engine Laboratory — Connection Panel Webview
 *
 * Webview panel rediseñado con tabs para Estándar/Admin, soporte
 * para estado de carga (loading) y comandos de prueba.
 */

import * as vscode from 'vscode';
import { ConnectionInfo, EngineDefinition, EngineStatus } from '../core/engines/engine.types';

export class ConnectionPanel {
  private static currentPanel: ConnectionPanel | undefined;

  private readonly panel: vscode.WebviewPanel;
  private currentEngine: EngineDefinition;
  private currentInfo?: ConnectionInfo;
  private currentStatus?: EngineStatus;
  private completedModules: string[] = [];

  private constructor(
    panel: vscode.WebviewPanel,
    private readonly extensionUri: vscode.Uri,
    engine: EngineDefinition,
    connectionInfo?: ConnectionInfo,
    status?: EngineStatus,
    completedModules?: string[]
  ) {
    this.panel = panel;
    this.currentEngine = engine;
    this.currentInfo = connectionInfo;
    this.currentStatus = status;
    if (completedModules) this.completedModules = completedModules;

    this.update();

    this.panel.webview.onDidReceiveMessage(async (message: { command: string; text?: string; moduleId?: string }) => {
      if (message.command === 'copy') {
        if (message.text) {
          await vscode.env.clipboard.writeText(message.text);
          void vscode.window.showInformationMessage('✓ Copiado al portapapeles');
        }
      } else if (message.command === 'startTutorial' && message.moduleId) {
        await vscode.commands.executeCommand('sqlEngineLab.openTutorialSheet', message.moduleId);
      } else if (message.command === 'completeTutorial' && message.moduleId) {
        await vscode.commands.executeCommand('sqlEngineLab.completeTutorial', message.moduleId);
      }
    });

    this.panel.onDidDispose(() => {
      ConnectionPanel.currentPanel = undefined;
    });
  }

  static createOrReveal(
    extensionUri: vscode.Uri,
    engine: EngineDefinition,
    connectionInfo: ConnectionInfo,
    status?: EngineStatus,
    completedModules?: string[]
  ): void {
    ConnectionPanel.show(extensionUri, engine, connectionInfo, status || 'running', undefined, completedModules);
  }

  static createOrRevealLoading(
    extensionUri: vscode.Uri,
    engine: EngineDefinition,
    status: EngineStatus,
    message?: string,
    completedModules?: string[]
  ): void {
    ConnectionPanel.show(extensionUri, engine, undefined, status, message, completedModules);
  }

  private static show(
    extensionUri: vscode.Uri,
    engine: EngineDefinition,
    connectionInfo?: ConnectionInfo,
    status?: EngineStatus,
    _message?: string,
    completedModules?: string[]
  ): void {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : vscode.ViewColumn.One;

    if (ConnectionPanel.currentPanel) {
      ConnectionPanel.currentPanel.panel.reveal(column);
      ConnectionPanel.currentPanel.currentEngine = engine;
      ConnectionPanel.currentPanel.currentInfo = connectionInfo;
      ConnectionPanel.currentPanel.currentStatus = status;
      if (completedModules) ConnectionPanel.currentPanel.completedModules = completedModules;
      ConnectionPanel.currentPanel.update();
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'sqlEngineLabConnection',
      `SQL Lab — ${engine.displayName}`,
      column ?? vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    ConnectionPanel.currentPanel = new ConnectionPanel(panel, extensionUri, engine, connectionInfo, status, completedModules);
  }

  static dispose(): void {
    if (ConnectionPanel.currentPanel) {
      ConnectionPanel.currentPanel.panel.dispose();
      ConnectionPanel.currentPanel = undefined;
    }
  }

  private update(): void {
    this.panel.title = `SQL Lab — ${this.currentEngine.displayName}`;
    this.panel.webview.html = this.buildHtml();
    
    // Enviar estado al frontend React
    this.panel.webview.postMessage({
      command: 'updateState',
      engine: {
        id: this.currentEngine.id,
        displayName: this.currentEngine.displayName,
        status: this.currentStatus,
        connectionCommand: this.currentInfo?.connectionCommand,
        port: this.currentInfo?.port,
        completedModules: this.completedModules
      }
    });
  }

  private buildHtml(): string {
    const webview = this.panel.webview;
    
    // Rutas a los assets compilados de Vite
    const stylesUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'out', 'webview-ui', 'assets', 'index.css'));
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'out', 'webview-ui', 'assets', 'index.js'));

    // Pantalla de carga tradicional (para fallback o antes de cargar React completo si se desea, 
    // pero Vite es rápido. Vamos a cargar React siempre para mantener la estética).
    return /* html */ `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} https: data:;">
  <title>SQL Engine Lab</title>
  <link rel="stylesheet" href="${stylesUri}">
  <script>
    // Initialize VS Code API global before React loads
    const vscode = acquireVsCodeApi();
    window.acquireVsCodeApi = () => vscode;
  </script>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="${scriptUri}"></script>
</body>
</html>`;
  }
}
