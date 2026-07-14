"use strict";
/**
 * SQL Engine Laboratory — Admin Service
 *
 * Servicio orquestador para la administración y exploración visual de bases de datos.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const engine_types_1 = require("../engines/engine.types");
const registry_1 = require("../engines/registry");
const adminAdapters_1 = require("./adminAdapters");
class AdminService {
    queryRunner;
    vault;
    adapters = new Map();
    constructor(queryRunner, vault) {
        this.queryRunner = queryRunner;
        this.vault = vault;
        // Registrar los adaptadores soportados
        this.registerAdapter(new adminAdapters_1.PostgresAdmin());
        this.registerAdapter(new adminAdapters_1.MySqlAdmin('mysql'));
        this.registerAdapter(new adminAdapters_1.MySqlAdmin('mariadb'));
        this.registerAdapter(new adminAdapters_1.SqliteAdmin());
        this.registerAdapter(new adminAdapters_1.SqlServerAdmin());
        this.registerAdapter(new adminAdapters_1.OracleAdmin());
    }
    registerAdapter(adapter) {
        this.adapters.set(adapter.engineId, adapter);
    }
    getAdapter(engineId) {
        const adapter = this.adapters.get(engineId);
        if (!adapter) {
            throw new Error(`No se encontró un adaptador de administración para el motor: ${engineId}`);
        }
        return adapter;
    }
    /**
     * Ejecuta una consulta administrativa e inyecta la contraseña correspondiente.
     */
    async runAdminQuery(profile, sqlText) {
        const vaultPassword = await this.vault.getPassword(profile.id);
        const execProfile = {
            ...profile,
            password: vaultPassword || profile.password,
        };
        return await this.queryRunner.runQuery(execProfile, sqlText);
    }
    /**
     * Ejecuta un comando SQL personalizado sobre la base de datos activa.
     */
    async executeCommand(profile, sqlText) {
        return await this.runAdminQuery(profile, sqlText);
    }
    /**
     * Obtiene los metadatos completos de la base de datos (BDs, tablas, usuarios).
     */
    async getMetadata(engineId, profile) {
        try {
            const adapter = this.getAdapter(engineId);
            // 1. Obtener bases de datos
            let databases = [];
            const dbResult = await this.runAdminQuery(profile, adapter.getDatabasesQuery());
            if (dbResult.ok) {
                databases = adapter.parseDatabases(dbResult.value);
            }
            // 2. Obtener tablas
            let tables = [];
            const tblResult = await this.runAdminQuery(profile, adapter.getTablesQuery());
            if (tblResult.ok) {
                tables = adapter.parseTables(tblResult.value);
            }
            // 3. Obtener usuarios
            let users = [];
            const usrResult = await this.runAdminQuery(profile, adapter.getUsersQuery());
            if (usrResult.ok) {
                users = adapter.parseUsers(usrResult.value);
            }
            return (0, engine_types_1.success)({
                databases,
                tables,
                users,
            });
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return (0, engine_types_1.failure)({
                code: 'QUERY_EXECUTION_FAILED',
                message: `Error al obtener metadatos de administración: ${msg}`,
            });
        }
    }
    /**
     * Crea una nueva base de datos.
     */
    async createDatabase(engineId, profile, name) {
        try {
            const adapter = this.getAdapter(engineId);
            let query = '';
            if (engineId === 'sqlite') {
                // En SQLite, usamos la consulta ATTACH para crear y asociar un nuevo archivo
                query = `ATTACH DATABASE '/data/${name}.sqlite' AS "${name}";`;
            }
            else {
                query = adapter.getCreateDatabaseQuery(name);
            }
            const result = await this.runAdminQuery(profile, query);
            if (result.ok) {
                return (0, engine_types_1.success)(`Base de datos '${name}' creada con éxito.`);
            }
            else {
                return (0, engine_types_1.failure)(result.error);
            }
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return (0, engine_types_1.failure)({
                code: 'QUERY_EXECUTION_FAILED',
                message: `Error al crear la base de datos: ${msg}`,
            });
        }
    }
    /**
     * Crea un nuevo usuario y guarda sus credenciales en el llavero/vault local.
     */
    async createUser(engineId, profile, username, password) {
        try {
            const adapter = this.getAdapter(engineId);
            const query = adapter.getCreateUserQuery(username, password);
            const result = await this.runAdminQuery(profile, query);
            if (result.ok) {
                // Guardar en el vault local de perfiles para que aparezca en el visualizador de contraseñas
                const newProfileId = `user-${engineId}-${username}`;
                await this.vault.saveProfile({
                    id: newProfileId,
                    name: `Acceso: ${username} (${engineId})`,
                    engineId,
                    user: username,
                    database: profile.database,
                }, password || 'LabPassword123!');
                return (0, engine_types_1.success)(`Usuario '${username}' creado con éxito y registrado en el llavero.`);
            }
            else {
                return (0, engine_types_1.failure)(result.error);
            }
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return (0, engine_types_1.failure)({
                code: 'QUERY_EXECUTION_FAILED',
                message: `Error al crear el usuario: ${msg}`,
            });
        }
    }
    /**
     * Obtiene la estructura de columnas y las primeras 100 filas de una tabla.
     */
    async getTablePreview(engineId, profile, tableName, schemaName) {
        try {
            const adapter = this.getAdapter(engineId);
            const query = adapter.getTablePreviewQuery(tableName, schemaName);
            const result = await this.runAdminQuery(profile, query);
            if (result.ok) {
                const preview = adapter.parseTablePreview(result.value);
                return (0, engine_types_1.success)(preview);
            }
            else {
                return (0, engine_types_1.failure)(result.error);
            }
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return (0, engine_types_1.failure)({
                code: 'QUERY_EXECUTION_FAILED',
                message: `Error al obtener vista previa de tabla: ${msg}`,
            });
        }
    }
    /**
     * Lista todas las credenciales y contraseñas guardadas para el llavero visual.
     */
    async getSavedCredentials(engineId, activeProfile) {
        const list = [];
        const engineDef = (0, registry_1.getEngineById)(engineId);
        // 1. Añadir el superusuario administrador por defecto del motor
        if (engineDef) {
            const adminUser = engineDef.connectionTemplate.adminUser;
            if (adminUser) {
                let adminPass = engineDef.connectionTemplate.adminPassword || '';
                // Si la contraseña admin de SQL Server o Postgres fue configurada por el usuario en settings, tomar esa
                if (activeProfile && activeProfile.user === adminUser) {
                    adminPass = activeProfile.password || '';
                }
                list.push({
                    id: `default-admin-${engineId}`,
                    engineId,
                    username: adminUser,
                    database: engineDef.connectionTemplate.defaultDatabase,
                    password: adminPass || 'Configurada en arranque',
                    label: 'Administrador del Sistema (sa/root/postgres)',
                });
            }
            // 2. Añadir el usuario de pruebas estándar del laboratorio (labuser)
            if (activeProfile) {
                list.push({
                    id: `default-standard-${engineId}`,
                    engineId,
                    username: activeProfile.user,
                    database: activeProfile.database,
                    password: activeProfile.password || 'LabPassword123!',
                    label: 'Usuario Estándar de Laboratorio (labuser)',
                });
            }
        }
        // 3. Añadir credenciales adicionales creadas desde el explorador por el usuario
        const savedProfiles = this.vault.getProfiles().filter(p => p.engineId === engineId && p.id.startsWith('user-'));
        for (const p of savedProfiles) {
            const pwd = await this.vault.getPassword(p.id);
            list.push({
                id: p.id,
                engineId: p.engineId,
                username: p.user,
                database: p.database,
                password: pwd || '********',
                label: 'Usuario Personalizado Creado en Lab',
            });
        }
        return list;
    }
    /**
     * Obtiene la contraseña guardada para un usuario específico y un motor.
     */
    async getPasswordForUser(engineId, username) {
        const savedProfiles = this.vault.getProfiles().filter(p => p.engineId === engineId && p.user === username);
        if (savedProfiles.length > 0) {
            return await this.vault.getPassword(savedProfiles[0].id);
        }
        return undefined;
    }
}
exports.AdminService = AdminService;
//# sourceMappingURL=adminService.js.map