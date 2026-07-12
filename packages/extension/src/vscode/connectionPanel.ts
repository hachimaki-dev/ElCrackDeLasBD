/**
 * SQL Engine Laboratory — Connection Panel Webview
 *
 * Webview panel rediseñado con tabs para Estándar/Admin, soporte
 * para estado de carga (loading) y comandos de prueba.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ConnectionInfo, EngineDefinition, EngineStatus } from '../core/engines/engine.types';

export class ConnectionPanel {
  private static currentPanel: ConnectionPanel | undefined;

  private readonly panel: vscode.WebviewPanel;
  private currentEngine: EngineDefinition;
  private currentInfo?: ConnectionInfo;
  private currentStatus?: EngineStatus;
  private engineProgress?: any; // any to avoid direct import coupling if possible, or import EngineProgress

  private constructor(
    panel: vscode.WebviewPanel,
    private readonly extensionUri: vscode.Uri,
    engine: EngineDefinition,
    connectionInfo?: ConnectionInfo,
    status?: EngineStatus,
    engineProgress?: any,
  ) {
    this.panel = panel;
    this.currentEngine = engine;
    this.currentInfo = connectionInfo;
    this.currentStatus = status;
    if (engineProgress) this.engineProgress = engineProgress;

    this.update();

    this.panel.webview.onDidReceiveMessage(
      async (message: { command: string; text?: string; moduleId?: string }) => {
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
      },
    );

    this.panel.onDidDispose(() => {
      ConnectionPanel.currentPanel = undefined;
    });
  }

  static createOrReveal(
    extensionUri: vscode.Uri,
    engine: EngineDefinition,
    connectionInfo: ConnectionInfo,
    status?: EngineStatus,
    engineProgress?: any,
  ): void {
    ConnectionPanel.show(
      extensionUri,
      engine,
      connectionInfo,
      status || 'running',
      undefined,
      engineProgress,
    );
  }

  static createOrRevealLoading(
    extensionUri: vscode.Uri,
    engine: EngineDefinition,
    status: EngineStatus,
    message?: string,
    engineProgress?: any,
  ): void {
    ConnectionPanel.show(extensionUri, engine, undefined, status, message, engineProgress);
  }

  private static show(
    extensionUri: vscode.Uri,
    engine: EngineDefinition,
    connectionInfo?: ConnectionInfo,
    status?: EngineStatus,
    _message?: string,
    engineProgress?: any,
  ): void {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : vscode.ViewColumn.One;

    if (ConnectionPanel.currentPanel) {
      ConnectionPanel.currentPanel.panel.reveal(column);
      ConnectionPanel.currentPanel.currentEngine = engine;
      ConnectionPanel.currentPanel.currentInfo = connectionInfo;
      ConnectionPanel.currentPanel.currentStatus = status;
      if (engineProgress) ConnectionPanel.currentPanel.engineProgress = engineProgress;
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
      },
    );

    ConnectionPanel.currentPanel = new ConnectionPanel(
      panel,
      extensionUri,
      engine,
      connectionInfo,
      status,
      engineProgress,
    );
  }

  static dispose(): void {
    if (ConnectionPanel.currentPanel) {
      ConnectionPanel.currentPanel.panel.dispose();
      ConnectionPanel.currentPanel = undefined;
    }
  }

  private loadTutorials(): Record<
    string,
    Record<
      string,
      { engine: string; level: string; title: string; description: string; content: string }
    >
  > | null {
    let tutorialsData: Record<
      string,
      Record<
        string,
        { engine: string; level: string; title: string; description: string; content: string }
      >
    > | null = null;

    // 1. Intentar en el workspace (útil para desarrollo)
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      const wsPath = path.join(workspaceFolders[0].uri.fsPath, 'lab-tutorials.json');
      if (fs.existsSync(wsPath)) {
        try {
          tutorialsData = JSON.parse(fs.readFileSync(wsPath, 'utf8')) as Record<
            string,
            Record<
              string,
              { engine: string; level: string; title: string; description: string; content: string }
            >
          >;
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('Error reading workspace lab-tutorials', err);
        }
      }
    }

    // 2. Intentar usando this.extensionUri
    if (!tutorialsData) {
      try {
        let tutorialsPath = path.join(this.extensionUri.fsPath, '..', '..', 'lab-tutorials.json');
        if (!fs.existsSync(tutorialsPath)) {
          tutorialsPath = path.join(this.extensionUri.fsPath, 'lab-tutorials.json');
        }
        if (fs.existsSync(tutorialsPath)) {
          tutorialsData = JSON.parse(fs.readFileSync(tutorialsPath, 'utf8')) as Record<
            string,
            Record<
              string,
              { engine: string; level: string; title: string; description: string; content: string }
            >
          >;
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error reading extension path lab-tutorials', err);
      }
    }

    return tutorialsData;
  }

  private update(): void {
    this.panel.title = `SQL Lab — ${this.currentEngine.displayName}`;
    this.panel.webview.html = this.buildHtml();

    // Leer los tutoriales del motor activo
    const tutorialsData = this.loadTutorials();
    const engineTutorials = tutorialsData ? tutorialsData[this.currentEngine.id] : undefined;

    // Enviar estado al frontend React
    void this.panel.webview.postMessage({
      command: 'updateState',
      engine: {
        id: this.currentEngine.id,
        displayName: this.currentEngine.displayName,
        status: this.currentStatus,
        connectionCommand: this.currentInfo?.connectionCommand,
        port: this.currentInfo?.port,
        engineProgress: this.engineProgress,
      },
      tutorials: engineTutorials,
    });
  }

  private buildHtml(): string {
    const webview = this.panel.webview;

    // Rutas a los assets compilados de Vite
    const stylesUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'out', 'webview-ui', 'assets', 'index.css'),
    );
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'out', 'webview-ui', 'assets', 'index.js'),
    );

    // Pantalla de carga tradicional (para fallback o antes de cargar React completo si se desea,
    // pero Vite es rápido. Vamos a cargar React siempre para mantener la estética).
    return /* html */ `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} https: data:;">
  <title>SQL Engine Lab</title>
  <link rel="stylesheet" href="${stylesUri.toString()}">
  <script>
    // Initialize VS Code API global before React loads
    const vscode = acquireVsCodeApi();
    window.acquireVsCodeApi = () => vscode;
  </script>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="${scriptUri.toString()}"></script>
</body>
</html>`;
  }
}
