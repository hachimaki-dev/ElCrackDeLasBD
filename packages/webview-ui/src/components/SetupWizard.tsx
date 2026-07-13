import React from 'react';

interface SetupWizardProps {
  state: 'checking_docker' | 'docker_not_installed' | 'docker_not_running' | 'starting_docker' | 'pulling_images';
  progress?: { status: string; percentage?: number };
  onRetry: () => void;
  onOpenDocker?: () => void;
  onStartDocker?: () => void;
}

export const SetupWizard: React.FC<SetupWizardProps> = ({ state, progress, onRetry, onOpenDocker, onStartDocker }) => {
  return (
    <div className="setup-wizard-container" style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh',
      backgroundColor: 'var(--vscode-editor-background)', color: 'var(--vscode-editor-foreground)',
      fontFamily: 'var(--vscode-font-family)', textAlign: 'center', padding: '2rem'
    }}>
      <div className="setup-card" style={{
        backgroundColor: 'var(--vscode-editorWidget-background)',
        border: '1px solid var(--vscode-widget-border)',
        borderRadius: '12px',
        padding: '3rem',
        maxWidth: '500px',
        width: '100%',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
      }}>
        <h1 style={{ fontSize: '24px', marginBottom: '1rem', color: 'var(--vscode-editor-foreground)' }}>
          <span style={{ color: 'var(--accent-primary, #007acc)' }}>SQL Engine</span> Lab
        </h1>
        
        {state === 'checking_docker' && (
          <div>
            <div className="loader" style={{ margin: '2rem auto', border: '4px solid var(--vscode-editor-background)', borderTop: '4px solid var(--accent-primary, #007acc)', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }}></div>
            <h2 style={{ fontSize: '18px', fontWeight: '500' }}>Iniciando Entorno...</h2>
            <p style={{ color: 'var(--vscode-descriptionForeground)', marginTop: '0.5rem' }}>Verificando conexión con Docker.</p>
          </div>
        )}

        {state === 'docker_not_installed' && (
          <div>
            <div style={{ fontSize: '48px', margin: '1rem 0' }}>🐳❌</div>
            <h2 style={{ fontSize: '18px', fontWeight: '500', color: 'var(--vscode-errorForeground)' }}>Docker No Detectado</h2>
            <p style={{ color: 'var(--vscode-descriptionForeground)', marginTop: '0.5rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              SQL Engine Lab requiere Docker Desktop para orquestar los motores de base de datos. No detectamos que Docker esté instalado en tu sistema.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button onClick={onOpenDocker} style={{
                backgroundColor: 'var(--vscode-button-background)', color: 'var(--vscode-button-foreground)',
                border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: '500'
              }}>
                Descargar Docker
              </button>
              <button onClick={onRetry} style={{
                backgroundColor: 'transparent', color: 'var(--vscode-button-background)',
                border: '1px solid var(--vscode-button-background)', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: '500'
              }}>
                Reintentar
              </button>
            </div>
          </div>
        )}

        {state === 'docker_not_running' && (
          <div>
            <div style={{ fontSize: '48px', margin: '1rem 0' }}>🐳💤</div>
            <h2 style={{ fontSize: '18px', fontWeight: '500', color: 'var(--vscode-editorWarning-foreground)' }}>Docker Está Detenido</h2>
            <p style={{ color: 'var(--vscode-descriptionForeground)', marginTop: '0.5rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              Docker está instalado pero no se encuentra en ejecución. Puedes intentar iniciarlo automáticamente o hacerlo de forma manual.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button onClick={onStartDocker} style={{
                backgroundColor: 'var(--vscode-button-background)', color: 'var(--vscode-button-foreground)',
                border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: '500'
              }}>
                Levantar Docker Automáticamente
              </button>
              <button onClick={onRetry} style={{
                backgroundColor: 'transparent', color: 'var(--vscode-button-background)',
                border: '1px solid var(--vscode-button-background)', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: '500'
              }}>
                Ya lo abrí
              </button>
            </div>
          </div>
        )}

        {state === 'starting_docker' && (
          <div>
            <div className="loader" style={{ margin: '2rem auto', border: '4px solid var(--vscode-editor-background)', borderTop: '4px solid var(--vscode-charts-yellow)', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }}></div>
            <h2 style={{ fontSize: '18px', fontWeight: '500' }}>Esperando a Docker...</h2>
            <p style={{ color: 'var(--vscode-descriptionForeground)', marginTop: '0.5rem' }}>Intentando levantar el servicio. Esto puede tomar unos segundos.</p>
          </div>
        )}

        {state === 'pulling_images' && (
          <div>
            <div style={{ fontSize: '48px', margin: '1rem 0', animation: 'pulse 2s infinite' }}>📦</div>
            <h2 style={{ fontSize: '18px', fontWeight: '500' }}>Preparando Motor Principal (Oracle)</h2>
            <p style={{ color: 'var(--vscode-descriptionForeground)', marginTop: '0.5rem', marginBottom: '1.5rem', fontSize: '13px' }}>
              Estamos descargando la imagen de Oracle para que sea tu punto de partida. Los demás motores se descargarán bajo demanda.
            </p>
            
            <div style={{ width: '100%', backgroundColor: 'var(--vscode-editor-background)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ 
                width: `${progress?.percentage || 0}%`, 
                backgroundColor: 'var(--accent-primary, #007acc)', 
                height: '100%', 
                transition: 'width 0.3s ease'
              }}></div>
            </div>
            
            <p style={{ marginTop: '1rem', fontSize: '12px', color: 'var(--vscode-descriptionForeground)', fontFamily: 'var(--vscode-editor-font-family)' }}>
              {progress?.status || 'Iniciando descarga...'} {progress?.percentage !== undefined ? `(${progress.percentage}%)` : ''}
            </p>
          </div>
        )}
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes pulse { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.1); opacity: 0.8; } 100% { transform: scale(1); opacity: 1; } }
      `}} />
    </div>
  );
};
