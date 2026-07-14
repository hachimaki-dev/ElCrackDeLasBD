# ==========================================================================
# SQL Engine Laboratory — Setup y Verificación del Entorno para Windows
# ==========================================================================

$ErrorActionPreference = "Stop"

# Guardar la ubicación original
$ORIGINAL_DIR = Get-Location

# Resolver directorios del proyecto
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$PROJECT_ROOT = Resolve-Path (Join-Path $SCRIPT_DIR "..")
$EXTENSION_DIR = Join-Path $PROJECT_ROOT "packages\extension"
$WEBVIEW_DIR = Join-Path $PROJECT_ROOT "packages\webview-ui"

Write-Host "`n╔════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  SQL Engine Laboratory — Setup & Check (Windows)║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor Cyan

$issues = 0

function Pass-Check($msg) {
    Write-Host "  ✓ $msg" -ForegroundColor Green
}

function Fail-Check($msg) {
    Write-Host "  ✗ $msg" -ForegroundColor Red
    global: $issues++
}

function Warn-Check($msg) {
    Write-Host "  ⚠ $msg" -ForegroundColor Yellow
}

function Info-Check($msg) {
    Write-Host "  → $msg" -ForegroundColor DarkGray
}

function Show-Section($name) {
    Write-Host "`n▶ $name" -ForegroundColor Cyan
    Write-Host "------------------------------------------------" -ForegroundColor DarkGray
}

# ---- Node.js & npm ----
Show-Section "Node.js y npm"

try {
    $nodeVer = node --version
    $nodeMajor = node -e "console.log(process.versions.node.split('.')[0])"
    if ([int]$nodeMajor -ge 18) {
        Pass-Check "Node.js $nodeVer (>= 18 requerido)"
    } else {
        Fail-Check "Node.js $nodeVer — se requiere v18+. Instalar desde https://nodejs.org"
    }
} catch {
    Fail-Check "Node.js no encontrado. Instalar desde https://nodejs.org"
}

try {
    $npmVer = npm --version
    Pass-Check "npm $npmVer"
} catch {
    Fail-Check "npm no encontrado (se instala con Node.js)"
}

# ---- Dependencias del Webview UI ----
Show-Section "Dependencias npm (packages/webview-ui)"

if (Test-Path (Join-Path $WEBVIEW_DIR "node_modules")) {
    Pass-Check "packages/webview-ui/node_modules/ presente"
} else {
    Info-Check "Instalando dependencias de webview-ui..."
    try {
        Set-Location $WEBVIEW_DIR
        npm install
        Pass-Check "Dependencias de webview-ui instaladas"
    } catch {
        Fail-Check "npm install en webview-ui falló"
    }
}

Show-Section "Construcción de webview-ui"
try {
    Set-Location $WEBVIEW_DIR
    npm run build
    Pass-Check "webview-ui construido correctamente"
} catch {
    Fail-Check "npm run build en webview-ui falló"
}

# ---- Dependencias de la Extensión ----
Show-Section "Dependencias npm (packages/extension)"

if (Test-Path (Join-Path $EXTENSION_DIR "node_modules")) {
    Pass-Check "packages/extension/node_modules/ presente"
} else {
    Info-Check "Instalando dependencias de extension..."
    try {
        Set-Location $EXTENSION_DIR
        npm install
        Pass-Check "Dependencias de extension instaladas"
    } catch {
        Fail-Check "npm install en extension falló"
    }
}

Show-Section "Compilación TypeScript de la Extensión"
try {
    Set-Location $EXTENSION_DIR
    npm run compile
    Pass-Check "Extensión compilada correctamente"
} catch {
    Fail-Check "TypeScript compilación falló"
}

# ---- Docker ----
Show-Section "Docker"

try {
    $dockerVer = docker version --format '{{.Client.Version}}'
    Pass-Check "Docker CLI $dockerVer"
    
    try {
        $engineVer = docker version --format '{{.Server.Version}}'
        Pass-Check "Docker Engine $engineVer (corriendo)"
    } catch {
        Fail-Check "Docker no está corriendo — iniciar Docker Desktop"
    }
} catch {
    Fail-Check "Docker no está instalado o no se encuentra en el PATH. Instala Docker Desktop: https://www.docker.com/products/docker-desktop/"
}

# ---- Estructura del repositorio ----
Show-Section "Estructura del Repositorio"

$requiredDirs = @(
    "packages\docker-image",
    "packages\docker-image\engines\postgres",
    "packages\docker-image\engines\mysql",
    "packages\docker-image\engines\mariadb",
    "packages\docker-image\engines\sqlite",
    "packages\docker-image\engines\oracle",
    "packages\docker-image\engines\sqlserver",
    "packages\extension\src\core\engines",
    "packages\extension\src\core\docker",
    "packages\extension\src\core\connection",
    "packages\extension\src\vscode",
    "decisions"
)

foreach ($dir in $requiredDirs) {
    if (Test-Path (Join-Path $PROJECT_ROOT $dir)) {
        Pass-Check "$dir\"
    } else {
        Fail-Check "Directorio faltante: $dir\"
    }
}

$requiredFiles = @(
    "packages\docker-image\Dockerfile",
    "packages\docker-image\supervisord.conf",
    "packages\docker-image\entrypoint.sh",
    "packages\extension\src\extension.ts",
    "packages\extension\package.json",
    "packages\extension\tsconfig.json",
    "AGENTS.md",
    "ARCHITECTURE.md",
    "TASKS.md"
)

foreach ($file in $requiredFiles) {
    if (Test-Path (Join-Path $PROJECT_ROOT $file)) {
        Pass-Check "$file"
    } else {
        Fail-Check "Archivo faltante: $file"
    }
}

# ---- Resumen ----
Write-Host "`n===============================================" -ForegroundColor Cyan
if ($issues -eq 0) {
    Write-Host " ✅ Entorno listo — todos los checks pasaron" -ForegroundColor Green
    Write-Host "`n Próximos pasos:" -ForegroundColor Gray
    Write-Host "   npm run watch (dentro de packages/extension) para desarrollo"
    Write-Host "   F5 en VS Code para iniciar la extensión"
} else {
    Write-Host " ⚠ $issues problema(s) encontrado(s)" -ForegroundColor Red
    Write-Host " Resolverlos antes de ejecutar la extensión." -ForegroundColor Gray
}
Write-Host "===============================================" -ForegroundColor Cyan

# Volver a la ubicación original
Set-Location $ORIGINAL_DIR
