import React from 'react';

interface EngineData {
  id: string;
  displayName: string;
  status: 'stopped' | 'pulling' | 'starting' | 'running' | 'stopping' | 'error';
  port: number;
}

interface EngineCatalogProps {
  engines: EngineData[];
  onExecuteCommand: (action: string, args?: any[]) => void;
}

export const EngineCatalog: React.FC<EngineCatalogProps> = ({ engines, onExecuteCommand }) => {
  const getEngineIcon = (id: string) => {
    switch (id) {
      case 'sqlite': return '💾';
      case 'postgres': return '🐘';
      case 'mariadb': return '🦭';
      case 'mysql': return '🐬';
      case 'oracle': return '🔴';
      case 'sqlserver': return '🗄️';
      default: return '🗄️';
    }
  };

  const getEngineDescription = (id: string) => {
    switch (id) {
      case 'sqlite': return 'Motor embebido ligero y de alto rendimiento. Ideal para desarrollo rápido sin dependencias.';
      case 'postgres': return 'El motor relacional de código abierto más avanzado. Destaca por su extensibilidad y cumplimiento de estándares.';
      case 'mariadb': return 'Bifurcación comunitaria de MySQL. Rápido, robusto y con características empresariales avanzadas.';
      case 'mysql': return 'El motor relacional de código abierto más popular del mundo, respaldado por Oracle.';
      case 'oracle': return 'Edición gratuita del motor líder en la industria corporativa. Robusto, seguro y con PL/SQL nativo.';
      case 'sqlserver': return 'Edición para desarrolladores de Microsoft SQL Server. Ideal para el ecosistema .NET y T-SQL.';
      default: return 'Motor de base de datos SQL.';
    }
  };

  const activeEngine = engines.find((e) => e.status === 'running' || e.status === 'starting' || e.status === 'stopping');

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '6px' }}>Catálogo de Motores SQL</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '12.5px', margin: 0 }}>
          Selecciona e inicia un motor SQL. SQL Engine Lab gestionará el contenedor de Docker automáticamente. Solo puede haber un motor activo a la vez.
        </p>
      </div>

      <div className="engines-grid">
        {engines.map((engine) => {
          const isCurrentActive = engine.status === 'running' || engine.status === 'starting' || engine.status === 'stopping' || engine.status === 'pulling';
          const isButtonDisabled = activeEngine && !isCurrentActive;

          return (
            <div key={engine.id} className={`engine-card ${engine.status === 'running' ? 'active' : ''}`}>
              <div>
                <div className="engine-card-top">
                  <div className="engine-card-icon">{getEngineIcon(engine.id)}</div>
                  <div className="engine-card-info">
                    <h3 className="engine-card-name">{engine.displayName}</h3>
                    <span className="engine-card-port">Puerto: {engine.port}</span>
                  </div>
                </div>
                <div style={{ marginTop: '12px' }}>
                  <p className="engine-card-desc">{getEngineDescription(engine.id)}</p>
                </div>
              </div>

              <div className="engine-card-footer">
                <span className={`status-badge ${engine.status}`}>
                  {engine.status === 'running' && <span className="pulse-dot animated"></span>}
                  {engine.status === 'running' ? 'Corriendo' : engine.status === 'stopped' ? 'Detenido' : 'Cargando'}
                </span>

                <div>
                  {engine.status === 'running' ? (
                    <button
                      className="btn danger"
                      onClick={() => onExecuteCommand('sqlEngineLab.stopEngine')}
                    >
                      🛑 Detener
                    </button>
                  ) : engine.status === 'starting' || engine.status === 'pulling' ? (
                    <button className="btn" disabled>
                      ⏳ Cargando...
                    </button>
                  ) : (
                    <button
                      className="btn primary"
                      disabled={!!isButtonDisabled}
                      onClick={() => onExecuteCommand('sqlEngineLab.startEngine', [engine.id])}
                      title={isButtonDisabled ? 'Debes detener el motor activo primero' : `Iniciar ${engine.displayName}`}
                    >
                      ⚡ Iniciar
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
