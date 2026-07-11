/**
 * SQL Engine Laboratory — VS Code Configuration Provider
 *
 * Implementa la interfaz ConfigurationProvider de la capa Core,
 * actuando como un puente (Adapter) hacia los Settings nativos de VS Code.
 * De esta manera, el Core no depende de 'vscode'.
 */

import * as vscode from 'vscode';
import { ConfigurationProvider, EngineConfig } from '../core/engines/engine.types';

export class VsCodeConfigurationProvider implements ConfigurationProvider {
  getConfig(): EngineConfig {
    const config = vscode.workspace.getConfiguration('sqlEngineLab.credentials');
    
    return {
      labUser: config.get<string>('labUser', 'labuser'),
      labPassword: config.get<string>('labPassword', 'labpassword'),
      labDatabase: config.get<string>('labDatabase', 'labdb'),
    };
  }
}
