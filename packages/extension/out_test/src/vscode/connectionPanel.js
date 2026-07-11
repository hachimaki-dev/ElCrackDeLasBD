"use strict";
/**
 * SQL Engine Laboratory — Connection Panel Webview
 *
 * Webview panel que muestra los datos de conexión cuando un motor está corriendo:
 * - Host, puerto, usuario, password
 * - Comando de conexión completo listo para copiar (vía docker exec)
 * - Botón "Copiar comando" con feedback visual
 * - Cheat sheet SQL con los fundamentos adaptados al motor
 *
 * El panel se muestra automáticamente cuando un motor arranca exitosamente.
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
exports.ConnectionPanel = void 0;
const vscode = __importStar(require("vscode"));
const cheatSheets_1 = require("../core/connection/cheatSheets");
/**
 * Panel Webview que muestra información de conexión de un motor SQL activo.
 * Solo puede existir una instancia a la vez (singleton por sesión de extensión).
 */
class ConnectionPanel {
    static currentPanel;
    panel;
    constructor(panel, _extensionUri, engine, connectionInfo) {
        this.panel = panel;
        // Renderizar el contenido inicial
        this.update(engine, connectionInfo);
        // Manejar mensajes del Webview (botón copiar)
        this.panel.webview.onDidReceiveMessage(async (message) => {
            if (message.command === 'copy') {
                await vscode.env.clipboard.writeText(message.text);
                void vscode.window.showInformationMessage('✓ Comando copiado al portapapeles');
            }
        });
        // Limpiar cuando se cierra el panel
        this.panel.onDidDispose(() => {
            ConnectionPanel.currentPanel = undefined;
        });
    }
    /**
     * Crea o revela el panel de conexión.
     * Si ya existe, lo actualiza con los nuevos datos.
     *
     * @param extensionUri - URI de la extensión para resolución de recursos
     * @param engine - Definición del motor activo
     * @param connectionInfo - Datos de conexión del motor
     */
    static createOrReveal(extensionUri, engine, connectionInfo) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : vscode.ViewColumn.One;
        if (ConnectionPanel.currentPanel) {
            ConnectionPanel.currentPanel.panel.reveal(column);
            ConnectionPanel.currentPanel.update(engine, connectionInfo);
            return;
        }
        const panel = vscode.window.createWebviewPanel('sqlEngineLabConnection', `SQL Lab — ${engine.displayName}`, column ?? vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true,
        });
        ConnectionPanel.currentPanel = new ConnectionPanel(panel, extensionUri, engine, connectionInfo);
    }
    /**
     * Cierra el panel si está abierto.
     */
    static dispose() {
        if (ConnectionPanel.currentPanel) {
            ConnectionPanel.currentPanel.panel.dispose();
            ConnectionPanel.currentPanel = undefined;
        }
    }
    update(engine, connectionInfo) {
        this.panel.title = `SQL Lab — ${engine.displayName}`;
        this.panel.webview.html = this.buildHtml(engine, connectionInfo);
    }
    buildHtml(engine, info) {
        const isSqlite = engine.id === 'sqlite';
        const cheatSheet = (0, cheatSheets_1.getCheatSheet)(engine.id);
        const credentialsRows = isSqlite
            ? ''
            : `
        <tr>
          <td class="label">Usuario</td>
          <td class="value"><code>${this.escape(info.user)}</code></td>
        </tr>
        <tr>
          <td class="label">Password</td>
          <td class="value"><code>${this.escape(info.password)}</code></td>
        </tr>
        <tr>
          <td class="label">Base de datos</td>
          <td class="value"><code>${this.escape(info.database)}</code></td>
        </tr>
      `;
        const hostPortRow = isSqlite
            ? ''
            : `
        <tr>
          <td class="label">Host</td>
          <td class="value"><code>${this.escape(info.host)}</code></td>
        </tr>
        <tr>
          <td class="label">Puerto</td>
          <td class="value"><code>${info.port}</code></td>
        </tr>
      `;
        // Build cheat sheet HTML
        const tipsHtml = cheatSheet.tips
            .map((tip) => `<li>${this.escape(tip)}</li>`)
            .join('\n');
        const sectionsHtml = cheatSheet.sections
            .map((section) => {
            const itemsHtml = section.items
                .map((item) => `
            <div class="cheat-item">
              <div class="cheat-label">${this.escape(item.label)}</div>
              <pre class="cheat-code"><code>${this.escape(item.sql)}</code></pre>
              <button class="copy-sql-btn" onclick="copySql(this)" data-sql="${this.escapeAttr(item.sql)}">📋 Copiar</button>
            </div>
          `)
                .join('\n');
            return `
          <div class="cheat-section">
            <div class="cheat-section-title">${this.escape(section.title)}</div>
            ${itemsHtml}
          </div>
        `;
        })
            .join('\n');
        return /* html */ `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
  <title>SQL Engine Lab — ${this.escape(engine.displayName)}</title>
  <style>
    :root {
      --radius: 6px;
      --gap: 16px;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      padding: 24px;
      max-width: 800px;
    }

    .header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 24px;
    }

    .status-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #3fb950;
      box-shadow: 0 0 8px #3fb95080;
      animation: pulse 2s infinite;
      flex-shrink: 0;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    h1 {
      font-size: 18px;
      font-weight: 600;
      color: var(--vscode-foreground);
    }

    .subtitle {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      margin-top: 2px;
    }

    .section {
      background: var(--vscode-editor-inactiveSelectionBackground);
      border: 1px solid var(--vscode-panel-border);
      border-radius: var(--radius);
      padding: var(--gap);
      margin-bottom: var(--gap);
    }

    .section-title {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 12px;
    }

    table { width: 100%; border-collapse: collapse; }
    tr + tr td { border-top: 1px solid var(--vscode-panel-border); }
    td { padding: 8px 0; }
    td.label {
      color: var(--vscode-descriptionForeground);
      font-size: 12px;
      width: 120px;
      padding-right: 16px;
    }
    td.value code {
      font-family: var(--vscode-editor-font-family);
      font-size: 13px;
      background: var(--vscode-textCodeBlock-background);
      padding: 2px 6px;
      border-radius: 3px;
    }

    .command-block {
      background: var(--vscode-textCodeBlock-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: var(--radius);
      padding: 12px 16px;
      margin-bottom: 12px;
      font-family: var(--vscode-editor-font-family);
      font-size: 13px;
      word-break: break-all;
      line-height: 1.5;
    }

    .copy-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: var(--radius);
      padding: 8px 16px;
      font-size: 13px;
      font-family: var(--vscode-font-family);
      cursor: pointer;
      transition: background 0.15s;
    }
    .copy-btn:hover { background: var(--vscode-button-hoverBackground); }
    .copy-btn:active { transform: scale(0.98); }

    .copy-btn.copied {
      background: #3fb950;
      color: #fff;
    }

    .hint {
      margin-top: 12px;
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      line-height: 1.5;
    }

    /* ---- Cheat Sheet Styles ---- */
    .cheat-sheet-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      user-select: none;
    }

    .cheat-sheet-toggle {
      font-size: 11px;
      color: var(--vscode-textLink-foreground);
      cursor: pointer;
      border: none;
      background: none;
      font-family: var(--vscode-font-family);
      padding: 4px 8px;
      border-radius: 3px;
    }
    .cheat-sheet-toggle:hover {
      background: var(--vscode-button-secondaryBackground);
    }

    .cheat-body { margin-top: 16px; }

    .tips-list {
      list-style: none;
      padding: 0;
      margin-bottom: 20px;
    }
    .tips-list li {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      padding: 4px 0 4px 16px;
      position: relative;
      line-height: 1.5;
    }
    .tips-list li::before {
      content: '💡';
      position: absolute;
      left: 0;
      font-size: 10px;
    }

    .cheat-section {
      margin-bottom: 20px;
    }

    .cheat-section-title {
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 10px;
      padding-bottom: 6px;
      border-bottom: 1px solid var(--vscode-panel-border);
    }

    .cheat-item {
      margin-bottom: 14px;
      position: relative;
    }

    .cheat-label {
      font-size: 12px;
      font-weight: 500;
      margin-bottom: 4px;
      color: var(--vscode-textLink-foreground);
    }

    .cheat-code {
      background: var(--vscode-textCodeBlock-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 4px;
      padding: 10px 14px;
      font-family: var(--vscode-editor-font-family);
      font-size: 12px;
      line-height: 1.6;
      overflow-x: auto;
      white-space: pre;
      margin: 0;
    }

    .copy-sql-btn {
      position: absolute;
      top: 0;
      right: 0;
      font-size: 11px;
      padding: 2px 8px;
      border: none;
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border-radius: 3px;
      cursor: pointer;
      opacity: 0;
      transition: opacity 0.15s;
    }
    .cheat-item:hover .copy-sql-btn { opacity: 1; }
    .copy-sql-btn:hover { background: var(--vscode-button-secondaryHoverBackground); }
    .copy-sql-btn.copied-sql {
      background: #3fb950;
      color: #fff;
      opacity: 1;
    }

    .divider {
      border: none;
      border-top: 1px solid var(--vscode-panel-border);
      margin: 24px 0;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="status-dot"></div>
    <div>
      <h1>${this.escape(engine.displayName)} está corriendo</h1>
      <div class="subtitle">${this.escape(engine.description)}</div>
    </div>
  </div>

  ${!isSqlite ? `
  <div class="section">
    <div class="section-title">Datos de conexión</div>
    <table>
      ${hostPortRow}
      ${credentialsRows}
    </table>
  </div>
  ` : ''}

  <div class="section">
    <div class="section-title">Comando de conexión</div>
    <div class="command-block" id="cmd">${this.escape(info.connectionCommand)}</div>
    <button class="copy-btn" id="copyBtn" onclick="copyCommand()">
      <span>📋</span>
      <span id="copyLabel">Copiar comando</span>
    </button>
    <div class="hint">
      Pega este comando en cualquier terminal (integrada o del sistema) para conectarte.
    </div>
  </div>

  <hr class="divider">

  <!-- Cheat Sheet SQL -->
  <div class="section" id="cheatSheetSection">
    <div class="cheat-sheet-header" onclick="toggleCheatSheet()">
      <div class="section-title" style="margin-bottom: 0;">📖 Cheat Sheet SQL — ${this.escape(cheatSheet.engineName)}</div>
      <button class="cheat-sheet-toggle" id="toggleBtn">▼ Mostrar</button>
    </div>

    <div class="cheat-body" id="cheatBody" style="display: none;">
      <ul class="tips-list">
        ${tipsHtml}
      </ul>
      ${sectionsHtml}
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    let cheatSheetOpen = false;

    function copyCommand() {
      const cmd = document.getElementById('cmd').textContent;
      vscode.postMessage({ command: 'copy', text: cmd });

      const btn = document.getElementById('copyBtn');
      const label = document.getElementById('copyLabel');
      btn.classList.add('copied');
      label.textContent = '✓ Copiado';
      setTimeout(() => {
        btn.classList.remove('copied');
        label.textContent = 'Copiar comando';
      }, 2000);
    }

    function copySql(button) {
      const sql = button.getAttribute('data-sql');
      vscode.postMessage({ command: 'copy', text: sql });

      button.classList.add('copied-sql');
      button.textContent = '✓ Copiado';
      setTimeout(() => {
        button.classList.remove('copied-sql');
        button.textContent = '📋 Copiar';
      }, 2000);
    }

    function toggleCheatSheet() {
      cheatSheetOpen = !cheatSheetOpen;
      const body = document.getElementById('cheatBody');
      const btn = document.getElementById('toggleBtn');
      body.style.display = cheatSheetOpen ? 'block' : 'none';
      btn.textContent = cheatSheetOpen ? '▲ Ocultar' : '▼ Mostrar';
    }
  </script>
</body>
</html>`;
    }
    escape(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
    escapeAttr(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/\n/g, '&#10;');
    }
}
exports.ConnectionPanel = ConnectionPanel;
//# sourceMappingURL=connectionPanel.js.map