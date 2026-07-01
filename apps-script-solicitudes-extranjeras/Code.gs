/**
 * Panel de solicitudes de modificación/creación de cuenta bancaria
 * (proveedores extranjeros).
 *
 * Lee la hoja ModificacionesBancarias de la planilla ProveedorExtranjero y
 * muestra: Solicitante, Razón social, Tipo de solicitud, Fecha y Estado.
 */

var CONFIG = {
  SPREADSHEET_ID: '1SxEB6d7RZuNZF9QVAX5EXmzpUF4OW39k9PHUPfCoSj8',
  SHEET_MODIFICACIONES_ALIASES: ['ModificacionesBancarias', 'ModificacionBancaria'],
  MAX_RESULTADOS: 500
};

// ---------------------------------------------------------------------------
// Web app / menú
// ---------------------------------------------------------------------------

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Solicitudes Bancarias - Extranjeros')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Solicitudes Bancarias')
    .addItem('Abrir panel', 'abrirPanel')
    .addToUi();
}

function abrirPanel() {
  var html = HtmlService.createHtmlOutputFromFile('Index')
    .setWidth(1100)
    .setHeight(760);
  SpreadsheetApp.getUi().showModalDialog(html, 'Solicitudes Bancarias - Extranjeros');
}

// ---------------------------------------------------------------------------
// Listado de solicitudes
// ---------------------------------------------------------------------------

/**
 * Devuelve las solicitudes registradas en ModificacionesBancarias, más
 * recientes primero: Solicitante, Razón social, Tipo de solicitud,
 * Fecha de solicitud y Estado.
 */
function listarSolicitudes() {
  var hoja = getHojaModificaciones_();
  var data = hoja.getDataRange().getValues();
  if (data.length < 2) return [];

  var headers = data[0];
  var idxSolicitante = requireHeaderIndex_(headers, 'Solicitante', hoja.getName());
  var idxRazonSocial = requireHeaderIndex_(headers, 'Razon social', hoja.getName());
  var idxTipoSolicitud = requireHeaderIndex_(headers, 'Tipo de solicitud', hoja.getName());
  var idxFecha = requireHeaderIndex_(headers, 'Fecha solicitud', hoja.getName());
  var idxEstado = requireHeaderIndex_(headers, 'Estado', hoja.getName());

  var solicitudes = [];
  for (var i = data.length - 1; i >= 1; i--) {
    var row = data[i];
    var solicitante = valueToString_(row[idxSolicitante]);
    var razonSocial = valueToString_(row[idxRazonSocial]);
    var tipoSolicitud = valueToString_(row[idxTipoSolicitud]);
    var fecha = formatearFecha_(row[idxFecha]);
    var estado = valueToString_(row[idxEstado]);

    if (!solicitante && !razonSocial) continue;

    solicitudes.push({
      solicitante: solicitante,
      razonSocial: razonSocial,
      tipoSolicitud: tipoSolicitud,
      fecha: fecha,
      estado: estado
    });
    if (solicitudes.length >= CONFIG.MAX_RESULTADOS) break;
  }
  return solicitudes;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getHojaModificaciones_() {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var alias = CONFIG.SHEET_MODIFICACIONES_ALIASES;
  for (var i = 0; i < alias.length; i++) {
    var sheet = ss.getSheetByName(alias[i]);
    if (sheet) return sheet;
  }
  throw new Error('No se encontró la hoja de modificaciones bancarias en la planilla.');
}

function requireHeaderIndex_(headers, nombreColumna, nombreHoja) {
  for (var i = 0; i < headers.length; i++) {
    if ((headers[i] || '').toString().trim() === nombreColumna) return i;
  }
  throw new Error('No se encontró la columna "' + nombreColumna + '" en la hoja "' + nombreHoja + '".');
}

function valueToString_(value) {
  if (value === null || value === undefined) return '';
  return value.toString().trim();
}

/**
 * Sheets suele convertir el texto "dd/MM/yyyy HH:mm" ingresado en la celda
 * en un valor de fecha real; al leerlo vuelve como objeto Date de JS, cuyo
 * toString() por defecto es ilegible. Aquí se formatea explícitamente.
 */
function formatearFecha_(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone() || 'America/Santiago', 'dd/MM/yyyy HH:mm');
  }
  return valueToString_(value);
}
