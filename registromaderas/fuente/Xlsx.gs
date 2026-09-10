/**
 * Genera un .xlsx sin depender de nada externo.
 *
 * Un xlsx es un zip con unos pocos XML dentro, y Apps Script sabe comprimir
 * (Utilities.zip), así que se arma a mano. Se usa `inlineStr` para el texto:
 * evita la tabla de cadenas compartidas y deja el archivo legible.
 */

// Los mismos textos largos repetidos en cada pieza del paquete.
var XML_ = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
var NS_HOJA_ = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
var NS_REL_ = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
var NS_PAQ_ = 'http://schemas.openxmlformats.org/package/2006/relationships';
var TIPO_ = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/';
var DOC_ = 'application/vnd.openxmlformats-officedocument.';

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
 * Lleva mas piezas de las estrictamente necesarias —estilos, propiedades,
 * dimension, vista— porque Excel es bastante mas estricto que los lectores
 * de scripting: un paquete pelado lo abre openpyxl sin chistar y Excel lo
 * rechaza con "el formato o la extension no son validos".
 *
 * @param {string} nombreHoja   Nombre de la pestaña.
 * @param {Array<Array>} filas  Los datos.
 * @param {number} primeraFila  Fila donde empiezan los datos; las de arriba
 *                              quedan en blanco.
 * @return {Blob} el archivo, listo para descargar.
 */
function armarXlsx_(nombreHoja, filas, primeraFila) {
  primeraFila = primeraFila || 1;

  var anchoMax = 1;
  filas.forEach(function (fila) { anchoMax = Math.max(anchoMax, fila.length); });
  var ultimaFila = Math.max(primeraFila + filas.length - 1, primeraFila);

  var xmlFilas = filas.map(function (fila, i) {
    var numero = primeraFila + i;
    var celdas = fila.map(function (valor, j) {
      return celdaXlsx_(numero, j + 1, valor);
    }).join('');
    return '<row r="' + numero + '">' + celdas + '</row>';
  }).join('');

  // El orden de los elementos no es decorativo: el esquema lo exige asi
  // (dimension, sheetViews, sheetFormatPr, sheetData) y Excel lo valida.
  var hoja = XML_ + '<worksheet xmlns="' + NS_HOJA_ + '" xmlns:r="' + NS_REL_ + '">' +
    '<dimension ref="A' + primeraFila + ':' + columnaXlsx_(anchoMax) + ultimaFila + '"/>' +
    '<sheetViews><sheetView tabSelected="1" workbookViewId="0"/></sheetViews>' +
    '<sheetFormatPr defaultRowHeight="15"/>' +
    '<sheetData>' + xmlFilas + '</sheetData></worksheet>';

  var libro = XML_ + '<workbook xmlns="' + NS_HOJA_ + '" xmlns:r="' + NS_REL_ + '">' +
    '<bookViews><workbookView xWindow="0" yWindow="0" ' +
    'windowWidth="20000" windowHeight="12000"/></bookViews>' +
    '<sheets><sheet name="' + escaparXml_(nombreHoja) + '" sheetId="1" ' +
    'state="visible" r:id="rId1"/></sheets></workbook>';

  var relLibro = XML_ + '<Relationships xmlns="' + NS_PAQ_ + '">' +
    '<Relationship Id="rId1" Type="' + TIPO_ + 'worksheet" Target="worksheets/sheet1.xml"/>' +
    '<Relationship Id="rId2" Type="' + TIPO_ + 'styles" Target="styles.xml"/>' +
    '</Relationships>';

  var relRaiz = XML_ + '<Relationships xmlns="' + NS_PAQ_ + '">' +
    '<Relationship Id="rId1" Type="' + TIPO_ + 'officeDocument" Target="xl/workbook.xml"/>' +
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/' +
    'relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
    '<Relationship Id="rId3" Type="' + TIPO_ + 'extended-properties" Target="docProps/app.xml"/>' +
    '</Relationships>';

  // Excel espera exactamente estos dos rellenos, en este orden, aunque no se
  // usen: el "none" y el "gray125". Sin ellos se queja del libro.
  var estilos = XML_ + '<styleSheet xmlns="' + NS_HOJA_ + '">' +
    '<fonts count="1"><font><sz val="11"/><color rgb="FF000000"/>' +
    '<name val="Calibri"/><family val="2"/></font></fonts>' +
    '<fills count="2"><fill><patternFill patternType="none"/></fill>' +
    '<fill><patternFill patternType="gray125"/></fill></fills>' +
    '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>' +
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
    '</styleSheet>';

  var cuando = fechaIso_();
  var propiedades = XML_ + '<cp:coreProperties ' +
    'xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" ' +
    'xmlns:dc="http://purl.org/dc/elements/1.1/" ' +
    'xmlns:dcterms="http://purl.org/dc/terms/" ' +
    'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
    '<dc:title>' + escaparXml_(nombreHoja) + '</dc:title>' +
    '<dcterms:created xsi:type="dcterms:W3CDTF">' + cuando + '</dcterms:created>' +
    '<dcterms:modified xsi:type="dcterms:W3CDTF">' + cuando + '</dcterms:modified>' +
    '</cp:coreProperties>';

  var aplicacion = XML_ + '<Properties xmlns="http://schemas.openxmlformats.org/' +
    'officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/' +
    'officeDocument/2006/docPropsVTypes"><Application>Registro Maderas</Application>' +
    '</Properties>';

  var tipos = XML_ + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="' + DOC_ + 'spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="' + DOC_ + 'spreadsheetml.worksheet+xml"/>' +
    '<Override PartName="/xl/styles.xml" ContentType="' + DOC_ + 'spreadsheetml.styles+xml"/>' +
    '<Override PartName="/docProps/core.xml" ' +
    'ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
    '<Override PartName="/docProps/app.xml" ContentType="' + DOC_ + 'extended-properties+xml"/>' +
    '</Types>';

  // [Content_Types].xml va primero: el paquete OPC se lee en orden.
  var partes = [
    Utilities.newBlob(tipos, 'application/xml', '[Content_Types].xml'),
    Utilities.newBlob(relRaiz, 'application/xml', '_rels/.rels'),
    Utilities.newBlob(propiedades, 'application/xml', 'docProps/core.xml'),
    Utilities.newBlob(aplicacion, 'application/xml', 'docProps/app.xml'),
    Utilities.newBlob(libro, 'application/xml', 'xl/workbook.xml'),
    Utilities.newBlob(relLibro, 'application/xml', 'xl/_rels/workbook.xml.rels'),
    Utilities.newBlob(estilos, 'application/xml', 'xl/styles.xml'),
    Utilities.newBlob(hoja, 'application/xml', 'xl/worksheets/sheet1.xml')
  ];

  return Utilities.zip(partes);
}

/** Fecha en el formato que piden las propiedades del paquete. */
function fechaIso_() {
  return Utilities.formatDate(new Date(), 'UTC', "yyyy-MM-dd'T'HH:mm:ss'Z'");
}
