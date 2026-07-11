import * as path from 'path';
import * as os from 'os';
import { runTests } from '@vscode/test-electron';

async function main(): Promise<void> {
  try {
    const extensionDevelopmentPath = path.resolve(__dirname, '../../');
    const extensionTestsPath = path.resolve(__dirname, './suite/index');
    
    // Usar un directorio temporal corto para evitar el límite de 103 caracteres en sockets UNIX
    const userDataDir = path.join(os.tmpdir(), `vsc-test-${Date.now()}`);

    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: ['--user-data-dir', userDataDir]
    });
  } catch (err) {
    console.error('Tests fallaron:', err);
    process.exit(1);
  }
}

void main();
