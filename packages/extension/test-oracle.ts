import { DockerClient } from './src/core/docker/dockerClient';
import { ContainerLifecycle } from './src/core/docker/containerLifecycle';

async function main() {
  console.log('--- TEST ORACLE STARTUP ---');
  
  const dockerClient = new DockerClient();
  const lifecycle = new ContainerLifecycle(dockerClient, {
    getConfig: () => ({
      labUser: 'labuser',
      labPassword: 'LabPassword123!',
      labDatabase: 'labdb',
    })
  });

  lifecycle.on('statusChanged', (state) => {
    console.log(`[STATUS] ${state.status}: ${state.message || ''}`);
  });

  lifecycle.on('error', (err) => {
    console.error(`[ERROR EVENT] ${err.code}: ${err.message}`);
  });

  lifecycle.on('diagnosticLog', (msg) => {
    console.log(`[DIAGNOSTIC] ${msg}`);
  });

  console.log('Starting oracle engine...');
  const result = await lifecycle.startEngine('oracle');

  if (result.ok) {
    console.log('[SUCCESS] Engine started successfully:');
    console.log(result.value);
  } else {
    console.error('[FAILURE] Failed to start engine:');
    console.error(result.error);
  }
}

main().catch(console.error);
