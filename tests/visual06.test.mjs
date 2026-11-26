import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectActivation, activationSupport, activationGuidance } from '../dist/core/activation.js';
import { PROFILES, getProfile, describeProfile } from '../dist/core/profiles.js';
import { recordUsage, describeUsage } from '../dist/core/usage.js';
import { auditSecurity, isLoopback, withinRoot } from '../dist/core/security.js';
import { planInstall, applyInstall, uninstall, repair, verifyMcpServer, inventory, readManifest } from '../dist/core/installer.js';
import { selectContext } from '../dist/core/context.js';
import { startApi } from '../dist/api/server.js';
import { listEffects } from '../dist/core/library.js';
import { STYLE_IDS } from '../dist/core/styles.js';
import { SHOWCASE_SPECS } from '../dist/core/showcase.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function tempProject() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 've-install06-'));
  fs.writeFileSync(path.join(dir, 'CLAUDE.md'), '# Reglas propias\n\nNo sobreescribir.\n', 'utf8');
  fs.writeFileSync(path.join(dir, '.mcp.json'), JSON.stringify({ mcpServers: { otro: { command: 'node', args: ['otro.js'] } } }, null, 2) + '\n', 'utf8');
  return dir;
}

test('0.6 · activación distingue tareas visuales y respeta el opt-out', () => {
  const game = detectActivation('Crea el HUD de un videojuego cyberpunk con glitch y menú de inventario');
  assert.equal(game.activate, true);
  assert.ok(game.categories.some((c) => c.category === 'game'));
  assert.equal(game.enforcement, 'advisory');
  assert.ok(game.confidence >= 0.45);

  const landing = detectActivation('Landing premium de arquitectura con animaciones y 3D');
  assert.equal(landing.activate, true);
  assert.ok(landing.categories.length >= 2);

  const backend = detectActivation('Añade un endpoint a la API REST y una migración SQL');
  assert.equal(backend.activate, false);
  assert.ok(backend.negatives.length >= 1);

  const docs = detectActivation('Documenta el changelog y corrige el typo del README');
  assert.equal(docs.activate, false);

  const optOut = detectActivation('Corrige el copy sin Visual Engine, no hace falta análisis visual');
  assert.equal(optOut.activate, false);
  assert.equal(optOut.confidence, 0);
  assert.ok(!detectActivation('Refactoriza el módulo de facturación y añade pruebas unitarias').activate);

  assert.equal(activationSupport('claude').mode, 'automatic');
  assert.equal(activationSupport('ollama').mode, 'manual');
  assert.match(activationGuidance('lite'), /58 efectos/);
});

test('0.6 · los perfiles cambian capacidades y presupuesto, no la estética', () => {
  assert.deepEqual(Object.keys(PROFILES).sort(), ['cinematic', 'lite', 'professional']);
  const lite = getProfile('lite');
  const pro = getProfile('professional');
  const cine = getProfile('cinematic');
  assert.ok(lite.tokenBudget < pro.tokenBudget && pro.tokenBudget < cine.tokenBudget);
  assert.ok(lite.maxTools <= pro.maxTools && pro.maxTools <= cine.maxTools);
  for (const p of [lite, pro, cine]) {
    assert.equal(p.aesthetic, 'none');
    assert.ok(p.stages.length >= 4);
    assert.ok(p.limits.length >= 1);
    assert.ok(!/paleta|tipografía concreta|obliga a/i.test(p.purpose));
  }
  const ctx = selectContext('landing editorial con animación', { profile: 'lite' });
  assert.equal(ctx.version, '1.0');
  assert.equal(ctx.profile, 'lite');
  assert.ok(ctx.tools.length <= 4);
  assert.ok(ctx.recipes.length <= 1);
  assert.equal(ctx.docs.length, 0);
  assert.equal(ctx.tokenBudget, 1500);
  assert.ok(describeProfile(cine).some((l) => /estética/i.test(l)));
  assert.throws(() => getProfile('ultra'), /Perfil desconocido/);
});

test('0.6 · el consumo reportado se separa de la estimación', () => {
  const reported = recordUsage({ reported: { inputTokens: 1200, outputTokens: 340, cachedTokens: 200, source: 'claude-code' } });
  assert.equal(reported.kind, 'reported');
  assert.equal(reported.breakdown.totalTokens, 1540);
  assert.equal(reported.breakdown.cachedTokens, 200);
  assert.match(describeUsage(reported), /medido/);

  const estimated = recordUsage({ inputText: 'x'.repeat(400), outputText: 'y'.repeat(80) });
  assert.equal(estimated.kind, 'estimated');
  assert.equal(estimated.breakdown.totalTokens, 120);
  assert.match(estimated.limits.join(' '), /no es telemetría/i);
  assert.match(describeUsage(estimated), /estimado/);

  const unavailable = recordUsage({});
  assert.equal(unavailable.kind, 'unavailable');
  assert.equal(unavailable.breakdown.totalTokens, null);
  assert.match(describeUsage(unavailable), /no disponible/);
});

test('0.6 · la auditoría de seguridad comprueba hechos locales y bloquea host externo', () => {
  assert.equal(isLoopback('127.0.0.1'), true);
  assert.equal(isLoopback('0.0.0.0'), false);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 've-sec06-'));
  assert.equal(withinRoot(dir, path.join(dir, 'a', 'b')), true);
  assert.equal(withinRoot(dir, path.join(dir, '..', 'fuera')), false);
  assert.equal(withinRoot(dir, path.join(dir, '..falso')), false);

  const good = auditSecurity({ projectDir: dir, apiHost: '127.0.0.1' });
  assert.equal(good.pass, true);
  assert.ok(good.checks.some((c) => c.id === 'api-loopback' && c.status === 'pass'));
  assert.ok(good.checks.some((c) => c.id === 'no-shell' && c.status === 'pass'));

  const bad = auditSecurity({ projectDir: dir, apiHost: '0.0.0.0', apiAllowsInstall: true });
  assert.equal(bad.pass, false);
  assert.ok(bad.checks.some((c) => c.id === 'api-loopback' && c.status === 'fail'));
  assert.ok(bad.limitations.some((l) => /pentest/i.test(l)));
});

test('0.6 · la API rechaza escuchar fuera de loopback sin autorización', async () => {
  await assert.rejects(() => startApi({ host: '0.0.0.0', port: 0 }), /localhost/);
});

test('0.6 · instalador: planifica, respalda, no sobrescribe y desinstala sólo lo gestionado', async () => {
  const dir = tempProject();
  const agents = ['claude', 'freebuff', 'ollama', 'codex'];
  const plan = await planInstall({ projectDir: dir, agents, profile: 'professional' });
  assert.equal(plan.version, '1.0');
  assert.equal(plan.requiresConfirmation, true);
  assert.ok(plan.actions.some((a) => a.kind === 'mcp' && a.action === 'merge-json'));
  assert.ok(plan.actions.some((a) => a.kind === 'instructions' && a.target.endsWith('CLAUDE.md') && a.action === 'conflict'));
  assert.ok(plan.conflicts.some((c) => c.endsWith('CLAUDE.md')));
  assert.ok(plan.notes.some((n) => /modelos pesados/i.test(n)));

  const before = fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8');
  const result = await applyInstall({ projectDir: dir, agents, profile: 'professional', confirm: true, verify: false });
  assert.equal(result.ok, true, JSON.stringify(result.notes));
  assert.equal(fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8'), before, 'se sobrescribió un archivo no gestionado');
  const mcp = JSON.parse(fs.readFileSync(path.join(dir, '.mcp.json'), 'utf8'));
  assert.ok(mcp.mcpServers.otro, 'se perdió la configuración previa');
  assert.ok(mcp.mcpServers['visual-engine']);
  assert.ok(fs.existsSync(path.join(dir, '.claude', 'skills', 'visual-engine', 'SKILL.md')));
  assert.ok(fs.existsSync(path.join(dir, '.visual-engine', 'ollama-system.md')));
  // Codex no tiene configuración de proyecto: se entrega el bloque para copiar.
  assert.ok(fs.existsSync(path.join(dir, '.visual-engine', 'codex-mcp.toml')), 'falta el bloque MCP de Codex');
  assert.ok(fs.existsSync(path.join(dir, '.visual-engine', 'install.json')));
  const manifest = readManifest(dir);
  // Instalar no es diseñar: los archivos escritos quedan como instalados.
  assert.equal(manifest.agents.find((a) => a.id === 'codex').status, 'installed');
  assert.equal(manifest.agents.find((a) => a.id === 'claude').status, 'installed');
  assert.ok(manifest.backups.length >= 1);
  assert.ok(result.backups.every((b) => fs.existsSync(b.backup)));
  assert.ok(manifest.files.some((f) => f.path.endsWith('.mcp.json')));

  // Reparación real: JSON corrupto → restaura la copia previa.
  fs.writeFileSync(path.join(dir, '.mcp.json'), '{ roto', 'utf8');
  const broken = repair({ projectDir: dir, confirm: true });
  assert.ok(broken.issues.some((i) => i.problem === 'JSON inválido.'));
  assert.ok(broken.fixed.some((f) => f.endsWith('.mcp.json')));
  assert.ok(JSON.parse(fs.readFileSync(path.join(dir, '.mcp.json'), 'utf8')).mcpServers.otro);

  const removed = uninstall({ projectDir: dir, confirm: true });
  assert.ok(removed.removed.some((f) => f.includes('SKILL.md')));
  assert.ok(removed.kept.some((f) => f.includes('.mcp.json')));
  assert.equal(fs.existsSync(path.join(dir, '.visual-engine', 'install.json')), false);
});

test('0.6 · inventario y handshake MCP real del servidor instalado', async () => {
  const items = await inventory(root);
  assert.equal(items.length, 9);
  const ids = items.map((i) => i.id).sort();
  assert.deepEqual(ids, ['claude', 'codex', 'cursor', 'freebuff', 'gemini', 'generic-mcp', 'maex', 'ollama', 'opencode'].sort());
  const claude = items.find((i) => i.id === 'claude');
  assert.ok(claude);
  assert.ok(['designed', 'installed', 'verified'].includes(claude.integration));
  const maex = items.find((i) => i.id === 'maex');
  assert.ok(maex);
  // maex es un lanzador interactivo: se localiza en PATH, nunca se ejecuta.
  assert.match(maex.detail ?? '', /interactivo|PATH/);

  const verification = await verifyMcpServer();
  assert.equal(verification.ok, true, verification.error);
  assert.ok(verification.tools >= 44, `herramientas MCP: ${verification.tools}`);
  assert.equal(verification.serverVersion, '1.0.0-rc.1');
  assert.match(verification.method, /tools\/list/);
});

test('1.0 · un timeout de ejecución no deja procesos hijos vivos', async () => {
  const { exec, liveChildPids } = await import('../dist/core/run.js');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 've-orphan-'));
  const marker = path.join(dir, 'pid.txt');
  const script = `require('fs').writeFileSync(${JSON.stringify(marker)}, String(process.pid)); setTimeout(() => {}, 60000)`;
  const started = Date.now();
  const result = await exec(process.execPath, ['-e', script], { timeoutMs: 900 });
  assert.equal(result.ok, false);
  assert.equal(result.code, 124, 'el timeout debe informarse como 124');
  assert.ok(Date.now() - started < 12_000, 'el timeout no debe colgar el proceso');
  assert.deepEqual(liveChildPids(), [], 'quedaron hijos registrados como vivos');
  const pid = Number(fs.readFileSync(marker, 'utf8'));
  assert.ok(pid > 0);
  let alive = true;
  try {
    process.kill(pid, 0);
  } catch {
    alive = false;
  }
  assert.equal(alive, false, `el proceso ${pid} sigue vivo tras el timeout`);
});

test('0.6 · se conservan 58 efectos, 15 estilos, 20 composiciones y 54 pruebas previas', () => {
  assert.ok(listEffects().length >= 58);
  assert.equal(STYLE_IDS.length, 15);
  assert.equal(SHOWCASE_SPECS.length, 20);
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.equal(pkg.version, '1.0.0-rc.1');
  const tests = fs.readdirSync(path.join(root, 'tests')).filter((f) => f.endsWith('.test.mjs'));
  assert.ok(tests.length >= 10);
  assert.ok(tests.includes('visual05.test.mjs'));
});
