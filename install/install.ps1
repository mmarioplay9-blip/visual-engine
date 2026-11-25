<#
  Visual Engine · instalador para Windows
  Uso:
    powershell -ExecutionPolicy Bypass -File install\install.ps1
    powershell -ExecutionPolicy Bypass -File install\install.ps1 -Ref v0.1.0 -NoLink

  Clona (o actualiza) el repositorio, instala dependencias gratuitas, compila y enlaza `ve`.
  No instala nada de pago ni toca otros proyectos.
#>
param(
  [string]$Repo = $env:VE_REPO,
  [string]$Dest = "$env:LOCALAPPDATA\visual-engine",
  [string]$Ref = "main",
  [switch]$NoLink,
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

function Require-Command([string]$Name, [string]$Hint) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Falta '$Name' en PATH. $Hint"
  }
}

Write-Host "Visual Engine · instalación" -ForegroundColor Cyan

if (-not $Repo) {
  throw "Indica el repositorio con -Repo <url> o la variable VE_REPO. La publicación en GitHub aún no se ha realizado."
}
Require-Command git "Instala Git: https://git-scm.com/downloads"
Require-Command node "Instala Node.js 20 o superior: https://nodejs.org"
Require-Command npm "Viene con Node.js"

$nodeMajor = [int]((node -p "process.versions.node.split('.')[0]"))
if ($nodeMajor -lt 20) { throw "Node 20+ requerido; tienes $nodeMajor." }

$hasFfmpeg = Get-Command ffmpeg -ErrorAction SilentlyContinue
if (-not $hasFfmpeg) {
  Write-Warning "ffmpeg no está en PATH. El análisis de vídeo no funcionará hasta instalarlo (winget install Gyan.FFmpeg)."
}

if (Test-Path (Join-Path $Dest ".git")) {
  Write-Host "Actualizando $Dest ..."
  git -C $Dest fetch --depth 1 origin $Ref
  if ($LASTEXITCODE -ne 0) { throw "git fetch falló" }
  git -C $Dest reset --hard "origin/$Ref"
  if ($LASTEXITCODE -ne 0) { throw "git reset falló" }
} else {
  if (Test-Path $Dest) { throw "$Dest existe y no es un repositorio git. Elige otra carpeta con -Dest." }
  Write-Host "Clonando $Repo ($Ref) en $Dest ..."
  git clone --depth 1 --branch $Ref $Repo $Dest
  if ($LASTEXITCODE -ne 0) { throw "git clone falló" }
}

Push-Location $Dest
try {
  Write-Host "Instalando dependencias ..."
  npm install --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) { throw "npm install falló" }

  if (-not $SkipBuild) {
    Write-Host "Compilando ..."
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "npm run build falló" }
  }

  Write-Host "Instalando navegador de Playwright (sólo Chromium) ..."
  npx playwright install chromium

  if (-not $NoLink) {
    Write-Host "Enlazando el comando 've' ..."
    npm link
    if ($LASTEXITCODE -ne 0) {
      Write-Warning "npm link falló. Usa: node `"$Dest\dist\cli\index.js`" <comando>"
    }
  }

  Write-Host "`nVerificación:" -ForegroundColor Cyan
  node (Join-Path $Dest "dist\cli\index.js") version
  node (Join-Path $Dest "dist\cli\index.js") doctor
} finally {
  Pop-Location
}

Write-Host "`nInstalado en $Dest" -ForegroundColor Green
Write-Host "Siguiente paso: entra en tu proyecto y ejecuta 've init --clients claude,cursor'"
Write-Host "Actualizar más tarde: ve update"
