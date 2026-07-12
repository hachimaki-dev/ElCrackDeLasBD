/**
 * SQL Engine Laboratory — Query Runner
 *
 * Ejecuta queries SQL utilizando los CLIs nativos dentro de los contenedores Docker.
 * Evita la necesidad de dependencias Node.js pesadas (pg, mysql2, oracledb).
 */
import { ConnectionProfile } from '../credentials/vault';
import { Result } from '../engines/engine.types';
export declare class QueryRunner {
    /**
     * Ejecuta una query SQL en el motor indicado usando docker exec.
     * @param profile El perfil de conexión con las credenciales
     * @param sqlText El texto SQL a ejecutar
     * @returns Un string con la salida (stdout) o un error si falla.
     */
    runQuery(profile: ConnectionProfile, sqlText: string): Promise<Result<string>>;
    /**
     * Construye los argumentos de CLI para docker exec basándose en el motor.
     */
    private buildDockerExecArgs;
}
//# sourceMappingURL=queryRunner.d.ts.map