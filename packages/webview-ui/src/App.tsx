import { useState, useEffect } from 'react';
import { getEnrichedContent } from './data/enrichedTutorials';
import { GamerProfile } from './components/GamerProfile';

// Tipos base
interface EngineState {
  id: string;
  displayName: string;
  status: 'running' | 'stopped' | 'error' | 'loading' | 'starting';
  connectionCommand?: string;
  port?: number;
  engineProgress?: {
    completedModules: string[];
    xp: { ddl: number; dml: number; optimization: number; architecture: number };
    level: number;
    badges: string[];
    streak: number;
  };
}

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

function App() {
  const [engine, setEngine] = useState<EngineState | null>(null);
  const [tutorialsData, setTutorialsData] = useState<any>(null);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'motores' | 'tutoriales' | 'perfil'>('motores');

  // Datos mock de respaldo si no se ha sincronizado la extensión
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

  // Esquema de niveles a renderizar
  const levelsConfig = [
    { id: 'nivel-1', title: 'Nivel 1: Fundamentos', modulePrefix: '1-' },
    { id: 'nivel-2', title: 'Nivel 2: Consultas Avanzadas', modulePrefix: '2-' },
    { id: 'nivel-3', title: 'Nivel 3: Experto', modulePrefix: '3-' }
  ];

  // Agrupar y resolver los tutoriales activos
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

    // Usar datos mock fallback si la extensión no cargó el JSON
    const fallbackLvl = fallbackMockTutorials.find(f => f.id === lvl.id);
    return fallbackLvl || { id: lvl.id, title: lvl.title, modules: [] };
  });

  // Lista aplanada de IDs ordenados
  const flatModuleOrder = activeTutorials.flatMap(level => level.modules.map(m => m.id));

  // Encontrar módulo activo
  const activeModule = activeModuleId 
    ? activeTutorials.flatMap(lvl => lvl.modules).find(m => m.id === activeModuleId) 
    : null;

  // Verificar si tiene los prerrequisitos (los capítulos anteriores deben estar completos)
  const isModulePrerequisitesMet = (moduleId: string) => {
    if (!engine || !engine.engineProgress) return moduleId === flatModuleOrder[0];

    const currentIndex = flatModuleOrder.indexOf(moduleId);
    if (currentIndex <= 0) return true; // El primero siempre está libre

    const previousModuleId = flatModuleOrder[currentIndex - 1];
    return engine.engineProgress.completedModules.includes(previousModuleId);
  };

  const isModuleCompleted = (moduleId: string) => {
    return engine?.engineProgress?.completedModules?.includes(moduleId) || false;
  };

  // Calcular porcentaje de progreso
  const completedCount = flatModuleOrder.filter(id => isModuleCompleted(id)).length;
  const progressPercentage = flatModuleOrder.length > 0 
    ? Math.round((completedCount / flatModuleOrder.length) * 100) 
    : 0;

  // Auto-seleccionar primer capítulo no completado al iniciar o cambiar de motor
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
  }, [engine, flatModuleOrder]);

  // Escuchar mensajes de la extensión VS Code
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.command === 'updateState') {
        setEngine(message.engine);
        if (message.tutorials) {
          setTutorialsData(message.tutorials);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleStartTutorial = (moduleId: string) => {
    // @ts-ignore - vscode api is injected
    if (typeof acquireVsCodeApi !== 'undefined') {
      // @ts-ignore
      const vscode = acquireVsCodeApi();
      vscode.postMessage({
        command: 'startTutorial',
        moduleId: moduleId
      });
    } else {
      console.log('Start tutorial:', moduleId);
    }
  };

  const handleCompleteTutorial = (moduleId: string) => {
    // @ts-ignore
    if (typeof acquireVsCodeApi !== 'undefined') {
      // @ts-ignore
      const vscode = acquireVsCodeApi();
      vscode.postMessage({
        command: 'completeTutorial',
        moduleId: moduleId
      });
    } else {
      console.log('Complete tutorial:', moduleId);
    }
  };

  // Ayudantes de navegación rápida (Paginación de libro)
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

  // Recuperar contenido enriquecido para el capítulo activo
  const enriched = activeModuleId && engine 
    ? getEnrichedContent(engine.id, activeModuleId) 
    : null;

  return (
    <div className="hachimaki-dashboard">
      <div className="header-title">
        <h1>SQL Engine <span>Lab</span></h1>
        
        <div className="tabs-container">
          <div
            className={`tab ${activeTab === 'motores' ? 'active' : ''}`}
            onClick={() => setActiveTab('motores')}
          >
            Mis Motores
          </div>
          <div
            className={`tab ${activeTab === 'tutoriales' ? 'active' : ''}`}
            onClick={() => setActiveTab('tutoriales')}
          >
            Tutoriales
          </div>
          <div
            className={`tab ${activeTab === 'perfil' ? 'active' : ''}`}
            onClick={() => setActiveTab('perfil')}
          >
            Perfil Operativo
          </div>
        </div>
      </div>

      {activeTab === 'motores' && (
        <div className="engines-view-container">
          <div className="panel">
            <h2>Estado del Motor Activo</h2>
            {engine ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <p style={{ margin: 0 }}>
                  Motor actual: <strong style={{ color: 'var(--accent-secondary)' }}>{engine.displayName}</strong>
                </p>
                <p style={{ margin: 0 }}>
                  Estado: <span style={{ 
                    color: engine.status === 'running' ? 'var(--accent-primary)' : 'var(--accent-amber)',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    fontSize: '12px',
                    letterSpacing: '0.05em'
                  }}>{engine.status}</span>
                </p>
                {engine.port && (
                  <p style={{ margin: 0 }}>
                    Puerto asignado: <code style={{ fontFamily: 'var(--vscode-font-mono)', color: 'var(--accent-secondary)' }}>{engine.port}</code>
                  </p>
                )}
                {engine.connectionCommand && (
                  <div style={{ marginTop: '12px' }}>
                    <p style={{ margin: '0 0 6px 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                      Comando de conexión (Terminal):
                    </p>
                    <div className="code-preview-box">
                      <div className="code-preview-header">
                        <span>BASH / SH</span>
                        <button 
                          className="btn" 
                          style={{ padding: '2px 8px', fontSize: '10px' }}
                          onClick={() => {
                            // @ts-ignore
                            if (typeof acquireVsCodeApi !== 'undefined') {
                              // @ts-ignore
                              const vscode = acquireVsCodeApi();
                              vscode.postMessage({ command: 'copy', text: engine.connectionCommand });
                            }
                          }}
                        >
                          Copiar Comando
                        </button>
                      </div>
                      <pre className="code-preview-body">{engine.connectionCommand}</pre>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                No hay información del motor disponible. Esperando conexión de la extensión VS Code...
              </p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'tutoriales' && (
        <div className="book-container">
          {/* Sidebar - Índice de contenidos */}
          <div className="book-sidebar">
            <div className="sidebar-progress-container">
              <div className="sidebar-progress-text">
                <span>Tu Progreso</span>
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
                        className={`sidebar-chapter-item ${active ? 'active' : ''} ${completed ? 'completed' : ''}`}
                        onClick={() => setActiveModuleId(mod.id)}
                      >
                        <span className={`chapter-status-icon ${completed ? 'completed' : !prereqMet ? 'locked' : ''}`}>
                          {completed ? '✓' : !prereqMet ? '⚠️' : '○'}
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

          {/* Lector de capítulos */}
          <div className="book-reader">
            {activeModule ? (
              <>
                <div className="reader-body">
                  <div className="reader-content-limit">
                    <div className="reader-path-badge">
                      {engine?.displayName || 'MOTOR'} /{' '}
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

                    {/* Tarjeta de acción */}
                    <div className={`reader-actions-card ${isModuleCompleted(activeModule.id) ? 'completed' : ''}`}>
                      <div className="reader-actions-info">
                        <span className="reader-actions-title">
                          {isModuleCompleted(activeModule.id) ? '✓ Capítulo Completado' : '▶ Desafío en Sandbox'}
                        </span>
                        <span className="reader-actions-desc">
                          {!isModulePrerequisitesMet(activeModule.id) && !isModuleCompleted(activeModule.id)
                            ? '⚠️ Atención: Se recomienda completar los capítulos anteriores antes de intentar este reto para entender el contexto.'
                            : isModuleCompleted(activeModule.id) 
                              ? 'Ya has resuelto este desafío. Puedes volver a abrirlo en tu editor para repasar.'
                              : 'Abre la hoja SQL para interactuar con la base de datos y resolver el reto propuesto.'}
                        </span>
                      </div>
                      
                      <div className="reader-actions-buttons">
                        <button
                          className="btn primary"
                          onClick={() => handleStartTutorial(activeModule.id)}
                        >
                          {isModuleCompleted(activeModule.id) ? '↻ Repasar Sandbox' : '▶ Abrir Sandbox'}
                        </button>

                        {!isModuleCompleted(activeModule.id) && (
                          <button
                            className="btn success"
                            onClick={() => handleCompleteTutorial(activeModule.id)}
                          >
                            ✓ Completar Reto
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Código SQL de la lección */}
                    {activeModule.content && (
                      <div style={{ marginTop: '28px' }}>
                        <h3 style={{ 
                          fontSize: '12px', 
                          fontFamily: 'var(--vscode-font-mono)', 
                          color: 'var(--text-muted)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          margin: '0 0 10px 0'
                        }}>
                          Plantilla SQL del Reto
                        </h3>
                        <div className="code-preview-box">
                          <div className="code-preview-header">
                            <span>{engine?.id?.toUpperCase() || 'SQL'} EDITOR CODE</span>
                          </div>
                          <pre className="code-preview-body" style={{ maxHeight: '180px', overflowY: 'auto' }}>
                            {activeModule.content}
                          </pre>
                        </div>
                      </div>
                    )}

                    {/* Gamificación y Narrativa (UDL) */}
                    {enriched && (
                      <div className="lore-section" style={{ marginTop: '30px', marginBottom: '20px' }}>
                        {enriched.lore_context && (
                          <div className="enriched-card" style={{ borderLeftColor: 'var(--accent-primary)', backgroundColor: 'rgba(57, 255, 20, 0.03)' }}>
                            <div className="enriched-card-header">
                              <span className="enriched-card-label" style={{ color: 'var(--accent-primary)' }}>🕵️ Misión Clasificada</span>
                            </div>
                            <div className="enriched-card-body" style={{ fontStyle: 'italic', fontSize: '14px', lineHeight: '1.6' }}>
                              {enriched.lore_context}
                            </div>
                          </div>
                        )}
                        
                        <div style={{ display: 'flex', gap: '15px', marginTop: '15px', flexWrap: 'wrap' }}>
                          {enriched.technical_deep_dive && (
                            <div className="enriched-card" style={{ flex: '1 1 300px', borderLeftColor: 'var(--accent-cyan)' }}>
                              <div className="enriched-card-header">
                                <span className="enriched-card-label" style={{ color: 'var(--accent-cyan)' }}>🔬 Deep Dive Técnico (Nivel DBA)</span>
                              </div>
                              <div className="enriched-card-body">
                                {enriched.technical_deep_dive}
                              </div>
                            </div>
                          )}

                          {enriched.visual_analogy && (
                            <div className="enriched-card" style={{ flex: '1 1 300px', borderLeftColor: 'var(--accent-amber)' }}>
                              <div className="enriched-card-header">
                                <span className="enriched-card-label" style={{ color: 'var(--accent-amber)' }}>🧠 Analogía Visual (UDL)</span>
                              </div>
                              <div className="enriched-card-body">
                                {enriched.visual_analogy}
                              </div>
                            </div>
                          )}
                        </div>

                        {enriched.interactive_challenge && (
                          <div className="enriched-card" style={{ marginTop: '15px', borderLeftColor: 'var(--accent-danger)' }}>
                            <div className="enriched-card-header">
                              <span className="enriched-card-label" style={{ color: 'var(--accent-danger)' }}>⚔️ Desafío Interactivo (Octalysis)</span>
                            </div>
                            <div className="enriched-card-body" style={{ fontWeight: '500', color: 'var(--text-bright)' }}>
                              {enriched.interactive_challenge}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Apuntes y casos de estudio enriquecidos */}
                    {enriched && (
                      <>
                        <div className="enriched-section-title">
                          <span>Apuntes de Ingeniería y Casos de Estudio</span>
                        </div>
                        
                        <div className="enriched-grid">
                          {enriched.consejos.map((cons, i) => (
                            <div key={`cons-${i}`} className="enriched-card consejo">
                              <div className="enriched-card-header">
                                <span className="enriched-card-label">💡 Consejo Profesional</span>
                              </div>
                              <div className="enriched-card-body">{cons}</div>
                            </div>
                          ))}

                          {enriched.ideas.map((idea, i) => (
                            <div key={`idea-${i}`} className="enriched-card idea">
                              <div className="enriched-card-header">
                                <span className="enriched-card-label">🧠 Reto Extra para Probar</span>
                              </div>
                              <div className="enriched-card-body">{idea}</div>
                            </div>
                          ))}

                          {enriched.casosDeUso.map((uso, i) => (
                            <div key={`uso-${i}`} className="enriched-card casouso">
                              <div className="enriched-card-header">
                                <span className="enriched-card-label">🚀 Caso de Uso Práctico</span>
                              </div>
                              <div className="enriched-card-body">{uso}</div>
                            </div>
                          ))}

                          {enriched.casosReales.map((real, i) => (
                            <div key={`real-${i}`} className="enriched-card casoreal">
                              <div className="enriched-card-header">
                                <span className="enriched-card-label">⚠️ Incidente Real de Producción</span>
                              </div>
                              <div className="enriched-card-body">{real}</div>
                            </div>
                          ))}

                          {enriched.noticias.map((not, i) => (
                            <div key={`not-${i}`} className="enriched-card noticia">
                              <div className="enriched-card-header">
                                <span className="enriched-card-label">📰 Bitácora e Historia</span>
                              </div>
                              <div className="enriched-card-body">{not}</div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Paginación del libro */}
                <div className="reader-footer-nav">
                  <button
                    className="reader-footer-nav-btn"
                    disabled={!hasPreviousChapter()}
                    onClick={handlePreviousChapter}
                  >
                    ← Capítulo Anterior
                  </button>

                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--vscode-font-mono)' }}>
                    Capítulo {flatModuleOrder.indexOf(activeModule.id) + 1} de {flatModuleOrder.length}
                  </span>

                  <button
                    className="reader-footer-nav-btn"
                    disabled={!hasNextChapter()}
                    onClick={handleNextChapter}
                  >
                    Siguiente Capítulo →
                  </button>
                </div>
              </>
            ) : (
              <div className="reader-empty">
                <span className="reader-empty-icon">📖</span>
                <span>Selecciona un capítulo de la barra lateral para iniciar tu lección técnica.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'perfil' && engine && (
        <GamerProfile 
          engineId={engine.id} 
          engineName={engine.displayName} 
          progress={engine.engineProgress} 
        />
      )}
    </div>
  );
}

export default App;
