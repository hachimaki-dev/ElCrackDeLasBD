/**
 * SQL Engine Laboratory — VS Code Configuration Provider
 *
 * Implementa la interfaz ConfigurationProvider de la capa Core,
 * actuando como un puente (Adapter) hacia los Settings nativos de VS Code.
 * De esta manera, el Core no depende de 'vscode'.
 */
import { ConfigurationProvider, EngineConfig } from '../core/engines/engine.types';
export declare class VsCodeConfigurationProvider implements ConfigurationProvider {
    getConfig(): EngineConfig;
}
//# sourceMappingURL=configProvider.d.ts.map