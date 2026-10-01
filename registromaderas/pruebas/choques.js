/**
 * Nombres declarados dos veces en el mismo proyecto de Apps Script.
 *
 * En Apps Script todos los archivos de un proyecto comparten UN solo espacio
 * de nombres: los `.gs` entre sí, y también el javascript que va dentro de los
 * `<script>` de los `.html`. Dos archivos que declaren lo mismo no dan un
 * aviso: el proyecto entero deja de cargar con
 *
 *     SyntaxError: Identifier 'X' has already been declared
 *
 * y no anda nada, ni el formulario ni el menú. Por eso se revisa acá: es la
 * clase de error que no aparece en ninguna prueba de comportamiento porque
 * ocurre antes de que exista comportamiento.
 */
const fs = require('fs');
const path = require('path');

/**
 * Los nombres de nivel superior de un archivo.
 *
 * "Nivel superior" se reconoce por la sangría, que es lo que hay: en un `.gs`
 * va pegado al margen, y dentro de un `<script>` va con dos espacios, que es
 * como está escrito todo el proyecto.
 */
function declaracionesDe(archivo, texto) {
  const esHtml = /\.html$/.test(archivo);
  const sangria = esHtml ? '  ' : '';
  const trozos = esHtml ? (texto.match(/<script>[\s\S]*?<\/script>/g) || []) : [texto];
  const re = new RegExp('^' + sangria +
    '(?:(?:const|var|let)\\s+([A-Za-z_$][\\w$]*)|function\\s+([A-Za-z_$][\\w$]*))');

  const nombres = [];
  trozos.forEach(trozo => trozo.split('\n').forEach(linea => {
    const m = re.exec(linea);
    if (m) nombres.push(m[1] || m[2]);
  }));
  return nombres;
}

/**
 * @param {string} carpeta  La que se pega entera en un proyecto de Apps Script.
 * @return {string[]} Los choques, como `CFG: Config.gs y Otro.gs`. Vacío si no hay.
 */
function nombresRepetidos(carpeta) {
  const visto = {};
  fs.readdirSync(carpeta)
    .filter(f => /\.(gs|html)$/.test(f))
    .forEach(f => {
      declaracionesDe(f, fs.readFileSync(path.join(carpeta, f), 'utf8'))
        .forEach(n => { (visto[n] = visto[n] || []).push(f); });
    });

  return Object.keys(visto)
    .filter(n => visto[n].length > 1)
    .map(n => n + ': ' + visto[n].join(' y '));
}

/** Cuántos nombres se revisaron, para que la prueba no pase por mirar nada. */
function cuantosNombres(carpeta) {
  const visto = {};
  fs.readdirSync(carpeta)
    .filter(f => /\.(gs|html)$/.test(f))
    .forEach(f => {
      declaracionesDe(f, fs.readFileSync(path.join(carpeta, f), 'utf8'))
        .forEach(n => { visto[n] = true; });
    });
  return Object.keys(visto).length;
}

module.exports = { nombresRepetidos, cuantosNombres };
