import React from 'react';

interface SheetsProps {
  onExecuteCommand: (action: string, args?: any[]) => void;
}

export const HomeSheets: React.FC<SheetsProps> = ({ onExecuteCommand }) => {
  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">Hojas de Trabajo SQL</h2>
        <p className="section-desc">
          Crea y administra hojas de código SQL (.sql). Estas hojas se ejecutan automáticamente sobre el motor que tengas activo en ese momento.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '600px', margin: '0 auto', textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: '64px' }}>📄✍️</div>
        <div>
          <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>Editor Interactivo Local</h3>
          <p style={{ color: 'var(--text-muted)', lineHeight: '1.6', fontSize: '14px' }}>
            Las hojas de trabajo SQL son archivos temporales de VS Code que te permiten redactar sentencias DDL, DML o queries avanzadas. La extensión detecta el dialecto del motor seleccionado y te proporciona sugerencias.
          </p>
        </div>

        <button
          className="btn"
          style={{
            alignSelf: 'center',
            fontSize: '14px',
            padding: '12px 28px',
            background: 'var(--accent-secondary)',
            borderColor: 'rgba(14, 165, 233, 0.4)',
            color: 'var(--text-main)',
            boxShadow: '0 4px 16px rgba(14, 165, 233, 0.2)'
          }}
          onClick={() => onExecuteCommand('sqlEngineLab.newSqlSheet')}
        >
          🚀 Crear Nueva Hoja SQL
        </button>

        <div style={{ textAlign: 'left', marginTop: '32px', padding: '20px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: 'var(--radius-lg)' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>📚 Consejos Rápidos del Editor</h4>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.8' }}>
            <li>Usa <kbd style={{ background: '#222', padding: '2px 6px', borderRadius: '4px', border: '1px solid #44', fontFamily: 'var(--vscode-font-mono)' }}>Ctrl + Enter</kbd> (o Cmd + Enter en Mac) para ejecutar la línea o selección actual.</li>
            <li>El motor activo se muestra siempre en la barra de estado inferior de tu VS Code.</li>
            <li>Todo el historial de ejecución se registra localmente para que no pierdas ningún script.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
