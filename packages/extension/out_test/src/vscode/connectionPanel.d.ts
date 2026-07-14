/**
 * SQL Engine Laboratory — Connection Panel Webview
 *
 * Webview panel rediseñado con tabs para Estándar/Admin, soporte
 * para estado de carga (loading) y comandos de prueba.
 */
import * as vscode from 'vscode';
import { ConnectionInfo, EngineDefinition, EngineStatus } from '../core/engines/engine.types';
export declare class ConnectionPanel {
    private readonly extensionUri;
    private static currentPanel;
    private readonly panel;
    private currentEngine;
    private currentInfo?;
    private currentStatus?;
    private currentMessage?;
    private engineProgress?;
    private constructor();
    static createOrReveal(extensionUri: vscode.Uri, engine: EngineDefinition, connectionInfo: ConnectionInfo, status?: EngineStatus, engineProgress?: any): void;
    static createOrRevealLoading(extensionUri: vscode.Uri, engine: EngineDefinition, status: EngineStatus, message?: string, engineProgress?: any): void;
    private static show;
    static dispose(): void;
    private loadTutorials;
    private update;
    private buildHtml;
}
//# sourceMappingURL=connectionPanel.d.ts.map