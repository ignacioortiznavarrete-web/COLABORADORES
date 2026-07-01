/**
 * Buscador de Proveedores Extranjeros + Modificación/Creación de Cuenta Bancaria
 *
 * Base de datos: hoja de cálculo de Drive (ProveedorExtranjero).
 * Documentos bancarios: se guardan en Drive, dentro de una carpeta por proveedor
 * (nombrada con su Nº ident.fis.1), en la subcarpeta "Modificacion".
 */

var CONFIG = {
  SPREADSHEET_ID: '1SxEB6d7RZuNZF9QVAX5EXmzpUF4OW39k9PHUPfCoSj8',
  SHEET_PROVEEDORES: 'ProveedoresCreados',
  SHEET_PAIS: 'Pais',
  SHEET_MODIFICACIONES: 'ModificacionesBancarias',
  SHEET_MODIFICACIONES_ALIASES: ['ModificacionesBancarias', 'ModificacionBancaria'],
  DRIVE_ROOT_FOLDER_ID: '1QdIpNq-Vrb8wFHs_Bb7oYKCqmBCKENO5',
  MAX_RESULTADOS: 200,
  MAX_ARCHIVO_BYTES: 15 * 1024 * 1024, // 15 MB
  CTA_ASOC_EXTRANJERO: '2131002', // solo proveedores extranjeros
  ESTADOS_SOLICITUD: ['En analisis', 'Actualizando', 'Modificado'],
  ESTADO_INICIAL: 'En analisis'
};

var COL_PROVEEDORES = {
  ACREEDOR: 'Acreedor',
  RAZON_SOCIAL: 'Número de cuenta del proveedor',
  IDENT_FISCAL: 'Nº ident.fis.1',
  CTA_ASOC: 'Cta.asoc.'
};

var COL_PAIS = {
  CODIGO: 'Denominación',
  NOMBRE: 'Pais'
};

var COL_MODIFICACIONES = [
  'Codigo Sap',
  'Razon social',
  'Codigo de Banco Nuevo',
  'Tipo de cuenta',
  'Nombre Banco',
  'pais banco',
  'clave de banco',
  'swift',
  'Iban',
  'Numero de cuenta',
  'Nº ident.fis.1',
  'Mantener cuenta actual',
  'Documento Bancario',
  'Tipo de solicitud',
  'Fecha solicitud',
  'Estado',
  'Observacion'
];

// ---------------------------------------------------------------------------
// Web app / menú
// ---------------------------------------------------------------------------

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Buscador de Proveedores Extranjeros')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Buscador de Proveedores Extranjeros')
    .addItem('Abrir buscador', 'abrirBuscador')
    .addToUi();
}

function abrirBuscador() {
  var html = HtmlService.createHtmlOutputFromFile('Index')
    .setWidth(1150)
    .setHeight(760);
  SpreadsheetApp.getUi().showModalDialog(html, 'Buscador de Proveedores Extranjeros');
}

// ---------------------------------------------------------------------------
// Búsqueda de proveedores
// ---------------------------------------------------------------------------

/**
 * Busca proveedores en ProveedoresCreados por Acreedor, Razón social
 * (columna "Número de cuenta del proveedor") o Nº ident.fis.1.
 * Solo se consideran proveedores extranjeros (Cta.asoc. = 2131002).
 * No expone la columna Cta.asoc. en el resultado.
 */
function buscarProveedores(termino) {
  termino = (termino || '').toString().trim().toLowerCase();
  if (!termino) return [];

  var sheet = getSheet_(CONFIG.SHEET_PROVEEDORES);
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  var headers = data[0];
  var idxAcreedor = requireHeaderIndex_(headers, COL_PROVEEDORES.ACREEDOR, CONFIG.SHEET_PROVEEDORES);
  var idxRazonSocial = requireHeaderIndex_(headers, COL_PROVEEDORES.RAZON_SOCIAL, CONFIG.SHEET_PROVEEDORES);
  var idxIdentFiscal = requireHeaderIndex_(headers, COL_PROVEEDORES.IDENT_FISCAL, CONFIG.SHEET_PROVEEDORES);
  var idxCtaAsoc = requireHeaderIndex_(headers, COL_PROVEEDORES.CTA_ASOC, CONFIG.SHEET_PROVEEDORES);

  var vistos = {};
  var resultados = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var acreedor = valueToString_(row[idxAcreedor]);
    var razonSocial = valueToString_(row[idxRazonSocial]);
    var identFiscal = valueToString_(row[idxIdentFiscal]);
    var ctaAsoc = valueToString_(row[idxCtaAsoc]);

    if (!acreedor && !razonSocial && !identFiscal) continue;
    if (ctaAsoc !== CONFIG.CTA_ASOC_EXTRANJERO) continue;

    var coincide =
      acreedor.toLowerCase().indexOf(termino) > -1 ||
      razonSocial.toLowerCase().indexOf(termino) > -1 ||
      identFiscal.toLowerCase().indexOf(termino) > -1;

    if (coincide) {
      var clave = acreedor + '|' + identFiscal;
      if (vistos[clave]) continue;
      vistos[clave] = true;

      resultados.push({
        acreedor: acreedor,
        razonSocial: razonSocial,
        identFiscal: identFiscal
      });
      if (resultados.length >= CONFIG.MAX_RESULTADOS) break;
    }
  }
  return resultados;
}

// ---------------------------------------------------------------------------
// Países (para el campo "País de banco")
// ---------------------------------------------------------------------------

function listarPaises() {
  var sheet = getSheet_(CONFIG.SHEET_PAIS);
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  var headers = data[0];
  var idxCodigo = requireHeaderIndex_(headers, COL_PAIS.CODIGO, CONFIG.SHEET_PAIS);
  var idxNombre = requireHeaderIndex_(headers, COL_PAIS.NOMBRE, CONFIG.SHEET_PAIS);

  var paises = [];
  for (var i = 1; i < data.length; i++) {
    var codigo = valueToString_(data[i][idxCodigo]);
    var nombre = valueToString_(data[i][idxNombre]);
    if (!codigo && !nombre) continue;
    paises.push({ codigo: codigo, nombre: nombre });
  }
  return paises;
}

// ---------------------------------------------------------------------------
// Registro de solicitud (modificar / agregar cuenta bancaria)
// ---------------------------------------------------------------------------

/**
 * payload esperado:
 * {
 *   acreedor, razonSocial, identFiscal,      // datos del proveedor elegido
 *   tipoSolicitud,                           // 'Modificar Cuenta Bancaria' | 'Agregar Cuenta Bancaria'
 *   nombreBanco, paisBanco, claveBanco,
 *   swift, iban,                             // opcionales
 *   tipoCuenta, numeroCuenta,
 *   mantenerCuentaActual,                    // boolean
 *   observacion,                             // opcional
 *   archivo: { nombre, tipoMime, base64 }
 * }
 */
function registrarSolicitudBancaria(payload) {
  payload = payload || {};
  validarPayload_(payload);

  var carpetaModificacion = obtenerCarpetaModificacion_(payload.identFiscal);
  var archivoGuardado = guardarDocumentoBancario_(carpetaModificacion, payload.archivo, payload.razonSocial);

  var hoja = getHojaModificaciones_();
  var fecha = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'America/Santiago', 'dd/MM/yyyy HH:mm');

  hoja.appendRow([
    payload.acreedor,
    payload.razonSocial,
    payload.claveBanco,
    payload.tipoCuenta,
    payload.nombreBanco,
    payload.paisBanco,
    payload.claveBanco,
    payload.swift || '',
    payload.iban || '',
    payload.numeroCuenta,
    payload.identFiscal,
    payload.mantenerCuentaActual ? 'Sí' : 'No',
    archivoGuardado.getUrl(),
    payload.tipoSolicitud,
    fecha,
    CONFIG.ESTADO_INICIAL,
    payload.observacion || ''
  ]);

  aplicarComboboxEstado_(hoja, hoja.getLastRow());

  return { ok: true, mensaje: 'Solicitud registrada correctamente.', archivoUrl: archivoGuardado.getUrl() };
}

/**
 * Deja la celda "Estado" de la fila recién insertada como combobox
 * (validación de datos) con las opciones: En analisis, Actualizando, Modificado.
 */
function aplicarComboboxEstado_(hoja, fila) {
  var headers = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0];
  var idxEstado = requireHeaderIndex_(headers, 'Estado', hoja.getName());
  var regla = SpreadsheetApp.newDataValidation()
    .requireValueInList(CONFIG.ESTADOS_SOLICITUD, true)
    .setAllowInvalid(false)
    .build();
  hoja.getRange(fila, idxEstado + 1).setDataValidation(regla);
}

function validarPayload_(payload) {
  var requeridos = ['acreedor', 'razonSocial', 'identFiscal', 'tipoSolicitud', 'nombreBanco', 'paisBanco', 'claveBanco', 'tipoCuenta', 'numeroCuenta'];
  for (var i = 0; i < requeridos.length; i++) {
    var campo = requeridos[i];
    if (!payload[campo] || payload[campo].toString().trim() === '') {
      throw new Error('Falta el campo obligatorio: ' + campo);
    }
  }
  if (typeof payload.mantenerCuentaActual !== 'boolean') {
    throw new Error('Debe indicar si desea mantener la cuenta actual o reemplazarla.');
  }
  if (!payload.archivo || !payload.archivo.base64 || !payload.archivo.nombre) {
    throw new Error('Debe adjuntar el documento bancario.');
  }
  var bytes = Math.floor(payload.archivo.base64.length * 0.75);
  if (bytes > CONFIG.MAX_ARCHIVO_BYTES) {
    throw new Error('El documento bancario supera el tamaño máximo permitido (15 MB).');
  }
}

// ---------------------------------------------------------------------------
// Drive: estructura de carpetas por proveedor
// ---------------------------------------------------------------------------

/**
 * Estructura esperada dentro de la carpeta raíz:
 *   <Nº ident.fis.1>/
 *     Creacion/
 *     Modificacion/   <- el documento bancario siempre se guarda aquí
 * Si la carpeta del proveedor no existe, se crea junto con ambas subcarpetas.
 */
function obtenerCarpetaModificacion_(identFiscal) {
  var nombreCarpeta = identFiscal.toString().trim();
  var raiz = DriveApp.getFolderById(CONFIG.DRIVE_ROOT_FOLDER_ID);
  var carpetaProveedor = obtenerOCrearSubcarpeta_(raiz, nombreCarpeta);
  obtenerOCrearSubcarpeta_(carpetaProveedor, 'Creacion');
  return obtenerOCrearSubcarpeta_(carpetaProveedor, 'Modificacion');
}

function obtenerOCrearSubcarpeta_(carpetaPadre, nombre) {
  var it = carpetaPadre.getFoldersByName(nombre);
  if (it.hasNext()) return it.next();
  return carpetaPadre.createFolder(nombre);
}

function guardarDocumentoBancario_(carpeta, archivo, razonSocial) {
  var bytes = Utilities.base64Decode(archivo.base64);
  var blob = Utilities.newBlob(bytes, archivo.tipoMime || 'application/octet-stream', archivo.nombre);
  var file = carpeta.createFile(blob);
  if (razonSocial) {
    file.setDescription('Documento bancario - ' + razonSocial);
  }
  return file;
}

// ---------------------------------------------------------------------------
// Helpers de hoja de cálculo
// ---------------------------------------------------------------------------

function getSheet_(nombre) {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(nombre);
  if (!sheet) throw new Error('No se encontró la hoja "' + nombre + '" en la planilla.');
  return sheet;
}

function getHojaModificaciones_() {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var alias = CONFIG.SHEET_MODIFICACIONES_ALIASES;
  for (var i = 0; i < alias.length; i++) {
    var sheet = ss.getSheetByName(alias[i]);
    if (sheet) return sheet;
  }
  var nueva = ss.insertSheet(CONFIG.SHEET_MODIFICACIONES);
  nueva.appendRow(COL_MODIFICACIONES);
  return nueva;
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
