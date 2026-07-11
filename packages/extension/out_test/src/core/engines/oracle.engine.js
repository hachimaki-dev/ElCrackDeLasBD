"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.oracleEngine = void 0;
exports.oracleEngine = {
    id: 'oracle',
    displayName: 'Oracle Free',
    description: 'Oracle Database Free 23ai — motor enterprise con licencia gratuita para desarrollo',
    defaultPort: 1521,
    dockerEnvValue: 'oracle',
    connectionTemplate: {
        command: 'sqlplus',
        argsTemplate: '{user}/{password}@{host}:{port}/FREEPDB1',
        defaultUser: 'labuser',
        defaultPassword: 'labpassword',
        defaultDatabase: 'FREEPDB1',
    },
    // Oracle es significativamente más lento para inicializar (1-2 min primera vez)
    healthcheckTimeoutMs: 180_000,
    iconId: 'database',
};
//# sourceMappingURL=oracle.engine.js.map