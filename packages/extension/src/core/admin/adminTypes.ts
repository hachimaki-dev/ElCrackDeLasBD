/**
 * SQL Engine Laboratory — Admin Types
 *
 * Definiciones de tipos de datos para la administración visual de motores SQL.
 */

import { EngineId } from '../engines/engine.types';

/**
 * Información básica de una base de datos del motor.
 */
export interface DatabaseMetadata {
  /** Nombre de la base de datos */
  readonly name: string;
  /** Tamaño estimado o formateado de la base de datos (si aplica) */
  readonly size?: string;
  /** Cantidad de tablas en la base de datos */
  readonly tablesCount?: number;
}

/**
 * Información de una tabla dentro de una base de datos.
 */
export interface TableMetadata {
  /** Nombre de la tabla */
  readonly name: string;
  /** Esquema o propietario al que pertenece (ej: "public", "dbo") */
  readonly schema?: string;
}

/**
 * Información de un usuario registrado en el motor de base de datos.
 */
export interface UserMetadata {
  /** Nombre de usuario */
  readonly username: string;
  /** Host permitido (principalmente MySQL/MariaDB) */
  readonly host?: string;
  /** Indica si el usuario tiene privilegios de superusuario o administrador */
  readonly isAdmin: boolean;
  /** Roles o privilegios asociados al usuario */
  readonly roles?: string[];
}

/**
 * Metadata de las columnas de una tabla para la vista previa de estructura.
 */
export interface ColumnMetadata {
  /** Nombre de la columna */
  readonly name: string;
  /** Tipo de dato de la base de datos (ej: "VARCHAR(255)", "integer") */
  readonly dataType: string;
  /** Indica si la columna permite valores nulos */
  readonly isNullable: boolean;
  /** Rol de la columna (ej: "PRIMARY KEY", "FOREIGN KEY", etc.) */
  readonly keyType?: 'primary' | 'foreign' | 'none';
}

/**
 * Estructura completa de la vista previa de una tabla.
 */
export interface TablePreview {
  /** Definición de las columnas */
  readonly columns: ColumnMetadata[];
  /** Registros de datos (primeras N filas) */
  readonly rows: Record<string, unknown>[];
}

/**
 * Credenciales y contraseñas expuestas visualmente en el panel.
 */
export interface SavedCredentials {
  /** Identificador de la credencial (ej: standard, admin o personalizado) */
  readonly id: string;
  /** Motor asociado */
  readonly engineId: EngineId;
  /** Nombre de usuario */
  readonly username: string;
  /** Base de datos predeterminada */
  readonly database?: string;
  /** Contraseña en texto plano para visualización en el llavero */
  readonly password?: string;
  /** Rol o tipo de cuenta */
  readonly label: string;
}

/**
 * Reporte consolidado de metadatos de administración para enviar al Webview.
 */
export interface AdminMetadataReport {
  /** Lista de bases de datos */
  readonly databases: DatabaseMetadata[];
  /** Lista de tablas (relacionadas por esquema/base de datos) */
  readonly tables: TableMetadata[];
  /** Lista de usuarios del motor */
  readonly users: UserMetadata[];
}
