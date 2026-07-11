/**
 * SQL Engine Laboratory — Connection Panel Webview
 *
 * Webview panel rediseñado con tabs para Estándar/Admin, soporte
 * para estado de carga (loading) y comandos de prueba.
 */
import * as vscode from 'vscode';
import { ConnectionInfo, EngineDefinition, EngineStatus } from '../core/engines/engine.types';
export declare class ConnectionPanel {
    private static currentPanel;
    private readonly panel;
    private currentEngine;
    private currentInfo?;
    private currentStatus?;
    private loadingMessage?;
    private constructor();
    static createOrReveal(extensionUri: vscode.Uri, engine: EngineDefinition, connectionInfo: ConnectionInfo): void;
    static createOrRevealLoading(extensionUri: vscode.Uri, engine: EngineDefinition, status: EngineStatus, message?: string): void;
    private static show;
    static dispose(): void;
    private update;
    private buildHtml;
    private escape;
}
//# sourceMappingURL=connectionPanel.d.ts.map