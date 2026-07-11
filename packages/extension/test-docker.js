const Docker = require('dockerode');
const path = require('path');
const os = require('os');
const fs = require('fs');

function resolveOptions() {
  const homedir = os.homedir();
  const configPath = path.join(homedir, '.docker', 'config.json');
  let socketPath;

  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const currentContext = config.currentContext;

      if (currentContext && currentContext !== 'default') {
        const metaDir = path.join(homedir, '.docker', 'contexts', 'meta');
        if (fs.existsSync(metaDir)) {
          const subdirs = fs.readdirSync(metaDir);
          for (const subdir of subdirs) {
            const metaJsonPath = path.join(metaDir, subdir, 'meta.json');
            if (fs.existsSync(metaJsonPath)) {
              const meta = JSON.parse(fs.readFileSync(metaJsonPath, 'utf8'));
              if (meta.Name === currentContext && meta.Endpoints?.docker?.Host) {
                let host = meta.Endpoints.docker.Host;
                if (host.startsWith('unix://')) {
                  socketPath = host.substring(7);
                  console.log('Resolved from context:', socketPath);
                  return { socketPath };
                }
              }
            }
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  }
  console.log('Fallback to /var/run/docker.sock');
  return { socketPath: '/var/run/docker.sock' };
}

async function test() {
  const options = resolveOptions();
  console.log('Options:', options);
  const docker = new Docker(options);
  try {
    const ping = await docker.ping();
    console.log('Ping successful:', ping);
  } catch (err) {
    console.error('Ping failed:', err);
  }
}

test();
