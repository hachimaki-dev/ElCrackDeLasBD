/**
 * SQL Engine Laboratory — SQLite Engine Adapter
 *
 * Definición del motor SQLite para el catálogo de motores.
 * SQLite es un caso especial: no es un daemon, no usa puerto de red.
 * El comando de conexión apunta al archivo de BD dentro del contenedor.
 * Puerto: 0 (no aplica)
 * Cliente nativo: sqlite3
 */
import { EngineDefinition } from './engine.types';
export declare const sqliteEngine: EngineDefinition;
//# sourceMappingURL=sqlite.engine.d.ts.map