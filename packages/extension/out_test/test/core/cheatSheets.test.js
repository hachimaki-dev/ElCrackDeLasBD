"use strict";
/**
 * Tests para los Cheat Sheets de SQL.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const assert = __importStar(require("assert"));
const cheatSheets_1 = require("../../src/core/connection/cheatSheets");
const registry_1 = require("../../src/core/engines/registry");
suite('CheatSheets', () => {
    test('getCheatSheet retorna un cheat sheet válido para todos los motores registrados', () => {
        const engines = (0, registry_1.getAllEngines)();
        for (const engine of engines) {
            const cheatSheet = (0, cheatSheets_1.getCheatSheet)(engine.id);
            assert.ok(cheatSheet, `Debe retornar un cheat sheet para ${engine.id}`);
            assert.ok(cheatSheet.engineName, `El cheat sheet de ${engine.id} debe tener un engineName`);
            assert.ok(cheatSheet.tips.length > 0, `El cheat sheet de ${engine.id} debe tener tips`);
            assert.ok(cheatSheet.sections.length > 0, `El cheat sheet de ${engine.id} debe tener secciones`);
            for (const section of cheatSheet.sections) {
                assert.ok(section.title, `La sección del cheat sheet de ${engine.id} debe tener título`);
                assert.ok(section.items.length > 0, `La sección ${section.title} de ${engine.id} debe tener items`);
                for (const item of section.items) {
                    assert.ok(item.label, `El item de ${section.title} en ${engine.id} debe tener label`);
                    assert.ok(item.sql, `El item de ${section.title} en ${engine.id} debe tener sql`);
                }
            }
        }
    });
    test('Cheat sheet de PostgreSQL contiene menciones a JSONB y Upsert', () => {
        const cheatSheet = (0, cheatSheets_1.getCheatSheet)('postgres');
        const allSql = cheatSheet.sections.flatMap(s => s.items).map(i => i.sql).join(' ');
        const allLabels = cheatSheet.sections.flatMap(s => s.items).map(i => i.label).join(' ');
        assert.ok(allLabels.includes('JSONB') || allSql.includes('JSONB') || allLabels.includes('Upsert') || allSql.includes('ON CONFLICT'), 'PostgreSQL debe mencionar JSONB o Upsert');
    });
    test('Cheat sheet de MySQL menciona AUTO_INCREMENT', () => {
        const cheatSheet = (0, cheatSheets_1.getCheatSheet)('mysql');
        const allSql = cheatSheet.sections.flatMap(s => s.items).map(i => i.sql).join(' ');
        assert.ok(allSql.includes('AUTO_INCREMENT'), 'MySQL debe usar AUTO_INCREMENT en sus ejemplos');
    });
});
//# sourceMappingURL=cheatSheets.test.js.map