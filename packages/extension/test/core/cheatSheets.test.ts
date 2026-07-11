/**
 * Tests para los Cheat Sheets de SQL.
 */

import * as assert from 'assert';
import { getCheatSheet } from '../../src/core/connection/cheatSheets';
import { getAllEngines } from '../../src/core/engines/registry';

suite('CheatSheets', () => {
  test('getCheatSheet retorna un cheat sheet válido para todos los motores registrados', () => {
    const engines = getAllEngines();

    for (const engine of engines) {
      const cheatSheet = getCheatSheet(engine.id);

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
    const cheatSheet = getCheatSheet('postgres');
    const allSql = cheatSheet.sections.flatMap(s => s.items).map(i => i.sql).join(' ');
    const allLabels = cheatSheet.sections.flatMap(s => s.items).map(i => i.label).join(' ');

    assert.ok(allLabels.includes('JSONB') || allSql.includes('JSONB') || allLabels.includes('Upsert') || allSql.includes('ON CONFLICT'), 'PostgreSQL debe mencionar JSONB o Upsert');
  });

  test('Cheat sheet de MySQL menciona AUTO_INCREMENT', () => {
    const cheatSheet = getCheatSheet('mysql');
    const allSql = cheatSheet.sections.flatMap(s => s.items).map(i => i.sql).join(' ');
    
    assert.ok(allSql.includes('AUTO_INCREMENT'), 'MySQL debe usar AUTO_INCREMENT en sus ejemplos');
  });
});
