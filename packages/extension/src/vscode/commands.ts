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
 * - sqlEngineLab.configureCredentials
 * - sqlEngineLab.showDiagnostics
 *
 * Maneja errores de forma explícita y visible (no silenciosa).
 */

import * as vscode from 'vscode';
import { EngineId, ConnectionInfo, EngineState } from '../core/engines/engine.types';
import { getAllEngines, getEngineById, isValidEngineId } from '../core/engines/registry';
import { ContainerLifecycle } from '../core/docker/containerLifecycle';
import { DockerClient } from '../core/docker/dockerClient';
import { runDoctorFormatted } from '../core/docker/dockerDiagnostics';
import { EngineTreeViewProvider } from './treeView';
import { HomePanel } from './homePanel';


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
  dockerClient: DockerClient,
  outputChannel: vscode.OutputChannel,
  progressManager: import('../core/progress/progressManager').ProgressManager,
): vscode.Disposable[] {
  // Guardar la última conexión activa para mostrarla en el panel
  let activeConnectionInfo: ConnectionInfo | undefined;

  // Escuchar cuando un motor arranca para guardar la info de conexión
  lifecycle.on('engineStarted', (info: ConnectionInfo) => {
    activeConnectionInfo = info;
  });

  lifecycle.on('engineStopped', () => {
    activeConnectionInfo = undefined;
    HomePanel.refresh();
  });


  const disposables: vscode.Disposable[] = [
    // ------------------------------------------------------------------
    // Mostrar Home / Setup (Flujo 0)
    // ------------------------------------------------------------------
    vscode.commands.registerCommand('sqlEngineLab.showHome', () => {
      HomePanel.createOrShow(
        context.extensionUri,
        dockerClient,
        lifecycle,
        progressManager,
        () => {
          treeProvider.setIsReady(true);
        }
      );
    }),

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

        // Mostrar progreso en la barra de estado
        void vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: `SQL Engine Lab: Iniciando ${engine.displayName}`,
            cancellable: false,
          },
          async (progress) => {
            progress.report({ message: 'Verificando Docker...' });
            // Enfoquemos y mostremos el panel de inicio
            await vscode.commands.executeCommand('sqlEngineLab.showHome');

            lifecycle.on('statusChanged', (state: EngineState) => {
              if (state.message) {
                progress.report({ message: state.message });
              }
            });


            const result = await lifecycle.startEngine(engineId);

            if (result.ok) {
              activeConnectionInfo = result.value;
              // Enfocar y refrescar el panel unificado
              await vscode.commands.executeCommand('sqlEngineLab.showHome');
              HomePanel.refresh();
              void vscode.window.showInformationMessage(
                `✓ ${engine.displayName} listo en puerto ${engine.defaultPort}`,
              );
            } else {
              HomePanel.refresh();
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
      () => {
        const currentEngineId = lifecycle.getCurrentEngine();
        if (!currentEngineId) {
          void vscode.window.showInformationMessage(
            'No hay ningún motor corriendo. Inicia un motor primero.',
          );
          return;
        }
        void vscode.commands.executeCommand('sqlEngineLab.showHome');
      },
    ),


    // ------------------------------------------------------------------
    // Completar Módulo de Tutorial
    // ------------------------------------------------------------------
    vscode.commands.registerCommand('sqlEngineLab.completeTutorial', async (moduleId: string) => {
      const currentEngineId = lifecycle.getCurrentEngine();
      if (!currentEngineId) return;

      await progressManager.markModuleAsCompleted(currentEngineId, moduleId);

      // Refrescar el estado del panel
      HomePanel.refresh();
      void vscode.window.showInformationMessage(
        `¡Felicidades! Completaste el módulo ${moduleId}.`,
      );
    }),


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

    // ------------------------------------------------------------------
    // Configurar Credenciales
    // ------------------------------------------------------------------
    vscode.commands.registerCommand('sqlEngineLab.configureCredentials', async () => {
      const config = vscode.workspace.getConfiguration('sqlEngineLab.credentials');

      const newPassword = await vscode.window.showInputBox({
        title: 'SQL Engine Lab: Configurar Contraseña Maestra',
        prompt:
          'Esta contraseña se usará tanto para el usuario estándar como para el administrador.',
        value: config.get<string>('labPassword', 'labpassword'),
        password: true,
      });

      if (newPassword !== undefined && newPassword.trim() !== '') {
        await config.update('labPassword', newPassword, vscode.ConfigurationTarget.Global);
        void vscode.window.showInformationMessage(
          '✓ Contraseña actualizada correctamente. ¡Listo para iniciar motores!',
        );
      }
    }),

    // ------------------------------------------------------------------
    // Diagnóstico del entorno (Doctor)
    // ------------------------------------------------------------------
    vscode.commands.registerCommand('sqlEngineLab.showDiagnostics', async () => {
      outputChannel.show(true);
      outputChannel.appendLine('Ejecutando diagnóstico del entorno...');
      const report = await runDoctorFormatted(dockerClient);
      outputChannel.appendLine(report);
    }),
  ];

  return disposables;
}

/**
 * Muestra un QuickPick para seleccionar un motor cuando no se especificó uno.
 */
async function promptEngineSelection(lifecycle: ContainerLifecycle): Promise<EngineId | undefined> {
  const currentEngineId = lifecycle.getCurrentEngine();
  const engines = getAllEngines();

  const items = engines.map((engine) => ({
    label: engine.displayName,
    description: engine.description,
    detail: currentEngineId === engine.id ? '● Actualmente corriendo' : undefined,
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
