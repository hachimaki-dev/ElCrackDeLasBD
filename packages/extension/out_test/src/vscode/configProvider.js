"use strict";
/**
 * SQL Engine Laboratory — VS Code Configuration Provider
 *
 * Implementa la interfaz ConfigurationProvider de la capa Core,
 * actuando como un puente (Adapter) hacia los Settings nativos de VS Code.
 * De esta manera, el Core no depende de 'vscode'.
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
exports.VsCodeConfigurationProvider = void 0;
const vscode = __importStar(require("vscode"));
class VsCodeConfigurationProvider {
    getConfig() {
        const config = vscode.workspace.getConfiguration('sqlEngineLab.credentials');
        return {
            labUser: config.get('labUser', 'labuser'),
            labPassword: config.get('labPassword', 'labpassword'),
            labDatabase: config.get('labDatabase', 'labdb'),
        };
    }
}
exports.VsCodeConfigurationProvider = VsCodeConfigurationProvider;
//# sourceMappingURL=configProvider.js.map