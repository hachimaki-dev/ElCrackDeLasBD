import React from 'react';

interface SettingsProps {
  onExecuteCommand: (action: string, args?: any[]) => void;
}

export const HomeSettings: React.FC<SettingsProps> = ({ onExecuteCommand }) => {
  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '6px' }}>Ajustes y Diagnósticos</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '12.5px', margin: 0 }}>
          Configura las credenciales maestras y realiza pruebas de diagnóstico de la infraestructura Docker.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '600px' }}>
        
        {/* Password settings */}
        <div className="dashboard-panel">
          <h3 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 600 }}>Contraseña Maestra</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '12.5px', margin: '0 0 16px 0', lineHeight: '1.5' }}>
            Establece la contraseña maestra que utilizarán por defecto los motores de base de datos creados en los contenedores.
          </p>
          <button
            className="btn primary"
            onClick={() => onExecuteCommand('sqlEngineLab.configureCredentials')}
          >
            🔑 Cambiar Contraseña Maestra
          </button>
        </div>

        {/* Diagnostics Doctor */}
        <div className="dashboard-panel">
          <h3 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 600 }}>Doctor de Diagnósticos</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '12.5px', margin: '0 0 16px 0', lineHeight: '1.5' }}>
            ¿Tienes problemas de conectividad con Docker o conflictos de red? Ejecuta un chequeo del socket, permisos y daemon. Los resultados se imprimirán en el canal de Salida de tu editor.
          </p>
          <button
            className="btn accent-purple-btn"
            onClick={() => onExecuteCommand('sqlEngineLab.showDiagnostics')}
          >
            🩺 Ejecutar Diagnóstico de Docker
          </button>
        </div>

      </div>
    </div>
  );
};
