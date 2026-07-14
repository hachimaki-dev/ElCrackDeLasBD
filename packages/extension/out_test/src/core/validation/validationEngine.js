"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationEngine = void 0;
class ValidationEngine {
    queryRunner;
    constructor(queryRunner) {
        this.queryRunner = queryRunner;
    }
    /**
     * Valida un reto ejecutando las reglas de validación en la base de datos indicada.
     */
    async validate(engineId, profile, rules, userSql) {
        const results = [];
        let allPassed = true;
        // Si el usuario nos pasa su código SQL, podemos ejecutarlo primero si es parte de las reglas,
        // o simplemente validarlo en caso de que alguna regla requiera evaluarlo.
        const sqlToUse = userSql || '';
        for (let i = 0; i < rules.length; i++) {
            const rule = rules[i];
            let passed = false;
            let message = '';
            try {
                switch (rule.type) {
                    case 'column_exists': {
                        const table = rule.table || '';
                        const column = rule.column || '';
                        const expectedType = (rule.data_type || '').toLowerCase();
                        if (engineId === 'postgres') {
                            const checkSql = `
                SELECT data_type 
                FROM information_schema.columns 
                WHERE table_name = '${table.toLowerCase()}' 
                  AND column_name = '${column.toLowerCase()}';
              `;
                            const res = await this.queryRunner.runQuery(profile, checkSql);
                            if (res.ok && res.value.trim()) {
                                const actualType = res.value.toLowerCase();
                                if (actualType.includes(expectedType)) {
                                    passed = true;
                                    message = `Columna '${column}' en tabla '${table}' de tipo '${actualType.trim()}' confirmada.`;
                                }
                                else {
                                    message = `Columna '${column}' en tabla '${table}' existe, pero es de tipo '${actualType.trim()}' (esperaba '${expectedType}').`;
                                }
                            }
                            else {
                                message = `La columna '${column}' no existe en la tabla '${table}'.`;
                            }
                        }
                        else if (engineId === 'sqlite') {
                            const checkSql = `PRAGMA table_info('${table}');`;
                            const res = await this.queryRunner.runQuery(profile, checkSql);
                            if (res.ok) {
                                // SQLite table_info output format: cid|name|type|notnull|dflt_value|pk
                                const lines = res.value.split('\n');
                                let found = false;
                                for (const line of lines) {
                                    const parts = line.split('|');
                                    if (parts.length >= 3 && parts[1].toLowerCase() === column.toLowerCase()) {
                                        found = true;
                                        const actualType = parts[2].toLowerCase();
                                        if (actualType.includes(expectedType) || expectedType.includes(actualType)) {
                                            passed = true;
                                            message = `Columna '${column}' en tabla '${table}' de tipo '${actualType}' confirmada.`;
                                        }
                                        else {
                                            message = `Columna '${column}' en tabla '${table}' existe, pero es de tipo '${actualType}' (esperaba '${expectedType}').`;
                                        }
                                        break;
                                    }
                                }
                                if (!found) {
                                    message = `La columna '${column}' no existe en la tabla '${table}'.`;
                                }
                            }
                            else {
                                message = `Error consultando estructura de tabla '${table}' en SQLite.`;
                            }
                        }
                        else {
                            // Fallback genérico para otros motores usando information_schema
                            const checkSql = `
                SELECT DATA_TYPE 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = '${table}' 
                  AND COLUMN_NAME = '${column}';
              `;
                            const res = await this.queryRunner.runQuery(profile, checkSql);
                            if (res.ok && res.value.trim()) {
                                passed = true;
                                message = `Columna '${column}' en tabla '${table}' confirmada.`;
                            }
                            else {
                                message = `La columna '${column}' no existe en la tabla '${table}'.`;
                            }
                        }
                        break;
                    }
                    case 'constraint_exists': {
                        const table = rule.table || '';
                        const constraintName = rule.constraint_name || '';
                        const constraintType = rule.constraint_type || '';
                        if (engineId === 'postgres') {
                            let checkSql = '';
                            if (constraintName) {
                                checkSql = `
                  SELECT constraint_name 
                  FROM information_schema.table_constraints 
                  WHERE table_name = '${table.toLowerCase()}' 
                    AND constraint_name = '${constraintName.toLowerCase()}';
                `;
                            }
                            else {
                                checkSql = `
                  SELECT constraint_name 
                  FROM information_schema.table_constraints 
                  WHERE table_name = '${table.toLowerCase()}' 
                    AND constraint_type = '${constraintType.toUpperCase()}';
                `;
                            }
                            const res = await this.queryRunner.runQuery(profile, checkSql);
                            if (res.ok && res.value.trim()) {
                                passed = true;
                                message = `Restricción '${constraintType}' en tabla '${table}' confirmada.`;
                            }
                            else {
                                message = `No se encontró la restricción '${constraintType}' (${constraintName || 'sin nombre específico'}) en la tabla '${table}'.`;
                            }
                        }
                        else if (engineId === 'sqlite') {
                            // SQLite: parseamos el DDL de la tabla en sqlite_master
                            const checkSql = `SELECT sql FROM sqlite_master WHERE type = 'table' AND name = '${table}';`;
                            const res = await this.queryRunner.runQuery(profile, checkSql);
                            if (res.ok && res.value.trim()) {
                                const ddl = res.value.toUpperCase();
                                const typeUpper = constraintType.toUpperCase();
                                if (ddl.includes(typeUpper)) {
                                    passed = true;
                                    message = `Restricción '${constraintType}' en tabla '${table}' confirmada en DDL.`;
                                }
                                else {
                                    message = `No se detectó '${constraintType}' en la definición DDL de la tabla '${table}'.`;
                                }
                            }
                            else {
                                message = `No se encontró la tabla '${table}' en SQLite.`;
                            }
                        }
                        else {
                            passed = true; // Fallback tolerante para otros motores
                            message = `Verificación de restricción saltada para el motor ${engineId}.`;
                        }
                        break;
                    }
                    case 'index_exists': {
                        const table = rule.table || '';
                        const indexName = rule.index_name || '';
                        if (engineId === 'postgres') {
                            const checkSql = `
                SELECT indexname 
                FROM pg_indexes 
                WHERE tablename = '${table.toLowerCase()}' 
                  AND indexname = '${indexName.toLowerCase()}';
              `;
                            const res = await this.queryRunner.runQuery(profile, checkSql);
                            if (res.ok && res.value.trim()) {
                                passed = true;
                                message = `Índice '${indexName}' en tabla '${table}' confirmado.`;
                            }
                            else {
                                message = `No se encontró el índice '${indexName}' en la tabla '${table}'.`;
                            }
                        }
                        else if (engineId === 'sqlite') {
                            const checkSql = `
                SELECT name 
                FROM sqlite_master 
                WHERE type = 'index' 
                  AND tbl_name = '${table}' 
                  AND name = '${indexName}';
              `;
                            const res = await this.queryRunner.runQuery(profile, checkSql);
                            if (res.ok && res.value.trim()) {
                                passed = true;
                                message = `Índice '${indexName}' en tabla '${table}' confirmado.`;
                            }
                            else {
                                message = `No se encontró el índice '${indexName}' en la tabla '${table}'.`;
                            }
                        }
                        else {
                            passed = true;
                            message = `Verificación de índice saltada para el motor ${engineId}.`;
                        }
                        break;
                    }
                    case 'query_fails': {
                        const sqlToRun = rule.sql || '';
                        const res = await this.queryRunner.runQuery(profile, sqlToRun);
                        if (!res.ok) {
                            passed = true;
                            message = `Verificación exitosa: La consulta de prueba falló correctamente debido a restricciones de integridad. Error: ${res.error.message.split('\n')[0]}`;
                        }
                        else {
                            message = `Fallo de validación: Se esperaba que la consulta fallara por restricciones, pero se ejecutó exitosamente.`;
                        }
                        break;
                    }
                    case 'query_returns_rows': {
                        // Si el test usa el código del usuario, lo ejecutamos primero
                        let sqlToRun = rule.sql || '';
                        if (sqlToRun.includes('${userSql}')) {
                            sqlToRun = sqlToRun.replace('${userSql}', sqlToUse);
                        }
                        else if (!sqlToRun && sqlToUse) {
                            sqlToRun = sqlToUse;
                        }
                        if (!sqlToRun.trim()) {
                            message = 'No hay consulta para validar.';
                            break;
                        }
                        const res = await this.queryRunner.runQuery(profile, sqlToRun);
                        if (res.ok) {
                            const stdout = res.value;
                            const rowCount = stdout.trim() ? stdout.trim().split('\n').length : 0;
                            let checkOk = true;
                            if (rule.expected_rows !== undefined) {
                                // Restar cabeceras en motores que devuelven formateado (ej: psql/mysql) si es necesario.
                                // Para ser más tolerantes, si contiene filas o coincide el rowcount aproximado.
                                // En Postgres, psql añade cabeceras y pie de filas, ej: (2 rows)
                                // Haremos una limpieza general para verificar la cantidad.
                                const cleanLines = stdout.trim().split('\n').filter(l => l.trim() && !l.includes('---') && !l.startsWith('('));
                                const cleanCount = cleanLines.length > 0 ? cleanLines.length - 1 : 0; // -1 por la cabecera
                                // En SQLite no hay cabecera por defecto si no se activa, por lo que cleanLines.length es el count exacto.
                                const finalCount = engineId === 'sqlite' ? cleanLines.length : Math.max(0, cleanCount);
                                if (finalCount !== rule.expected_rows && rowCount !== rule.expected_rows) {
                                    checkOk = false;
                                    message = `Se esperaban ${rule.expected_rows} filas de resultado, pero se obtuvieron aproximadamente ${finalCount}.`;
                                }
                            }
                            if (checkOk && rule.expected_contains) {
                                for (const lookFor of rule.expected_contains) {
                                    if (!stdout.toLowerCase().includes(lookFor.toLowerCase())) {
                                        checkOk = false;
                                        message = `El resultado de la consulta no contiene el valor esperado: '${lookFor}'.`;
                                        break;
                                    }
                                }
                            }
                            if (checkOk) {
                                passed = true;
                                message = `La consulta se ejecutó y retornó los datos correctos.`;
                            }
                        }
                        else {
                            message = `La consulta de validación falló: ${res.error.message}`;
                        }
                        break;
                    }
                    case 'explain_contains': {
                        let sqlToExplain = rule.sql || '';
                        if (sqlToExplain.includes('${userSql}')) {
                            sqlToExplain = sqlToExplain.replace('${userSql}', sqlToUse);
                        }
                        else if (!sqlToExplain && sqlToUse) {
                            sqlToExplain = sqlToUse;
                        }
                        if (!sqlToExplain.trim()) {
                            message = 'No hay consulta para analizar el plan de ejecución.';
                            break;
                        }
                        let explainSql = '';
                        if (engineId === 'postgres') {
                            explainSql = `EXPLAIN ${sqlToExplain};`;
                        }
                        else if (engineId === 'sqlite') {
                            explainSql = `EXPLAIN QUERY PLAN ${sqlToExplain};`;
                        }
                        else {
                            explainSql = `EXPLAIN ${sqlToExplain};`;
                        }
                        const res = await this.queryRunner.runQuery(profile, explainSql);
                        if (res.ok) {
                            const explainOutput = res.value.toLowerCase();
                            let checkOk = true;
                            if (rule.explain_contains) {
                                for (const matchStr of rule.explain_contains) {
                                    if (!explainOutput.includes(matchStr.toLowerCase())) {
                                        checkOk = false;
                                        message = `Plan de ejecución ineficiente. No contiene: '${matchStr}'.`;
                                        break;
                                    }
                                }
                            }
                            if (checkOk) {
                                passed = true;
                                message = `¡Optimización validada! El plan de ejecución cumple con los requisitos del índice.`;
                            }
                        }
                        else {
                            message = `Error al ejecutar EXPLAIN: ${res.error.message}`;
                        }
                        break;
                    }
                    default:
                        message = `Regla de validación desconocida: ${rule.type}`;
                }
            }
            catch (err) {
                message = `Excepción al validar regla ${rule.type}: ${err.message || err}`;
            }
            if (!passed) {
                allPassed = false;
            }
            results.push({
                ruleIndex: i,
                type: rule.type,
                passed,
                message
            });
        }
        return {
            passed: allPassed,
            results
        };
    }
}
exports.ValidationEngine = ValidationEngine;
//# sourceMappingURL=validationEngine.js.map