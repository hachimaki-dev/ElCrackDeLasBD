import * as path from 'path';
import Mocha from 'mocha';
import * as glob from 'glob';

export async function run(): Promise<void> {
  const mocha = new Mocha({ ui: 'tdd', color: true, timeout: 10000 });

  const testsRoot = path.resolve(__dirname, '..');
  const files = glob.sync('**/*.test.js', { cwd: testsRoot });

  for (const file of files) {
    mocha.addFile(path.resolve(testsRoot, file));
  }

  return new Promise((resolve, reject) => {
    mocha.run((failures) => {
      if (failures > 0) {
        reject(new Error(`${failures} test(s) fallaron`));
      } else {
        resolve();
      }
    });
  });
}
