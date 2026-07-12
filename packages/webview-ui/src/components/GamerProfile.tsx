import React from 'react';

interface XPBreakdown {
  ddl: number;
  dml: number;
  optimization: number;
  architecture: number;
}

interface EngineProgress {
  completedModules: string[];
  xp: XPBreakdown;
  level: number;
  badges: string[];
  streak: number;
  lastActiveDate?: string;
}

interface GamerProfileProps {
  engineId: string;
  engineName: string;
  progress?: EngineProgress;
}

export const GamerProfile: React.FC<GamerProfileProps> = ({ engineName, progress }) => {
  if (!progress) {
    return (
      <div className="panel" style={{ textAlign: 'center', padding: '40px' }}>
        <h2 style={{ color: 'var(--text-muted)' }}>Cargando perfil de {engineName}...</h2>
      </div>
    );
  }

  const totalXP = progress.xp.ddl + progress.xp.dml + progress.xp.optimization + progress.xp.architecture;
  const xpForNextLevel = progress.level * 1000;
  const xpProgressPercent = Math.min(100, Math.round((totalXP / xpForNextLevel) * 100));

  const badgesLib: Record<string, { title: string; icon: string; desc: string }> = {
    'guardian_acid': { title: 'Guardián ACID', icon: '🛡️', desc: 'Maestría en control de transacciones y aislamiento.' },
    'maestro_optimizador': { title: 'Maestro del Optimizador', icon: '⚡', desc: 'Especialista en índices y planes de ejecución.' },
    'arquitecto_estricto': { title: 'Arquitecto Estricto', icon: '🧩', desc: 'Dominio de restricciones y modelado de datos.' },
  };

  return (
    <div className="gamer-profile-container" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      
      {/* Encabezado del Perfil */}
      <div className="profile-header" style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px', background: 'var(--background-secondary)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
        <div className="profile-avatar" style={{ fontSize: '48px', background: 'var(--background-modifier-hover)', borderRadius: '50%', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          🐱‍💻
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: '0 0 5px 0', color: 'var(--text-bright)' }}>Operativo SQL</h2>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>Especialización: {engineName}</p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--accent-primary)' }}>Lvl {progress.level}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Racha: 🔥 {progress.streak} días</div>
        </div>
      </div>

      {/* Barra de Experiencia Global */}
      <div style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600 }}>Experiencia Total</span>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{totalXP} / {xpForNextLevel} XP</span>
        </div>
        <div style={{ height: '8px', background: 'var(--background-modifier-hover)', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${xpProgressPercent}%`, background: 'var(--accent-primary)', transition: 'width 0.5s ease-out' }} />
        </div>
      </div>

      {/* Desglose de XP por Disciplinas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '40px' }}>
        <div className="panel" style={{ padding: '15px' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: 'var(--accent-cyan)' }}>🧱 DDL (Data Definition)</h3>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{progress.xp.ddl} <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>XP</span></div>
        </div>
        <div className="panel" style={{ padding: '15px' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: 'var(--accent-secondary)' }}>📝 DML (Data Manipulation)</h3>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{progress.xp.dml} <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>XP</span></div>
        </div>
        <div className="panel" style={{ padding: '15px' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: 'var(--accent-amber)' }}>⚡ Optimización</h3>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{progress.xp.optimization} <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>XP</span></div>
        </div>
        <div className="panel" style={{ padding: '15px' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: 'var(--accent-danger)' }}>🏗️ Arquitectura & Seg.</h3>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{progress.xp.architecture} <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>XP</span></div>
        </div>
      </div>

      {/* Emblemas / Logros */}
      <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '20px' }}>Vitrina de Emblemas</h3>
      
      {progress.badges.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Aún no has desbloqueado ningún emblema. ¡Sigue completando retos avanzados!</p>
      ) : (
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          {progress.badges.map(b => {
            const badgeInfo = badgesLib[b] || { title: b, icon: '🏅', desc: 'Emblema especial' };
            return (
              <div key={b} className="panel" style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', flex: '1 1 300px' }}>
                <div style={{ fontSize: '32px' }}>{badgeInfo.icon}</div>
                <div>
                  <div style={{ fontWeight: 'bold', color: 'var(--text-bright)' }}>{badgeInfo.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{badgeInfo.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
