const fs = require('node:fs');
const assert = require('node:assert/strict');
const html = fs.readFileSync('hero.html', 'utf8');
const checks = {
  espanol: html.includes('lang="es"'),
  unaAccion: (html.match(/<summary>/g) || []).length === 1 && !/<(?:button|a)\b/.test(html),
  referenciaLocal: html.includes('src="reference.jpg"'),
  sinRecursosRemotos: !/(https?:)?\/\//.test(html),
  fuentesLocales: fs.existsSync('.ve/art/fonts/SourceSerif4_opsz,wght_.ttf') && fs.existsSync('.ve/art/fonts/Inter_opsz,wght_.ttf'),
};
console.log(JSON.stringify(checks, null, 2));
assert.ok(Object.values(checks).every(Boolean));
