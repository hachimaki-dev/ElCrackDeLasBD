/**
 * SQL Engine Laboratory — Connection Panel Webview
 *
 * Webview panel que muestra los datos de conexión cuando un motor está corriendo:
 * - Host, puerto, usuario, password
 * - Comando de conexión completo listo para copiar
 * - Botón "Copiar comando" con feedback visual
 *
 * El panel se muestra automáticamente cuando un motor arranca exitosamente.
 */

import * as vscode from 'vscode';
import { ConnectionInfo, EngineDefinition } from '../core/engines/engine.types';

/**
 * Panel Webview que muestra información de conexión de un motor SQL activo.
 * Solo puede existir una instancia a la vez (singleton por sesión de extensión).
 */
export class ConnectionPanel {
  private static currentPanel: ConnectionPanel | undefined;

  private readonly panel: vscode.WebviewPanel;

  private constructor(
    panel: vscode.WebviewPanel,
    _extensionUri: vscode.Uri,
    engine: EngineDefinition,
    connectionInfo: ConnectionInfo,
  ) {
    this.panel = panel;

    // Renderizar el contenido inicial
    this.update(engine, connectionInfo);

    // Manejar mensajes del Webview (botón copiar)
    this.panel.webview.onDidReceiveMessage(async (message: { command: string; text: string }) => {
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
  static createOrReveal(
    extensionUri: vscode.Uri,
    engine: EngineDefinition,
    connectionInfo: ConnectionInfo,
  ): void {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : vscode.ViewColumn.One;

    if (ConnectionPanel.currentPanel) {
      ConnectionPanel.currentPanel.panel.reveal(column);
      ConnectionPanel.currentPanel.update(engine, connectionInfo);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'sqlEngineLabConnection',
      `SQL Lab — ${engine.displayName}`,
      column ?? vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      },
    );

    ConnectionPanel.currentPanel = new ConnectionPanel(panel, extensionUri, engine, connectionInfo);
  }

  /**
   * Cierra el panel si está abierto.
   */
  static dispose(): void {
    if (ConnectionPanel.currentPanel) {
      ConnectionPanel.currentPanel.panel.dispose();
      ConnectionPanel.currentPanel = undefined;
    }
  }

  private update(engine: EngineDefinition, connectionInfo: ConnectionInfo): void {
    this.panel.title = `SQL Lab — ${engine.displayName}`;
    this.panel.webview.html = this.buildHtml(engine, connectionInfo);
  }

  private buildHtml(engine: EngineDefinition, info: ConnectionInfo): string {
    const isSqlite = engine.id === 'sqlite';

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
      max-width: 700px;
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

  <script>
    const vscode = acquireVsCodeApi();

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
  </script>
</body>
</html>`;
  }

  private escape(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
