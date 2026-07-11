/**
 * SQL Engine Laboratory — MariaDB Engine Adapter
 *
 * Definición del motor MariaDB para el catálogo de motores.
 * Puerto por defecto: 3307 (distinto a MySQL para evitar confusión en la configuración,
 * aunque solo un motor corre a la vez).
 * Cliente nativo: mariadb
 */

import { EngineDefinition } from './engine.types';

export const mariadbEngine: EngineDefinition = {
  id: 'mariadb',
  displayName: 'MariaDB',
  description: 'Fork open-source de MySQL, compatible y con mejoras de rendimiento',
  defaultPort: 3307,
  dockerEnvValue: 'mariadb',
  connectionTemplate: {
    command: 'mariadb',
    argsTemplate: '-h {host} -P {port} -u {user} -p{password} {database}',
    defaultUser: 'labuser',
    defaultPassword: 'LabPassword123!',
    defaultDatabase: 'labdb',
    adminUser: 'root',
    adminPassword: '',
    adminPasswordRequiresInput: true,
    adminPasswordMessage: 'Sin contraseña por defecto en localhost',
    testCommands: [
      'SELECT VERSION();',
      'CREATE TABLE test (id INT AUTO_INCREMENT PRIMARY KEY, nombre VARCHAR(50));',
      "INSERT INTO test (nombre) VALUES ('Hola Lab');",
      'SELECT * FROM test;'
    ],
  },
  healthcheckTimeoutMs: 20000,
  startupSpeed: 'fast',
  iconId: 'database',
};
