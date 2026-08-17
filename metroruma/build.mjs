/**
 * Compila src/styles.scss y lo inyecta dentro de src/index.template.html
 * para producir Index.html: un único archivo listo para pegar en el editor
 * de Google Apps Script (HtmlService sólo acepta .html y .gs, por eso el CSS
 * viaja embebido en lugar de como hoja externa).
 *
 *   npm run build          compila una vez
 *   npm run watch          recompila al guardar
 */

import { compile } from 'sass';
import { readFileSync, writeFileSync, watch } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const SCSS = resolve(here, 'src/styles.scss');
const TEMPLATE = resolve(here, 'src/index.template.html');
const OUTPUT = resolve(here, 'Index.html');
const MARKER = '<!-- @@STYLES@@ -->';

function build() {
  const { css } = compile(SCSS, {
    style: 'expanded',
    loadPaths: [resolve(here, 'src')]
  });

  const template = readFileSync(TEMPLATE, 'utf8');

  if (!template.includes(MARKER)) {
    throw new Error(`Falta el marcador ${MARKER} en index.template.html`);
  }

  const banner =
    '  <!-- Generado por build.mjs desde src/styles.scss · NO editar a mano -->\n' +
    '  <style>\n';

  const indented = css
    .trimEnd()
    .split('\n')
    .map((line) => (line ? '    ' + line : ''))
    .join('\n');

  const html = template.replace(
    MARKER,
    banner + indented + '\n  </style>'
  );

  writeFileSync(OUTPUT, html, 'utf8');

  const kb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(1);
  console.log(`✓ Index.html generado (${kb} KB) · CSS ${(css.length / 1024).toFixed(1)} KB`);
}

build();

if (process.argv.includes('--watch')) {
  console.log('… observando src/');
  let pending = null;

  for (const file of [SCSS, TEMPLATE]) {
    watch(file, () => {
      clearTimeout(pending);
      pending = setTimeout(() => {
        try {
          build();
        } catch (error) {
          console.error('✗', error.message);
        }
      }, 80);
    });
  }
}
