#!/usr/bin/env bash
# Visual Engine · instalador para Linux/macOS
# Uso: ./install/install.sh
#      VE_REPO=https://github.com/mmarioplay9-blip/visual-engine.git VE_REF=v0.1.0 ./install/install.sh --no-link
set -euo pipefail

REPO="${VE_REPO:-https://github.com/mmarioplay9-blip/visual-engine.git}"
DEST="${VE_DEST:-$HOME/.local/share/visual-engine}"
REF="${VE_REF:-main}"
LINK=1
SKIP_BUILD=0

for arg in "$@"; do
  case "$arg" in
    --no-link) LINK=0 ;;
    --skip-build) SKIP_BUILD=1 ;;
    --help|-h)
      sed -n '2,6p' "$0"
      exit 0
      ;;
    *) echo "Opción desconocida: $arg" >&2; exit 2 ;;
  esac
done

need() {
  command -v "$1" >/dev/null 2>&1 || { echo "Falta '$1' en PATH. $2" >&2; exit 1; }
}

echo "Visual Engine · instalación"

need git "Instala Git con el gestor de paquetes de tu sistema."
need node "Instala Node.js 20 o superior: https://nodejs.org"
need npm "Viene con Node.js"
need ffmpeg "Instala ffmpeg: apt install ffmpeg | brew install ffmpeg"

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "Node 20+ requerido; tienes $NODE_MAJOR." >&2
  exit 1
fi

if [ -d "$DEST/.git" ]; then
  echo "Actualizando $DEST ..."
  git -C "$DEST" fetch --depth 1 origin "$REF"
  git -C "$DEST" reset --hard "origin/$REF"
else
  if [ -e "$DEST" ]; then
    echo "$DEST existe y no es un repositorio git. Usa VE_DEST con otra ruta." >&2
    exit 1
  fi
  echo "Clonando $REPO ($REF) en $DEST ..."
  git clone --depth 1 --branch "$REF" "$REPO" "$DEST"
fi

cd "$DEST"
echo "Instalando dependencias ..."
npm install --no-audit --no-fund

if [ "$SKIP_BUILD" -eq 0 ]; then
  echo "Compilando ..."
  npm run build
fi

echo "Instalando Chromium de Playwright ..."
npx playwright install chromium

if [ "$LINK" -eq 1 ]; then
  echo "Enlazando el comando 've' ..."
  if ! npm link; then
    echo "npm link falló (permisos del prefijo). Usa: node \"$DEST/dist/cli/index.js\" <comando>" >&2
  fi
fi

echo
echo "Verificación:"
node "$DEST/dist/cli/index.js" version
node "$DEST/dist/cli/index.js" doctor || true

echo
echo "Instalado en $DEST"
echo "Siguiente paso: entra en tu proyecto y ejecuta 've init --clients claude,cursor'"
echo "Actualizar más tarde: ve update"
