# ==========================================================================
# SQL Engine Laboratory - Setup y Verificacion del Entorno para Windows
# ==========================================================================

$ErrorActionPreference = "Stop"

# Guardar la ubicacion original
$ORIGINAL_DIR = Get-Location

# Resolver directorios del proyecto
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$PROJECT_ROOT = Resolve-Path (Join-Path $SCRIPT_DIR "..")
$EXTENSION_DIR = Join-Path $PROJECT_ROOT "packages\extension"
$WEBVIEW_DIR = Join-Path $PROJECT_ROOT "packages\webview-ui"

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  SQL Engine Laboratory - Setup & Check (Windows) " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

$issues = 0

function Show-Pass($msg) {
    Write-Host "  [OK] $msg" -ForegroundColor Green
}

function Show-Fail($msg) {
    Write-Host "  [ERROR] $msg" -ForegroundColor Red
    $global:issues++
}

function Show-Warn($msg) {
    Write-Host "  [WARN] $msg" -ForegroundColor Yellow
}

function Show-Info($msg) {
    Write-Host "  [INFO] $msg" -ForegroundColor DarkGray
}

function Show-Section($name) {
    Write-Host ""
    Write-Host ">>> $name" -ForegroundColor Cyan
    Write-Host "------------------------------------------------" -ForegroundColor DarkGray
}

# ---- Node.js & npm ----
Show-Section "Node.js y npm"

try {
    $nodeVer = node --version
    $nodeMajor = node -e "console.log(process.versions.node.split('.')[0])"
    if ([int]$nodeMajor -ge 18) {
        Show-Pass "Node.js $nodeVer (>= 18 requerido)"
    } else {
        Show-Fail "Node.js $nodeVer - se requiere v18+. Instalar desde https://nodejs.org"
    }
} catch {
    Show-Fail "Node.js no encontrado. Instalar desde https://nodejs.org"
}

try {
    $npmVer = npm --version
    Show-Pass "npm $npmVer"
} catch {
    Show-Fail "npm no encontrado (se instala con Node.js)"
}

# ---- Dependencias del Webview UI ----
Show-Section "Dependencias npm (packages/webview-ui)"

if (Test-Path (Join-Path $WEBVIEW_DIR "node_modules")) {
    Show-Pass "packages/webview-ui/node_modules/ presente"
} else {
    Show-Info "Instalando dependencias de webview-ui..."
    try {
        Set-Location $WEBVIEW_DIR
        npm install
        Show-Pass "Dependencias de webview-ui instaladas"
    } catch {
        Show-Fail "npm install en webview-ui falló"
    }
}

Show-Section "Construccion de webview-ui"
try {
    Set-Location $WEBVIEW_DIR
    npm run build
    Show-Pass "webview-ui construido correctamente"
} catch {
    Show-Fail "npm run build en webview-ui falló"
}

# ---- Dependencias de la Extension ----
Show-Section "Dependencias npm (packages/extension)"

if (Test-Path (Join-Path $EXTENSION_DIR "node_modules")) {
    Show-Pass "packages/extension/node_modules/ presente"
} else {
    Show-Info "Instalando dependencias de extension..."
    try {
        Set-Location $EXTENSION_DIR
        npm install
        Show-Pass "Dependencias de extension instaladas"
    } catch {
        Show-Fail "npm install en extension falló"
    }
}

Show-Section "Compilacion TypeScript de la Extension"
try {
    Set-Location $EXTENSION_DIR
    npm run compile
    Show-Pass "Extension compilada correctamente"
} catch {
    Show-Fail "TypeScript compilacion fallo"
}

# ---- Docker ----
Show-Section "Docker"

try {
    $dockerVer = docker version --format '{{.Client.Version}}'
    Show-Pass "Docker CLI $dockerVer"
    
    try {
        $engineVer = docker version --format '{{.Server.Version}}'
        Show-Pass "Docker Engine $engineVer (corriendo)"
    } catch {
        Show-Fail "Docker no esta corriendo - iniciar Docker Desktop"
    }
} catch {
    Show-Fail "Docker no esta instalado o no se encuentra en el PATH. Instala Docker Desktop: https://www.docker.com/products/docker-desktop/"
}

# ---- Estructura del repositorio ----
Show-Section "Estructura del Repositorio"

$requiredDirs = @(
    "packages\docker-image",
    "packages\docker-image\engines\postgres",
    "packages\docker-image\engines\mysql",
    "packages\docker-image\engines\mariadb",
    "packages\docker-image\engines\sqlite",
    "packages\docker-image\engines\sqlserver",
    "packages\extension\src\core\engines",
    "packages\extension\src\core\docker",
    "packages\extension\src\core\connection",
    "packages\extension\src\vscode",
    "decisions"
)

foreach ($dir in $requiredDirs) {
    if (Test-Path (Join-Path $PROJECT_ROOT $dir)) {
        Show-Pass "$dir"
    } else {
        Show-Fail "Directorio faltante: $dir"
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
        Show-Pass "$file"
    } else {
        Show-Fail "Archivo faltante: $file"
    }
}

# ---- Resumen ----
Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
if ($issues -eq 0) {
    Write-Host "  [OK] Entorno listo - todos los checks pasaron" -ForegroundColor Green
    Write-Host ""
    Write-Host " Próximos pasos:" -ForegroundColor Gray
    Write-Host "   npm run watch (dentro de packages/extension) para desarrollo"
    Write-Host "   F5 en VS Code para iniciar la extensión"
} else {
    Write-Host "  [WARN] $issues problema(s) encontrado(s)" -ForegroundColor Red
    Write-Host " Resolverlos antes de ejecutar la extensión." -ForegroundColor Gray
}
Write-Host "===============================================" -ForegroundColor Cyan

# Volver a la ubicacion original
Set-Location $ORIGINAL_DIR
