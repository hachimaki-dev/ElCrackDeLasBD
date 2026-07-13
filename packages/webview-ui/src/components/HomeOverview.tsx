import React from 'react';

interface EngineData {
  id: string;
  displayName: string;
  status: 'stopped' | 'pulling' | 'starting' | 'running' | 'stopping' | 'error';
  port: number;
}

interface OverviewProps {
  engines: EngineData[];
  activeConnection?: {
    host: string;
    port: number;
    user?: string;
    database?: string;
    connectionCommand?: string;
    adminConnectionCommand?: string;
  };
  progress: {
    xp: number;
    level: number;
    xpToNextLevel: number;
    badges: Array<{
      id: string;
      name: string;
      description: string;
      icon: string;
      unlockedAt: string;
    }>;
  };
  onExecuteCommand: (action: string, args?: any[]) => void;
  setActiveTab: (tab: string) => void;
}

export const HomeOverview: React.FC<OverviewProps> = ({
  engines,
  activeConnection,
  progress,
  onExecuteCommand,
  setActiveTab,
}) => {
  const activeEngine = engines.find((e) => e.status === 'running' || e.status === 'starting');

  // SVG or simple circular progress calculation
  const XP_PER_LEVEL = 1000;
  const xpInLevel = progress.xp % XP_PER_LEVEL;
  const circumference = 2 * Math.PI * 52; // r = 52
  const strokeDashoffset = circumference - (xpInLevel / XP_PER_LEVEL) * circumference;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Hero Section */}
      <div className="hero-card">
        <span className="hero-badge">Entorno Activo</span>
        <h1 className="hero-title">Laboratorio de <span>Motores SQL</span></h1>
        <p className="hero-description">
          Aprende, experimenta y domina las diferencias arquitectónicas de múltiples motores SQL (PostgreSQL, MariaDB, MySQL, SQLite, Oracle y SQL Server) corriendo en contenedores aislados y seguros.
        </p>
        <div className="hero-grid">
          <div className="hero-feature">
            <span className="hero-feature-icon">🛡️</span>
            <span>Aislamiento 100% Local</span>
          </div>
          <div className="hero-feature">
            <span className="hero-feature-icon">⚡</span>
            <span>Arranque en Segundos</span>
          </div>
          <div className="hero-feature">
            <span className="hero-feature-icon">🎮</span>
            <span>Gamificación Avanzada</span>
          </div>
        </div>
      </div>

      {/* Connection Info Widget (if running) */}
      {activeEngine && activeConnection && (
        <div className="widget-card" style={{ borderLeft: '4px solid var(--accent-secondary)' }}>
          <div className="widget-title">
            <span>Conexión Activa: {activeEngine.displayName}</span>
            <span className="status-badge running">
              <span className="pulse-dot animated"></span>
              En ejecución
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '12px' }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>HOST / PUERTO</div>
              <div style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'var(--vscode-font-mono)' }}>
                {activeConnection.host}:{activeConnection.port}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px', marginBottom: '4px' }}>BASE DE DATOS</div>
              <div style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'var(--vscode-font-mono)' }}>
                {activeConnection.database || 'labdb'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>USUARIO / CLAVE</div>
              <div style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'var(--vscode-font-mono)' }}>
                {activeConnection.user || 'sandbox'} / (Configurada)
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button
                  className="btn"
                  style={{ background: 'rgba(14, 165, 233, 0.15)', borderColor: 'rgba(14, 165, 233, 0.3)' }}
                  onClick={() => onExecuteCommand('sqlEngineLab.newSqlSheet')}
                >
                  🚀 Nueva Hoja SQL
                </button>
                <button
                  className="btn"
                  style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                  onClick={() => onExecuteCommand('sqlEngineLab.stopEngine')}
                >
                  🛑 Detener Motor
                </button>
              </div>
            </div>
          </div>

          {activeConnection.connectionCommand && (
            <div className="code-preview-box" style={{ marginTop: '20px' }}>
              <div className="code-preview-header">
                <span>COMANDO DE CONEXIÓN (CLI)</span>
                <button
                  style={{ background: 'transparent', border: 'none', color: 'var(--accent-secondary)', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}
                  onClick={() => onExecuteCommand('sqlEngineLab.copyConnectionCommand')}
                >
                  📋 Copiar Comando
                </button>
              </div>
              <pre className="code-preview-body">{activeConnection.connectionCommand}</pre>
            </div>
          )}
        </div>
      )}

      {/* Widgets Grid */}
      <div className="widgets-grid">
        {/* Engines status overview */}
        <div className="widget-card">
          <div className="widget-title">
            <span>Estados de Motores</span>
            <button
              style={{ background: 'transparent', border: 'none', color: 'var(--accent-secondary)', cursor: 'pointer', fontSize: '12px' }}
              onClick={() => setActiveTab('engines')}
            >
              Ver todos →
            </button>
          </div>
          <div className="compact-engine-list">
            {engines.slice(0, 4).map((engine) => (
              <div key={engine.id} className="compact-engine-item">
                <div className="compact-engine-info">
                  <div className="compact-engine-badge">
                    {engine.id === 'postgres' ? '🐘' : engine.id === 'mysql' ? '🐬' : engine.id === 'oracle' ? '🔴' : '🗄️'}
                  </div>
                  <div>
                    <div className="compact-engine-name">{engine.displayName}</div>
                    <span className="compact-engine-port">Puerto: {engine.port}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className={`status-badge ${engine.status}`}>
                    {engine.status === 'running' && <span className="pulse-dot animated"></span>}
                    {engine.status === 'running' ? 'Activo' : engine.status === 'stopped' ? 'Detenido' : 'Cargando'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Gamification widget */}
        <div className="widget-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div className="widget-title">
            <span>Progreso Global</span>
            <button
              style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontSize: '12px' }}
              onClick={() => setActiveTab('profile')}
            >
              Ver perfil →
            </button>
          </div>
          <div className="progress-widget-body">
            <div className="progress-circle-outer">
              <svg className="progress-circle-svg" width="120" height="120">
                <circle className="progress-circle-bg" cx="60" cy="60" r="52"></circle>
                <circle
                  className="progress-circle-bar"
                  cx="60"
                  cy="60"
                  r="52"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                ></circle>
              </svg>
              <div className="progress-level-display">
                <span className="level-number">{progress.level}</span>
                <span className="level-label">Nivel</span>
              </div>
            </div>
            <div className="progress-xp-text">{progress.xp} XP acumulado</div>
            <span className="progress-xp-subtext">Te faltan {progress.xpToNextLevel} XP para nivel {progress.level + 1}</span>

            {progress.badges.length > 0 && (
              <div className="mini-badges-row">
                {progress.badges.map((b) => (
                  <div key={b.id} className="mini-badge-icon" title={`${b.name}: ${b.description}`}>
                    {b.icon}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Challenge of the Day / Educational Banner */}
      <div className="widget-card challenge-widget">
        <div>
          <span className="challenge-badge">Desafío Sugerido</span>
          <h3 className="challenge-title">Optimización de Índices en PostgreSQL</h3>
          <p className="challenge-desc">
            Aprende a analizar planes de consulta (EXPLAIN) y diseña un índice compuesto para reducir el costo de ejecución en un 95%.
          </p>
        </div>
        <button
          className="btn"
          style={{ width: 'fit-content', background: 'rgba(139, 92, 246, 0.15)', borderColor: 'rgba(139, 92, 246, 0.3)' }}
          onClick={() => setActiveTab('engines')}
        >
          Iniciar Reto ahora ⚡
        </button>
      </div>
    </div>
  );
};
