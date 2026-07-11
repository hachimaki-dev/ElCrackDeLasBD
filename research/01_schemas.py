import json, os

BASE = "/home/claude/sql-kb"
os.makedirs(f"{BASE}/schema", exist_ok=True)

ENGINES = ["oracle", "sqlserver", "postgresql", "mysql", "mariadb", "sqlite"]

# ---------------------------------------------------------------------------
# command.schema.json
# ---------------------------------------------------------------------------
command_schema = {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "https://sql-kb.dev/schema/command.schema.json",
    "title": "SQL-KB Command Entry",
    "description": (
        "Estructura de una entrada de comando/concepto SQL en la base de "
        "conocimiento multi-motor. Todo archivo en commands/**/*.json debe "
        "validar contra este esquema. additionalProperties=true a nivel raiz "
        "para permitir crecimiento organico controlado (campos nuevos no "
        "rompen la validacion; se recomienda igual documentarlos aqui cuando "
        "se estabilicen)."
    ),
    "type": "object",
    "additionalProperties": True,
    "required": ["schema_version", "id", "category", "name", "engines_supported", "concept", "syntax", "completeness"],
    "$defs": {
        "engineId": {
            "type": "string",
            "enum": ENGINES,
            "description": "Identificador canonico y estable de motor. No renombrar: se usa como clave de join entre archivos."
        },
        "syntaxEntry": {
            "type": "object",
            "required": ["supported"],
            "properties": {
                "supported": {"type": "boolean", "description": "false si el motor no tiene una sentencia SQL equivalente directa (ver 'notes' para la alternativa)."},
                "pattern": {"type": "string", "description": "Plantilla SQL representativa; [corchetes] = clausula opcional."},
                "notes": {"type": "string"}
            }
        },
        "example": {
            "type": "object",
            "required": ["title", "code"],
            "properties": {
                "title": {"type": "string"},
                "engine": {"$ref": "#/$defs/engineId"},
                "code": {"type": "string"},
                "explanation": {"type": "string"}
            }
        },
        "counterExample": {
            "type": "object",
            "required": ["title", "code"],
            "properties": {
                "title": {"type": "string"},
                "engine": {"type": "string", "description": "engineId, o 'multiple'/'general' si aplica a varios motores"},
                "code": {"type": "string"},
                "error": {"type": "string"},
                "fix": {"type": "string"}
            }
        },
        "commonError": {
            "type": "object",
            "required": ["engine", "message", "cause", "solution"],
            "properties": {
                "engine": {"$ref": "#/$defs/engineId"},
                "error_code": {"type": ["string", "null"]},
                "message": {"type": "string"},
                "cause": {"type": "string"},
                "solution": {"type": "string"}
            }
        },
        "antiPattern": {
            "type": "object",
            "required": ["pattern", "why_bad"],
            "properties": {
                "pattern": {"type": "string"},
                "why_bad": {"type": "string"},
                "instead": {"type": "string"}
            }
        },
        "faqEntry": {
            "type": "object",
            "required": ["q", "a"],
            "properties": {"q": {"type": "string"}, "a": {"type": "string"}}
        },
        "exerciseEntry": {
            "type": "object",
            "required": ["level", "prompt"],
            "properties": {
                "level": {"type": "string", "enum": ["basico", "intermedio", "avanzado", "experto"]},
                "prompt": {"type": "string"}
            }
        },
        "officialReference": {
            "type": "object",
            "required": ["title"],
            "properties": {
                "engine": {"anyOf": [{"$ref": "#/$defs/engineId"}, {"type": "null"}]},
                "title": {"type": "string"},
                "note": {"type": "string"}
            }
        },
        "equivalence": {
            "type": "object",
            "required": ["from_engine", "to_engine"],
            "properties": {
                "from_engine": {"$ref": "#/$defs/engineId"},
                "to_engine": {"$ref": "#/$defs/engineId"},
                "notes": {"type": "string"},
                "example_from": {"type": "string"},
                "example_to": {"type": "string"}
            }
        },
        "differenceRow": {
            "type": "object",
            "required": ["aspect", "values"],
            "properties": {
                "aspect": {"type": "string"},
                "values": {
                    "type": "object",
                    "propertyNames": {"$ref": "#/$defs/engineId"},
                    "additionalProperties": {"type": "string"}
                }
            }
        }
    },
    "properties": {
        "schema_version": {"type": "string", "const": "1.0.0"},
        "id": {"type": "string", "pattern": "^[A-Z][A-Z0-9_]*$", "description": "UPPER_SNAKE_CASE estable. Ej: CREATE_DATABASE."},
        "category": {
            "type": "string",
            "enum": ["DDL", "DML", "DQL", "TCL", "DCL", "ANALYTIC", "ADMIN", "CONCEPT"],
            "description": "DDL=definicion de esquema, DML=modificacion de datos, DQL=consulta pura, TCL=control de transacciones, DCL=permisos, ANALYTIC=funciones de ventana/analiticas, ADMIN=administracion especifica de motor, CONCEPT=concepto transversal no atado a un solo comando (ej. MVCC, ACID)."
        },
        "subcategory": {"type": "string"},
        "name": {"type": "string"},
        "aliases": {"type": "array", "items": {"type": "string"}},
        "level": {"type": "string", "description": "Texto libre. Sugerido: basico | intermedio | avanzado | experto | combinaciones."},
        "engines_supported": {"type": "array", "items": {"$ref": "#/$defs/engineId"}, "minItems": 1, "uniqueItems": True},
        "min_versions": {"type": "object", "propertyNames": {"$ref": "#/$defs/engineId"}, "additionalProperties": {"type": "string"}},
        "version_milestones": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["engine", "change"],
                "properties": {"engine": {"$ref": "#/$defs/engineId"}, "version": {"type": "string"}, "change": {"type": "string"}}
            }
        },
        "related_topics": {
            "type": "array",
            "items": {"type": "string"},
            "description": "IDs de otras entradas, o sugerencias marcadas '(sugerido)' para expansion horizontal futura. Forma un grafo navegable."
        },
        "ansi_sql_standard": {"type": ["string", "null"], "description": "Si el comando esta definido en ISO/IEC 9075 y desde que edicion, o null si es extension propietaria."},
        "tags": {"type": "array", "items": {"type": "string"}},
        "concept": {
            "type": "object",
            "required": ["summary"],
            "properties": {"summary": {"type": "string"}, "why_it_exists": {"type": "string"}, "history": {"type": "string"}}
        },
        "semantics": {
            "type": "object",
            "propertyNames": {"$ref": "#/$defs/engineId"},
            "additionalProperties": {
                "type": "object",
                "properties": {
                    "guarantees": {"type": "array", "items": {"type": "string"}},
                    "does_not_guarantee": {"type": "array", "items": {"type": "string"}},
                    "behavior": {"type": "string"}
                }
            }
        },
        "internal_architecture": {"type": "object", "propertyNames": {"$ref": "#/$defs/engineId"}, "additionalProperties": {"type": "string"}},
        "syntax": {"type": "object", "propertyNames": {"$ref": "#/$defs/engineId"}, "additionalProperties": {"$ref": "#/$defs/syntaxEntry"}},
        "anatomy": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["clause", "description"],
                "properties": {"clause": {"type": "string"}, "description": {"type": "string"}, "applies_to": {"type": "array", "items": {"$ref": "#/$defs/engineId"}}}
            }
        },
        "internal_flow": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["step", "name", "description"],
                "properties": {"step": {"type": "integer"}, "name": {"type": "string"}, "description": {"type": "string"}}
            }
        },
        "involved_objects": {"type": "object", "propertyNames": {"$ref": "#/$defs/engineId"}, "additionalProperties": {"type": "array", "items": {"type": "string"}}},
        "dependencies": {
            "type": "object",
            "properties": {
                "requires": {"type": "array", "items": {"type": "string"}},
                "creates": {"type": "array", "items": {"type": "string"}},
                "modifies": {"type": "array", "items": {"type": "string"}},
                "destroys": {"type": "array", "items": {"type": "string"}}
            }
        },
        "permissions": {
            "type": "object",
            "propertyNames": {"$ref": "#/$defs/engineId"},
            "additionalProperties": {"type": "object", "properties": {"required_privilege": {"type": "string"}, "example": {"type": "string"}}}
        },
        "security_notes": {"type": "array", "items": {"type": "string"}},
        "examples": {"type": "array", "items": {"$ref": "#/$defs/example"}},
        "counter_examples": {"type": "array", "items": {"$ref": "#/$defs/counterExample"}},
        "edge_cases": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["description"],
                "properties": {"description": {"type": "string"}, "engines": {"type": "array", "items": {"$ref": "#/$defs/engineId"}}}
            }
        },
        "engine_differences_matrix": {"type": "array", "items": {"$ref": "#/$defs/differenceRow"}},
        "equivalences": {"type": "array", "items": {"$ref": "#/$defs/equivalence"}},
        "migration_notes": {"type": "array", "items": {"type": "string"}},
        "performance": {"type": "object", "propertyNames": {"$ref": "#/$defs/engineId"}, "additionalProperties": {"type": "string"}},
        "internals": {"type": "object", "propertyNames": {"$ref": "#/$defs/engineId"}, "additionalProperties": {"type": "array", "items": {"type": "string"}}},
        "common_errors": {"type": "array", "items": {"$ref": "#/$defs/commonError"}},
        "best_practices": {"type": "array", "items": {"type": "string"}},
        "anti_patterns": {"type": "array", "items": {"$ref": "#/$defs/antiPattern"}},
        "exercises": {"type": "array", "items": {"$ref": "#/$defs/exerciseEntry"}},
        "faq": {"type": "array", "items": {"$ref": "#/$defs/faqEntry"}},
        "official_references": {"type": "array", "items": {"$ref": "#/$defs/officialReference"}},
        "ai_tooling": {
            "type": "object",
            "description": "Metadatos pensados para consumo por LSP, agentes/IA y sistemas RAG.",
            "properties": {
                "snippet_prefixes": {"type": "object", "propertyNames": {"$ref": "#/$defs/engineId"}, "additionalProperties": {"type": "string"}},
                "hover_summary": {"type": "string"},
                "syntax_tokens": {"type": "array", "items": {"type": "string"}},
                "intent_keywords": {"type": "array", "items": {"type": "string"}},
                "risk_level": {"type": "string", "enum": ["read-only", "reversible", "destructive", "irreversible"]},
                "requires_confirmation": {"type": "boolean"}
            }
        },
        "completeness": {
            "type": "object",
            "required": ["status"],
            "properties": {
                "status": {"type": "string", "enum": ["stub", "partial", "full"]},
                "missing_sections": {"type": "array", "items": {"type": "string"}},
                "last_updated": {"type": "string", "format": "date"},
                "sources": {"type": "array", "items": {"type": "string"}}
            }
        }
    }
}

# ---------------------------------------------------------------------------
# engine.schema.json
# ---------------------------------------------------------------------------
engine_schema = {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "https://sql-kb.dev/schema/engine.schema.json",
    "title": "SQL-KB Engine Profile",
    "description": "Perfil arquitectonico y operativo de un motor de base de datos. Un archivo por motor en engines/*.json.",
    "type": "object",
    "additionalProperties": True,
    "required": ["schema_version", "id", "name", "vendor", "license_model", "philosophy", "completeness"],
    "properties": {
        "schema_version": {"type": "string", "const": "1.0.0"},
        "id": {"type": "string", "enum": ENGINES},
        "name": {"type": "string"},
        "vendor": {"type": "string"},
        "created_by": {"type": "string"},
        "first_release_year": {"type": "integer"},
        "license_model": {"type": "string"},
        "philosophy": {"type": "string"},
        "typical_use_cases": {"type": "array", "items": {"type": "string"}},
        "avoid_when": {"type": "array", "items": {"type": "string"}},
        "engine_architecture": {"type": "string"},
        "physical_storage": {"type": "string"},
        "memory_management": {"type": "string"},
        "concurrency_model": {"type": "string"},
        "users_and_permissions_model": {"type": "string"},
        "security_features": {"type": "array", "items": {"type": "string"}},
        "data_types_summary": {"type": "array", "items": {"type": "string"}},
        "index_types": {"type": "array", "items": {"type": "string"}},
        "optimizer": {"type": "string"},
        "replication_ha": {"type": "array", "items": {"type": "string"}},
        "backup_recovery": {"type": "string"},
        "performance_profile": {
            "type": "object",
            "properties": {"oltp": {"type": "string"}, "olap": {"type": "string"}, "concurrency": {"type": "string"}, "scalability": {"type": "string"}}
        },
        "sql_procedural_language": {"type": ["string", "null"]},
        "admin_tools": {"type": "array", "items": {"type": "string"}},
        "ecosystem": {"type": "object", "properties": {"drivers": {"type": "array", "items": {"type": "string"}}, "orms": {"type": "array", "items": {"type": "string"}}}},
        "conceptual_equivalences": {"type": "object", "additionalProperties": {"type": "string"}, "description": "concepto_generico -> termino propio del motor."},
        "verify_current_status": {"type": "string", "description": "Recordatorio: ediciones, precios y limites de servicio cambian; validar contra documentacion oficial vigente."},
        "completeness": {
            "type": "object",
            "required": ["status"],
            "properties": {
                "status": {"type": "string", "enum": ["stub", "partial", "full"]},
                "last_updated": {"type": "string", "format": "date"},
                "sources": {"type": "array", "items": {"type": "string"}}
            }
        }
    }
}

with open(f"{BASE}/schema/command.schema.json", "w", encoding="utf-8") as f:
    json.dump(command_schema, f, ensure_ascii=False, indent=2)

with open(f"{BASE}/schema/engine.schema.json", "w", encoding="utf-8") as f:
    json.dump(engine_schema, f, ensure_ascii=False, indent=2)

print("Schemas escritos OK")
