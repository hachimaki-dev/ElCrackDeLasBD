"use strict";
/**
 * SQL Engine Laboratory — Credential Vault
 *
 * Administra el almacenamiento seguro de perfiles de conexión.
 * Utiliza SecretStorage para contraseñas y GlobalState para metadata.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CredentialVault = void 0;
const PROFILES_KEY = 'sqlEngineLab.profiles';
class CredentialVault {
    secretStorage;
    globalState;
    constructor(secretStorage, globalState) {
        this.secretStorage = secretStorage;
        this.globalState = globalState;
    }
    /**
     * Obtiene la lista de perfiles guardados (sin contraseñas).
     */
    getProfiles() {
        return this.globalState.get(PROFILES_KEY, []);
    }
    /**
     * Obtiene un perfil específico por ID.
     */
    getProfile(id) {
        return this.getProfiles().find((p) => p.id === id);
    }
    /**
     * Guarda un nuevo perfil o actualiza uno existente.
     */
    async saveProfile(profile, password) {
        const profiles = this.getProfiles();
        const existingIndex = profiles.findIndex((p) => p.id === profile.id);
        if (existingIndex >= 0) {
            profiles[existingIndex] = profile;
        }
        else {
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
    async deleteProfile(id) {
        const profiles = this.getProfiles();
        const filtered = profiles.filter((p) => p.id !== id);
        await this.globalState.update(PROFILES_KEY, filtered);
        await this.secretStorage.delete(`profile_pwd_${id}`);
    }
    /**
     * Recupera la contraseña de un perfil de forma segura.
     */
    async getPassword(id) {
        return await this.secretStorage.get(`profile_pwd_${id}`);
    }
}
exports.CredentialVault = CredentialVault;
//# sourceMappingURL=vault.js.map