/**
 * SQL Engine Laboratory — Sheet Manager
 *
 * Mantiene el estado en memoria de las hojas SQL abiertas.
 * Relaciona el URI del documento con el perfil de conexión activo para esa hoja.
 */
import * as vscode from 'vscode';
import { ConnectionProfile } from '../../core/credentials/vault';
export declare class SheetManager {
    private sheetConnections;
    /**
     * Asocia una hoja (URI) con un perfil de conexión.
     */
    bindSheetToConnection(uri: vscode.Uri, profile: ConnectionProfile): void;
    /**
     * Obtiene el perfil de conexión asociado a la hoja (URI).
     */
    getConnectionForSheet(uri: vscode.Uri): ConnectionProfile | undefined;
    /**
     * Limpia el estado cuando se cierra una hoja.
     */
    handleDocumentClosed(document: vscode.TextDocument): void;
    /**
     * Limpia todos los estados.
     */
    dispose(): void;
}
//# sourceMappingURL=sheetManager.d.ts.map