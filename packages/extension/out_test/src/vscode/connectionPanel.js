"use strict";
/**
 * SQL Engine Laboratory — Connection Panel Webview
 *
 * Webview panel rediseñado con tabs para Estándar/Admin, soporte
 * para estado de carga (loading) y comandos de prueba.
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
class ConnectionPanel {
    static currentPanel;
    panel;
    currentEngine;
    currentInfo;
    currentStatus;
    loadingMessage;
    constructor(panel, _extensionUri, engine, connectionInfo, status, loadingMessage) {
        this.panel = panel;
        this.currentEngine = engine;
        this.currentInfo = connectionInfo;
        this.currentStatus = status;
        this.loadingMessage = loadingMessage;
        this.update();
        this.panel.webview.onDidReceiveMessage(async (message) => {
            if (message.command === 'copy') {
                await vscode.env.clipboard.writeText(message.text);
                void vscode.window.showInformationMessage('✓ Copiado al portapapeles');
            }
        });
        this.panel.onDidDispose(() => {
            ConnectionPanel.currentPanel = undefined;
        });
    }
    static createOrReveal(extensionUri, engine, connectionInfo) {
        ConnectionPanel.show(extensionUri, engine, connectionInfo, 'running');
    }
    static createOrRevealLoading(extensionUri, engine, status, message) {
        ConnectionPanel.show(extensionUri, engine, undefined, status, message);
    }
    static show(extensionUri, engine, connectionInfo, status, message) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : vscode.ViewColumn.One;
        if (ConnectionPanel.currentPanel) {
            ConnectionPanel.currentPanel.panel.reveal(column);
            ConnectionPanel.currentPanel.currentEngine = engine;
            ConnectionPanel.currentPanel.currentInfo = connectionInfo;
            ConnectionPanel.currentPanel.currentStatus = status;
            if (message)
                ConnectionPanel.currentPanel.loadingMessage = message;
            ConnectionPanel.currentPanel.update();
            return;
        }
        const panel = vscode.window.createWebviewPanel('sqlEngineLabConnection', `SQL Lab — ${engine.displayName}`, column ?? vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true,
        });
        ConnectionPanel.currentPanel = new ConnectionPanel(panel, extensionUri, engine, connectionInfo, status, message);
    }
    static dispose() {
        if (ConnectionPanel.currentPanel) {
            ConnectionPanel.currentPanel.panel.dispose();
            ConnectionPanel.currentPanel = undefined;
        }
    }
    update() {
        this.panel.title = `SQL Lab — ${this.currentEngine.displayName}`;
        this.panel.webview.html = this.buildHtml();
    }
    buildHtml() {
        const engine = this.currentEngine;
        const info = this.currentInfo;
        const isReady = this.currentStatus === 'running' && !!info;
        const isSqlite = engine.id === 'sqlite';
        // ------------------------------------------------------------------------
        // PANTALLA DE CARGA
        // ------------------------------------------------------------------------
        if (!isReady) {
            const speedNote = engine.startupSpeed === 'slow'
                ? `<div class="hint" style="margin-top: 16px;">⏱️ <b>Nota:</b> Este motor es pesado. Su primera inicialización puede tardar 1-2 minutos. Por favor, ten paciencia.</div>`
                : '';
            return /* html */ `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cargando ${this.escape(engine.displayName)}...</title>
  <style>
    body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); padding: 40px; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: var(--vscode-editor-background); }
    .loader { border: 4px solid var(--vscode-editor-inactiveSelectionBackground); border-top: 4px solid var(--vscode-button-background); border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin-bottom: 24px; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    h2 { font-weight: 500; margin-bottom: 8px; }
    .status-msg { color: var(--vscode-descriptionForeground); font-size: 14px; }
    .hint { color: var(--vscode-textPreformat-foreground); background: var(--vscode-textBlockQuote-background); padding: 12px; border-left: 4px solid var(--vscode-button-background); border-radius: 4px; max-width: 400px; text-align: center; }
  </style>
</head>
<body>
  <div class="loader"></div>
  <h2>Iniciando ${this.escape(engine.displayName)}...</h2>
  <div class="status-msg">${this.escape(this.loadingMessage || 'Preparando contenedor...')}</div>
  ${speedNote}
</body>
</html>`;
        }
        // ------------------------------------------------------------------------
        // PANTALLA PRINCIPAL (READY)
        // ------------------------------------------------------------------------
        // TAB: ESTÁNDAR
        const standardTabContent = isSqlite ? '' : `
      <div class="data-grid">
        <div class="data-label">Host</div><div class="data-value"><code>${this.escape(info.host)}</code></div>
        <div class="data-label">Puerto</div><div class="data-value"><code>${info.port}</code></div>
        <div class="data-label">Usuario</div><div class="data-value"><code>${this.escape(info.user)}</code></div>
        <div class="data-label">Password</div><div class="data-value"><code>${this.escape(info.password)}</code></div>
        <div class="data-label">Base de datos</div><div class="data-value"><code>${this.escape(info.database)}</code></div>
      </div>
      <div class="section-title" style="margin-top: 20px;">Comando de Terminal (Recomendado)</div>
      <div class="command-block" id="cmdStandard">${this.escape(info.connectionCommand)}</div>
      <button class="copy-btn" id="btnCopyStd" onclick="copyText('cmdStandard', 'btnCopyStd')">
        <span>📋 Copiar comando</span>
      </button>
    `;
        // TAB: ADMIN
        let adminTabContent = '';
        if (!isSqlite && info.adminConnectionCommand) {
            const adminPassMsg = engine.connectionTemplate.adminPasswordRequiresInput
                ? `<div class="warning-badge">⚠️ ${this.escape(engine.connectionTemplate.adminPasswordMessage || 'Requiere contraseña especial o sin contraseña')}</div>`
                : `<div class="info-badge">ℹ️ ${this.escape(engine.connectionTemplate.adminPasswordMessage || 'Misma contraseña que el laboratorio')}</div>`;
            adminTabContent = `
        ${adminPassMsg}
        <div class="data-grid" style="margin-top: 16px;">
          <div class="data-label">Usuario Admin</div><div class="data-value"><code>${this.escape(engine.connectionTemplate.adminUser || '')}</code></div>
        </div>
        <div class="section-title" style="margin-top: 20px;">Comando de Terminal (Admin)</div>
        <div class="command-block" id="cmdAdmin">${this.escape(info.adminConnectionCommand)}</div>
        <button class="copy-btn" id="btnCopyAdmin" onclick="copyText('cmdAdmin', 'btnCopyAdmin')">
          <span>📋 Copiar comando Admin</span>
        </button>
      `;
        }
        // SECCIÓN: COMANDOS DE PRUEBA
        let testCommandsHtml = '';
        if (engine.connectionTemplate.testCommands && engine.connectionTemplate.testCommands.length > 0) {
            testCommandsHtml = `
        <div class="card" style="margin-top: 24px;">
          <div class="card-header">
            <h3 class="card-title">Comandos de Prueba</h3>
          </div>
          <div class="card-body">
            <div class="hint" style="margin-bottom: 12px;">Pega estos comandos en tu terminal una vez conectado para validar que todo funciona.</div>
            <div class="command-block" id="cmdTest">${engine.connectionTemplate.testCommands.map(cmd => this.escape(cmd)).join('<br/>')}</div>
            <button class="copy-btn secondary" id="btnCopyTest" onclick="copyTextHtml('cmdTest', 'btnCopyTest')">
              <span>📋 Copiar todos</span>
            </button>
          </div>
        </div>
      `;
        }
        return /* html */ `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SQL Engine Lab — ${this.escape(engine.displayName)}</title>
  <style>
    :root { --radius: 8px; --gap: 16px; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); color: var(--vscode-foreground); background: var(--vscode-editor-background); padding: 32px 24px; max-width: 800px; margin: 0 auto; }
    
    .header { display: flex; align-items: center; gap: 16px; margin-bottom: 32px; border-bottom: 1px solid var(--vscode-panel-border); padding-bottom: 24px; }
    .status-dot { width: 14px; height: 14px; border-radius: 50%; background: #3fb950; box-shadow: 0 0 10px #3fb95080; flex-shrink: 0; }
    h1 { font-size: 22px; font-weight: 600; color: var(--vscode-foreground); margin-bottom: 4px; }
    .subtitle { font-size: 13px; color: var(--vscode-descriptionForeground); }

    .card { background: var(--vscode-editor-inactiveSelectionBackground); border: 1px solid var(--vscode-panel-border); border-radius: var(--radius); overflow: hidden; }
    
    /* Tabs */
    .tabs { display: flex; border-bottom: 1px solid var(--vscode-panel-border); background: var(--vscode-editor-background); }
    .tab { padding: 12px 24px; cursor: pointer; font-weight: 500; font-size: 13px; color: var(--vscode-descriptionForeground); border-bottom: 2px solid transparent; transition: all 0.2s; }
    .tab:hover { color: var(--vscode-foreground); background: var(--vscode-list-hoverBackground); }
    .tab.active { color: var(--vscode-foreground); border-bottom-color: var(--vscode-button-background); }
    
    .tab-content { display: none; padding: 24px; }
    .tab-content.active { display: block; }
    
    .card-header { padding: 16px 24px; border-bottom: 1px solid var(--vscode-panel-border); background: var(--vscode-editor-background); }
    .card-title { font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--vscode-foreground); }
    .card-body { padding: 24px; }

    .data-grid { display: grid; grid-template-columns: 140px 1fr; gap: 12px; align-items: center; }
    .data-label { color: var(--vscode-descriptionForeground); font-size: 13px; font-weight: 500; }
    .data-value code { font-family: var(--vscode-editor-font-family); font-size: 13px; background: var(--vscode-textCodeBlock-background); padding: 4px 8px; border-radius: 4px; border: 1px solid var(--vscode-panel-border); }

    .section-title { font-size: 12px; font-weight: 600; color: var(--vscode-descriptionForeground); margin-bottom: 8px; }
    .command-block { background: var(--vscode-textCodeBlock-background); border: 1px solid var(--vscode-panel-border); border-radius: 6px; padding: 16px; margin-bottom: 16px; font-family: var(--vscode-editor-font-family); font-size: 13px; word-break: break-all; line-height: 1.5; color: var(--vscode-foreground); }
    
    .copy-btn { display: inline-flex; align-items: center; gap: 8px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 4px; padding: 8px 16px; font-size: 13px; font-weight: 500; cursor: pointer; transition: opacity 0.2s, transform 0.1s; }
    .copy-btn:hover { background: var(--vscode-button-hoverBackground); }
    .copy-btn:active { transform: scale(0.97); }
    .copy-btn.secondary { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
    .copy-btn.secondary:hover { background: var(--vscode-button-secondaryHoverBackground); }
    .copy-btn.copied { background: #3fb950 !important; color: #fff !important; }

    .hint { font-size: 13px; color: var(--vscode-descriptionForeground); line-height: 1.5; }
    .info-badge { display: inline-block; padding: 6px 12px; background: var(--vscode-textBlockQuote-background); color: var(--vscode-textBlockQuote-border); border-radius: 4px; font-size: 12px; font-weight: 500; border-left: 3px solid var(--vscode-textBlockQuote-border); }
    .warning-badge { display: inline-block; padding: 6px 12px; background: var(--vscode-inputValidation-warningBackground); color: var(--vscode-inputValidation-warningForeground); border-radius: 4px; font-size: 12px; font-weight: 500; border-left: 3px solid var(--vscode-inputValidation-warningBorder); }
    
    /* Para SQLite (single view) */
    .single-view { padding: 24px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="status-dot"></div>
    <div>
      <h1>${this.escape(engine.displayName)}</h1>
      <div class="subtitle">Estado: <b>Corriendo</b> • Puerto: ${info.port}</div>
    </div>
  </div>

  ${isSqlite ? `
    <div class="card">
      <div class="card-header"><h3 class="card-title">Conexión a SQLite</h3></div>
      <div class="single-view">
        <div class="hint" style="margin-bottom: 16px;">SQLite usa un archivo local embebido, no requiere credenciales.</div>
        <div class="section-title">Comando de Terminal</div>
        <div class="command-block" id="cmdSqlite">${this.escape(info.connectionCommand)}</div>
        <button class="copy-btn" id="btnCopySqlite" onclick="copyText('cmdSqlite', 'btnCopySqlite')">
          <span>📋 Copiar comando</span>
        </button>
      </div>
    </div>
  ` : `
    <div class="card">
      <div class="tabs">
        <div class="tab active" onclick="switchTab(event, 'tab-standard')">👤 Conexión Estándar</div>
        ${adminTabContent ? `<div class="tab" onclick="switchTab(event, 'tab-admin')">🛡️ Conexión Administrador</div>` : ''}
      </div>
      <div id="tab-standard" class="tab-content active">
        ${standardTabContent}
      </div>
      ${adminTabContent ? `
      <div id="tab-admin" class="tab-content">
        ${adminTabContent}
      </div>
      ` : ''}
    </div>
  `}

  ${testCommandsHtml}

  <script>
    const vscode = acquireVsCodeApi();

    function switchTab(evt, tabId) {
      const tabs = document.getElementsByClassName('tab');
      for (let i = 0; i < tabs.length; i++) { tabs[i].classList.remove('active'); }
      const contents = document.getElementsByClassName('tab-content');
      for (let i = 0; i < contents.length; i++) { contents[i].classList.remove('active'); }
      evt.currentTarget.classList.add('active');
      document.getElementById(tabId).classList.add('active');
    }

    function copyText(elementId, btnId) {
      const text = document.getElementById(elementId).textContent;
      doCopy(text, btnId);
    }
    
    function copyTextHtml(elementId, btnId) {
      // Reemplaza los <br> con saltos de linea reales para copiar multi-linea
      const html = document.getElementById(elementId).innerHTML;
      const text = html.replace(/<br\\s*\\/?>/gi, '\\n');
      doCopy(text, btnId);
    }

    function doCopy(text, btnId) {
      if (text) {
        vscode.postMessage({ command: 'copy', text: text });
        const btn = document.getElementById(btnId);
        const originalHtml = btn.innerHTML;
        btn.classList.add('copied');
        btn.innerHTML = '<span>✓ Copiado</span>';
        setTimeout(() => {
          btn.classList.remove('copied');
          btn.innerHTML = originalHtml;
        }, 2000);
      }
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
}
exports.ConnectionPanel = ConnectionPanel;
//# sourceMappingURL=connectionPanel.js.map