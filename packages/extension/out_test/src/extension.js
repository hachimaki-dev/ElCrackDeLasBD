"use strict";
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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const dockerClient_1 = require("./core/docker/dockerClient");
const containerLifecycle_1 = require("./core/docker/containerLifecycle");
const treeView_1 = require("./vscode/treeView");
const commands_1 = require("./vscode/commands");
const configProvider_1 = require("./vscode/configProvider");
const platformInfo_1 = require("./core/docker/platformInfo");
/**
 * Activación de la extensión.
 * VS Code llama a esta función cuando se activa la extensión
 * (definido en package.json via activationEvents).
 *
 * @param context - Contexto de la extensión provisto por VS Code
 */
function activate(context) {
    // ---- Crear OutputChannel para diagnóstico ----
    const outputChannel = vscode.window.createOutputChannel('SQL Engine Lab');
    const platform = (0, platformInfo_1.detectPlatform)();
    outputChannel.appendLine(`SQL Engine Laboratory activada`);
    outputChannel.appendLine(`Plataforma: ${platform.displayString}`);
    outputChannel.appendLine(`Timestamp: ${new Date().toISOString()}`);
    outputChannel.appendLine('');
    // ---- Crear instancias de las piezas core ----
    const dockerClient = new dockerClient_1.DockerClient();
    const configProvider = new configProvider_1.VsCodeConfigurationProvider();
    const lifecycle = new containerLifecycle_1.ContainerLifecycle(dockerClient, configProvider);
    // ---- Conectar eventos de diagnóstico al OutputChannel ----
    lifecycle.on('diagnosticLog', (message) => {
        outputChannel.appendLine(message);
    });
    lifecycle.on('emulationWarning', (data) => {
        outputChannel.appendLine(`⚠️ [EMULACIÓN] ${data.message}`);
        void vscode.window.showWarningMessage(`SQL Engine Lab: ${data.message}`);
    });
    // ---- Registrar Tree View ----
    const treeProvider = new treeView_1.EngineTreeViewProvider(lifecycle);
    const treeView = vscode.window.createTreeView('sqlEngineLab.engineList', {
        treeDataProvider: treeProvider,
        showCollapseAll: false,
    });
    // ---- Registrar comandos ----
    const commandDisposables = (0, commands_1.registerCommands)(context, lifecycle, treeProvider, dockerClient, outputChannel);
    // ---- Agregar todos los disposables al contexto ----
    // VS Code los limpiará automáticamente al desactivar la extensión
    context.subscriptions.push(treeView, treeProvider, outputChannel, ...commandDisposables, 
    // Disposable para lifecycle (detener contenedor activo al desactivar)
    new vscode.Disposable(() => {
        void lifecycle.stopEngine();
    }));
}
/**
 * Desactivación de la extensión.
 * VS Code llama a esta función cuando se desactiva la extensión.
 * Los disposables en context.subscriptions se limpian automáticamente.
 */
function deactivate() {
    // Los disposables registrados en activate() se limpian automáticamente.
    // No necesitamos hacer nada adicional aquí.
}
//# sourceMappingURL=extension.js.map