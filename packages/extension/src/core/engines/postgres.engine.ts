/**
 * SQL Engine Laboratory — PostgreSQL Engine Adapter
 *
 * Definición del motor PostgreSQL para el catálogo de motores.
 * Puerto por defecto: 5432
 * Cliente nativo: psql
 */

import { EngineDefinition } from './engine.types';

export const postgresEngine: EngineDefinition = {
  id: 'postgres',
  displayName: 'PostgreSQL',
  description: 'Base de datos relacional open-source, robusta y extensible',
  defaultPort: 5432,
  dockerEnvValue: 'postgres',
  connectionTemplate: {
    command: 'psql',
    argsTemplate: '-h {host} -p {port} -U {user} -d {database}',
    defaultUser: 'labuser',
    defaultPassword: 'labpassword',
    defaultDatabase: 'labdb',
  },
  healthcheckTimeoutMs: 30_000,
  iconId: 'database',
};
