/**
 * SQL Engine Laboratory — Query Runner
 *
 * Ejecuta queries SQL utilizando los CLIs nativos dentro de los contenedores Docker.
 * Evita la necesidad de dependencias Node.js pesadas (pg, mysql2, oracledb).
 */

import { spawn } from 'child_process';
import { ConnectionProfile } from '../credentials/vault';
import { Result, success, failure, DOCKER_IMAGE_CONFIG } from '../engines/engine.types';
import { getEngineById } from '../engines/registry';

export class QueryRunner {
  /**
   * Ejecuta una query SQL en el motor indicado usando docker exec.
   * @param profile El perfil de conexión con las credenciales
   * @param sqlText El texto SQL a ejecutar
   * @returns Un string con la salida (stdout) o un error si falla.
   */
  public async runQuery(profile: ConnectionProfile, sqlText: string): Promise<Result<string>> {
    const engine = getEngineById(profile.engineId);
    if (!engine) {
      return failure({
        code: 'ENGINE_NOT_FOUND',
        message: `Motor ${profile.engineId} no soportado.`,
      });
    }

    const cmd = this.buildDockerExecArgs(profile);

    return new Promise((resolve) => {
      // Usamos spawn para poder inyectar la query por stdin de forma segura
      // cmd = ['exec', '-i', 'nombre_contenedor', 'psql', '-U', '...']
      const child = spawn('docker', cmd, {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve(success(stdout));
        } else {
          // Algunos CLIs tiran error en stdout (ej: mysql), otros en stderr (ej: psql)
          const errorMsg = stderr.trim() ? stderr.trim() : stdout.trim();
          resolve(
            failure({
              code: 'QUERY_EXECUTION_FAILED',
              message: `Error ejecutando la query (Código ${code}):\n${errorMsg}`,
            })
          );
        }
      });

      child.on('error', (err) => {
        resolve(
          failure({
            code: 'DOCKER_EXEC_FAILED',
            message: `Error al invocar docker: ${err.message}`,
            cause: err,
          })
        );
      });

      // Escribimos la query al stdin del proceso de docker y cerramos
      child.stdin.write(sqlText);
      child.stdin.end();
    });
  }

  /**
   * Construye los argumentos de CLI para docker exec basándose en el motor.
   */
  private buildDockerExecArgs(profile: ConnectionProfile): string[] {
    const args = ['exec', '-i', DOCKER_IMAGE_CONFIG.containerName];

    const pass = profile.password ?? '';
    const db = profile.database;

    switch (profile.engineId) {
      case 'postgres':
        // psql -U <user> -d <db> (si no hay db, no pasamos flag o pasamos postgres)
        args.push('psql', '-U', profile.user);
        if (db) args.push('-d', db);
        break;

      case 'mysql':
      case 'mariadb': {
        // mysql -h 127.0.0.1 -P <port> -u <user> -p<pass> <db>
        const engineDef = getEngineById(profile.engineId)!;
        args.push('mysql', '-h', '127.0.0.1', '-P', engineDef.defaultPort.toString(), '-u', profile.user);
        if (pass) args.push(`-p${pass}`);
        if (db) args.push(db);
        break;
      }

      case 'sqlserver':
        // sqlcmd -U <user> -P <pass> -d <db>
        args.push('/opt/mssql-tools18/bin/sqlcmd', '-U', profile.user, '-P', pass, '-C'); // -C para trust server cert
        if (db) args.push('-d', db);
        break;

      case 'oracle': {
        // sqlplus -s <user>/<pass>@//127.0.0.1:1521/<db>
        // Oracle PDB no se crea dinámicamente con el nombre del usuario, usamos el por defecto (FREEPDB1)
        const engineDef = getEngineById(profile.engineId)!;
        const oracleDb = engineDef.connectionTemplate.defaultDatabase || 'FREEPDB1';
        args.push('sqlplus', '-s', `${profile.user}/${pass}@//127.0.0.1:1521/${oracleDb}`);
        break;
      }

      case 'sqlite':
        // sqlite3 <db>
        args.push('sqlite3', db || '/data/database.sqlite');
        break;

      default:
        // Fallback genérico, probablemente falle
        args.push('echo', 'CLI no soportado para este motor');
        break;
    }

    return args;
  }
}
