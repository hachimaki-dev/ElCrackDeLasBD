"use strict";
/**
 * SQL Engine Laboratory — Sheet Commands
 *
 * Maneja los comandos de la UI para hojas SQL:
 * - Crear nueva hoja
 * - Cambiar conexión de hoja
 * - Ejecutar query
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
exports.registerSheetCommands = registerSheetCommands;
const vscode = __importStar(require("vscode"));
const registry_1 = require("../../core/engines/registry");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
function registerSheetCommands(context, sheetManager, vault, runner, lifecycle) {
    // Escuchar cierre de documentos para limpiar memoria
    const cleanupDisposable = vscode.workspace.onDidCloseTextDocument((doc) => {
        sheetManager.handleDocumentClosed(doc);
    });
    // Panel de resultados (reutilizable)
    let resultPanel;
    const disposables = [
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
            if (!editor || editor.document.languageId !== 'sql')
                return;
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
            if (!editor || editor.document.languageId !== 'sql')
                return;
            const currentEngineId = lifecycle.getCurrentEngine();
            if (!currentEngineId) {
                void vscode.window.showErrorMessage('No hay un motor SQL en ejecución.');
                return;
            }
            let profile = sheetManager.getConnectionForSheet(editor.document.uri);
            // Si la hoja no tiene conexión (ej. usuario abrió un .sql existente), pedirla
            if (!profile) {
                profile = await configureConnectionForSheet(editor.document.uri, currentEngineId, vault, sheetManager);
                if (!profile)
                    return; // Usuario canceló
            }
            // Validar que el motor del perfil coincide con el corriendo actualmente
            if (profile.engineId !== currentEngineId) {
                const swap = await vscode.window.showWarningMessage(`Esta hoja está configurada para '${profile.engineId}', pero el motor actual es '${currentEngineId}'. ¿Cambiar configuración de la hoja al motor actual?`, 'Sí, Cambiar');
                if (swap !== 'Sí, Cambiar')
                    return;
                profile = await configureConnectionForSheet(editor.document.uri, currentEngineId, vault, sheetManager);
                if (!profile)
                    return;
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
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Ejecutando consulta en ${currentEngineId}...`,
                cancellable: false,
            }, async () => {
                // Recuperar la contraseña del Vault
                const vaultPassword = await vault.getPassword(profile.id);
                // Creamos una copia del perfil con el password inyectado para la ejecución
                const execProfile = {
                    ...profile,
                    password: vaultPassword || profile.password,
                };
                const result = await runner.runQuery(execProfile, textToRun);
                if (result.ok) {
                    showSqlResult(textToRun, result.value, resultPanel, (p) => (resultPanel = p));
                }
                else {
                    void vscode.window.showErrorMessage(`Error ejecutando SQL: ${result.error.message}`);
                }
            });
        }),
        // ------------------------------------------------------------------
        // Abrir Hoja de Tutorial
        // ------------------------------------------------------------------
        vscode.commands.registerCommand('sqlEngineLab.openTutorialSheet', async (moduleId) => {
            const currentEngineId = lifecycle.getCurrentEngine();
            if (!currentEngineId) {
                void vscode.window.showErrorMessage('Inicia un motor SQL primero para ver sus tutoriales.');
                return;
            }
            // Leer lab-tutorials.json
            let tutorialsData = null;
            // Intentar primero en el workspace (útil para desarrollo)
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (workspaceFolders && workspaceFolders.length > 0) {
                const wsPath = path.join(workspaceFolders[0].uri.fsPath, 'lab-tutorials.json');
                if (fs.existsSync(wsPath)) {
                    try {
                        tutorialsData = JSON.parse(fs.readFileSync(wsPath, 'utf8'));
                    }
                    catch (e) {
                        console.error('Error reading workspace lab-tutorials', e);
                    }
                }
            }
            // Si no está en el workspace, intentar resolver usando el extensionPath (garantizado que existe)
            if (!tutorialsData) {
                try {
                    // Si estamos en desarrollo, context.extensionPath es /packages/extension
                    // Si empaquetamos lab-tutorials, deberíamos moverlo a resources/ o similar,
                    // pero por ahora buscamos 2 niveles arriba.
                    let tutorialsPath = path.join(context.extensionPath, '..', '..', 'lab-tutorials.json');
                    if (!fs.existsSync(tutorialsPath)) {
                        // Intento alternativo (si estuviera en root de extension)
                        tutorialsPath = path.join(context.extensionPath, 'lab-tutorials.json');
                    }
                    if (fs.existsSync(tutorialsPath)) {
                        tutorialsData = JSON.parse(fs.readFileSync(tutorialsPath, 'utf8'));
                    }
                    else {
                        throw new Error(`File not found at ${tutorialsPath}`);
                    }
                }
                catch (err) {
                    void vscode.window.showErrorMessage(`No se pudo cargar lab-tutorials.json: ${err.message}`);
                    return;
                }
            }
            const engineTutorials = tutorialsData[currentEngineId];
            if (!engineTutorials || !engineTutorials[moduleId]) {
                void vscode.window.showErrorMessage(`Tutorial '${moduleId}' no encontrado para el motor ${currentEngineId}`);
                return;
            }
            const tutorial = engineTutorials[moduleId];
            // 1. Abrir documento
            const document = await vscode.workspace.openTextDocument({
                language: 'sql',
                content: `-- ${tutorial.title}\n-- ${tutorial.description}\n\n${tutorial.content}\n`,
            });
            await vscode.window.showTextDocument(document);
            // 2. Asociar conexión en modo sandbox (mockeando el quickpick o forzándolo)
            // Como configureConnectionForSheet usa QuickPick, para tutorial lo ideal es saltárselo y forzar sandbox.
            const config = vscode.workspace.getConfiguration('sqlEngineLab.credentials');
            const sandboxProfile = {
                id: `sandbox-${currentEngineId}-${Date.now()}`,
                name: 'Sandbox',
                engineId: currentEngineId,
                user: config.get('labUser', 'labuser'),
                database: config.get('labDatabase', 'labdb'),
                password: config.get('labPassword', 'LabPassword123!'),
            };
            sheetManager.bindSheetToConnection(document.uri, sandboxProfile);
            // 3. Ejecutar script de setup de base de datos si está definido
            if (tutorial.setup && tutorial.setup.trim()) {
                try {
                    const setupResult = await runner.runQuery(sandboxProfile, tutorial.setup);
                    if (!setupResult.ok) {
                        console.error('Error in tutorial setup SQL execution:', setupResult.error.message);
                        void vscode.window.showWarningMessage(`Advertencia al preparar la base de datos (setup): ${setupResult.error.message}`);
                    }
                }
                catch (e) {
                    console.error('Exception in tutorial setup:', e);
                }
            }
            vscode.window.showInformationMessage(`Tutorial '${tutorial.title}' abierto y conectado al Sandbox.`);
        }),
    ];
    return disposables;
}
/**
 * Asistente para configurar la conexión de una hoja.
 */
async function configureConnectionForSheet(uri, engineId, vault, sheetManager) {
    const engineDef = (0, registry_1.getEngineById)(engineId);
    const config = vscode.workspace.getConfiguration('sqlEngineLab.credentials');
    const options = [
        {
            label: '$(beaker) Sandbox Efímero',
            description: 'Usa el usuario estándar del lab. No guarda credenciales.',
            id: 'sandbox',
        },
        {
            label: '$(add) Nueva Conexión Guardada...',
            description: 'Crea un perfil con credenciales propias para este motor.',
            id: 'new',
        },
    ];
    // Agregar perfiles guardados compatibles con este motor
    const savedProfiles = vault.getProfiles().filter((p) => p.engineId === engineId);
    for (const p of savedProfiles) {
        options.push({ label: `$(database) ${p.name}`, description: `Usuario: ${p.user}`, id: p.id });
    }
    const selected = await vscode.window.showQuickPick(options, {
        title: `Conexión SQL para hoja (Motor: ${engineDef?.displayName})`,
        placeHolder: 'Selecciona cómo conectarte al motor',
    });
    if (!selected)
        return undefined;
    let profile;
    if (selected.id === 'sandbox') {
        profile = {
            id: `sandbox-${engineId}-${Date.now()}`,
            name: 'Sandbox',
            engineId,
            user: config.get('labUser', 'labuser'),
            database: config.get('labDatabase', 'labdb'),
            password: config.get('labPassword', 'LabPassword123!'),
        };
    }
    else if (selected.id === 'new') {
        const pName = await vscode.window.showInputBox({
            prompt: 'Nombre para este perfil (Ej: Mi Oracle Admin)',
        });
        if (!pName)
            return undefined;
        const pUser = await vscode.window.showInputBox({ prompt: 'Usuario de la Base de Datos' });
        if (!pUser)
            return undefined;
        const pPass = await vscode.window.showInputBox({
            prompt: 'Contraseña (se guardará de forma segura)',
            password: true,
        });
        const pDb = await vscode.window.showInputBox({ prompt: 'Nombre de Base de Datos (Opcional)' });
        const newId = `profile-${Date.now()}`;
        profile = {
            id: newId,
            name: pName,
            engineId,
            user: pUser,
            database: pDb || undefined,
        };
        await vault.saveProfile(profile, pPass);
        vscode.window.showInformationMessage(`Perfil '${pName}' guardado exitosamente.`);
    }
    else {
        // Perfil existente
        profile = savedProfiles.find((p) => p.id === selected.id);
    }
    sheetManager.bindSheetToConnection(uri, profile);
    vscode.window.showInformationMessage(`Hoja conectada como: ${profile.name} (${profile.user})`);
    return profile;
}
/**
 * Muestra el resultado de la consulta.
 * Utiliza un Webview panel con pestañas para mantener el historial.
 */
function showSqlResult(query, resultText, existingPanel, setPanel) {
    let panel = existingPanel;
    if (!panel) {
        panel = vscode.window.createWebviewPanel('sqlResult', 'SQL Results', { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true }, { enableFindWidget: true, retainContextWhenHidden: true, enableScripts: true });
        panel.onDidDispose(() => {
            setPanel(undefined);
        });
        setPanel(panel);
        // Inyectar HTML base solo la primera vez
        panel.webview.html = getSqlResultWebviewContent();
    }
    else {
        panel.reveal(vscode.ViewColumn.Beside, true);
    }
    // Enviar el nuevo resultado al Webview
    panel.webview.postMessage({
        command: 'newResult',
        query: query,
        resultText: resultText || 'Query ejecutada correctamente sin salida tabular.',
        timestamp: new Date().toLocaleTimeString(),
    });
}
/**
 * Retorna el HTML estático para el panel de resultados.
 */
function getSqlResultWebviewContent() {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>SQL Results</title>
      <style>
        :root {
          --tab-bg: var(--vscode-editor-background);
          --tab-active-bg: var(--vscode-tab-activeBackground);
          --tab-active-fg: var(--vscode-tab-activeForeground);
          --tab-inactive-bg: var(--vscode-tab-inactiveBackground);
          --tab-inactive-fg: var(--vscode-tab-inactiveForeground);
          --flash-color: rgba(76, 175, 80, 0.2);
        }
        body { 
          font-family: var(--vscode-editor-font-family); 
          font-size: var(--vscode-editor-font-size); 
          padding: 0; 
          margin: 0;
          color: var(--vscode-editor-foreground); 
          display: flex;
          flex-direction: column;
          height: 100vh;
        }
        .tabs {
          display: flex;
          background: var(--tab-inactive-bg);
          border-bottom: 1px solid var(--vscode-panel-border);
        }
        .tab {
          padding: 8px 16px;
          cursor: pointer;
          color: var(--tab-inactive-fg);
          background: var(--tab-inactive-bg);
          border-right: 1px solid var(--vscode-panel-border);
          position: relative;
          user-select: none;
        }
        .tab:hover {
          background: var(--vscode-list-hoverBackground);
        }
        .tab.active {
          color: var(--tab-active-fg);
          background: var(--tab-active-bg);
          border-bottom: 2px solid var(--vscode-activityBar-activeBorder);
        }
        .badge {
          background: var(--vscode-notificationsInfoIcon-foreground);
          color: var(--vscode-editor-background);
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 10px;
          margin-left: 8px;
          display: none;
        }
        .tab.new-result .badge {
          display: inline-block;
        }
        .content-area {
          flex: 1;
          overflow: auto;
          padding: 16px;
          position: relative;
        }
        .panel {
          display: none;
        }
        .panel.active {
          display: block;
        }
        pre { 
          white-space: pre-wrap; 
          word-wrap: break-word; 
          background: var(--vscode-textCodeBlock-background); 
          padding: 16px; 
          border-radius: 4px; 
          overflow-x: auto;
        }
        .query-box {
          font-family: var(--vscode-editor-font-family);
          color: var(--vscode-editor-foreground);
          background: rgba(128, 128, 128, 0.1);
          padding: 8px;
          border-left: 4px solid var(--vscode-editorHoverWidget-border);
          margin-bottom: 12px;
          white-space: pre-wrap;
          font-size: 0.9em;
        }
        .history-item {
          border-bottom: 1px solid var(--vscode-panel-border);
          padding-bottom: 16px;
          margin-bottom: 16px;
        }
        .history-item:last-child {
          border-bottom: none;
        }
        .timestamp {
          font-size: 0.85em;
          color: var(--vscode-descriptionForeground);
          margin-bottom: 8px;
        }
        
        /* Animación Flash para feedback visual */
        @keyframes flash {
          0% { background-color: var(--flash-color); }
          100% { background-color: transparent; }
        }
        .flash-animation {
          animation: flash 1s ease-out;
        }
      </style>
    </head>
    <body>
      <div class="tabs">
        <div class="tab active" id="tab-current" onclick="switchTab('current')">
          Resultado Actual <span class="badge">¡Nuevo!</span>
        </div>
        <div class="tab" id="tab-history" onclick="switchTab('history')">
          Historial
        </div>
      </div>
      
      <div class="content-area" id="content-area">
        <div id="panel-current" class="panel active">
          <p id="current-empty">Ejecuta una consulta para ver los resultados aquí.</p>
          <div id="current-content" style="display: none;">
            <div class="timestamp" id="current-time"></div>
            <div class="query-box" id="current-query"></div>
            <pre id="current-result"></pre>
          </div>
        </div>
        
        <div id="panel-history" class="panel">
          <div id="history-list"></div>
          <p id="history-empty">No hay historial todavía.</p>
        </div>
      </div>

      <script>
        let history = [];
        let currentResult = null;

        function escapeHtml(text) {
          if (!text) return '';
          return text
            .toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
        }

        function switchTab(tabId) {
          document.getElementById('tab-current').classList.remove('active');
          document.getElementById('tab-history').classList.remove('active');
          document.getElementById('panel-current').classList.remove('active');
          document.getElementById('panel-history').classList.remove('active');
          
          document.getElementById('tab-' + tabId).classList.add('active');
          document.getElementById('panel-' + tabId).classList.add('active');

          if (tabId === 'current') {
            document.getElementById('tab-current').classList.remove('new-result');
          }
        }

        function renderHistory() {
          const list = document.getElementById('history-list');
          const empty = document.getElementById('history-empty');
          
          if (history.length === 0) {
            empty.style.display = 'block';
            list.innerHTML = '';
            return;
          }
          
          empty.style.display = 'none';
          
          let html = '';
          // Mostrar el más reciente primero
          for (let i = history.length - 1; i >= 0; i--) {
            const item = history[i];
            html += \`
              <div class="history-item">
                <div class="timestamp">\${item.timestamp}</div>
                <div class="query-box">\${escapeHtml(item.query)}</div>
                <pre>\${escapeHtml(item.resultText)}</pre>
              </div>
            \`;
          }
          list.innerHTML = html;
        }

        window.addEventListener('message', event => {
          const message = event.data;
          
          if (message.command === 'newResult') {
            // Guardar el actual en el historial
            if (currentResult) {
              history.push(currentResult);
              renderHistory();
            }

            // Actualizar el estado actual
            currentResult = {
              query: message.query,
              resultText: message.resultText,
              timestamp: message.timestamp
            };

            // Mostrar el contenido
            document.getElementById('current-empty').style.display = 'none';
            document.getElementById('current-content').style.display = 'block';
            
            document.getElementById('current-time').textContent = currentResult.timestamp;
            document.getElementById('current-query').innerHTML = escapeHtml(currentResult.query);
            document.getElementById('current-result').innerHTML = escapeHtml(currentResult.resultText);

            // Reiniciar la animación de "flash"
            const contentArea = document.getElementById('content-area');
            contentArea.classList.remove('flash-animation');
            // Hack para forzar reflow y que la animación se reinicie
            void contentArea.offsetWidth;
            contentArea.classList.add('flash-animation');
            
            // Si estábamos en historial, mostrar badge de nuevo resultado y cambiar a actual
            switchTab('current');
          }
        });
      </script>
    </body>
    </html>
  `;
}
//# sourceMappingURL=sheetCommands.js.map