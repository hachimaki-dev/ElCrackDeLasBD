import React, { useState } from 'react';

interface DatabaseMetadata {
  name: string;
  size?: string;
  tablesCount?: number;
}

interface TableMetadata {
  name: string;
  schema?: string;
}

interface UserMetadata {
  username: string;
  host?: string;
  isAdmin: boolean;
  roles?: string[];
}

interface ColumnMetadata {
  name: string;
  dataType: string;
  isNullable: boolean;
  keyType?: 'primary' | 'foreign' | 'none';
}

interface TablePreview {
  columns: ColumnMetadata[];
  rows: Record<string, unknown>[];
}

interface SavedCredentials {
  id: string;
  username: string;
  database?: string;
  password?: string;
  label: string;
}

interface DetailPanelProps {
  selectedNode: any;
  databases: DatabaseMetadata[];
  tables: TableMetadata[];
  users: UserMetadata[];
  credentials: SavedCredentials[];
  tablePreview: TablePreview | null;
  loadingPreview: boolean;
  previewError?: string;
  engineId: string;
  onCreateDatabase: (name: string) => void;
  onCreateUser: (username: string, password?: string) => void;
  onActivateDatabase: (name: string) => void;
  onActivateUser: (username: string) => void;
  onExecuteTableCommand: (sqlText: string) => void;
  onOpenInSandbox: (dbName: string, username?: string) => void;
}

export const DetailPanel: React.FC<DetailPanelProps> = ({
  selectedNode,
  databases,
  tables: _tables,
  users,
  credentials,
  tablePreview,
  loadingPreview,
  previewError,
  engineId,
  onCreateDatabase,
  onCreateUser,
  onActivateDatabase,
  onActivateUser,
  onExecuteTableCommand,
  onOpenInSandbox,
}) => {
  // Estado para creación de BD y Usuario
  const [showDbForm, setShowDbForm] = useState(false);
  const [newDbName, setNewDbName] = useState('');
  const [showUserForm, setShowUserForm] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');

  // Pestaña interna de la tabla: 'preview' | 'schema' | 'insert' | 'danger'
  const [tableSubTab, setTableSubTab] = useState<'preview' | 'schema' | 'insert' | 'danger'>('preview');

  // Formulario de inserción de datos
  const [insertData, setInsertData] = useState<Record<string, string>>({});

  // Confirmación de DROP TABLE
  const [dropTableNameConfirm, setDropTableNameConfirm] = useState('');

  // Visibilidad de contraseñas
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreateDbSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newDbName.trim()) {
      onCreateDatabase(newDbName.trim());
      setNewDbName('');
      setShowDbForm(false);
    }
  };

  const handleCreateUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUsername.trim()) {
      onCreateUser(newUsername.trim(), newUserPassword.trim() || undefined);
      setNewUsername('');
      setNewUserPassword('');
      setShowUserForm(false);
    }
  };

  // Generador de INSERT SQL
  const handleInsertSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const cols = Object.keys(insertData).filter(k => insertData[k] !== '');
    if (cols.length === 0) return;

    let quotedTable = `"${selectedNode.schema || 'public'}"."${selectedNode.name}"`;
    if (engineId === 'mysql' || engineId === 'mariadb') {
      const schemaPrefix = selectedNode.schema ? `\`${selectedNode.schema}\`.` : '';
      quotedTable = `${schemaPrefix}\`${selectedNode.name}\``;
    } else if (engineId === 'sqlite') {
      quotedTable = `"${selectedNode.name}"`;
    } else if (engineId === 'sqlserver') {
      quotedTable = `[${selectedNode.schema || 'dbo'}].[${selectedNode.name}]`;
    }

    const columnsList = cols.map(k => {
      if (engineId === 'mysql' || engineId === 'mariadb') return `\`${k}\``;
      if (engineId === 'sqlserver') return `[${k}]`;
      return `"${k}"`;
    }).join(', ');

    const valuesList = cols.map(k => {
      const val = insertData[k];
      const columnDef = tablePreview?.columns.find(c => c.name === k);
      const isNumeric = columnDef?.dataType.toLowerCase().includes('int') || 
                        columnDef?.dataType.toLowerCase().includes('float') || 
                        columnDef?.dataType.toLowerCase().includes('decimal') || 
                        columnDef?.dataType.toLowerCase().includes('number');
      
      if (isNumeric && !isNaN(Number(val))) {
        return val;
      }
      return `'${val.replace(/'/g, "''")}'`;
    }).join(', ');

    const sqlText = `INSERT INTO ${quotedTable} (${columnsList}) VALUES (${valuesList});`;
    onExecuteTableCommand(sqlText);
    setInsertData({});
  };

  // Truncate SQL
  const handleTruncateTable = () => {
    const confirm = window.confirm(`¿Estás seguro de que deseas vaciar todos los registros de la tabla "${selectedNode.name}"? Esta acción no se puede deshacer.`);
    if (!confirm) return;

    let truncateSql = `TRUNCATE TABLE "${selectedNode.schema || 'public'}"."${selectedNode.name}";`;
    if (engineId === 'mysql' || engineId === 'mariadb') {
      const schemaPrefix = selectedNode.schema ? `\`${selectedNode.schema}\`.` : '';
      truncateSql = `TRUNCATE TABLE ${schemaPrefix}\`${selectedNode.name}\`;`;
    } else if (engineId === 'sqlite') {
      truncateSql = `DELETE FROM "${selectedNode.name}"; DELETE FROM sqlite_sequence WHERE name='${selectedNode.name}';`;
    } else if (engineId === 'sqlserver') {
      truncateSql = `TRUNCATE TABLE [${selectedNode.schema || 'dbo'}].[${selectedNode.name}];`;
    }

    onExecuteTableCommand(truncateSql);
  };

  // Drop SQL
  const handleDropTable = () => {
    if (dropTableNameConfirm !== selectedNode.name) return;

    let dropSql = `DROP TABLE "${selectedNode.schema || 'public'}"."${selectedNode.name}";`;
    if (engineId === 'mysql' || engineId === 'mariadb') {
      const schemaPrefix = selectedNode.schema ? `\`${selectedNode.schema}\`.` : '';
      dropSql = `DROP TABLE ${schemaPrefix}\`${selectedNode.name}\`;`;
    } else if (engineId === 'sqlite') {
      dropSql = `DROP TABLE "${selectedNode.name}";`;
    } else if (engineId === 'sqlserver') {
      dropSql = `DROP TABLE [${selectedNode.schema || 'dbo'}].[${selectedNode.name}];`;
    }

    onExecuteTableCommand(dropSql);
    setDropTableNameConfirm('');
  };

  // Render 1: Vista General
  if (!selectedNode) {
    return (
      <div className="detail-panel-empty">
        <div className="empty-state-card">
          <span className="empty-state-icon">🗃️</span>
          <h3>Administrador Visual de BD</h3>
          <p>
            Explora esquemas, tablas y datos a la izquierda. Puedes conectar usuarios, crear bases de datos y realizar inserciones o borrados directamente.
          </p>
        </div>
      </div>
    );
  }

  // Render 2: Lista de Bases de Datos
  if (selectedNode.type === 'database') {
    return (
      <div className="detail-panel-content">
        <div className="panel-section-header">
          <h2>Bases de Datos</h2>
          {engineId !== 'sqlite' && engineId !== 'oracle' && (
            <button className="btn primary" onClick={() => setShowDbForm(!showDbForm)}>
              {showDbForm ? 'Cancelar' : '+ Nueva Base de Datos'}
            </button>
          )}
        </div>

        {showDbForm && (
          <form className="admin-inline-form" onSubmit={handleCreateDbSubmit}>
            <div className="form-group">
              <label>Nombre de la base de datos:</label>
              <input
                type="text"
                placeholder="ej: mi_tienda_db"
                value={newDbName}
                onChange={e => setNewDbName(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn success">Crear</button>
          </form>
        )}

        <table className="admin-data-table">
          <thead>
            <tr>
              <th>Nombre de Base de Datos</th>
              <th>Información</th>
              <th style={{ textAlign: 'right' }}>Acciones rápidas</th>
            </tr>
          </thead>
          <tbody>
            {databases.map(db => {
              return (
                <tr key={db.name}>
                  <td className="font-bold">{db.name}</td>
                  <td>{db.size || 'Mapeado dinámicamente'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="action-row-buttons">
                      <button 
                        className="btn secondary btn-xs"
                        onClick={() => onActivateDatabase(db.name)}
                      >
                        ⚡ Activar
                      </button>
                      <button 
                        className="btn primary btn-xs"
                        onClick={() => onOpenInSandbox(db.name, undefined)}
                      >
                        📂 Sandbox
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  // Render 3: Lista de Usuarios
  if (selectedNode.type === 'users') {
    return (
      <div className="detail-panel-content">
        <div className="panel-section-header">
          <h2>Usuarios y Permisos</h2>
          {engineId !== 'sqlite' && (
            <button className="btn primary" onClick={() => setShowUserForm(!showUserForm)}>
              {showUserForm ? 'Cancelar' : '+ Nuevo Usuario'}
            </button>
          )}
        </div>

        {showUserForm && (
          <form className="admin-inline-form" onSubmit={handleCreateUserSubmit}>
            <div className="form-group">
              <label>Nombre de usuario:</label>
              <input
                type="text"
                placeholder="ej: tienda_admin"
                value={newUsername}
                onChange={e => setNewUsername(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Contraseña (opcional):</label>
              <input
                type="password"
                placeholder="Dejar vacío para default"
                value={newUserPassword}
                onChange={e => setNewUserPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="btn success">Crear</button>
          </form>
        )}

        {engineId === 'sqlite' ? (
          <div className="info-banner warning">
            SQLite es una base de datos embebida basada en archivos; no implementa usuarios ni contraseñas.
          </div>
        ) : (
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>Usuario</th>
                {engineId === 'mysql' || engineId === 'mariadb' ? <th>Host</th> : null}
                <th>Nivel</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.username + (u.host || '')}>
                  <td className="font-bold">{u.username}</td>
                  {engineId === 'mysql' || engineId === 'mariadb' ? <td>{u.host || '%'}</td> : null}
                  <td>
                    <span className={`role-badge ${u.isAdmin ? 'admin' : 'standard'}`}>
                      {u.isAdmin ? 'Superusuario' : 'Estándar'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="action-row-buttons">
                      <button 
                        className="btn secondary btn-xs"
                        onClick={() => onActivateUser(u.username)}
                      >
                        ⚡ Conectar
                      </button>
                      <button 
                        className="btn primary btn-xs"
                        onClick={() => onOpenInSandbox(databases[0]?.name || 'labdb', u.username)}
                      >
                        📂 Sandbox
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  }

  // Render 4: Llavero de Credenciales
  if (selectedNode.type === 'credentials') {
    return (
      <div className="detail-panel-content">
        <div className="panel-section-header">
          <h2>Llavero de Credenciales</h2>
        </div>
        <p style={{ color: 'var(--text-muted)', marginBottom: '15px' }}>
          Visualiza las contraseñas activas en el llavero de la extensión.
        </p>

        {engineId === 'sqlite' ? (
          <div className="info-banner warning">
            SQLite no implementa usuarios ni contraseñas.
          </div>
        ) : (
          <div className="keychain-grid">
            {credentials.map(cred => {
              const isVisible = !!visiblePasswords[cred.id];
              return (
                <div key={cred.id} className="keychain-card">
                  <div className="keychain-header">
                    <span className="keychain-icon">🔑</span>
                    <div>
                      <h4 className="keychain-username">{cred.username}</h4>
                      <span className="keychain-label">{cred.label}</span>
                    </div>
                  </div>

                  <div className="keychain-body">
                    <div className="keychain-field">
                      <span className="field-label">Base de datos:</span>
                      <span className="field-value">{cred.database || 'Cualquiera'}</span>
                    </div>
                    <div className="keychain-field">
                      <span className="field-label">Contraseña:</span>
                      <div className="password-display-group">
                        <span className="password-text">
                          {isVisible ? cred.password : '••••••••••••'}
                        </span>
                        <button 
                          className="btn-icon" 
                          onClick={() => togglePasswordVisibility(cred.id)}
                          title={isVisible ? 'Ocultar contraseña' : 'Ver contraseña'}
                        >
                          {isVisible ? '👁️' : '🕶️'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Render 5: Vista de Tablas
  if (selectedNode.type === 'table') {
    if (loadingPreview) {
      return (
        <div className="detail-panel-loading">
          <div className="spinner-dots animate-pulse"></div>
          <p>Cargando información de {selectedNode.name}...</p>
        </div>
      );
    }

    if (previewError) {
      return (
        <div className="detail-panel-content">
          <div className="panel-section-header">
            <h2>Tabla: {selectedNode.name}</h2>
          </div>
          <div className="info-banner error">
            {previewError}
          </div>
        </div>
      );
    }

    const columns = tablePreview?.columns || [];
    const rows = tablePreview?.rows || [];

    return (
      <div className="detail-panel-content scrollable-detail">
        <div className="panel-section-header">
          <div>
            <h2>Tabla: {selectedNode.name}</h2>
            <span className="table-schema-subtitle">Esquema / Owner: {selectedNode.schema || 'public'}</span>
          </div>
          
          {/* Sub-navegación de la tabla */}
          <div className="explorer-subtabs">
            <button 
              className={`subtab-btn ${tableSubTab === 'preview' ? 'active' : ''}`}
              onClick={() => setTableSubTab('preview')}
            >
              Datos
            </button>
            <button 
              className={`subtab-btn ${tableSubTab === 'schema' ? 'active' : ''}`}
              onClick={() => setTableSubTab('schema')}
            >
              Estructura
            </button>
            <button 
              className={`subtab-btn ${tableSubTab === 'insert' ? 'active' : ''}`}
              onClick={() => setTableSubTab('insert')}
            >
              Insertar
            </button>
            <button 
              className={`subtab-btn ${tableSubTab === 'danger' ? 'active' : ''}`}
              onClick={() => setTableSubTab('danger')}
            >
              Zona de Peligro
            </button>
          </div>
        </div>

        {/* Sub-Pestaña A: Datos (Vista Previa) */}
        {tableSubTab === 'preview' && (
          <div className="table-preview-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3>Registros de la Tabla</h3>
              <button 
                className="btn primary btn-xs"
                onClick={() => onOpenInSandbox(databases[0]?.name || 'labdb')}
              >
                📝 Query en Sandbox
              </button>
            </div>
            {rows.length === 0 ? (
              <div className="empty-table-banner">La tabla no contiene ningún registro actualmente.</div>
            ) : (
              <div className="grid-table-container">
                <table className="admin-data-table grid-table">
                  <thead>
                    <tr>
                      {columns.map(col => (
                        <th key={col.name}>{col.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, rIdx) => (
                      <tr key={rIdx}>
                        {columns.map(col => (
                          <td key={col.name} className="font-mono">
                            {row[col.name] === null || row[col.name] === undefined ? (
                              <span className="null-value">NULL</span>
                            ) : (
                              String(row[col.name])
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Sub-Pestaña B: Estructura */}
        {tableSubTab === 'schema' && (
          <div className="table-preview-section">
            <h3>Definición de Columnas</h3>
            <table className="admin-data-table schema-table">
              <thead>
                <tr>
                  <th>Columna</th>
                  <th>Tipo de Dato</th>
                  <th>Permite Nulos</th>
                  <th>Clave</th>
                </tr>
              </thead>
              <tbody>
                {columns.map(col => (
                  <tr key={col.name}>
                    <td className="font-bold">{col.name}</td>
                    <td className="font-mono">{col.dataType}</td>
                    <td>{col.isNullable ? 'Sí' : 'No'}</td>
                    <td>
                      {col.keyType === 'primary' ? (
                        <span className="key-badge primary">PK</span>
                      ) : col.keyType === 'foreign' ? (
                        <span className="key-badge foreign">FK</span>
                      ) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Sub-Pestaña C: Insertar Datos */}
        {tableSubTab === 'insert' && (
          <div className="table-preview-section">
            <h3>Insertar Nuevo Registro</h3>
            <form className="dynamic-insert-form" onSubmit={handleInsertSubmit}>
              <div className="form-fields-grid">
                {columns.map(col => (
                  <div key={col.name} className="form-field-item">
                    <label>{col.name} <span className="field-type-tag">({col.dataType})</span></label>
                    <input
                      type="text"
                      placeholder={col.isNullable ? 'NULL' : 'Requerido'}
                      value={insertData[col.name] || ''}
                      onChange={e => setInsertData({ ...insertData, [col.name]: e.target.value })}
                      required={!col.isNullable}
                    />
                  </div>
                ))}
              </div>
              <button type="submit" className="btn success" style={{ alignSelf: 'flex-start', marginTop: '16px' }}>
                💾 Guardar Registro
              </button>
            </form>
          </div>
        )}

        {/* Sub-Pestaña D: Zona de Peligro */}
        {tableSubTab === 'danger' && (
          <div className="table-preview-section danger-zone-section">
            <div className="danger-action-card">
              <div className="danger-action-info">
                <h4>Vaciar todos los datos (TRUNCATE)</h4>
                <p>Borra de forma permanente todas las filas de la tabla "{selectedNode.name}", conservando la estructura de columnas.</p>
              </div>
              <button className="btn danger-outline" onClick={handleTruncateTable}>
                Vaciar Tabla
              </button>
            </div>

            <div className="danger-action-card">
              <div className="danger-action-info">
                <h4>Eliminar tabla (DROP)</h4>
                <p>Elimina permanentemente la tabla "{selectedNode.name}" y toda su información. Esta acción no se puede deshacer.</p>
                
                <div style={{ marginTop: '12px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Escribe <strong>{selectedNode.name}</strong> para confirmar:
                  </label>
                  <input
                    type="text"
                    placeholder={selectedNode.name}
                    value={dropTableNameConfirm}
                    onChange={e => setDropTableNameConfirm(e.target.value)}
                    className="danger-confirm-input"
                  />
                </div>
              </div>
              <button 
                className="btn danger" 
                disabled={dropTableNameConfirm !== selectedNode.name}
                onClick={handleDropTable}
              >
                Eliminar Tabla (DROP)
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
};
