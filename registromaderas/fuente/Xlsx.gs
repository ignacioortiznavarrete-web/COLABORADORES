/**
 * Genera un .xlsx sin depender de nada externo.
 *
 * Un xlsx es un zip con unos pocos XML dentro, y Apps Script sabe comprimir
 * (Utilities.zip), así que se arma a mano. Se usa `inlineStr` para el texto:
 * evita la tabla de cadenas compartidas y deja el archivo legible.
 */

function escaparXml_(texto) {
  return String(texto == null ? '' : texto)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;')
    // El XML de un xlsx no admite caracteres de control.
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
}

/** 1 -> A, 27 -> AA. */
function columnaXlsx_(numero) {
  var nombre = '';
  while (numero > 0) {
    var resto = (numero - 1) % 26;
    nombre = String.fromCharCode(65 + resto) + nombre;
    numero = Math.floor((numero - resto) / 26);
  }
  return nombre;
}

function celdaXlsx_(fila, columna, valor) {
  if (valor === '' || valor === null || valor === undefined) return '';
  var ref = columnaXlsx_(columna) + fila;
  if (typeof valor === 'number' && isFinite(valor)) {
    return '<c r="' + ref + '"><v>' + valor + '</v></c>';
  }
  return '<c r="' + ref + '" t="inlineStr"><is><t xml:space="preserve">' +
    escaparXml_(valor) + '</t></is></c>';
}

/**
 * Arma el xlsx.
 *
 * @param {string} nombreHoja   Nombre de la pestaña.
 * @param {Array<Array>} filas  Los datos.
 * @param {number} primeraFila  Fila donde empiezan los datos; las de arriba
 *                              quedan en blanco.
 * @return {Blob} el archivo, listo para descargar.
 */
function armarXlsx_(nombreHoja, filas, primeraFila) {
  primeraFila = primeraFila || 1;

  var xmlFilas = filas.map(function (fila, i) {
    var numero = primeraFila + i;
    var celdas = fila.map(function (valor, j) {
      return celdaXlsx_(numero, j + 1, valor);
    }).join('');
    return '<row r="' + numero + '">' + celdas + '</row>';
  }).join('');

  var hoja = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<sheetData>' + xmlFilas + '</sheetData></worksheet>';

  var libro = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<sheets><sheet name="' + escaparXml_(nombreHoja) + '" sheetId="1" r:id="rId1"/></sheets>' +
    '</workbook>';

  var relLibro = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" ' +
    'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" ' +
    'Target="worksheets/sheet1.xml"/></Relationships>';

  var relRaiz = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" ' +
    'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" ' +
    'Target="xl/workbook.xml"/></Relationships>';

  var tipos = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ' +
    'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/worksheets/sheet1.xml" ' +
    'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
    '</Types>';

  var partes = [
    Utilities.newBlob(tipos, 'application/xml', '[Content_Types].xml'),
    Utilities.newBlob(relRaiz, 'application/xml', '_rels/.rels'),
    Utilities.newBlob(libro, 'application/xml', 'xl/workbook.xml'),
    Utilities.newBlob(relLibro, 'application/xml', 'xl/_rels/workbook.xml.rels'),
    Utilities.newBlob(hoja, 'application/xml', 'xl/worksheets/sheet1.xml')
  ];

  return Utilities.zip(partes);
}
