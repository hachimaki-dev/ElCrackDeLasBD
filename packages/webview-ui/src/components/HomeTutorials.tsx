import React, { useState, useEffect } from 'react';
import { getEnrichedContent } from '../data/enrichedTutorials';

interface TutorialModule {
  id: string;
  title: string;
  description: string;
  content?: string;
}

interface TutorialLevel {
  id: string;
  title: string;
  modules: TutorialModule[];
}

interface EngineData {
  id: string;
  displayName: string;
  completedModules: string[];
  xp: { ddl: number; dml: number; optimization: number; architecture: number };
}

interface HomeTutorialsProps {
  activeEngine: EngineData | null;
  tutorialsData: any;
  onExecuteCommand: (action: string, args?: any[]) => void;
}

export const HomeTutorials: React.FC<HomeTutorialsProps> = ({
  activeEngine,
  tutorialsData,
  onExecuteCommand,
}) => {
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);

  // Default backup mock content if the extension fails to read the JSON file
  const fallbackMockTutorials: TutorialLevel[] = [
    {
      id: 'nivel-1',
      title: 'Nivel 1: Fundamentos',
      modules: [
        { id: '1-1', title: 'Modelado Básico', description: 'Aprende a crear tablas y definir tipos de datos fundamentales.' },
        { id: '1-2', title: 'DDL Básico', description: 'Modifica y elimina estructuras con ALTER y DROP.' },
        { id: '1-3', title: 'DML Básico', description: 'Inserta, actualiza y consulta datos con INSERT, UPDATE, SELECT.' },
      ]
    },
    {
      id: 'nivel-2',
      title: 'Nivel 2: Consultas Avanzadas',
      modules: [
        { id: '2-1', title: 'Joins y Relaciones', description: 'Cruza datos entre múltiples tablas.' },
        { id: '2-2', title: 'Índices y Rendimiento', description: 'Acelera tus consultas usando índices correctos.' },
        { id: '2-3', title: 'Vistas y Permisos', description: 'Crea vistas y maneja accesos.' },
      ]
    },
    {
      id: 'nivel-3',
      title: 'Nivel 3: Experto',
      modules: [
        { id: '3-1', title: 'Triggers y Funciones', description: 'Automatiza acciones en la base de datos.' },
        { id: '3-2', title: 'Procedimientos Almacenados', description: 'Lógica de negocio directo en el motor.' },
        { id: '3-3', title: 'Características Exclusivas', description: 'Domina las herramientas únicas de este motor.' },
      ]
    }
  ];

  const levelsConfig = [
    { id: 'nivel-1', title: 'Nivel 1: Fundamentos', modulePrefix: '1-' },
    { id: 'nivel-2', title: 'Nivel 2: Consultas Avanzadas', modulePrefix: '2-' },
    { id: 'nivel-3', title: 'Nivel 3: Experto', modulePrefix: '3-' }
  ];

  // Resolve tutorial categories
  const activeTutorials: TutorialLevel[] = levelsConfig.map(lvl => {
    if (tutorialsData) {
      const modules = Object.keys(tutorialsData)
        .filter(key => key.startsWith(lvl.modulePrefix))
        .sort()
        .map(key => ({
          id: key,
          title: tutorialsData[key].title,
          description: tutorialsData[key].description,
          content: tutorialsData[key].content
        }));
      
      if (modules.length > 0) {
        return { id: lvl.id, title: lvl.title, modules };
      }
    }
    const fallbackLvl = fallbackMockTutorials.find(f => f.id === lvl.id);
    return fallbackLvl || { id: lvl.id, title: lvl.title, modules: [] };
  });

  const flatModuleOrder = activeTutorials.flatMap(level => level.modules.map(m => m.id));

  const activeModule = activeModuleId 
    ? activeTutorials.flatMap(lvl => lvl.modules).find(m => m.id === activeModuleId) 
    : null;

  const isModulePrerequisitesMet = (moduleId: string) => {
    if (!activeEngine) return moduleId === flatModuleOrder[0];
    const currentIndex = flatModuleOrder.indexOf(moduleId);
    if (currentIndex <= 0) return true; 

    const previousModuleId = flatModuleOrder[currentIndex - 1];
    return activeEngine.completedModules.includes(previousModuleId);
  };

  const isModuleCompleted = (moduleId: string) => {
    return activeEngine?.completedModules?.includes(moduleId) || false;
  };

  const completedCount = flatModuleOrder.filter(id => isModuleCompleted(id)).length;
  const progressPercentage = flatModuleOrder.length > 0 
    ? Math.round((completedCount / flatModuleOrder.length) * 100) 
    : 0;

  // Auto-select first uncompleted chapter
  useEffect(() => {
    if (flatModuleOrder.length > 0 && !activeModuleId) {
      const nextUncompleted = flatModuleOrder.find(id => !isModuleCompleted(id));
      if (nextUncompleted) {
        setActiveModuleId(nextUncompleted);
      } else {
        setActiveModuleId(flatModuleOrder[0]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEngine, flatModuleOrder, activeModuleId]);

  const handleStartTutorial = (moduleId: string) => {
    onExecuteCommand('sqlEngineLab.startTutorial', [moduleId]); // Resolved by extension
    // Focus or trigger sandbox workspace opening
    onExecuteCommand('sqlEngineLab.newSqlSheet');
  };

  const handleCompleteTutorial = (moduleId: string) => {
    onExecuteCommand('sqlEngineLab.completeTutorial', [moduleId]);
  };

  const hasPreviousChapter = () => {
    if (!activeModuleId) return false;
    const idx = flatModuleOrder.indexOf(activeModuleId);
    return idx > 0;
  };

  const hasNextChapter = () => {
    if (!activeModuleId) return false;
    const idx = flatModuleOrder.indexOf(activeModuleId);
    return idx >= 0 && idx < flatModuleOrder.length - 1;
  };

  const handlePreviousChapter = () => {
    if (!activeModuleId) return;
    const idx = flatModuleOrder.indexOf(activeModuleId);
    if (idx > 0) {
      setActiveModuleId(flatModuleOrder[idx - 1]);
    }
  };

  const handleNextChapter = () => {
    if (!activeModuleId) return;
    const idx = flatModuleOrder.indexOf(activeModuleId);
    if (idx >= 0 && idx < flatModuleOrder.length - 1) {
      setActiveModuleId(flatModuleOrder[idx + 1]);
    }
  };

  const enriched = activeModuleId && activeEngine 
    ? getEnrichedContent(activeEngine.id, activeModuleId) 
    : null;

  if (!activeEngine) {
    return (
      <div className="reader-empty">
        <span className="reader-empty-icon">⚠️</span>
        <h3>No hay motor activo</h3>
        <p>Inicia un motor desde el Dashboard primero para cargar sus tutoriales interactivos.</p>
      </div>
    );
  }

  return (
    <div className="book-container">
      {/* Sidebar - TOC */}
      <div className="book-sidebar">
        <div className="sidebar-progress-container">
          <div className="sidebar-progress-text">
            <span>Progreso del Motor</span>
            <span>{progressPercentage}%</span>
          </div>
          <div className="sidebar-progress-bar-bg">
            <div 
              className="sidebar-progress-bar-fill" 
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>

        <div className="sidebar-menu">
          {activeTutorials.map(level => (
            <div key={level.id} className="sidebar-level-block">
              <div className="sidebar-level-title">{level.title}</div>
              {level.modules.map(mod => {
                const prereqMet = isModulePrerequisitesMet(mod.id);
                const completed = isModuleCompleted(mod.id);
                const active = mod.id === activeModuleId;

                return (
                  <div 
                    key={mod.id} 
                    className={`sidebar-chapter-item ${active ? 'active' : ''} ${completed ? 'completed' : ''} ${!prereqMet && !completed ? 'locked' : ''}`}
                    onClick={() => {
                      if (prereqMet || completed) {
                        setActiveModuleId(mod.id);
                      }
                    }}
                  >
                    <span className={`chapter-status-icon ${completed ? 'completed' : !prereqMet ? 'locked' : ''}`}>
                      {completed ? '✓' : !prereqMet ? '🔒' : '○'}
                    </span>
                    <span className="sidebar-chapter-id">{mod.id}</span>
                    <span className="sidebar-chapter-title" title={mod.title}>
                      {mod.title}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Reader Body */}
      <div className="book-reader">
        {activeModule ? (
          <>
            <div className="reader-body">
              <div className="reader-content-limit">
                <div className="reader-path-badge">
                  {activeEngine.displayName} /{' '}
                  {activeModule.id.startsWith('1-') 
                    ? 'Nivel 1: Fundamentos' 
                    : activeModule.id.startsWith('2-') 
                      ? 'Nivel 2: Intermedio' 
                      : 'Nivel 3: Experto'}
                </div>

                <div className="reader-title-container">
                  <h2>Capítulo {activeModule.id}: {activeModule.title}</h2>
                </div>

                <p className="reader-description">{activeModule.description}</p>

                {/* Actions Card */}
                <div className={`reader-actions-card ${isModuleCompleted(activeModule.id) ? 'completed' : ''}`}>
                  <div className="reader-actions-info">
                    <span className="reader-actions-title">
                      {isModuleCompleted(activeModule.id) ? '✓ Capítulo Completado' : '▶ Desafío en Sandbox'}
                    </span>
                    <span className="reader-actions-desc">
                      {!isModulePrerequisitesMet(activeModule.id) && !isModuleCompleted(activeModule.id)
                        ? '🔒 Completa los capítulos anteriores para desbloquear este reto.'
                        : isModuleCompleted(activeModule.id) 
                          ? 'Ya has resuelto este desafío. Puedes seguir repasando los conceptos.'
                          : 'Abre el Sandbox para interactuar con la base de datos y resolver el reto.'}
                    </span>
                  </div>

                  <div className="reader-actions-buttons">
                    {isModulePrerequisitesMet(activeModule.id) && !isModuleCompleted(activeModule.id) && (
                      <>
                        <button 
                          className="btn primary"
                          onClick={() => handleStartTutorial(activeModule.id)}
                        >
                          🚀 Abrir Sandbox
                        </button>
                        <button 
                          className="btn success"
                          onClick={() => handleCompleteTutorial(activeModule.id)}
                        >
                          ✓ Marcar como Listo
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Theory Content */}
                <div className="book-chapter-theory">
                  {activeModule.content ? (
                    <div dangerouslySetInnerHTML={{ __html: activeModule.content }} />
                  ) : (
                    <div>
                      <p>
                        En este capítulo analizaremos las estructuras fundamentales necesarias para el diseño de bases de datos. 
                        Aprenderás la sintaxis estándar y las variaciones de rendimiento propias de este motor SQL.
                      </p>
                      {enriched?.lore_context && (
                        <p style={{ fontStyle: 'italic', color: 'var(--accent-purple)', padding: '10px 0' }}>
                          {enriched.lore_context}
                        </p>
                      )}
                      {enriched?.visual_analogy && (
                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderLeft: '3px solid var(--accent)', borderRadius: '4px', margin: '16px 0' }}>
                          <strong>Analogía Visual:</strong> {enriched.visual_analogy}
                        </div>
                      )}
                      {enriched?.technical_deep_dive && (
                        <div style={{ marginTop: '16px' }}>
                          <h4>Deep Dive Técnico</h4>
                          <p>{enriched.technical_deep_dive}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Enriched Cards Section */}
                {enriched && (
                  <div>
                    <span className="enriched-section-title">Información de Campo</span>
                    <div className="enriched-grid">
                      {enriched.consejos?.map((c, i) => (
                        <div key={`c-${i}`} className="enriched-card consejo">
                          <div className="enriched-card-header">
                            <span className="enriched-card-label">💡 Consejo</span>
                          </div>
                          <div className="enriched-card-body">{c}</div>
                        </div>
                      ))}
                      
                      {enriched.ideas?.map((c, i) => (
                        <div key={`id-${i}`} className="enriched-card idea">
                          <div className="enriched-card-header">
                            <span className="enriched-card-label">🧪 Experimento</span>
                          </div>
                          <div className="enriched-card-body">{c}</div>
                        </div>
                      ))}

                      {enriched.casosDeUso?.map((c, i) => (
                        <div key={`u-${i}`} className="enriched-card casouso">
                          <div className="enriched-card-header">
                            <span className="enriched-card-label">🔧 Caso de Uso</span>
                          </div>
                          <div className="enriched-card-body">{c}</div>
                        </div>
                      ))}

                      {enriched.casosReales?.map((c, i) => (
                        <div key={`r-${i}`} className="enriched-card casoreal">
                          <div className="enriched-card-header">
                            <span className="enriched-card-label">💥 Lección de Producción</span>
                          </div>
                          <div className="enriched-card-body">{c}</div>
                        </div>
                      ))}

                      {enriched.noticias?.map((c, i) => (
                        <div key={`n-${i}`} className="enriched-card noticia">
                          <div className="enriched-card-header">
                            <span className="enriched-card-label">📰 Novedades</span>
                          </div>
                          <div className="enriched-card-body">{c}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Navigation */}
            <div className="reader-footer-nav">
              <button 
                className="reader-footer-nav-btn"
                disabled={!hasPreviousChapter()}
                onClick={handlePreviousChapter}
              >
                ◀ Capítulo Anterior
              </button>
              <button 
                className="reader-footer-nav-btn"
                disabled={!hasNextChapter()}
                onClick={handleNextChapter}
              >
                Capítulo Siguiente ▶
              </button>
            </div>
          </>
        ) : (
          <div className="reader-empty">
            <span className="reader-empty-icon">📖</span>
            <h3>No hay capítulo seleccionado</h3>
            <p>Selecciona un capítulo de la barra lateral para empezar a estudiar.</p>
          </div>
        )}
      </div>
    </div>
  );
};
