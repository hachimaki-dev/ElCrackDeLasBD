"use strict";
/**
 * SQL Engine Laboratory — Query Runner
 *
 * Ejecuta queries SQL utilizando los CLIs nativos dentro de los contenedores Docker.
 * Evita la necesidad de dependencias Node.js pesadas (pg, mysql2, oracledb).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryRunner = void 0;
const child_process_1 = require("child_process");
const engine_types_1 = require("../engines/engine.types");
const registry_1 = require("../engines/registry");
class QueryRunner {
    /**
     * Ejecuta una query SQL en el motor indicado usando docker exec.
     * @param profile El perfil de conexión con las credenciales
     * @param sqlText El texto SQL a ejecutar
     * @returns Un string con la salida (stdout) o un error si falla.
     */
    async runQuery(profile, sqlText) {
        const engine = (0, registry_1.getEngineById)(profile.engineId);
        if (!engine) {
            return (0, engine_types_1.failure)({
                code: 'ENGINE_NOT_FOUND',
                message: `Motor ${profile.engineId} no soportado.`,
            });
        }
        const cmd = this.buildDockerExecArgs(profile);
        return new Promise((resolve) => {
            // Usamos spawn para poder inyectar la query por stdin de forma segura
            // cmd = ['exec', '-i', 'nombre_contenedor', 'psql', '-U', '...']
            const child = (0, child_process_1.spawn)('docker', cmd, {
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
                    resolve((0, engine_types_1.success)(stdout));
                }
                else {
                    // Algunos CLIs tiran error en stdout (ej: mysql), otros en stderr (ej: psql)
                    const errorMsg = stderr.trim() ? stderr.trim() : stdout.trim();
                    resolve((0, engine_types_1.failure)({
                        code: 'QUERY_EXECUTION_FAILED',
                        message: `Error ejecutando la query (Código ${code}):\n${errorMsg}`,
                    }));
                }
            });
            child.on('error', (err) => {
                resolve((0, engine_types_1.failure)({
                    code: 'DOCKER_EXEC_FAILED',
                    message: `Error al invocar docker: ${err.message}`,
                    cause: err,
                }));
            });
            // Escribimos la query al stdin del proceso de docker y cerramos
            child.stdin.write(sqlText);
            child.stdin.end();
        });
    }
    /**
     * Construye los argumentos de CLI para docker exec basándose en el motor.
     */
    buildDockerExecArgs(profile) {
        const args = ['exec', '-i', engine_types_1.DOCKER_IMAGE_CONFIG.containerName];
        const pass = profile.password ?? '';
        const db = profile.database;
        switch (profile.engineId) {
            case 'postgres':
                // psql -U <user> -d <db> (si no hay db, no pasamos flag o pasamos postgres)
                args.push('psql', '-U', profile.user);
                if (db)
                    args.push('-d', db);
                break;
            case 'mysql':
            case 'mariadb': {
                // mysql -h 127.0.0.1 -P <port> -u <user> -p<pass> <db>
                const engineDef = (0, registry_1.getEngineById)(profile.engineId);
                args.push('mysql', '-h', '127.0.0.1', '-P', engineDef.defaultPort.toString(), '-u', profile.user);
                if (pass)
                    args.push(`-p${pass}`);
                if (db)
                    args.push(db);
                break;
            }
            case 'sqlserver':
                // sqlcmd -U <user> -P <pass> -d <db>
                args.push('/opt/mssql-tools18/bin/sqlcmd', '-U', profile.user, '-P', pass, '-C'); // -C para trust server cert
                if (db)
                    args.push('-d', db);
                break;
            case 'oracle': {
                // sqlplus -s <user>/<pass>@//127.0.0.1:1521/<db>
                // Oracle PDB no se crea dinámicamente con el nombre del usuario, usamos el por defecto (FREEPDB1)
                const engineDef = (0, registry_1.getEngineById)(profile.engineId);
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
exports.QueryRunner = QueryRunner;
//# sourceMappingURL=queryRunner.js.map