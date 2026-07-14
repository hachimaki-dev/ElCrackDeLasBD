/**
 * SQL Engine Laboratory — Admin Service
 *
 * Servicio orquestador para la administración y exploración visual de bases de datos.
 */
import { EngineId, Result } from '../engines/engine.types';
import { ConnectionProfile, CredentialVault } from '../credentials/vault';
import { QueryRunner } from '../runner/queryRunner';
import { AdminMetadataReport, TablePreview, SavedCredentials } from './adminTypes';
export declare class AdminService {
    private queryRunner;
    private vault;
    private adapters;
    constructor(queryRunner: QueryRunner, vault: CredentialVault);
    private registerAdapter;
    private getAdapter;
    /**
     * Ejecuta una consulta administrativa e inyecta la contraseña correspondiente.
     */
    private runAdminQuery;
    /**
     * Ejecuta un comando SQL personalizado sobre la base de datos activa.
     */
    executeCommand(profile: ConnectionProfile, sqlText: string): Promise<Result<string>>;
    /**
     * Obtiene los metadatos completos de la base de datos (BDs, tablas, usuarios).
     */
    getMetadata(engineId: EngineId, profile: ConnectionProfile): Promise<Result<AdminMetadataReport>>;
    /**
     * Crea una nueva base de datos.
     */
    createDatabase(engineId: EngineId, profile: ConnectionProfile, name: string): Promise<Result<string>>;
    /**
     * Crea un nuevo usuario y guarda sus credenciales en el llavero/vault local.
     */
    createUser(engineId: EngineId, profile: ConnectionProfile, username: string, password?: string): Promise<Result<string>>;
    /**
     * Obtiene la estructura de columnas y las primeras 100 filas de una tabla.
     */
    getTablePreview(engineId: EngineId, profile: ConnectionProfile, tableName: string, schemaName?: string): Promise<Result<TablePreview>>;
    /**
     * Lista todas las credenciales y contraseñas guardadas para el llavero visual.
     */
    getSavedCredentials(engineId: EngineId, activeProfile?: ConnectionProfile): Promise<SavedCredentials[]>;
    /**
     * Obtiene la contraseña guardada para un usuario específico y un motor.
     */
    getPasswordForUser(engineId: EngineId, username: string): Promise<string | undefined>;
}
//# sourceMappingURL=adminService.d.ts.map