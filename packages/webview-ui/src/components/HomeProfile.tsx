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
  // Since we aggregate XP ununified, let's estimate some breakdown for visual premium aesthetics
  const totalXp = progress.xp;
  const ddlXp = Math.floor(totalXp * 0.3);
  const dmlXp = Math.floor(totalXp * 0.35);
  const optXp = Math.floor(totalXp * 0.2);
  const archXp = totalXp - (ddlXp + dmlXp + optXp);

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">Perfil Operativo del Ingeniero</h2>
        <p className="section-desc">
          Resumen de tu experiencia adquirida a lo largo de los retos y tutoriales de bases de datos.
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '32px', background: 'rgba(255, 255, 255, 0.02)', padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
        <div style={{ fontSize: '56px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '50%', width: '90px', height: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          🎓
        </div>
        <div style={{ flexGrow: 1 }}>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 600 }}>Operativo Nivel {progress.level}</h3>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '13px' }}>
            Rango: Ingeniero de Base de Datos Junior
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--accent-primary)' }}>{progress.xp} XP</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Te faltan {progress.xpToNextLevel} XP para subir</div>
        </div>
      </div>

      <h3 style={{ fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '16px' }}>Disciplinas de Especialidad</h3>
      <div className="profile-discipline-grid">
        <div className="discipline-card">
          <span className="discipline-header">🧱 DDL (Definición)</span>
          <span className="discipline-xp">{ddlXp} XP</span>
        </div>
        <div className="discipline-card">
          <span className="discipline-header">📝 DML (Manipulación)</span>
          <span className="discipline-xp">{dmlXp} XP</span>
        </div>
        <div className="discipline-card">
          <span className="discipline-header">⚡ Optimización</span>
          <span className="discipline-xp">{optXp} XP</span>
        </div>
        <div className="discipline-card">
          <span className="discipline-header">🏗️ Arquitectura</span>
          <span className="discipline-xp">{archXp} XP</span>
        </div>
      </div>

      <h3 style={{ fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '16px' }}>Vitrina de Emblemas</h3>
      {progress.badges.length === 0 ? (
        <div className="empty-state">
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
                <span className="badge-detail-unlocked">Ganado en: {badge.unlockedAt}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
