import React, { useState } from 'react';

interface DatabaseMetadata {
  name: string;
  size?: string;
}

interface TableMetadata {
  name: string;
  schema?: string;
}

interface SchemaTreeProps {
  databases: DatabaseMetadata[];
  tables: TableMetadata[];
  selectedNode: any;
  onSelectNode: (node: any) => void;
  engineId: string;
}

export const SchemaTree: React.FC<SchemaTreeProps> = ({
  databases,
  tables,
  selectedNode,
  onSelectNode,
  engineId,
}) => {
  const [expandedDb, setExpandedDb] = useState<Record<string, boolean>>({ main: true });
  const [expandedSchema, setExpandedSchema] = useState<Record<string, boolean>>({ public: true, dbo: true });

  const toggleDb = (dbName: string) => {
    setExpandedDb(prev => ({ ...prev, [dbName]: !prev[dbName] }));
  };

  const toggleSchema = (schemaName: string) => {
    setExpandedSchema(prev => ({ ...prev, [schemaName]: !prev[schemaName] }));
  };

  // Determinar cómo agrupar las tablas según el motor
  const renderTreeNodes = () => {
    // Caso A: MySQL y MariaDB (las tablas vienen agrupadas por table_schema, que equivale a la base de datos)
    if (engineId === 'mysql' || engineId === 'mariadb') {
      return databases.map(db => {
        const dbTables = tables.filter(t => t.schema === db.name);
        const isExpanded = !!expandedDb[db.name];
        const isDbSelected = selectedNode?.type === 'database' && selectedNode?.name === db.name;

        return (
          <div key={db.name} className="tree-node-group">
            <div
              className={`tree-node level-0 ${isDbSelected ? 'selected' : ''}`}
              onClick={() => {
                toggleDb(db.name);
                onSelectNode({ type: 'database', name: db.name });
              }}
            >
              <span className={`tree-arrow ${isExpanded ? 'expanded' : ''}`}>▶</span>
              <span className="tree-icon">🗄️</span>
              <span className="tree-label">{db.name}</span>
            </div>

            {isExpanded && (
              <div className="tree-children">
                {dbTables.length === 0 ? (
                  <div className="tree-empty">Sin tablas</div>
                ) : (
                  dbTables.map(table => {
                    const isTableSelected = selectedNode?.type === 'table' && selectedNode?.name === table.name && selectedNode?.schema === db.name;
                    return (
                      <div
                        key={table.name}
                        className={`tree-node level-1 ${isTableSelected ? 'selected' : ''}`}
                        onClick={() => onSelectNode({ type: 'table', name: table.name, schema: db.name })}
                      >
                        <span className="tree-icon">📊</span>
                        <span className="tree-label">{table.name}</span>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        );
      });
    }

    // Caso B: SQLite, PostgreSQL, SQL Server, Oracle (Tablas agrupadas por esquema en la BD conectada)
    // Para SQLite, el esquema es siempre 'main'. Para Postgres, suele ser 'public'. Para SQL Server, 'dbo'.
    const isSingleDbExpanded = !!expandedDb['active'];
    const isSingleDbSelected = selectedNode?.type === 'database' && selectedNode?.name === 'active';

    // Agrupar tablas por esquema
    const schemas: Record<string, TableMetadata[]> = {};
    tables.forEach(t => {
      const s = t.schema || 'public';
      if (!schemas[s]) schemas[s] = [];
      schemas[s].push(t);
    });

    return (
      <div className="tree-node-group">
        {/* Nodo raíz de la base de datos conectada */}
        <div
          className={`tree-node level-0 ${isSingleDbSelected ? 'selected' : ''}`}
          onClick={() => {
            toggleDb('active');
            onSelectNode({ type: 'database', name: 'active' });
          }}
        >
          <span className={`tree-arrow ${isSingleDbExpanded ? 'expanded' : ''}`}>▶</span>
          <span className="tree-icon">🗄️</span>
          <span className="tree-label">BD Conectada</span>
        </div>

        {isSingleDbExpanded && (
          <div className="tree-children">
            {Object.keys(schemas).length === 0 ? (
              <div className="tree-empty">Sin esquemas</div>
            ) : (
              Object.keys(schemas).map(schemaName => {
                const schemaTables = schemas[schemaName];
                const isSchemaExpanded = !!expandedSchema[schemaName];
                
                return (
                  <div key={schemaName} className="tree-node-group">
                    {/* Nodo de esquema (carpeta intermedia) */}
                    {engineId !== 'sqlite' && (
                      <div
                        className="tree-node level-1"
                        onClick={() => toggleSchema(schemaName)}
                      >
                        <span className={`tree-arrow ${isSchemaExpanded ? 'expanded' : ''}`}>▶</span>
                        <span className="tree-icon">📁</span>
                        <span className="tree-label">{schemaName}</span>
                      </div>
                    )}

                    {/* Si es SQLite o el esquema está expandido, mostrar sus tablas */}
                    {(engineId === 'sqlite' || isSchemaExpanded) && (
                      <div className={engineId === 'sqlite' ? '' : 'tree-children'}>
                        {schemaTables.map(table => {
                          const isTableSelected = selectedNode?.type === 'table' && selectedNode?.name === table.name && selectedNode?.schema === schemaName;
                          return (
                            <div
                              key={table.name}
                              className={`tree-node level-2 ${isTableSelected ? 'selected' : ''}`}
                              onClick={() => onSelectNode({ type: 'table', name: table.name, schema: schemaName })}
                            >
                              <span className="tree-icon">📊</span>
                              <span className="tree-label">{table.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="schema-tree-container">
      <div className="schema-tree-header">
        <span>Árbol de Esquema</span>
      </div>
      <div className="schema-tree-body">
        {/* Nodos de Administración Básica */}
        <div className="tree-node-group section-admin">
          <div
            className={`tree-node level-0 ${selectedNode?.type === 'users' ? 'selected' : ''}`}
            onClick={() => onSelectNode({ type: 'users' })}
          >
            <span className="tree-icon">👥</span>
            <span className="tree-label">Usuarios y Roles</span>
          </div>
          <div
            className={`tree-node level-0 ${selectedNode?.type === 'credentials' ? 'selected' : ''}`}
            onClick={() => onSelectNode({ type: 'credentials' })}
          >
            <span className="tree-icon">🔑</span>
            <span className="tree-label">Llavero de Credenciales</span>
          </div>
        </div>

        <div className="tree-separator"></div>

        {/* Nodos del Esquema de Base de Datos */}
        {renderTreeNodes()}
      </div>
    </div>
  );
};
