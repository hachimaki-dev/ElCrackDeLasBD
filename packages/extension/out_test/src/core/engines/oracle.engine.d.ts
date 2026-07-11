/**
 * SQL Engine Laboratory — Oracle Free Engine Adapter
 *
 * Definición del motor Oracle Free para el catálogo de motores.
 * Basado en gvenzl/oracle-free 23.5 (soporte arm64 nativo).
 * Puerto por defecto: 1521
 * Cliente nativo: sqlplus
 *
 * Oracle usa PDBs (Pluggable Databases) en vez del modelo clásico de BD.
 * El laboratorio usa FREEPDB1 como PDB por defecto.
 *
 * Atribución: configuración basada en el trabajo de Gerald Venzl (gvenzl/oracle-free).
 */
import { EngineDefinition } from './engine.types';
export declare const oracleEngine: EngineDefinition;
//# sourceMappingURL=oracle.engine.d.ts.map