import React, { useState } from 'react';
import { HomeSidebar } from './HomeSidebar';
import { HomeOverview } from './HomeOverview';
import { HomeEngines } from './HomeEngines';
import { HomeSheets } from './HomeSheets';
import { HomeProfile } from './HomeProfile';
import { HomeSettings } from './HomeSettings';

interface EngineData {
  id: string;
  displayName: string;
  status: 'stopped' | 'pulling' | 'starting' | 'running' | 'stopping' | 'error';
  port: number;
}

interface HomeDashboardProps {
  engines: EngineData[];
  activeConnection?: {
    host: string;
    port: number;
    user?: string;
    database?: string;
    connectionCommand?: string;
    adminConnectionCommand?: string;
  };
  gamification: {
    xp: number;
    level: number;
    xpToNextLevel: number;
    badges: any[];
  };
  onExecuteCommand: (action: string, args?: any[]) => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  engines,
  activeConnection,
  gamification,
  onExecuteCommand,
}) => {
  const [activeTab, setActiveTab] = useState<string>('overview');

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <HomeOverview
            engines={engines}
            activeConnection={activeConnection}
            progress={gamification}
            onExecuteCommand={onExecuteCommand}
            setActiveTab={setActiveTab}
          />
        );
      case 'engines':
        return (
          <HomeEngines
            engines={engines}
            onExecuteCommand={onExecuteCommand}
          />
        );
      case 'sheets':
        return (
          <HomeSheets
            onExecuteCommand={onExecuteCommand}
          />
        );
      case 'profile':
        return (
          <HomeProfile
            progress={gamification}
          />
        );
      case 'settings':
        return (
          <HomeSettings
            onExecuteCommand={onExecuteCommand}
          />
        );
      default:
        return (
          <HomeOverview
            engines={engines}
            activeConnection={activeConnection}
            progress={gamification}
            onExecuteCommand={onExecuteCommand}
            setActiveTab={setActiveTab}
          />
        );
    }
  };

  return (
    <div className="dashboard-container">
      <HomeSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        progress={gamification}
      />
      <div className="dashboard-content">
        {renderActiveTab()}
      </div>
    </div>
  );
};
