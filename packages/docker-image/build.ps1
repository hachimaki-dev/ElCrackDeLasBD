# ==========================================================
# SQL Engine Lab - Docker Image Builder for Windows
# ==========================================================

# 1. Copiar el contrato maestro desde la raíz del proyecto
$CONTRACT_SRC = "..\..\lab-contract.json"
$CONTRACT_DEST = "lab-contract.json"

if (-not (Test-Path $CONTRACT_SRC)) {
    Write-Error "ERROR: No se encontró $CONTRACT_SRC"
    Write-Host "Asegúrate de estar en el directorio packages/docker-image"
    Exit 1
}

Write-Host "[1/3] Copiando contrato de la verdad ($CONTRACT_SRC) al contexto de build..."
Copy-Item -Path $CONTRACT_SRC -Destination $CONTRACT_DEST -Force

# 2. Construir la imagen
Write-Host "[2/3] Construyendo imagen Docker (sql-engine-lab:dev)..."
docker build -t sql-engine-lab:dev .

# 3. Limpiar el contrato copiado para no ensuciar el repositorio
Write-Host "[3/3] Limpiando contexto..."
if (Test-Path $CONTRACT_DEST) {
    Remove-Item -Path $CONTRACT_DEST -Force
}

Write-Host "=========================================================="
Write-Host " ¡Build completado exitosamente!"
Write-Host "=========================================================="
