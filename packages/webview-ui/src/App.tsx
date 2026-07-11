import { useState, useEffect } from 'react';

// Tipos base
interface EngineState {
  id: string;
  displayName: string;
  status: 'running' | 'stopped' | 'error' | 'loading';
  connectionCommand?: string;
  port?: number;
  completedModules?: string[];
}

interface TutorialModule {
  id: string;
  title: string;
  description: string;
}

interface TutorialLevel {
  id: string;
  title: string;
  modules: TutorialModule[];
}

function App() {
  const [activeTab, setActiveTab] = useState<'motores' | 'tutoriales'>('motores');
  const [engine, setEngine] = useState<EngineState | null>(null);

  // Mock data por ahora, luego vendrá de VS Code postMessage
  const [tutorials] = useState<TutorialLevel[]>([
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
  ]);

  // Lista aplanada de IDs para determinar el orden de progresión
  const flatModuleOrder = tutorials.flatMap(level => level.modules.map(m => m.id));

  // Determinar si un módulo está bloqueado
  const isModuleLocked = (moduleId: string) => {
    if (!engine || !engine.completedModules) return moduleId !== flatModuleOrder[0];

    const currentIndex = flatModuleOrder.indexOf(moduleId);
    if (currentIndex === 0) return false; // El primero siempre está desbloqueado

    const previousModuleId = flatModuleOrder[currentIndex - 1];
    return !engine.completedModules.includes(previousModuleId);
  };

  const isModuleCompleted = (moduleId: string) => {
    return engine?.completedModules?.includes(moduleId) || false;
  };

  // Escuchar mensajes de VS Code
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.command === 'updateState') {
        setEngine(message.engine);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleStartTutorial = (moduleId: string) => {
    // Enviar mensaje a VS Code para abrir el sheet
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
    }
  };

  return (
    <div className="hachimaki-dashboard">
      <div className="header-title">
        <h1>ElHackerDeLasBD</h1>
      </div>

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
      </div>

      {activeTab === 'motores' && (
        <div className="panel">
          <h2>Estado del Motor</h2>
          {engine ? (
            <div>
              <p>Motor actual: <strong>{engine.displayName}</strong></p>
              <p>Estado: {engine.status}</p>
              {engine.connectionCommand && (
                <div>
                  <p>Comando de Conexión:</p>
                  <code>{engine.connectionCommand}</code>
                </div>
              )}
            </div>
          ) : (
            <p>No hay información del motor disponible. Esperando a VS Code...</p>
          )}
        </div>
      )}

      {activeTab === 'tutoriales' && (
        <div>
          <div className="panel" style={{ marginBottom: '24px' }}>
            <p>¡Bienvenido a tu entrenamiento, Padawan! Completa estos módulos para dominar el motor activo.</p>
          </div>

          {tutorials.map(level => (
            <div key={level.id} className="tutorial-level">
              <h2>{level.title}</h2>
              <div className="tutorial-grid">
                {level.modules.map(mod => {
                  const locked = isModuleLocked(mod.id);
                  const completed = isModuleCompleted(mod.id);

                  return (
                    <div key={mod.id} className={`tutorial-card ${locked ? 'locked' : ''} ${completed ? 'completed' : ''}`}>
                      <div className="card-header">
                        <h3>{mod.title}</h3>
                        {completed && <span className="status-badge">✅</span>}
                        {locked && <span className="status-badge">🔒</span>}
                      </div>
                      <p>{mod.description}</p>

                      <div className="card-actions">
                        <button
                          className="btn primary"
                          onClick={() => handleStartTutorial(mod.id)}
                          disabled={locked}
                        >
                          {completed ? '↻ Repasar Módulo' : '▶ Iniciar Módulo'}
                        </button>

                        {!locked && !completed && (
                          <button
                            className="btn secondary"
                            onClick={() => handleCompleteTutorial(mod.id)}
                            title="Haz clic aquí una vez que hayas ejecutado el reto en la hoja SQL"
                          >
                            ✅ Completar Reto
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
