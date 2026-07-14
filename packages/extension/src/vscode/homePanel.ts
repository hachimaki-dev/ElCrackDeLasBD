import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { DockerClient } from '../core/docker/dockerClient';
import { getEngineById, getAllEngines } from '../core/engines/registry';
import { PullProgress, EngineStatus, EngineState, ConnectionInfo } from '../core/engines/engine.types';
import { detectPlatform } from '../core/docker/platformInfo';
import { ContainerLifecycle } from '../core/docker/containerLifecycle';
import { ProgressManager } from '../core/progress/progressManager';
import { AdminService } from '../core/admin/adminService';
import { ConnectionProfile } from '../core/credentials/vault';

export type HomeState = 'checking_docker' | 'docker_not_installed' | 'docker_not_running' | 'starting_docker' | 'pulling_images' | 'ready';

export class HomePanel {
  private static currentPanel: HomePanel | undefined;

  private readonly panel: vscode.WebviewPanel;
  private readonly dockerClient: DockerClient;
  private readonly extensionUri: vscode.Uri;
  private readonly lifecycle: ContainerLifecycle;
  private readonly progressManager: ProgressManager;
  private readonly adminService: AdminService;
  private currentState: HomeState = 'checking_docker';
  private pullProgress?: PullProgress;
  private isPolling = false;
  private currentMessage?: string;
  private readonly onReadyCallback?: () => void;

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    dockerClient: DockerClient,
    lifecycle: ContainerLifecycle,
    progressManager: ProgressManager,
    adminService: AdminService,
    onReady?: () => void
  ) {
    this.panel = panel;
    this.extensionUri = extensionUri;
    this.dockerClient = dockerClient;
    this.lifecycle = lifecycle;
    this.progressManager = progressManager;
    this.adminService = adminService;
    this.onReadyCallback = onReady;

    this.panel.webview.html = this.buildHtml();
    
    // Escuchar eventos del ciclo de vida para sincronizar la UI en tiempo real
    const statusListener = (state?: EngineState): void => {
      if (state && state.message) {
        this.currentMessage = state.message;
      }
      this.updateWebviewState();
    };
    this.lifecycle.on('statusChanged', statusListener);
    this.lifecycle.on('engineStarted', (_info: ConnectionInfo) => {
      this.currentMessage = undefined;
      this.updateWebviewState();
    });
    this.lifecycle.on('engineStopped', () => {
      this.currentMessage = undefined;
      this.updateWebviewState();
    });

    this.panel.onDidDispose(() => {
      HomePanel.currentPanel = undefined;
      this.isPolling = false;
      this.lifecycle.removeListener('statusChanged', statusListener);
      this.lifecycle.removeListener('engineStarted', statusListener);
      this.lifecycle.removeListener('engineStopped', statusListener);
    });

    this.panel.webview.onDidReceiveMessage(async (message: any) => {
      this.lifecycle.emit('diagnosticLog', `[HomePanel] Webview message received: ${JSON.stringify(message)}`);
      try {
        if (message.command === 'executeCommand') {
          if (message.args) {
            await vscode.commands.executeCommand(message.action, ...message.args);
          } else {
            await vscode.commands.executeCommand(message.action);
          }
        } else if (message.command === 'openExternal') {
          await vscode.env.openExternal(vscode.Uri.parse(message.url));
        } else if (message.command === 'retrySetup') {
          await this.runSetupFlow();
        } else if (message.command === 'startDocker') {
          await this.handleStartDocker();
        } else if (message.command === 'getInitialState') {
          this.updateWebviewState();
        } else if (message.command === 'getAdminMetadata') {
          const engineId = this.lifecycle.getCurrentEngine();
          const activeConn = this.lifecycle.getCurrentConnectionInfo();
          if (engineId && activeConn) {
            const profile: ConnectionProfile = {
              id: `sandbox-${engineId}`,
              name: 'Sandbox',
              engineId,
              user: activeConn.user,
              database: activeConn.database,
              password: activeConn.password,
            };
            const result = await this.adminService.getMetadata(engineId, profile);
            if (result.ok) {
              this.panel.webview.postMessage({
                command: 'updateAdminMetadata',
                report: result.value,
              });
            } else {
              this.panel.webview.postMessage({
                command: 'adminError',
                message: result.error.message,
              });
            }
          }
        } else if (message.command === 'createDatabase') {
          const engineId = this.lifecycle.getCurrentEngine();
          const activeConn = this.lifecycle.getCurrentConnectionInfo();
          const dbName = message.name;
          if (engineId && activeConn && dbName) {
            const profile: ConnectionProfile = {
              id: `sandbox-${engineId}`,
              name: 'Sandbox',
              engineId,
              user: activeConn.user,
              database: activeConn.database,
              password: activeConn.password,
            };
            const result = await this.adminService.createDatabase(engineId, profile, dbName);
            this.panel.webview.postMessage({
              command: 'databaseCreated',
              success: result.ok,
              message: result.ok ? result.value : result.error.message,
            });
          }
        } else if (message.command === 'createUser') {
          const engineId = this.lifecycle.getCurrentEngine();
          const activeConn = this.lifecycle.getCurrentConnectionInfo();
          const { username, password } = message;
          if (engineId && activeConn && username) {
            const profile: ConnectionProfile = {
              id: `sandbox-${engineId}`,
              name: 'Sandbox',
              engineId,
              user: activeConn.user,
              database: activeConn.database,
              password: activeConn.password,
            };
            const result = await this.adminService.createUser(engineId, profile, username, password);
            this.panel.webview.postMessage({
              command: 'userCreated',
              success: result.ok,
              message: result.ok ? result.value : result.error.message,
            });
          }
        } else if (message.command === 'getTablePreview') {
          const engineId = this.lifecycle.getCurrentEngine();
          const activeConn = this.lifecycle.getCurrentConnectionInfo();
          const { tableName, schemaName } = message;
          if (engineId && activeConn && tableName) {
            const profile: ConnectionProfile = {
              id: `sandbox-${engineId}`,
              name: 'Sandbox',
              engineId,
              user: activeConn.user,
              database: activeConn.database,
              password: activeConn.password,
            };
            const result = await this.adminService.getTablePreview(engineId, profile, tableName, schemaName);
            this.panel.webview.postMessage({
              command: 'updateTablePreview',
              preview: result.ok ? result.value : undefined,
              error: result.ok ? undefined : result.error.message,
            });
          }
        } else if (message.command === 'getSavedCredentials') {
          const engineId = this.lifecycle.getCurrentEngine();
          const activeConn = this.lifecycle.getCurrentConnectionInfo();
          if (engineId) {
            const activeProfile: ConnectionProfile | undefined = activeConn ? {
              id: `sandbox-${engineId}`,
              name: 'Sandbox',
              engineId,
              user: activeConn.user,
              database: activeConn.database,
              password: activeConn.password,
            } : undefined;
            const credentials = await this.adminService.getSavedCredentials(engineId, activeProfile);
            this.panel.webview.postMessage({
              command: 'updateSavedCredentials',
              credentials,
            });
          }
        } else if (message.command === 'activateDatabase') {
          const { dbName } = message;
          if (dbName) {
            this.lifecycle.updateConnectionDetails(dbName);
            this.updateWebviewState();
            void vscode.window.showInformationMessage(`✓ Conexión activa cambiada a base de datos: ${dbName}`);
          }
        } else if (message.command === 'activateUser') {
          const { username } = message;
          if (username) {
            const engineId = this.lifecycle.getCurrentEngine();
            if (engineId) {
              const activeConn = this.lifecycle.getCurrentConnectionInfo();
              let password = await this.adminService.getPasswordForUser(engineId, username);
              
              if (!password && activeConn && username === activeConn.user) {
                password = activeConn.password;
              }
              
              if (!password) {
                const inputPass = await vscode.window.showInputBox({
                  title: `SQL Engine Lab: Contraseña para ${username}`,
                  prompt: `Ingresa la contraseña para conectarte como ${username} al motor ${engineId}`,
                  password: true,
                });
                if (inputPass === undefined) return;
                password = inputPass;
              }

              this.lifecycle.updateConnectionDetails(undefined, username, password);
              this.updateWebviewState();
              void vscode.window.showInformationMessage(`✓ Conexión activa cambiada a usuario: ${username}`);
            }
          }
        } else if (message.command === 'executeTableCommand') {
          const engineId = this.lifecycle.getCurrentEngine();
          const activeConn = this.lifecycle.getCurrentConnectionInfo();
          const { sqlText } = message;
          if (engineId && activeConn && sqlText) {
            const profile: ConnectionProfile = {
              id: `sandbox-${engineId}`,
              name: 'Sandbox',
              engineId,
              user: activeConn.user,
              database: activeConn.database,
              password: activeConn.password,
            };
            const result = await this.adminService.executeCommand(profile, sqlText);
            this.panel.webview.postMessage({
              command: 'tableCommandExecuted',
              success: result.ok,
              message: result.ok ? 'Comando ejecutado con éxito.' : result.error.message,
            });
          }
        }
      } catch (err: any) {
        this.lifecycle.emit('diagnosticLog', `[HomePanel] Error handling message: ${err?.message || err}`);
      }
    });

    this.runSetupFlow();
  }

  static createOrShow(
    extensionUri: vscode.Uri,
    dockerClient: DockerClient,
    lifecycle: ContainerLifecycle,
    progressManager: ProgressManager,
    adminService: AdminService,
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

    HomePanel.currentPanel = new HomePanel(panel, extensionUri, dockerClient, lifecycle, progressManager, adminService, onReady);
  }

  static refresh(): void {
    if (HomePanel.currentPanel) {
      HomePanel.currentPanel.updateWebviewState();
    }
  }

  /**
   * Envía el reporte de la autocalificación al Webview React activo.
   */
  static sendValidationResult(report: any): void {
    if (HomePanel.currentPanel) {
      void HomePanel.currentPanel.panel.webview.postMessage({
        command: 'validationResult',
        report,
      });
    }
  }

  private loadTutorials(): Record<
    string,
    Record<
      string,
      { engine: string; level: string; title: string; description: string; content: string; setup?: string; validation?: any }
    >
  > | null {
    let tutorialsData: Record<
      string,
      Record<
        string,
        { engine: string; level: string; title: string; description: string; content: string }
      >
    > | null = null;

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
          console.error('Error reading workspace lab-tutorials', err);
        }
      }
    }

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
        console.error('Error reading extension path lab-tutorials', err);
      }
    }

    return tutorialsData;
  }


  private async runSetupFlow(): Promise<void> {
    this.lifecycle.emit('diagnosticLog', `[HomePanel] runSetupFlow: Starting setup flow...`);
    this.isPolling = false;
    this.setState('checking_docker');

    const platform = detectPlatform();
    this.lifecycle.emit('diagnosticLog', `[HomePanel] Detected platform: ${JSON.stringify(platform)}`);

    // 1. Check if Docker is installed
    const isInstalled = await this.dockerClient.isDockerInstalled(platform.os);
    this.lifecycle.emit('diagnosticLog', `[HomePanel] isDockerInstalled: ${isInstalled}`);
    if (!isInstalled) {
      this.setState('docker_not_installed');
      return;
    }

    // 2. Check if Docker is running
    const dockerStatus = await this.dockerClient.checkDockerAvailability();
    this.lifecycle.emit('diagnosticLog', `[HomePanel] checkDockerAvailability: ${JSON.stringify(dockerStatus)}`);
    if (!dockerStatus.ok) {
      this.setState('docker_not_running');
      return;
    }

    this.lifecycle.emit('diagnosticLog', `[HomePanel] Docker is running, checking Oracle image...`);
    await this.checkOracleAndFinish();
  }

  private async handleStartDocker(): Promise<void> {
    this.lifecycle.emit('diagnosticLog', `[HomePanel] handleStartDocker: Starting Docker...`);
    this.setState('starting_docker');
    const platform = detectPlatform();

    if (platform.os === 'linux') {
      void vscode.window.showInformationMessage(
        'Iniciando Docker: Se te pedirá tu contraseña de sistema para iniciar el servicio. Si prefieres no usarla, puedes cancelar y ejecutar manualmente "sudo systemctl start docker" en tu terminal.',
      );
    }

    this.lifecycle.emit('diagnosticLog', `[HomePanel] Invoking startDockerDesktop...`);
    const started = await this.dockerClient.startDockerDesktop(platform.os);
    this.lifecycle.emit('diagnosticLog', `[HomePanel] startDockerDesktop returned: ${started}`);
    
    if (!started) {
      void vscode.window.showWarningMessage('No pudimos iniciar Docker automáticamente o cancelaste la petición. Por favor, ábrelo manualmente e inténtalo de nuevo.');
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
      this.lifecycle.emit('diagnosticLog', `[HomePanel] Polling Docker (Attempt ${i + 1}/${maxAttempts})...`);
      // Si el usuario cambia de estado manualmente o cerramos panel, rompemos el polling
      if (!this.isPolling) {
        this.lifecycle.emit('diagnosticLog', `[HomePanel] Polling cancelled.`);
        return;
      }

      const status = await this.dockerClient.checkDockerAvailability();
      this.lifecycle.emit('diagnosticLog', `[HomePanel] Polling status: ${JSON.stringify(status)}`);
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

  private setState(state: HomeState): void {
    this.currentState = state;
    this.updateWebviewState();
  }

  private updateWebviewState(): void {
    const enginesList = getAllEngines();
    const activeEngineId = this.lifecycle.getCurrentEngine();
    const activeEngineStatus = this.lifecycle.getStatus();
    const activeConnection = this.lifecycle.getCurrentConnectionInfo();

    const enginesData = enginesList.map(engine => {
      let status: EngineStatus = 'stopped';
      if (activeEngineId === engine.id) {
        status = activeEngineStatus;
      }
      const progress = this.progressManager.getEngineProgress(engine.id);
      return {
        id: engine.id,
        displayName: engine.displayName,
        status,
        port: engine.defaultPort,
        completedModules: progress.completedModules || [],
        xp: progress.xp || { ddl: 0, dml: 0, optimization: 0, architecture: 0 },
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

    const maxStreak = Math.max(7, ...enginesList.map(e => this.progressManager.getEngineProgress(e.id).streak || 0));

    const gamification = {
      xp: totalXp,
      level,
      xpToNextLevel: XP_PER_LEVEL - xpInLevel,
      badges: Array.from(badgeMap.values()),
      streak: maxStreak,
    };

    const activeEngine = activeEngineId ? getEngineById(activeEngineId) : undefined;
    const tutorialsData = this.loadTutorials();
    const activeEngineTutorials = (tutorialsData && activeEngine) ? tutorialsData[activeEngine.id] : undefined;

    void this.panel.webview.postMessage({
      command: 'updateHomeState',
      state: this.currentState,
      pullProgress: this.pullProgress,
      engines: enginesData,
      activeConnection: activeConnection || undefined,
      progress: gamification,
      tutorials: activeEngineTutorials || undefined,
      activeEngineMessage: this.currentMessage,
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
