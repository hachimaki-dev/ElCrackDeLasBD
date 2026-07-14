"use strict";
/**
 * SQL Engine Laboratory — Connection Panel Webview
 *
 * Webview panel rediseñado con tabs para Estándar/Admin, soporte
 * para estado de carga (loading) y comandos de prueba.
 */
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
exports.ConnectionPanel = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
class ConnectionPanel {
    extensionUri;
    static currentPanel;
    panel;
    currentEngine;
    currentInfo;
    currentStatus;
    currentMessage;
    engineProgress; // any to avoid direct import coupling if possible, or import EngineProgress
    constructor(panel, extensionUri, engine, connectionInfo, status, message, engineProgress) {
        this.extensionUri = extensionUri;
        this.panel = panel;
        this.currentEngine = engine;
        this.currentInfo = connectionInfo;
        this.currentStatus = status;
        this.currentMessage = message;
        if (engineProgress)
            this.engineProgress = engineProgress;
        this.update();
        this.panel.webview.onDidReceiveMessage(async (message) => {
            if (message.command === 'copy') {
                if (message.text) {
                    await vscode.env.clipboard.writeText(message.text);
                    void vscode.window.showInformationMessage('✓ Copiado al portapapeles');
                }
            }
            else if (message.command === 'startTutorial' && message.moduleId) {
                await vscode.commands.executeCommand('sqlEngineLab.openTutorialSheet', message.moduleId);
            }
            else if (message.command === 'completeTutorial' && message.moduleId) {
                await vscode.commands.executeCommand('sqlEngineLab.completeTutorial', message.moduleId);
            }
        });
        this.panel.onDidDispose(() => {
            ConnectionPanel.currentPanel = undefined;
        });
    }
    static createOrReveal(extensionUri, engine, connectionInfo, status, engineProgress) {
        ConnectionPanel.show(extensionUri, engine, connectionInfo, status || 'running', undefined, engineProgress);
    }
    static createOrRevealLoading(extensionUri, engine, status, message, engineProgress) {
        ConnectionPanel.show(extensionUri, engine, undefined, status, message, engineProgress);
    }
    static show(extensionUri, engine, connectionInfo, status, _message, engineProgress) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : vscode.ViewColumn.One;
        if (ConnectionPanel.currentPanel) {
            ConnectionPanel.currentPanel.panel.reveal(column);
            ConnectionPanel.currentPanel.currentEngine = engine;
            ConnectionPanel.currentPanel.currentInfo = connectionInfo;
            ConnectionPanel.currentPanel.currentStatus = status;
            ConnectionPanel.currentPanel.currentMessage = _message;
            if (engineProgress)
                ConnectionPanel.currentPanel.engineProgress = engineProgress;
            ConnectionPanel.currentPanel.update();
            return;
        }
        const panel = vscode.window.createWebviewPanel('sqlEngineLabConnection', `SQL Lab — ${engine.displayName}`, column ?? vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [
                vscode.Uri.joinPath(extensionUri, 'out'),
            ],
        });
        ConnectionPanel.currentPanel = new ConnectionPanel(panel, extensionUri, engine, connectionInfo, status, _message, engineProgress);
    }
    static dispose() {
        if (ConnectionPanel.currentPanel) {
            ConnectionPanel.currentPanel.panel.dispose();
            ConnectionPanel.currentPanel = undefined;
        }
    }
    loadTutorials() {
        let tutorialsData = null;
        // 1. Intentar en el workspace (útil para desarrollo)
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            const wsPath = path.join(workspaceFolders[0].uri.fsPath, 'lab-tutorials.json');
            if (fs.existsSync(wsPath)) {
                try {
                    tutorialsData = JSON.parse(fs.readFileSync(wsPath, 'utf8'));
                }
                catch (err) {
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
                    tutorialsData = JSON.parse(fs.readFileSync(tutorialsPath, 'utf8'));
                }
            }
            catch (err) {
                // eslint-disable-next-line no-console
                console.error('Error reading extension path lab-tutorials', err);
            }
        }
        return tutorialsData;
    }
    update() {
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
                message: this.currentMessage,
                connectionCommand: this.currentInfo?.connectionCommand,
                port: this.currentInfo?.port,
                engineProgress: this.engineProgress,
            },
            tutorials: engineTutorials,
        });
    }
    buildHtml() {
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
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline' https://fonts.googleapis.com; script-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} https: data:; font-src ${webview.cspSource} https://fonts.gstatic.com;">
  <title>SQL Engine Lab</title>
  <link rel="stylesheet" href="${stylesUri.toString()}">
</head>
<body>
  <div id="root"></div>
  <script type="module" src="${scriptUri.toString()}"></script>
</body>
</html>`;
    }
}
exports.ConnectionPanel = ConnectionPanel;
//# sourceMappingURL=connectionPanel.js.map