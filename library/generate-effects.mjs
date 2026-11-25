import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as particles from './generators/particles.mjs';
import * as lighting from './generators/lighting.mjs';
import * as shaders from './generators/shaders.mjs';
import * as materials from './generators/materials.mjs';
import * as distortion from './generators/distortion.mjs';
import * as transitions from './generators/transitions.mjs';
import * as typography from './generators/typography.mjs';
import * as interactive from './generators/interactive.mjs';
import * as hud from './generators/hud.mjs';
import * as backgrounds from './generators/backgrounds.mjs';
import * as camera from './generators/camera.mjs';
import * as threeD from './generators/three-d.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const effectsRoot = path.join(root, 'library', 'effects');
const runtime = fs.readFileSync(path.join(root, 'library', 'runtime', 've-runtime.js'), 'utf8');

const definitions = [
  ...particles.effects,
  ...lighting.effects,
  ...shaders.effects,
  ...materials.effects,
  ...distortion.effects,
  ...transitions.effects.map((d) => ({ ...d, helpers: transitions.helpers })),
  ...typography.effects,
  ...interactive.effects,
  ...hud.effects,
  ...backgrounds.effects,
  ...camera.effects,
  ...threeD.effects,
];

const ids = new Set();
for (const def of definitions) {
  if (ids.has(def.id)) throw new Error(`ID duplicado: ${def.id}`);
  ids.add(def.id);
}

function configSource(params) {
  const lines = params.map((p) => {
    const value = p.type === 'string' || p.type === 'color' ? `"{{${p.name}}}"` : `{{${p.name}}}`;
    return `  ${JSON.stringify(p.name)}: ${value}`;
  });
  return `// Valores por defecto de la receta. Se sustituyen al aplicar.\nexport default {\n${lines.join(',\n')}\n};\n`;
}

function wrapper(def) {
  if (def.glsl) {
    return `import config from './config.js';
import { mountGL } from './ve-runtime.js';

export const defaults = config;

/** ${def.summary.replace(/\n/g, ' ')} */
const FRAG = \`${def.glsl}\`;

export function mount(canvas, params = {}) {
  return mountGL(canvas, { ...defaults, ...params }, FRAG);
}
`;
  }
  return `import config from './config.js';
import { mountCanvas, rgba, hexToRgb, clamp, lerp, fbm, noise2, mulberry32 } from './ve-runtime.js';

${def.helpers ?? ''}
export const defaults = config;

/** ${def.summary.replace(/\n/g, ' ')} */
export function mount(canvas, params = {}) {
  const p = { ...defaults, ...params };
  return mountCanvas(canvas, p, ({ ctx, w, h, t, dt, pointer, reduced, state }) => {
${def.draw.trimEnd()}
  });
}
`;
}

function preview(def) {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${def.name} · Visual Engine</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  html, body { margin: 0; height: 100%; overflow: hidden; background: #05070d; }
  #ve-canvas { display: block; width: 100%; height: 100%; touch-action: none; }
  body[data-error]::after { content: attr(data-error); position: fixed; left: 16px; bottom: 16px; color: #ff9aa5; font: 12px ui-monospace, monospace; max-width: 80ch; }
</style>
</head>
<body>
  <canvas id="ve-canvas" aria-label="${def.name}"></canvas>
  <script type="module">
    import { mount } from './effect.js';
    const canvas = document.getElementById('ve-canvas');
    let dispose;
    try {
      dispose = mount(canvas);
      window.__veReady = true;
    } catch (error) {
      document.body.dataset.error = String(error && error.message ? error.message : error);
      console.error(error);
    }
    window.addEventListener('pagehide', () => { if (dispose) dispose(); }, { once: true });
  </script>
</body>
</html>
`;
}

function readme(def) {
  const params = def.params
    .map((p) => `| \`${p.name}\` | ${p.type} | \`${String(p.default)}\` | ${p.description} |`)
    .join('\n');
  const gl = Boolean(def.glsl);
  return `# ${def.name}

${def.summary}

- Categoría: **${def.category}**
- Motor: ${gl ? 'WebGL1 + GLSL' : 'Canvas 2D'}
- Dependencias: ninguna
- Licencia: MIT (código propio de Visual Engine)
- Compatibilidad: Chromium/Firefox/Safari recientes; respeta \`prefers-reduced-motion\`; DPR limitado a 2.

## Integración

\`\`\`js
import { mount } from './effect.js';

const canvas = document.querySelector('#ve-canvas');
const dispose = mount(canvas, {
  accent: '#12e0c8',
  accent2: '#ffb454',
});

// Al desmontar:
dispose();
\`\`\`

\`mount\` devuelve una función de limpieza. El canvas debe tener tamaño CSS (100% o píxeles); el runtime ajusta el backing store y el DPR.

## Parámetros

| Nombre | Tipo | Defecto | Descripción |
| --- | --- | --- | --- |
${params}

## Rendimiento e integración

- Medición reproducible: \`ve benchmark --effect ${def.id}\`.
- ${gl ? 'Un solo triángulo a pantalla completa; coste dominado por el fragment shader.' : 'Bucle de Canvas 2D; pausa con `document.hidden` y reduce DPR en móviles.'}
- No uses este efecto como capa de fondo si el texto principal no tiene contraste suficiente: mide con \`ve review\`.
- Los parámetros son independientes; evita combinar más de 6 capas animadas a pantalla completa sin medir FPS.

## Archivos

- \`effect.js\`: implementación y export \`mount\`.
- \`config.js\`: valores por defecto (sustituidos por \`ve effects apply --set\`).
- \`ve-runtime.js\`: runtime compartido, sin dependencias.
- \`index.html\`: previsualización autónoma.
`;
}

let created = 0;
for (const def of definitions) {
  const dir = path.join(effectsRoot, def.id);
  const templates = path.join(dir, 'templates');
  fs.mkdirSync(templates, { recursive: true });
  const gl = Boolean(def.glsl);
  const recipe = {
    id: def.id,
    name: def.name,
    category: def.category,
    summary: def.summary,
    tags: def.tags,
    engines: gl ? ['webgl', 'glsl'] : ['canvas2d'],
    requires: [],
    performance: 'Pendiente de medición 0.3: ejecuta `ve benchmark --effect ' + def.id + '`.',
    license: 'MIT (propio)',
    entry: 'index.html',
    compatibility: {
      chrome: '>=120',
      firefox: '>=120',
      safari: '>=17',
      reducedMotion: 'dibuja un fotograma estático',
      dependencies: 'ninguna',
    },
    integration: {
      mount: 'mount(canvas, params)',
      cleanup: 'la función devuelta cancela el RAF y los listeners',
      standalone: 'index.html',
    },
    params: def.params,
  };
  fs.writeFileSync(path.join(dir, 'recipe.json'), JSON.stringify(recipe, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(templates, 'config.js'), configSource(def.params), 'utf8');
  fs.writeFileSync(path.join(templates, 'effect.js'), wrapper(def), 'utf8');
  fs.writeFileSync(path.join(templates, 've-runtime.js'), runtime, 'utf8');
  fs.writeFileSync(path.join(templates, 'index.html'), preview(def), 'utf8');
  fs.writeFileSync(path.join(templates, 'README.md'), readme(def), 'utf8');
  created++;
}

const total = fs.readdirSync(effectsRoot, { withFileTypes: true }).filter((d) => d.isDirectory() && fs.existsSync(path.join(effectsRoot, d.name, 'recipe.json'))).length;
console.log(JSON.stringify({ created, total, categories: [...new Set(definitions.map((d) => d.category))] }, null, 2));
