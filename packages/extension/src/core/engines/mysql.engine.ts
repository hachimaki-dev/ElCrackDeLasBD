/**
 * SQL Engine Laboratory — MySQL Engine Adapter
 *
 * Definición del motor MySQL para el catálogo de motores.
 * Puerto por defecto: 3306
 * Cliente nativo: mysql
 */

import { EngineDefinition } from './engine.types';

export const mysqlEngine: EngineDefinition = {
  id: 'mysql',
  displayName: 'MySQL',
  description: 'Base de datos relacional open-source, la más popular del mundo',
  defaultPort: 3306,
  dockerEnvValue: 'mysql',
  connectionTemplate: {
    command: 'mysql',
    argsTemplate: '-h {host} -P {port} -u {user} -p{password} {database}',
    defaultUser: 'labuser',
    defaultPassword: 'labpassword',
    defaultDatabase: 'labdb',
  },
  healthcheckTimeoutMs: 45_000,
  iconId: 'database',
};
