import React from 'react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  progress: {
    xp: number;
    level: number;
    xpToNextLevel: number;
    badges: any[];
  };
}

export const HomeSidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, progress }) => {
  const menuItems = [
    { id: 'overview', name: 'Inicio', icon: '🏠' },
    { id: 'engines', name: 'Motores SQL', icon: '⚙️' },
    { id: 'sheets', name: 'Hojas SQL', icon: '📄' },
    { id: 'profile', name: 'Perfil Operativo', icon: '👤' },
    { id: 'settings', name: 'Ajustes', icon: '🛠️' },
  ];

  const totalXP = progress.xp;
  const XP_PER_LEVEL = 1000;
  const xpInLevel = totalXP % XP_PER_LEVEL;
  const xpPercentage = Math.min(100, Math.round((xpInLevel / XP_PER_LEVEL) * 100));

  return (
    <div className="dashboard-sidebar">
      <div>
        <div className="sidebar-header">
          <div className="sidebar-logo-container">
            <div className="sidebar-logo">👽</div>
          </div>
          <div className="sidebar-title-group">
            <span className="sidebar-app-name">SQL Engine <span>Lab</span></span>
            <span className="sidebar-version">v0.1.0</span>
          </div>
        </div>

        <div className="sidebar-menu">
          {menuItems.map((item) => (
            <div
              key={item.id}
              className={`sidebar-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <span className="sidebar-item-icon">{item.icon}</span>
              <span>{item.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="sidebar-footer-profile">
        <div className="profile-info">
          <div className="profile-avatar">👨‍💻</div>
          <div className="profile-text">
            <span className="profile-username">Operativo SQL</span>
            <span className="profile-level">Nivel {progress.level}</span>
          </div>
        </div>
        <div className="sidebar-xp-bar-container" title={`${xpInLevel} / ${XP_PER_LEVEL} XP en este nivel`}>
          <div className="sidebar-xp-bar" style={{ width: `${xpPercentage}%` }}></div>
        </div>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'right' }}>
          {xpInLevel}/{XP_PER_LEVEL} XP
        </div>
      </div>
    </div>
  );
};
