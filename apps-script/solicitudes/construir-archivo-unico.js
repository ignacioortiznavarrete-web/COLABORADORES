/**
 * Genera `todo-en-uno/Codigo.gs`: un solo archivo con todo el proyecto
 * (los cuatro .gs más los tres .html incrustados como texto), para pegar de
 * una sola vez en el editor de Apps Script.
 *
 *   node construir-archivo-unico.js
 *
 * El archivo generado NO se edita a mano: se edita el código fuente de esta
 * carpeta y se vuelve a ejecutar este script.
 */
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const SALIDA = path.join(DIR, 'todo-en-uno', 'Codigo.gs');

const GS = ['Config.gs', 'Setup.gs', 'Solicitudes.gs', 'WebApp.gs'];
const HTML = { Estilos: 'Estilos.html', Formulario: 'Formulario.html', Inicio: 'Inicio.html' };

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
  ' * SOLICITUDES · Costos → T&D → Producción — ARCHIVO ÚNICO',
  ' *',
  ' * Generado por construir-archivo-unico.js. No lo edites a mano: edita los',
  ' * archivos fuente de apps-script/solicitudes y vuelve a generarlo.',
  ' *',
  ' * Pega este archivo como único Código.gs del proyecto de Apps Script.',
  ' * No necesitas crear los .html: van incrustados más abajo.',
  ' *',
  ' * Después de pegarlo, ejecuta la función `instalarSolicitudes` una vez.',
  ' */',
  ''
].join('\n'));

// 1. Los HTML como constantes.
partes.push(encabezado('HTML incrustado (equivalen a los archivos .html)'));
Object.keys(HTML).forEach(nombre => {
  const contenido = fs.readFileSync(path.join(DIR, HTML[nombre]), 'utf8');
  partes.push('const HTML_' + nombre.toUpperCase() + ' = ' + comoTemplateLiteral(contenido) + ';\n\n');
});
partes.push([
  'const HTML_PARCIALES = {',
  "  Estilos: HTML_ESTILOS,",
  "  Formulario: HTML_FORMULARIO,",
  "  Inicio: HTML_INICIO",
  '};',
  ''
].join('\n'));

// 2. El código, con las lecturas de archivo reemplazadas por las constantes.
GS.forEach(archivo => {
  let src = fs.readFileSync(path.join(DIR, archivo), 'utf8');

  if (archivo === 'WebApp.gs') {
    const antes = src;
    src = src
      .replace("HtmlService.createTemplateFromFile('Inicio')", 'HtmlService.createTemplate(HTML_INICIO)')
      .replace("HtmlService.createTemplateFromFile('Formulario')", 'HtmlService.createTemplate(HTML_FORMULARIO)')
      .replace(
        'return HtmlService.createHtmlOutputFromFile(nombre).getContent();',
        'return HTML_PARCIALES[nombre] || \'\';'
      );
    ['HtmlService.createTemplate(HTML_INICIO)',
     'HtmlService.createTemplate(HTML_FORMULARIO)',
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
