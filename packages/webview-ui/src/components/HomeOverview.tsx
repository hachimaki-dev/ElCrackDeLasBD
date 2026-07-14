import React, { useState, useEffect } from 'react';
import { EngineCatalog } from './EngineCatalog';
import { WaveformCanvas } from './WaveformCanvas';
import { DbExplorerTab } from './DbExplorer/DbExplorerTab';

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
  const activeEngine = engines.find((e) => e.status !== 'stopped');
  const isActive = activeEngine?.status === 'running';
  const [viewMode, setViewMode] = useState<'diagnostics' | 'explorer'>('diagnostics');

  // SVG selector for database engine logos
  const renderEngineSvg = (id: string) => {
    const strokeColor = 'var(--accent-purple)';
    switch (id) {
      case 'postgres':
        return (
          <svg width="70" height="70" viewBox="0 0 64 64" fill="none" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 28c0-8 6-14 14-14h12c8 0 14 6 14 14v16H40" />
            <path d="M26 14c0 10 2 20-6 26" />
            <path d="M46 22c-2-2-6-2-8 0" />
            <path d="M20 28c0-3 3-5 6-5s6 2 6 5c0 6-12 12-12 18z" />
            <circle cx="44" cy="28" r="1.5" fill="currentColor" />
          </svg>
        );
      case 'mysql':
        return (
          <svg width="70" height="70" viewBox="0 0 64 64" fill="none" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 42c8-2 16-10 20-18s4-12 2-14c-2-2-6 2-14 10s-16 12-18 20" />
            <path d="M26 22c4 4 10 8 16 10s12-2 14-4" />
            <circle cx="42" cy="18" r="1.5" fill="currentColor" />
          </svg>
        );
      case 'mariadb':
        return (
          <svg width="70" height="70" viewBox="0 0 64 64" fill="none" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 44c4-12 14-22 24-22s18 8 20 16" />
            <path d="M22 32c4-2 10-2 14 0" />
            <path d="M34 22V14" />
          </svg>
        );
      case 'sqlite':
        return (
          <svg width="70" height="70" viewBox="0 0 64 64" fill="none" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <ellipse cx="32" cy="18" rx="20" ry="8" />
            <path d="M12 18v12c0 4.4 9 8 20 8s20-3.6 20-8V18" />
            <path d="M12 30v12c0 4.4 9 8 20 8s20-3.6 20-8V30" />
            <line x1="32" y1="18" x2="32" y2="50" strokeDasharray="3 3" />
          </svg>
        );
      case 'oracle':
        return (
          <svg width="70" height="70" viewBox="0 0 64 64" fill="none" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="32" cy="32" r="22" strokeWidth="2" />
            <ellipse cx="32" cy="32" rx="14" ry="7" />
          </svg>
        );
      case 'sqlserver':
        return (
          <svg width="70" height="70" viewBox="0 0 64 64" fill="none" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="14" y="10" width="36" height="12" rx="2" />
            <rect x="14" y="26" width="36" height="12" rx="2" />
            <rect x="14" y="42" width="36" height="12" rx="2" />
            <circle cx="20" cy="16" r="1.5" fill="currentColor" />
            <circle cx="20" cy="32" r="1.5" fill="currentColor" />
            <circle cx="20" cy="48" r="1.5" fill="currentColor" />
          </svg>
        );
      default:
        return (
          <svg width="70" height="70" viewBox="0 0 64 64" fill="none" stroke={strokeColor} strokeWidth="1.5">
            <circle cx="32" cy="32" r="20" />
          </svg>
        );
    }
  };

  // Determine timeline step states
  // Steps: 1: Pull, 2: Crear, 3: Iniciar, 4: Salud
  const getStepStatus = (step: number) => {
    if (!activeEngine) return 'pending';
    const status = activeEngine.status;
    
    if (status === 'pulling') {
      if (step === 1) return 'active';
      return 'pending';
    }
    if (status === 'starting') {
      if (step < 3) return 'completed';
      if (step === 3) return 'active';
      return 'pending';
    }
    if (status === 'running') {
      return 'completed';
    }
    if (status === 'stopping') {
      return 'pending';
    }
    return 'pending';
  };

  // Calculate timeline progress bar fill width
  const getTimelineFillWidth = () => {
    if (!activeEngine) return '0%';
    const status = activeEngine.status;
    if (status === 'pulling') return '0%';
    if (status === 'starting') return '66%';
    if (status === 'running') return '100%';
    return '0%';
  };

  // Simulated stopwatch or uptime calculator
  const [uptime, setUptime] = useState('00:00:00');
  useEffect(() => {
    let timer: any;
    if (isActive) {
      let seconds = 0;
      timer = setInterval(() => {
        seconds += 1;
        const hrs = String(Math.floor(seconds / 3600)).padStart(2, '0');
        const mins = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
        const secs = String(seconds % 60).padStart(2, '0');
        setUptime(`${hrs}:${mins}:${secs}`);
      }, 1000);
    } else {
      setUptime('00:00:00');
    }
    return () => clearInterval(timer);
  }, [isActive]);

  const XP_PER_LEVEL = 1000;
  const xpInLevel = progress.xp % XP_PER_LEVEL;

  // Resource link handler
  const handleResourceClick = (_name: string, url: string) => {
    onExecuteCommand('sqlEngineLab.showDiagnostics'); // Just as check, or execute link
    window.postMessage({ command: 'openExternal', url }, '*');
  };

  // Quick Action Handler
  const handleQuickAction = (action: string) => {
    if (action === 'sandbox') {
      onExecuteCommand('sqlEngineLab.newSqlSheet');
    } else if (action === 'logs') {
      onExecuteCommand('sqlEngineLab.showDiagnostics');
    } else if (action === 'restart') {
      if (activeEngine) {
        onExecuteCommand('sqlEngineLab.stopEngine');
        setTimeout(() => {
          onExecuteCommand('sqlEngineLab.startEngine', [activeEngine.id]);
        }, 1500);
      }
    } else if (action === 'explorer') {
      setViewMode('explorer');
    }
  };

  if (!activeEngine) {
    return (
      <EngineCatalog engines={engines} onExecuteCommand={onExecuteCommand} />
    );
  }

  return (
    <div className="dashboard-grid">
      {/* LEFT COLUMN: ACTIVE STATS & CONTROLS */}
      <div>
        {viewMode === 'explorer' ? (
          <DbExplorerTab
            engineId={activeEngine.id}
            onBack={() => setViewMode('diagnostics')}
          />
        ) : (
          <>
        {/* Active Engine Card */}
        <div className="dashboard-panel hero-engine-card">
          <div className="hero-engine-info">
            <span className="status-badge running" style={{ width: 'fit-content' }}>
              <span className="pulse-dot animated"></span>
              {activeEngine.status === 'running' ? 'Corriendo' : activeEngine.status === 'starting' ? 'Iniciando' : 'Descargando'}
            </span>
            <div className="hero-engine-title-row" style={{ marginTop: '4px' }}>
              <h2 className="hero-engine-name">{activeEngine.displayName}</h2>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '4px 0 0 0' }}>
              Puerto mapeado: {activeConnection?.port || activeEngine.port}
            </p>
            {isActive && (
              <button 
                className="btn primary text-xs" 
                style={{ 
                  background: 'var(--accent-purple)', 
                  borderColor: 'var(--accent-purple)', 
                  marginTop: '12px',
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-sm)'
                }}
                onClick={() => setViewMode('explorer')}
              >
                🔍 Explorar y Administrar Datos
              </button>
            )}
          </div>

          <div className="hero-illustration">
            {renderEngineSvg(activeEngine.id)}
          </div>
        </div>

        {/* Timeline Stepper (Docker Lifecycle) */}
        <div className="dashboard-panel">
          <span className="panel-title">Fase de Despliegue Docker</span>
          <div className="timeline-stepper">
            <div className="timeline-line-fill" style={{ width: getTimelineFillWidth() }}></div>
            
            <div className={`timeline-step ${getStepStatus(1)}`}>
              <div className="step-dot">{getStepStatus(1) === 'completed' ? '✓' : '1'}</div>
              <span className="step-label">Pull</span>
            </div>
            <div className={`timeline-step ${getStepStatus(2)}`}>
              <div className="step-dot">{getStepStatus(2) === 'completed' ? '✓' : '2'}</div>
              <span className="step-label">Crear</span>
            </div>
            <div className={`timeline-step ${getStepStatus(3)}`}>
              <div className="step-dot">{getStepStatus(3) === 'completed' ? '✓' : '3'}</div>
              <span className="step-label">Iniciar</span>
            </div>
            <div className={`timeline-step ${getStepStatus(4)}`}>
              <div className="step-dot">{getStepStatus(4) === 'completed' ? '❤' : '4'}</div>
              <span className="step-label">Salud</span>
            </div>
          </div>
        </div>

        {/* Credentials Grid */}
        <div className="details-grid">
          <div className="detail-card">
            <span className="detail-label">Puerto</span>
            <span className="detail-value">{activeConnection?.port || activeEngine.port}</span>
            <span className="detail-subtext">localhost</span>
          </div>
          <div className="detail-card">
            <span className="detail-label">Usuario</span>
            <span className="detail-value">{activeConnection?.user || 'postgres'}</span>
            <span className="detail-subtext">Superusuario</span>
          </div>
          <div className="detail-card">
            <span className="detail-label">Base de datos</span>
            <span className="detail-value">{activeConnection?.database || 'postgres'}</span>
            <span className="detail-subtext">Base por defecto</span>
          </div>
          <div className="detail-card">
            <span className="detail-label">Uptime</span>
            <span className="detail-value">{uptime}</span>
            <span className="detail-subtext">{isActive ? 'Encendido' : 'Cargando...'}</span>
          </div>
        </div>

        {/* Connection Command Section */}
        {activeConnection?.connectionCommand && (
          <div className="dashboard-panel" style={{ marginTop: '20px', paddingBottom: '16px' }}>
            <div className="panel-header-row">
              <span className="panel-title">&gt;_ Comando de Conexión</span>
              <button
                className="btn primary"
                style={{ padding: '3px 10px', fontSize: '11px' }}
                onClick={() => onExecuteCommand('sqlEngineLab.copyConnectionCommand')}
              >
                Copiar
              </button>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '11.5px', marginBottom: '12px' }}>
              Copia y pega este comando en tu terminal integrada o del sistema para abrir el cliente interactivo.
            </p>
            <div className="code-preview-box">
              <pre className="code-preview-body">{activeConnection.connectionCommand}</pre>
              <div className="code-preview-footer">
                Sistemas operativos soportados: Linux / macOS / Windows (Git Bash, WSL)
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions Row */}
        <div className="dashboard-panel" style={{ marginTop: '20px' }}>
          <span className="panel-title">Acciones Rápidas</span>
          <div className="quick-actions-row">
            <div className="quick-action-card" onClick={() => handleQuickAction('sandbox')}>
              <span className="quick-action-title">Abrir Sandbox</span>
              <span className="quick-action-desc">Editor SQL local integrado.</span>
            </div>
            <div className="quick-action-card" onClick={() => handleQuickAction('logs')}>
              <span className="quick-action-title">Ver Logs</span>
              <span className="quick-action-desc">Diagnósticos del motor.</span>
            </div>
            <div className="quick-action-card" onClick={() => handleQuickAction('explorer')}>
              <span className="quick-action-title">Explorar Datos</span>
              <span className="quick-action-desc">Administrador web interactivo.</span>
            </div>
            <div className="quick-action-card" onClick={() => handleQuickAction('restart')}>
              <span className="quick-action-title">Reiniciar Motor</span>
              <span className="quick-action-desc">Reinicia el contenedor Docker.</span>
            </div>
          </div>
        </div>

        {/* Gamification Progress Footer Widget */}
        <div className="gamification-metrics-bar" style={{ marginTop: '20px', cursor: 'pointer' }} onClick={() => setActiveTab('profile')}>
          <div className="gamification-level-group">
            <div className="level-badge-circle">{progress.level}</div>
            <div className="level-meta">
              <span className="level-rank-name">Nivel {progress.level} · DBA Apprentice</span>
              <div className="level-xp-progress-outer">
                <div className="level-xp-progress-fill" style={{ width: `${Math.min(100, Math.round((xpInLevel / XP_PER_LEVEL) * 100))}%` }}></div>
              </div>
            </div>
          </div>

          <div className="gamification-stats-group">
            <div className="stat-metric-item">
              <span className="stat-metric-icon">🔥</span>
              <span className="stat-metric-label">Racha:</span>
              <strong>7 días</strong>
            </div>
            <div className="stat-metric-item">
              <span className="stat-metric-icon">🏆</span>
              <span className="stat-metric-label">Insignias:</span>
              <strong>{progress.badges.length}</strong>
            </div>
            <div className="stat-metric-item">
              <span className="stat-metric-icon">✓</span>
              <span className="stat-metric-label">Retos:</span>
              <strong>24</strong>
            </div>
          </div>
        </div>
        </>
        )}
      </div>

      {/* RIGHT COLUMN: SPECS, RESOURCES & TIPS */}
      <div className="right-sidebar-panel">
        {/* Engine Health Panel */}
        <div className="dashboard-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span className="panel-title">Salud del Motor</span>
            <span className={`status-badge ${isActive ? 'sano' : 'stopped'}`}>{isActive ? 'Sano' : 'Detenido'}</span>
          </div>
          
          <div className="health-waveform-container">
            <WaveformCanvas active={isActive} />
          </div>

          <div className="specs-grid">
            <div className="spec-row">
              <span className="spec-name">CPU</span>
              <span className="spec-value">{isActive ? '2.4%' : '0.0%'}</span>
            </div>
            <div className="spec-row">
              <span className="spec-name">Memoria</span>
              <span className="spec-value">{isActive ? '121 MB' : '0 MB'}</span>
            </div>
            <div className="spec-row">
              <span className="spec-name">Estado</span>
              <span className="spec-value" style={{ color: isActive ? '#34d399' : 'var(--text-muted)' }}>
                {isActive ? 'healthy' : 'offline'}
              </span>
            </div>
            <div className="spec-row">
              <span className="spec-name">Chequeo</span>
              <span className="spec-value">{isActive ? 'hace 5s' : 'n/a'}</span>
            </div>
          </div>
        </div>

        {/* Quick Resources Panel */}
        <div className="dashboard-panel">
          <span className="panel-title" style={{ marginBottom: '12px', display: 'block' }}>Recursos Rápidos</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div className="resource-list-item" onClick={() => handleResourceClick('Docs', 'https://www.postgresql.org/docs/')}>
              <div className="resource-icon">📖</div>
              <div className="resource-meta">
                <span className="resource-name">Documentación</span>
                <span className="resource-desc">Guías y referencias</span>
              </div>
            </div>
            <div className="resource-list-item" onClick={() => handleResourceClick('Cheatsheet', 'https://devhints.io/sql')}>
              <div className="resource-icon">⚡</div>
              <div className="resource-meta">
                <span className="resource-name">Comandos SQL</span>
                <span className="resource-desc">Cheatsheet rápido</span>
              </div>
            </div>
            <div className="resource-list-item" onClick={() => handleResourceClick('Soporte', 'https://github.com/')}>
              <div className="resource-icon">💬</div>
              <div className="resource-meta">
                <span className="resource-name">Soporte</span>
                <span className="resource-desc">Reportar un issue</span>
              </div>
            </div>
            <div className="resource-list-item" onClick={() => handleResourceClick('Novedades', 'https://github.com/')}>
              <div className="resource-icon">🎁</div>
              <div className="resource-meta">
                <span className="resource-name">Novedades</span>
                <span className="resource-desc">Ver changelog</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tip of the Day Panel */}
        <div className="tip-day-card">
          <div className="tip-day-title">
            <span>💡 Tip del Día</span>
          </div>
          <p className="tip-day-content" style={{ margin: 0 }}>
            Puedes cambiar de motor en cualquier momento desde la barra lateral. Al iniciar uno nuevo, el actual se detendrá automáticamente conservando el volumen de datos de tu sandbox.
          </p>
          <div className="tip-illustration-container">
            <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M30 5C30 5 42 17 42 33C42 41.2843 36.6274 48 30 48C23.3726 48 18 41.2843 18 33C18 17 30 5 30 5Z" fill="rgba(139, 92, 246, 0.05)" stroke="var(--accent-purple)" strokeWidth="1.5"/>
              <path d="M30 48V55M24 51L30 55L36 51" stroke="var(--accent-purple)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M22 30C22 30 14 32 14 38C14 42 22 41 22 41" stroke="var(--accent-purple)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M38 30C38 30 46 32 46 38C46 42 38 41 38 41" stroke="var(--accent-purple)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="30" cy="24" r="5" stroke="var(--accent-purple)" strokeWidth="1.5"/>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};
