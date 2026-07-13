import React from 'react';

interface HomeDashboardProps {
  onExecuteCommand: (action: string, args?: any[]) => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({ onExecuteCommand }) => {
  const commands = [
    {
      id: 'sqlEngineLab.startEngine',
      title: 'Iniciar Motor SQL',
      icon: '🚀',
      description: 'Arranca un contenedor de base de datos (Postgres, Oracle, SQL Server, etc).',
      why: 'Es el primer paso para poder crear hojas SQL y ejecutar consultas.',
      highlight: true
    },
    {
      id: 'sqlEngineLab.createSheet',
      title: 'Nueva Hoja SQL',
      icon: '📝',
      description: 'Crea un archivo .sql interactivo conectado a un motor activo.',
      why: 'Aquí escribirás y ejecutarás tus consultas contra la base de datos.'
    },
    {
      id: 'sqlEngineLab.configureCredentials',
      title: 'Configurar Credenciales',
      icon: '🔑',
      description: 'Establece la contraseña maestra para todos los motores.',
      why: 'Garantiza acceso seguro y sincronizado a todos tus contenedores locales.'
    },
    {
      id: 'sqlEngineLab.showDiagnostics',
      title: 'Diagnóstico del Sistema',
      icon: '🩺',
      description: 'Ejecuta pruebas de conectividad y estado de Docker.',
      why: 'Útil si tienes problemas de conexión o errores al arrancar motores.'
    }
  ];

  return (
    <div className="home-dashboard-container" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', color: 'var(--vscode-editor-foreground)', fontFamily: 'var(--vscode-font-family)' }}>
      <header style={{ marginBottom: '3rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '32px', marginBottom: '1rem', fontWeight: 'bold' }}>
          Bienvenido a <span style={{ color: 'var(--accent-primary, #007acc)' }}>SQL Engine Laboratory</span>
        </h1>
        <p style={{ fontSize: '16px', color: 'var(--vscode-descriptionForeground)', maxWidth: '800px', margin: '0 auto', lineHeight: '1.6' }}>
          Un entorno de aprendizaje y desarrollo profesional diseñado para dominar las bases de datos relacionales más importantes del mundo, directamente desde VS Code, sin configuraciones complejas.
        </p>
      </header>

      <div className="purpose-section" style={{ 
        backgroundColor: 'rgba(0, 122, 204, 0.1)', 
        borderLeft: '4px solid var(--accent-primary, #007acc)',
        padding: '1.5rem', 
        borderRadius: '0 8px 8px 0',
        marginBottom: '3rem'
      }}>
        <h2 style={{ fontSize: '18px', marginBottom: '0.5rem', color: 'var(--accent-primary, #007acc)' }}>🎯 El Propósito</h2>
        <p style={{ lineHeight: '1.6' }}>
          La extensión orquesta contenedores Docker bajo el capó para entregarte motores limpios y listos para usar. Aprende mediante tutoriales gamificados, experimenta sin miedo a romper tu entorno local, y gestiona todo desde una única interfaz unificada.
        </p>
      </div>

      <section>
        <h2 style={{ fontSize: '24px', marginBottom: '1.5rem', borderBottom: '1px solid var(--vscode-widget-border)', paddingBottom: '0.5rem' }}>
          Paleta de Comandos Principales
        </h2>
        
        <div className="commands-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem'
        }}>
          {commands.map(cmd => (
            <div 
              key={cmd.id} 
              className={`command-card ${cmd.highlight ? 'highlight' : ''}`}
              onClick={() => onExecuteCommand(cmd.id)}
              style={{
                backgroundColor: 'var(--vscode-editorWidget-background)',
                border: `1px solid ${cmd.highlight ? 'var(--accent-primary, #007acc)' : 'var(--vscode-widget-border)'}`,
                borderRadius: '8px',
                padding: '1.5rem',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.2)';
                if (!cmd.highlight) e.currentTarget.style.borderColor = 'var(--vscode-focusBorder)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
                if (!cmd.highlight) e.currentTarget.style.borderColor = 'var(--vscode-widget-border)';
              }}
            >
              {cmd.highlight && (
                <div style={{
                  position: 'absolute', top: 0, right: 0, backgroundColor: 'var(--accent-primary, #007acc)', 
                  color: 'white', padding: '2px 12px', fontSize: '10px', fontWeight: 'bold', 
                  borderBottomLeftRadius: '8px', letterSpacing: '0.05em'
                }}>MÁS USADO</div>
              )}
              <div style={{ fontSize: '32px', marginBottom: '1rem' }}>{cmd.icon}</div>
              <h3 style={{ fontSize: '16px', marginBottom: '0.5rem', color: 'var(--vscode-editor-foreground)' }}>{cmd.title}</h3>
              <p style={{ fontSize: '13px', color: 'var(--vscode-descriptionForeground)', marginBottom: '1rem', lineHeight: '1.4' }}>
                {cmd.description}
              </p>
              <div style={{ 
                backgroundColor: 'var(--vscode-textBlockQuote-background)', 
                borderLeft: '2px solid var(--vscode-textBlockQuote-border)', 
                padding: '0.5rem', 
                fontSize: '12px', 
                fontStyle: 'italic',
                color: 'var(--vscode-textPreformat-foreground)'
              }}>
                <strong>Por qué usarlo:</strong> {cmd.why}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
