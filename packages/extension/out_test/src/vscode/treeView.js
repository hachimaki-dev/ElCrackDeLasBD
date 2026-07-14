"use strict";
/**
 * SQL Engine Laboratory — Engine Tree View
 *
 * Tree View Provider que muestra la lista de motores SQL en el panel lateral.
 * Se suscribe a eventos de ContainerLifecycle para reflejar el estado en tiempo real.
 *
 * Cada elemento del árbol muestra:
 * - Nombre del motor con ícono de estado (detenido/iniciando/corriendo/error)
 * - Descripción corta
 * - Botones contextuales (Iniciar / Detener / Ver Conexión)
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
exports.EngineTreeViewProvider = exports.EngineTreeItem = void 0;
const vscode = __importStar(require("vscode"));
const registry_1 = require("../core/engines/registry");
/**
 * Elemento individual del Tree View — representa un motor SQL.
 */
class EngineTreeItem extends vscode.TreeItem {
    engine;
    status;
    constructor(engine, status) {
        super(engine.displayName, vscode.TreeItemCollapsibleState.None);
        this.engine = engine;
        this.status = status;
        this.description = EngineTreeItem.buildDescription(status);
        this.tooltip = engine.description;
        this.iconPath = EngineTreeItem.buildIcon(status);
        this.contextValue = EngineTreeItem.buildContextValue(status);
        // Al hacer clic en un motor corriendo, mostrar info de conexión
        if (status === 'running') {
            this.command = {
                command: 'sqlEngineLab.showConnectionInfo',
                title: 'Ver Info de Conexión',
                arguments: [engine.id],
            };
        }
    }
    static buildDescription(status) {
        const descriptions = {
            stopped: 'Detenido',
            pulling: 'Descargando imagen...',
            starting: 'Iniciando...',
            running: '● Corriendo',
            stopping: 'Deteniendo...',
            error: '⚠ Error',
        };
        return descriptions[status];
    }
    static buildIcon(status) {
        const icons = {
            stopped: { id: 'circle-outline' },
            pulling: { id: 'loading~spin', color: new vscode.ThemeColor('charts.yellow') },
            starting: { id: 'loading~spin', color: new vscode.ThemeColor('charts.yellow') },
            running: { id: 'circle-filled', color: new vscode.ThemeColor('charts.green') },
            stopping: { id: 'loading~spin', color: new vscode.ThemeColor('charts.orange') },
            error: { id: 'error', color: new vscode.ThemeColor('charts.red') },
        };
        const icon = icons[status];
        return new vscode.ThemeIcon(icon.id, icon.color);
    }
    static buildContextValue(status) {
        if (status === 'running')
            return 'engine-running';
        if (status === 'stopped' || status === 'error')
            return 'engine-stopped';
        return 'engine-busy';
    }
}
exports.EngineTreeItem = EngineTreeItem;
/**
 * Provider del Tree View de motores SQL.
 * Implementa vscode.TreeDataProvider y se actualiza via eventos de ContainerLifecycle.
 */
class EngineTreeViewProvider {
    lifecycle;
    _onDidChangeTreeData = new vscode.EventEmitter();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    /** Estado de cada motor en el árbol */
    engineStatuses = new Map();
    isReady = false;
    constructor(lifecycle) {
        this.lifecycle = lifecycle;
        // Inicializar todos los motores como detenidos
        for (const engine of (0, registry_1.getAllEngines)()) {
            this.engineStatuses.set(engine.id, 'stopped');
        }
        // Suscribirse a eventos del ciclo de vida para actualizar la UI
        this.lifecycle.on('statusChanged', (state) => {
            this.engineStatuses.set(state.engineId, state.status);
            // Si el motor se detiene, resetear todos a stopped para consistencia visual
            if (state.status === 'stopped') {
                this.resetAllToStopped();
            }
            this._onDidChangeTreeData.fire(undefined);
        });
        this.lifecycle.on('engineStopped', (_engineId) => {
            this.resetAllToStopped();
            this._onDidChangeTreeData.fire(undefined);
        });
    }
    getTreeItem(element) {
        return element;
    }
    setIsReady(isReady) {
        this.isReady = isReady;
        this.refresh();
    }
    getChildren() {
        if (!this.isReady) {
            return [];
        }
        return (0, registry_1.getAllEngines)().map((engine) => new EngineTreeItem(engine, this.engineStatuses.get(engine.id) ?? 'stopped'));
    }
    /**
     * Fuerza un refresh completo del Tree View.
     * Usado por el comando "Refrescar".
     */
    refresh() {
        this._onDidChangeTreeData.fire(undefined);
    }
    resetAllToStopped() {
        for (const engineId of this.engineStatuses.keys()) {
            this.engineStatuses.set(engineId, 'stopped');
        }
    }
    dispose() {
        this._onDidChangeTreeData.dispose();
    }
}
exports.EngineTreeViewProvider = EngineTreeViewProvider;
//# sourceMappingURL=treeView.js.map