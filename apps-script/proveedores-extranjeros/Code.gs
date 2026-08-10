/***********************
 * APP ADMIN PROVEEDORES EXTRANJEROS
 * Pegar este archivo como Code.gs en un Apps Script aparte.
 ***********************/
const DEST_SS_ID = "1SxEB6d7RZuNZF9QVAX5EXmzpUF4OW39k9PHUPfCoSj8";
const SHEET_REG = "Registro";
const SHEET_BI = "Batch Input";
const FORM_PROVIDER_URL = "https://script.google.com/a/macros/masisa.com/s/AKfycbzBxrvgggawvjFyuZroD337YhyW-AlgSQtSlt6P7vYvhE1OdphfD9IzdecSgIpCFy8T8Q/exec";
const MONEDAS_PERMITIDAS = ["USD", "EUR", "CLP", "BRL", "ARS", "PEN"];

/***********************
 * DOCUMENTO BANCARIO (reemplazo de archivo)
 ***********************/
// Opcional: ID de la carpeta de Drive donde el formulario guarda los documentos bancarios.
// Si se deja vacio, se usa la carpeta del documento cargado anteriormente y, si no existe,
// la carpeta donde vive la planilla de destino.
const DOC_BANCARIO_FOLDER_ID = "";
const DOC_BANCARIO_FOLDER_NAME = "Documentos bancarios proveedores extranjeros";
const DOC_BANCARIO_MAX_MB = 10;
const DOC_BANCARIO_EXT_PERMITIDAS = ["pdf", "jpg", "jpeg", "png"];

function doGet() {
  return HtmlService
    .createHtmlOutputFromFile("Index_extranjero")
    .setTitle("Gestion proveedores extranjeros")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function normalizeTaxId_(v) {
  return String(v || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 25);
}

function cleanText_(v) {
  return String(v || "").trim();
}

function containsInvalidChars_(v) {
  return /[*<>|{}[\]^~`]/.test(String(v || ""));
}

function normalizeSwift_(v) {
  return String(v || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11);
}

function normalizeIban_(v) {
  return String(v || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 34);
}

function normalizeAccountNumber_(v) {
  return String(v || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 34);
}

function validateEditableExtField_(header, value) {
  const key = normalizeHeaderExt_(header);
  const text = cleanText_(value);
  if (containsInvalidChars_(text)) throw new Error("Campo con caracteres no permitidos: " + header);
  if (key.indexOf("IDENTIFICACION FISCAL") >= 0 && !normalizeTaxId_(text)) throw new Error("N° Identificacion Fiscal obligatorio.");
  if (key === "CORREO" && text && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) throw new Error("Correo invalido.");
  if (key.indexOf("SWIFT") >= 0 && text && !/^[A-Z0-9]{8,11}$/.test(normalizeSwift_(text))) throw new Error("SWIFT invalido: " + header);
  if (key.indexOf("IBAN") >= 0 && text && !/^[A-Z0-9]{10,34}$/.test(normalizeIban_(text))) throw new Error("IBAN invalido: " + header);
  if (key.indexOf("NUMERO DE CUENTA") >= 0 && text && !/^[A-Z0-9]{4,34}$/.test(normalizeAccountNumber_(text))) throw new Error("Numero de cuenta invalido: " + header);
  if (key.indexOf("MONEDA DEL PEDIDO") >= 0 && text && !MONEDAS_PERMITIDAS.includes(text.toUpperCase())) throw new Error("Moneda no permitida: " + header);
}

function sanitizeEditableExtValue_(header, value) {
  const key = normalizeHeaderExt_(header);
  if (key.indexOf("IDENTIFICACION FISCAL") >= 0) return normalizeTaxId_(value);
  if (key.indexOf("SWIFT") >= 0) return normalizeSwift_(value);
  if (key.indexOf("IBAN") >= 0) return normalizeIban_(value);
  if (key.indexOf("NUMERO DE CUENTA") >= 0) return normalizeAccountNumber_(value);
  if (key.indexOf("MONEDA DEL PEDIDO") >= 0) return cleanText_(value).toUpperCase();
  return cleanText_(value);
}

/***********************
 * ADMIN PROVEEDORES EXTRANJEROS
 ***********************/
const EDITABLE_EXT_HEADERS = [
  "Sociedad",
  "Organización de Compras",
  "Organizacion de Compra",
  "Organización de Compra",
  "Organizacion de Compras",
  "Region",
  "Distrito",
  "Poblacion",
  "Calle",
  "Numero de Casa",
  "Codigo Postal",
  "Telefono",
  "Correo",
  "N° Identificacion Fiscal",
  "N° Identificación Fiscal",
  "Pais De Banco",
  "Nombre Banco",
  "Swift",
  "Numero de Cuenta",
  "Moneda Del Pedido"
];

function normalizeHeaderExt_(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[º°]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function getHeaderMapExt_(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  const map = {};
  headers.forEach((h, i) => {
    const key = normalizeHeaderExt_(h);
    if (key) map[key] = i;
  });
  return { headers, map };
}

function readCellExt_(row, map, names) {
  const list = Array.isArray(names) ? names : [names];
  for (let i = 0; i < list.length; i++) {
    const idx = map[normalizeHeaderExt_(list[i])];
    if (idx !== undefined) return row[idx] || "";
  }
  return "";
}

function isEditableExtHeader_(header) {
  const key = normalizeHeaderExt_(header);
  return EDITABLE_EXT_HEADERS.some(h => normalizeHeaderExt_(h) === key);
}


function isEditableEstadoExt_(estado) {
  const key = normalizeHeaderExt_(estado);
  return key === "EN ANALISIS" || key === "RECHAZADO";
}

function getEditableFieldsExt_(headers) {
  return headers
    .filter(h => h && isEditableExtHeader_(h))
    .map(h => ({ name: h }));
}

/***********************
 * HELPERS DOCUMENTO BANCARIO
 ***********************/
// Busca el indice de la columna del documento bancario aceptando variantes del encabezado
// ("Documento Bancario", "Documento Bancario (link)", "Link Documento Bancario", etc.).
function findDocBancarioIdxExt_(map) {
  const keys = Object.keys(map);
  for (let i = 0; i < keys.length; i++) {
    if (keys[i].indexOf("DOCUMENTO BANCARIO") >= 0) return map[keys[i]];
  }
  return undefined;
}

function readDocBancarioExt_(row, map) {
  const idx = findDocBancarioIdxExt_(map);
  return idx === undefined ? "" : String(row[idx] || "");
}

// Extrae el ID de archivo desde un link de Drive. Devuelve "" si no es un archivo valido.
function extractDriveFileIdExt_(value) {
  const s = cleanText_(value);
  if (!s) return "";
  if (/\/folders\//.test(s)) return "";
  let m = s.match(/\/d\/([a-zA-Z0-9_-]{10,})/);
  if (m) return m[1];
  m = s.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if (m) return m[1];
  if (/^[a-zA-Z0-9_-]{20,}$/.test(s)) return s;
  return "";
}

// Carpeta destino: la del documento anterior > la configurada > la de la planilla.
function getDocBancarioFolderExt_(previousUrl) {
  const previousId = extractDriveFileIdExt_(previousUrl);
  if (previousId) {
    try {
      const parents = DriveApp.getFileById(previousId).getParents();
      if (parents.hasNext()) return parents.next();
    } catch (err) {
      // El archivo anterior puede estar borrado o sin permisos: se ignora y se usa el fallback.
    }
  }
  if (DOC_BANCARIO_FOLDER_ID) return DriveApp.getFolderById(DOC_BANCARIO_FOLDER_ID);
  let base = DriveApp.getRootFolder();
  try {
    const ssParents = DriveApp.getFileById(DEST_SS_ID).getParents();
    if (ssParents.hasNext()) base = ssParents.next();
  } catch (err) {
    // Sin acceso al padre de la planilla: queda la raiz de Drive.
  }
  const existing = base.getFoldersByName(DOC_BANCARIO_FOLDER_NAME);
  return existing.hasNext() ? existing.next() : base.createFolder(DOC_BANCARIO_FOLDER_NAME);
}

// Sube el nuevo documento y devuelve el link + el ID del documento anterior (para eliminarlo despues).
function saveDocBancarioExt_(file, identFiscal, previousUrl) {
  if (!file || !file.dataBase64) throw new Error("No se recibio el archivo.");
  const originalName = cleanText_(file.name);
  if (!originalName) throw new Error("El archivo no tiene nombre.");
  const ext = (originalName.split(".").pop() || "").toLowerCase();
  if (DOC_BANCARIO_EXT_PERMITIDAS.indexOf(ext) < 0) {
    throw new Error("Formato no permitido (." + ext + "). Use: " + DOC_BANCARIO_EXT_PERMITIDAS.join(", ") + ".");
  }

  let bytes;
  try {
    bytes = Utilities.base64Decode(String(file.dataBase64));
  } catch (err) {
    throw new Error("No se pudo leer el archivo cargado.");
  }
  if (!bytes || !bytes.length) throw new Error("El archivo llego vacio.");
  if (bytes.length > DOC_BANCARIO_MAX_MB * 1024 * 1024) {
    throw new Error("El archivo supera el maximo de " + DOC_BANCARIO_MAX_MB + " MB.");
  }

  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd_HHmmss");
  const finalName = "DOC_BANCARIO_" + (normalizeTaxId_(identFiscal) || "SIN_ID") + "_" + stamp + "." + ext;
  const blob = Utilities.newBlob(bytes, cleanText_(file.mimeType) || "application/octet-stream", finalName);
  const folder = getDocBancarioFolderExt_(previousUrl);
  const created = folder.createFile(blob);

  const previousFileId = extractDriveFileIdExt_(previousUrl);
  return {
    url: created.getUrl(),
    fileId: created.getId(),
    name: finalName,
    previousFileId: previousFileId === created.getId() ? "" : previousFileId
  };
}

function trashDocBancarioExt_(fileId) {
  if (!fileId) return false;
  try {
    DriveApp.getFileById(fileId).setTrashed(true);
    return true;
  } catch (err) {
    console.warn("No se pudo eliminar el documento anterior " + fileId + ": " + err);
    return false;
  }
}

function getRowsExt_() {
  const sh = SpreadsheetApp.openById(DEST_SS_ID).getSheetByName(SHEET_REG);
  if (!sh) throw new Error("No existe la hoja Registro.");
  const { headers, map } = getHeaderMapExt_(sh);
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return { headers, map, rows: [] };
  const values = sh.getRange(2, 1, lastRow - 1, sh.getLastColumn()).getDisplayValues();
  const rows = values
    .map((row, i) => ({ rowNumber: i + 2, row }))
    .filter(item => item.row.some(v => String(v || "").trim()));
  return { headers, map, rows };
}

function rowSummaryExt_(item, map) {
  const row = item.row;
  return {
    rowNumber: item.rowNumber,
    codigoSap: readCellExt_(row, map, "Codigo SAP"),
    fechaSolicitud: readCellExt_(row, map, "Fecha de Solicitud"),
    estado: readCellExt_(row, map, "Estado"),
    solicitante: readCellExt_(row, map, "Solicitante"),
    sociedad: readCellExt_(row, map, "Sociedad"),
    orgCompras: readCellExt_(row, map, ["Organización de Compras", "Organizacion de Compras"]),
    razonSocial: readCellExt_(row, map, ["Nombre o Razon Social 1", "Nombre o Razón Social 1"]),
    paisProveedor: readCellExt_(row, map, ["Pais Proveedor", "País Proveedor", "Pais De Banco"]),
    paisBanco: readCellExt_(row, map, "Pais De Banco"),
    moneda: readCellExt_(row, map, "Moneda Del Pedido"),
    identFiscal: readCellExt_(row, map, ["N° Identificacion Fiscal", "N° Identificación Fiscal", "N Identificacion Fiscal"]),
    observacion: readCellExt_(row, map, ["Observacion", "Observación"]),
    docBancario: readDocBancarioExt_(row, map),
    editable: isEditableEstadoExt_(readCellExt_(row, map, "Estado"))
  };
}

function getDashboardDataExtranjero(query) {
  const data = getRowsExt_();
  const summaries = data.rows
    .map(item => rowSummaryExt_(item, data.map))
    .sort((a, b) => b.rowNumber - a.rowNumber);
  const q = normalizeHeaderExt_(query || "");
  const filtered = q
    ? summaries.filter(r => normalizeHeaderExt_([
        r.codigoSap, r.identFiscal, r.razonSocial, r.estado, r.solicitante,
        r.sociedad, r.orgCompras, r.paisProveedor, r.paisBanco, r.moneda, r.observacion
      ].join(" ")).includes(q))
    : summaries;
  const docIdx = findDocBancarioIdxExt_(data.map);
  return {
    rows: filtered.slice(0, 400),
    total: filtered.length,
    editableFields: getEditableFieldsExt_(data.headers),
    protectedFields: [],
    docBancarioField: docIdx === undefined ? "" : data.headers[docIdx],
    docBancarioMaxMb: DOC_BANCARIO_MAX_MB,
    docBancarioExtensiones: DOC_BANCARIO_EXT_PERMITIDAS.slice(),
    formUrl: FORM_PROVIDER_URL,
    generatedAt: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm")
  };
}

function findRegistroExtByIdent_(identFiscal) {
  const ident = normalizeTaxId_(identFiscal);
  const data = getRowsExt_();
  const idx = data.map[normalizeHeaderExt_("N° Identificacion Fiscal")] !== undefined
    ? data.map[normalizeHeaderExt_("N° Identificacion Fiscal")]
    : data.map[normalizeHeaderExt_("N° Identificación Fiscal")];
  if (idx === undefined) throw new Error("No existe columna N° Identificacion Fiscal.");
  const found = data.rows.find(item => normalizeTaxId_(item.row[idx]) === ident);
  if (!found) throw new Error("No se encontro proveedor extranjero: " + ident);
  return { ident, headers: data.headers, map: data.map, item: found };
}

function getProviderExtranjero(identFiscal) {
  const found = findRegistroExtByIdent_(identFiscal);
  const values = {};
  found.headers.forEach((header, idx) => {
    if (header) values[header] = found.item.row[idx] || "";
  });
  const docIdx = findDocBancarioIdxExt_(found.map);
  return {
    identFiscal: found.ident,
    values,
    editableFields: getEditableFieldsExt_(found.headers),
    protectedFields: [],
    docBancario: {
      available: docIdx !== undefined,
      header: docIdx === undefined ? "" : found.headers[docIdx],
      url: docIdx === undefined ? "" : String(found.item.row[docIdx] || ""),
      maxMb: DOC_BANCARIO_MAX_MB,
      extensiones: DOC_BANCARIO_EXT_PERMITIDAS.slice()
    },
    editable: isEditableEstadoExt_(readCellExt_(found.item.row, found.map, "Estado"))
  };
}

function updateProviderExtranjero(payload) {
  if (!payload || !payload.identFiscal || !payload.values) throw new Error("Solicitud invalida.");
  const found = findRegistroExtByIdent_(payload.identFiscal);
  const sh = SpreadsheetApp.openById(DEST_SS_ID).getSheetByName(SHEET_REG);
  const current = sh.getRange(found.item.rowNumber, 1, 1, sh.getLastColumn()).getValues()[0];

  const estadoIdx = found.map[normalizeHeaderExt_("Estado")];
  const estadoActual = estadoIdx !== undefined ? current[estadoIdx] : "";
  if (!isEditableEstadoExt_(estadoActual)) {
    throw new Error("Solo se pueden editar proveedores en estado 'En analisis' o 'Rechazado'.");
  }

  Object.keys(payload.values).forEach(header => {
    if (!isEditableExtHeader_(header)) return;
    validateEditableExtField_(header, payload.values[header]);
    const idx = found.map[normalizeHeaderExt_(header)];
    if (idx !== undefined) current[idx] = sanitizeEditableExtValue_(header, payload.values[header]);
  });

  const newIdentIdx = found.map[normalizeHeaderExt_("N° Identificacion Fiscal")] !== undefined
    ? found.map[normalizeHeaderExt_("N° Identificacion Fiscal")]
    : found.map[normalizeHeaderExt_("N° Identificación Fiscal")];
  const newIdent = newIdentIdx !== undefined ? normalizeTaxId_(current[newIdentIdx]) : found.ident;

  // Reemplazo del documento bancario: se sube primero el nuevo archivo, luego se escribe
  // el link en la planilla y recien al final se elimina el archivo mal cargado.
  let docInfo = null;
  if (payload.file && payload.file.dataBase64) {
    const docIdx = findDocBancarioIdxExt_(found.map);
    if (docIdx === undefined) throw new Error("No existe la columna Documento Bancario en la hoja Registro.");
    const previousUrl = String(current[docIdx] || "");
    docInfo = saveDocBancarioExt_(payload.file, newIdent, previousUrl);
    current[docIdx] = docInfo.url;
  }

  const out = current.map((v, idx) => {
    const header = found.headers[idx] || "";
    const s = v == null ? "" : String(v);
    if (/correo|documento bancario|fecha/i.test(header)) return s;
    return s.toUpperCase();
  });
  sh.getRange(found.item.rowNumber, 1, 1, out.length).setNumberFormat("@").setValues([out]);

  let docEliminado = false;
  if (docInfo && docInfo.previousFileId) docEliminado = trashDocBancarioExt_(docInfo.previousFileId);

  syncBatchInputExtByIdent_(found.ident, out, found.map);

  let message = "Proveedor extranjero actualizado en Registro y Batch Input.";
  if (docInfo) {
    message += docEliminado
      ? " Documento bancario reemplazado y archivo anterior eliminado de Drive."
      : " Documento bancario reemplazado (no se pudo eliminar el archivo anterior de Drive).";
  }
  return {
    success: true,
    message,
    identFiscal: newIdent,
    docBancarioUrl: docInfo ? docInfo.url : "",
    docBancarioReemplazado: !!docInfo,
    docAnteriorEliminado: docEliminado
  };
}

function findBatchExtRowByIdent_(identFiscal) {
  const ident = normalizeTaxId_(identFiscal);
  const sh = SpreadsheetApp.openById(DEST_SS_ID).getSheetByName(SHEET_BI);
  if (!sh || sh.getLastRow() < 2) return null;
  const { headers, map } = getHeaderMapExt_(sh);
  const idx = map[normalizeHeaderExt_("N° ID Fiscal")];
  if (idx === undefined) return null;
  const values = sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getDisplayValues();
  for (let i = 0; i < values.length; i++) {
    if (normalizeTaxId_(values[i][idx]) === ident) return { sheet: sh, headers, map, row: values[i], rowNumber: i + 2 };
  }
  return null;
}

function syncBatchInputExtByIdent_(identFiscal, registroRow, regMap) {
  const batch = findBatchExtRowByIdent_(identFiscal);
  if (!batch) return;
  const row = batch.row;
  const pairs = [
    ["N° ID Fiscal", "N° Identificacion Fiscal"],
    ["Sociedad", "Sociedad"],
    ["Organización de compras", "Organización de Compras"],
    ["Tratamiento", "Tratamiento"],
    ["Nombre o Razón Social 1", "Nombre o Razon Social 1"],
    ["Nombre o Razón Social 2", "Nombre o Razon Social 2"],
    ["Calle", "Calle"],
    ["Numero", "Numero de Casa"],
    ["Distrito", "Distrito"],
    ["Población", "Poblacion"],
    ["Código postal", "Codigo Postal"],
    ["Región", "Region"],
    ["Teléfono", "Telefono"],
    ["Correo Electronico", "Correo"],
    ["Correo Electrónico 2", "Correo"],
    ["País Banco", "Pais De Banco"],
    ["Cuenta Bancaria", "Numero de Cuenta"],
    ["Moneda de pedido", "Moneda Del Pedido"],
    ["Referencia", "Referencia"]
  ];
  pairs.forEach(([biHeader, regHeader]) => {
    const biIdx = batch.map[normalizeHeaderExt_(biHeader)];
    const regIdx = regMap[normalizeHeaderExt_(regHeader)];
    if (biIdx !== undefined && regIdx !== undefined) row[biIdx] = registroRow[regIdx] || "";
  });

  // El link del documento bancario tambien se replica si Batch Input tiene esa columna.
  const biDocIdx = findDocBancarioIdxExt_(batch.map);
  const regDocIdx = findDocBancarioIdxExt_(regMap);
  if (biDocIdx !== undefined && regDocIdx !== undefined) row[biDocIdx] = registroRow[regDocIdx] || "";

  const out = row.map((v, idx) => {
    const header = batch.headers[idx] || "";
    const s = String(v || "");
    if (/correo|documento bancario|fecha/i.test(header)) return s;
    return s.toUpperCase();
  });
  batch.sheet.getRange(batch.rowNumber, 1, 1, out.length).setNumberFormat("@").setValues([out]);
}
