/**
 * SQL Engine Laboratory — Credential Vault
 *
 * Administra el almacenamiento seguro de perfiles de conexión.
 * Utiliza SecretStorage para contraseñas y GlobalState para metadata.
 */
import * as vscode from 'vscode';
import { EngineId } from '../engines/engine.types';
export interface ConnectionProfile {
    id: string;
    name: string;
    engineId: EngineId;
    user: string;
    database?: string;
    password?: string;
}
export declare class CredentialVault {
    private secretStorage;
    private globalState;
    constructor(secretStorage: vscode.SecretStorage, globalState: vscode.Memento);
    /**
     * Obtiene la lista de perfiles guardados (sin contraseñas).
     */
    getProfiles(): ConnectionProfile[];
    /**
     * Obtiene un perfil específico por ID.
     */
    getProfile(id: string): ConnectionProfile | undefined;
    /**
     * Guarda un nuevo perfil o actualiza uno existente.
     */
    saveProfile(profile: ConnectionProfile, password?: string): Promise<void>;
    /**
     * Elimina un perfil y su contraseña asociada.
     */
    deleteProfile(id: string): Promise<void>;
    /**
     * Recupera la contraseña de un perfil de forma segura.
     */
    getPassword(id: string): Promise<string | undefined>;
}
//# sourceMappingURL=vault.d.ts.map