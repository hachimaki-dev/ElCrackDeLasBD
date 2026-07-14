"use strict";
/**
 * SQL Engine Laboratory — Sheet Manager
 *
 * Mantiene el estado en memoria de las hojas SQL abiertas.
 * Relaciona el URI del documento con el perfil de conexión activo para esa hoja.
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
exports.SheetManager = void 0;
const vscode = __importStar(require("vscode"));
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
     * Obtiene el contenido de texto de la hoja asociada al sandbox activo.
     */
    getSandboxSheetText() {
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
    dispose() {
        this.sheetConnections.clear();
    }
}
exports.SheetManager = SheetManager;
//# sourceMappingURL=sheetManager.js.map