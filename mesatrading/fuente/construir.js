/**
 * Genera `../Codigo.gs`: todo el proyecto en un solo archivo (los cinco .gs
 * más los .html incrustados como texto), listo para pegar en Apps Script.
 *
 *   node fuente/construir.js
 *
 * El archivo generado NO se edita a mano: se editan los fuentes de esta
 * carpeta y se vuelve a ejecutar este script.
 */
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const SALIDA = path.join(DIR, '..', 'Codigo.gs');

const GS = ['Config.gs', 'Esquema.gs', 'Datos.gs', 'Acciones.gs', 'WebApp.gs'];
const HTML = { Estilos: 'Estilos.html', Mesa: 'Mesa.html', Panel: 'Panel.html' };

/** Deja el HTML seguro dentro de un template literal de JavaScript. */
function comoTemplateLiteral(texto) {
  return '`' + texto.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${') + '`';
}

function encabezado(titulo) {
  const linea = '='.repeat(70);
  return '\n// ' + linea + '\n// ' + titulo + '\n// ' + linea + '\n\n';
}

const partes = [];

partes.push([
  '/**',
  ' * MESA TRADING · madera — ARCHIVO ÚNICO',
  ' *',
  ' * Generado por fuente/construir.js. No lo edites a mano: edita los archivos',
  ' * de mesatrading/fuente y vuelve a generarlo.',
  ' *',
  ' * Pega este archivo como único Código.gs del proyecto de Apps Script.',
  ' * No necesitas crear los .html: van incrustados más abajo.',
  ' *',
  ' * Después de pegarlo, ejecuta la función `instalarMesaTrading` una vez.',
  ' */',
  ''
].join('\n'));

// 1. Los HTML como constantes.
partes.push(encabezado('HTML incrustado (equivalen a los archivos .html)'));
Object.keys(HTML).forEach(nombre => {
  const contenido = fs.readFileSync(path.join(DIR, HTML[nombre]), 'utf8');
  partes.push('const HTML_' + nombre.toUpperCase() + ' = ' + comoTemplateLiteral(contenido) + ';\n\n');
});
partes.push(
  'const HTML_PARCIALES = {\n' +
  Object.keys(HTML).map(n => '  ' + n + ': HTML_' + n.toUpperCase()).join(',\n') +
  '\n};\n'
);

// 2. El código, con las lecturas de archivo reemplazadas por las constantes.
GS.forEach(archivo => {
  let src = fs.readFileSync(path.join(DIR, archivo), 'utf8');

  if (archivo === 'WebApp.gs') {
    const antes = src;
    Object.keys(HTML).forEach(nombre => {
      src = src.split("HtmlService.createTemplateFromFile('" + nombre + "')")
        .join('HtmlService.createTemplate(HTML_' + nombre.toUpperCase() + ')');
    });
    src = src.replace(
      'return HtmlService.createHtmlOutputFromFile(nombre).getContent();',
      "return HTML_PARCIALES[nombre] || '';"
    );

    ['HtmlService.createTemplate(HTML_MESA)',
     'HtmlService.createTemplate(HTML_PANEL)',
     "return HTML_PARCIALES[nombre] || '';"].forEach(esperado => {
      if (src.indexOf(esperado) === -1) {
        throw new Error('No se pudo adaptar WebApp.gs: falta "' + esperado + '". ' +
          '¿Cambió el código fuente?');
      }
    });
    if (src === antes) throw new Error('WebApp.gs no sufrió ningún reemplazo.');
  }

  partes.push(encabezado(archivo));
  partes.push(src.trimEnd() + '\n');
});

fs.mkdirSync(path.dirname(SALIDA), { recursive: true });
fs.writeFileSync(SALIDA, partes.join(''), 'utf8');

const kb = (fs.statSync(SALIDA).size / 1024).toFixed(1);
console.log('Generado ' + path.relative(process.cwd(), SALIDA) + ' (' + kb + ' KB)');
