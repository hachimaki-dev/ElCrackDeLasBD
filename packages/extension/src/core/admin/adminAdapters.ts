/**
 * SQL Engine Laboratory — Admin Adapters
 *
 * Adaptadores específicos por motor para obtener metadatos y ejecutar
 * comandos de administración (Open/Closed Principle).
 */

import { EngineId } from '../engines/engine.types';
import { DatabaseMetadata, TableMetadata, UserMetadata, ColumnMetadata, TablePreview } from './adminTypes';

/**
 * Interfaz que define las operaciones de administración para un motor.
 */
export interface DbAdminAdapter {
  readonly engineId: EngineId;

  // --- Databases ---
  getDatabasesQuery(): string;
  parseDatabases(stdout: string): DatabaseMetadata[];
  getCreateDatabaseQuery(name: string): string;

  // --- Tables ---
  getTablesQuery(): string;
  parseTables(stdout: string): TableMetadata[];
  getTablePreviewQuery(tableName: string, schemaName?: string): string;
  parseTablePreview(stdout: string): TablePreview;

  // --- Users ---
  getUsersQuery(): string;
  parseUsers(stdout: string): UserMetadata[];
  getCreateUserQuery(username: string, password?: string): string;
}

// ==========================================================================
// Helper de Parseo Genérico
// ==========================================================================

/**
 * Normaliza y divide el output de la consola en filas y columnas limpias.
 * Soporta formatos tabulados de psql (pipe-separated), mysql (tab-separated) y sqlite3 (pipe-separated sin header).
 */
function parsePlainTable(stdout: string, separator: string | RegExp = /\t/): string[][] {
  const lines = stdout.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
  return lines.map(line => {
    if (typeof separator === 'string') {
      return line.split(separator).map(cell => cell.trim());
    } else {
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
function parsePostgresTable(stdout: string): string[][] {
  const lines = stdout.split(/\r?\n/).map(line => line.trim());
  const rows: string[][] = [];
  
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
export class PostgresAdmin implements DbAdminAdapter {
  readonly engineId = 'postgres';

  getDatabasesQuery(): string {
    return `SELECT datname FROM pg_database WHERE datistemplate = false;`;
  }

  parseDatabases(stdout: string): DatabaseMetadata[] {
    const raw = parsePostgresTable(stdout);
    if (raw.length <= 1) return []; // Solo cabecera o vacío
    // La primera fila es el header (datname)
    return raw.slice(1).map(row => ({ name: row[0] })).filter(db => db.name && db.name !== 'datname');
  }

  getCreateDatabaseQuery(name: string): string {
    // psql no permite CREATE DATABASE en bloques transaccionales, se ejecuta normal
    return `CREATE DATABASE "${name}";`;
  }

  getTablesQuery(): string {
    return `SELECT table_schema, table_name FROM information_schema.tables 
            WHERE table_schema NOT IN ('pg_catalog', 'information_schema') AND table_type = 'BASE TABLE'
            ORDER BY table_schema, table_name;`;
  }

  parseTables(stdout: string): TableMetadata[] {
    const raw = parsePostgresTable(stdout);
    if (raw.length <= 1) return [];
    return raw.slice(1)
      .map(row => ({ schema: row[0], name: row[1] }))
      .filter(t => t.name && t.name !== 'table_name');
  }

  getTablePreviewQuery(tableName: string, schemaName = 'public'): string {
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

  parseTablePreview(stdout: string): TablePreview {
    // Separamos el output si viene de dos consultas
    const parts = stdout.split('--SPLIT--');
    const colsOutput = parts[0] || stdout;
    const rowsOutput = parts[1] || '';

    const colsRaw = parsePostgresTable(colsOutput);
    const columns: ColumnMetadata[] = colsRaw.slice(1)
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
      const obj: Record<string, unknown> = {};
      headers.forEach((header, idx) => {
        if (header) {
          obj[header] = row[idx] ?? null;
        }
      });
      return obj;
    });

    return { columns, rows };
  }

  getUsersQuery(): string {
    return `SELECT usename, usesuper FROM pg_user;`;
  }

  parseUsers(stdout: string): UserMetadata[] {
    const raw = parsePostgresTable(stdout);
    if (raw.length <= 1) return [];
    return raw.slice(1)
      .map(row => ({
        username: row[0],
        isAdmin: row[1]?.trim() === 't' || row[1]?.trim() === 'true',
      }))
      .filter(u => u.username && u.username !== 'usename');
  }

  getCreateUserQuery(username: string, password?: string): string {
    const pass = password ? ` WITH PASSWORD '${password}'` : '';
    return `CREATE USER "${username}"${pass};`;
  }
}

// ==========================================================================
// MySQL / MariaDB Adapter
// ==========================================================================
export class MySqlAdmin implements DbAdminAdapter {
  constructor(readonly engineId: 'mysql' | 'mariadb' = 'mysql') {}

  getDatabasesQuery(): string {
    return `SHOW DATABASES;`;
  }

  parseDatabases(stdout: string): DatabaseMetadata[] {
    const raw = parsePlainTable(stdout);
    if (raw.length <= 1) return [];
    return raw.slice(1)
      .map(row => ({ name: row[0] }))
      .filter(db => db.name && db.name !== 'Database');
  }

  getCreateDatabaseQuery(name: string): string {
    return `CREATE DATABASE \`${name}\`;`;
  }

  getTablesQuery(): string {
    return `SELECT table_schema, table_name FROM information_schema.tables 
            WHERE table_schema NOT IN ('mysql', 'information_schema', 'performance_schema', 'sys') 
            AND table_type = 'BASE TABLE'
            ORDER BY table_schema, table_name;`;
  }

  parseTables(stdout: string): TableMetadata[] {
    const raw = parsePlainTable(stdout);
    if (raw.length <= 1) return [];
    return raw.slice(1)
      .map(row => ({ schema: row[0], name: row[1] }))
      .filter(t => t.name && t.name !== 'table_name');
  }

  getTablePreviewQuery(tableName: string, schemaName?: string): string {
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

  parseTablePreview(stdout: string): TablePreview {
    const parts = stdout.split('--SPLIT--');
    const colsOutput = parts[0] || stdout;
    const rowsOutput = parts[1] || '';

    const colsRaw = parsePlainTable(colsOutput);
    const columns: ColumnMetadata[] = colsRaw.slice(1)
      .map(row => ({
        name: row[0],
        dataType: row[1],
        isNullable: row[2]?.toLowerCase() === 'yes',
        keyType: row[3] === 'PRI' ? ('primary' as const) : undefined,
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
      const obj: Record<string, unknown> = {};
      headers.forEach((header, idx) => {
        if (header) {
          obj[header] = row[idx] ?? null;
        }
      });
      return obj;
    });

    return { columns, rows };
  }

  getUsersQuery(): string {
    return `SELECT user, host FROM mysql.user;`;
  }

  parseUsers(stdout: string): UserMetadata[] {
    const raw = parsePlainTable(stdout);
    if (raw.length <= 1) return [];
    return raw.slice(1)
      .map(row => ({
        username: row[0],
        host: row[1],
        isAdmin: row[0] === 'root',
      }))
      .filter(u => u.username && u.username !== 'user');
  }

  getCreateUserQuery(username: string, password?: string): string {
    const pass = password ? ` IDENTIFIED BY '${password}'` : '';
    return `
      CREATE USER '${username}'@'%'${pass};
      GRANT ALL PRIVILEGES ON *.* TO '${username}'@'%';
      FLUSH PRIVILEGES;
    `;
  }
}

// ==========================================================================
// SQLite Adapter
// ==========================================================================
export class SqliteAdmin implements DbAdminAdapter {
  readonly engineId = 'sqlite';

  getDatabasesQuery(): string {
    return `PRAGMA database_list;`;
  }

  parseDatabases(stdout: string): DatabaseMetadata[] {
    // sqlite3 output: seq|name|file
    // 0|main|/data/database.sqlite
    const raw = parsePlainTable(stdout, '|');
    return raw.map(row => ({
      name: row[1] || 'main',
      size: row[2] ? 'Archivo local' : undefined
    })).filter(db => db.name);
  }

  getCreateDatabaseQuery(_name: string): string {
    // sqlite3 no puede crear BDs dinámicamente con SQL simple.
    // Retornamos un log y manejamos la creación de archivo en el AdminService
    return `SELECT 'SQLite requiere crear un nuevo archivo';`;
  }

  getTablesQuery(): string {
    return `SELECT 'main' AS tbl_schema, name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';`;
  }

  parseTables(stdout: string): TableMetadata[] {
    const raw = parsePlainTable(stdout, '|');
    return raw.map(row => ({
      schema: row[0] || 'main',
      name: row[1],
    })).filter(t => t.name);
  }

  getTablePreviewQuery(tableName: string, _schemaName?: string): string {
    return `
      PRAGMA table_info("${tableName}");
      --SPLIT--
      SELECT * FROM "${tableName}" LIMIT 100;
    `;
  }

  parseTablePreview(stdout: string): TablePreview {
    const parts = stdout.split('--SPLIT--');
    const colsOutput = parts[0] || stdout;
    const rowsOutput = parts[1] || '';

    // PRAGMA table_info output: cid|name|type|notnull|dflt_value|pk
    const colsRaw = parsePlainTable(colsOutput, '|');
    const columns: ColumnMetadata[] = colsRaw.map(row => ({
      name: row[1],
      dataType: row[2],
      isNullable: row[3] === '0', // 1 = NOT NULL, 0 = NULL
      keyType: row[5] === '1' ? ('primary' as const) : undefined,
    })).filter(c => c.name);

    if (!rowsOutput.trim()) {
      return { columns, rows: [] };
    }

    // sqlite3 no retorna cabeceras por defecto si hacemos select simple sin .headers on.
    // Pero en el shell de sqlite pasamos comandos. Si no hay cabeceras, usamos los nombres de columnas que leímos en table_info.
    const rowsRaw = parsePlainTable(rowsOutput, '|');
    const rows = rowsRaw.map(row => {
      const obj: Record<string, unknown> = {};
      columns.forEach((col, idx) => {
        obj[col.name] = row[idx] ?? null;
      });
      return obj;
    });

    return { columns, rows };
  }

  getUsersQuery(): string {
    return `SELECT 'admin' AS username, 1 AS is_admin;`;
  }

  parseUsers(_stdout: string): UserMetadata[] {
    return [
      {
        username: 'default (Local)',
        isAdmin: true,
        roles: ['owner'],
      }
    ];
  }

  getCreateUserQuery(_username: string, _password?: string): string {
    return `SELECT 'SQLite no soporta múltiples usuarios nativos';`;
  }
}

// ==========================================================================
// SQL Server Adapter
// ==========================================================================
export class SqlServerAdmin implements DbAdminAdapter {
  readonly engineId = 'sqlserver';

  getDatabasesQuery(): string {
    return `SELECT name FROM sys.databases WHERE name NOT IN ('master', 'tempdb', 'model', 'msdb');`;
  }

  parseDatabases(stdout: string): DatabaseMetadata[] {
    const raw = parsePlainTable(stdout);
    if (raw.length <= 1) return [];
    return raw.slice(1).map(row => ({ name: row[0] })).filter(db => db.name && db.name !== 'name');
  }

  getCreateDatabaseQuery(name: string): string {
    return `CREATE DATABASE [${name}];`;
  }

  getTablesQuery(): string {
    return `SELECT SCHEMA_NAME(schema_id) AS table_schema, name AS table_name FROM sys.tables ORDER BY table_schema, name;`;
  }

  parseTables(stdout: string): TableMetadata[] {
    const raw = parsePlainTable(stdout);
    if (raw.length <= 1) return [];
    return raw.slice(1)
      .map(row => ({ schema: row[0], name: row[1] }))
      .filter(t => t.name && t.name !== 'table_name');
  }

  getTablePreviewQuery(tableName: string, schemaName = 'dbo'): string {
    return `
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = '${schemaName}' AND TABLE_NAME = '${tableName}';
      --SPLIT--
      SELECT TOP 100 * FROM [${schemaName}].[${tableName}];
    `;
  }

  parseTablePreview(stdout: string): TablePreview {
    const parts = stdout.split('--SPLIT--');
    const colsOutput = parts[0] || stdout;
    const rowsOutput = parts[1] || '';

    const colsRaw = parsePlainTable(colsOutput);
    const columns: ColumnMetadata[] = colsRaw.slice(1)
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
      const obj: Record<string, unknown> = {};
      headers.forEach((header, idx) => {
        if (header) {
          obj[header] = row[idx] ?? null;
        }
      });
      return obj;
    });

    return { columns, rows };
  }

  getUsersQuery(): string {
    return `SELECT name, type_desc FROM sys.server_principals WHERE type_desc = 'SQL_LOGIN';`;
  }

  parseUsers(stdout: string): UserMetadata[] {
    const raw = parsePlainTable(stdout);
    if (raw.length <= 1) return [];
    return raw.slice(1)
      .map(row => ({
        username: row[0],
        isAdmin: row[0]?.toLowerCase() === 'sa',
      }))
      .filter(u => u.username && u.username !== 'name');
  }

  getCreateUserQuery(username: string, password?: string): string {
    const pass = password ? ` WITH PASSWORD = '${password}'` : '';
    return `
      CREATE LOGIN [${username}]${pass};
      CREATE USER [${username}] FOR LOGIN [${username}];
      ALTER SERVER ROLE [sysadmin] ADD MEMBER [${username}];
    `;
  }
}

// ==========================================================================
// Oracle Free Adapter
// ==========================================================================
export class OracleAdmin implements DbAdminAdapter {
  readonly engineId = 'oracle';

  getDatabasesQuery(): string {
    // Oracle usa esquemas, pero podemos mostrar el PDB activo
    return `SELECT name FROM v$pdbs;`;
  }

  parseDatabases(stdout: string): DatabaseMetadata[] {
    const raw = parsePlainTable(stdout);
    if (raw.length <= 1) return [];
    return raw.slice(1).map(row => ({ name: row[0] })).filter(db => db.name && db.name !== 'NAME');
  }

  getCreateDatabaseQuery(_name: string): string {
    // En Oracle Free no se crean PDBs al vuelo habitualmente,
    // se crean usuarios/esquemas. Devolvemos una query nula con explicación
    return `SELECT 'Oracle Free opera a nivel de Esquemas / Usuarios' FROM dual;`;
  }

  getTablesQuery(): string {
    return `SELECT owner, table_name FROM all_tables 
            WHERE owner NOT IN ('SYS', 'SYSTEM', 'OUTLN', 'DBA', 'APPQOSSYS', 'CTXSYS', 'DVSYS', 'GSMADMIN_INTERNAL', 'LBACSYS', 'MDSYS', 'OJVMSYS', 'OLAPSYS', 'ORDDATA', 'ORDSYS', 'XDB', 'WMSYS') 
            ORDER BY owner, table_name;`;
  }

  parseTables(stdout: string): TableMetadata[] {
    const raw = parsePlainTable(stdout);
    if (raw.length <= 1) return [];
    return raw.slice(1)
      .map(row => ({ schema: row[0], name: row[1] }))
      .filter(t => t.name && t.name !== 'TABLE_NAME');
  }

  getTablePreviewQuery(tableName: string, schemaName?: string): string {
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

  parseTablePreview(stdout: string): TablePreview {
    const parts = stdout.split('--SPLIT--');
    const colsOutput = parts[0] || stdout;
    const rowsOutput = parts[1] || '';

    const colsRaw = parsePlainTable(colsOutput);
    const columns: ColumnMetadata[] = colsRaw.slice(1)
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
      const obj: Record<string, unknown> = {};
      headers.forEach((header, idx) => {
        if (header) {
          obj[header] = row[idx] ?? null;
        }
      });
      return obj;
    });

    return { columns, rows };
  }

  getUsersQuery(): string {
    return `SELECT username FROM all_users WHERE oracle_maintained = 'N';`;
  }

  parseUsers(stdout: string): UserMetadata[] {
    const raw = parsePlainTable(stdout);
    if (raw.length <= 1) return [];
    return raw.slice(1)
      .map(row => ({
        username: row[0],
        isAdmin: row[0]?.toUpperCase() === 'SYSTEM' || row[0]?.toUpperCase() === 'SYS',
      }))
      .filter(u => u.username && u.username !== 'USERNAME');
  }

  getCreateUserQuery(username: string, password?: string): string {
    const pass = password ? ` IDENTIFIED BY "${password}"` : ' IDENTIFIED BY "LabPassword123!"';
    return `
      CREATE USER ${username}${pass};
      GRANT CONNECT, RESOURCE, DBA TO ${username};
      ALTER USER ${username} DEFAULT TABLESPACE USERS QUOTA UNLIMITED ON USERS;
    `;
  }
}
