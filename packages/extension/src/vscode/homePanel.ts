import * as vscode from 'vscode';
import { DockerClient } from '../core/docker/dockerClient';
import { getEngineById } from '../core/engines/registry';
import { PullProgress } from '../core/engines/engine.types';
import { detectPlatform } from '../core/docker/platformInfo';

export type HomeState = 'checking_docker' | 'docker_not_installed' | 'docker_not_running' | 'starting_docker' | 'pulling_images' | 'ready';

export class HomePanel {
  private static currentPanel: HomePanel | undefined;

  private readonly panel: vscode.WebviewPanel;
  private readonly dockerClient: DockerClient;
  private readonly extensionUri: vscode.Uri;
  private currentState: HomeState = 'checking_docker';
  private pullProgress?: PullProgress;
  private isPolling = false;

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    dockerClient: DockerClient
  ) {
    this.panel = panel;
    this.extensionUri = extensionUri;
    this.dockerClient = dockerClient;

    this.panel.webview.html = this.buildHtml();
    
    this.panel.onDidDispose(() => {
      HomePanel.currentPanel = undefined;
      this.isPolling = false;
    });

    this.panel.webview.onDidReceiveMessage(async (message: any) => {
      if (message.command === 'executeCommand') {
        if (message.args) {
          await vscode.commands.executeCommand(message.action, ...message.args);
        } else {
          await vscode.commands.executeCommand(message.action);
        }
      } else if (message.command === 'openExternal') {
        await vscode.env.openExternal(vscode.Uri.parse(message.url));
      } else if (message.command === 'retrySetup') {
        this.runSetupFlow();
      } else if (message.command === 'startDocker') {
        this.handleStartDocker();
      } else if (message.command === 'getInitialState') {
        this.updateWebviewState();
      }
    });

    this.runSetupFlow();
  }

  static createOrShow(extensionUri: vscode.Uri, dockerClient: DockerClient): void {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : vscode.ViewColumn.One;

    if (HomePanel.currentPanel) {
      HomePanel.currentPanel.panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'sqlEngineLabHome',
      'SQL Engine Lab — Home',
      column ?? vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    HomePanel.currentPanel = new HomePanel(panel, extensionUri, dockerClient);
  }

  private async runSetupFlow(): Promise<void> {
    this.isPolling = false;
    this.setState('checking_docker');

    // 1. Check if Docker is installed
    const isInstalled = await this.dockerClient.isDockerInstalled();
    if (!isInstalled) {
      this.setState('docker_not_installed');
      return;
    }

    // 2. Check if Docker is running
    const dockerStatus = await this.dockerClient.checkDockerAvailability();
    if (!dockerStatus.ok) {
      this.setState('docker_not_running');
      return;
    }

    await this.checkOracleAndFinish();
  }

  private async handleStartDocker(): Promise<void> {
    this.setState('starting_docker');
    const platform = detectPlatform();
    await this.dockerClient.startDockerDesktop(platform.os);
    
    // Si pudo lanzar el comando (o no), empezamos el polling para ver si levanta
    this.pollDockerUntilRunning();
  }

  private async pollDockerUntilRunning(): Promise<void> {
    if (this.isPolling) return;
    this.isPolling = true;
    this.setState('starting_docker');

    const maxAttempts = 60; // Hasta 1 minuto de polling (1s por intento)
    for (let i = 0; i < maxAttempts; i++) {
      // Si el usuario cambia de estado manualmente o cerramos panel, rompemos el polling
      if (!this.isPolling) {
        return;
      }

      const status = await this.dockerClient.checkDockerAvailability();
      if (status.ok) {
        this.isPolling = false;
        await this.checkOracleAndFinish();
        return;
      }

      // Esperar 1 segundo antes de reintentar
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Si pasaron 60 segundos y no levantó, volvemos al estado de error
    this.isPolling = false;
    this.setState('docker_not_running');
  }

  private async checkOracleAndFinish(): Promise<void> {
    // Check Oracle image (Default initial setup)
    const oracleEngine = getEngineById('oracle');
    if (oracleEngine) {
      const oracleImage = 'gvenzl/oracle-free:23.5-slim';
      const imageExists = await this.dockerClient.imageExists(oracleImage);
      if (!imageExists) {
        this.setState('pulling_images');
        
        await this.dockerClient.pullImage(oracleImage, (progress) => {
          this.pullProgress = progress;
          this.updateWebviewState();
        });
      }
    }

    // Ready
    this.setState('ready');
  }

  private setState(state: HomeState) {
    this.currentState = state;
    this.updateWebviewState();
  }

  private updateWebviewState() {
    void this.panel.webview.postMessage({
      command: 'updateHomeState',
      state: this.currentState,
      progress: this.pullProgress,
    });
  }

  private buildHtml(): string {
    const webview = this.panel.webview;
    const stylesUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'out', 'webview-ui', 'assets', 'index.css')
    );
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'out', 'webview-ui', 'assets', 'index.js')
    );

    return /* html */ `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} https: data:;">
  <title>SQL Engine Lab</title>
  <link rel="stylesheet" href="${stylesUri.toString()}">
  <script>
    const vscode = acquireVsCodeApi();
    window.acquireVsCodeApi = () => vscode;
  </script>
</head>
<body>
  <div id="root" data-view="home"></div>
  <script type="module" src="${scriptUri.toString()}"></script>
</body>
</html>`;
  }
}
