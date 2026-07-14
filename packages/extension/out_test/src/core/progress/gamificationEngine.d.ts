export interface XPBreakdown {
    ddl: number;
    dml: number;
    optimization: number;
    architecture: number;
}
export interface EngineProgress {
    completedModules: string[];
    xp: XPBreakdown;
    level: number;
    badges: string[];
    streak: number;
    lastActiveDate?: string;
}
export interface GamificationReward {
    xpType: keyof XPBreakdown;
    amount: number;
    possibleBadge?: string;
}
export declare class GamificationEngine {
    private static readonly XP_PER_LEVEL;
    /**
     * Calcula el nivel actual basado en el XP total.
     */
    static calculateLevel(xp: XPBreakdown): number;
    /**
     * Determina la recompensa por completar un módulo específico.
     * Esto mapea los módulos de los tutoriales a disciplinas de ingeniería reales.
     */
    static getRewardForModule(moduleId: string): GamificationReward;
    /**
     * Aplica una recompensa al progreso actual y devuelve el nuevo estado.
     */
    static applyReward(progress: EngineProgress, reward: GamificationReward): EngineProgress;
}
//# sourceMappingURL=gamificationEngine.d.ts.map