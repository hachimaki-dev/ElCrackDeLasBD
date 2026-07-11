/**
 * SQL Engine Laboratory — Sheet Commands
 *
 * Maneja los comandos de la UI para hojas SQL:
 * - Crear nueva hoja
 * - Cambiar conexión de hoja
 * - Ejecutar query
 */

import * as vscode from 'vscode';
import { SheetManager } from './sheetManager';
import { CredentialVault, ConnectionProfile } from '../../core/credentials/vault';
import { QueryRunner } from '../../core/runner/queryRunner';
import { ContainerLifecycle } from '../../core/docker/containerLifecycle';
import { getEngineById } from '../../core/engines/registry';
import { EngineId } from '../../core/engines/engine.types';

export function registerSheetCommands(
  sheetManager: SheetManager,
  vault: CredentialVault,
  runner: QueryRunner,
  lifecycle: ContainerLifecycle
): vscode.Disposable[] {
  // Escuchar cierre de documentos para limpiar memoria
  const cleanupDisposable = vscode.workspace.onDidCloseTextDocument((doc) => {
    sheetManager.handleDocumentClosed(doc);
  });

  // Panel de resultados (reutilizable)
  let resultPanel: vscode.WebviewPanel | undefined;

  const disposables: vscode.Disposable[] = [
    cleanupDisposable,

    // ------------------------------------------------------------------
    // Nueva Hoja SQL
    // ------------------------------------------------------------------
    vscode.commands.registerCommand('sqlEngineLab.newSqlSheet', async () => {
      const currentEngineId = lifecycle.getCurrentEngine();
      if (!currentEngineId) {
        void vscode.window.showErrorMessage('Inicia un motor SQL primero para crear una hoja.');
        return;
      }

      // 1. Abrir documento sin título
      const document = await vscode.workspace.openTextDocument({
        language: 'sql',
        content: `-- Hoja SQL para motor: ${currentEngineId}\n\n`,
      });
      await vscode.window.showTextDocument(document);

      // 2. Asociar conexión inmediatamente
      await configureConnectionForSheet(document.uri, currentEngineId, vault, sheetManager);
    }),

    // ------------------------------------------------------------------
    // Cambiar Conexión SQL (Botón en Title)
    // ------------------------------------------------------------------
    vscode.commands.registerCommand('sqlEngineLab.changeConnection', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== 'sql') return;

      const currentEngineId = lifecycle.getCurrentEngine();
      if (!currentEngineId) {
        void vscode.window.showErrorMessage('No hay un motor SQL en ejecución.');
        return;
      }

      await configureConnectionForSheet(editor.document.uri, currentEngineId, vault, sheetManager);
    }),

    // ------------------------------------------------------------------
    // Ejecutar Query (Botón Play)
    // ------------------------------------------------------------------
    vscode.commands.registerCommand('sqlEngineLab.runSql', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== 'sql') return;

      const currentEngineId = lifecycle.getCurrentEngine();
      if (!currentEngineId) {
        void vscode.window.showErrorMessage('No hay un motor SQL en ejecución.');
        return;
      }

      let profile = sheetManager.getConnectionForSheet(editor.document.uri);
      
      // Si la hoja no tiene conexión (ej. usuario abrió un .sql existente), pedirla
      if (!profile) {
        profile = await configureConnectionForSheet(editor.document.uri, currentEngineId, vault, sheetManager);
        if (!profile) return; // Usuario canceló
      }

      // Validar que el motor del perfil coincide con el corriendo actualmente
      if (profile.engineId !== currentEngineId) {
        const swap = await vscode.window.showWarningMessage(
          `Esta hoja está configurada para '${profile.engineId}', pero el motor actual es '${currentEngineId}'. ¿Cambiar configuración de la hoja al motor actual?`,
          'Sí, Cambiar'
        );
        if (swap !== 'Sí, Cambiar') return;
        profile = await configureConnectionForSheet(editor.document.uri, currentEngineId, vault, sheetManager);
        if (!profile) return;
      }

      // Obtener el texto a ejecutar (selección o todo)
      const selection = editor.selection;
      const textToRun = selection.isEmpty
        ? editor.document.getText()
        : editor.document.getText(selection);

      if (!textToRun.trim()) {
        void vscode.window.showInformationMessage('No hay consulta SQL para ejecutar.');
        return;
      }

      // Mostrar barra de progreso
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Ejecutando consulta en ${currentEngineId}...`,
          cancellable: false,
        },
        async () => {
          // Recuperar la contraseña del Vault
          const vaultPassword = await vault.getPassword(profile!.id);
          // Creamos una copia del perfil con el password inyectado para la ejecución
          const execProfile: ConnectionProfile = { ...profile!, password: vaultPassword || profile!.password };

          const result = await runner.runQuery(execProfile, textToRun);

          if (result.ok) {
            showSqlResult(result.value, resultPanel, (p) => resultPanel = p);
          } else {
            void vscode.window.showErrorMessage(`Error ejecutando SQL: ${result.error.message}`);
          }
        }
      );
    }),
  ];

  return disposables;
}

/**
 * Asistente para configurar la conexión de una hoja.
 */
async function configureConnectionForSheet(
  uri: vscode.Uri,
  engineId: EngineId,
  vault: CredentialVault,
  sheetManager: SheetManager
): Promise<ConnectionProfile | undefined> {
  const engineDef = getEngineById(engineId);
  const config = vscode.workspace.getConfiguration('sqlEngineLab.credentials');
  
  const options = [
    { label: '$(beaker) Sandbox Efímero', description: 'Usa el usuario estándar del lab. No guarda credenciales.', id: 'sandbox' },
    { label: '$(add) Nueva Conexión Guardada...', description: 'Crea un perfil con credenciales propias para este motor.', id: 'new' }
  ];

  // Agregar perfiles guardados compatibles con este motor
  const savedProfiles = vault.getProfiles().filter((p) => p.engineId === engineId);
  for (const p of savedProfiles) {
    options.push({ label: `$(database) ${p.name}`, description: `Usuario: ${p.user}`, id: p.id });
  }

  const selected = await vscode.window.showQuickPick(options, {
    title: `Conexión SQL para hoja (Motor: ${engineDef?.displayName})`,
    placeHolder: 'Selecciona cómo conectarte al motor'
  });

  if (!selected) return undefined;

  let profile: ConnectionProfile;

  if (selected.id === 'sandbox') {
    profile = {
      id: `sandbox-${engineId}-${Date.now()}`,
      name: 'Sandbox',
      engineId,
      user: config.get<string>('labUser', 'labuser'),
      database: config.get<string>('labDatabase', 'labdb'),
      password: config.get<string>('labPassword', 'LabPassword123!')
    };
  } else if (selected.id === 'new') {
    const pName = await vscode.window.showInputBox({ prompt: 'Nombre para este perfil (Ej: Mi Oracle Admin)' });
    if (!pName) return undefined;
    const pUser = await vscode.window.showInputBox({ prompt: 'Usuario de la Base de Datos' });
    if (!pUser) return undefined;
    const pPass = await vscode.window.showInputBox({ prompt: 'Contraseña (se guardará de forma segura)', password: true });
    const pDb = await vscode.window.showInputBox({ prompt: 'Nombre de Base de Datos (Opcional)' });

    const newId = `profile-${Date.now()}`;
    profile = {
      id: newId,
      name: pName,
      engineId,
      user: pUser,
      database: pDb || undefined
    };

    await vault.saveProfile(profile, pPass);
    vscode.window.showInformationMessage(`Perfil '${pName}' guardado exitosamente.`);
  } else {
    // Perfil existente
    profile = savedProfiles.find(p => p.id === selected.id)!;
  }

  sheetManager.bindSheetToConnection(uri, profile);
  vscode.window.showInformationMessage(`Hoja conectada como: ${profile.name} (${profile.user})`);
  return profile;
}

/**
 * Muestra el resultado de la consulta.
 * Para el MVP, usaremos un Webview panel sencillo de solo lectura.
 */
function showSqlResult(
  resultText: string, 
  existingPanel: vscode.WebviewPanel | undefined,
  setPanel: (p: vscode.WebviewPanel | undefined) => void
) {
  let panel = existingPanel;

  if (panel) {
    panel.reveal(vscode.ViewColumn.Beside, true);
  } else {
    panel = vscode.window.createWebviewPanel(
      'sqlResult',
      'SQL Results',
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
      { enableFindWidget: true, retainContextWhenHidden: true }
    );
    
    panel.onDidDispose(() => {
      setPanel(undefined);
    });
    setPanel(panel);
  }

  // Escapar HTML básico
  const escapeHtml = (text: string) => text.replace(/</g, "&lt;").replace(/>/g, "&gt;");

  panel.webview.html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>SQL Results</title>
      <style>
        body { font-family: var(--vscode-editor-font-family); font-size: var(--vscode-editor-font-size); padding: 10px; color: var(--vscode-editor-foreground); }
        pre { white-space: pre-wrap; word-wrap: break-word; background: var(--vscode-textCodeBlock-background); padding: 16px; border-radius: 4px; overflow-x: auto;}
      </style>
    </head>
    <body>
      <h2>Query Result</h2>
      <pre>${escapeHtml(resultText || 'Query ejecutada correctamente sin salida tabular.')}</pre>
    </body>
    </html>
  `;
}
