/**
 * Arnés de previsualización local.
 *
 * Index.html carga Tailwind, Alpine, Motion y Google Charts desde CDN, que es
 * lo correcto dentro de Apps Script pero imposible de abrir sin red. Este
 * script produce preview/index.html apuntando a copias locales (npm) y a un
 * doble de Google Charts, para poder revisar el diseño en un navegador.
 *
 *   npm run preview   →  preview/index.html
 *
 * El doble de Google Charts registra cada draw() en window.__CHARTS__, de modo
 * que la previsualización también sirve como prueba de humo del armado de
 * series.
 */

import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, 'preview');
const vendor = resolve(out, 'vendor');

mkdirSync(vendor, { recursive: true });

// 1 · Tailwind: el CDN genera utilidades en caliente; aquí se compilan a fichero.
writeFileSync(
  resolve(out, 'tailwind.config.cjs'),
  `module.exports = {
  content: ['${resolve(here, 'Index.html')}'],
  darkMode: ['class', '.theme-dark'],
  corePlugins: { preflight: false },
  theme: { extend: {
    fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
    maxWidth: { dash: '1760px' }
  } }
};\n`
);

writeFileSync(resolve(out, 'input.css'), '@tailwind utilities;\n');

execFileSync(
  process.execPath,
  [
    resolve(here, 'node_modules/tailwindcss/lib/cli.js'),
    '-c', resolve(out, 'tailwind.config.cjs'),
    '-i', resolve(out, 'input.css'),
    '-o', resolve(vendor, 'tailwind.css'),
    '--minify'
  ],
  { stdio: 'inherit' }
);

// 2 · Alpine y Motion salen del árbol de npm tal cual.
copyFileSync(resolve(here, 'node_modules/alpinejs/dist/cdn.min.js'), resolve(vendor, 'alpine.js'));
copyFileSync(resolve(here, 'node_modules/motion/dist/motion.min.js'), resolve(vendor, 'motion.js'));

// 3 · Doble de Google Charts: dibuja un marcador y guarda lo que se le pidió.
writeFileSync(resolve(vendor, 'charts-stub.js'), `
window.__CHARTS__ = {};

function StubTable() { this.cols = []; this.rows = []; }
StubTable.prototype.addColumn = function (type, label) { this.cols.push(label || type); };
StubTable.prototype.addRow = function (row) { this.rows.push(row); };
StubTable.prototype.addRows = function (rows) { rows.forEach(r => this.rows.push(r)); };

function makeChart(kind) {
  return function (element) {
    this.draw = function (table, options) {
      window.__CHARTS__[element.id] = {
        kind: kind,
        series: table.cols,
        rows: table.rows.length,
        colors: options.colors,
        stacked: !!options.isStacked
      };
      element.textContent = '';
      const box = document.createElement('div');
      box.style.cssText =
        'height:100%;display:flex;flex-direction:column;gap:8px;justify-content:center;' +
        'align-items:center;border:1px dashed var(--line-strong);border-radius:12px;' +
        'font:600 12px Inter,sans-serif;color:var(--text-muted);text-align:center;padding:12px';
      const title = document.createElement('div');
      title.textContent = kind + ' · ' + table.rows.length + ' puntos';
      const keys = document.createElement('div');
      keys.style.cssText = 'display:flex;gap:14px;flex-wrap:wrap;justify-content:center';
      table.cols.slice(1).forEach((name, i) => {
        const item = document.createElement('span');
        item.style.cssText = 'display:inline-flex;align-items:center;gap:6px';
        const swatch = document.createElement('i');
        swatch.style.cssText =
          'width:16px;height:4px;border-radius:2px;display:inline-block;background:' +
          ((options.colors || [])[i] || 'currentColor');
        item.append(swatch, document.createTextNode(name));
        keys.append(item);
      });
      box.append(title, keys);
      element.append(box);
    };
  };
}

window.google = {
  charts: {
    load: function () {},
    setOnLoadCallback: function (callback) { setTimeout(callback, 0); }
  },
  visualization: {
    DataTable: StubTable,
    LineChart: makeChart('LineChart'),
    ComboChart: makeChart('ComboChart'),
    ColumnChart: makeChart('ColumnChart')
  }
};
`);

// 4 · Reescribe las etiquetas <script> del CDN hacia las copias locales.
const html = readFileSync(resolve(here, 'Index.html'), 'utf8')
  .replace(
    /<script src="https:\/\/cdn\.tailwindcss\.com"><\/script>/,
    '<link rel="stylesheet" href="vendor/tailwind.css">'
  )
  // La configuración de Tailwind ya está horneada en el CSS compilado.
  .replace(/<script>\s*tailwind\.config[\s\S]*?<\/script>/, '')
  .replace(
    /<script src="https:\/\/www\.gstatic\.com\/charts\/loader\.js"><\/script>/,
    '<script src="vendor/charts-stub.js"></script>'
  )
  .replace(/<script defer src="https:\/\/cdn\.jsdelivr\.net\/npm\/motion[^"]*"><\/script>/,
    '<script defer src="vendor/motion.js"></script>')
  .replace(/<script defer src="https:\/\/cdn\.jsdelivr\.net\/npm\/alpinejs[^"]*"><\/script>/,
    '<script defer src="vendor/alpine.js"></script>')
  // El tipo Inter viene de Google Fonts: sin red se cae al sans del sistema.
  .replace(/<link rel="preconnect"[^>]*>|<link href="https:\/\/fonts\.googleapis[^>]*>/g, '');

writeFileSync(resolve(out, 'index.html'), html, 'utf8');
console.log('✓ preview/index.html listo');
