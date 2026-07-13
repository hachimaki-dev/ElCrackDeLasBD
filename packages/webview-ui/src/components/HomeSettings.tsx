import React from 'react';

interface SettingsProps {
  onExecuteCommand: (action: string, args?: any[]) => void;
}

export const HomeSettings: React.FC<SettingsProps> = ({ onExecuteCommand }) => {
  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">Ajustes y Diagnósticos</h2>
        <p className="section-desc">
          Configura las contraseñas de las bases de datos o realiza análisis de diagnóstico para verificar el estado de Docker.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '600px' }}>
        
        {/* Password settings */}
        <div className="widget-card">
          <h3 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: 600 }}>Contraseña Maestra</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '0 0 16px 0', lineHeight: '1.5' }}>
            Establece la contraseña por defecto que utilizarán los motores de base de datos creados en los contenedores. Por defecto es <code>labpassword</code>.
          </p>
          <button
            className="btn"
            style={{ background: 'rgba(14, 165, 233, 0.15)', borderColor: 'rgba(14, 165, 233, 0.3)', color: 'var(--accent-secondary)' }}
            onClick={() => onExecuteCommand('sqlEngineLab.configureCredentials')}
          >
            🔑 Cambiar Contraseña Maestra
          </button>
        </div>

        {/* Diagnostics Doctor */}
        <div className="widget-card">
          <h3 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: 600 }}>Doctor de Diagnósticos</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '0 0 16px 0', lineHeight: '1.5' }}>
            ¿Tienes problemas para conectar los motores con Docker? Ejecuta un chequeo completo de requerimientos, permisos y estados del daemon. El informe se imprimirá en el panel de Salida de VS Code.
          </p>
          <button
            className="btn"
            style={{ background: 'rgba(139, 92, 246, 0.15)', borderColor: 'rgba(139, 92, 246, 0.3)', color: '#a78bfa' }}
            onClick={() => onExecuteCommand('sqlEngineLab.showDiagnostics')}
          >
            🩺 Ejecutar Diagnóstico de Docker
          </button>
        </div>

      </div>
    </div>
  );
};
