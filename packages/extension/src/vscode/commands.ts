/**
 * SQL Engine Laboratory — VS Code Commands
 *
 * Registro y manejo de todos los comandos de la extensión.
 * Cada acción de usuario es un comando independiente:
 * - sqlEngineLab.startEngine
 * - sqlEngineLab.stopEngine
 * - sqlEngineLab.showConnectionInfo
 * - sqlEngineLab.copyConnectionCommand
 * - sqlEngineLab.refreshEngines
 *
 * Maneja errores de forma explícita y visible (no silenciosa).
 */

import * as vscode from 'vscode';
import { EngineId, ConnectionInfo, EngineState, LaunchConfig } from '../core/engines/engine.types';
import { getAllEngines, getEngineById, isValidEngineId } from '../core/engines/registry';
import { ContainerLifecycle } from '../core/docker/containerLifecycle';
import { EngineTreeViewProvider } from './treeView';
import { ConnectionPanel } from './connectionPanel';

/**
 * Registra todos los comandos de la extensión en el contexto de VS Code.
 * Retorna un array de Disposables para cleanup al desactivar la extensión.
 *
 * @param context - Contexto de la extensión
 * @param lifecycle - Instancia del gestor de ciclo de vida de contenedores
 * @param treeProvider - Provider del Tree View para refrescar tras acciones
 * @returns Array de Disposables para registrar en context.subscriptions
 */
export function registerCommands(
  context: vscode.ExtensionContext,
  lifecycle: ContainerLifecycle,
  treeProvider: EngineTreeViewProvider,
): vscode.Disposable[] {
  // Guardar la última conexión activa para mostrarla en el panel
  let activeConnectionInfo: ConnectionInfo | undefined;

  // Escuchar cuando un motor arranca para guardar la info de conexión
  lifecycle.on('engineStarted', (info: ConnectionInfo) => {
    activeConnectionInfo = info;
  });

  lifecycle.on('engineStopped', () => {
    activeConnectionInfo = undefined;
    ConnectionPanel.dispose();
  });

  const disposables: vscode.Disposable[] = [
    // ------------------------------------------------------------------
    // Iniciar motor
    // ------------------------------------------------------------------
    vscode.commands.registerCommand(
      'sqlEngineLab.startEngine',
      async (engineIdOrItem?: EngineId | { engine: { id: EngineId } }) => {
        const engineId = resolveEngineId(engineIdOrItem);

        if (!engineId) {
          // Llamado sin argumento (ej: desde la paleta de comandos) → pedir selección
          const selected = await promptEngineSelection(lifecycle);
          if (!selected) return;
          void vscode.commands.executeCommand('sqlEngineLab.startEngine', selected);
          return;
        }

        const engine = getEngineById(engineId);
        if (!engine) {
          void vscode.window.showErrorMessage(`Motor '${engineId}' no reconocido`);
          return;
        }

        // Verificar si ya hay un motor activo
        const currentEngine = lifecycle.getCurrentEngine();
        if (currentEngine && currentEngine !== engineId) {
          const currentEngineDef = getEngineById(currentEngine);
          const answer = await vscode.window.showWarningMessage(
            `${currentEngineDef?.displayName ?? currentEngine} está corriendo. ¿Detenerlo e iniciar ${engine.displayName}?`,
            { modal: true },
            'Sí, cambiar',
          );
          if (answer !== 'Sí, cambiar') return;
        }

        // Preguntar modo de lanzamiento: rápido o personalizado
        const launchModeResult = await promptLaunchMode(engine.connectionTemplate.defaultUser);
        if (launchModeResult === undefined) return; // Usuario canceló

        // null = inicio rápido (defaults), objeto = personalizado
        const launchConfig: LaunchConfig | undefined = launchModeResult ?? undefined;

        // Mostrar progreso en la barra de estado
        void vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: `SQL Engine Lab: Iniciando ${engine.displayName}`,
            cancellable: false,
          },
          async (progress) => {
            progress.report({ message: 'Verificando Docker...' });

            lifecycle.on('statusChanged', (state: EngineState) => {
              if (state.message) {
                progress.report({ message: state.message });
              }
            });

            const result = await lifecycle.startEngine(engineId, launchConfig);

            if (result.ok) {
              activeConnectionInfo = result.value;
              // Mostrar panel de conexión automáticamente
              ConnectionPanel.createOrReveal(context.extensionUri, engine, result.value);
              void vscode.window.showInformationMessage(
                `✓ ${engine.displayName} listo en puerto ${engine.defaultPort}`,
              );
            } else {
              showEngineError(result.error.message, result.error.code);
            }
          },
        );
      },
    ),

    // ------------------------------------------------------------------
    // Detener motor
    // ------------------------------------------------------------------
    vscode.commands.registerCommand('sqlEngineLab.stopEngine', async () => {
      const currentEngineId = lifecycle.getCurrentEngine();
      if (!currentEngineId) {
        void vscode.window.showInformationMessage('No hay ningún motor corriendo.');
        return;
      }

      const engine = getEngineById(currentEngineId);
      const answer = await vscode.window.showWarningMessage(
        `¿Detener ${engine?.displayName ?? currentEngineId}?`,
        { modal: true },
        'Detener',
      );

      if (answer !== 'Detener') return;

      void vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `SQL Engine Lab: Deteniendo ${engine?.displayName ?? currentEngineId}`,
          cancellable: false,
        },
        async () => {
          const result = await lifecycle.stopEngine();
          if (result.ok) {
            void vscode.window.showInformationMessage(
              `✓ ${engine?.displayName ?? currentEngineId} detenido`,
            );
          } else {
            showEngineError(result.error.message, result.error.code);
          }
        },
      );
    }),

    // ------------------------------------------------------------------
    // Mostrar info de conexión
    // ------------------------------------------------------------------
    vscode.commands.registerCommand(
      'sqlEngineLab.showConnectionInfo',
      (_engineIdOrItem?: EngineId) => {
        const currentEngineId = lifecycle.getCurrentEngine();
        if (!currentEngineId || !activeConnectionInfo) {
          void vscode.window.showInformationMessage(
            'No hay ningún motor corriendo. Inicia un motor primero.',
          );
          return;
        }

        const engine = getEngineById(currentEngineId);
        if (!engine) return;

        ConnectionPanel.createOrReveal(context.extensionUri, engine, activeConnectionInfo);
      },
    ),

    // ------------------------------------------------------------------
    // Copiar comando de conexión
    // ------------------------------------------------------------------
    vscode.commands.registerCommand('sqlEngineLab.copyConnectionCommand', async () => {
      if (!activeConnectionInfo) {
        void vscode.window.showInformationMessage(
          'No hay ningún motor corriendo. Inicia un motor primero.',
        );
        return;
      }

      await vscode.env.clipboard.writeText(activeConnectionInfo.connectionCommand);
      void vscode.window.showInformationMessage('✓ Comando de conexión copiado al portapapeles');
    }),

    // ------------------------------------------------------------------
    // Refrescar Tree View
    // ------------------------------------------------------------------
    vscode.commands.registerCommand('sqlEngineLab.refreshEngines', () => {
      treeProvider.refresh();
    }),
  ];

  return disposables;
}

/**
 * Muestra un QuickPick para seleccionar un motor cuando no se especificó uno.
 */
async function promptEngineSelection(
  lifecycle: ContainerLifecycle,
): Promise<EngineId | undefined> {
  const currentEngineId = lifecycle.getCurrentEngine();
  const engines = getAllEngines();

  const items = engines.map((engine) => ({
    label: engine.displayName,
    description: engine.description,
    detail:
      currentEngineId === engine.id ? '● Actualmente corriendo' : undefined,
    engineId: engine.id,
  }));

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: 'Selecciona un motor SQL para iniciar',
    title: 'SQL Engine Lab — Iniciar Motor',
  });

  return selected?.engineId;
}

/**
 * Muestra un error con acción de "Abrir Docker Desktop" si el error es de Docker.
 */
function showEngineError(message: string, code: string): void {
  if (code === 'DOCKER_NOT_RUNNING') {
    void vscode.window
      .showErrorMessage(`SQL Engine Lab: ${message}`, 'Abrir Docker Desktop')
      .then((action) => {
        if (action === 'Abrir Docker Desktop') {
          void vscode.env.openExternal(
            vscode.Uri.parse('https://www.docker.com/products/docker-desktop/'),
          );
        }
      });
  } else {
    void vscode.window.showErrorMessage(`SQL Engine Lab: ${message}`);
  }
}

/**
 * Resuelve el engineId desde distintos tipos de argumento que puede recibir un comando.
 */
function resolveEngineId(
  arg: EngineId | { engine: { id: EngineId } } | undefined,
): EngineId | undefined {
  if (!arg) return undefined;
  if (typeof arg === 'string' && isValidEngineId(arg)) return arg;
  if (typeof arg === 'object' && 'engine' in arg) return arg.engine.id;
  return undefined;
}

/**
 * Muestra un QuickPick para elegir entre inicio rápido (con usuario admin listo)
 * o configuración personalizada (donde el usuario elige sus credenciales).
 *
 * @param defaultUser - Usuario por defecto del motor, para mostrarlo en la descripción
 * @returns LaunchConfig (null = usar defaults, objeto = personalizado), o undefined si el usuario canceló
 */
async function promptLaunchMode(defaultUser: string): Promise<LaunchConfig | null | undefined> {
  const launchMode = await vscode.window.showQuickPick(
    [
      {
        label: '$(zap) Inicio Rápido',
        description: `Usuario: ${defaultUser} — listo para usar`,
        detail: 'Arranca el motor con un usuario admin preconfigurado. Ideal para empezar a practicar de inmediato.',
        mode: 'quick' as const,
      },
      {
        label: '$(gear) Configuración Personalizada',
        description: 'Elige tu propio usuario, contraseña y base de datos',
        detail: 'Personaliza las credenciales de conexión antes de arrancar el motor.',
        mode: 'custom' as const,
      },
    ],
    {
      placeHolder: '¿Cómo quieres arrancar el motor?',
      title: 'SQL Engine Lab — Modo de Lanzamiento',
    },
  );

  if (!launchMode) return undefined; // Canceló

  if (launchMode.mode === 'quick') {
    return null; // Usar defaults
  }

  // Modo personalizado — pedir credenciales
  const user = await vscode.window.showInputBox({
    title: 'SQL Engine Lab — Usuario (1/3)',
    prompt: 'Nombre del usuario administrador para la base de datos',
    value: 'admin',
    placeHolder: 'admin',
    validateInput: (value) => {
      if (!value || value.trim().length === 0) {
        return 'El nombre de usuario no puede estar vacío';
      }
      if (/\s/.test(value)) {
        return 'El nombre de usuario no puede contener espacios';
      }
      return null;
    },
  });
  if (user === undefined) return undefined; // Canceló

  const password = await vscode.window.showInputBox({
    title: 'SQL Engine Lab — Contraseña (2/3)',
    prompt: 'Contraseña para el usuario',
    value: 'admin123',
    placeHolder: 'admin123',
    password: true,
    validateInput: (value) => {
      if (!value || value.length < 4) {
        return 'La contraseña debe tener al menos 4 caracteres';
      }
      return null;
    },
  });
  if (password === undefined) return undefined; // Canceló

  const database = await vscode.window.showInputBox({
    title: 'SQL Engine Lab — Base de Datos (3/3)',
    prompt: 'Nombre de la base de datos a crear',
    value: 'mydb',
    placeHolder: 'mydb',
    validateInput: (value) => {
      if (!value || value.trim().length === 0) {
        return 'El nombre de la base de datos no puede estar vacío';
      }
      if (/\s/.test(value)) {
        return 'El nombre no puede contener espacios';
      }
      return null;
    },
  });
  if (database === undefined) return undefined; // Canceló

  return { user, password, database };
}
