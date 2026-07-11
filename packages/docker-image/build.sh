#!/usr/bin/env bash
set -euo pipefail

echo "=========================================================="
echo " SQL Engine Lab - Docker Image Builder"
echo "=========================================================="

# 1. Copiar el contrato maestro desde la raíz del proyecto
CONTRACT_SRC="../../lab-contract.json"
CONTRACT_DEST="lab-contract.json"

if [[ ! -f "$CONTRACT_SRC" ]]; then
  echo "ERROR: No se encontró $CONTRACT_SRC"
  echo "Asegúrate de estar en el directorio packages/docker-image"
  exit 1
fi

echo "[1/3] Copiando contrato de la verdad ($CONTRACT_SRC) al contexto de build..."
cp "$CONTRACT_SRC" "$CONTRACT_DEST"

# 2. Construir la imagen
echo "[2/3] Construyendo imagen Docker (sql-engine-lab:dev)..."
docker build -t sql-engine-lab:dev .

# 3. Limpiar el contrato copiado para no ensuciar el repositorio
echo "[3/3] Limpiando contexto..."
rm "$CONTRACT_DEST"

echo "=========================================================="
echo " ¡Build completado exitosamente!"
echo "=========================================================="
