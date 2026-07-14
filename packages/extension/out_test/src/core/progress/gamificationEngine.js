"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GamificationEngine = void 0;
class GamificationEngine {
    static XP_PER_LEVEL = 1000;
    /**
     * Calcula el nivel actual basado en el XP total.
     */
    static calculateLevel(xp) {
        const totalXP = xp.ddl + xp.dml + xp.optimization + xp.architecture;
        return Math.floor(totalXP / this.XP_PER_LEVEL) + 1;
    }
    /**
     * Determina la recompensa por completar un módulo específico.
     * Esto mapea los módulos de los tutoriales a disciplinas de ingeniería reales.
     */
    static getRewardForModule(moduleId) {
        // Mapeo básico: 
        // 1-x: Fundamentos (DDL/DML)
        // 2-x: Intermedio (Optimization/DML)
        // 3-x: Experto (Architecture/Optimization)
        if (moduleId === '1-1' || moduleId === '1-2') {
            return { xpType: 'ddl', amount: 150 };
        }
        if (moduleId === '1-3') {
            return { xpType: 'dml', amount: 200 };
        }
        if (moduleId === '2-1') {
            return { xpType: 'dml', amount: 250 };
        }
        if (moduleId === '2-2') {
            return { xpType: 'optimization', amount: 300, possibleBadge: 'maestro_optimizador' };
        }
        if (moduleId === '2-3') {
            return { xpType: 'architecture', amount: 350 };
        }
        if (moduleId === '3-1') {
            return { xpType: 'architecture', amount: 400, possibleBadge: 'guardian_acid' };
        }
        if (moduleId === '3-2' || moduleId === '3-3') {
            return { xpType: 'architecture', amount: 450 };
        }
        return { xpType: 'dml', amount: 100 }; // Default
    }
    /**
     * Aplica una recompensa al progreso actual y devuelve el nuevo estado.
     */
    static applyReward(progress, reward) {
        const newProgress = {
            ...progress,
            xp: { ...progress.xp },
            badges: [...progress.badges]
        };
        // Agregar XP
        newProgress.xp[reward.xpType] += reward.amount;
        // Recalcular Nivel
        newProgress.level = this.calculateLevel(newProgress.xp);
        // Agregar Badge si corresponde y no lo tiene
        if (reward.possibleBadge && !newProgress.badges.includes(reward.possibleBadge)) {
            newProgress.badges.push(reward.possibleBadge);
        }
        // Actualizar racha diaria
        const today = new Date().toISOString().split('T')[0];
        if (newProgress.lastActiveDate !== today) {
            if (newProgress.lastActiveDate) {
                const lastDate = new Date(newProgress.lastActiveDate);
                const currentDate = new Date(today);
                const diffDays = Math.floor((currentDate.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
                if (diffDays === 1) {
                    newProgress.streak += 1;
                }
                else if (diffDays > 1) {
                    newProgress.streak = 1; // Reset racha
                }
            }
            else {
                newProgress.streak = 1; // Primera vez
            }
            newProgress.lastActiveDate = today;
        }
        return newProgress;
    }
}
exports.GamificationEngine = GamificationEngine;
//# sourceMappingURL=gamificationEngine.js.map