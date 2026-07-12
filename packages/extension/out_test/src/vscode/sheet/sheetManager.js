"use strict";
/**
 * SQL Engine Laboratory — Sheet Manager
 *
 * Mantiene el estado en memoria de las hojas SQL abiertas.
 * Relaciona el URI del documento con el perfil de conexión activo para esa hoja.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SheetManager = void 0;
class SheetManager {
    // Mapa: document.uri.toString() -> ConnectionProfile
    sheetConnections = new Map();
    /**
     * Asocia una hoja (URI) con un perfil de conexión.
     */
    bindSheetToConnection(uri, profile) {
        this.sheetConnections.set(uri.toString(), profile);
    }
    /**
     * Obtiene el perfil de conexión asociado a la hoja (URI).
     */
    getConnectionForSheet(uri) {
        return this.sheetConnections.get(uri.toString());
    }
    /**
     * Limpia el estado cuando se cierra una hoja.
     */
    handleDocumentClosed(document) {
        if (document.languageId === 'sql') {
            this.sheetConnections.delete(document.uri.toString());
        }
    }
    /**
     * Limpia todos los estados.
     */
    dispose() {
        this.sheetConnections.clear();
    }
}
exports.SheetManager = SheetManager;
//# sourceMappingURL=sheetManager.js.map