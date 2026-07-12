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
import { CredentialVault } from '../../core/credentials/vault';
import { QueryRunner } from '../../core/runner/queryRunner';
import { ContainerLifecycle } from '../../core/docker/containerLifecycle';
export declare function registerSheetCommands(context: vscode.ExtensionContext, sheetManager: SheetManager, vault: CredentialVault, runner: QueryRunner, lifecycle: ContainerLifecycle): vscode.Disposable[];
//# sourceMappingURL=sheetCommands.d.ts.map