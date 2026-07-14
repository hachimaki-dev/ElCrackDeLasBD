"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.HomePanel = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const registry_1 = require("../core/engines/registry");
const platformInfo_1 = require("../core/docker/platformInfo");
class HomePanel {
    static currentPanel;
    panel;
    dockerClient;
    extensionUri;
    lifecycle;
    progressManager;
    currentState = 'checking_docker';
    pullProgress;
    isPolling = false;
    currentMessage;
    onReadyCallback;
    constructor(panel, extensionUri, dockerClient, lifecycle, progressManager, onReady) {
        this.panel = panel;
        this.extensionUri = extensionUri;
        this.dockerClient = dockerClient;
        this.lifecycle = lifecycle;
        this.progressManager = progressManager;
        this.onReadyCallback = onReady;
        this.panel.webview.html = this.buildHtml();
        // Escuchar eventos del ciclo de vida para sincronizar la UI en tiempo real
        const statusListener = (state) => {
            if (state && state.message) {
                this.currentMessage = state.message;
            }
            this.updateWebviewState();
        };
        this.lifecycle.on('statusChanged', statusListener);
        this.lifecycle.on('engineStarted', (_info) => {
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
        this.panel.webview.onDidReceiveMessage(async (message) => {
            this.lifecycle.emit('diagnosticLog', `[HomePanel] Webview message received: ${JSON.stringify(message)}`);
            try {
                if (message.command === 'executeCommand') {
                    if (message.args) {
                        await vscode.commands.executeCommand(message.action, ...message.args);
                    }
                    else {
                        await vscode.commands.executeCommand(message.action);
                    }
                }
                else if (message.command === 'openExternal') {
                    await vscode.env.openExternal(vscode.Uri.parse(message.url));
                }
                else if (message.command === 'retrySetup') {
                    await this.runSetupFlow();
                }
                else if (message.command === 'startDocker') {
                    await this.handleStartDocker();
                }
                else if (message.command === 'getInitialState') {
                    this.updateWebviewState();
                }
            }
            catch (err) {
                this.lifecycle.emit('diagnosticLog', `[HomePanel] Error handling message: ${err?.message || err}`);
            }
        });
        this.runSetupFlow();
    }
    static createOrShow(extensionUri, dockerClient, lifecycle, progressManager, onReady) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : vscode.ViewColumn.One;
        if (HomePanel.currentPanel) {
            HomePanel.currentPanel.panel.reveal(column);
            return;
        }
        const panel = vscode.window.createWebviewPanel('sqlEngineLabHome', 'SQL Engine Lab — Home', column ?? vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [
                vscode.Uri.joinPath(extensionUri, 'out'),
            ],
        });
        HomePanel.currentPanel = new HomePanel(panel, extensionUri, dockerClient, lifecycle, progressManager, onReady);
    }
    static refresh() {
        if (HomePanel.currentPanel) {
            HomePanel.currentPanel.updateWebviewState();
        }
    }
    /**
     * Envía el reporte de la autocalificación al Webview React activo.
     */
    static sendValidationResult(report) {
        if (HomePanel.currentPanel) {
            void HomePanel.currentPanel.panel.webview.postMessage({
                command: 'validationResult',
                report,
            });
        }
    }
    loadTutorials() {
        let tutorialsData = null;
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            const wsPath = path.join(workspaceFolders[0].uri.fsPath, 'lab-tutorials.json');
            if (fs.existsSync(wsPath)) {
                try {
                    tutorialsData = JSON.parse(fs.readFileSync(wsPath, 'utf8'));
                }
                catch (err) {
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
                    tutorialsData = JSON.parse(fs.readFileSync(tutorialsPath, 'utf8'));
                }
            }
            catch (err) {
                console.error('Error reading extension path lab-tutorials', err);
            }
        }
        return tutorialsData;
    }
    async runSetupFlow() {
        this.lifecycle.emit('diagnosticLog', `[HomePanel] runSetupFlow: Starting setup flow...`);
        this.isPolling = false;
        this.setState('checking_docker');
        const platform = (0, platformInfo_1.detectPlatform)();
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
    async handleStartDocker() {
        this.lifecycle.emit('diagnosticLog', `[HomePanel] handleStartDocker: Starting Docker...`);
        this.setState('starting_docker');
        const platform = (0, platformInfo_1.detectPlatform)();
        if (platform.os === 'linux') {
            void vscode.window.showInformationMessage('Iniciando Docker: Se te pedirá tu contraseña de sistema para iniciar el servicio. Si prefieres no usarla, puedes cancelar y ejecutar manualmente "sudo systemctl start docker" en tu terminal.');
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
    async pollDockerUntilRunning() {
        if (this.isPolling)
            return;
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
    async checkOracleAndFinish() {
        // Check Oracle image (Default initial setup)
        const oracleEngine = (0, registry_1.getEngineById)('oracle');
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
    setState(state) {
        this.currentState = state;
        this.updateWebviewState();
    }
    updateWebviewState() {
        const enginesList = (0, registry_1.getAllEngines)();
        const activeEngineId = this.lifecycle.getCurrentEngine();
        const activeEngineStatus = this.lifecycle.getStatus();
        const activeConnection = this.lifecycle.getCurrentConnectionInfo();
        const enginesData = enginesList.map(engine => {
            let status = 'stopped';
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
        const badgeMap = new Map();
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
                        }
                        else if (badgeId === 'guardian_acid') {
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
        const activeEngine = activeEngineId ? (0, registry_1.getEngineById)(activeEngineId) : undefined;
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
    buildHtml() {
        const webview = this.panel.webview;
        const stylesUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'out', 'webview-ui', 'assets', 'index.css'));
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'out', 'webview-ui', 'assets', 'index.js'));
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
exports.HomePanel = HomePanel;
//# sourceMappingURL=homePanel.js.map