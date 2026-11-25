import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';
import { SHOWCASE_SPECS, type ShowcaseSpec } from './showcase-data.js';
import { buildArtDirection, artDirectionCss, designMarkdown, type ArtDirection } from './styles.js';
import { buildMotionDirector, motionDirectorMarkdown } from './motion-director.js';
import { applyEffect } from './library.js';
import { ensureDir } from './paths.js';
import { hexToRgb } from './util.js';

export { SHOWCASE_SPECS, type ShowcaseSpec };

export interface ShowcaseMeasurement {
  id: string;
  title: string;
  style: string;
  archetype: string;
  ok: boolean;
  loadMs: number;
  fps: number;
  frames: number;
  heapMB: number | null;
  overflowX: number;
  contrastViolations: number;
  contrastChecked: number;
  worstContrast: number;
  contrastSamples: { text: string; ratio: number; color: string; background: string; size: number }[];
  fontReady: boolean;
  tabWorks: boolean;
  errors: string[];
  screenshot: string;
  measuredAt: string;
}

const PAGE_CSS = `/* Showcase 0.4 · página */
html { background: var(--ve-bg); }
body { background: transparent !important; min-height: 100vh; overflow-x: hidden; }
.ve-bg { position: fixed; inset: 0; width: 100%; height: 100%; z-index: 0; opacity: .55; }
.ve-scrim { position: fixed; inset: 0; z-index: 1; pointer-events: none; background: linear-gradient(180deg, color-mix(in srgb, var(--ve-bg) 35%, transparent), var(--ve-bg) 78%); }
body[data-mode="light"] .ve-bg { opacity: .25; filter: saturate(.7); }
body[data-mode="light"] .ve-scrim { background: linear-gradient(180deg, color-mix(in srgb, var(--ve-bg) 40%, transparent), var(--ve-bg) 82%); }
.ve-shell { position: relative; z-index: 2; }
.site-head { display: flex; align-items: center; justify-content: space-between; gap: 24px; min-height: 72px; border-bottom: 1px solid var(--ve-border); }
.brand { display: flex; align-items: center; gap: 10px; font-family: var(--ve-display); font-weight: 650; letter-spacing: -.02em; font-size: 17px; white-space: nowrap; }
.brand-mark { width: 26px; height: 26px; border: 1px solid var(--ve-accent); border-radius: 50%; display: grid; place-items: center; font-family: var(--ve-mono); font-size: 9px; color: var(--ve-text); }
.nav { display: flex; align-items: center; gap: 24px; font-size: 13px; color: var(--ve-muted); }
.nav a { text-decoration: none; padding: 8px 0; border-bottom: 1px solid transparent; }
.nav a:hover, .nav a[aria-current="page"] { color: var(--ve-text); border-color: var(--ve-accent); }
.head-meta { font-family: var(--ve-mono); font-size: 10px; letter-spacing: .12em; color: var(--ve-muted); white-space: nowrap; }
.eyebrow-row { display: flex; flex-wrap: wrap; gap: 10px 18px; align-items: center; }
.status-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--ve-accent); box-shadow: 0 0 14px var(--ve-accent); display: inline-block; }
.hero { display: grid; grid-template-columns: minmax(0, 1.06fr) minmax(320px, .94fr); gap: clamp(28px, 5vw, 76px); align-items: center; padding: clamp(44px, 7vh, 84px) 0 52px; min-height: calc(100vh - 170px); }
.hero h1, .poster h1, .game-title h1 { margin: 16px 0 20px; font-family: var(--ve-display); font-weight: var(--ve-display-weight); font-size: clamp(48px, 6.4vw, 94px); line-height: var(--ve-display-line); letter-spacing: var(--ve-display-tracking); text-wrap: balance; }
.hero .ve-lead { max-width: 52ch; font-size: clamp(16px, 1.35vw, 19px); }
.actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 26px; }
.actions .ve-button { min-height: 46px; padding-inline: 20px; }
.meta-line { display: flex; flex-wrap: wrap; gap: 8px 20px; margin-top: 28px; font-family: var(--ve-mono); font-size: 10.5px; letter-spacing: .08em; text-transform: uppercase; color: var(--ve-muted); }
.feature { position: relative; overflow: hidden; border: 1px solid var(--ve-border); border-radius: var(--ve-radius); background: var(--ve-surface); box-shadow: var(--ve-shadow); min-height: 380px; aspect-ratio: 4 / 5; }
.feature--wide { aspect-ratio: 16 / 10; min-height: 300px; }
.feature canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.feature .feature-overlay { position: absolute; inset: auto 0 0; padding: 20px; display: flex; justify-content: space-between; gap: 16px; align-items: end; background: linear-gradient(transparent, color-mix(in srgb, var(--ve-bg) 78%, transparent)); }
.feature .feature-label { font-family: var(--ve-mono); font-size: 10px; letter-spacing: .1em; text-transform: uppercase; color: var(--ve-muted); }
.feature .feature-value { font-family: var(--ve-display); font-size: 23px; }
.stat-row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1px; background: var(--ve-border); border: 1px solid var(--ve-border); margin-top: 28px; }
.stat { background: var(--ve-bg); padding: 16px 18px; }
.stat b { display: block; font-family: var(--ve-display); font-size: 24px; font-weight: 600; letter-spacing: -.03em; }
.stat span { font-family: var(--ve-mono); font-size: 9.5px; letter-spacing: .1em; text-transform: uppercase; color: var(--ve-muted); }
.console { display: grid; grid-template-columns: 208px minmax(0, 1fr) 268px; gap: 14px; padding: 16px 0 40px; }
.panel { background: color-mix(in srgb, var(--ve-surface) 92%, transparent); border: 1px solid var(--ve-border); border-radius: var(--ve-radius); padding: 16px; }
.panel h2, .panel h3 { margin: 0; font-family: var(--ve-display); font-weight: 600; letter-spacing: -.02em; }
.panel h2 { font-size: 22px; }
.panel h3 { font-size: 13px; }
.panel-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.side-nav { display: flex; flex-direction: column; gap: 3px; }
.side-nav a { display: flex; justify-content: space-between; padding: 10px 11px; border-radius: calc(var(--ve-radius) * .6); text-decoration: none; color: var(--ve-muted); font-size: 12.5px; }
.side-nav a[aria-current="page"], .side-nav a:hover { background: var(--ve-elevated); color: var(--ve-text); }
.side-note { margin-top: auto; padding-top: 22px; font-family: var(--ve-mono); font-size: 9.5px; line-height: 1.7; color: var(--ve-muted); }
.dash-main { display: flex; flex-direction: column; gap: 14px; }
.kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
.kpi { border: 1px solid var(--ve-border); border-radius: var(--ve-radius); padding: 12px; background: var(--ve-bg); }
.kpi span { display: block; font-family: var(--ve-mono); font-size: 9px; text-transform: uppercase; letter-spacing: .09em; color: var(--ve-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.kpi b { display: block; margin-top: 8px; font-family: var(--ve-display); font-size: 22px; font-weight: 600; letter-spacing: -.03em; }
.kpi em { font-family: var(--ve-mono); font-size: 10px; font-style: normal; color: var(--ve-accent); }
.chart { display: flex; align-items: end; gap: 6px; height: 174px; padding-top: 16px; border-top: 1px solid var(--ve-border); }
.chart i { display: block; flex: 1; min-width: 4px; height: var(--h); background: linear-gradient(180deg, var(--ve-accent), color-mix(in srgb, var(--ve-accent) 12%, transparent)); border-radius: 2px 2px 0 0; opacity: .85; }
.chart i:nth-child(3n) { background: linear-gradient(180deg, var(--ve-accent2), color-mix(in srgb, var(--ve-accent2) 12%, transparent)); }
.chart-axis { display: flex; justify-content: space-between; font-family: var(--ve-mono); font-size: 9px; color: var(--ve-muted); padding-top: 8px; }
.tabs { display: flex; gap: 4px; flex-wrap: wrap; }
.tab { border: 1px solid transparent; background: transparent; color: var(--ve-muted); padding: 6px 9px; border-radius: calc(var(--ve-radius) * .55); cursor: pointer; font-size: 11px; }
.tab[aria-selected="true"], .tab:hover { color: var(--ve-text); background: var(--ve-elevated); border-color: var(--ve-border); }
.table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
.table th { text-align: left; font-family: var(--ve-mono); font-size: 8.5px; letter-spacing: .1em; text-transform: uppercase; color: var(--ve-muted); padding: 8px 6px; border-bottom: 1px solid var(--ve-border); }
.table td { padding: 8px 6px; border-bottom: 1px solid color-mix(in srgb, var(--ve-border) 65%, transparent); }
.table td:first-child { font-family: var(--ve-mono); }
.positive { color: var(--ve-accent); } .negative { color: var(--ve-danger); }
.insight { font-size: 12px; color: var(--ve-muted); line-height: 1.65; }
.insight strong { display: block; color: var(--ve-text); font-size: 17px; line-height: 1.3; margin: 8px 0 10px; font-family: var(--ve-display); }
.bar-list { display: grid; gap: 10px; margin-top: 14px; }
.bar-list div { display: grid; grid-template-columns: 64px 1fr 38px; gap: 8px; align-items: center; font-size: 10px; color: var(--ve-muted); }
.bar-list i { height: 5px; background: var(--ve-elevated); border-radius: 3px; overflow: hidden; }
.bar-list i::after { content: ""; display: block; width: var(--w); height: 100%; background: var(--ve-accent); }
.app-layout { display: grid; grid-template-columns: 214px minmax(0, 1fr) 264px; gap: 14px; padding: 16px 0 40px; min-height: calc(100vh - 120px); }
.list { display: flex; flex-direction: column; }
.list-item { display: grid; grid-template-columns: 1fr auto; gap: 10px; padding: 12px 4px; border-bottom: 1px solid var(--ve-border); }
.list-item b { font-size: 12px; font-weight: 600; }
.list-item p { margin: 3px 0 0; font-size: 10.5px; color: var(--ve-muted); line-height: 1.4; }
.list-item time { font-family: var(--ve-mono); font-size: 9px; color: var(--ve-muted); }
.composer { border: 1px solid var(--ve-border); border-radius: var(--ve-radius); padding: 16px; background: var(--ve-surface); }
.composer h1 { font-family: var(--ve-display); font-size: clamp(28px, 3vw, 44px); line-height: 1.02; letter-spacing: -.035em; margin: 10px 0 14px; }
.composer .input { min-height: 116px; border: 1px solid var(--ve-border); border-radius: calc(var(--ve-radius) * .6); background: var(--ve-bg); padding: 12px; color: var(--ve-muted); font-size: 12px; }
.chip-row { display: flex; flex-wrap: wrap; gap: 6px; }
.chip { border: 1px solid var(--ve-border); border-radius: 99px; padding: 5px 9px; font-family: var(--ve-mono); font-size: 9px; color: var(--ve-muted); }
.hud { position: relative; min-height: calc(100vh - 74px); padding: 18px 0 40px; display: grid; grid-template-columns: minmax(0, 1fr) 272px; grid-template-rows: auto 1fr auto; gap: 14px; }
.hud-main { grid-row: 1 / span 2; position: relative; border: 1px solid var(--ve-border); border-radius: var(--ve-radius); overflow: hidden; min-height: 440px; background: var(--ve-surface); }
.hud-main canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
.hud-top { position: relative; z-index: 1; display: flex; justify-content: space-between; gap: 16px; padding: 18px; }
.hud-top .ve-display { max-width: 13ch; font-size: clamp(32px, 4vw, 58px); line-height: .98; }
.hud-side { display: flex; flex-direction: column; gap: 14px; }
.hud-panel { border: 1px solid var(--ve-border); border-radius: var(--ve-radius); padding: 14px; background: color-mix(in srgb, var(--ve-surface) 90%, transparent); }
.hud-panel h2 { margin: 0 0 10px; font-family: var(--ve-mono); font-size: 9px; letter-spacing: .14em; text-transform: uppercase; color: var(--ve-muted); }
.objectives { display: grid; gap: 8px; list-style: none; padding: 0; margin: 0; font-size: 11.5px; }
.objectives li { display: flex; gap: 8px; padding-bottom: 8px; border-bottom: 1px solid var(--ve-border); }
.objectives li::before { content: "◇"; color: var(--ve-accent); }
.hud-bottom { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.radar { aspect-ratio: 1; border: 1px solid var(--ve-border); border-radius: 50%; position: relative; margin: 8px auto; width: 150px; max-width: 100%; }
.radar::before, .radar::after { content: ""; position: absolute; border: 1px solid color-mix(in srgb, var(--ve-accent) 40%, transparent); border-radius: 50%; inset: 22%; }
.radar::after { inset: 43%; background: var(--ve-accent); box-shadow: 0 0 18px var(--ve-accent); }
.game { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(280px, .8fr); gap: clamp(24px, 5vw, 70px); align-items: center; padding: clamp(34px, 7vh, 70px) 0 42px; min-height: calc(100vh - 160px); }
.game-title h1 { font-size: clamp(58px, 8vw, 116px); text-transform: uppercase; line-height: .86; }
.game-side { display: grid; gap: 10px; }
.mission { border: 1px solid var(--ve-border); background: color-mix(in srgb, var(--ve-surface) 86%, transparent); border-radius: var(--ve-radius); padding: 15px; display: grid; grid-template-columns: 1fr auto; gap: 8px; }
.mission b { font-family: var(--ve-display); font-size: 14px; }
.mission p { margin: 3px 0 0; font-size: 10.5px; color: var(--ve-muted); }
.mission span { font-family: var(--ve-mono); font-size: 9px; color: var(--ve-accent); }
.game-stats { display: flex; gap: 20px; margin-top: 26px; }
.game-stats div b { display: block; font-family: var(--ve-display); font-size: 26px; }
.game-stats div span { font-family: var(--ve-mono); font-size: 9px; color: var(--ve-muted); text-transform: uppercase; letter-spacing: .1em; }
.editorial { padding: clamp(28px, 5vh, 54px) 0 46px; }
.masthead { display: flex; justify-content: space-between; align-items: end; padding-bottom: 12px; border-bottom: 2px solid var(--ve-text); }
.masthead b { font-family: var(--ve-display); font-size: clamp(38px, 6vw, 84px); line-height: .8; letter-spacing: -.06em; }
.masthead span { font-family: var(--ve-mono); font-size: 9px; letter-spacing: .12em; text-transform: uppercase; color: var(--ve-muted); }
.ed-grid { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(230px, .6fr); gap: 34px; padding-top: 26px; }
.ed-grid h1 { margin: 0 0 16px; font-family: var(--ve-display); font-size: clamp(40px, 5.3vw, 78px); line-height: .95; letter-spacing: -.045em; }
.ed-grid .standfirst { columns: 2; column-gap: 28px; font-size: 13px; line-height: 1.65; color: var(--ve-muted); }
.drop::first-letter { float: left; font-family: var(--ve-display); font-size: 56px; line-height: .8; padding: 4px 7px 0 0; color: var(--ve-accent); }
.ed-aside { border-left: 1px solid var(--ve-border); padding-left: 20px; }
.ed-aside .feature { min-height: 220px; aspect-ratio: 4/3; margin-bottom: 14px; }
.pullquote { font-family: var(--ve-display); font-size: 24px; line-height: 1.12; letter-spacing: -.03em; margin: 16px 0; }
.motion-stage { position: relative; overflow: hidden; border: 1px solid var(--ve-border); border-radius: var(--ve-radius); min-height: 430px; margin: 24px 0 0; background: var(--ve-surface); }
.motion-stage canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
.motion-copy { position: relative; z-index: 1; padding: clamp(28px, 5vw, 64px); max-width: 760px; }
.motion-copy h1 { margin: 10px 0 16px; font-family: var(--ve-display); font-size: clamp(52px, 7.2vw, 104px); line-height: .86; letter-spacing: -.055em; }
.timeline { position: absolute; inset: auto 16px 16px; z-index: 1; display: flex; gap: 3px; align-items: end; height: 40px; }
.timeline i { flex: var(--n); height: var(--h); min-height: 4px; background: var(--ve-accent); opacity: .7; }
.timeline-labels { display: flex; justify-content: space-between; margin-top: 16px; font-family: var(--ve-mono); font-size: 9px; color: var(--ve-muted); }
.motion-info { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: var(--ve-border); border: 1px solid var(--ve-border); margin-top: 14px; }
.motion-info div { background: var(--ve-bg); padding: 12px 14px; }
.motion-info b { display: block; font-size: 13px; } .motion-info span { font-family: var(--ve-mono); font-size: 8.5px; color: var(--ve-muted); text-transform: uppercase; letter-spacing: .08em; }
.scene3d { padding: clamp(26px, 5vh, 52px) 0 46px; }
.scene3d h1 { font-family: var(--ve-display); font-size: clamp(50px, 7vw, 100px); line-height: .9; letter-spacing: -.055em; max-width: 15ch; margin: 14px 0 18px; }
.scene-wrap { position: relative; border: 1px solid var(--ve-border); border-radius: var(--ve-radius); overflow: hidden; min-height: 440px; margin-top: 22px; }
.scene-wrap canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
.hotspot { position: absolute; z-index: 1; border-left: 1px solid var(--ve-accent); padding: 4px 0 4px 8px; font-family: var(--ve-mono); font-size: 9px; color: var(--ve-text); background: color-mix(in srgb, var(--ve-bg) 54%, transparent); }
.hotspot b { display: block; font-size: 11px; }
.hotspot--a { left: 12%; top: 20%; } .hotspot--b { right: 11%; top: 38%; } .hotspot--c { left: 38%; bottom: 16%; }
.depth { position: absolute; z-index: 1; left: 16px; bottom: 16px; font-family: var(--ve-mono); font-size: 9px; color: var(--ve-muted); }
.depth i { display: inline-block; width: 42px; height: 1px; background: var(--ve-border); vertical-align: middle; margin: 0 6px; }
.mobile-stage { min-height: calc(100vh - 130px); display: grid; place-items: center; padding: 28px 0 40px; }
.phone { width: min(378px, 92vw); height: min(660px, calc(100vh - 150px)); border: 1px solid var(--ve-border); border-radius: calc(var(--ve-radius) * 3); background: var(--ve-surface); box-shadow: 0 30px 90px rgba(0,0,0,.4); overflow: hidden; display: flex; flex-direction: column; position: relative; }
.phone::before { content: ""; position: absolute; top: 9px; left: 50%; transform: translateX(-50%); width: 74px; height: 5px; border-radius: 99px; background: var(--ve-border); z-index: 3; }
.phone-head { padding: 24px 18px 10px; display: flex; justify-content: space-between; font-family: var(--ve-mono); font-size: 9px; color: var(--ve-muted); }
.phone-body { padding: 8px 18px 0; overflow: hidden; flex: 1; }
.phone h1 { font-family: var(--ve-display); font-size: 36px; line-height: .95; letter-spacing: -.045em; margin: 8px 0 10px; }
.phone .feature { min-height: 220px; aspect-ratio: 1.3; margin: 12px 0; }
.phone-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin: 12px 0; }
.phone-grid div { background: var(--ve-bg); border: 1px solid var(--ve-border); border-radius: calc(var(--ve-radius) * .6); padding: 9px; }
.phone-grid b { display: block; font-family: var(--ve-display); font-size: 16px; } .phone-grid span { font-family: var(--ve-mono); font-size: 8px; color: var(--ve-muted); text-transform: uppercase; }
.phone-tabbar { display: flex; justify-content: space-around; border-top: 1px solid var(--ve-border); padding: 11px 4px; font-family: var(--ve-mono); font-size: 8px; color: var(--ve-muted); }
.phone-tabbar .active { color: var(--ve-text); border-bottom: 1px solid var(--ve-accent); padding-bottom: 2px; }
.poster { min-height: calc(100vh - 72px); display: grid; place-content: center; padding: 40px 0; text-align: left; border-bottom: 1px solid var(--ve-border); }
.poster h1 { font-size: clamp(74px, 14vw, 210px); line-height: .78; letter-spacing: -.07em; text-transform: uppercase; margin: 18px 0 22px; max-width: 9ch; }
.poster .ve-lead { max-width: 42ch; }
.poster-meta { display: flex; flex-wrap: wrap; gap: 10px 34px; margin-top: 32px; font-family: var(--ve-mono); font-size: 10px; color: var(--ve-muted); text-transform: uppercase; letter-spacing: .1em; }
.site-foot { display: flex; justify-content: space-between; gap: 20px; border-top: 1px solid var(--ve-border); padding: 18px 0 26px; font-family: var(--ve-mono); font-size: 9px; color: var(--ve-muted); }
[data-reveal] { animation: veReveal var(--ve-base) var(--ve-ease-out) both; }
[data-reveal="2"] { animation-delay: calc(var(--ve-base) * .4); }
@keyframes veReveal { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
@media (max-width: 980px) {
  .nav { display: none; }
  .hero, .game, .ed-grid { grid-template-columns: 1fr; min-height: 0; }
  .console, .app-layout { grid-template-columns: 1fr; }
  .hud { grid-template-columns: 1fr; }
  .hud-main { grid-row: auto; min-height: 360px; }
  .kpis { grid-template-columns: repeat(2, 1fr); }
  .feature { aspect-ratio: 16/10; min-height: 280px; }
  .site-head { min-height: 60px; }
}
@media (prefers-reduced-motion: reduce) { [data-reveal] { animation: none !important; } }
`;

function esc(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function isLight(ad: ArtDirection): boolean {
  const [r, g, b] = hexToRgb(ad.palette.bg);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.5;
}

function seriesBars(series: number[] | undefined): string {
  const data = series?.length ? series : [30, 48, 40, 62, 54, 72, 66];
  return data.map((n) => `<i style="--h:${Math.max(8, Math.min(100, n))}%"></i>`).join('');
}

function stats(ad: ArtDirection, s: ShowcaseSpec): string {
  return `<div class="stat-row">${s.metrics.slice(0, 3).map((m) => `<div class="stat"><b>${esc(m.value)}</b><span>${esc(m.label)}</span></div>`).join('')}</div>`;
}

function feature(ad: ArtDirection, s: ShowcaseSpec, wide = false): string {
  return `<div class="feature${wide ? ' feature--wide' : ''}" data-reveal="2">
    <canvas data-effect="${esc(s.effects[1])}" data-bg="${ad.palette.surface}" data-accent="${ad.palette.accent}" data-accent2="${ad.palette.accent2}" aria-label="Visualización generativa ${esc(s.effects[1])}"></canvas>
    <div class="feature-overlay"><div><div class="feature-label">${esc(s.tags[0] ?? 'Visual')}</div><div class="feature-value">${esc(s.metrics[0]?.value ?? s.title)}</div></div><span class="status-dot" aria-label="Activo"></span></div>
  </div>`;
}

function head(ad: ArtDirection, s: ShowcaseSpec): string {
  return `<header class="site-head ve-container"><div class="brand"><span class="brand-mark">VE</span>${esc(s.title)}</div>
  <nav class="nav" aria-label="Navegación principal">${s.nav.map((n, i) => `<a href="#${esc(n.toLowerCase().replace(/\s+/g, '-'))}"${i === 0 ? ' aria-current="page"' : ''}>${esc(n)}</a>`).join('')}</nav>
  <span class="head-meta">${esc(s.kicker)}</span></header>`;
}

function foot(ad: ArtDirection, s: ShowcaseSpec): string {
  return `<footer class="site-foot ve-container"><span>${esc(s.title)} · Visual Engine 0.4</span><span>${esc(s.tags.join(' / '))}</span></footer>`;
}

function landing(ad: ArtDirection, s: ShowcaseSpec): string {
  return `${head(ad, s)}<main class="ve-container"><section class="hero">
    <div><div class="eyebrow-row"><span class="status-dot"></span><p class="ve-eyebrow">${esc(s.kicker)}</p></div>
      <h1>${esc(s.headline)}</h1><p class="ve-lead">${esc(s.lead)}</p>
      <div class="actions"><a class="ve-button" href="#accion">${esc(s.primary)}</a><a class="ve-button ve-button--ghost" href="#detalle">${esc(s.secondary)}</a></div>
      <div class="meta-line">${s.tags.map((t) => `<span>${esc(t)}</span>`).join('')}</div>${stats(ad, s)}
    </div>${feature(ad, s)}</section></main>${foot(ad, s)}`;
}

function dashboard(ad: ArtDirection, s: ShowcaseSpec): string {
  const rows = [
    [s.metrics[0]?.label ?? 'Núcleo', s.metrics[0]?.value ?? '—', s.metrics[0]?.delta ?? '+1,2 %'],
    [s.metrics[1]?.label ?? 'Borde', s.metrics[1]?.value ?? '—', s.metrics[1]?.delta ?? '-0,4'],
    ['Reserva', '12,8 %', '+0,2'],
    ['Cola', '04', 'estable'],
  ];
  return `${head(ad, s)}<main class="ve-container"><div class="console">
    <aside class="panel"><div class="brand" style="margin-bottom:20px"><span class="brand-mark">${esc(s.title.slice(0, 2).toUpperCase())}</span>${esc(s.title)}</div>
      <nav class="side-nav" aria-label="Secciones">${s.nav.map((n, i) => `<a href="#${esc(n.toLowerCase())}"${i === 0 ? ' aria-current="page"' : ''}>${esc(n)}<span>${String(i + 1).padStart(2, '0')}</span></a>`).join('')}</nav>
      <div class="side-note">Última sincronización<br>${new Date().toISOString().slice(0, 10)} · 09:42 UTC<br><br>Entorno verificado<br>Sin incidencias críticas</div>
    </aside>
    <section class="dash-main"><div class="panel"><div class="panel-head"><div><p class="ve-eyebrow">${esc(s.kicker)}</p><h2>${esc(s.headline)}</h2></div><div class="tabs" role="tablist">${['Resumen', 'Riesgo', 'Flujo'].map((t, i) => `<button type="button" class="tab" role="tab" data-tab="${t}" aria-selected="${i === 0}">${t}</button>`).join('')}</div></div>
      <div class="kpis">${s.metrics.map((m) => `<div class="kpi"><span>${esc(m.label)}</span><b>${esc(m.value)}</b>${m.delta ? `<em>${esc(m.delta)}</em>` : ''}</div>`).join('')}</div>
      <div class="chart" aria-label="Serie temporal">${seriesBars(s.series)}</div><div class="chart-axis"><span>08:00</span><span>10:00</span><span>12:00</span><span>14:00</span><span>16:00</span></div></div>
      <div class="panel"><div class="panel-head"><h3>Movimientos recientes</h3><span class="ve-mono" style="font-size:9px;color:var(--ve-muted)">${rows.length} registros</span></div>
      <table class="table"><thead><tr><th>Serie</th><th>Valor</th><th>Δ</th><th>Estado</th></tr></thead><tbody>${rows.map((r, i) => `<tr data-row><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td class="${i % 2 ? 'negative' : 'positive'}">${esc(r[2])}</td><td>${i === 3 ? 'cola' : 'liquidado'}</td></tr>`).join('')}</tbody></table></div>
    </section>
    <aside class="panel"><div class="panel-head"><h3>Lectura</h3><span class="status-dot"></span></div><div class="insight"><span class="ve-eyebrow">Ahora</span><strong>${esc(s.lead)}</strong>La señal se mantiene dentro del rango previsto. Revisa la ventana antes del cierre.</div>
      <div class="bar-list">${s.tags.map((t, i) => `<div><span>${esc(t)}</span><i style="--w:${68 - i * 17}%"></i><span>${68 - i * 17}%</span></div>`).join('')}</div>
      <hr class="ve-rule"><button class="ve-button" type="button" data-action style="width:100%">${esc(s.primary)}</button><div class="side-note">Modelo: local · Sin conexión externa</div>
    </aside></div></main>${foot(ad, s)}`;
}

function appLayout(ad: ArtDirection, s: ShowcaseSpec): string {
  return `${head(ad, s)}<main class="ve-container"><div class="app-layout">
    <aside class="panel"><div class="brand" style="margin-bottom:18px"><span class="brand-mark">${esc(s.title.slice(0, 2).toUpperCase())}</span>${esc(s.title)}</div>
      <nav class="side-nav" aria-label="Áreas">${s.nav.map((n, i) => `<a href="#${esc(n.toLowerCase())}"${i === 0 ? ' aria-current="page"' : ''}>${esc(n)}</a>`).join('')}</nav>
      <div class="side-note">${esc(s.kicker)}<br>${s.tags.map((t) => esc(t)).join('<br>')}</div></aside>
    <section style="display:grid;gap:12px;align-content:start">
      <div class="panel"><div class="panel-head"><div><p class="ve-eyebrow">${esc(s.kicker)}</p><h2>${esc(s.headline)}</h2></div><span class="chip">${esc(s.tags[0] ?? 'Activo')}</span></div>
        <div class="kpis" style="grid-template-columns:repeat(3,1fr)">${s.metrics.map((m) => `<div class="kpi"><span>${esc(m.label)}</span><b>${esc(m.value)}</b></div>`).join('')}</div></div>
      <div class="composer"><span class="ve-eyebrow">Espacio de trabajo</span><h1>${esc(s.lead)}</h1><div class="input" role="textbox" aria-label="Contenido de ejemplo" tabindex="0">Escribe una nota, adjunta evidencia o menciona a alguien del equipo…</div><div class="actions"><button class="ve-button" type="button" data-action>${esc(s.primary)}</button><button class="ve-button ve-button--ghost" type="button">${esc(s.secondary)}</button></div><div class="chip-row" style="margin-top:14px">${s.tags.map((t) => `<span class="chip">${esc(t)}</span>`).join('')}</div></div>
      <div class="panel"><div class="panel-head"><h3>Actividad</h3><div class="tabs" role="tablist">${['Todo', 'Mío'].map((t, i) => `<button class="tab" type="button" role="tab" data-tab="${t}" aria-selected="${i === 0}">${t}</button>`).join('')}</div></div>
      <div class="list">${['Contexto actualizado', 'Decisión registrada', 'Evidencia adjunta'].map((t, i) => `<div class="list-item" data-row><div><b>${t}</b><p>${esc(s.metrics[i % s.metrics.length]?.label ?? 'Actividad')} · ${esc(s.tags[i % s.tags.length] ?? 'equipo')}</p></div><time>${9 + i}:0${i + 2}</time></div>`).join('')}</div></div>
    </section>
    <aside class="panel"><div class="panel-head"><h3>Contexto</h3><span class="status-dot"></span></div><div class="insight"><strong>${esc(s.headline)}</strong>${esc(s.lead)}</div><hr class="ve-rule"><p class="ve-eyebrow">Serie</p><div class="chart" style="height:110px">${seriesBars(s.series)}</div><div class="side-note">Datos locales · ${new Date().toISOString().slice(0, 10)}</div></aside>
  </div></main>${foot(ad, s)}`;
}

function hud(ad: ArtDirection, s: ShowcaseSpec): string {
  return `${head(ad, s)}<main class="ve-container"><div class="hud">
    <section class="hud-main"><canvas data-effect="${esc(s.effects[1])}" data-bg="${ad.palette.bg}" data-accent="${ad.palette.accent}" data-accent2="${ad.palette.accent2}" aria-label="Instrumento ${esc(s.effects[1])}"></canvas>
      <div class="hud-top"><div><p class="ve-eyebrow"><span class="status-dot"></span> ${esc(s.kicker)}</p><h1 class="ve-display">${esc(s.headline)}</h1></div><span class="chip">${esc(s.tags[0] ?? 'Activo')}</span></div>
      <div style="position:absolute;left:18px;bottom:18px;z-index:1;max-width:34ch"><p class="ve-lead" style="font-size:13px">${esc(s.lead)}</p><div class="actions"><button type="button" class="ve-button" data-action>${esc(s.primary)}</button><button type="button" class="ve-button ve-button--ghost">${esc(s.secondary)}</button></div></div>
    </section>
    <aside class="hud-side"><div class="hud-panel"><h2>Objetivos</h2><ul class="objectives">${s.tags.map((t, i) => `<li>${esc(t)} <span style="margin-left:auto;color:var(--ve-muted)">0${i + 1}</span></li>`).join('')}</ul></div>
      <div class="hud-panel"><h2>Telemetría</h2><div class="radar" aria-hidden="true"></div><div class="kpis" style="grid-template-columns:1fr 1fr">${s.metrics.slice(0, 4).map((m) => `<div class="kpi"><span>${esc(m.label)}</span><b style="font-size:15px">${esc(m.value)}</b></div>`).join('')}</div></div>
      <div class="hud-panel"><h2>Registro</h2><div class="insight">${esc(s.lead)}</div><div class="side-note">Sistema autónomo · sin enlace externo</div></div></aside>
    <div class="hud-bottom">${s.metrics.map((m) => `<div class="kpi"><span>${esc(m.label)}</span><b>${esc(m.value)}</b></div>`).join('')}</div>
  </div></main>${foot(ad, s)}`;
}

function gameMenu(ad: ArtDirection, s: ShowcaseSpec): string {
  return `${head(ad, s)}<main class="ve-container"><div class="game">
    <div class="game-title"><p class="ve-eyebrow">${esc(s.kicker)}</p><h1>${esc(s.headline)}</h1><p class="ve-lead">${esc(s.lead)}</p>
      <div class="actions"><button class="ve-button" type="button" data-action>${esc(s.primary)}</button><button class="ve-button ve-button--ghost" type="button">${esc(s.secondary)}</button></div>
      <div class="game-stats">${s.metrics.map((m) => `<div><b>${esc(m.value)}</b><span>${esc(m.label)}</span></div>`).join('')}</div></div>
    <aside class="game-side"><div class="mission"><div><b>${esc(s.tags[0] ?? 'Misión principal')}</b><p>${esc(s.tags[1] ?? 'Objetivo activo')} · ${esc(s.tags[2] ?? 'Sin retorno')}</p></div><span>ACTIVO</span></div>
      ${feature(ad, s, true)}
      <div class="mission"><div><b>${esc(s.nav[1] ?? 'Contratos')}</b><p>Recompensa verificada · sin conexión</p></div><span>04</span></div>
      <div class="mission"><div><b>${esc(s.nav[2] ?? 'Personaje')}</b><p>Configuración guardada localmente</p></div><span>LISTO</span></div></aside>
  </div></main>${foot(ad, s)}`;
}

function editorial(ad: ArtDirection, s: ShowcaseSpec): string {
  return `${head(ad, s)}<main class="ve-container"><article class="editorial"><div class="masthead"><b>${esc(s.title)}</b><span>${esc(s.kicker)}</span></div>
    <div class="ed-grid"><div><p class="ve-eyebrow">Ensayo visual</p><h1>${esc(s.headline)}</h1><p class="ve-lead" style="margin-bottom:18px">${esc(s.lead)}</p>
      <div class="standfirst"><p class="drop">La atención no se pierde de golpe: se fragmenta en gestos pequeños. Una notificación, una pestaña, una promesa de que lo importante está en otro sitio. Este número reúne imágenes y notas que intentan recuperar una mirada sostenida.</p><p>No hay una conclusión limpia. Hay una práctica: volver al objeto, mirarlo otra vez y aceptar que la duración también es una forma de conocimiento.</p><p>${s.tags.join(' · ')}. Fotografías y textos seleccionados por el equipo editorial.</p></div>
      <div class="motion-info">${s.metrics.map((m) => `<div><b>${esc(m.value)}</b><span>${esc(m.label)}</span></div>`).join('')}</div></div>
      <aside class="ed-aside">${feature(ad, s, true)}<p class="ve-eyebrow">Del número</p><div class="pullquote">«Mirar es una decisión que se renueva.»</div><p class="insight">${esc(s.lead)}</p><hr class="ve-rule"><button class="ve-button" type="button" data-action style="width:100%">${esc(s.primary)}</button></aside></div>
  </article></main>${foot(ad, s)}`;
}

function motion(ad: ArtDirection, s: ShowcaseSpec): string {
  const plan = buildMotionDirector(ad);
  return `${head(ad, s)}<main class="ve-container"><section class="motion-stage"><canvas data-effect="${esc(s.effects[1])}" data-bg="${ad.palette.bg}" data-accent="${ad.palette.accent}" data-accent2="${ad.palette.accent2}" aria-label="Visualización ${esc(s.effects[1])}"></canvas>
    <div class="motion-copy"><p class="ve-eyebrow">${esc(s.kicker)}</p><h1>${esc(s.headline)}</h1><p class="ve-lead">${esc(s.lead)}</p><div class="actions"><button class="ve-button" type="button" data-action>${esc(s.primary)}</button><button class="ve-button ve-button--ghost" type="button">${esc(s.secondary)}</button></div></div>
    <div class="timeline" aria-hidden="true">${seriesBars(s.series)}</div></section>
    <div class="timeline-labels"><span>00:00</span><span>00:24</span><span>00:48</span><span>01:12</span><span>01:24</span></div>
    <div class="motion-info"><div><b>${plan.easings.out}</b><span>Easing de entrada</span></div><div><b>${plan.durations.base} ms</b><span>Duración base</span></div><div><b>${plan.reducedMotion}</b><span>Reduced motion</span></div></div>
  </main>${foot(ad, s)}`;
}

function scene3d(ad: ArtDirection, s: ShowcaseSpec): string {
  return `${head(ad, s)}<main class="ve-container"><section class="scene3d"><p class="ve-eyebrow"><span class="status-dot"></span> ${esc(s.kicker)}</p><h1>${esc(s.headline)}</h1><p class="ve-lead">${esc(s.lead)}</p>
    <div class="scene-wrap"><canvas data-effect="${esc(s.effects[1])}" data-bg="${ad.palette.bg}" data-accent="${ad.palette.accent}" data-accent2="${ad.palette.accent2}" aria-label="Campo profundo"></canvas>
      <div class="hotspot hotspot--a"><b>${esc(s.metrics[0]?.value ?? 'Objeto')}</b>${esc(s.metrics[0]?.label ?? 'Distancia')}</div><div class="hotspot hotspot--b"><b>${esc(s.metrics[1]?.value ?? '—')}</b>${esc(s.metrics[1]?.label ?? 'Corrimiento')}</div><div class="hotspot hotspot--c"><b>${esc(s.metrics[2]?.value ?? '—')}</b>${esc(s.metrics[2]?.label ?? 'Escala')}</div>
      <div class="depth">CERCA<i></i>LEJOS</div></div>
    <div class="actions" style="margin-top:18px"><button class="ve-button" type="button" data-action>${esc(s.primary)}</button><button class="ve-button ve-button--ghost" type="button">${esc(s.secondary)}</button><span class="chip">${esc(s.tags.join(' · '))}</span></div></section></main>${foot(ad, s)}`;
}

function mobile(ad: ArtDirection, s: ShowcaseSpec): string {
  return `${head(ad, s)}<main class="ve-container"><div class="mobile-stage"><div class="phone"><div class="phone-head"><span>9:41</span><span>${esc(s.kicker)}</span></div>
    <div class="phone-body"><p class="ve-eyebrow">${esc(s.tags[0] ?? 'Hoy')}</p><h1>${esc(s.headline)}</h1>${feature(ad, s, true)}
      <div class="phone-grid">${s.metrics.map((m) => `<div><b>${esc(m.value)}</b><span>${esc(m.label)}</span></div>`).join('')}</div>
      <p class="ve-lead" style="font-size:12px">${esc(s.lead)}</p><div class="actions" style="margin-top:12px"><button class="ve-button" type="button" data-action style="min-height:38px;font-size:12px">${esc(s.primary)}</button></div></div>
    <nav class="phone-tabbar" aria-label="Navegación móvil">${s.nav.map((n, i) => `<span${i === 0 ? ' class="active" aria-current="page"' : ''}>${esc(n)}</span>`).join('')}</nav></div></div></main>${foot(ad, s)}`;
}

function poster(ad: ArtDirection, s: ShowcaseSpec): string {
  return `${head(ad, s)}<main class="ve-container"><section class="poster"><p class="ve-eyebrow">${esc(s.kicker)}</p><h1>${esc(s.headline)}</h1><p class="ve-lead">${esc(s.lead)}</p>
    <div class="poster-meta"><span>${esc(s.tags.join(' / '))}</span><span>${s.metrics.map((m) => `${esc(m.label)} ${esc(m.value)}`).join(' · ')}</span><span>Entrada libre hasta completar aforo</span></div>
    <div class="actions" style="margin-top:30px"><button class="ve-button" type="button" data-action>${esc(s.primary)}</button><button class="ve-button ve-button--ghost" type="button">${esc(s.secondary)}</button></div></section></main>${foot(ad, s)}`;
}

const RENDERERS: Record<ShowcaseSpec['archetype'], (ad: ArtDirection, s: ShowcaseSpec) => string> = {
  landing, dashboard, app: appLayout, hud, 'game-menu': gameMenu, editorial,
  motion, scene3d, mobile, poster,
};

function pageHtml(ad: ArtDirection, s: ShowcaseSpec): string {
  const body = RENDERERS[s.archetype](ad, s);
  const imports = s.effects.map((id, i) => `import * as fx${i} from '../../assets/effects/${id}/effect.js';`).join('\n');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(s.title)} · Visual Engine 0.4</title><link rel="stylesheet" href="./design-system.css"><link rel="stylesheet" href="./page.css">
</head><body data-style="${ad.style.id}" data-mode="${isLight(ad) ? 'light' : 'dark'}">
<canvas class="ve-bg" data-effect="${esc(s.effects[0])}" data-bg="${ad.palette.bg}" data-accent="${ad.palette.accent}" data-accent2="${ad.palette.accent2}" aria-hidden="true"></canvas><div class="ve-scrim" aria-hidden="true"></div>
<div class="ve-shell">${body}</div>
<script type="module">
${imports}
const fx = { ${s.effects.map((id, i) => `'${id}': fx${i}`).join(', ')} };
const failed = [];
for (const canvas of document.querySelectorAll('canvas[data-effect]')) {
  const mod = fx[canvas.dataset.effect];
  try {
    if (mod && typeof mod.mount === 'function') mod.mount(canvas, { bg: canvas.dataset.bg, accent: canvas.dataset.accent, accent2: canvas.dataset.accent2, speed: 0.8 });
    else failed.push(canvas.dataset.effect + ': sin mount');
  } catch (error) { failed.push(canvas.dataset.effect + ': ' + error.message); }
}
document.querySelectorAll('[data-tab]').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('[data-tab]').forEach((other) => other.setAttribute('aria-selected', String(other === tab)));
  });
});
document.querySelectorAll('[data-action]').forEach((button) => {
  button.addEventListener('click', () => {
    const pressed = button.getAttribute('aria-pressed') === 'true';
    button.setAttribute('aria-pressed', String(!pressed));
    button.textContent = pressed ? button.dataset.label || button.textContent : 'Hecho';
  });
});
if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.querySelectorAll('[data-reveal]').forEach((el) => { el.style.opacity = '0'; requestAnimationFrame(() => { el.style.opacity = ''; }); });
}
window.__veShowcase = { id: '${s.id}', effects: ${JSON.stringify(s.effects)}, failed };
document.fonts.ready.then(() => { window.__veReady = true; });
</script></body></html>`;
}

function readme(ad: ArtDirection, s: ShowcaseSpec, measurement?: ShowcaseMeasurement): string {
  const plan = buildMotionDirector(ad);
  return `# ${s.title} · ${ad.style.name}

${s.brief}

- **Arquetipo:** ${s.archetype}
- **Estilo:** ${ad.style.id}
- **Efectos:** ${s.effects.map((e) => '`' + e + '`').join(' + ')}
- **Paleta:** fondo \`${ad.palette.bg}\`, texto \`${ad.palette.text}\`, acento \`${ad.palette.accent}\`
- **Tipografía:** ${ad.typography.families.display} / ${ad.typography.families.body}; hero ${ad.typography.sizes.hero}px, cuerpo ${ad.typography.sizes.body}px
- **Layout:** ${ad.layout.columns} columnas, gutter ${ad.layout.gutter}px, máximo ${ad.layout.maxWidth}px

## Uso

\`\`\`bash
# desde la raíz del repositorio
npx serve library/showcase
# abrir /${s.id}/index.html
\`\`\`

Los módulos de efectos y las fuentes se sirven desde \`../../assets\`; por eso no se abre con \`file://\` sin servidor local.

## Interacción

- Navegación y tabs con estado \`aria-selected\`.
- Botones de acción con \`aria-pressed\`.
- Movimiento de entrada con \`prefers-reduced-motion\`.
- Medición: ${measurement ? `${measurement.fps} FPS, ${measurement.loadMs} ms de carga, ${measurement.contrastViolations} violaciones de contraste en ${measurement.contrastChecked} textos, overflow X ${measurement.overflowX}px.` : 'pendiente de ejecutar `ve showcase --measure`.'}

## Motion

${plan.recipes.map((r) => `- ${r.id}: ${r.durationMs} ms, ${r.purpose}`).join('\n')}

## Límites

- Contenido y métricas son ficticios y verificables como maqueta, no datos de negocio reales.
- La composición usa los 58 efectos existentes; no añade efectos nuevos.
- La auditoría visual automática no sustituye la evaluación artística humana.
`;
}

function designFile(ad: ArtDirection): string {
  return designMarkdown(ad) + `\n## Aplicación en esta composición\n\nLa página usa tokens DTCG y el CSS generado; los efectos se montan sin dependencias de red.\n`;
}

export interface RenderShowcaseResult {
  outDir: string;
  compositions: { id: string; html: string; style: string; archetype: string; effects: string[] }[];
  catalog: string;
}

export function renderShowcase(opts: { outDir?: string; ids?: string[] } = {}): RenderShowcaseResult {
  const outDir = ensureDir(path.resolve(opts.outDir ?? 'library/showcase'));
  const assets = ensureDir(path.join(outDir, 'assets'));
  const fontsSrc = path.resolve('library/fonts');
  const fontsDst = path.join(assets, 'fonts');
  if (fs.existsSync(fontsSrc)) fs.cpSync(fontsSrc, fontsDst, { recursive: true });
  const effectIds = [...new Set(SHOWCASE_SPECS.flatMap((s) => s.effects))];
  for (const id of effectIds) {
    const dir = path.join(assets, 'effects');
    ensureDir(dir);
    applyEffect(id, { outDir: dir });
  }
  const selected = opts.ids?.length ? SHOWCASE_SPECS.filter((s) => opts.ids!.includes(s.id)) : SHOWCASE_SPECS;
  const compositions: RenderShowcaseResult['compositions'] = [];
  for (const s of selected) {
    const ad = buildArtDirection({
      brief: s.brief, style: s.style, projectType: s.projectType,
      preferences: { effects: s.effects },
    });
    const dir = ensureDir(path.join(outDir, s.id));
    fs.writeFileSync(path.join(dir, 'index.html'), pageHtml(ad, s), 'utf8');
    fs.writeFileSync(path.join(dir, 'design-system.css'), artDirectionCss(ad, '../../assets/fonts'), 'utf8');
    fs.writeFileSync(path.join(dir, 'page.css'), PAGE_CSS, 'utf8');
    fs.writeFileSync(path.join(dir, 'tokens.json'), JSON.stringify(ad.tokenSet, null, 2) + '\n', 'utf8');
    fs.writeFileSync(path.join(dir, 'DESIGN.md'), designFile(ad), 'utf8');
    fs.writeFileSync(path.join(dir, 'MOTION.md'), motionDirectorMarkdown(ad, buildMotionDirector(ad)), 'utf8');
    const existing = fs.existsSync(path.join(dir, 'measurement.json'))
      ? JSON.parse(fs.readFileSync(path.join(dir, 'measurement.json'), 'utf8')) as ShowcaseMeasurement
      : undefined;
    fs.writeFileSync(path.join(dir, 'README.md'), readme(ad, s, existing), 'utf8');
    compositions.push({ id: s.id, html: path.join(dir, 'index.html'), style: ad.style.id, archetype: s.archetype, effects: s.effects });
  }
  const catalog = path.join(outDir, 'catalog.json');
  fs.writeFileSync(catalog, JSON.stringify({ version: '0.4', count: SHOWCASE_SPECS.length, generatedAt: new Date().toISOString(), compositions }, null, 2) + '\n', 'utf8');
  const gallery = `# Galería de composiciones 0.4\n\n${SHOWCASE_SPECS.map((s) => `- **${s.title}** (\`${s.id}\`) · ${s.archetype} · ${s.style} · ${s.effects.join(' + ')}`).join('\n')}\n\nServir con \`npx serve library/showcase\` y abrir \`/<id>/index.html\`. Medir con \`ve showcase --measure\`.\n`;
  fs.writeFileSync(path.join(outDir, 'GALLERY.md'), gallery, 'utf8');
  return { outDir, compositions, catalog };
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8',
};

async function serve(dir: string): Promise<{ url: string; close: () => Promise<void> }> {
  const root = path.resolve(dir);
  const server = http.createServer((req, res) => {
    const raw = decodeURIComponent((req.url ?? '/').split('?')[0]);
    const target = path.resolve(root, '.' + raw);
    if (!target.startsWith(root)) { res.writeHead(403); res.end('forbidden'); return; }
    const file = fs.existsSync(target) && fs.statSync(target).isDirectory() ? path.join(target, 'index.html') : target;
    if (!fs.existsSync(file)) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 0;
  return { url: `http://127.0.0.1:${port}`, close: () => new Promise((resolve) => server.close(() => resolve())) };
}

async function auditPage(page: import('playwright').Page): Promise<{ violations: number; checked: number; worst: number; samples: { text: string; ratio: number; color: string; background: string; size: number }[] }> {
  return page.evaluate(() => {
    const parse = (value: string): number[] => {
      const m = value.match(/rgba?\(([^)]+)\)/);
      if (!m) return [0, 0, 0, 0];
      const parts = m[1].split(',').map((x) => Number(x.trim()));
      return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0, parts[3] ?? 1];
    };
    const lum = (rgb: number[]) => {
      const f = rgb.slice(0, 3).map((v) => { const s = v / 255; return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); });
      return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2];
    };
    const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    let checked = 0, violations = 0, worst = 99;
    const samples: { text: string; ratio: number; color: string; background: string; size: number }[] = [];
    const rootBg = parse(getComputedStyle(document.documentElement).backgroundColor);
    for (const el of Array.from(document.querySelectorAll('h1,h2,h3,p,a,button,span,li,label,strong,em,b'))) {
      const text = (el.textContent ?? '').trim();
      if (!text || text.length > 180) continue;
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) < 0.1) continue;
      if (style.webkitBackgroundClip === 'text' || style.backgroundClip === 'text') continue;
      const rect = el.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) continue;
      const fg = parse(style.color);
      if (fg[3] < 0.1) continue;
      let node: Element | null = el;
      let bg = [5, 7, 13, 1];
      while (node) {
        const c = parse(getComputedStyle(node).backgroundColor);
        if (c[3] > 0.2) { bg = c; break; }
        node = node.parentElement;
      }
      if (bg[3] === 1 && (bg[0] === 5 && bg[1] === 7 && bg[2] === 13) && rootBg[3] > 0.2) bg = rootBg;
      const ratio = contrast(lum(fg), lum(bg));
      const size = parseFloat(style.fontSize);
      if (size < 8) continue;
      const large = size >= 24 || (size >= 18.66 && Number(style.fontWeight) >= 700);
      checked++;
      worst = Math.min(worst, ratio);
      if (ratio < (large ? 3 : 4.5)) {
        violations++;
        if (samples.length < 8) samples.push({ text: text.slice(0, 44), ratio: Math.round(ratio * 100) / 100, color: style.color, background: 'rgb(' + bg.slice(0, 3).join(',') + ')', size });
      }
    }
    return { violations, checked, worst: checked ? Math.round(worst * 100) / 100 : 0, samples };
  });
}

export async function measureShowcase(opts: { outDir?: string; ids?: string[] } = {}): Promise<ShowcaseMeasurement[]> {
  const outDir = path.resolve(opts.outDir ?? 'library/showcase');
  const selected = opts.ids?.length ? SHOWCASE_SPECS.filter((s) => opts.ids!.includes(s.id)) : SHOWCASE_SPECS;
  const server = await serve(outDir);
  const browser = await chromium.launch({ headless: true, args: ['--hide-scrollbars', '--force-color-profile=srgb', '--disable-dev-shm-usage'] });
  const results: ShowcaseMeasurement[] = [];
  let reducedWorks = false;
  try {
    for (const s of selected) {
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, colorScheme: isLight(buildArtDirection({ brief: s.brief, style: s.style })) ? 'light' : 'dark' });
      const page = await context.newPage();
      const errors: string[] = [];
      page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text().slice(0, 400)); });
      page.on('pageerror', (err) => errors.push(`pageerror: ${err.message.slice(0, 400)}`));
      page.on('requestfailed', (req) => errors.push(`recurso: ${req.url().slice(0, 160)}`));
      const started = Date.now();
      const resp = await page.goto(`${server.url}/${s.id}/index.html`, { waitUntil: 'load', timeout: 30_000 });
      if (resp && resp.status() >= 400) errors.push(`HTTP ${resp.status()}`);
      await page.waitForFunction(() => (window as any).__veReady === true, undefined, { timeout: 5000 }).catch(() => undefined);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(500);
      const loadMs = Date.now() - started;
      const perf = await page.evaluate(async () => {
        const start = performance.now();
        let frames = 0;
        await new Promise<void>((resolve) => {
          const tick = () => { frames++; if (performance.now() - start < 700) requestAnimationFrame(tick); else resolve(); };
          requestAnimationFrame(tick);
        });
        const elapsed = performance.now() - start;
        return {
          frames, fps: Math.round((frames / elapsed) * 1000),
          heapMB: (performance as any).memory ? Math.round((performance as any).memory.usedJSHeapSize / 1048576 * 10) / 10 : null,
          overflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
          fontReady: document.fonts.status === 'loaded',
          tabs: document.querySelectorAll('[data-tab]').length,
          showcase: (window as any).__veShowcase,
        };
      });
      let tabWorks = true;
      if (perf.tabs > 0) {
        const tab = page.locator('[data-tab]').nth(1);
        await tab.click().catch(() => { tabWorks = false; });
        tabWorks = tabWorks && (await tab.getAttribute('aria-selected')) === 'true';
      }
      const a11y = await auditPage(page).catch(() => ({ violations: -1, checked: 0, worst: 0, samples: [] }));
      const screenshot = path.join(outDir, s.id, 'preview.png');
      await page.screenshot({ path: screenshot, fullPage: false });
      const failed = perf.showcase?.failed ?? [];
      if (failed.length) errors.push(...failed);
      const styleId = buildArtDirection({ brief: s.brief, style: s.style }).style.id;
      const m: ShowcaseMeasurement = {
        id: s.id, title: s.title, style: styleId, archetype: s.archetype,
        ok: errors.length === 0 && perf.overflowX === 0 && a11y.violations === 0,
        loadMs, fps: perf.fps, frames: perf.frames, heapMB: perf.heapMB, overflowX: perf.overflowX,
        contrastViolations: a11y.violations, contrastChecked: a11y.checked, worstContrast: a11y.worst,
        contrastSamples: a11y.samples,
        fontReady: perf.fontReady, tabWorks, errors, screenshot: path.relative(outDir, screenshot).split(path.sep).join('/'),
        measuredAt: new Date().toISOString(),
      };
      fs.writeFileSync(path.join(outDir, s.id, 'measurement.json'), JSON.stringify(m, null, 2) + '\n', 'utf8');
      const ad = buildArtDirection({ brief: s.brief, style: s.style, projectType: s.projectType, preferences: { effects: s.effects } });
      fs.writeFileSync(path.join(outDir, s.id, 'README.md'), readme(ad, s, m), 'utf8');
      results.push(m);
      await context.close();
    }
    // Prueba dedicada de movimiento reducido sobre una composición representativa.
    const rctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
    const rpage = await rctx.newPage();
    await rpage.goto(`${server.url}/lumen/index.html`, { waitUntil: 'load' });
    await rpage.waitForTimeout(250);
    reducedWorks = await rpage.evaluate(() => {
      const el = document.querySelector('[data-reveal]');
      return !!el && getComputedStyle(el).animationName === 'none';
    });
    await rctx.close();
  } finally {
    await browser.close();
    await server.close();
  }
  const summary = {
    version: '0.4', generatedAt: new Date().toISOString(),
    compositions: results.length, ok: results.filter((r) => r.ok).length,
    reducedMotionRespected: reducedWorks,
    medianFps: median(results.map((r) => r.fps)), minFps: Math.min(...results.map((r) => r.fps)),
    totalContrastViolations: results.reduce((n, r) => n + Math.max(0, r.contrastViolations), 0),
    errors: results.flatMap((r) => r.errors.map((e) => `${r.id}: ${e}`)),
    results,
  };
  fs.writeFileSync(path.join(outDir, 'measurements.json'), JSON.stringify(summary, null, 2) + '\n', 'utf8');
  return results;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}
