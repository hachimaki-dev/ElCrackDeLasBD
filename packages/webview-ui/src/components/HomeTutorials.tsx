import React, { useState, useEffect } from 'react';

interface TutorialModule {
  id: string;
  title: string;
  description: string;
  content?: string;
  learning_objective?: string;
  prerequisites?: string;
  concept?: string;
  hints?: string[];
  solution?: string;
  expected_output?: string;
  common_pitfalls?: string[];
  real_world_purpose?: string;
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

interface RecentActivityEvent {
  id: string;
  message: string;
  xp?: string;
  time: string;
}

export const HomeTutorials: React.FC<HomeTutorialsProps> = ({
  activeEngine,
  tutorialsData,
  onExecuteCommand,
}) => {
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'content' | 'example' | 'deepdive' | 'notes' | 'resources'>('content');
  const [isVerifying, setIsVerifying] = useState(false);
  const [validationReport, setValidationReport] = useState<any>(null);
  const [revealedSolution, setRevealedSolution] = useState(false);
  const [activeHintIndex, setActiveHintIndex] = useState<number>(-1);
  const [bookmarkedChapters, setBookmarkedChapters] = useState<string[]>([]);
  
  // Actividad Reciente Dinámica
  const [activities, setActivities] = useState<RecentActivityEvent[]>([
    { id: '1', message: 'Completaste: 1-0 Introducción a los Datos', xp: '+50 XP', time: 'Hace 2 días' },
    { id: '2', message: 'Te conectaste al motor actual', time: 'Hace 23 horas' },
    { id: '3', message: 'Abriste el Sandbox de Prácticas', time: 'Hace 1 día' }
  ]);

  // Consejos del DBA
  const dbaTips = [
    "Usa bind variables en tus consultas para mejorar rendimiento y seguridad contra inyección SQL.",
    "Nunca ejecutes un UPDATE o DELETE sin WHERE en bases de datos de producción. Usa transacciones explícitas.",
    "El índice B-Tree es ideal para búsquedas de igualdad y rangos, pero inútil para búsquedas LIKE con comodines al inicio ('%patrón%').",
    "Monitorea constantemente la fragmentación de tus índices en tablas de alta transaccionalidad.",
    "Configura siempre alertas de espacio en disco; un llenado repentino del WAL puede paralizar tu motor.",
    "Las restricciones CHECK y UNIQUE directas en la base de datos son la única garantía real de consistencia de datos."
  ];
  const [currentTip, setCurrentTip] = useState(dbaTips[0]);

  // Rotar el consejo del día
  useEffect(() => {
    const randomTip = dbaTips[Math.floor(Math.random() * dbaTips.length)];
    setCurrentTip(randomTip);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeModuleId]);

  // Limpiar reportes al cambiar de lección
  useEffect(() => {
    setValidationReport(null);
    setIsVerifying(false);
    setRevealedSolution(false);
    setActiveHintIndex(-1);
    setActiveSubTab('content');
  }, [activeModuleId]);

  // Escuchar reportes de verificación de la extensión
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.command === 'validationResult') {
        setIsVerifying(false);
        setValidationReport(message.report);

        // Añadir a actividad reciente
        const newEvent: RecentActivityEvent = {
          id: Date.now().toString(),
          message: message.report.passed 
            ? `Superaste el Desafío: ${activeModuleId}` 
            : `Fallo en Desafío: ${activeModuleId}`,
          xp: message.report.passed ? '+150 XP' : undefined,
          time: 'Ahora mismo'
        };
        setActivities(prev => [newEvent, ...prev.slice(0, 4)]);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [activeModuleId]);

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
    { id: 'nivel-3', title: 'Nivel 3: Experto', modulePrefix: '3-' },
    { id: 'nivel-4', title: 'Nivel 4: Transacciones y Automatización', modulePrefix: '4-' }
  ];

  // Resolve tutorial categories using all fields (spread operator)
  const activeTutorials: TutorialLevel[] = levelsConfig.map(lvl => {
    if (tutorialsData) {
      const modules = Object.keys(tutorialsData)
        .filter(key => key.startsWith(lvl.modulePrefix))
        .sort()
        .map(key => ({
          id: key,
          ...tutorialsData[key]
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
    onExecuteCommand('sqlEngineLab.newSqlSheet');

    // Añadir actividad
    const newEvent: RecentActivityEvent = {
      id: Date.now().toString(),
      message: `Abriste Sandbox de Lección: ${moduleId}`,
      time: 'Ahora mismo'
    };
    setActivities(prev => [newEvent, ...prev.slice(0, 4)]);
  };

  const handleCompleteTutorial = (moduleId: string) => {
    setIsVerifying(true);
    setValidationReport(null);
    onExecuteCommand('sqlEngineLab.verifyTutorial', [moduleId]);
  };

  const toggleBookmark = (moduleId: string) => {
    if (bookmarkedChapters.includes(moduleId)) {
      setBookmarkedChapters(prev => prev.filter(id => id !== moduleId));
    } else {
      setBookmarkedChapters(prev => [...prev, moduleId]);
    }
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

  // Metadatos de Dificultad, XP, Tiempos
  const getDifficulty = (moduleId: string): 'Básico' | 'Intermedio' | 'Avanzado' => {
    if (moduleId.startsWith('1-')) return 'Básico';
    if (moduleId.startsWith('2-')) return 'Intermedio';
    return 'Avanzado';
  };

  const getEstimatedTime = (moduleId: string): string => {
    if (moduleId.startsWith('1-')) return '10 min';
    if (moduleId.startsWith('2-')) return '15 min';
    return '25 min';
  };

  const getXpReward = (moduleId: string): string => {
    if (moduleId === '1-1' || moduleId === '1-2') return '150 XP';
    if (moduleId === '1-3') return '200 XP';
    if (moduleId === '2-1') return '250 XP';
    if (moduleId === '2-2') return '300 XP';
    if (moduleId === '2-3') return '350 XP';
    if (moduleId === '3-1') return '400 XP';
    return '450 XP';
  };

  const getPrerequisiteName = (moduleId: string): string => {
    if (moduleId === '1-1') return 'Ninguno';
    const idx = flatModuleOrder.indexOf(moduleId);
    if (idx <= 0) return 'Ninguno';
    return `Capítulo ${flatModuleOrder[idx - 1]}`;
  };

  // Cálculo de progreso de logros para el Right Sidebar
  const getDdlProgress = () => {
    const ddlModules = flatModuleOrder.filter(id => id.startsWith('1-1') || id.startsWith('1-2'));
    const completed = ddlModules.filter(id => isModuleCompleted(id)).length;
    return { completed, total: ddlModules.length, pct: ddlModules.length > 0 ? (completed / ddlModules.length) * 100 : 0 };
  };

  const getDmlProgress = () => {
    const dmlModules = flatModuleOrder.filter(id => id.startsWith('1-3') || id.startsWith('2-1') || id.startsWith('4-1'));
    const completed = dmlModules.filter(id => isModuleCompleted(id)).length;
    return { completed, total: dmlModules.length, pct: dmlModules.length > 0 ? (completed / dmlModules.length) * 100 : 0 };
  };

  const getLevel1Progress = () => {
    const lvl1Modules = flatModuleOrder.filter(id => id.startsWith('1-'));
    const completed = lvl1Modules.filter(id => isModuleCompleted(id)).length;
    return { completed, total: lvl1Modules.length, pct: lvl1Modules.length > 0 ? (completed / lvl1Modules.length) * 100 : 0 };
  };

  if (!activeEngine) {
    return (
      <div className="reader-empty">
        <span className="reader-empty-icon">⚠️</span>
        <h3>No hay motor activo</h3>
        <p>Inicia un motor desde el Dashboard primero para cargar sus tutoriales interactivos.</p>
      </div>
    );
  }

  const ddlProg = getDdlProgress();
  const dmlProg = getDmlProgress();
  const lvl1Prog = getLevel1Progress();

  return (
    <div className="book-container">
      {/* 1. COLUMNA IZQUIERDA: TEMARIO */}
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

        <div className="sidebar-menu-title">RUTA DE APRENDIZAJE</div>

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

        {/* Widget de Misiones Diarias */}
        <div className="sidebar-daily-missions">
          <div className="mission-header">
            <span className="mission-icon">🎯</span>
            <span className="mission-title">Misiones Diarias</span>
          </div>
          <div className="mission-item">
            <div className="mission-info">
              <span className="mission-desc">Resuelve 2 retos de DML</span>
              <span className="mission-xp">+150 XP</span>
            </div>
            <div className="mission-progress-bar-bg">
              <div className="mission-progress-bar-fill" style={{ width: dmlProg.completed >= 2 ? '100%' : dmlProg.completed === 1 ? '50%' : '0%' }}></div>
            </div>
            <span className="mission-progress-text">{Math.min(2, dmlProg.completed)}/2 completadas</span>
          </div>
        </div>
      </div>

      {/* 2. COLUMNA CENTRAL: LECTOR Y TABS */}
      <div className="book-reader">
        {activeModule ? (
          <>
            <div className="reader-body">
              <div className="reader-content-limit">
                
                {/* Header Contexto y Botones de Opciones */}
                <div className="reader-header-actions">
                  <div className="reader-path-badge">
                    {activeEngine.displayName} /{' '}
                    {activeModule.id.startsWith('1-') 
                      ? 'Nivel 1: Fundamentos' 
                      : activeModule.id.startsWith('2-') 
                        ? 'Nivel 2: Intermedio' 
                        : 'Nivel 3: Experto'}
                  </div>
                  <div className="reader-option-buttons">
                    <button 
                      className={`btn-icon ${bookmarkedChapters.includes(activeModule.id) ? 'active' : ''}`}
                      onClick={() => toggleBookmark(activeModule.id)}
                      title="Marcar Lección"
                    >
                      🔖
                    </button>
                    <button className="btn-icon" title="Compartir">📤</button>
                    <button className="btn-icon" title="Más opciones">•••</button>
                  </div>
                </div>

                {/* Título */}
                <div className="reader-title-container">
                  <h2>Capítulo {activeModule.id}: {activeModule.title}</h2>
                </div>

                {/* Engine Intro (Lore del Caso Real) */}
                {tutorialsData && tutorialsData.engine_intro && (
                  <div className="engine-intro-card">
                    <div className="intro-header">
                      <span className="intro-badge">🏢 CASO REAL DE LA INDUSTRIA</span>
                    </div>
                    <p className="intro-text">{tutorialsData.engine_intro}</p>
                  </div>
                )}

                {/* Fila de Metadatos del Capítulo */}
                <div className="chapter-meta-grid">
                  <div className="meta-card">
                    <span className="meta-label">DIFICULTAD</span>
                    <span className="meta-value text-green">{getDifficulty(activeModule.id)}</span>
                  </div>
                  <div className="meta-card">
                    <span className="meta-label">TIEMPO ESTIMADO</span>
                    <span className="meta-value">{getEstimatedTime(activeModule.id)}</span>
                  </div>
                  <div className="meta-card">
                    <span className="meta-label">RECOMPENSA</span>
                    <span className="meta-value text-purple">{getXpReward(activeModule.id)}</span>
                  </div>
                  <div className="meta-card">
                    <span className="meta-label">PRERREQUISITO</span>
                    <span className="meta-value">{getPrerequisiteName(activeModule.id)}</span>
                  </div>
                </div>

                {/* Sandbox Desafío Banner */}
                <div className={`reader-actions-card ${isModuleCompleted(activeModule.id) ? 'completed' : ''}`}>
                  <div className="reader-actions-info">
                    <span className="reader-actions-title">
                      {isModuleCompleted(activeModule.id) ? '✓ Capítulo Completado' : '⚡ Desafío en Sandbox'}
                    </span>
                    <span className="reader-actions-desc">
                      {!isModulePrerequisitesMet(activeModule.id) && !isModuleCompleted(activeModule.id)
                        ? '🔒 Completa los capítulos anteriores para desbloquear este reto.'
                        : isModuleCompleted(activeModule.id) 
                          ? 'Ya has resuelto este desafío correctamente. Puedes seguir repasando.'
                          : 'Abre la hoja SQL en el editor para resolver el reto propuesto.'}
                    </span>
                  </div>

                  <div className="reader-actions-buttons">
                    {isModulePrerequisitesMet(activeModule.id) && (
                      <>
                        <button 
                          className="btn primary"
                          onClick={() => handleStartTutorial(activeModule.id)}
                          disabled={isVerifying}
                        >
                          💻 {isModuleCompleted(activeModule.id) ? 'Reabrir Sandbox' : 'Abrir Sandbox'}
                        </button>
                        {!isModuleCompleted(activeModule.id) && (
                          <button 
                            className="btn success"
                            onClick={() => handleCompleteTutorial(activeModule.id)}
                            disabled={isVerifying}
                          >
                            {isVerifying ? 'Verificando...' : '🚀 Verificar Desafío'}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Consola Autograder */}
                {isVerifying && (
                  <div className="autograder-console checking">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="spinner"></span>
                      <strong style={{ color: 'var(--accent-cyan)' }}>Analizando la estructura física del motor...</strong>
                    </div>
                  </div>
                )}

                {validationReport && (
                  <div className={`autograder-console ${validationReport.passed ? 'passed' : 'failed'}`}>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', color: validationReport.passed ? 'var(--accent-primary)' : 'var(--accent-danger)' }}>
                      {validationReport.passed ? '🎉 ¡Desafío Completado con Éxito!' : '❌ Error de Verificación'}
                    </h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {validationReport.results.map((res: any, idx: number) => (
                        <div key={idx} className="console-line">
                          <span className={`console-bullet ${res.passed ? 'passed' : 'failed'}`}>
                            {res.passed ? '✓ PASÓ:' : '✗ FALLÓ:'}
                          </span>
                          <span className="console-msg">{res.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sub-Navegación de Pestañas de Lección */}
                <div className="lesson-subtabs">
                  <div 
                    className={`subtab ${activeSubTab === 'content' ? 'active' : ''}`}
                    onClick={() => setActiveSubTab('content')}
                  >
                    Contenido
                  </div>
                  <div 
                    className={`subtab ${activeSubTab === 'example' ? 'active' : ''}`}
                    onClick={() => setActiveSubTab('example')}
                  >
                    Ejemplo
                  </div>
                  <div 
                    className={`subtab ${activeSubTab === 'deepdive' ? 'active' : ''}`}
                    onClick={() => setActiveSubTab('deepdive')}
                  >
                    Profundiza
                  </div>
                  <div 
                    className={`subtab ${activeSubTab === 'notes' ? 'active' : ''}`}
                    onClick={() => setActiveSubTab('notes')}
                  >
                    Notas
                  </div>
                  <div 
                    className={`subtab ${activeSubTab === 'resources' ? 'active' : ''}`}
                    onClick={() => setActiveSubTab('resources')}
                  >
                    Recursos
                  </div>
                </div>

                {/* Cuerpo de la Pestaña Activa */}
                <div className="book-chapter-theory">
                  {activeSubTab === 'content' && (
                    <div className="tab-pane-content">
                      {activeModule.concept && (
                        <div className="concept-callout">
                          <h4>El porqué de este capítulo</h4>
                          <p>{activeModule.concept}</p>
                        </div>
                      )}
                      
                      {activeModule.learning_objective && (
                        <div className="objective-box">
                          <strong>Objetivo de Aprendizaje:</strong> {activeModule.learning_objective}
                        </div>
                      )}

                      <h4>Estructura y Teoría</h4>
                      {activeModule.content ? (
                        <div className="sql-code-block-wrapper">
                          <p style={{ marginBottom: '12px' }}>
                            Esta es la plantilla SQL inicial cargada en tu Sandbox para resolver el reto:
                          </p>
                          <pre className="code-block-preview">{activeModule.content}</pre>
                        </div>
                      ) : (
                        <p>No hay código inicial para esta lección.</p>
                      )}
                    </div>
                  )}

                  {activeSubTab === 'example' && (
                    <div className="tab-pane-content">
                      <h4>Sintaxis de Referencia y Ejemplo</h4>
                      <p>
                        Para resolver esta tarea, la sintaxis SQL recomendada en {activeEngine.displayName} sigue este formato común:
                      </p>
                      <pre className="code-block-preview">
                        {activeModule.solution 
                          ? `-- Sintaxis típica de uso:\n${activeModule.solution.split('\n')[0]}`
                          : "SELECT 1;"}
                      </pre>
                      <div className="info-box">
                        <strong>Tip:</strong> Puedes copiar este ejemplo de sintaxis y adaptarlo en tu archivo Sandbox. Escribe comandos correctos y respeta los nombres de las columnas.
                      </div>
                    </div>
                  )}

                  {activeSubTab === 'deepdive' && (
                    <div className="tab-pane-content">
                      <h4>Profundización en Ingeniería de Datos</h4>
                      {activeModule.real_world_purpose && (
                        <div className="purpose-callout">
                          <h5>Propósito Profesional (Para qué sirve)</h5>
                          <p>{activeModule.real_world_purpose}</p>
                        </div>
                      )}
                      
                      <div style={{ marginTop: '20px' }}>
                        <h5>Casos Reales y Escala</h5>
                        <p>
                          Las empresas globales implementan este patrón a gran escala. Por ejemplo, la fragmentación de índices o el uso erróneo de tipos secuenciales en transacciones financieras de alto tráfico puede causar fallos de desbordamiento de enteros o bloqueos de inserción que detengan la operación.
                        </p>
                      </div>
                    </div>
                  )}

                  {activeSubTab === 'notes' && (
                    <div className="tab-pane-content">
                      <h4>Notas del DBA y Errores Comunes</h4>
                      {activeModule.common_pitfalls && activeModule.common_pitfalls.length > 0 ? (
                        <div className="pitfalls-list">
                          {activeModule.common_pitfalls.map((pit, idx) => (
                            <div key={idx} className="pitfall-item">
                              <span className="pitfall-warning">⚠️</span>
                              <div className="pitfall-body">
                                <strong>Error Común #{idx + 1}:</strong> {pit}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p>No se registran pitfalls específicos para este módulo.</p>
                      )}
                    </div>
                  )}

                  {activeSubTab === 'resources' && (
                    <div className="tab-pane-content">
                      <h4>Pistas y Solución del Desafío</h4>
                      
                      {/* Pistas Progresivas */}
                      {activeModule.hints && activeModule.hints.length > 0 && (
                        <div className="hints-section" style={{ marginBottom: '24px' }}>
                          <h5>💡 Pistas de Resolución Progresivas</h5>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                            {activeModule.hints.map((hint, idx) => (
                              <div key={idx} className="hint-disclosure">
                                {activeHintIndex >= idx ? (
                                  <div className="hint-body">
                                    <strong>Pista {idx + 1}:</strong> {hint}
                                  </div>
                                ) : (
                                  <button 
                                    className="btn btn-sm btn-secondary"
                                    onClick={() => setActiveHintIndex(idx)}
                                    style={{ width: 'fit-content' }}
                                  >
                                    Revelar Pista {idx + 1}
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Solución oculta */}
                      <div className="solution-revealer" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                        <h5>🔑 Solución de Referencia</h5>
                        {!revealedSolution ? (
                          <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px dashed var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>¿Te encuentras atascado en este reto? Puedes revelar la solución para guiarte.</p>
                            <button 
                              className="btn btn-sm success"
                              onClick={() => setRevealedSolution(true)}
                            >
                              Revelar Código Solución
                            </button>
                          </div>
                        ) : (
                          <div className="solution-box" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <pre className="code-block-preview" style={{ borderLeftColor: 'var(--accent-emerald)' }}>
                              {activeModule.solution || "SELECT 1;"}
                            </pre>
                            {activeModule.expected_output && (
                              <div className="expected-output-box">
                                <strong>Resultado Esperado:</strong>
                                <p style={{ fontStyle: 'italic', margin: '4px 0 0 0', color: 'var(--text-muted)' }}>{activeModule.expected_output}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Navegación Paginada */}
            <div className="reader-footer-nav">
              <button 
                className="reader-footer-nav-btn"
                disabled={!hasPreviousChapter()}
                onClick={handlePreviousChapter}
              >
                ◀ Capítulo Anterior
              </button>
              <span className="page-indicator">
                Capítulo {flatModuleOrder.indexOf(activeModule.id) + 1} de {flatModuleOrder.length}
              </span>
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

      {/* 3. COLUMNA DERECHA: LOGROS, ÍNDICE Y ACTIVIDAD */}
      <div className="book-right-sidebar">
        {activeModule && (
          <div className="right-sidebar-block">
            <div className="sidebar-section-title">EN ESTA LECCIÓN</div>
            <div className="lesson-toc">
              <div 
                className={`toc-item ${activeSubTab === 'content' ? 'active' : ''}`}
                onClick={() => setActiveSubTab('content')}
              >
                1. Concepto y Teoría
              </div>
              <div 
                className={`toc-item ${activeSubTab === 'example' ? 'active' : ''}`}
                onClick={() => setActiveSubTab('example')}
              >
                2. Sintaxis y Ejemplo
              </div>
              <div 
                className={`toc-item ${activeSubTab === 'deepdive' ? 'active' : ''}`}
                onClick={() => setActiveSubTab('deepdive')}
              >
                3. Propósito Profesional
              </div>
              <div 
                className={`toc-item ${activeSubTab === 'notes' ? 'active' : ''}`}
                onClick={() => setActiveSubTab('notes')}
              >
                4. Pitfalls y Errores
              </div>
              <div 
                className={`toc-item ${activeSubTab === 'resources' ? 'active' : ''}`}
                onClick={() => setActiveSubTab('resources')}
              >
                5. Soluciones y Pistas
              </div>
            </div>
          </div>
        )}

        <div className="right-sidebar-block">
          <div className="sidebar-section-title">LOGROS RELACIONADOS</div>
          <div className="achievements-list">
            <div className="achievement-card-small">
              <span className="ach-icon">🛡️</span>
              <div className="ach-info">
                <span className="ach-name">Tipo Seguro</span>
                <span className="ach-desc">Domina DDL</span>
                <div className="ach-progress-bar-bg">
                  <div className="ach-progress-bar-fill" style={{ width: `${ddlProg.pct}%` }}></div>
                </div>
              </div>
              <span className="ach-reward">+20 XP</span>
            </div>

            <div className="achievement-card-small">
              <span className="ach-icon">⚡</span>
              <div className="ach-info">
                <span className="ach-name">Precisión</span>
                <span className="ach-desc">Domina DML</span>
                <div className="ach-progress-bar-bg">
                  <div className="ach-progress-bar-fill" style={{ width: `${dmlProg.pct}%` }}></div>
                </div>
              </div>
              <span className="ach-reward">+20 XP</span>
            </div>

            <div className="achievement-card-small">
              <span className="ach-icon">🏆</span>
              <div className="ach-info">
                <span className="ach-name">Base Sólida</span>
                <span className="ach-desc">Completa Nivel 1</span>
                <div className="ach-progress-bar-bg">
                  <div className="ach-progress-bar-fill" style={{ width: `${lvl1Prog.pct}%` }}></div>
                </div>
              </div>
              <span className="ach-reward">+50 XP</span>
            </div>
          </div>
        </div>

        <div className="right-sidebar-block">
          <div className="sidebar-section-title">ACTIVIDAD RECIENTE</div>
          <div className="activities-feed">
            {activities.map((act) => (
              <div key={act.id} className="feed-item">
                <div className="feed-item-header">
                  <span className="feed-item-msg">{act.message}</span>
                  {act.xp && <span className="feed-item-xp">{act.xp}</span>}
                </div>
                <span className="feed-item-time">{act.time}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="right-sidebar-block tip-day-block">
          <div className="sidebar-section-title">CONSEJO DEL DÍA</div>
          <div className="tip-box-body">
            <span className="tip-icon">💡</span>
            <p className="tip-text">{currentTip}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
