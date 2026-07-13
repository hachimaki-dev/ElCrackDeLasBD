import React, { useState, useEffect } from 'react';
import { SetupWizard } from './components/SetupWizard';
import { HomeDashboard } from './components/HomeDashboard';
import { vscode } from './vscode';

type HomeState = 'checking_docker' | 'docker_not_installed' | 'docker_not_running' | 'starting_docker' | 'pulling_images' | 'ready';

interface EngineData {
  id: string;
  displayName: string;
  status: 'stopped' | 'pulling' | 'starting' | 'running' | 'stopping' | 'error';
  port: number;
}

interface ActiveConnection {
  host: string;
  port: number;
  user?: string;
  database?: string;
  connectionCommand?: string;
  adminConnectionCommand?: string;
}

interface Gamification {
  xp: number;
  level: number;
  xpToNextLevel: number;
  badges: any[];
}

export const HomeApp: React.FC = () => {
  const [state, setState] = useState<HomeState>('checking_docker');
  const [progress, setProgress] = useState<{ status: string; percentage?: number }>();
  const [engines, setEngines] = useState<EngineData[]>([]);
  const [activeConnection, setActiveConnection] = useState<ActiveConnection | undefined>(undefined);
  const [gamification, setGamification] = useState<Gamification>({
    xp: 0,
    level: 1,
    xpToNextLevel: 1000,
    badges: [],
  });

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.command === 'updateHomeState') {
        setState(message.state);
        
        if (message.pullProgress) {
          setProgress(message.pullProgress);
        }
        if (message.engines) {
          setEngines(message.engines);
        }
        if (message.activeConnection !== undefined) {
          setActiveConnection(message.activeConnection);
        }
        if (message.progress) {
          setGamification(message.progress);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    
    // Request initial state
    vscode.postMessage({ command: 'getInitialState' });

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleExecuteCommand = (action: string, args?: any[]) => {
    vscode.postMessage({
      command: 'executeCommand',
      action,
      args
    });
  };

  const handleRetry = () => {
    vscode.postMessage({ command: 'retrySetup' });
  };

  const handleOpenDocker = () => {
    vscode.postMessage({ 
      command: 'openExternal', 
      url: 'https://www.docker.com/products/docker-desktop/' 
    });
  };

  const handleStartDocker = () => {
    vscode.postMessage({ command: 'startDocker' });
  };

  if (state === 'ready') {
    return (
      <HomeDashboard
        engines={engines}
        activeConnection={activeConnection}
        gamification={gamification}
        onExecuteCommand={handleExecuteCommand}
      />
    );
  }

  return (
    <SetupWizard 
      state={state} 
      progress={progress} 
      onRetry={handleRetry} 
      onOpenDocker={handleOpenDocker}
      onStartDocker={handleStartDocker}
    />
  );
};
