"use strict";
/**
 * SQL Engine Laboratory — SQL Cheat Sheets
 *
 * Cheat sheets de SQL específicos para cada motor.
 * Cada cheat sheet contiene los fundamentos de SQL adaptados
 * a la sintaxis particular del motor, incluyendo:
 * - DDL (CREATE, ALTER, DROP)
 * - DML (INSERT, SELECT, UPDATE, DELETE)
 * - Funciones específicas del motor
 * - Tips y particularidades
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCheatSheet = getCheatSheet;
/**
 * Retorna el cheat sheet correspondiente a un motor.
 *
 * @param engineId - ID del motor
 * @returns CheatSheet con fundamentos SQL adaptados al motor
 */
function getCheatSheet(engineId) {
    switch (engineId) {
        case 'postgres':
            return postgresCheatSheet;
        case 'mysql':
            return mysqlCheatSheet;
        case 'mariadb':
            return mariadbCheatSheet;
        case 'sqlite':
            return sqliteCheatSheet;
        case 'oracle':
            return oracleCheatSheet;
        case 'sqlserver':
            return sqlserverCheatSheet;
    }
}
// ==========================================================================
// PostgreSQL
// ==========================================================================
const postgresCheatSheet = {
    engineName: 'PostgreSQL',
    tips: [
        'PostgreSQL es case-insensitive para keywords pero case-sensitive para identificadores con comillas dobles.',
        'Usa \\dt para listar tablas, \\d tabla para describir una tabla, \\q para salir.',
        'Soporta JSON nativo con los tipos JSONB (recomendado) y JSON.',
        'Las transacciones son implícitas: cada statement es una transacción si no usas BEGIN.',
    ],
    sections: [
        {
            title: '📦 Crear y Gestionar Tablas (DDL)',
            items: [
                {
                    label: 'Crear tabla con tipos comunes',
                    sql: `CREATE TABLE productos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  precio NUMERIC(10,2) DEFAULT 0,
  activo BOOLEAN DEFAULT TRUE,
  creado_en TIMESTAMP DEFAULT NOW()
);`,
                },
                {
                    label: 'Agregar columna',
                    sql: `ALTER TABLE productos ADD COLUMN descripcion TEXT;`,
                },
                {
                    label: 'Eliminar tabla',
                    sql: `DROP TABLE IF EXISTS productos;`,
                },
            ],
        },
        {
            title: '✏️ Insertar, Actualizar, Eliminar (DML)',
            items: [
                {
                    label: 'Insertar datos',
                    sql: `INSERT INTO productos (nombre, precio)
VALUES ('Laptop', 999.99), ('Mouse', 29.99);`,
                },
                {
                    label: 'Actualizar datos',
                    sql: `UPDATE productos SET precio = 899.99
WHERE nombre = 'Laptop';`,
                },
                {
                    label: 'Eliminar datos',
                    sql: `DELETE FROM productos WHERE activo = FALSE;`,
                },
            ],
        },
        {
            title: '🔍 Consultas (SELECT)',
            items: [
                {
                    label: 'Seleccionar todo',
                    sql: `SELECT * FROM productos;`,
                },
                {
                    label: 'Filtrar y ordenar',
                    sql: `SELECT nombre, precio FROM productos
WHERE precio > 50
ORDER BY precio DESC
LIMIT 10;`,
                },
                {
                    label: 'Agrupar con funciones',
                    sql: `SELECT activo, COUNT(*) AS total,
       AVG(precio) AS precio_promedio
FROM productos
GROUP BY activo
HAVING COUNT(*) > 1;`,
                },
                {
                    label: 'JOIN entre tablas',
                    sql: `SELECT p.nombre, c.nombre AS categoria
FROM productos p
JOIN categorias c ON p.categoria_id = c.id;`,
                },
            ],
        },
        {
            title: '🐘 Específico de PostgreSQL',
            items: [
                {
                    label: 'Upsert (INSERT ON CONFLICT)',
                    sql: `INSERT INTO productos (id, nombre, precio)
VALUES (1, 'Laptop', 999.99)
ON CONFLICT (id) DO UPDATE
SET precio = EXCLUDED.precio;`,
                },
                {
                    label: 'Consulta con JSONB',
                    sql: `SELECT * FROM productos
WHERE metadata->>'color' = 'rojo';`,
                },
                {
                    label: 'CTE (Common Table Expression)',
                    sql: `WITH caros AS (
  SELECT * FROM productos WHERE precio > 500
)
SELECT COUNT(*) FROM caros;`,
                },
            ],
        },
    ],
};
// ==========================================================================
// MySQL
// ==========================================================================
const mysqlCheatSheet = {
    engineName: 'MySQL',
    tips: [
        'MySQL usa backticks (`) para escapar identificadores, no comillas dobles.',
        'El motor de almacenamiento por defecto es InnoDB (soporta transacciones).',
        'Usa SHOW TABLES para listar tablas, DESCRIBE tabla para ver columnas.',
        'AUTO_INCREMENT es el equivalente de SERIAL en PostgreSQL.',
    ],
    sections: [
        {
            title: '📦 Crear y Gestionar Tablas (DDL)',
            items: [
                {
                    label: 'Crear tabla con tipos comunes',
                    sql: `CREATE TABLE productos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  precio DECIMAL(10,2) DEFAULT 0,
  activo TINYINT(1) DEFAULT 1,
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;`,
                },
                {
                    label: 'Agregar columna',
                    sql: 'ALTER TABLE productos ADD COLUMN descripcion TEXT;',
                },
                {
                    label: 'Eliminar tabla',
                    sql: 'DROP TABLE IF EXISTS productos;',
                },
            ],
        },
        {
            title: '✏️ Insertar, Actualizar, Eliminar (DML)',
            items: [
                {
                    label: 'Insertar datos',
                    sql: `INSERT INTO productos (nombre, precio)
VALUES ('Laptop', 999.99), ('Mouse', 29.99);`,
                },
                {
                    label: 'Actualizar datos',
                    sql: `UPDATE productos SET precio = 899.99
WHERE nombre = 'Laptop';`,
                },
                {
                    label: 'Eliminar datos',
                    sql: 'DELETE FROM productos WHERE activo = 0;',
                },
            ],
        },
        {
            title: '🔍 Consultas (SELECT)',
            items: [
                {
                    label: 'Seleccionar todo',
                    sql: 'SELECT * FROM productos;',
                },
                {
                    label: 'Filtrar y ordenar',
                    sql: `SELECT nombre, precio FROM productos
WHERE precio > 50
ORDER BY precio DESC
LIMIT 10;`,
                },
                {
                    label: 'Agrupar con funciones',
                    sql: `SELECT activo, COUNT(*) AS total,
       AVG(precio) AS precio_promedio
FROM productos
GROUP BY activo
HAVING COUNT(*) > 1;`,
                },
            ],
        },
        {
            title: '🐬 Específico de MySQL',
            items: [
                {
                    label: 'INSERT ... ON DUPLICATE KEY',
                    sql: `INSERT INTO productos (id, nombre, precio)
VALUES (1, 'Laptop', 999.99)
ON DUPLICATE KEY UPDATE
  precio = VALUES(precio);`,
                },
                {
                    label: 'Consulta JSON',
                    sql: `SELECT * FROM productos
WHERE JSON_EXTRACT(metadata, '$.color') = 'rojo';`,
                },
                {
                    label: 'Variables de usuario',
                    sql: `SET @precio_min = 100;
SELECT * FROM productos
WHERE precio >= @precio_min;`,
                },
            ],
        },
    ],
};
// ==========================================================================
// MariaDB
// ==========================================================================
const mariadbCheatSheet = {
    engineName: 'MariaDB',
    tips: [
        'MariaDB es un fork de MySQL — la mayoría de la sintaxis es idéntica.',
        'Soporta secuencias (SEQUENCE) como alternativa a AUTO_INCREMENT.',
        'Tiene motores adicionales como Aria, ColumnStore y Spider.',
        'Usa SHOW TABLES, DESCRIBE tabla, y las mismas herramientas que MySQL.',
    ],
    sections: [
        {
            title: '📦 Crear y Gestionar Tablas (DDL)',
            items: [
                {
                    label: 'Crear tabla con tipos comunes',
                    sql: `CREATE TABLE productos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  precio DECIMAL(10,2) DEFAULT 0,
  activo TINYINT(1) DEFAULT 1,
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;`,
                },
                {
                    label: 'Crear secuencia (MariaDB 10.3+)',
                    sql: `CREATE SEQUENCE producto_seq START WITH 1 INCREMENT BY 1;
SELECT NEXT VALUE FOR producto_seq;`,
                },
                {
                    label: 'Eliminar tabla',
                    sql: 'DROP TABLE IF EXISTS productos;',
                },
            ],
        },
        {
            title: '✏️ Insertar, Actualizar, Eliminar (DML)',
            items: [
                {
                    label: 'Insertar datos',
                    sql: `INSERT INTO productos (nombre, precio)
VALUES ('Laptop', 999.99), ('Mouse', 29.99);`,
                },
                {
                    label: 'REPLACE (insert o update)',
                    sql: `REPLACE INTO productos (id, nombre, precio)
VALUES (1, 'Laptop Pro', 1299.99);`,
                },
                {
                    label: 'DELETE con LIMIT',
                    sql: `DELETE FROM productos
WHERE activo = 0
ORDER BY creado_en ASC
LIMIT 100;`,
                },
            ],
        },
        {
            title: '🔍 Consultas (SELECT)',
            items: [
                {
                    label: 'Seleccionar con alias',
                    sql: `SELECT nombre AS producto, precio AS costo
FROM productos
WHERE precio BETWEEN 10 AND 500;`,
                },
                {
                    label: 'Subconsulta',
                    sql: `SELECT * FROM productos
WHERE precio > (SELECT AVG(precio) FROM productos);`,
                },
            ],
        },
        {
            title: '🦭 Específico de MariaDB',
            items: [
                {
                    label: 'Tabla temporal con WITH (CTE)',
                    sql: `WITH productos_caros AS (
  SELECT * FROM productos WHERE precio > 500
)
SELECT * FROM productos_caros;`,
                },
                {
                    label: 'Window Functions',
                    sql: `SELECT nombre, precio,
  RANK() OVER (ORDER BY precio DESC) AS ranking
FROM productos;`,
                },
            ],
        },
    ],
};
// ==========================================================================
// SQLite
// ==========================================================================
const sqliteCheatSheet = {
    engineName: 'SQLite',
    tips: [
        'SQLite usa tipado dinámico — los tipos son sugerencias, no restricciones estrictas.',
        'No hay ALTER TABLE DROP COLUMN en versiones antiguas (3.35.0+ lo soporta).',
        'Usa .tables para listar tablas, .schema tabla para ver la estructura, .quit para salir.',
        'SQLite es serverless — la BD es un archivo. Ideal para prototipos y apps móviles.',
    ],
    sections: [
        {
            title: '📦 Crear y Gestionar Tablas (DDL)',
            items: [
                {
                    label: 'Crear tabla',
                    sql: `CREATE TABLE IF NOT EXISTS productos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  precio REAL DEFAULT 0,
  activo INTEGER DEFAULT 1,
  creado_en TEXT DEFAULT (datetime('now'))
);`,
                },
                {
                    label: 'Crear índice',
                    sql: 'CREATE INDEX idx_precio ON productos(precio);',
                },
                {
                    label: 'Eliminar tabla',
                    sql: 'DROP TABLE IF EXISTS productos;',
                },
            ],
        },
        {
            title: '✏️ Insertar, Actualizar, Eliminar (DML)',
            items: [
                {
                    label: 'Insertar datos',
                    sql: `INSERT INTO productos (nombre, precio)
VALUES ('Laptop', 999.99), ('Mouse', 29.99);`,
                },
                {
                    label: 'Upsert (INSERT OR REPLACE)',
                    sql: `INSERT OR REPLACE INTO productos (id, nombre, precio)
VALUES (1, 'Laptop Pro', 1299.99);`,
                },
                {
                    label: 'Actualizar datos',
                    sql: `UPDATE productos SET precio = 899.99
WHERE nombre = 'Laptop';`,
                },
            ],
        },
        {
            title: '🔍 Consultas (SELECT)',
            items: [
                {
                    label: 'Consulta básica',
                    sql: 'SELECT * FROM productos ORDER BY precio DESC;',
                },
                {
                    label: 'Funciones de fecha',
                    sql: `SELECT nombre,
  date(creado_en) AS fecha,
  strftime('%Y', creado_en) AS año
FROM productos;`,
                },
            ],
        },
        {
            title: '🪶 Específico de SQLite',
            items: [
                {
                    label: 'Comandos de meta (dot commands)',
                    sql: `.tables          -- Listar tablas
.schema productos -- Ver estructura
.mode column     -- Formato columnas
.headers on      -- Mostrar headers
.quit            -- Salir`,
                },
                {
                    label: 'Exportar a CSV',
                    sql: `.mode csv
.output productos.csv
SELECT * FROM productos;
.output stdout`,
                },
            ],
        },
    ],
};
// ==========================================================================
// Oracle
// ==========================================================================
const oracleCheatSheet = {
    engineName: 'Oracle',
    tips: [
        'Oracle usa DUAL como tabla ficticia: SELECT 1 FROM DUAL;',
        'Las cadenas se delimitan con comillas simples. Comillas dobles son para identificadores.',
        'No existe LIMIT — usa FETCH FIRST N ROWS ONLY (12c+) o ROWNUM.',
        'Cada sentencia DDL hace COMMIT automático.',
    ],
    sections: [
        {
            title: '📦 Crear y Gestionar Tablas (DDL)',
            items: [
                {
                    label: 'Crear tabla con tipos comunes',
                    sql: `CREATE TABLE productos (
  id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre VARCHAR2(100) NOT NULL,
  precio NUMBER(10,2) DEFAULT 0,
  activo NUMBER(1) DEFAULT 1,
  creado_en TIMESTAMP DEFAULT SYSTIMESTAMP
);`,
                },
                {
                    label: 'Agregar columna',
                    sql: 'ALTER TABLE productos ADD (descripcion CLOB);',
                },
                {
                    label: 'Eliminar tabla',
                    sql: 'DROP TABLE productos PURGE;',
                },
            ],
        },
        {
            title: '✏️ Insertar, Actualizar, Eliminar (DML)',
            items: [
                {
                    label: 'Insertar datos',
                    sql: `INSERT INTO productos (nombre, precio)
VALUES ('Laptop', 999.99);
COMMIT;`,
                },
                {
                    label: 'Insertar múltiples filas',
                    sql: `INSERT ALL
  INTO productos (nombre, precio) VALUES ('Laptop', 999.99)
  INTO productos (nombre, precio) VALUES ('Mouse', 29.99)
SELECT * FROM DUAL;
COMMIT;`,
                },
                {
                    label: 'MERGE (upsert)',
                    sql: `MERGE INTO productos p
USING (SELECT 1 AS id, 'Laptop' AS nombre FROM DUAL) s
ON (p.id = s.id)
WHEN MATCHED THEN UPDATE SET p.nombre = s.nombre
WHEN NOT MATCHED THEN INSERT (nombre) VALUES (s.nombre);`,
                },
            ],
        },
        {
            title: '🔍 Consultas (SELECT)',
            items: [
                {
                    label: 'Seleccionar con límite (12c+)',
                    sql: `SELECT nombre, precio FROM productos
WHERE precio > 50
ORDER BY precio DESC
FETCH FIRST 10 ROWS ONLY;`,
                },
                {
                    label: 'Paginación',
                    sql: `SELECT nombre, precio FROM productos
ORDER BY precio DESC
OFFSET 10 ROWS FETCH NEXT 10 ROWS ONLY;`,
                },
            ],
        },
        {
            title: '🏛️ Específico de Oracle',
            items: [
                {
                    label: 'PL/SQL anónimo',
                    sql: `BEGIN
  DBMS_OUTPUT.PUT_LINE('Hola desde Oracle!');
END;
/`,
                },
                {
                    label: 'Ver tablas del usuario',
                    sql: `SELECT table_name FROM user_tables
ORDER BY table_name;`,
                },
                {
                    label: 'Secuencias',
                    sql: `CREATE SEQUENCE producto_seq START WITH 1 INCREMENT BY 1;
SELECT producto_seq.NEXTVAL FROM DUAL;`,
                },
            ],
        },
    ],
};
// ==========================================================================
// SQL Server
// ==========================================================================
const sqlserverCheatSheet = {
    engineName: 'SQL Server',
    tips: [
        'SQL Server usa T-SQL, una extensión propietaria de SQL.',
        'Los identificadores se escapan con corchetes [nombre] o comillas dobles.',
        'GO no es SQL — es un separador de lotes del cliente sqlcmd.',
        'IDENTITY es el equivalente de SERIAL/AUTO_INCREMENT.',
    ],
    sections: [
        {
            title: '📦 Crear y Gestionar Tablas (DDL)',
            items: [
                {
                    label: 'Crear tabla con tipos comunes',
                    sql: `CREATE TABLE productos (
  id INT IDENTITY(1,1) PRIMARY KEY,
  nombre NVARCHAR(100) NOT NULL,
  precio DECIMAL(10,2) DEFAULT 0,
  activo BIT DEFAULT 1,
  creado_en DATETIME2 DEFAULT GETDATE()
);`,
                },
                {
                    label: 'Agregar columna',
                    sql: 'ALTER TABLE productos ADD descripcion NVARCHAR(MAX);',
                },
                {
                    label: 'Eliminar tabla',
                    sql: `IF OBJECT_ID('productos', 'U') IS NOT NULL
  DROP TABLE productos;`,
                },
            ],
        },
        {
            title: '✏️ Insertar, Actualizar, Eliminar (DML)',
            items: [
                {
                    label: 'Insertar datos',
                    sql: `INSERT INTO productos (nombre, precio)
VALUES ('Laptop', 999.99), ('Mouse', 29.99);`,
                },
                {
                    label: 'Actualizar datos',
                    sql: `UPDATE productos SET precio = 899.99
WHERE nombre = 'Laptop';`,
                },
                {
                    label: 'DELETE con TOP',
                    sql: 'DELETE TOP (100) FROM productos WHERE activo = 0;',
                },
            ],
        },
        {
            title: '🔍 Consultas (SELECT)',
            items: [
                {
                    label: 'Seleccionar con TOP',
                    sql: `SELECT TOP 10 nombre, precio
FROM productos
WHERE precio > 50
ORDER BY precio DESC;`,
                },
                {
                    label: 'Paginación (OFFSET/FETCH)',
                    sql: `SELECT nombre, precio FROM productos
ORDER BY precio DESC
OFFSET 10 ROWS
FETCH NEXT 10 ROWS ONLY;`,
                },
            ],
        },
        {
            title: '🏢 Específico de SQL Server (T-SQL)',
            items: [
                {
                    label: 'Variables y control de flujo',
                    sql: `DECLARE @precio_min DECIMAL(10,2) = 100;
SELECT * FROM productos
WHERE precio >= @precio_min;`,
                },
                {
                    label: 'Tabla temporal',
                    sql: `SELECT * INTO #productos_temp
FROM productos WHERE activo = 1;

SELECT * FROM #productos_temp;
DROP TABLE #productos_temp;`,
                },
                {
                    label: 'TRY/CATCH',
                    sql: `BEGIN TRY
  INSERT INTO productos (nombre) VALUES (NULL);
END TRY
BEGIN CATCH
  PRINT ERROR_MESSAGE();
END CATCH;`,
                },
            ],
        },
    ],
};
//# sourceMappingURL=cheatSheets.js.map