"use strict";
/**
 * SQL Engine Laboratory — VS Code Commands
 *
 * Registro y manejo de todos los comandos de la extensión.
 * Cada acción de usuario es un comando independiente:
 * - sqlEngineLab.startEngine
 * - sqlEngineLab.stopEngine
 * - sqlEngineLab.showConnectionInfo
 * - sqlEngineLab.copyConnectionCommand
 * - sqlEngineLab.refreshEngines
 * - sqlEngineLab.configureCredentials
 * - sqlEngineLab.showDiagnostics
 *
 * Maneja errores de forma explícita y visible (no silenciosa).
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
exports.registerCommands = registerCommands;
const vscode = __importStar(require("vscode"));
const registry_1 = require("../core/engines/registry");
const dockerDiagnostics_1 = require("../core/docker/dockerDiagnostics");
const connectionPanel_1 = require("./connectionPanel");
/**
 * Registra todos los comandos de la extensión en el contexto de VS Code.
 * Retorna un array de Disposables para cleanup al desactivar la extensión.
 *
 * @param context - Contexto de la extensión
 * @param lifecycle - Instancia del gestor de ciclo de vida de contenedores
 * @param treeProvider - Provider del Tree View para refrescar tras acciones
 * @returns Array de Disposables para registrar en context.subscriptions
 */
function registerCommands(context, lifecycle, treeProvider, dockerClient, outputChannel) {
    // Guardar la última conexión activa para mostrarla en el panel
    let activeConnectionInfo;
    // Escuchar cuando un motor arranca para guardar la info de conexión
    lifecycle.on('engineStarted', (info) => {
        activeConnectionInfo = info;
    });
    lifecycle.on('engineStopped', () => {
        activeConnectionInfo = undefined;
        connectionPanel_1.ConnectionPanel.dispose();
    });
    const disposables = [
        // ------------------------------------------------------------------
        // Iniciar motor
        // ------------------------------------------------------------------
        vscode.commands.registerCommand('sqlEngineLab.startEngine', async (engineIdOrItem) => {
            const engineId = resolveEngineId(engineIdOrItem);
            if (!engineId) {
                // Llamado sin argumento (ej: desde la paleta de comandos) → pedir selección
                const selected = await promptEngineSelection(lifecycle);
                if (!selected)
                    return;
                void vscode.commands.executeCommand('sqlEngineLab.startEngine', selected);
                return;
            }
            const engine = (0, registry_1.getEngineById)(engineId);
            if (!engine) {
                void vscode.window.showErrorMessage(`Motor '${engineId}' no reconocido`);
                return;
            }
            // Verificar si ya hay un motor activo
            const currentEngine = lifecycle.getCurrentEngine();
            if (currentEngine && currentEngine !== engineId) {
                const currentEngineDef = (0, registry_1.getEngineById)(currentEngine);
                const answer = await vscode.window.showWarningMessage(`${currentEngineDef?.displayName ?? currentEngine} está corriendo. ¿Detenerlo e iniciar ${engine.displayName}?`, { modal: true }, 'Sí, cambiar');
                if (answer !== 'Sí, cambiar')
                    return;
            }
            // Mostrar progreso en la barra de estado
            void vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `SQL Engine Lab: Iniciando ${engine.displayName}`,
                cancellable: false,
            }, async (progress) => {
                progress.report({ message: 'Verificando Docker...' });
                connectionPanel_1.ConnectionPanel.createOrRevealLoading(context.extensionUri, engine, 'starting', 'Verificando Docker...');
                lifecycle.on('statusChanged', (state) => {
                    if (state.message) {
                        progress.report({ message: state.message });
                        connectionPanel_1.ConnectionPanel.createOrRevealLoading(context.extensionUri, engine, state.status, state.message);
                    }
                });
                const result = await lifecycle.startEngine(engineId);
                if (result.ok) {
                    activeConnectionInfo = result.value;
                    // Mostrar panel de conexión automáticamente
                    connectionPanel_1.ConnectionPanel.createOrReveal(context.extensionUri, engine, result.value);
                    void vscode.window.showInformationMessage(`✓ ${engine.displayName} listo en puerto ${engine.defaultPort}`);
                }
                else {
                    showEngineError(result.error.message, result.error.code);
                }
            });
        }),
        // ------------------------------------------------------------------
        // Detener motor
        // ------------------------------------------------------------------
        vscode.commands.registerCommand('sqlEngineLab.stopEngine', async () => {
            const currentEngineId = lifecycle.getCurrentEngine();
            if (!currentEngineId) {
                void vscode.window.showInformationMessage('No hay ningún motor corriendo.');
                return;
            }
            const engine = (0, registry_1.getEngineById)(currentEngineId);
            const answer = await vscode.window.showWarningMessage(`¿Detener ${engine?.displayName ?? currentEngineId}?`, { modal: true }, 'Detener');
            if (answer !== 'Detener')
                return;
            void vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `SQL Engine Lab: Deteniendo ${engine?.displayName ?? currentEngineId}`,
                cancellable: false,
            }, async () => {
                const result = await lifecycle.stopEngine();
                if (result.ok) {
                    void vscode.window.showInformationMessage(`✓ ${engine?.displayName ?? currentEngineId} detenido`);
                }
                else {
                    showEngineError(result.error.message, result.error.code);
                }
            });
        }),
        // ------------------------------------------------------------------
        // Mostrar info de conexión
        // ------------------------------------------------------------------
        vscode.commands.registerCommand('sqlEngineLab.showConnectionInfo', (_engineIdOrItem) => {
            const currentEngineId = lifecycle.getCurrentEngine();
            if (!currentEngineId || !activeConnectionInfo) {
                void vscode.window.showInformationMessage('No hay ningún motor corriendo. Inicia un motor primero.');
                return;
            }
            const engine = (0, registry_1.getEngineById)(currentEngineId);
            if (!engine)
                return;
            connectionPanel_1.ConnectionPanel.createOrReveal(context.extensionUri, engine, activeConnectionInfo);
        }),
        // ------------------------------------------------------------------
        // Copiar comando de conexión
        // ------------------------------------------------------------------
        vscode.commands.registerCommand('sqlEngineLab.copyConnectionCommand', async () => {
            if (!activeConnectionInfo) {
                void vscode.window.showInformationMessage('No hay ningún motor corriendo. Inicia un motor primero.');
                return;
            }
            await vscode.env.clipboard.writeText(activeConnectionInfo.connectionCommand);
            void vscode.window.showInformationMessage('✓ Comando de conexión copiado al portapapeles');
        }),
        // ------------------------------------------------------------------
        // Refrescar Tree View
        // ------------------------------------------------------------------
        vscode.commands.registerCommand('sqlEngineLab.refreshEngines', () => {
            treeProvider.refresh();
        }),
        // ------------------------------------------------------------------
        // Configurar Credenciales
        // ------------------------------------------------------------------
        vscode.commands.registerCommand('sqlEngineLab.configureCredentials', async () => {
            const config = vscode.workspace.getConfiguration('sqlEngineLab.credentials');
            const newPassword = await vscode.window.showInputBox({
                title: 'SQL Engine Lab: Configurar Contraseña Maestra',
                prompt: 'Esta contraseña se usará tanto para el usuario estándar como para el administrador.',
                value: config.get('labPassword', 'labpassword'),
                password: true,
            });
            if (newPassword !== undefined && newPassword.trim() !== '') {
                await config.update('labPassword', newPassword, vscode.ConfigurationTarget.Global);
                void vscode.window.showInformationMessage('✓ Contraseña actualizada correctamente. ¡Listo para iniciar motores!');
            }
        }),
        // ------------------------------------------------------------------
        // Diagnóstico del entorno (Doctor)
        // ------------------------------------------------------------------
        vscode.commands.registerCommand('sqlEngineLab.showDiagnostics', async () => {
            outputChannel.show(true);
            outputChannel.appendLine('Ejecutando diagnóstico del entorno...');
            const report = await (0, dockerDiagnostics_1.runDoctorFormatted)(dockerClient);
            outputChannel.appendLine(report);
        }),
    ];
    return disposables;
}
/**
 * Muestra un QuickPick para seleccionar un motor cuando no se especificó uno.
 */
async function promptEngineSelection(lifecycle) {
    const currentEngineId = lifecycle.getCurrentEngine();
    const engines = (0, registry_1.getAllEngines)();
    const items = engines.map((engine) => ({
        label: engine.displayName,
        description: engine.description,
        detail: currentEngineId === engine.id ? '● Actualmente corriendo' : undefined,
        engineId: engine.id,
    }));
    const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Selecciona un motor SQL para iniciar',
        title: 'SQL Engine Lab — Iniciar Motor',
    });
    return selected?.engineId;
}
/**
 * Muestra un error con acción de "Abrir Docker Desktop" si el error es de Docker.
 */
function showEngineError(message, code) {
    if (code === 'DOCKER_NOT_RUNNING') {
        void vscode.window
            .showErrorMessage(`SQL Engine Lab: ${message}`, 'Abrir Docker Desktop')
            .then((action) => {
            if (action === 'Abrir Docker Desktop') {
                void vscode.env.openExternal(vscode.Uri.parse('https://www.docker.com/products/docker-desktop/'));
            }
        });
    }
    else {
        void vscode.window.showErrorMessage(`SQL Engine Lab: ${message}`);
    }
}
/**
 * Resuelve el engineId desde distintos tipos de argumento que puede recibir un comando.
 */
function resolveEngineId(arg) {
    if (!arg)
        return undefined;
    if (typeof arg === 'string' && (0, registry_1.isValidEngineId)(arg))
        return arg;
    if (typeof arg === 'object' && 'engine' in arg)
        return arg.engine.id;
    return undefined;
}
//# sourceMappingURL=commands.js.map