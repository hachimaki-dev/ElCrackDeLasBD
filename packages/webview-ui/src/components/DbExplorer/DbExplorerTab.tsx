import React, { useState, useEffect } from 'react';
import { SchemaTree } from './SchemaTree';
import { DetailPanel } from './DetailPanel';
import { vscode } from '../../vscode';

interface DbExplorerTabProps {
  engineId: string;
  onBack?: () => void;
}

export const DbExplorerTab: React.FC<DbExplorerTabProps> = ({ engineId, onBack }) => {
  const [databases, setDatabases] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [credentials, setCredentials] = useState<any[]>([]);
  
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [tablePreview, setTablePreview] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | undefined>(undefined);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Cargar metadatos iniciales
  const refreshMetadata = () => {
    setLoading(true);
    setError(undefined);
    vscode.postMessage({ command: 'getAdminMetadata' });
    vscode.postMessage({ command: 'getSavedCredentials' });
  };

  useEffect(() => {
    refreshMetadata();

    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      switch (message.command) {
        case 'updateAdminMetadata':
          setDatabases(message.report.databases || []);
          setTables(message.report.tables || []);
          setUsers(message.report.users || []);
          setLoading(false);
          break;

        case 'updateTablePreview':
          setTablePreview(message.preview || null);
          setPreviewError(message.error);
          setLoadingPreview(false);
          break;

        case 'updateSavedCredentials':
          setCredentials(message.credentials || []);
          break;

        case 'databaseCreated':
          setLoading(false);
          if (message.success) {
            showNotification('success', message.message);
            refreshMetadata();
          } else {
            showNotification('error', message.message);
          }
          break;

        case 'userCreated':
          setLoading(false);
          if (message.success) {
            showNotification('success', message.message);
            refreshMetadata();
          } else {
            showNotification('error', message.message);
          }
          break;

        case 'tableCommandExecuted':
          setLoading(false);
          if (message.success) {
            showNotification('success', message.message);
            refreshMetadata();
            // Si el nodo seleccionado es una tabla, recargar la vista previa
            if (selectedNode?.type === 'table') {
              setLoadingPreview(true);
              vscode.postMessage({
                command: 'getTablePreview',
                tableName: selectedNode.name,
                schemaName: selectedNode.schema,
              });
            }
          } else {
            showNotification('error', message.message);
          }
          break;

        case 'adminError':
          setError(message.message);
          setLoading(false);
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [selectedNode]);

  // Escuchar selección de nodo del árbol
  const handleSelectNode = (node: any) => {
    setSelectedNode(node);
    
    if (node?.type === 'table') {
      setLoadingPreview(true);
      setTablePreview(null);
      setPreviewError(undefined);
      vscode.postMessage({
        command: 'getTablePreview',
        tableName: node.name,
        schemaName: node.schema,
      });
    }
  };

  const handleCreateDatabase = (name: string) => {
    setLoading(true);
    vscode.postMessage({
      command: 'createDatabase',
      name,
    });
  };

  const handleCreateUser = (username: string, password?: string) => {
    setLoading(true);
    vscode.postMessage({
      command: 'createUser',
      username,
      password,
    });
  };

  const handleActivateDatabase = (name: string) => {
    vscode.postMessage({
      command: 'activateDatabase',
      dbName: name,
    });
    showNotification('success', `Base de datos ${name} establecida como conexión activa.`);
  };

  const handleActivateUser = (username: string) => {
    vscode.postMessage({
      command: 'activateUser',
      username,
    });
  };

  const handleExecuteTableCommand = (sqlText: string) => {
    setLoading(true);
    vscode.postMessage({
      command: 'executeTableCommand',
      sqlText,
    });
  };

  const handleOpenInSandbox = (dbName: string, username?: string) => {
    if (dbName) {
      vscode.postMessage({ command: 'activateDatabase', dbName });
    }
    if (username) {
      vscode.postMessage({ command: 'activateUser', username });
    }
    showNotification('success', 'Conectando y abriendo hoja SQL en VS Code...');
    setTimeout(() => {
      vscode.postMessage({ command: 'executeCommand', action: 'sqlEngineLab.newSqlSheet' });
    }, 500);
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  return (
    <div className="db-explorer-tab-container">
      {/* Notificaciones flotantes */}
      {notification && (
        <div className={`admin-toast ${notification.type}`}>
          <span className="toast-icon">{notification.type === 'success' ? '✓' : '⚠️'}</span>
          <span className="toast-message">{notification.message}</span>
        </div>
      )}

      {onBack && (
        <div className="explorer-back-header">
          <button className="btn secondary text-xs btn-back-dashboard" onClick={onBack}>
            ← Volver a Detalles del Motor
          </button>
        </div>
      )}

      {loading && !databases.length && (
        <div className="explorer-full-loader">
          <div className="spinner-dots animate-pulse"></div>
          <p>Conectando al catálogo del motor...</p>
        </div>
      )}

      {error && (
        <div className="explorer-error-pane">
          <span className="error-icon">⚠️</span>
          <h3>Error de Conexión</h3>
          <p>{error}</p>
          <button className="btn primary" onClick={refreshMetadata}>Reintentar Conexión</button>
        </div>
      )}

      {!loading && !error && (
        <div className="db-explorer-layout">
          {/* Columna Izquierda: Árbol */}
          <div className="explorer-sidebar">
            <SchemaTree
              databases={databases}
              tables={tables}
              selectedNode={selectedNode}
              onSelectNode={handleSelectNode}
              engineId={engineId}
            />
            <div className="sidebar-footer-actions">
              <button className="btn secondary text-xs" onClick={refreshMetadata}>
                🔄 Refrescar Catálogo
              </button>
            </div>
          </div>

          {/* Columna Derecha: Panel de Detalles */}
          <div className="explorer-main">
            <DetailPanel
              selectedNode={selectedNode}
              databases={databases}
              tables={tables}
              users={users}
              credentials={credentials}
              tablePreview={tablePreview}
              loadingPreview={loadingPreview}
              previewError={previewError}
              engineId={engineId}
              onCreateDatabase={handleCreateDatabase}
              onCreateUser={handleCreateUser}
              onActivateDatabase={handleActivateDatabase}
              onActivateUser={handleActivateUser}
              onExecuteTableCommand={handleExecuteTableCommand}
              onOpenInSandbox={handleOpenInSandbox}
            />
          </div>
        </div>
      )}
    </div>
  );
};
