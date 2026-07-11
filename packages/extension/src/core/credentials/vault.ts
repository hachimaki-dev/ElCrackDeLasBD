/**
 * SQL Engine Laboratory — Credential Vault
 *
 * Administra el almacenamiento seguro de perfiles de conexión.
 * Utiliza SecretStorage para contraseñas y GlobalState para metadata.
 */

import * as vscode from 'vscode';
import { EngineId } from '../engines/engine.types';

export interface ConnectionProfile {
  id: string; // ID único (ej. UUID o nombre normalizado)
  name: string; // Nombre amigable (ej. "Mi BD Local")
  engineId: EngineId;
  user: string;
  database?: string;
  password?: string;
}

const PROFILES_KEY = 'sqlEngineLab.profiles';

export class CredentialVault {
  constructor(
    private secretStorage: vscode.SecretStorage,
    private globalState: vscode.Memento
  ) {}

  /**
   * Obtiene la lista de perfiles guardados (sin contraseñas).
   */
  public getProfiles(): ConnectionProfile[] {
    return this.globalState.get<ConnectionProfile[]>(PROFILES_KEY, []);
  }

  /**
   * Obtiene un perfil específico por ID.
   */
  public getProfile(id: string): ConnectionProfile | undefined {
    return this.getProfiles().find((p) => p.id === id);
  }

  /**
   * Guarda un nuevo perfil o actualiza uno existente.
   */
  public async saveProfile(profile: ConnectionProfile, password?: string): Promise<void> {
    const profiles = this.getProfiles();
    const existingIndex = profiles.findIndex((p) => p.id === profile.id);

    if (existingIndex >= 0) {
      profiles[existingIndex] = profile;
    } else {
      profiles.push(profile);
    }

    await this.globalState.update(PROFILES_KEY, profiles);

    if (password) {
      await this.secretStorage.store(`profile_pwd_${profile.id}`, password);
    }
  }

  /**
   * Elimina un perfil y su contraseña asociada.
   */
  public async deleteProfile(id: string): Promise<void> {
    const profiles = this.getProfiles();
    const filtered = profiles.filter((p) => p.id !== id);
    await this.globalState.update(PROFILES_KEY, filtered);
    await this.secretStorage.delete(`profile_pwd_${id}`);
  }

  /**
   * Recupera la contraseña de un perfil de forma segura.
   */
  public async getPassword(id: string): Promise<string | undefined> {
    return await this.secretStorage.get(`profile_pwd_${id}`);
  }
}
