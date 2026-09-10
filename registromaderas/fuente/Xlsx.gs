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
  return armarZip_([
    { nombre: '[Content_Types].xml', texto: tipos },
    { nombre: '_rels/.rels', texto: relRaiz },
    { nombre: 'docProps/core.xml', texto: propiedades },
    { nombre: 'docProps/app.xml', texto: aplicacion },
    { nombre: 'xl/workbook.xml', texto: libro },
    { nombre: 'xl/_rels/workbook.xml.rels', texto: relLibro },
    { nombre: 'xl/styles.xml', texto: estilos },
    { nombre: 'xl/worksheets/sheet1.xml', texto: hoja }
  ]);
}

/* ------------------------------------------------------------------- el zip */

/*
  El zip se arma a mano en vez de con Utilities.zip.
  No es por gusto: es la unica pieza del archivo que no se puede revisar sin
  ejecutar Apps Script, y cuando Excel dice "el formato no es valido" no hay
  como saber si el problema es el XML o el empaquetado. Armandolo aca, los
  bytes que recibe Excel son exactamente los que revisan las pruebas.

  Va sin comprimir (metodo 0, "stored"): deflate no viene en el entorno y
  escribirlo a mano seria mucho codigo para ahorrar unos kilobytes. El
  archivo pesa mas, pero un batch input son unas pocas decenas de filas.
*/

var CRC_TABLA_ = null;

function crcTabla_() {
  if (CRC_TABLA_) return CRC_TABLA_;
  var t = [];
  for (var n = 0; n < 256; n++) {
    var c = n;
    for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  CRC_TABLA_ = t;
  return t;
}

function crc32_(bytes) {
  var t = crcTabla_();
  var c = 0xFFFFFFFF;
  for (var i = 0; i < bytes.length; i++) c = t[(c ^ (bytes[i] & 0xFF)) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

/** Apps Script maneja los bytes con signo: 200 se escribe como -56. */
function conSigno_(b) { return (b & 0xFF) > 127 ? (b & 0xFF) - 256 : (b & 0xFF); }

function u16_(salida, v) {
  salida.push(conSigno_(v), conSigno_(v >>> 8));
}

function u32_(salida, v) {
  salida.push(conSigno_(v), conSigno_(v >>> 8), conSigno_(v >>> 16), conSigno_(v >>> 24));
}

function bytesUtf8_(texto) {
  return Utilities.newBlob(texto, 'text/plain').getBytes();
}

/** Agrega una tira de bytes al final, sin depender de que sea un array. */
function pegar_(salida, bytes) {
  for (var i = 0; i < bytes.length; i++) salida.push(bytes[i]);
}

/**
 * @param {Array<{nombre: string, texto: string}>} partes
 * @return {Blob} el zip, en el orden en que vienen las partes.
 */
function armarZip_(partes) {
  var HORA = 0;        // 00:00
  var FECHA = 0x0021;  // 1980-01-01; la fecha 0 no es valida en DOS
  var salida = [];
  var directorio = [];
  var desplazamientos = [];

  partes.forEach(function (parte) {
    var nombre = bytesUtf8_(parte.nombre);
    var datos = bytesUtf8_(parte.texto);
    var crc = crc32_(datos);
    desplazamientos.push(salida.length);

    u32_(salida, 0x04034b50);   // firma de cabecera local
    u16_(salida, 20);           // version necesaria
    u16_(salida, 0);            // sin banderas
    u16_(salida, 0);            // metodo 0: sin comprimir
    u16_(salida, HORA);
    u16_(salida, FECHA);
    u32_(salida, crc);
    u32_(salida, datos.length);  // comprimido
    u32_(salida, datos.length);  // sin comprimir
    u16_(salida, nombre.length);
    u16_(salida, 0);             // sin campo extra
    pegar_(salida, nombre);
    pegar_(salida, datos);

    directorio.push({ nombre: nombre, crc: crc, largo: datos.length });
  });

  var inicioDirectorio = salida.length;
  directorio.forEach(function (e, i) {
    u32_(salida, 0x02014b50);   // firma de entrada del directorio central
    u16_(salida, 20);           // version con la que se creo
    u16_(salida, 20);           // version necesaria
    u16_(salida, 0);
    u16_(salida, 0);
    u16_(salida, HORA);
    u16_(salida, FECHA);
    u32_(salida, e.crc);
    u32_(salida, e.largo);
    u32_(salida, e.largo);
    u16_(salida, e.nombre.length);
    u16_(salida, 0);            // extra
    u16_(salida, 0);            // comentario
    u16_(salida, 0);            // disco
    u16_(salida, 0);            // atributos internos
    u32_(salida, 0);            // atributos externos
    u32_(salida, desplazamientos[i]);
    pegar_(salida, e.nombre);
  });

  var largoDirectorio = salida.length - inicioDirectorio;
  u32_(salida, 0x06054b50);     // fin del directorio central
  u16_(salida, 0);
  u16_(salida, 0);
  u16_(salida, directorio.length);
  u16_(salida, directorio.length);
  u32_(salida, largoDirectorio);
  u32_(salida, inicioDirectorio);
  u16_(salida, 0);              // sin comentario

  return Utilities.newBlob(salida,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'batch-input.xlsx');
}

/** Fecha en el formato que piden las propiedades del paquete. */
function fechaIso_() {
  return Utilities.formatDate(new Date(), 'UTC', "yyyy-MM-dd'T'HH:mm:ss'Z'");
}
