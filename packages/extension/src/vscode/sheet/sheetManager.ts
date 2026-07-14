/**
 * SQL Engine Laboratory — Sheet Manager
 *
 * Mantiene el estado en memoria de las hojas SQL abiertas.
 * Relaciona el URI del documento con el perfil de conexión activo para esa hoja.
 */

import * as vscode from 'vscode';
import { ConnectionProfile } from '../../core/credentials/vault';

export class SheetManager {
  // Mapa: document.uri.toString() -> ConnectionProfile
  private sheetConnections: Map<string, ConnectionProfile> = new Map();

  /**
   * Asocia una hoja (URI) con un perfil de conexión.
   */
  public bindSheetToConnection(uri: vscode.Uri, profile: ConnectionProfile): void {
    this.sheetConnections.set(uri.toString(), profile);
  }

  /**
   * Obtiene el perfil de conexión asociado a la hoja (URI).
   */
  public getConnectionForSheet(uri: vscode.Uri): ConnectionProfile | undefined {
    return this.sheetConnections.get(uri.toString());
  }

  /**
   * Limpia el estado cuando se cierra una hoja.
   */
  public handleDocumentClosed(document: vscode.TextDocument): void {
    if (document.languageId === 'sql') {
      this.sheetConnections.delete(document.uri.toString());
    }
  }

  /**
   * Obtiene el contenido de texto de la hoja asociada al sandbox activo.
   */
  public getSandboxSheetText(): string | undefined {
    for (const [uriStr, profile] of this.sheetConnections.entries()) {
      if (profile.id.startsWith('sandbox-')) {
        const doc = vscode.workspace.textDocuments.find(d => d.uri.toString() === uriStr);
        if (doc) {
          return doc.getText();
        }
      }
    }
    return undefined;
  }

  /**
   * Limpia todos los estados.
   */
  public dispose(): void {
    this.sheetConnections.clear();
  }
}
