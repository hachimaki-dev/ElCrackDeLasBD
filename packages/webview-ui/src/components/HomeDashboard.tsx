import React, { useState } from 'react';
import { HomeOverview } from './HomeOverview';
import { HomeSheets } from './HomeSheets';
import { HomeProfile } from './HomeProfile';
import { HomeSettings } from './HomeSettings';
import { HomeTutorials } from './HomeTutorials';

interface EngineData {
  id: string;
  displayName: string;
  status: 'stopped' | 'pulling' | 'starting' | 'running' | 'stopping' | 'error';
  port: number;
  completedModules?: string[];
  xp?: { ddl: number; dml: number; optimization: number; architecture: number };
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
    streak?: number;
  };
  tutorialsData?: any;
  onExecuteCommand: (action: string, args?: any[]) => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  engines,
  activeConnection,
  gamification,
  tutorialsData,
  onExecuteCommand,
}) => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  const activeEngineData = engines.find((e) => e.status !== 'stopped');
  const activeEngine = activeEngineData ? {
    id: activeEngineData.id,
    displayName: activeEngineData.displayName,
    completedModules: activeEngineData.completedModules || [],
    xp: activeEngineData.xp || { ddl: 0, dml: 0, optimization: 0, architecture: 0 },
  } : null;

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <HomeOverview
            engines={engines}
            activeConnection={activeConnection}
            progress={gamification}
            onExecuteCommand={onExecuteCommand}
            setActiveTab={setActiveTab}
          />
        );
      case 'tutorials':
        return (
          <HomeTutorials
            activeEngine={activeEngine}
            tutorialsData={tutorialsData}
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
    <div className="hachimaki-dashboard">
      <div className="header-title">
        <div className="header-left">
          <h1>
            SQL Engine Lab
            <span>Laboratorio de Motores SQL · Un motor a la vez</span>
          </h1>
        </div>
        
        <div className="tabs-container">
          <div
            className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            Dashboard
          </div>
          <div
            className={`tab ${activeTab === 'tutorials' ? 'active' : ''}`}
            onClick={() => setActiveTab('tutorials')}
          >
            Tutoriales
          </div>
          <div
            className={`tab ${activeTab === 'sheets' ? 'active' : ''}`}
            onClick={() => setActiveTab('sheets')}
          >
            Sandbox
          </div>
          <div
            className={`tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            Perfil
          </div>
          <div
            className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            Ajustes
          </div>
        </div>

        <div className="header-gamification">
          <div className="header-stat streak">
            <span className="stat-icon">🔥</span>
            <div className="stat-text">
              <span className="stat-label">Racha</span>
              <span className="stat-value">{gamification.streak || 7} días</span>
            </div>
          </div>
          
          <div className="header-stat xp">
            <span className="stat-icon">🏆</span>
            <div className="stat-text">
              <span className="stat-value">{gamification.xp.toLocaleString()}</span>
              <span className="stat-label">XP</span>
            </div>
          </div>
          
          <div className="header-level-badge">
            <div className="level-circle-progress" style={{
              background: `conic-gradient(var(--accent-purple) ${((1000 - gamification.xpToNextLevel) / 1000) * 360}deg, rgba(255, 255, 255, 0.08) 0deg)`
            }}>
              <div className="level-circle-inner">
                <span className="level-label">NIVEL</span>
                <span className="level-value">{gamification.level}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        {renderActiveTab()}
      </div>
    </div>
  );
};
