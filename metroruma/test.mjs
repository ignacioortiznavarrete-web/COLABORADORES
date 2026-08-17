/**
 * Prueba de humo del tablero sobre preview/index.html.
 *
 *   npm test
 *
 * Levanta un servidor estático, abre la página con Chromium y ejercita el
 * camino real de uso: buscar, filtrar, ordenar y cambiar de tema. No sustituye
 * a probarlo dentro de Apps Script, pero sí atrapa las regresiones del frontend
 * sin depender de la red ni de la hoja de cálculo.
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

const server = createServer(async (request, response) => {
  const path = normalize(decodeURI(request.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
  try {
    const body = await readFile(join(here, path));
    response.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream' });
    response.end(body);
  } catch {
    response.writeHead(404).end('not found');
  }
});

await new Promise((done) => server.listen(0, '127.0.0.1', done));
const origin = `http://127.0.0.1:${server.address().port}`;


const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
});
const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } });

const problems = [];
page.on('console', m => { if (m.type() === 'error') problems.push('console: ' + m.text()); });
page.on('pageerror', e => problems.push('pageerror: ' + e.message));

await page.goto(`${origin}/preview/index.html`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

const state = () => page.evaluate(() => {
  const root = Alpine.$data(document.body);
  return {
    rows: root.view.rows.length,
    providers: root.view.summary.length,
    total: root.view.kpis.combinedLabel,
    detail: document.querySelectorAll('#detailBody tr').length,
    firstProvider: document.querySelector('#providerBody tr td strong')?.textContent,
    chips: root.activeChips().length,
    charts: Object.fromEntries(
      Object.entries(window.__CHARTS__).map(([k, v]) => [k, v.rows])
    )
  };
});

const results = [];
const check = (name, ok, detail) => {
  const line = `${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`;
  results.push(line);
  console.log(line);
  if (!ok) process.exitCode = 1;
};

const base = await state();
check('carga inicial', base.rows > 100 && base.providers === 15, `${base.rows} filas / ${base.providers} proveedores`);
check('gráficos dibujados', Object.keys(base.charts).length === 3, JSON.stringify(base.charts));

// --- búsqueda: término simple
await page.fill('#searchFilter', 'savi');
await page.waitForTimeout(400);
let s = await state();
check('búsqueda simple "savi"', s.rows > 0 && s.rows < base.rows, `${s.rows} filas`);
check('resaltado de coincidencia', await page.locator('#detailBody mark').count() > 0);

// --- exclusión
await page.fill('#searchFilter', '-savi');
await page.waitForTimeout(400);
const excl = await state();
check('exclusión "-savi"', excl.rows === base.rows - s.rows, `${excl.rows} = ${base.rows} - ${s.rows}`);

// --- filtro por campo con frase
await page.fill('#searchFilter', 'predio:"PREDIO SAN"');
await page.waitForTimeout(400);
s = await state();
check('campo + frase predio:"PREDIO SAN"', s.rows > 0 && s.rows < base.rows, `${s.rows} filas`);

// --- comparación numérica
await page.fill('#searchFilter', 'cantidad:>150');
await page.waitForTimeout(400);
s = await state();
const allOver = await page.evaluate(() =>
  Alpine.$data(document.body).view.rows.every(r => r.cantidad > 150));
check('numérico cantidad:>150', s.rows > 0 && allOver, `${s.rows} filas, todas > 150`);

// --- dos términos = Y lógico
await page.fill('#searchFilter', 'digua gmail');
await page.waitForTimeout(400);
s = await state();
check('dos términos (Y lógico)', s.rows > 0 && s.rows < base.rows, `${s.rows} filas`);

// --- sugerencias
await page.fill('#searchFilter', 'nahuel');
await page.waitForTimeout(400);
const suggestionCount = await page.locator('.popover .option-row').count();
check('sugerencias de autocompletado', suggestionCount > 0, `${suggestionCount} sugerencias`);

await page.fill('#searchFilter', '');
await page.waitForTimeout(400);

// --- selección múltiple de proveedores
await page.getByRole('button', { name: /Todos los proveedores/ }).click();
await page.waitForTimeout(250);
await page.locator('.option-row', { hasText: 'DIGUA' }).first().click();
await page.locator('.option-row', { hasText: 'SAVI' }).first().click();
await page.waitForTimeout(400);
s = await state();
check('multi-selección de proveedores', s.providers === 2, `${s.providers} proveedores`);
check('chips activos', s.chips === 2, `${s.chips} chips`);
await page.keyboard.press('Escape');

// --- segmentado de fuente
await page.getByRole('button', { name: 'Gmail', exact: true }).click();
await page.waitForTimeout(400);
const onlyGmail = await page.evaluate(() =>
  Alpine.$data(document.body).view.rows.every(r => r.source === 'GMAIL'));
check('segmentado fuente = Gmail', onlyGmail);

// --- limpiar
await page.getByRole('button', { name: /Limpiar/ }).click();
await page.waitForTimeout(400);
s = await state();
check('limpiar filtros restaura todo', s.rows === base.rows && s.chips === 0, `${s.rows} filas`);

// --- preset de fechas
await page.locator('label:has-text("Rango de fechas") + button').click();
await page.waitForTimeout(200);
await page.locator('.preset-row', { hasText: 'Últimos 7 días' }).click();
await page.waitForTimeout(400);
s = await state();
check('preset "Últimos 7 días"', s.rows > 0 && s.rows < base.rows, `${s.rows} filas`);
await page.getByRole('button', { name: /Limpiar/ }).click();
await page.waitForTimeout(400);

// --- ordenamiento
await page.locator('th', { hasText: 'Plan mes' }).click();
await page.waitForTimeout(300);
const sortedDesc = await page.evaluate(() =>
  [...document.querySelectorAll('#providerBody tr')]
    .map(tr => Number(tr.children[1].textContent.replace(/\./g, '').replace(',', '.'))));
check('orden por Plan mes descendente',
  sortedDesc.every((v, i) => i === 0 || v <= sortedDesc[i - 1]), sortedDesc.slice(0, 3).join(' ≥ '));

await page.locator('th', { hasText: 'Plan mes' }).click();
await page.waitForTimeout(300);
const sortedAsc = await page.evaluate(() =>
  [...document.querySelectorAll('#providerBody tr')]
    .map(tr => Number(tr.children[1].textContent.replace(/\./g, '').replace(',', '.'))));
check('segundo clic invierte el orden',
  sortedAsc.every((v, i) => i === 0 || v >= sortedAsc[i - 1]), sortedAsc.slice(0, 3).join(' ≤ '));

// --- tema
await page.locator('button[aria-label*="tema"]').click();
await page.waitForTimeout(500);
const dark = await page.evaluate(() => ({
  cls: document.documentElement.className,
  chartColor: window.__CHARTS__.chartDaily.colors[0]
}));
check('tema oscuro aplicado', dark.cls.includes('theme-dark'), dark.cls);
check('gráficos re-teñidos en oscuro', dark.chartColor === '#2c9463', dark.chartColor);

// --- atajo de teclado
await page.locator('body').click({ position: { x: 5, y: 400 } });
await page.keyboard.press('/');
await page.waitForTimeout(200);
const focused = await page.evaluate(() => document.activeElement.id);
check('atajo "/" enfoca la búsqueda', focused === 'searchFilter', focused);

if (problems.length) console.log('\nERRORES DE CONSOLA:\n' + problems.join('\n'));
else console.log('\nsin errores de consola');

await browser.close();
server.close();
