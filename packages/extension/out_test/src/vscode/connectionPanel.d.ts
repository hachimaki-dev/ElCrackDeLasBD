/**
 * SQL Engine Laboratory — Connection Panel Webview
 *
 * Webview panel que muestra los datos de conexión cuando un motor está corriendo:
 * - Host, puerto, usuario, password
 * - Comando de conexión completo listo para copiar
 * - Botón "Copiar comando" con feedback visual
 *
 * El panel se muestra automáticamente cuando un motor arranca exitosamente.
 */
import * as vscode from 'vscode';
import { ConnectionInfo, EngineDefinition } from '../core/engines/engine.types';
/**
 * Panel Webview que muestra información de conexión de un motor SQL activo.
 * Solo puede existir una instancia a la vez (singleton por sesión de extensión).
 */
export declare class ConnectionPanel {
    private static currentPanel;
    private readonly panel;
    private constructor();
    /**
     * Crea o revela el panel de conexión.
     * Si ya existe, lo actualiza con los nuevos datos.
     *
     * @param extensionUri - URI de la extensión para resolución de recursos
     * @param engine - Definición del motor activo
     * @param connectionInfo - Datos de conexión del motor
     */
    static createOrReveal(extensionUri: vscode.Uri, engine: EngineDefinition, connectionInfo: ConnectionInfo): void;
    /**
     * Cierra el panel si está abierto.
     */
    static dispose(): void;
    private update;
    private buildHtml;
    private escape;
}
//# sourceMappingURL=connectionPanel.d.ts.map