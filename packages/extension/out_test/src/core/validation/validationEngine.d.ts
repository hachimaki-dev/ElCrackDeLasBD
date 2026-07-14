import { QueryRunner } from '../runner/queryRunner';
import { ConnectionProfile } from '../credentials/vault';
import { EngineId } from '../engines/engine.types';
export interface ValidationRule {
    type: 'column_exists' | 'constraint_exists' | 'index_exists' | 'query_fails' | 'query_returns_rows' | 'explain_contains';
    table?: string;
    column?: string;
    data_type?: string;
    constraint_name?: string;
    constraint_type?: string;
    index_name?: string;
    sql?: string;
    expected_rows?: number;
    expected_contains?: string[];
    explain_contains?: string[];
}
export interface ValidationResult {
    ruleIndex: number;
    type: string;
    passed: boolean;
    message: string;
}
export interface ValidationReport {
    passed: boolean;
    results: ValidationResult[];
}
export declare class ValidationEngine {
    private readonly queryRunner;
    constructor(queryRunner: QueryRunner);
    /**
     * Valida un reto ejecutando las reglas de validación en la base de datos indicada.
     */
    validate(engineId: EngineId, profile: ConnectionProfile, rules: ValidationRule[], userSql?: string): Promise<ValidationReport>;
}
//# sourceMappingURL=validationEngine.d.ts.map