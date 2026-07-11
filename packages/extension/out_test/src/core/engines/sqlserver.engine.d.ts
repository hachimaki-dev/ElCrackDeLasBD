/**
 * SQL Engine Laboratory — SQL Server Engine Adapter
 *
 * Definición del motor SQL Server para el catálogo de motores.
 * Puerto por defecto: 1433
 * Cliente nativo: sqlcmd
 *
 * Limitación conocida: SQL Server no tiene soporte arm64 nativo.
 * En Mac Apple Silicon corre bajo emulación (Rosetta/QEMU) vía Docker Desktop,
 * con rendimiento reducido. Esto es una limitación documentada, no un bug.
 */
import { EngineDefinition } from './engine.types';
export declare const sqlserverEngine: EngineDefinition;
//# sourceMappingURL=sqlserver.engine.d.ts.map