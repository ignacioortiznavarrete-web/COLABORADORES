/***********************
 * CONFIGURACIÓN
 ***********************/
const DEST_SS_ID = "1SxEB6d7RZuNZF9QVAX5EXmzpUF4OW39k9PHUPfCoSj8";
const SHEET_REG  = "Registro";
const SHEET_BI   = "Batch Input";
const SHEET_PAIS = "Pais";
const SHEET_PROV_CREADOS = "ProveedoresCreados";
const FOLDER_ID_DOCS = "1QdIpNq-Vrb8wFHs_Bb7oYKCqmBCKENO5";
const EMAIL_APROBACION = "Jose.ortiz@masisa.com";
const REDIRECT_URL = "https://script.google.com/a/macros/masisa.com/s/AKfycbwn01r_Jpk8LEpFtXKFlP8bTsgnQpmyV1RNoFIHS_sl_X46OtHGtlRsGl4u2zorULwroA/exec";

const ESTATICOS_SAP_EXT = {
  condicionPago: "CPP1",
  verifFactBasePedido: "X",
  pedidoAutomatico: "X",
  verifFactServ: "X",
  grupoLiberacion: "M271",
  grupoTesoreria: "PROVEXT",
  cuentaAsociada: "2131002",
  verificacionFraDob: "X",
  grupoCuentas: "PCOR",
  grupoEsquema: "02",
  ramo: "0999"
};

const ESTADOS_REGISTRO = [
  "En analisis",
  "SOLICITANDO V°B",
  "EN CREACION",
  "CREADO",
  "RECHAZADO"
];

const SOCIEDADES_PERMITIDAS = ["TERR", "PCL1"];
const ORGS_PERMITIDAS = ["TCSM", "TCSF", "TCSE", "TCMR", "TCMF", "TCMA", "TCIN", "TCCC", "PCL1"];
const TRATAMIENTOS_PERMITIDOS = ["SR(A).", "EMPRESA"];
const IDIOMAS_PERMITIDOS = ["ES", "EN", "PT"];
const MONEDAS_PERMITIDAS = ["USD", "EUR", "CLP", "BRL", "ARS", "PEN"];
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_FILE_MIMES = ["application/pdf", "image/jpeg", "image/png"];
const ALLOWED_FILE_EXTS = ["pdf", "jpg", "jpeg", "png"];

/***********************
 * WEBAPP
 ***********************/
function doGet() {
  return HtmlService
    .createHtmlOutputFromFile("formulario_extranjero")
    .setTitle("Solicitud de creacion proveedor extranjero")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/***********************
 * HELPERS
 ***********************/
function cleanText_(v) {
  return String(v || "").trim();
}

function normalizeTaxId_(v) {
  return String(v || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 25);
}

function normalizeCode2_(v) {
  return cleanText_(v).toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2);
}

function normalizeSwift_(v) {
  return String(v || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 11);
}

function normalizePhone_(v) {
  return String(v || "")
    .replace(/\D/g, "")
    .slice(0, 20);
}

function normalizeIban_(v) {
  return String(v || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 34);
}

function normalizeAccountNumber_(v) {
  return String(v || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 34);
}

function containsInvalidChars_(v) {
  return /[*<>|{}[\]^~`]/.test(String(v || ""));
}

function isValidPhone_(v) {
  const tel = normalizePhone_(v);
  return /^[0-9]{6,20}$/.test(tel);
}

function isValidSwift_(v) {
  const swift = normalizeSwift_(v);
  return /^[A-Z0-9]{8,11}$/.test(swift);
}

function isValidIban_(v) {
  const iban = normalizeIban_(v);
  if (!iban) return true;
  return /^[A-Z0-9]{10,34}$/.test(iban);
}

function isValidAccountNumber_(v) {
  const account = normalizeAccountNumber_(v);
  return /^[A-Z0-9]{4,34}$/.test(account);
}

function isValidTaxId_(v) {
  const taxId = normalizeTaxId_(v);
  return /^[A-Z0-9]{3,25}$/.test(taxId);
}

function isInList_(value, allowed) {
  const normalized = cleanText_(value).toUpperCase();
  return allowed.some(item => cleanText_(item).toUpperCase() === normalized);
}

function getPaisCodeSet_() {
  return new Set(getPaisesBanco().map(p => normalizeCode2_(p.codigo)));
}

function assertPaisCode_(value, fieldName, paisSet) {
  const code = normalizeCode2_(value);
  if (!code || code.length !== 2 || !paisSet.has(code)) {
    throw new Error(fieldName + " no existe en la hoja Pais.");
  }
}

function validarArchivoBancario_(fileObj, fieldName) {
  if (!fileObj || !fileObj.bytes || !fileObj.name) {
    throw new Error("Debe adjuntar " + fieldName + ".");
  }

  const fileName = String(fileObj.name || "");
  const ext = fileName.toLowerCase().split(".").pop();
  if (!ALLOWED_FILE_EXTS.includes(ext)) {
    throw new Error(fieldName + " debe ser PDF, JPG, JPEG o PNG.");
  }

  if (fileObj.mimeType && !ALLOWED_FILE_MIMES.includes(fileObj.mimeType)) {
    throw new Error(fieldName + " tiene un formato no permitido.");
  }

  const bytes = Utilities.base64Decode(fileObj.bytes);
  if (bytes.length > MAX_FILE_BYTES) {
    throw new Error(fieldName + " no puede superar 10 MB.");
  }

  return bytes;
}

function parseDateForSort_(value) {
  if (value instanceof Date && !isNaN(value)) return value.getTime();
  const text = String(value || "").trim();
  const m = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!m) return 0;
  return new Date(
    Number(m[3]),
    Number(m[2]) - 1,
    Number(m[1]),
    Number(m[4] || 0),
    Number(m[5] || 0),
    Number(m[6] || 0)
  ).getTime();
}

function validarTextoSinEspeciales_(valor, nombreCampo) {
  if (containsInvalidChars_(valor)) {
    throw new Error('El campo "' + nombreCampo + '" contiene caracteres no permitidos.');
  }
}

function upperIfString_(v) {
  return (typeof v === "string") ? v.toUpperCase() : v;
}

function upperRowExcept_(row, exceptIdxs) {
  const except = new Set(exceptIdxs || []);
  return row.map((v, i) => except.has(i) ? v : upperIfString_(v));
}

function getHeaderMap_(sheet) {
  const lastCol = sheet.getLastColumn();
  const headers = sheet
    .getRange(1, 1, 1, lastCol)
    .getValues()[0]
    .map(h => String(h || "").trim());

  const map = {};
  headers.forEach((h, i) => {
    if (h) {
      map[h] = i;
      map[normalizeHeaderBasic_(h)] = i;
    }
  });
  return map;
}

function normalizeHeaderBasic_(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[º°]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function escapeHtml_(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function setValueByHeader_(row, headerMap, headerName, value) {
  const idx = headerMap[headerName] !== undefined
    ? headerMap[headerName]
    : headerMap[normalizeHeaderBasic_(headerName)];
  if (idx !== undefined) {
    row[idx] = value;
  }
}

function getFechaSolicitudTexto_() {
  return Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone(),
    "dd/MM/yyyy HH:mm:ss"
  );
}

function getOrCreateFolder_(parentFolder, folderName) {
  const folders = parentFolder.getFoldersByName(folderName);
  if (folders.hasNext()) return folders.next();
  return parentFolder.createFolder(folderName);
}

/***********************
 * ESTRUCTURA HOJA REGISTRO
 ***********************/
function actualizarEstructuraRegistro() {
  const ss = SpreadsheetApp.openById(DEST_SS_ID);
  const sh = ss.getSheetByName(SHEET_REG);
  if (!sh) throw new Error('No existe la hoja "' + SHEET_REG + '".');

  const headersDeseados = [
    "Codigo SAP",
    "Fecha de Solicitud",
    "Estado",
    "Solicitante",
    "Sociedad",
    "Organización de Compras",
    "Tratamiento",
    "Nombre o Razon Social 1",
    "Nombre o Razon Social 2",
    "Region",
    "Distrito",
    "Poblacion",
    "Calle",
    "Numero de Casa",
    "Codigo Postal",
    "Telefono",
    "Correo",
    "N° Identificacion Fiscal",
    "Pais De Banco",
    "Nombre Banco",
    "Swift",
    "Numero de Cuenta",
    "Tipo de Cuenta",
    "Moneda Del Pedido",
    "Referencia",
    "Documento Bancario",
    "IBAN",
    "Observacion",
    "Pregunta1",
    "Pregunta2",
    "Pregunta3",
    "Pregunta4",
    "Pais De Banco 2",
    "Numero de Cuenta 2",
    "Moneda Del Pedido 2",
    "Referencia 2",
    "Documento Bancario 2",
    "IBAN 2",
    "Nombre Banco 2",
    "Swift 2",
    "Titular Cuenta 2"
  ];

  const totalColsDeseadas = headersDeseados.length;
  const currentLastCol = sh.getLastColumn();

  if (currentLastCol < totalColsDeseadas) {
    sh.insertColumnsAfter(currentLastCol, totalColsDeseadas - currentLastCol);
  }

  sh.getRange(1, 1, 1, totalColsDeseadas).setValues([headersDeseados]);

  const headerRange = sh.getRange(1, 1, 1, totalColsDeseadas);
  headerRange
    .setFontWeight("bold")
    .setBackground("#1B5E20")
    .setFontColor("#FFFFFF")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");

  sh.setFrozenRows(1);

  const widths = [
    120, 150, 160, 180, 100, 170, 110, 220, 220, 140,
    140, 140, 180, 120, 120, 120, 220, 170, 110, 180,
    120, 150, 120, 130, 150, 220, 140, 180, 220, 220,
    260, 180, 110, 150, 130, 150, 220, 140, 180, 120, 180
  ];
  widths.forEach((w, i) => sh.setColumnWidth(i + 1, w));

  const estadoCol = 3;
  const maxRows = Math.max(sh.getMaxRows(), 1000);
  const estadoRange = sh.getRange(2, estadoCol, maxRows - 1, 1);

  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(ESTADOS_REGISTRO, true)
    .setAllowInvalid(false)
    .build();

  estadoRange.setDataValidation(rule);

  const existingRules = sh.getConditionalFormatRules() || [];
  const rulesNoEstado = existingRules.filter(r => {
    const ranges = r.getRanges() || [];
    return !ranges.some(range => range.getColumn() === estadoCol);
  });

  const estadoFullRange = sh.getRange(2, estadoCol, maxRows - 1, 1);

  const ruleSolicitando = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("SOLICITANDO V°B")
    .setBackground("#FFF2CC")
    .setFontColor("#7F6000")
    .setRanges([estadoFullRange])
    .build();

  const ruleAnalisis = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("En analisis")
    .setBackground("#E8F5E9")
    .setFontColor("#1B5E20")
    .setRanges([estadoFullRange])
    .build();

  const ruleCreacion = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("EN CREACION")
    .setBackground("#D9EAF7")
    .setFontColor("#0B5394")
    .setRanges([estadoFullRange])
    .build();

  const ruleCreado = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("CREADO")
    .setBackground("#D9EAD3")
    .setFontColor("#274E13")
    .setRanges([estadoFullRange])
    .build();

  const ruleRechazado = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("RECHAZADO")
    .setBackground("#F4CCCC")
    .setFontColor("#990000")
    .setRanges([estadoFullRange])
    .build();

  sh.setConditionalFormatRules([
    ...rulesNoEstado,
    ruleAnalisis,
    ruleSolicitando,
    ruleCreacion,
    ruleCreado,
    ruleRechazado
  ]);

  if (sh.getLastRow() > 1) {
    sh.getRange(2, 1, sh.getLastRow() - 1, totalColsDeseadas).setNumberFormat("@");
  }

  if (!sh.getFilter()) {
    sh.getRange(1, 1, Math.max(sh.getLastRow(), 2), totalColsDeseadas).createFilter();
  }
}

function ordenarRegistroPorFecha_() {
  const ss = SpreadsheetApp.openById(DEST_SS_ID);
  const sh = ss.getSheetByName(SHEET_REG);
  if (!sh || sh.getLastRow() < 3) return;

  const headerMap = getHeaderMap_(sh);
  const fechaIdx = headerMap["Fecha de Solicitud"] !== undefined
    ? headerMap["Fecha de Solicitud"]
    : headerMap[normalizeHeaderBasic_("Fecha de Solicitud")];
  if (fechaIdx === undefined) return;

  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  const values = sh.getRange(2, 1, lastRow - 1, lastCol).getValues();
  values.sort((a, b) => parseDateForSort_(b[fechaIdx]) - parseDateForSort_(a[fechaIdx]));
  sh.getRange(2, 1, values.length, lastCol).setNumberFormat("@").setValues(values);
}

/***********************
 * PAÍSES DESDE HOJA "Pais"
 ***********************/
function getPaisesBanco() {
  const ss = SpreadsheetApp.openById(DEST_SS_ID);
  const sh = ss.getSheetByName(SHEET_PAIS);
  if (!sh) throw new Error('No existe la hoja "' + SHEET_PAIS + '".');

  const lastRow = sh.getLastRow();
  if (lastRow < 2) return [];

  const data = sh.getRange(2, 1, lastRow - 1, 2).getValues();

  return data
    .map(r => {
      const abreviado = cleanText_(r[0]);
      const nombrePais = cleanText_(r[1]);
      if (!abreviado || !nombrePais) return null;
      return {
        codigo: abreviado,
        nombre: nombrePais
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

/***********************
 * EXISTE IDENTIFICACIÓN FISCAL
 ***********************/
function getHeaderIndexByCandidates_(headerMap, candidates) {
  for (let i = 0; i < candidates.length; i++) {
    const name = candidates[i];
    if (headerMap[name] !== undefined) return headerMap[name];

    const normalized = normalizeHeaderBasic_(name);
    if (headerMap[normalized] !== undefined) return headerMap[normalized];
  }
  return undefined;
}

function existeIdentFiscalEnHoja_(sheetName, headerCandidates, identFiscal) {
  const ident = normalizeTaxId_(identFiscal);
  if (!ident) return false;

  const ss = SpreadsheetApp.openById(DEST_SS_ID);
  const sh = ss.getSheetByName(sheetName);
  if (!sh || sh.getLastRow() < 2) return false;

  const headerMap = getHeaderMap_(sh);
  const idx = getHeaderIndexByCandidates_(headerMap, headerCandidates);
  if (idx === undefined) return false;

  const values = sh.getRange(2, idx + 1, sh.getLastRow() - 1, 1).getValues();
  return values.some(r => normalizeTaxId_(r[0]) === ident);
}

function existeIdentFiscal(identFiscal) {
  const ident = normalizeTaxId_(identFiscal);
  if (!ident) return false;

  if (existeIdentFiscalEnHoja_(SHEET_REG, [
    "N° Identificacion Fiscal",
    "N° Identificación Fiscal",
    "N Identificacion Fiscal"
  ], ident)) {
    return true;
  }

  if (existeIdentFiscalEnHoja_(SHEET_PROV_CREADOS, [
    "Nº ident.fis.1",
    "N° ident.fis.1",
    "N ident.fis.1",
    "Nº ident fis 1",
    "N° ident fis 1"
  ], ident)) {
    return true;
  }

  return false;
}

/***********************
 * DRIVE
 ***********************/
function subirDocumentoBancario_(fileObj, identFiscal, sufijo) {
  if (!fileObj || !fileObj.bytes) return { url: "", fileId: "" };

  const rootFolder = DriveApp.getFolderById(FOLDER_ID_DOCS);

  const safeId = String(identFiscal || "SIN_ID")
    .trim()
    .replace(/[\\/:*?"<>|#%&{}$!'@+=`~]/g, "_")
    .replace(/\s+/g, "_");

  const idFolder = getOrCreateFolder_(rootFolder, safeId);
  const registradoFolder = getOrCreateFolder_(idFolder, "Registrado");
  getOrCreateFolder_(idFolder, "Modificado");

  const bytes = validarArchivoBancario_(fileObj, "Documento Bancario");
  const blob = Utilities.newBlob(bytes, fileObj.mimeType, fileObj.name);

  const ts = Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone(),
    "yyyyMMdd_HHmmss"
  );

  const nombreBase = sufijo || "Cuenta1";
  const fileName = `Documento_Bancario_${nombreBase}_${safeId}_${ts}_${fileObj.name}`;
  const file = registradoFolder.createFile(blob).setName(fileName);

  return {
    url: file.getUrl(),
    fileId: file.getId(),
    folderIdFiscal: idFolder.getId(),
    folderRegistradoId: registradoFolder.getId()
  };
}

/***********************
 * BATCH INPUT
 * SOLO CUENTA 1
 ***********************/
function construirFilaBIExtranjero_(data) {
  const identFiscal = normalizeTaxId_(data.identFiscal);
  const razon2 = data.mostrarNombreRazon2 ? cleanText_(data.nombreRazon2) : "";

  const row = new Array(77).fill("");

  row[0]  = cleanText_(data.sociedad);
  row[1]  = cleanText_(data.orgCompras);
  row[2]  = ESTATICOS_SAP_EXT.grupoCuentas;
  row[3]  = cleanText_(data.tratamiento);
  row[4]  = cleanText_(data.nombreRazon1);
  row[5]  = razon2;

  row[6]  = identFiscal;
  row[7]  = cleanText_(data.nombreRazon1);

  row[8]  = cleanText_(data.calle);
  row[9]  = cleanText_(data.numero);
  row[10] = cleanText_(data.distrito);
  row[11] = cleanText_(data.poblacion);
  row[12] = cleanText_(data.codigoPostal);
  row[13] = normalizeCode2_(data.paisProveedor);
  row[14] = cleanText_(data.regionEstado);
  row[15] = "";
  row[16] = cleanText_(data.idioma) || "ES";
  row[17] = normalizePhone_(data.telefono);
  row[18] = "";

  row[19] = cleanText_(data.correo);
  row[20] = "PP";
  row[21] = cleanText_(data.correo);
  row[22] = "";
  row[23] = "";
  row[24] = "";
  row[25] = identFiscal;
  row[26] = "";
  row[27] = "";
  row[28] = "";
  row[29] = "";
  row[30] = "";
  row[31] = "";
  row[32] = ESTATICOS_SAP_EXT.ramo;
  row[33] = "";

  row[34] = cleanText_(data.paisBanco);
  row[35] = "";
  row[36] = normalizeAccountNumber_(data.numeroCuenta);
  row[37] = cleanText_(data.titularCuenta);
  row[38] = normalizeSwift_(data.codigoSwift);
  row[39] = cleanText_(data.nombreBanco);
  row[40] = cleanText_(data.referencia);

  row[41] = "";
  row[42] = ESTATICOS_SAP_EXT.cuentaAsociada;
  row[43] = "";
  row[44] = ESTATICOS_SAP_EXT.grupoTesoreria;
  row[45] = ESTATICOS_SAP_EXT.grupoLiberacion;
  row[46] = "";
  row[47] = "";
  row[48] = "";
  row[49] = "";
  row[50] = ESTATICOS_SAP_EXT.condicionPago;
  row[51] = "";
  row[52] = ESTATICOS_SAP_EXT.verificacionFraDob;
  row[53] = "N";
  row[54] = "";
  row[55] = "";
  row[56] = "";
  row[57] = "";
  row[58] = "";
  row[59] = "";
  row[60] = "";
  row[61] = "";
  row[62] = "";
  row[63] = "";
  row[64] = "";
  row[65] = "";
  row[66] = "";
  row[67] = cleanText_(data.moneda);
  row[68] = ESTATICOS_SAP_EXT.condicionPago;
  row[69] = "";
  row[70] = "";
  row[71] = ESTATICOS_SAP_EXT.grupoEsquema;
  row[72] = "";
  row[73] = "";
  row[74] = ESTATICOS_SAP_EXT.verifFactBasePedido;
  row[75] = ESTATICOS_SAP_EXT.pedidoAutomatico;
  row[76] = ESTATICOS_SAP_EXT.verifFactServ;

  return row;
}

function insertarEnBatchInputExtranjero_(data) {
  const ss = SpreadsheetApp.openById(DEST_SS_ID);
  const sh = ss.getSheetByName(SHEET_BI);
  if (!sh) throw new Error('No existe la hoja "' + SHEET_BI + '".');
  formatearBatchInput_();

  let row = construirFilaBIExtranjero_(data);
  row = upperRowExcept_(row, [19, 21]);

  const targetRow = sh.getLastRow() + 1;
  const range = sh.getRange(targetRow, 1, 1, row.length);
  range.setNumberFormat("@");
  range.setValues([row.map(v => (v === null || v === undefined) ? "" : String(v))]);
}

function formatearBatchInput_() {
  const ss = SpreadsheetApp.openById(DEST_SS_ID);
  const sh = ss.getSheetByName(SHEET_BI);
  if (!sh) throw new Error('No existe la hoja "' + SHEET_BI + '".');
  const lastCol = Math.max(sh.getLastColumn(), 77);
  const lastRow = Math.max(sh.getLastRow(), 2);

  sh.getRange(1, 1, 1, lastCol)
    .setFontWeight("bold")
    .setBackground("#1B5E20")
    .setFontColor("#FFFFFF")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
  sh.setFrozenRows(1);
  sh.getRange(2, 1, lastRow - 1, lastCol).setNumberFormat("@");

  if (!sh.getFilter()) {
    sh.getRange(1, 1, lastRow, lastCol).createFilter();
  }

  for (let col = 1; col <= lastCol; col++) {
    sh.setColumnWidth(col, col <= 25 ? 150 : 130);
  }
}

/***********************
 * REGISTRO
 * CUENTA 1 + CUENTA 2
 ***********************/
function insertarEnRegistroExtranjero_(data, docUrl1, docUrl2) {
  const ss = SpreadsheetApp.openById(DEST_SS_ID);
  const sh = ss.getSheetByName(SHEET_REG);
  if (!sh) throw new Error('No existe la hoja "' + SHEET_REG + '".');

  actualizarEstructuraRegistro();

  const headerMap = getHeaderMap_(sh);
  const lastCol = sh.getLastColumn();
  const row = new Array(lastCol).fill("");
  const identFiscal = normalizeTaxId_(data.identFiscal);

  setValueByHeader_(row, headerMap, "Codigo SAP", "");
  setValueByHeader_(row, headerMap, "Fecha de Solicitud", getFechaSolicitudTexto_());
  setValueByHeader_(row, headerMap, "Estado", "En analisis");
  setValueByHeader_(row, headerMap, "Solicitante", cleanText_(data.solicitante));
  setValueByHeader_(row, headerMap, "Sociedad", cleanText_(data.sociedad));
  setValueByHeader_(row, headerMap, "Organización de Compras", cleanText_(data.orgCompras));
  setValueByHeader_(row, headerMap, "Tratamiento", cleanText_(data.tratamiento));
  setValueByHeader_(row, headerMap, "Nombre o Razon Social 1", cleanText_(data.nombreRazon1));
  setValueByHeader_(row, headerMap, "Nombre o Razon Social 2", data.mostrarNombreRazon2 ? cleanText_(data.nombreRazon2) : "");
  setValueByHeader_(row, headerMap, "Region", cleanText_(data.regionEstado));
  setValueByHeader_(row, headerMap, "Distrito", cleanText_(data.distrito));
  setValueByHeader_(row, headerMap, "Poblacion", cleanText_(data.poblacion));
  setValueByHeader_(row, headerMap, "Calle", cleanText_(data.calle));
  setValueByHeader_(row, headerMap, "Numero de Casa", cleanText_(data.numero));
  setValueByHeader_(row, headerMap, "Codigo Postal", cleanText_(data.codigoPostal));
  setValueByHeader_(row, headerMap, "Telefono", normalizePhone_(data.telefono));
  setValueByHeader_(row, headerMap, "Correo", cleanText_(data.correo));
  setValueByHeader_(row, headerMap, "N° Identificacion Fiscal", identFiscal);
  setValueByHeader_(row, headerMap, "Pais De Banco", normalizeCode2_(data.paisBanco));
  setValueByHeader_(row, headerMap, "Nombre Banco", cleanText_(data.nombreBanco));
  setValueByHeader_(row, headerMap, "Swift", normalizeSwift_(data.codigoSwift));
  setValueByHeader_(row, headerMap, "Numero de Cuenta", normalizeAccountNumber_(data.numeroCuenta));
  setValueByHeader_(row, headerMap, "Tipo de Cuenta", "");
  setValueByHeader_(row, headerMap, "Moneda Del Pedido", cleanText_(data.moneda));
  setValueByHeader_(row, headerMap, "Referencia", cleanText_(data.referencia));
  setValueByHeader_(row, headerMap, "Documento Bancario", docUrl1 || "");
  setValueByHeader_(row, headerMap, "IBAN", normalizeIban_(data.iban));
  setValueByHeader_(row, headerMap, "Observacion", cleanText_(data.observacion));
  setValueByHeader_(row, headerMap, "Pregunta1", cleanText_(data.pregunta1));
  setValueByHeader_(row, headerMap, "Pregunta2", cleanText_(data.pregunta2));
  setValueByHeader_(row, headerMap, "Pregunta3", cleanText_(data.pregunta3));
  setValueByHeader_(row, headerMap, "Pregunta4", cleanText_(data.pregunta4));

  if (data.agregarOtraCuenta) {
    setValueByHeader_(row, headerMap, "Pais De Banco 2", normalizeCode2_(data.paisBanco2));
    setValueByHeader_(row, headerMap, "Numero de Cuenta 2", normalizeAccountNumber_(data.numeroCuenta2));
    setValueByHeader_(row, headerMap, "Moneda Del Pedido 2", cleanText_(data.moneda2));
    setValueByHeader_(row, headerMap, "Referencia 2", cleanText_(data.referencia2));
    setValueByHeader_(row, headerMap, "Documento Bancario 2", docUrl2 || "");
    setValueByHeader_(row, headerMap, "IBAN 2", normalizeIban_(data.iban2));
    setValueByHeader_(row, headerMap, "Nombre Banco 2", cleanText_(data.nombreBanco2));
    setValueByHeader_(row, headerMap, "Swift 2", normalizeSwift_(data.codigoSwift2));
    setValueByHeader_(row, headerMap, "Titular Cuenta 2", cleanText_(data.titularCuenta2));
  }

  const idxEstado = headerMap["Estado"] !== undefined ? headerMap["Estado"] : headerMap[normalizeHeaderBasic_("Estado")];
  const idxFecha = headerMap["Fecha de Solicitud"] !== undefined ? headerMap["Fecha de Solicitud"] : headerMap[normalizeHeaderBasic_("Fecha de Solicitud")];
  const idxCorreo = headerMap["Correo"] !== undefined ? headerMap["Correo"] : headerMap[normalizeHeaderBasic_("Correo")];
  const idxDoc1 = headerMap["Documento Bancario"] !== undefined ? headerMap["Documento Bancario"] : headerMap[normalizeHeaderBasic_("Documento Bancario")];
  const idxDoc2 = headerMap["Documento Bancario 2"] !== undefined ? headerMap["Documento Bancario 2"] : headerMap[normalizeHeaderBasic_("Documento Bancario 2")];

  const out = row.map((v, idx) => {
    const s = String(v ?? "");
    if ([idxEstado, idxFecha, idxCorreo, idxDoc1, idxDoc2].includes(idx)) return s;
    return s.toUpperCase();
  });

  if (idxEstado !== undefined) out[idxEstado] = "En analisis";

  const targetRow = sh.getLastRow() + 1;
  sh.getRange(targetRow, 1, 1, out.length).setNumberFormat("@").setValues([out]);
}

/***********************
 * VALIDACIÓN SERVER
 ***********************/
function validarDataServerExtranjero_(data, fileObj1, fileObj2) {
  data.identFiscal = normalizeTaxId_(data.identFiscal);
  data.paisProveedor = normalizeCode2_(data.paisProveedor);
  data.codigoSwift = normalizeSwift_(data.codigoSwift);
  data.paisBanco = cleanText_(data.paisBanco);
  data.telefono = normalizePhone_(data.telefono);
  data.iban = normalizeIban_(data.iban);
  data.numeroCuenta = normalizeAccountNumber_(data.numeroCuenta);

  data.codigoSwift2 = normalizeSwift_(data.codigoSwift2);
  data.paisBanco2 = cleanText_(data.paisBanco2);
  data.iban2 = normalizeIban_(data.iban2);
  data.numeroCuenta2 = normalizeAccountNumber_(data.numeroCuenta2);
  data.sociedad = cleanText_(data.sociedad).toUpperCase();
  data.orgCompras = cleanText_(data.orgCompras).toUpperCase();
  data.tratamiento = cleanText_(data.tratamiento).toUpperCase();
  data.idioma = cleanText_(data.idioma).toUpperCase();
  data.moneda = cleanText_(data.moneda).toUpperCase();
  data.moneda2 = cleanText_(data.moneda2).toUpperCase();

  const paisSet = getPaisCodeSet_();

  [
    ["solicitante", data.solicitante],
    ["nombreRazon1", data.nombreRazon1],
    ["nombreRazon2", data.nombreRazon2],
    ["regionEstado", data.regionEstado],
    ["distrito", data.distrito],
    ["poblacion", data.poblacion],
    ["calle", data.calle],
    ["numero", data.numero],
    ["codigoPostal", data.codigoPostal],
    ["nombreBanco", data.nombreBanco],
    ["titularCuenta", data.titularCuenta],
    ["referencia", data.referencia],
    ["pregunta1", data.pregunta1],
    ["pregunta2", data.pregunta2],
    ["pregunta3", data.pregunta3],
    ["pregunta4", data.pregunta4],
    ["observacion", data.observacion],
    ["nombreBanco2", data.nombreBanco2],
    ["titularCuenta2", data.titularCuenta2],
    ["referencia2", data.referencia2]
  ].forEach(item => {
    validarTextoSinEspeciales_(item[1], item[0]);
  });

  if (!cleanText_(data.solicitante)) throw new Error("Debe indicar solicitante.");
  if (!cleanText_(data.sociedad)) throw new Error("Debe indicar sociedad.");
  if (!isInList_(data.sociedad, SOCIEDADES_PERMITIDAS)) throw new Error("Sociedad no permitida.");
  if (!cleanText_(data.orgCompras)) throw new Error("Debe indicar organización de compras.");
  if (!isInList_(data.orgCompras, ORGS_PERMITIDAS)) throw new Error("Organizacion de compras no permitida.");

  if (data.sociedad === "PCL1" && data.orgCompras !== "PCL1") {
    throw new Error("Para sociedad PCL1 solo se permite organización de compras PCL1.");
  }

  if (data.sociedad !== "PCL1" && data.orgCompras === "PCL1") {
    throw new Error("La organización de compras PCL1 solo se permite para sociedad PCL1.");
  }

  if (!cleanText_(data.tratamiento)) throw new Error("Debe indicar tratamiento.");
  if (!isInList_(data.tratamiento, TRATAMIENTOS_PERMITIDOS)) throw new Error("Tratamiento no permitido.");
  if (!cleanText_(data.nombreRazon1)) throw new Error("Debe indicar Nombre / Razón Social 1.");
  if (data.mostrarNombreRazon2 && !cleanText_(data.nombreRazon2)) throw new Error("Debe indicar Nombre / Razón Social 2.");
  if (data.paisProveedor.length !== 2) throw new Error("Debe indicar un país del proveedor válido.");
  assertPaisCode_(data.paisProveedor, "Pais del proveedor", paisSet);
  if (!cleanText_(data.idioma)) throw new Error("Debe indicar idioma.");
  if (!isInList_(data.idioma, IDIOMAS_PERMITIDOS)) throw new Error("Idioma no permitido.");

  if (!cleanText_(data.regionEstado)) throw new Error("Debe indicar Región / Estado.");
  if (!cleanText_(data.distrito)) throw new Error("Debe indicar Distrito / Ciudad.");
  if (!cleanText_(data.poblacion)) throw new Error("Debe indicar Población / Localidad.");
  if (!cleanText_(data.calle)) throw new Error("Debe indicar Calle / Dirección.");

  if (!cleanText_(data.telefono)) throw new Error("Debe indicar teléfono.");
  if (!isValidPhone_(data.telefono)) throw new Error("Teléfono inválido. Para carga SAP se guardan solo números.");

  if (!cleanText_(data.correo)) throw new Error("Debe indicar correo.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanText_(data.correo))) throw new Error("Correo inválido.");

  if (!cleanText_(data.identFiscal)) throw new Error("Debe indicar N° Identificación Fiscal / Tax ID.");
  if (!isValidTaxId_(data.identFiscal)) throw new Error("ID Fiscal inválido.");

  if (!cleanText_(data.paisBanco)) throw new Error("Debe indicar País banco.");
  assertPaisCode_(data.paisBanco, "Pais banco", paisSet);
  if (!cleanText_(data.nombreBanco)) throw new Error("Debe indicar Nombre Banco.");
  if (!isValidSwift_(data.codigoSwift)) throw new Error("SWIFT o Clave de Banco inválido.");
  if (!isValidIban_(data.iban)) throw new Error("IBAN inválido.");
  if (!cleanText_(data.numeroCuenta)) throw new Error("Debe indicar Número Cuenta.");
  if (!isValidAccountNumber_(data.numeroCuenta)) throw new Error("Número de cuenta inválido.");
  if (!cleanText_(data.moneda)) throw new Error("Debe indicar Moneda.");
  if (!isInList_(data.moneda, MONEDAS_PERMITIDAS)) throw new Error("Moneda no permitida.");
  validarArchivoBancario_(fileObj1, "Documento Bancario de la cuenta 1");

  if (!cleanText_(data.pregunta1)) throw new Error("Debe responder Pregunta 1.");
  if (!cleanText_(data.pregunta2)) throw new Error("Debe responder Pregunta 2.");
  if (!cleanText_(data.pregunta3)) throw new Error("Debe responder Pregunta 3.");
  if (!cleanText_(data.pregunta4)) throw new Error("Debe responder Pregunta 4.");

  if (data.agregarOtraCuenta) {
    if (!cleanText_(data.paisBanco2)) throw new Error("Debe indicar País banco 2.");
    assertPaisCode_(data.paisBanco2, "Pais banco 2", paisSet);
    if (!cleanText_(data.nombreBanco2)) throw new Error("Debe indicar Nombre Banco 2.");
    if (!isValidSwift_(data.codigoSwift2)) throw new Error("SWIFT o Clave de Banco 2 inválido.");
    if (!isValidIban_(data.iban2)) throw new Error("IBAN 2 inválido.");
    if (!cleanText_(data.numeroCuenta2)) throw new Error("Debe indicar Número Cuenta 2.");
    if (!isValidAccountNumber_(data.numeroCuenta2)) throw new Error("Número de cuenta 2 inválido.");
    if (!cleanText_(data.moneda2)) throw new Error("Debe indicar Moneda 2.");
    if (!isInList_(data.moneda2, MONEDAS_PERMITIDAS)) throw new Error("Moneda 2 no permitida.");
    validarArchivoBancario_(fileObj2, "Documento Bancario de la cuenta 2");
  }
}

/***********************
 * ENTRYPOINT HTML
 ***********************/
function procesarFormularioCompletoExtranjero(data, fileObj1, fileObj2) {
  actualizarEstructuraRegistro();
  validarDataServerExtranjero_(data, fileObj1, fileObj2);

  if (existeIdentFiscal(data.identFiscal)) {
    return { success: false, message: "Proveedor Ya existe porfavor comunicarse con codificacion" };
  }

  const identFiscal = normalizeTaxId_(data.identFiscal);

  const up1 = subirDocumentoBancario_(fileObj1, identFiscal, "Cuenta1");
  const up2 = data.agregarOtraCuenta
    ? subirDocumentoBancario_(fileObj2, identFiscal, "Cuenta2")
    : { url: "" };

  insertarEnRegistroExtranjero_(data, up1.url, up2.url);
  insertarEnBatchInputExtranjero_(data);
  ordenarRegistroPorFecha_();

  return {
    success: true,
    message: "Registro y Batch Input creados correctamente.",
    docUrl: up1.url,
    docUrl2: up2.url || "",
    redirectUrl: REDIRECT_URL
  };
}
