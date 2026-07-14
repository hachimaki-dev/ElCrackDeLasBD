import React from 'react';

interface SheetsProps {
  onExecuteCommand: (action: string, args?: any[]) => void;
}

export const HomeSheets: React.FC<SheetsProps> = ({ onExecuteCommand }) => {
  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '6px' }}>Hojas de Trabajo SQL</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '12.5px', margin: 0 }}>
          Crea y administra hojas de código SQL (.sql). Estas hojas se ejecutan automáticamente sobre el motor que tengas activo en ese momento.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '600px', margin: '0 auto', textAlign: 'center', padding: '30px 10px' }}>
        <div style={{ fontSize: '50px', marginBottom: '8px' }}>📄</div>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>Editor Interactivo Local</h3>
          <p style={{ color: 'var(--text-muted)', lineHeight: '1.6', fontSize: '13px', margin: '0 0 20px 0' }}>
            Las hojas de trabajo SQL son archivos temporales de VS Code que te permiten redactar sentencias DDL, DML o queries avanzadas. La extensión detecta el dialecto del motor seleccionado y te proporciona sugerencias.
          </p>
        </div>

        <button
          className="btn primary"
          style={{
            alignSelf: 'center',
            fontSize: '13px',
            padding: '8px 24px',
            boxShadow: '0 4px 12px rgba(14, 165, 233, 0.15)'
          }}
          onClick={() => onExecuteCommand('sqlEngineLab.newSqlSheet')}
        >
          🚀 Crear Nueva Hoja SQL
        </button>

        <div className="dashboard-panel" style={{ textAlign: 'left', marginTop: '24px' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
            📚 Consejos Rápidos del Editor
          </h4>
          <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: '1.8' }}>
            <li>Usa <kbd>Ctrl + Enter</kbd> (o <kbd>Cmd + Enter</kbd> en Mac) para ejecutar la línea o selección actual.</li>
            <li>El motor activo se muestra siempre en la barra de estado inferior de tu VS Code.</li>
            <li>Todo el historial de ejecución se registra localmente para que no pierdas ningún script.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
