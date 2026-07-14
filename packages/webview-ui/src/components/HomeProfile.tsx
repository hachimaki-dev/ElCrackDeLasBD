import React from 'react';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: string;
}

interface ProfileProps {
  progress: {
    xp: number;
    level: number;
    xpToNextLevel: number;
    badges: Badge[];
  };
}

export const HomeProfile: React.FC<ProfileProps> = ({ progress }) => {
  // Breakdown total XP into disciplines for aesthetic showcase
  const totalXp = progress.xp;
  const ddlXp = Math.floor(totalXp * 0.3);
  const dmlXp = Math.floor(totalXp * 0.35);
  const optXp = Math.floor(totalXp * 0.2);
  const archXp = totalXp - (ddlXp + dmlXp + optXp);

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '6px' }}>Perfil Operativo del Ingeniero</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '12.5px', margin: 0 }}>
          Resumen de tu experiencia adquirida a lo largo de los retos y tutoriales de bases de datos.
        </p>
      </div>

      {/* Profile Hero Section */}
      <div className="profile-hero">
        <div className="profile-avatar-circle">👨‍💻</div>
        <div className="profile-meta-main">
          <h3 className="profile-meta-title">Operativo SQL</h3>
          <span className="profile-meta-rank">Rango: Ingeniero de Base de Datos Junior (Lvl {progress.level})</span>
        </div>
        <div className="profile-xp-summary">
          <span className="profile-xp-big">{progress.xp} XP</span>
          <div className="profile-xp-sub">Faltan {progress.xpToNextLevel} XP para el siguiente nivel</div>
        </div>
      </div>

      {/* Disciplines Section */}
      <h3 style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '14px' }}>
        Disciplinas de Especialidad
      </h3>
      <div className="profile-discipline-grid">
        <div className="discipline-card">
          <span className="discipline-header">🧱 DDL (Definición)</span>
          <span className="discipline-xp" style={{ color: 'var(--accent-amber)' }}>{ddlXp} XP</span>
        </div>
        <div className="discipline-card">
          <span className="discipline-header">📝 DML (Manipulación)</span>
          <span className="discipline-xp" style={{ color: 'var(--accent-secondary)' }}>{dmlXp} XP</span>
        </div>
        <div className="discipline-card">
          <span className="discipline-header">⚡ Optimización</span>
          <span className="discipline-xp" style={{ color: 'var(--accent-emerald)' }}>{optXp} XP</span>
        </div>
        <div className="discipline-card">
          <span className="discipline-header">🏗️ Arquitectura</span>
          <span className="discipline-xp" style={{ color: 'var(--accent-purple)' }}>{archXp} XP</span>
        </div>
      </div>

      {/* Badges Showcase */}
      <h3 style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '14px' }}>
        Vitrina de Emblemas
      </h3>
      {progress.badges.length === 0 ? (
        <div className="dashboard-panel" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
          Aún no has desbloqueado ningún emblema. ¡Completa los módulos avanzados de los tutoriales de los motores SQL para ganarlos!
        </div>
      ) : (
        <div className="badge-showcase-grid">
          {progress.badges.map((badge) => (
            <div key={badge.id} className="badge-detail-card">
              <div className="badge-detail-icon">{badge.icon}</div>
              <div className="badge-detail-info">
                <span className="badge-detail-name">{badge.name}</span>
                <span className="badge-detail-desc">{badge.description}</span>
                <span className="badge-detail-unlocked">Unidad: {badge.unlockedAt}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
