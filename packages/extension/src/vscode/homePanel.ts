import * as vscode from 'vscode';
import { DockerClient } from '../core/docker/dockerClient';
import { getEngineById, getAllEngines } from '../core/engines/registry';
import { PullProgress, EngineStatus } from '../core/engines/engine.types';
import { detectPlatform } from '../core/docker/platformInfo';
import { ContainerLifecycle } from '../core/docker/containerLifecycle';
import { ProgressManager } from '../core/progress/progressManager';

export type HomeState = 'checking_docker' | 'docker_not_installed' | 'docker_not_running' | 'starting_docker' | 'pulling_images' | 'ready';

export class HomePanel {
  private static currentPanel: HomePanel | undefined;

  private readonly panel: vscode.WebviewPanel;
  private readonly dockerClient: DockerClient;
  private readonly extensionUri: vscode.Uri;
  private readonly lifecycle: ContainerLifecycle;
  private readonly progressManager: ProgressManager;
  private currentState: HomeState = 'checking_docker';
  private pullProgress?: PullProgress;
  private isPolling = false;
  private readonly onReadyCallback?: () => void;

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    dockerClient: DockerClient,
    lifecycle: ContainerLifecycle,
    progressManager: ProgressManager,
    onReady?: () => void
  ) {
    this.panel = panel;
    this.extensionUri = extensionUri;
    this.dockerClient = dockerClient;
    this.lifecycle = lifecycle;
    this.progressManager = progressManager;
    this.onReadyCallback = onReady;

    this.panel.webview.html = this.buildHtml();
    
    // Escuchar eventos del ciclo de vida para sincronizar la UI en tiempo real
    const statusListener = () => {
      this.updateWebviewState();
    };
    this.lifecycle.on('statusChanged', statusListener);
    this.lifecycle.on('engineStarted', statusListener);
    this.lifecycle.on('engineStopped', statusListener);

    this.panel.onDidDispose(() => {
      HomePanel.currentPanel = undefined;
      this.isPolling = false;
      this.lifecycle.removeListener('statusChanged', statusListener);
      this.lifecycle.removeListener('engineStarted', statusListener);
      this.lifecycle.removeListener('engineStopped', statusListener);
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

  static createOrShow(
    extensionUri: vscode.Uri,
    dockerClient: DockerClient,
    lifecycle: ContainerLifecycle,
    progressManager: ProgressManager,
    onReady?: () => void
  ): void {
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
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'out'),
        ],
      }
    );

    HomePanel.currentPanel = new HomePanel(panel, extensionUri, dockerClient, lifecycle, progressManager, onReady);
  }

  private async runSetupFlow(): Promise<void> {
    this.isPolling = false;
    this.setState('checking_docker');

    const platform = detectPlatform();

    // 1. Check if Docker is installed
    const isInstalled = await this.dockerClient.isDockerInstalled(platform.os);
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
    const started = await this.dockerClient.startDockerDesktop(platform.os);
    
    if (!started) {
      void vscode.window.showWarningMessage('No pudimos iniciar Docker automáticamente. Por favor, ábrelo manualmente e inténtalo de nuevo.');
      this.setState('docker_not_running');
      return;
    }

    // Si pudo lanzar el comando, empezamos el polling para ver si levanta
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
    // Desbloquear la extensión
    await vscode.commands.executeCommand('setContext', 'sqlEngineLab.isReady', true);
    if (this.onReadyCallback) {
      this.onReadyCallback();
    }
  }

  private setState(state: HomeState) {
    this.currentState = state;
    this.updateWebviewState();
  }

  private updateWebviewState() {
    const enginesList = getAllEngines();
    const activeEngineId = this.lifecycle.getCurrentEngine();
    const activeEngineStatus = this.lifecycle.getStatus();
    const activeConnection = this.lifecycle.getCurrentConnectionInfo();

    const enginesData = enginesList.map(engine => {
      let status: EngineStatus = 'stopped';
      if (activeEngineId === engine.id) {
        status = activeEngineStatus;
      }
      return {
        id: engine.id,
        displayName: engine.displayName,
        status,
        port: engine.defaultPort,
      };
    });

    // Gamificación unificada
    let totalXp = 0;
    const badgeMap = new Map<string, { id: string; name: string; description: string; icon: string; unlockedAt: string }>();

    for (const engine of enginesList) {
      const progress = this.progressManager.getEngineProgress(engine.id);
      const engineXp = (progress.xp.ddl || 0) + (progress.xp.dml || 0) + (progress.xp.optimization || 0) + (progress.xp.architecture || 0);
      totalXp += engineXp;

      if (progress.badges) {
        for (const badgeId of progress.badges) {
          if (!badgeMap.has(badgeId)) {
            let name = badgeId;
            let description = 'Insignia de honor';
            let icon = '🏆';
            if (badgeId === 'maestro_optimizador') {
              name = 'Maestro Optimizador';
              description = 'Performance y optimización refinada';
              icon = '⚡';
            } else if (badgeId === 'guardian_acid') {
              name = 'Guardián ACID';
              description = 'Consistencia y atomicidad transaccional';
              icon = '🛡️';
            }
            badgeMap.set(badgeId, {
              id: badgeId,
              name,
              description,
              icon,
              unlockedAt: engine.displayName
            });
          }
        }
      }
    }

    const XP_PER_LEVEL = 1000;
    const level = Math.floor(totalXp / XP_PER_LEVEL) + 1;
    const xpInLevel = totalXp % XP_PER_LEVEL;

    const gamification = {
      xp: totalXp,
      level,
      xpToNextLevel: XP_PER_LEVEL - xpInLevel,
      badges: Array.from(badgeMap.values()),
    };

    void this.panel.webview.postMessage({
      command: 'updateHomeState',
      state: this.currentState,
      pullProgress: this.pullProgress,
      engines: enginesData,
      activeConnection: activeConnection || undefined,
      progress: gamification,
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
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline' https://fonts.googleapis.com; script-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} https: data:; font-src ${webview.cspSource} https://fonts.gstatic.com;">
  <title>SQL Engine Lab</title>
  <link rel="stylesheet" href="${stylesUri.toString()}">
</head>
<body>
  <div id="root" data-view="home"></div>
  <script type="module" src="${scriptUri.toString()}"></script>
</body>
</html>`;
  }
}
