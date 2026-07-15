import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const dashboard = readFileSync(new URL('../src/components/Dashboard.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');

test('contrai os dias da semana de forma coordenada ao rolar a ficha', () => {
  assert.match(dashboard, /isHomeHeaderCondensed/);
  assert.match(dashboard, /window\.requestAnimationFrame\(updateCondensedState\)/);
  assert.match(dashboard, /window\.addEventListener\('scroll', handleScroll, \{ passive: true \}\)/);
  assert.match(dashboard, /scrollTop >= 76/);
  assert.match(dashboard, /scrollTop <= 4/);
  assert.match(dashboard, /ignoreScrollUntil = now \+ 360/);
  assert.match(dashboard, /data-scroll-condensed=/);
  assert.match(dashboard, /'--hc-day-index': dayIndex/);
  assert.match(css, /\.hc-topbar--scroll-condensed \.hc-week-day\s*\{[^}]*opacity: 0;[^}]*scale\(0\.88\)/s);
  assert.match(css, /transition-delay: calc\(\(6 - var\(--hc-day-index/);
});

test('preserva uma alternativa sem movimento para a contracao do cabecalho', () => {
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.hc-week-day,[\s\S]*transition-duration: 1ms !important/);
});

test('reabre os dias pela logo ou pelo gesto de puxar o cabecalho', () => {
  assert.match(dashboard, /const expandHomeHeader = useCallback/);
  assert.match(dashboard, /setActiveTab\(TABS\.HOME\)/);
  assert.match(dashboard, /window\.scrollTo\(\{ top: 0, behavior:/);
  assert.match(dashboard, /gesture\.deltaY >= 42/);
  assert.match(dashboard, /onPointerMove=\{handleHeaderPointerMove\}/);
  assert.match(dashboard, /Ir para o Início e expandir os dias da semana/);
  assert.match(dashboard, /isCompactTopbar \? 'hc-topbar--scroll-condensed'/);
  assert.match(css, /\.hc-topbar--pulling\s*\{[^}]*translateY\(var\(--hc-header-pull/s);
  assert.match(css, /\.hc-topbar-logo-button:focus-visible/);
});
