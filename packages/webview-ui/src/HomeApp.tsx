import React, { useState, useEffect } from 'react';
import { SetupWizard } from './components/SetupWizard';
import { HomeDashboard } from './components/HomeDashboard';

type HomeState = 'checking_docker' | 'docker_not_installed' | 'docker_not_running' | 'starting_docker' | 'pulling_images' | 'ready';

export const HomeApp: React.FC = () => {
  const [state, setState] = useState<HomeState>('checking_docker');
  const [progress, setProgress] = useState<{status: string; percentage?: number}>();

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.command === 'updateHomeState') {
        setState(message.state);
        if (message.progress) {
          setProgress(message.progress);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    
    // Request initial state
    // @ts-ignore
    if (typeof acquireVsCodeApi !== 'undefined') {
      // @ts-ignore
      const vscode = acquireVsCodeApi();
      vscode.postMessage({ command: 'getInitialState' });
    }

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleExecuteCommand = (action: string, args?: any[]) => {
    // @ts-ignore
    if (typeof acquireVsCodeApi !== 'undefined') {
      // @ts-ignore
      const vscode = acquireVsCodeApi();
      vscode.postMessage({
        command: 'executeCommand',
        action,
        args
      });
    } else {
      console.log('Execute:', action, args);
    }
  };

  const handleRetry = () => {
    // @ts-ignore
    if (typeof acquireVsCodeApi !== 'undefined') {
      // @ts-ignore
      const vscode = acquireVsCodeApi();
      vscode.postMessage({ command: 'retrySetup' });
    }
  };

  const handleOpenDocker = () => {
    // @ts-ignore
    if (typeof acquireVsCodeApi !== 'undefined') {
      // @ts-ignore
      const vscode = acquireVsCodeApi();
      vscode.postMessage({ 
        command: 'openExternal', 
        url: 'https://www.docker.com/products/docker-desktop/' 
      });
    }
  };

  const handleStartDocker = () => {
    // @ts-ignore
    if (typeof acquireVsCodeApi !== 'undefined') {
      // @ts-ignore
      const vscode = acquireVsCodeApi();
      vscode.postMessage({ command: 'startDocker' });
    }
  };

  if (state === 'ready') {
    return <HomeDashboard onExecuteCommand={handleExecuteCommand} />;
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
