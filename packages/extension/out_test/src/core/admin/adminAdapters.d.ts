/**
 * SQL Engine Laboratory — Admin Adapters
 *
 * Adaptadores específicos por motor para obtener metadatos y ejecutar
 * comandos de administración (Open/Closed Principle).
 */
import { EngineId } from '../engines/engine.types';
import { DatabaseMetadata, TableMetadata, UserMetadata, TablePreview } from './adminTypes';
/**
 * Interfaz que define las operaciones de administración para un motor.
 */
export interface DbAdminAdapter {
    readonly engineId: EngineId;
    getDatabasesQuery(): string;
    parseDatabases(stdout: string): DatabaseMetadata[];
    getCreateDatabaseQuery(name: string): string;
    getTablesQuery(): string;
    parseTables(stdout: string): TableMetadata[];
    getTablePreviewQuery(tableName: string, schemaName?: string): string;
    parseTablePreview(stdout: string): TablePreview;
    getUsersQuery(): string;
    parseUsers(stdout: string): UserMetadata[];
    getCreateUserQuery(username: string, password?: string): string;
}
export declare class PostgresAdmin implements DbAdminAdapter {
    readonly engineId = "postgres";
    getDatabasesQuery(): string;
    parseDatabases(stdout: string): DatabaseMetadata[];
    getCreateDatabaseQuery(name: string): string;
    getTablesQuery(): string;
    parseTables(stdout: string): TableMetadata[];
    getTablePreviewQuery(tableName: string, schemaName?: string): string;
    parseTablePreview(stdout: string): TablePreview;
    getUsersQuery(): string;
    parseUsers(stdout: string): UserMetadata[];
    getCreateUserQuery(username: string, password?: string): string;
}
export declare class MySqlAdmin implements DbAdminAdapter {
    readonly engineId: 'mysql' | 'mariadb';
    constructor(engineId?: 'mysql' | 'mariadb');
    getDatabasesQuery(): string;
    parseDatabases(stdout: string): DatabaseMetadata[];
    getCreateDatabaseQuery(name: string): string;
    getTablesQuery(): string;
    parseTables(stdout: string): TableMetadata[];
    getTablePreviewQuery(tableName: string, schemaName?: string): string;
    parseTablePreview(stdout: string): TablePreview;
    getUsersQuery(): string;
    parseUsers(stdout: string): UserMetadata[];
    getCreateUserQuery(username: string, password?: string): string;
}
export declare class SqliteAdmin implements DbAdminAdapter {
    readonly engineId = "sqlite";
    getDatabasesQuery(): string;
    parseDatabases(stdout: string): DatabaseMetadata[];
    getCreateDatabaseQuery(_name: string): string;
    getTablesQuery(): string;
    parseTables(stdout: string): TableMetadata[];
    getTablePreviewQuery(tableName: string, _schemaName?: string): string;
    parseTablePreview(stdout: string): TablePreview;
    getUsersQuery(): string;
    parseUsers(_stdout: string): UserMetadata[];
    getCreateUserQuery(_username: string, _password?: string): string;
}
export declare class SqlServerAdmin implements DbAdminAdapter {
    readonly engineId = "sqlserver";
    getDatabasesQuery(): string;
    parseDatabases(stdout: string): DatabaseMetadata[];
    getCreateDatabaseQuery(name: string): string;
    getTablesQuery(): string;
    parseTables(stdout: string): TableMetadata[];
    getTablePreviewQuery(tableName: string, schemaName?: string): string;
    parseTablePreview(stdout: string): TablePreview;
    getUsersQuery(): string;
    parseUsers(stdout: string): UserMetadata[];
    getCreateUserQuery(username: string, password?: string): string;
}
export declare class OracleAdmin implements DbAdminAdapter {
    readonly engineId = "oracle";
    getDatabasesQuery(): string;
    parseDatabases(stdout: string): DatabaseMetadata[];
    getCreateDatabaseQuery(_name: string): string;
    getTablesQuery(): string;
    parseTables(stdout: string): TableMetadata[];
    getTablePreviewQuery(tableName: string, schemaName?: string): string;
    parseTablePreview(stdout: string): TablePreview;
    getUsersQuery(): string;
    parseUsers(stdout: string): UserMetadata[];
    getCreateUserQuery(username: string, password?: string): string;
}
//# sourceMappingURL=adminAdapters.d.ts.map