"use strict";
/**
 * SQL Engine Laboratory — Admin Adapters
 *
 * Adaptadores específicos por motor para obtener metadatos y ejecutar
 * comandos de administración (Open/Closed Principle).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OracleAdmin = exports.SqlServerAdmin = exports.SqliteAdmin = exports.MySqlAdmin = exports.PostgresAdmin = void 0;
// ==========================================================================
// Helper de Parseo Genérico
// ==========================================================================
/**
 * Normaliza y divide el output de la consola en filas y columnas limpias.
 * Soporta formatos tabulados de psql (pipe-separated), mysql (tab-separated) y sqlite3 (pipe-separated sin header).
 */
function parsePlainTable(stdout, separator = /\t/) {
    const lines = stdout.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
    return lines.map(line => {
        if (typeof separator === 'string') {
            return line.split(separator).map(cell => cell.trim());
        }
        else {
            return line.split(separator).map(cell => cell.trim());
        }
    });
}
/**
 * Parsea el formato tabular por defecto de PostgreSQL (psql):
 *  col1 | col2
 * ------+------
 *  val1 | val2
 * (X rows)
 */
function parsePostgresTable(stdout) {
    const lines = stdout.split(/\r?\n/).map(line => line.trim());
    const rows = [];
    for (const line of lines) {
        // Omitir líneas vacías, decoradores de fila (+ o -) y conteo de filas (X rows)
        if (!line || line.startsWith('(') || line.includes('---+---') || line.match(/^-+$/)) {
            continue;
        }
        const cols = line.split('|').map(c => c.trim());
        rows.push(cols);
    }
    return rows;
}
// ==========================================================================
// Postgres Adapter
// ==========================================================================
class PostgresAdmin {
    engineId = 'postgres';
    getDatabasesQuery() {
        return `SELECT datname FROM pg_database WHERE datistemplate = false;`;
    }
    parseDatabases(stdout) {
        const raw = parsePostgresTable(stdout);
        if (raw.length <= 1)
            return []; // Solo cabecera o vacío
        // La primera fila es el header (datname)
        return raw.slice(1).map(row => ({ name: row[0] })).filter(db => db.name && db.name !== 'datname');
    }
    getCreateDatabaseQuery(name) {
        // psql no permite CREATE DATABASE en bloques transaccionales, se ejecuta normal
        return `CREATE DATABASE "${name}";`;
    }
    getTablesQuery() {
        return `SELECT table_schema, table_name FROM information_schema.tables 
            WHERE table_schema NOT IN ('pg_catalog', 'information_schema') AND table_type = 'BASE TABLE'
            ORDER BY table_schema, table_name;`;
    }
    parseTables(stdout) {
        const raw = parsePostgresTable(stdout);
        if (raw.length <= 1)
            return [];
        return raw.slice(1)
            .map(row => ({ schema: row[0], name: row[1] }))
            .filter(t => t.name && t.name !== 'table_name');
    }
    getTablePreviewQuery(tableName, schemaName = 'public') {
        // Obtenemos definición de columnas y primeros datos
        return `
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_schema = '${schemaName}' AND table_name = '${tableName}'
      ORDER BY ordinal_position;
      --SPLIT--
      SELECT * FROM "${schemaName}"."${tableName}" LIMIT 100;
    `;
    }
    parseTablePreview(stdout) {
        // Separamos el output si viene de dos consultas
        const parts = stdout.split('--SPLIT--');
        const colsOutput = parts[0] || stdout;
        const rowsOutput = parts[1] || '';
        const colsRaw = parsePostgresTable(colsOutput);
        const columns = colsRaw.slice(1)
            .map(row => ({
            name: row[0],
            dataType: row[1],
            isNullable: row[2]?.toLowerCase() === 'yes',
        }))
            .filter(c => c.name && c.name !== 'column_name');
        if (!rowsOutput.trim()) {
            return { columns, rows: [] };
        }
        const rowsRaw = parsePostgresTable(rowsOutput);
        if (rowsRaw.length <= 1) {
            return { columns, rows: [] };
        }
        const headers = rowsRaw[0];
        const rows = rowsRaw.slice(1).map(row => {
            const obj = {};
            headers.forEach((header, idx) => {
                if (header) {
                    obj[header] = row[idx] ?? null;
                }
            });
            return obj;
        });
        return { columns, rows };
    }
    getUsersQuery() {
        return `SELECT usename, usesuper FROM pg_user;`;
    }
    parseUsers(stdout) {
        const raw = parsePostgresTable(stdout);
        if (raw.length <= 1)
            return [];
        return raw.slice(1)
            .map(row => ({
            username: row[0],
            isAdmin: row[1]?.trim() === 't' || row[1]?.trim() === 'true',
        }))
            .filter(u => u.username && u.username !== 'usename');
    }
    getCreateUserQuery(username, password) {
        const pass = password ? ` WITH PASSWORD '${password}'` : '';
        return `CREATE USER "${username}"${pass};`;
    }
}
exports.PostgresAdmin = PostgresAdmin;
// ==========================================================================
// MySQL / MariaDB Adapter
// ==========================================================================
class MySqlAdmin {
    engineId;
    constructor(engineId = 'mysql') {
        this.engineId = engineId;
    }
    getDatabasesQuery() {
        return `SHOW DATABASES;`;
    }
    parseDatabases(stdout) {
        const raw = parsePlainTable(stdout);
        if (raw.length <= 1)
            return [];
        return raw.slice(1)
            .map(row => ({ name: row[0] }))
            .filter(db => db.name && db.name !== 'Database');
    }
    getCreateDatabaseQuery(name) {
        return `CREATE DATABASE \`${name}\`;`;
    }
    getTablesQuery() {
        return `SELECT table_schema, table_name FROM information_schema.tables 
            WHERE table_schema NOT IN ('mysql', 'information_schema', 'performance_schema', 'sys') 
            AND table_type = 'BASE TABLE'
            ORDER BY table_schema, table_name;`;
    }
    parseTables(stdout) {
        const raw = parsePlainTable(stdout);
        if (raw.length <= 1)
            return [];
        return raw.slice(1)
            .map(row => ({ schema: row[0], name: row[1] }))
            .filter(t => t.name && t.name !== 'table_name');
    }
    getTablePreviewQuery(tableName, schemaName) {
        const dbPrefix = schemaName ? `\`${schemaName}\`.` : '';
        const dbFilter = schemaName ? `AND table_schema = '${schemaName}'` : '';
        return `
      SELECT column_name, data_type, is_nullable, column_key
      FROM information_schema.columns 
      WHERE table_name = '${tableName}' ${dbFilter}
      ORDER BY ordinal_position;
      --SPLIT--
      SELECT * FROM ${dbPrefix}\`${tableName}\` LIMIT 100;
    `;
    }
    parseTablePreview(stdout) {
        const parts = stdout.split('--SPLIT--');
        const colsOutput = parts[0] || stdout;
        const rowsOutput = parts[1] || '';
        const colsRaw = parsePlainTable(colsOutput);
        const columns = colsRaw.slice(1)
            .map(row => ({
            name: row[0],
            dataType: row[1],
            isNullable: row[2]?.toLowerCase() === 'yes',
            keyType: row[3] === 'PRI' ? 'primary' : undefined,
        }))
            .filter(c => c.name && c.name !== 'column_name');
        if (!rowsOutput.trim()) {
            return { columns, rows: [] };
        }
        const rowsRaw = parsePlainTable(rowsOutput);
        if (rowsRaw.length <= 1) {
            return { columns, rows: [] };
        }
        const headers = rowsRaw[0];
        const rows = rowsRaw.slice(1).map(row => {
            const obj = {};
            headers.forEach((header, idx) => {
                if (header) {
                    obj[header] = row[idx] ?? null;
                }
            });
            return obj;
        });
        return { columns, rows };
    }
    getUsersQuery() {
        return `SELECT user, host FROM mysql.user;`;
    }
    parseUsers(stdout) {
        const raw = parsePlainTable(stdout);
        if (raw.length <= 1)
            return [];
        return raw.slice(1)
            .map(row => ({
            username: row[0],
            host: row[1],
            isAdmin: row[0] === 'root',
        }))
            .filter(u => u.username && u.username !== 'user');
    }
    getCreateUserQuery(username, password) {
        const pass = password ? ` IDENTIFIED BY '${password}'` : '';
        return `
      CREATE USER '${username}'@'%'${pass};
      GRANT ALL PRIVILEGES ON *.* TO '${username}'@'%';
      FLUSH PRIVILEGES;
    `;
    }
}
exports.MySqlAdmin = MySqlAdmin;
// ==========================================================================
// SQLite Adapter
// ==========================================================================
class SqliteAdmin {
    engineId = 'sqlite';
    getDatabasesQuery() {
        return `PRAGMA database_list;`;
    }
    parseDatabases(stdout) {
        // sqlite3 output: seq|name|file
        // 0|main|/data/database.sqlite
        const raw = parsePlainTable(stdout, '|');
        return raw.map(row => ({
            name: row[1] || 'main',
            size: row[2] ? 'Archivo local' : undefined
        })).filter(db => db.name);
    }
    getCreateDatabaseQuery(_name) {
        // sqlite3 no puede crear BDs dinámicamente con SQL simple.
        // Retornamos un log y manejamos la creación de archivo en el AdminService
        return `SELECT 'SQLite requiere crear un nuevo archivo';`;
    }
    getTablesQuery() {
        return `SELECT 'main' AS tbl_schema, name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';`;
    }
    parseTables(stdout) {
        const raw = parsePlainTable(stdout, '|');
        return raw.map(row => ({
            schema: row[0] || 'main',
            name: row[1],
        })).filter(t => t.name);
    }
    getTablePreviewQuery(tableName, _schemaName) {
        return `
      PRAGMA table_info("${tableName}");
      --SPLIT--
      SELECT * FROM "${tableName}" LIMIT 100;
    `;
    }
    parseTablePreview(stdout) {
        const parts = stdout.split('--SPLIT--');
        const colsOutput = parts[0] || stdout;
        const rowsOutput = parts[1] || '';
        // PRAGMA table_info output: cid|name|type|notnull|dflt_value|pk
        const colsRaw = parsePlainTable(colsOutput, '|');
        const columns = colsRaw.map(row => ({
            name: row[1],
            dataType: row[2],
            isNullable: row[3] === '0', // 1 = NOT NULL, 0 = NULL
            keyType: row[5] === '1' ? 'primary' : undefined,
        })).filter(c => c.name);
        if (!rowsOutput.trim()) {
            return { columns, rows: [] };
        }
        // sqlite3 no retorna cabeceras por defecto si hacemos select simple sin .headers on.
        // Pero en el shell de sqlite pasamos comandos. Si no hay cabeceras, usamos los nombres de columnas que leímos en table_info.
        const rowsRaw = parsePlainTable(rowsOutput, '|');
        const rows = rowsRaw.map(row => {
            const obj = {};
            columns.forEach((col, idx) => {
                obj[col.name] = row[idx] ?? null;
            });
            return obj;
        });
        return { columns, rows };
    }
    getUsersQuery() {
        return `SELECT 'admin' AS username, 1 AS is_admin;`;
    }
    parseUsers(_stdout) {
        return [
            {
                username: 'default (Local)',
                isAdmin: true,
                roles: ['owner'],
            }
        ];
    }
    getCreateUserQuery(_username, _password) {
        return `SELECT 'SQLite no soporta múltiples usuarios nativos';`;
    }
}
exports.SqliteAdmin = SqliteAdmin;
// ==========================================================================
// SQL Server Adapter
// ==========================================================================
class SqlServerAdmin {
    engineId = 'sqlserver';
    getDatabasesQuery() {
        return `SELECT name FROM sys.databases WHERE name NOT IN ('master', 'tempdb', 'model', 'msdb');`;
    }
    parseDatabases(stdout) {
        const raw = parsePlainTable(stdout);
        if (raw.length <= 1)
            return [];
        return raw.slice(1).map(row => ({ name: row[0] })).filter(db => db.name && db.name !== 'name');
    }
    getCreateDatabaseQuery(name) {
        return `CREATE DATABASE [${name}];`;
    }
    getTablesQuery() {
        return `SELECT SCHEMA_NAME(schema_id) AS table_schema, name AS table_name FROM sys.tables ORDER BY table_schema, name;`;
    }
    parseTables(stdout) {
        const raw = parsePlainTable(stdout);
        if (raw.length <= 1)
            return [];
        return raw.slice(1)
            .map(row => ({ schema: row[0], name: row[1] }))
            .filter(t => t.name && t.name !== 'table_name');
    }
    getTablePreviewQuery(tableName, schemaName = 'dbo') {
        return `
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = '${schemaName}' AND TABLE_NAME = '${tableName}';
      --SPLIT--
      SELECT TOP 100 * FROM [${schemaName}].[${tableName}];
    `;
    }
    parseTablePreview(stdout) {
        const parts = stdout.split('--SPLIT--');
        const colsOutput = parts[0] || stdout;
        const rowsOutput = parts[1] || '';
        const colsRaw = parsePlainTable(colsOutput);
        const columns = colsRaw.slice(1)
            .map(row => ({
            name: row[0],
            dataType: row[1],
            isNullable: row[2]?.toUpperCase() === 'YES',
        }))
            .filter(c => c.name && c.name !== 'COLUMN_NAME');
        if (!rowsOutput.trim()) {
            return { columns, rows: [] };
        }
        const rowsRaw = parsePlainTable(rowsOutput);
        if (rowsRaw.length <= 1) {
            return { columns, rows: [] };
        }
        const headers = rowsRaw[0];
        const rows = rowsRaw.slice(1).map(row => {
            const obj = {};
            headers.forEach((header, idx) => {
                if (header) {
                    obj[header] = row[idx] ?? null;
                }
            });
            return obj;
        });
        return { columns, rows };
    }
    getUsersQuery() {
        return `SELECT name, type_desc FROM sys.server_principals WHERE type_desc = 'SQL_LOGIN';`;
    }
    parseUsers(stdout) {
        const raw = parsePlainTable(stdout);
        if (raw.length <= 1)
            return [];
        return raw.slice(1)
            .map(row => ({
            username: row[0],
            isAdmin: row[0]?.toLowerCase() === 'sa',
        }))
            .filter(u => u.username && u.username !== 'name');
    }
    getCreateUserQuery(username, password) {
        const pass = password ? ` WITH PASSWORD = '${password}'` : '';
        return `
      CREATE LOGIN [${username}]${pass};
      CREATE USER [${username}] FOR LOGIN [${username}];
      ALTER SERVER ROLE [sysadmin] ADD MEMBER [${username}];
    `;
    }
}
exports.SqlServerAdmin = SqlServerAdmin;
// ==========================================================================
// Oracle Free Adapter
// ==========================================================================
class OracleAdmin {
    engineId = 'oracle';
    getDatabasesQuery() {
        // Oracle usa esquemas, pero podemos mostrar el PDB activo
        return `SELECT name FROM v$pdbs;`;
    }
    parseDatabases(stdout) {
        const raw = parsePlainTable(stdout);
        if (raw.length <= 1)
            return [];
        return raw.slice(1).map(row => ({ name: row[0] })).filter(db => db.name && db.name !== 'NAME');
    }
    getCreateDatabaseQuery(_name) {
        // En Oracle Free no se crean PDBs al vuelo habitualmente,
        // se crean usuarios/esquemas. Devolvemos una query nula con explicación
        return `SELECT 'Oracle Free opera a nivel de Esquemas / Usuarios' FROM dual;`;
    }
    getTablesQuery() {
        return `SELECT owner, table_name FROM all_tables 
            WHERE owner NOT IN ('SYS', 'SYSTEM', 'OUTLN', 'DBA', 'APPQOSSYS', 'CTXSYS', 'DVSYS', 'GSMADMIN_INTERNAL', 'LBACSYS', 'MDSYS', 'OJVMSYS', 'OLAPSYS', 'ORDDATA', 'ORDSYS', 'XDB', 'WMSYS') 
            ORDER BY owner, table_name;`;
    }
    parseTables(stdout) {
        const raw = parsePlainTable(stdout);
        if (raw.length <= 1)
            return [];
        return raw.slice(1)
            .map(row => ({ schema: row[0], name: row[1] }))
            .filter(t => t.name && t.name !== 'TABLE_NAME');
    }
    getTablePreviewQuery(tableName, schemaName) {
        const ownerFilter = schemaName ? `AND owner = '${schemaName.toUpperCase()}'` : '';
        const ownerPrefix = schemaName ? `"${schemaName.toUpperCase()}".` : '';
        return `
      SELECT column_name, data_type, nullable 
      FROM all_tab_columns 
      WHERE table_name = '${tableName.toUpperCase()}' ${ownerFilter}
      ORDER BY column_id;
      --SPLIT--
      SELECT * FROM ${ownerPrefix}"${tableName.toUpperCase()}" WHERE ROWNUM <= 100;
    `;
    }
    parseTablePreview(stdout) {
        const parts = stdout.split('--SPLIT--');
        const colsOutput = parts[0] || stdout;
        const rowsOutput = parts[1] || '';
        const colsRaw = parsePlainTable(colsOutput);
        const columns = colsRaw.slice(1)
            .map(row => ({
            name: row[0],
            dataType: row[1],
            isNullable: row[2] === 'Y',
        }))
            .filter(c => c.name && c.name !== 'COLUMN_NAME');
        if (!rowsOutput.trim()) {
            return { columns, rows: [] };
        }
        const rowsRaw = parsePlainTable(rowsOutput);
        if (rowsRaw.length <= 1) {
            return { columns, rows: [] };
        }
        const headers = rowsRaw[0];
        const rows = rowsRaw.slice(1).map(row => {
            const obj = {};
            headers.forEach((header, idx) => {
                if (header) {
                    obj[header] = row[idx] ?? null;
                }
            });
            return obj;
        });
        return { columns, rows };
    }
    getUsersQuery() {
        return `SELECT username FROM all_users WHERE oracle_maintained = 'N';`;
    }
    parseUsers(stdout) {
        const raw = parsePlainTable(stdout);
        if (raw.length <= 1)
            return [];
        return raw.slice(1)
            .map(row => ({
            username: row[0],
            isAdmin: row[0]?.toUpperCase() === 'SYSTEM' || row[0]?.toUpperCase() === 'SYS',
        }))
            .filter(u => u.username && u.username !== 'USERNAME');
    }
    getCreateUserQuery(username, password) {
        const pass = password ? ` IDENTIFIED BY "${password}"` : ' IDENTIFIED BY "LabPassword123!"';
        return `
      CREATE USER ${username}${pass};
      GRANT CONNECT, RESOURCE, DBA TO ${username};
      ALTER USER ${username} DEFAULT TABLESPACE USERS QUOTA UNLIMITED ON USERS;
    `;
    }
}
exports.OracleAdmin = OracleAdmin;
//# sourceMappingURL=adminAdapters.js.map