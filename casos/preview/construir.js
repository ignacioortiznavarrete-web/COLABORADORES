/**
 * Arma una copia del tablero con los datos incrustados, para verlo fuera de
 * Google (revisión de diseño, capturas, compartir un enlace estático).
 *
 *   node casos/preview/construir.js [datos.json] [salida.html]
 *
 * El servidor de Apps Script hace exactamente lo mismo: leer Dashboard.html y
 * reemplazar __DATOS__ por el JSON de la hoja. Un solo archivo fuente.
 */
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const PLANTILLA = path.join(DIR, '..', 'Dashboard.html');
const datosRuta = process.argv[2] || path.join(DIR, 'datos-ejemplo.json');
const salida = process.argv[3] || path.join(DIR, 'tablero-demo.html');

/** Igual que en Codigo.gs: nada puede cerrar el <script> que lleva el JSON. */
function jsonSeguro(obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c');
}

/** Versión sin <html>/<head>/<body> para publicarla como Artifact. */
function soloCuerpo(html) {
  return html
    .replace(/^<!DOCTYPE html>\s*/i, '')
    .replace(/<\/?(?:html|head|body)[^>]*>\s*/gi, '')
    .replace(/<meta[^>]*>\s*/gi, '')
    .trim();
}

const plantilla = fs.readFileSync(PLANTILLA, 'utf8');
const datos = JSON.parse(fs.readFileSync(datosRuta, 'utf8'));
const html = plantilla.replace('__DATOS__', () => jsonSeguro(datos));

fs.writeFileSync(salida, html);
const alterno = salida.replace(/\.html$/, '-artifact.html');
fs.writeFileSync(alterno, soloCuerpo(html));

console.log('casos: ' + datos.casos.length + ' · hoy: ' + datos.hoy);
console.log('escrito: ' + salida);
console.log('escrito: ' + alterno + ' (sin envoltura, para Artifact)');
