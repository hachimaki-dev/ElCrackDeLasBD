# -*- coding: utf-8 -*-
import json, os

BASE = "/home/claude/sql-kb"
os.makedirs(f"{BASE}/engines", exist_ok=True)
TODAY = "2026-07-11"
SRC = "Documento del usuario: 'Comparativa arquitectonica de Oracle, SQL Server, PostgreSQL, MySQL, MariaDB y SQLite' (seccion Filosofia/Arquitectura/Diferencias filosoficas)"

oracle = {
    "schema_version": "1.0.0",
    "id": "oracle",
    "name": "Oracle Database",
    "vendor": "Oracle Corporation",
    "created_by": "Larry Ellison, Bob Miner y Ed Oates (Software Development Laboratories)",
    "first_release_year": 1977,
    "license_model": "Propietaria comercial. Existe edicion gratuita limitada (Express Edition / XE) y una Free Edition mas reciente; el resto requiere licenciamiento comercial.",
    "philosophy": (
        "Motor comercial de alto rendimiento orientado a grandes empresas y operaciones criticas, "
        "disenado para cargas OLTP y OLAP exigentes con foco en fiabilidad, disponibilidad y "
        "escalabilidad. Prioriza consistencia ACID rigida (undo/redo internos desde el diseno original) "
        "y funcionalidad avanzada (PL/SQL, particionado, replicacion, indices especializados) por sobre "
        "la simplicidad o la escalabilidad horizontal sencilla."
    ),
    "typical_use_cases": ["Banca y servicios financieros", "Telecomunicaciones", "ERP de gran escala", "Sistemas gubernamentales criticos", "Cargas mixtas OLTP/OLAP con SLA de disponibilidad 24/7"],
    "avoid_when": ["Proyectos pequenos o de bajo presupuesto (coste de licencia)", "Equipos sin experiencia DBA dedicada", "Necesidad de sharding horizontal simple"],
    "engine_architecture": (
        "Cliente-servidor con memoria compartida (SGA: buffer cache, shared pool, log buffer, large pool, "
        "java pool) y memoria privada por proceso (PGA: sorts, joins, sesiones). Procesos de fondo dedicados: "
        "DBWR (escritura de buffers sucios), LGWR (redo), CKPT (checkpoints), SMON/PMON (recuperacion y "
        "limpieza), ARCn (archiver), LCK (locks). Conexiones via proceso servidor dedicado o compartido "
        "(dispatcher). Optimizador cost-based (CBO) con ejecucion multi-hilo. Desde 12c soporta arquitectura "
        "multitenant (CDB con multiples PDB)."
    ),
    "physical_storage": (
        "Tablespaces compuestos por datafiles; los objetos viven en segmentos dentro de un tablespace, "
        "divididos en extents (grupos contiguos de bloques). Bloques (paginas) tipicamente de 2K-32K. "
        "Soporta tablas organizadas por indice (IOT). Redo logs circulares para durabilidad y undo "
        "segments para MVCC/lecturas consistentes."
    ),
    "memory_management": "SGA compartida (buffer cache, shared pool, log buffer, etc.) + PGA privada por proceso/usuario. Ajuste dinamico via Automatic Shared Memory Management.",
    "concurrency_model": (
        "MVCC implementado via segmentos de undo: las lecturas consistentes reconstruyen versiones "
        "anteriores de los datos leyendo redo/undo, evitando lecturas sucias sin bloquear escritores. "
        "Bloqueo a nivel de fila; deteccion y resolucion automatica de deadlocks. Nivel de aislamiento por "
        "defecto: READ COMMITTED, mediante snapshots internos."
    ),
    "users_and_permissions_model": "Cada USER es tambien un esquema (namespace de objetos). Los ROLE agrupan privilegios y se asignan a usuarios. Los PROFILE controlan limites de recursos y politicas de contrasena.",
    "security_features": ["Autenticacion LDAP/Kerberos/AD (Enterprise User Security)", "TLS/SSL en conexiones", "TDE (Transparent Data Encryption) en reposo", "Virtual Private Database / Row-Level Security", "Data Redaction (enmascarado al vuelo)", "Oracle Label Security", "Auditoria fina (AUDIT)"],
    "data_types_summary": ["NUMBER", "VARCHAR2 / NVARCHAR2", "RAW", "DATE / TIMESTAMP (con zona horaria)", "CLOB / BLOB", "XMLType", "JSON (nativo en versiones recientes, historicamente CLOB)", "SDO_GEOMETRY (espacial)", "Tipos objeto y colecciones (VARRAY, nested tables)"],
    "index_types": ["B-tree (estandar, reverse key, descendente, comprimido)", "Index-Organized Table (IOT)", "Bitmap (baja cardinalidad)", "Function-based (sobre expresiones)", "Domain Index", "Text Index (Oracle Text)", "XMLIndex"],
    "optimizer": "Cost-Based Optimizer (CBO) alimentado por estadisticas e histogramas (dbms_stats); soporta hints, SQL Profiles, planes adaptativos, Parallel Query y Resource Manager. El antiguo RBO (rule-based) esta obsoleto.",
    "replication_ha": ["Data Guard (standby fisico, switchover/failover)", "Active Data Guard (standby de solo lectura activo)", "GoldenGate (replicacion logica, CDC)", "Real Application Clusters (RAC, clustering activo-activo)", "Streams (legado)"],
    "backup_recovery": "RMAN (Recovery Manager) para backups completos/incrementales; Point-in-Time Recovery via redo/archivelogs; Flashback Query/Table/Database para recuperacion rapida sin restaurar backup completo.",
    "performance_profile": {
        "oltp": "Muy alto throughput transaccional con concurrencia masiva; aprovecha multiples nucleos y paralelismo intensivo.",
        "olap": "Fuerte en DW gracias a particionado, indices especializados (bitmap) y paralelismo; competitivo con SQL Server para analitica.",
        "concurrency": "Mecanismos avanzados: locks a nivel de fila, deteccion automatica de deadlocks, MVCC via undo.",
        "scalability": "RAC permite escalado horizontal en cluster compartiendo almacenamiento; tambien escala verticalmente con hardware de gran capacidad."
    },
    "sql_procedural_language": "PL/SQL (procedimientos, funciones, PACKAGES que agrupan logica relacionada, triggers).",
    "admin_tools": ["SQL*Plus", "RMAN", "Data Pump", "Oracle Enterprise Manager (OEM)", "SQL Developer", "AWR / ASH (repositorio y monitoreo de carga)"],
    "ecosystem": {"drivers": ["OCI", "ODBC", "JDBC (Type 4)"], "orms": ["Hibernate", "Entity Framework (via proveedor)", "otros ORMs Java/.NET estandar"]},
    "conceptual_equivalences": {
        "tablespace": "TABLESPACE (contenedor logico de datafiles)",
        "user_or_role": "USER = esquema; ROLE agrupa privilegios y se otorga a usuarios",
        "schema": "Coincide con el namespace del USER (no existe CREATE SCHEMA independiente de un usuario)",
        "sequence": "SEQUENCE",
        "package_or_module": "PACKAGE (agrupa procedimientos/funciones PL/SQL relacionados) -- sin equivalente directo en los demas motores",
        "clustered_storage": "Index-Organized Table (IOT), analoga a un clustered index",
        "large_object": "BLOB / CLOB",
        "json_support": "JSON almacenado historicamente como CLOB, con soporte nativo (OSON) en versiones recientes",
        "mvcc_mechanism": "Reconstruccion de versiones anteriores via UNDO segments"
    },
    "verify_current_status": "Verificar en la documentacion oficial de Oracle las ediciones vigentes (Free, Standard, Enterprise), precios y version actual soportada (19c/21c/23ai u otra mas reciente).",
    "completeness": {"status": "full", "last_updated": TODAY, "sources": [SRC]}
}

sqlserver = {
    "schema_version": "1.0.0",
    "id": "sqlserver",
    "name": "Microsoft SQL Server",
    "vendor": "Microsoft Corporation",
    "created_by": "Desarrollo conjunto inicial Sybase / Microsoft / Ashton-Tate (version 1.0, 1989, para OS/2); Microsoft continuo el desarrollo en solitario y lo llevo a Windows NT en 1993",
    "first_release_year": 1989,
    "license_model": "Propietaria comercial, con ediciones Express y Developer gratuitas.",
    "philosophy": (
        "RDBMS comercial integrado con el ecosistema Microsoft (.NET, Windows Authentication, herramientas "
        "de BI), pensado para facilidad de administracion y despliegue en entornos Windows, aunque hoy "
        "tambien corre en Linux y contenedores. Prioriza integracion, alta disponibilidad (AlwaysOn) y "
        "escalabilidad vertical, con curva de administracion mas suave que Oracle."
    ),
    "typical_use_cases": ["Entornos corporativos con infraestructura Microsoft/Windows", "Business Intelligence y reporting (SSRS/SSIS/SSAS)", "Finanzas, retail, sector publico", "Aplicaciones .NET"],
    "avoid_when": ["Infraestructura 100% Linux/open source sin tolerancia a licencias propietarias", "Esquemas fuertemente distribuidos/sharded"],
    "engine_architecture": (
        "Servidor multi-hilo (no lanza un proceso de SO por conexion). El motor de almacenamiento corre "
        "sobre SQLOS, que gestiona memoria y planificacion de hilos trabajadores (worker threads) mediante "
        "schedulers (uno por CPU). Usa un Buffer Pool global para paginas de datos/indices y una cache de "
        "planes de ejecucion. Tareas de fondo: lazy writer, checkpoint, log writer. Optimizador cost-based."
    ),
    "physical_storage": (
        "Archivos agrupados en filegroups (uno primario y opcionalmente secundarios) dentro de una base; "
        "los filegroups contienen archivos .mdf (primario) y .ndf (secundarios). Extents de 8 paginas (64 KB); "
        "paginas de 8 KB. Tablas heap (sin indice cluster) o con clustered index (B-tree, filas ordenadas "
        "fisicamente). El log de transacciones vive en archivos .ldf separados."
    ),
    "memory_management": "Buffer Pool unificado para datos e indices, mas cache de planes de ejecucion (Plan Cache/Procedure Cache). SQLOS gestiona limites minimo/maximo y memory grants por consulta de forma automatica.",
    "concurrency_model": (
        "Locking tradicional a nivel fila/pagina/tabla mas latches internos livianos. MVCC solo bajo "
        "SNAPSHOT ISOLATION (usa un version store en tempdb); por defecto usa READ COMMITTED con bloqueo "
        "(o su variante 'snapshot' en versiones recientes). Deteccion de deadlocks en el kernel."
    ),
    "users_and_permissions_model": "Distingue LOGIN (nivel servidor) de USER (nivel base de datos); roles de servidor y de base de datos; schemas como namespace (ej. dbo). Soporta Contained Users e integracion con Active Directory.",
    "security_features": ["Windows Authentication (Kerberos/NTLM) y SQL Authentication", "TLS/SSL", "TDE (Enterprise)", "Always Encrypted (cifrado columnar en cliente)", "Row-Level Security", "Dynamic Data Masking", "SQL Server Audit"],
    "data_types_summary": ["VARCHAR / NVARCHAR", "VARBINARY", "INT / BIGINT / DECIMAL", "DATETIME2 / DATETIMEOFFSET", "XML", "uniqueidentifier", "GEOMETRY / GEOGRAPHY (espacial)", "JSON nativo desde 2016 (almacenado como texto + funciones)"],
    "index_types": ["B-tree Clustered y Nonclustered", "Hash (tablas In-Memory OLTP)", "Columnstore (analitica/DW)", "Indices filtrados (con WHERE)", "Indices con columnas incluidas (covering)", "Spatial", "XML", "Full-Text (motor separado)"],
    "optimizer": "Cost-Based Optimizer con estadisticas/histogramas automaticos por columna; hints via OPTION; adaptive joins desde 2017+; plan caching y recompilacion segun parametros; paralelismo controlado por MAXDOP.",
    "replication_ha": ["Always On Availability Groups (sincrona/asincrona, failover automatico)", "Failover Cluster Instances", "Replicacion Snapshot/Transactional/Merge", "Log Shipping", "Grupos de disponibilidad georeplicados (Azure)"],
    "backup_recovery": "Modelos de recuperacion Full/Bulk-Logged/Simple; backups completos, diferenciales y de log para Point-in-Time Recovery; Database Snapshots para lectura rapida en ediciones que lo soportan.",
    "performance_profile": {
        "oltp": "Alto throughput con paralelismo intensivo; aprovecha bien multiples nucleos.",
        "olap": "Fuerte en DW gracias a indices Columnstore y particionado.",
        "concurrency": "Locking adaptativo/escalado; SNAPSHOT ISOLATION disponible para reducir bloqueos de lectura.",
        "scalability": "AlwaysOn y Failover Clustering para HA/escalado vertical; sharding manual (no hay equivalente nativo a RAC)."
    },
    "sql_procedural_language": "Transact-SQL (T-SQL): procedimientos almacenados, funciones, triggers.",
    "admin_tools": ["sqlcmd", "bcp", "SQL Server Management Studio (SSMS)", "Azure Data Studio", "Extended Events", "Database Engine Tuning Advisor", "Query Store"],
    "ecosystem": {"drivers": ["ODBC", "JDBC", "ADO.NET"], "orms": ["Entity Framework", "Dapper", "NHibernate"]},
    "conceptual_equivalences": {
        "tablespace": "FILEGROUP",
        "user_or_role": "LOGIN (servidor) + USER (base de datos), organizados en roles de servidor y de base de datos",
        "schema": "SCHEMA (namespace dentro de la base, ej. dbo)",
        "sequence": "SEQUENCE (desde SQL Server 2012)",
        "package_or_module": "Sin equivalente directo; se aproxima agrupando varios stored procedures bajo un mismo schema",
        "clustered_storage": "Clustered Index (filas ordenadas fisicamente por la clave del indice)",
        "large_object": "varbinary(max) / varchar(max) (los antiguos text/image estan deprecados)",
        "json_support": "JSON como texto (NVARCHAR) mas funciones nativas desde SQL Server 2016",
        "mvcc_mechanism": "Version store en tempdb, solo activo bajo SNAPSHOT ISOLATION"
    },
    "verify_current_status": "Verificar en Microsoft Learn la version actual (SQL Server 2022 u otra posterior), ediciones vigentes y equivalencias en Azure SQL Database/Managed Instance.",
    "completeness": {"status": "full", "last_updated": TODAY, "sources": [SRC]}
}

postgresql = {
    "schema_version": "1.0.0",
    "id": "postgresql",
    "name": "PostgreSQL",
    "vendor": "PostgreSQL Global Development Group (comunidad open source)",
    "created_by": "Michael Stonebraker (proyecto POSTGRES, UC Berkeley)",
    "first_release_year": 1989,
    "license_model": "Licencia PostgreSQL (estilo permisivo similar a BSD/MIT); uso comercial libre sin restricciones.",
    "philosophy": (
        "Sucesor de Ingres, nacido en Berkeley en 1986 y renombrado PostgreSQL en 1996 al incorporar SQL. "
        "Es la base relacional open source mas avanzada en cumplimiento de estandares, con enfasis en "
        "extensibilidad (tipos y modulos personalizados), integridad de datos y funciones avanzadas "
        "(JSON/JSONB, GIS via PostGIS, MVCC robusto). Favorece un diseno limpio y conceptualmente coherente "
        "sobre componentes propietarios monoliticos."
    ),
    "typical_use_cases": ["Startups y proyectos web que necesitan SQL avanzado gratis", "Aplicaciones con datos geoespaciales (PostGIS)", "Cargas con JSON/documentos semi-estructurados", "Sistemas que requieren extensibilidad (tipos, funciones, indices custom)"],
    "avoid_when": ["Se necesita soporte comercial formal tipo Oracle/Microsoft sin contratar terceros", "Equipos que dependen de GUI de administracion todo-en-uno nativa"],
    "engine_architecture": (
        "Cliente-servidor basado en procesos del sistema operativo. El proceso maestro Postmaster inicializa "
        "memoria compartida y forkea un proceso 'backend' independiente por cada conexion (parser, "
        "optimizador y ejecutor de esa sesion). Procesos de fondo: checkpointer, writer, wal writer, "
        "autovacuum launcher, archiver. Este aislamiento por proceso da robustez a costa de mas overhead "
        "que un modelo multi-hilo."
    ),
    "physical_storage": (
        "Tablespaces = directorios en disco; por defecto pg_global (objetos compartidos) y pg_default "
        "(datos de usuario). Cada tabla/indice es uno o mas archivos (nombrados por OID) particionados en "
        "paginas de 8 KB. No hay clustering automatico como en InnoDB; el comando CLUSTER reordena "
        "fisicamente una sola vez. El WAL (Write-Ahead Log) vive en archivos separados para recovery."
    ),
    "memory_management": "shared_buffers como cache global de paginas (parte fija reservada al arrancar). Memoria local por backend para operaciones (work_mem para sorts/hashes, maintenance_work_mem para VACUUM/creacion de indices) mas WAL buffers.",
    "concurrency_model": (
        "MVCC puro sin necesidad de latches para lecturas: cada fila lleva metadatos de version (xmin/xmax) "
        "y puede tener versiones antiguas conviviendo en el mismo heap. Las lecturas nunca bloquean "
        "escrituras ni viceversa entre transacciones distintas. VACUUM/autovacuum limpia versiones "
        "obsoletas (no hay segmentos de undo). SERIALIZABLE se implementa como serializable snapshot "
        "isolation detectando conflictos."
    ),
    "users_and_permissions_model": "Modelo unificado de ROLE: un rol puede tener LOGIN o no, y agrupar derechos; los roles pueden ser miembros de otros roles. Los SCHEMA son namespaces separados dentro de una base, independientes de los roles.",
    "security_features": ["Autenticacion md5/SCRAM, LDAP, GSSAPI/Kerberos, certificados SSL", "TLS/SSL en conexiones", "Row-Level Security (Row Security Policies) nativo", "Cifrado columnar via extension pgcrypto", "Auditoria via pgAudit o triggers"],
    "data_types_summary": ["TEXT / VARCHAR", "BYTEA", "NUMERIC", "SERIAL / GENERATED (identidad)", "DATE/TIMESTAMP/INTERVAL", "JSON y JSONB", "XML", "ARRAY", "HSTORE (clave-valor)", "UUID", "CIDR/INET", "rangos (range types)", "tipos geometricos / PostGIS"],
    "index_types": ["B-Tree (por defecto)", "Hash", "GiST", "SP-GiST", "GIN (indices invertidos: arrays, JSONB, texto)", "BRIN (tablas grandes ordenadas)", "Bloom (extension)", "Indices parciales (con WHERE)", "Indices por expresion", "Restricciones de exclusion"],
    "optimizer": "Cost-Based Optimizer parametrizado (random_page_cost, etc.), estadisticas via ANALYZE (manual o autovacuum). No acepta hints nativos. Soporta planificacion paralela (workers) desde la version 13+ y varios tipos de scan (index, bitmap, seq).",
    "replication_ha": ["Streaming Replication (fisica, WAL shipping)", "Logical Replication (publicaciones/suscripciones por tabla)", "Patroni (orquestacion HA)", "repmgr", "Citus (escalado distribuido)", "Bucardo (multi-master logico)"],
    "backup_recovery": "pg_dump/pg_restore para dumps logicos; pg_basebackup + WAL archiving para base backups fisicos y Point-in-Time Recovery. Herramientas de terceros: pgBackRest, Barman.",
    "performance_profile": {
        "oltp": "Muy solido; escala practicamente lineal en muchas cargas concurrentes de lectura/escritura gracias a MVCC sin bloqueos de lectura.",
        "olap": "Muy competente en agregaciones complejas y funciones analiticas (window functions, CTEs recursivos).",
        "concurrency": "Lecturas nunca bloquean escrituras; locks finos a nivel fila solo ante conflictos reales de escritura.",
        "scalability": "Escala verticalmente muy bien (mas nucleos/memoria) y horizontalmente via Citus o replicas de lectura; no tiene un RAC nativo."
    },
    "sql_procedural_language": "PL/pgSQL (con soporte de PROCEDURE desde v11), ademas de PL/Python, PL/Perl, PL/Tcl y otros lenguajes embebibles.",
    "admin_tools": ["psql", "pg_ctl", "pgAdmin", "DBeaver", "pg_basebackup", "pgBackRest", "Patroni", "pg_stat_statements"],
    "ecosystem": {"drivers": ["libpq", "psycopg", "JDBC", "ODBC", "Go pq/pgx"], "orms": ["Hibernate", "Django ORM", "SQLAlchemy", "ActiveRecord"]},
    "conceptual_equivalences": {
        "tablespace": "TABLESPACE (directorio en disco)",
        "user_or_role": "ROLE unificado (con o sin atributo LOGIN)",
        "schema": "SCHEMA (namespace dentro de la base, independiente de los roles)",
        "sequence": "SEQUENCE",
        "package_or_module": "No existe el concepto de PACKAGE",
        "clustered_storage": "No hay clustering automatico; CLUSTER reordena fisicamente una vez",
        "large_object": "BYTEA / TEXT",
        "json_support": "JSONB (binario, indexable con GIN) y JSON (texto)",
        "mvcc_mechanism": "MVCC puro via xmin/xmax en cada fila, con limpieza por VACUUM"
    },
    "verify_current_status": "Verificar en postgresql.org la version mayor actual y el calendario de soporte (PostgreSQL publica una version mayor por ano).",
    "completeness": {"status": "full", "last_updated": TODAY, "sources": [SRC]}
}

mysql = {
    "schema_version": "1.0.0",
    "id": "mysql",
    "name": "MySQL",
    "vendor": "Oracle Corporation (desde la adquisicion de Sun Microsystems en 2010; originalmente MySQL AB)",
    "created_by": "Michael 'Monty' Widenius, David Axmark y Allan Larsson",
    "first_release_year": 1995,
    "license_model": "Community Edition bajo GPL (gratuita); Oracle ofrece ediciones Enterprise/Cluster comerciales con caracteristicas adicionales.",
    "philosophy": (
        "Base relacional open source enfocada en simplicidad y velocidad, originada para entornos web "
        "(pila LAMP). Disenada para cargas OLTP ligeras/moderadas con concurrencia manejable; su SQL es "
        "historicamente mas limitado que el de PostgreSQL/Oracle. Prioriza facilidad de uso y rendimiento "
        "practico en lectura/escritura basica sobre la sofisticacion analitica."
    ),
    "typical_use_cases": ["Aplicaciones web y SaaS de pequena/mediana escala", "CMS (WordPress, Joomla) y e-commerce", "Proyectos con presupuesto ajustado que requieren SQL relacional estandar"],
    "avoid_when": ["Transacciones muy complejas con control de concurrencia estricto", "Analitica avanzada que dependa de tipos/indices muy especializados"],
    "engine_architecture": (
        "Modelo multi-hilo: un thread del sistema operativo por conexion. El servidor mysqld aloja el "
        "frontend (listener, parser, optimizador) y delega el almacenamiento a un motor pluggable (InnoDB "
        "por defecto). InnoDB mantiene su propio Buffer Pool global para paginas de datos/indices; los "
        "cambios se escriben primero al redo log y luego a los tablespaces."
    ),
    "physical_storage": (
        "InnoDB usa un tablespace global (ibdata1) y/o archivos por tabla (.ibd, file-per-table). Paginas "
        "de 16 KB por defecto organizadas como B+Tree clusterizado por PRIMARY KEY (las filas quedan "
        "fisicamente ordenadas por PK); los indices secundarios son B+Trees que apuntan a la PK. Redo log "
        "en archivos ib_logfile*."
    ),
    "memory_management": "InnoDB Buffer Pool (tipicamente 70-80% de la RAM disponible) cachea paginas de datos e indices, con un change buffer para paginas de indice sucias. innodb_log_buffer_size agrupa escrituras antes de bajarlas al redo log. No hay equivalente a SGA/PGA: solo el buffer pool y el stack por thread.",
    "concurrency_model": (
        "MVCC via undo logs de InnoDB: cada fila modificada queda marcada con un transaction id y el undo "
        "guarda versiones previas para lecturas consistentes. Nivel de aislamiento por defecto REPEATABLE "
        "READ (a diferencia de la mayoria de motores que usan READ COMMITTED). Locks de fila y next-key "
        "locks para evitar phantom reads; deteccion de deadlocks integrada."
    ),
    "users_and_permissions_model": "Cuentas identificadas como usuario@host con privilegios globales, por base, por tabla o por columna. Roles asignables agregados en MySQL 8. Sin distincion de esquema separada de la base de datos (SCHEMA es sinonimo de DATABASE).",
    "security_features": ["Autenticacion via plugins (nativo, sha256_password, LDAP/PAM en Enterprise)", "TLS/SSL", "TDE (Enterprise)", "Masking y auditing (Enterprise)", "Cifrado de tablas InnoDB y binlogs"],
    "data_types_summary": ["CHAR / VARCHAR", "TEXT / BLOB", "DECIMAL / NUMERIC", "INT / DATE / TIMESTAMP", "ENUM", "SET", "JSON nativo (desde 5.7)", "Tipos espaciales (GEOMETRY, POINT, etc. desde 5.7 con InnoDB)"],
    "index_types": ["B-tree (InnoDB clusterizado por PK; tambien MyISAM)", "Full-Text (MyISAM y, desde 5.6, InnoDB)", "Hash (motor MEMORY)", "R-Tree / espacial (desde 5.7)"],
    "optimizer": "Cost-Based Optimizer completo desde 5.7+ con analisis de indices y estadisticas (menos histogramas complejos que Oracle/SQL Server hasta versiones recientes). Soporta hints en comentarios (/*+ */), variables optimizer_switch, index merge, index condition pushdown. Sin paralelismo real dentro de una sola consulta.",
    "replication_ha": ["Replicacion clasica maestro-esclavo (binlog + relay log)", "Replicacion semisincrona", "Group Replication (multi-master con consenso)", "MySQL Cluster / NDB (datos en memoria/cluster)", "Herramientas externas: Percona XtraDB Cluster, Orchestrator, ProxySQL"],
    "backup_recovery": "mysqldump (logico), MySQL Enterprise Backup o Percona XtraBackup (fisico, online). Binary logs (binlog) habilitan replicacion y Point-in-Time Recovery.",
    "performance_profile": {
        "oltp": "Muy rapido en lecturas/escrituras sencillas; bajo cargas transaccionales muy grandes puede sufrir mas contencion de locks que PostgreSQL/Oracle.",
        "olap": "Historicamente limitado para analitica compleja, aunque mejoro con CTEs y window functions desde 8.0.",
        "concurrency": "Buena escalabilidad en lecturas; muchas escrituras simultaneas pueden generar contencion de fila e I/O de log.",
        "scalability": "Tradicionalmente horizontal via sharding manual y replicacion maestro-esclavo; NDB Cluster para escenarios en memoria."
    },
    "sql_procedural_language": "Procedimientos y funciones almacenadas, triggers; sin el concepto de PACKAGE de Oracle y con capacidades de variables/control de flujo mas limitadas.",
    "admin_tools": ["mysql (CLI)", "mysqladmin", "MySQL Workbench", "HeidiSQL", "phpMyAdmin", "Performance Schema", "Percona Toolkit"],
    "ecosystem": {"drivers": ["Connector/J (JDBC)", "ODBC", "libmysqlclient / mysqlclient"], "orms": ["Doctrine", "Rails Active Record", "Django ORM (via conector)", "practicamente todo ORM del ecosistema web"]},
    "conceptual_equivalences": {
        "tablespace": "No expuesto tradicionalmente (tablespace general opcional desde 8.0)",
        "user_or_role": "Cuenta usuario@host + privilegios; roles asignables desde 8.0",
        "schema": "Sinonimo de DATABASE (no es un namespace separado dentro de una base)",
        "sequence": "AUTO_INCREMENT (no existe SEQUENCE independiente como en MariaDB/Oracle/PostgreSQL)",
        "package_or_module": "No existe el concepto",
        "clustered_storage": "InnoDB clusteriza implicitamente por PRIMARY KEY",
        "large_object": "BLOB / TEXT",
        "json_support": "Tipo JSON nativo desde 5.7",
        "mvcc_mechanism": "Undo logs de InnoDB (transaction id + puntero de rollback por fila)"
    },
    "verify_current_status": "Verificar en la documentacion oficial de MySQL la version mayor vigente (8.x u otra posterior) y las diferencias exactas entre Community y Enterprise.",
    "completeness": {"status": "full", "last_updated": TODAY, "sources": [SRC]}
}

mariadb = {
    "schema_version": "1.0.0",
    "id": "mariadb",
    "name": "MariaDB Server",
    "vendor": "MariaDB Foundation / MariaDB Corporation (comunidad + soporte comercial)",
    "created_by": "Michael 'Monty' Widenius (fork de MySQL)",
    "first_release_year": 2009,
    "license_model": "GPLv2 (Community); MariaDB Corporation ofrece ediciones y soporte de pago.",
    "philosophy": (
        "Fork de MySQL creado en 2009 en respuesta a la adquisicion de MySQL AB por Sun Microsystems "
        "(2008) y la posterior compra de Sun por Oracle (2010), buscando garantizar el futuro abierto del "
        "proyecto. Mantiene compatibilidad como reemplazo 'drop-in' de MySQL y agrega motores de "
        "almacenamiento adicionales (Aria, ColumnStore) y mejoras de optimizador impulsadas por la "
        "comunidad."
    ),
    "typical_use_cases": ["Reemplazo directo de MySQL buscando mejoras de rendimiento/optimizador", "Clustering multi-master nativo (Galera)", "Proyectos que priorizan gobernanza abierta frente a Oracle"],
    "avoid_when": ["Se depende de una caracteristica MySQL Enterprise sin equivalente en MariaDB", "Se requiere maxima compatibilidad certificada con herramientas que solo validan contra MySQL"],
    "engine_architecture": (
        "Estructuralmente muy similar a MySQL: modelo multi-hilo con InnoDB como motor por defecto. No "
        "existe un buffer pool central distinto por encima de los motores de almacenamiento: cada uno "
        "mantiene su propia cache (InnoDB Buffer Pool grande en la practica). Agrega hilos de replicacion "
        "Galera y de limpieza en segundo plano segun el motor usado."
    ),
    "physical_storage": "Igual esquema que InnoDB de MySQL (tablespace compartido y/o por tabla, paginas de 16 KB, indices B-tree). Motores alternativos: Aria (sucesor de MyISAM, archivos .MAI/.MAD) y ColumnStore (almacenamiento columnar propio).",
    "memory_management": "InnoDB Buffer Pool grande como en MySQL; no hay un pool central unico. Cada motor (Aria, ColumnStore) gestiona sus propios buffers. Las conexiones consumen stack local por thread.",
    "concurrency_model": "Mismo modelo que MySQL/InnoDB: MVCC via undo logs, REPEATABLE READ por defecto, next-key locks, deteccion de deadlocks. Adicionalmente, MariaDB Galera Cluster ofrece replicacion sincrona multi-master basada en certificacion de escritura (write-set certification).",
    "users_and_permissions_model": "Igual que MySQL (cuenta usuario@host); soporta ROLES asignables desde la version 10.2 (antes que MySQL los agregara en 8.0).",
    "security_features": ["Autenticacion via plugins (nativo, PAM, LDAP en Enterprise)", "TLS/SSL", "Data masking y auditing en ediciones Enterprise", "Cifrado de tablas InnoDB/Aria"],
    "data_types_summary": ["Mismo conjunto base que MySQL (CHAR/VARCHAR/TEXT/BLOB/DECIMAL/DATE/TIMESTAMP/ENUM/SET)", "JSON (alias de LONGTEXT con validacion, compatible con la sintaxis JSON de MySQL)", "SEQUENCE nativa (desde 10.3, ademas de AUTO_INCREMENT)"],
    "index_types": ["B-tree (InnoDB/Aria)", "Full-Text", "Hash (motor MEMORY)", "R-Tree/espacial", "Indices propios de ColumnStore"],
    "optimizer": "Basado en el optimizador de MySQL con mejoras propias de la comunidad (por ejemplo, optimizaciones para UNION ALL de subconsultas e indices multiples). Soporta hints y variables optimizer_switch similares a MySQL.",
    "replication_ha": ["Replicacion clasica maestro-esclavo (compatible con binlog de MySQL)", "MariaDB Galera Cluster (multi-master sincrono, integrado)", "MaxScale (proxy/enrutador inteligente)", "Spider (sharding)"],
    "backup_recovery": "mysqldump (logico) y mariabackup (fork de Percona XtraBackup, fisico/online), compatibles con el ecosistema de herramientas de MySQL.",
    "performance_profile": {
        "oltp": "Comparable a MySQL/InnoDB, con optimizaciones adicionales del optimizador comunitario.",
        "olap": "Mejorable via el motor ColumnStore para cargas analiticas; el motor InnoDB por defecto tiene las mismas limitaciones que MySQL.",
        "concurrency": "Igual perfil que MySQL/InnoDB; Galera anade concurrencia multi-master sincrona.",
        "scalability": "Galera Cluster para multi-master verdadero; Spider para sharding; replicacion maestro-esclavo tradicional."
    },
    "sql_procedural_language": "Procedimientos y funciones almacenadas, triggers -- compatibles en su mayoria con la sintaxis de MySQL.",
    "admin_tools": ["mysql/mariadb CLI", "HeidiSQL", "phpMyAdmin", "MariaDB Galera Cluster tools", "MaxScale"],
    "ecosystem": {"drivers": ["MariaDB Connector/J", "MariaDB Connector/C", "ODBC", "compatibles con la mayoria de drivers de MySQL"], "orms": ["Los mismos que MySQL: Doctrine, Rails Active Record, Django ORM, etc."]},
    "conceptual_equivalences": {
        "tablespace": "No expuesto tradicionalmente, igual que MySQL",
        "user_or_role": "Cuenta usuario@host + privilegios; ROLES asignables desde 10.2",
        "schema": "Sinonimo de DATABASE, igual que MySQL",
        "sequence": "SEQUENCE nativa (10.3+) ademas de AUTO_INCREMENT",
        "package_or_module": "No existe el concepto",
        "clustered_storage": "InnoDB clusteriza implicitamente por PRIMARY KEY",
        "large_object": "BLOB / TEXT",
        "json_support": "Alias JSON sobre LONGTEXT, compatible con las funciones JSON de MySQL",
        "mvcc_mechanism": "Undo logs de InnoDB, igual que MySQL"
    },
    "verify_current_status": "Verificar en mariadb.org la version mayor vigente y el estado de compatibilidad con la ultima version de MySQL, que ha ido divergiendo con el tiempo.",
    "completeness": {"status": "full", "last_updated": TODAY, "sources": [SRC]}
}

sqlite = {
    "schema_version": "1.0.0",
    "id": "sqlite",
    "name": "SQLite",
    "vendor": "D. Richard Hipp / SQLite Consortium (dominio publico)",
    "created_by": "D. Richard Hipp",
    "first_release_year": 2000,
    "license_model": "Dominio publico (sin restricciones de uso, modificacion o redistribucion).",
    "philosophy": (
        "Motor SQL embebido escrito en C bajo la filosofia de ser 'ligero y autonomo': no requiere "
        "servidor ni configuracion, ocupa pocos KB y prioriza fiabilidad y economia de recursos por sobre "
        "concurrencia o escalabilidad. Es probablemente el motor de base de datos mas usado del mundo por "
        "volumen de instalaciones, embebido en smartphones, navegadores y miles de productos. Su enfoque "
        "contrasta deliberadamente con el de las bases de datos cliente-servidor tradicionales."
    ),
    "typical_use_cases": ["Aplicaciones moviles (Android, iOS)", "Aplicaciones de escritorio ligeras", "Almacenamiento embebido en dispositivos IoT", "Pruebas unitarias / bases de datos locales de desarrollo", "Cache local dentro de otra aplicacion (navegadores)"],
    "avoid_when": ["Alta concurrencia de escritura multiusuario", "Necesidad de servir datos por red a multiples clientes remotos simultaneos", "Cargas transaccionales masivas tipicas de un backend central"],
    "engine_architecture": (
        "No tiene arquitectura cliente-servidor ni proceso demonio: es una libreria embebida directamente "
        "en el proceso de la aplicacion, que actua como su propio 'servidor'. No hay memoria compartida "
        "central entre procesos (salvo lo que provee el modo WAL via archivo -shm); usa primitivas del "
        "sistema operativo para bloquear archivos. El 'pager' interno administra transacciones y ACID "
        "mediante journal o WAL en disco."
    ),
    "physical_storage": (
        "Toda la base de datos es un unico archivo en disco, subdividido logicamente en paginas "
        "(configurable, 1024-65536 bytes). Dos tipos de paginas B-tree: table B-tree (filas) e index "
        "B-tree (solo claves); cada tabla/indice es un B-tree separado dentro del mismo archivo. No existen "
        "tablespaces ni segmentos multiples."
    ),
    "memory_management": "Pager cache configurable via PRAGMA cache_size, complementado por el buffer cache del sistema operativo. No distingue caches separadas para datos/indices (todo es B-tree); sin pool global ni cache de planes real.",
    "concurrency_model": (
        "El pager maneja transacciones via rollback journal (modo clasico) o WAL (Write-Ahead Logging, "
        "modo mas concurrente). En rollback mode se bloquea toda la base durante el commit (lock EXCLUSIVE "
        "breve) y no hay lecturas simultaneas al escritor. En modo WAL, multiples lectores no bloquean al "
        "escritor, pero solo un escritor a la vez (un unico lock de escritura para toda la base). No hay "
        "MVCC real por fila; el WAL simula snapshots consistentes por lector. Estados de lock internos: "
        "SHARED, RESERVED, PENDING, EXCLUSIVE."
    ),
    "users_and_permissions_model": "No existe un sistema de usuarios a nivel SQL. El control de acceso se delega enteramente a los permisos del sistema de archivos del sistema operativo sobre el archivo .db.",
    "security_features": ["Sin autenticacion ni TLS nativos (no hay servidor de red)", "SQLite Encryption Extension (SEE) para cifrado completo de archivo (extension comercial de pago)", "Seguridad y auditoria deben implementarse en la capa de aplicacion"],
    "data_types_summary": ["Tipado dinamico con 'storage classes': NULL, INTEGER, REAL, TEXT, BLOB", "Afinidad de columna declarada pero no estrictamente forzada", "Sin tipos espaciales nativos (existe extension R-Tree)", "JSON manejado como TEXT via extension JSON1 (funciones JSON, no un tipo de almacenamiento nativo)"],
    "index_types": ["B-tree (unico tipo nativo)", "R-Tree (extension, para datos espaciales)", "FTS3/FTS4/FTS5 (Full-Text Search via tablas virtuales, actuan como indices invertidos)"],
    "optimizer": "Optimizador heuristico, no cost-based completo; usa cardinalidades estimadas simples (PRAGMA stats) en vez de estadisticas/histogramas complejos. Soporta uso de indices y varios tipos de plan desde la version 3.8, pero no admite hints ni paralelismo intra-consulta.",
    "replication_ha": ["Ninguna nativa: SQLite no incluye replicacion ni clustering", "Soluciones externas: Litestream (streaming de WAL a almacenamiento remoto), rqlite (capa distribuida sobre SQLite via Raft)"],
    "backup_recovery": "Copia directa del archivo (en modo offline/consistente) o Backup API para copiar en caliente. Sin logs de transaccion separados en modo rollback; en modo WAL el archivo .wal puede contener transacciones aun no aplicadas. Sin PITR nativo.",
    "performance_profile": {
        "oltp": "Extremadamente rapido en lectura por conexion unica (uso local, sin latencia de red), pero no escala con escrituras concurrentes.",
        "olap": "No es un motor pensado para OLAP dado su diseno simple y de un solo escritor.",
        "concurrency": "La mas limitada de todos los motores comparados: multiples lectores, un unico escritor a la vez.",
        "scalability": "No escala horizontalmente ni verticalmente en el sentido tradicional; cada archivo/proceso es independiente."
    },
    "sql_procedural_language": None,
    "admin_tools": ["sqlite3 (CLI oficial)", "DB Browser for SQLite (GUI de terceros)", "SQLiteStudio (GUI de terceros)", "PRAGMA integrity_check para verificacion"],
    "ecosystem": {"drivers": ["API C nativa", "SQLite JDBC", "ODBC de terceros", "bindings en practicamente todos los lenguajes (Python sqlite3, etc.)"], "orms": ["SQLAlchemy", "Entity Framework Core", "usado por casi todos los ORMs como backend de test/local"]},
    "conceptual_equivalences": {
        "tablespace": "No aplica (un unico archivo)",
        "user_or_role": "No existe; el control de acceso es a nivel de sistema de archivos",
        "schema": "No hay namespaces separados dentro del archivo; ATTACH DATABASE permite adjuntar otro archivo bajo un alias",
        "sequence": "Columna INTEGER PRIMARY KEY (rowid), opcionalmente con AUTOINCREMENT (menos flexible que una SEQUENCE real)",
        "package_or_module": "No existe el concepto",
        "clustered_storage": "La tabla misma es un B-tree ordenado por rowid (o por PK en tablas WITHOUT ROWID)",
        "large_object": "BLOB / TEXT (sin distincion real de tamano maximo)",
        "json_support": "Extension JSON1: funciones JSON sobre columnas TEXT (no es un tipo de almacenamiento nativo)",
        "mvcc_mechanism": "Simulado via modo WAL: cada lector ve el snapshot del punto de inicio de su transaccion sin bloquear al escritor"
    },
    "verify_current_status": "Verificar en sqlite.org la version 3.x actual; SQLite mantiene fuerte compatibilidad hacia atras, por lo que los cambios relevantes suelen ser aditivos.",
    "completeness": {"status": "full", "last_updated": TODAY, "sources": [SRC]}
}

data = {"oracle": oracle, "sqlserver": sqlserver, "postgresql": postgresql, "mysql": mysql, "mariadb": mariadb, "sqlite": sqlite}
for k, v in data.items():
    with open(f"{BASE}/engines/{k}.json", "w", encoding="utf-8") as f:
        json.dump(v, f, ensure_ascii=False, indent=2)

print(f"{len(data)} perfiles de motor escritos OK")
