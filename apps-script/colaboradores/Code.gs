/***********************
 * CONFIGURACIÓN
 ***********************/
const DEST_SS_ID     = "1uzTsVqWAteN-bHrBJWflOAfzc1bX8BgwmbeCLdnJbtE";
const SHEET_BI       = "Batch Input";
const SHEET_REG      = "Registro";
const SHEET_BANCOS   = "Bancos";                          // Hoja: col A = Clave, col B = Nombre
const FOLDER_ID_DOCS = "1HdLq4SdlpQGX5u6P8NfFnpnnX7WQlD25";

// URL del panel al que se redirige tras procesar la carga.
// IMPORTANTE: debe ser la URL /exec de una implementación publicada,
// nunca la URL /dev (esa solo funciona para el dueño del script).
const REDIRECT_URL = "https://script.google.com/a/macros/masisa.com/s/AKfycbynKNpT6ndZb_DqtkrLF9s5dFf-5yokdMxcV1mJPFnL/exec";

const ESTADOS_REGISTRO = [
  "SOLICITADO",
  "CREADO",
  "RECHAZADO"
];

/***********************
 * ORDEN DE PEGADO DEL USUARIO
 ***********************/
const PASTE_ORDER = [
  "Nombre o Razon Social 1",
  "Correo",
  "Telefono",
  "N° Identificacion Fiscal",
  "Banco",
  "Numero de Cuenta",
  "Moneda Del Pedido",
  "Region",
  "Distrito",
  "Poblacion",
  "Calle",
  "Numero de Casa",
  "Codigo Postal",
  "Observacion"
];

/***********************
 * SOCIEDAD -> ORG COMPRAS
 ***********************/
const SOCIEDAD_ORG_MAP = {
  "TERR": "TCSE",
  "PCL1": "PCL1"
};

/***********************
 * TIPO INGRESO -> CUENTA ASOCIADA
 ***********************/
const CUENTA_ASOCIADA_MAP = {
  "ALUMNO EN PRACTICA": "2185001",
  "COLABORADOR":        "1151001"
};

/***********************
 * BANCOS CHILE -> CLAVE BANCO SAP  (fallback estático)
 ***********************/
const BANK_SAP_MAP = {
  "BANCO DE CHILE":                    "001",
  "BANCO CHILE":                       "001",
  "CHILE":                             "001",
  "BANCO EDWARDS":                     "001",
  "EDWARDS":                           "001",
  "BANCO INTERNACIONAL":               "009",
  "INTERNACIONAL":                     "009",
  "BANCO DEL ESTADO DE CHILE":         "012",
  "BANCO ESTADO":                      "012",
  "BANCOESTADO":                       "012",
  "ESTADO":                            "012",
  "SCOTIABANK CHILE":                  "014",
  "SCOTIABANK":                        "014",
  "BANCO DE CREDITO E INVERSIONES":    "016",
  "BANCO DE CRÉDITO E INVERSIONES":    "016",
  "BCI":                               "016",
  "BANCO BICE":                        "028",
  "BICE":                              "028",
  "HSBC BANK (CHILE)":                 "031",
  "HSBC":                              "031",
  "BANCO SANTANDER-CHILE":             "037",
  "BANCO SANTANDER CHILE":             "037",
  "SANTANDER":                         "037",
  "BANCO ITAÚ CHILE":                  "039",
  "BANCO ITAU CHILE":                  "039",
  "ITAU":                              "039",
  "ITAÚ":                              "039",
  "BANCO SECURITY":                    "049",
  "SECURITY":                          "049",
  "BANCO FALABELLA":                   "051",
  "FALABELLA":                         "051",
  "BANCO RIPLEY":                      "053",
  "RIPLEY":                            "053",
  "BANCO CONSORCIO":                   "055",
  "CONSORCIO":                         "055",
  "BANCO BTG PACTUAL CHILE":           "059",
  "BTG":                               "059",
  "BTG PACTUAL":                       "059",
  "TANNER BANCO DIGITAL":              "062",
  "TANNER":                            "062"
};

/***********************
 * REGIONES CHILE -> CÓDIGO
 ***********************/
const REGION_MAP = {
  "ARICA Y PARINACOTA":                             "15",
  "TARAPACA":                                       "01",
  "TARAPACÁ":                                       "01",
  "ANTOFAGASTA":                                    "02",
  "ATACAMA":                                        "03",
  "COQUIMBO":                                       "04",
  "VALPARAISO":                                     "05",
  "VALPARAÍSO":                                     "05",
  "METROPOLITANA":                                  "13",
  "REGION METROPOLITANA":                           "13",
  "REGIÓN METROPOLITANA":                           "13",
  "REGION METROPOLITANA DE SANTIAGO":               "13",
  "REGIÓN METROPOLITANA DE SANTIAGO":               "13",
  "SANTIAGO":                                       "13",
  "O HIGGINS":                                      "06",
  "OHIGGINS":                                       "06",
  "O'HIGGINS":                                      "06",
  "DEL LIBERTADOR GENERAL BERNARDO O'HIGGINS":      "06",
  "MAULE":                                          "07",
  "BIO BIO":                                        "08",
  "BIOBIO":                                         "08",
  "BIO-BIO":                                        "08",
  "BÍO BÍO":                                        "08",
  "BÍOBÍO":                                         "08",
  "ARAUCANIA":                                      "09",
  "ARAUCANÍA":                                      "09",
  "LA ARAUCANIA":                                   "09",
  "LA ARAUCANÍA":                                   "09",
  "LOS LAGOS":                                      "10",
  "AYSEN":                                          "11",
  "AYSÉN":                                          "11",
  "AISEN":                                          "11",
  "MAGALLANES":                                     "12",
  "MAGALLANES Y DE LA ANTARTICA CHILENA":           "12",
  "MAGALLANES Y DE LA ANTÁRTICA CHILENA":           "12",
  "LOS RIOS":                                       "14",
  "LOS RÍOS":                                       "14",
  "ÑUBLE":                                          "16",
  "NUBLE":                                          "16"
};

const REGION_OPTIONS = [
  "ARICA Y PARINACOTA",
  "TARAPACA",
  "ANTOFAGASTA",
  "ATACAMA",
  "COQUIMBO",
  "VALPARAISO",
  "METROPOLITANA",
  "O'HIGGINS",
  "MAULE",
  "BIO BIO",
  "ARAUCANIA",
  "LOS LAGOS",
  "AYSEN",
  "MAGALLANES",
  "LOS RIOS",
  "ÑUBLE"
];

/***********************
 * PLANTILLA ESTÁTICA BI
 ***********************/
const TEMPLATE_STATIC = {
  "GrupoCuentas":               "PCOR",
  "Tratamiento":                "SR(a).",
  "País":                       "CL",
  "Apartado":                   "",
  "Idioma":                     "ES",
  "Fax":                        "",
  "Comentario":                 "PP",
  "Comentario mail 2":          "",
  "Cliente":                    "",
  "Clave de grupo":             "",
  "Tipo Nif":                   "",
  "Tipo impuesto":              "",
  "Persona fisica":             "",
  "Codigo Fiscal suplementario":"",
  "NIF 3":                      "",
  "N.I.F.":                     "",
  "Ramo":                       "0999",
  "stan. Carrier cd":           "",
  "Clave Banco":                "",
  "Titular Cta":                "",
  "Clave Control bancos":       "",
  "Tipo de Banco":              "",
  "Referencia":                 "",
  "IBAN":                       "",
  "Aut.Domic(flag)":            "",
  "Clave Clasificacion":        "",
  "Grupo Tesoreria":            "PROVRRHH",
  "Grupo Liberacion":           "M900",
  "N° cuenta anterior":         "",
  "N° personal":                "",
  "Código actividad":           "",
  "Clase distribucion":         "",
  "Condición de pago":          "CPP1",
  "Grupo tolerancia":           "",
  "Verificación fra. Dob.(flag)":"X",
  "Vias de pago":               "N",
  "Banco propio":               "",
  "Pago unico(flag)":           "",
  "Telefono responsable":       "",
  "Telefax encargado":          "",
  "Internet responsable":       "",
  "Pais Retencion":             "",
  "Tipo.Ret":                   "",
  "Ind.Ret":                    "",
  "Sujeto":                     "",
  "No.Exenc":                   "",
  "% Exencion":                 "",
  "Fecha Inicio":               "",
  "Fecha Termino":              "",
  "Moneda de pedido":           "CLP",
  "Condición de pago__2":       "CPP1",
  "Incoterms":                  "",
  "Incoterms2":                 "",
  "Grupo esquema":              "01",
  "Vendedor":                   "",
  "Teléfono__2":                "",
  "Verificación fact base (flag)":  "X",
  "Pedido automatico (flag)":       "X",
  "Verificación Fact. Serv. (flag)":"X"
};

/***********************
 * WEBAPP
 ***********************/
function doGet() {
  return HtmlService.createHtmlOutputFromFile("formulario_colaboradores")
    .setTitle("Formulario Colaboradores")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/***********************
 * HELPERS TEXTO
 ***********************/
function cleanText_(v) {
  return String(v == null ? "" : v).trim();
}

function upper_(v) {
  return cleanText_(v).toUpperCase();
}

function keepCase_(v) {
  return cleanText_(v);
}

function normalizeMail_(v) {
  return cleanText_(v);
}

function removeAccents_(str) {
  return String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeTextKey_(v) {
  return removeAccents_(cleanText_(v))
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

function formatBankCode_(code) {
  const c = cleanText_(code).replace(/\D/g, "");
  if (!c) return "";
  return c.padStart(3, "0");
}

function normalizeBankLookupKey_(v) {
  return normalizeTextKey_(v)
    .replace(/^BANCO\s+/, "")
    .replace(/^BCO\.?\s+/, "")
    .replace(/\bBANCO\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function addBankAlias_(mapa, alias, code) {
  const code3 = formatBankCode_(code);
  if (!code3) return;

  const key = normalizeTextKey_(alias);
  const lookupKey = normalizeBankLookupKey_(alias);

  if (key) mapa[key] = code3;
  if (lookupKey) mapa[lookupKey] = code3;
  mapa[code3] = code3;

  const numeric = String(Number(code3));
  if (numeric && numeric !== "NaN") mapa[numeric] = code3;
}

/***********************
 * HELPERS NEGOCIO
 ***********************/
function getOrgComprasBySociedad_(sociedad) {
  const soc = upper_(sociedad);
  const org = SOCIEDAD_ORG_MAP[soc];
  if (!org) throw new Error("Sociedad inválida. Debe ser TERR o PCL1.");
  return org;
}

function getCuentaAsociadaByTipoIngreso_(tipoIngreso) {
  const tipo = normalizeTextKey_(tipoIngreso);
  const cuenta = CUENTA_ASOCIADA_MAP[tipo];
  if (!cuenta) throw new Error("Tipo de ingreso inválido. Debe ser Alumno en práctica o Colaborador.");
  return cuenta;
}

function isAlumnoPractica_(tipoIngreso) {
  return normalizeTextKey_(tipoIngreso) === "ALUMNO EN PRACTICA";
}

/**
 * Busca clave SAP del banco:
 * 1) Mapa dinámico leído desde hoja "Bancos"
 * 2) Fallback al mapa estático BANK_SAP_MAP
 */
function getBankSapCode_(bankName, bancosMapaDinamico) {
  const raw = cleanText_(bankName);
  const key = normalizeTextKey_(raw);
  const lookupKey = normalizeBankLookupKey_(raw);
  const code3 = formatBankCode_(raw);
  const mapa = bancosMapaDinamico || {};

  if (code3 && mapa[code3]) return formatBankCode_(mapa[code3]);
  if (key && mapa[key]) return formatBankCode_(mapa[key]);
  if (lookupKey && mapa[lookupKey]) return formatBankCode_(mapa[lookupKey]);

  const matchKey = Object.keys(mapa).find(k => {
    const kNorm = normalizeTextKey_(k);
    const kLookup = normalizeBankLookupKey_(k);
    if (!lookupKey || /^\d+$/.test(kNorm)) return false;
    return kLookup === lookupKey || kLookup.includes(lookupKey) || lookupKey.includes(kLookup);
  });
  if (matchKey) return formatBankCode_(mapa[matchKey]);

  const staticCode = BANK_SAP_MAP[key] || BANK_SAP_MAP[lookupKey];
  if (staticCode) return formatBankCode_(staticCode);

  const staticMatchKey = Object.keys(BANK_SAP_MAP).find(k => {
    const kLookup = normalizeBankLookupKey_(k);
    return lookupKey && (kLookup === lookupKey || kLookup.includes(lookupKey) || lookupKey.includes(kLookup));
  });
  if (staticMatchKey) return formatBankCode_(BANK_SAP_MAP[staticMatchKey]);

  throw new Error(`Banco no válido: "${bankName}". Seleccione un banco del listado.`);
}

function normalizeRegionCode_(regionName) {
  const code = REGION_MAP[normalizeTextKey_(regionName)];
  if (!code) throw new Error(`Región no válida: "${regionName}". Ejemplo: BIO BIO → 08.`);
  return String(code).padStart(2, "0");
}

function normalizeCurrency_(value) {
  const raw = cleanText_(value);
  const key = normalizeTextKey_(raw)
    .replace(/\./g, "")
    .replace(/\$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const clpAliases = [
    "CLP", "PESO", "PESOS", "PESO CHILENO", "PESOS CHILENOS",
    "MONEDA LOCAL", "MONEDA NACIONAL", "CHILE", "CHILENO", "CHILENOS"
  ];

  const usdAliases = [
    "USD", "US", "US DOLLAR", "US DOLLARS", "DOLLAR", "DOLLARS",
    "DOLAR", "DOLARES", "DOLAR AMERICANO", "DOLARES AMERICANOS",
    "DOLAR EEUU", "DOLAR EE UU", "DOLAR ESTADOUNIDENSE", "DOLARES ESTADOUNIDENSES"
  ];

  if (clpAliases.includes(key)) return "CLP";
  if (usdAliases.includes(key)) return "USD";

  throw new Error(`Moneda del pedido inválida: "${raw}". Solo se permite CLP o USD. Puede escribir pesos/CLP o dólares/USD.`);
}

function getHeadersAndMap_(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(cleanText_);
  const map = {};
  headers.forEach((h, i) => {
    if (!map[h]) map[h] = [];
    map[h].push(i);
  });
  return { headers, map };
}

function setByKey_(row, map, key, value) {
  let headerName = key;
  let occ = 0;
  if (key.includes("__")) {
    const parts = key.split("__");
    headerName = parts[0];
    occ = (parseInt(parts[1], 10) || 1) - 1;
  }
  const indexes = map[headerName];
  if (!indexes || indexes.length <= occ) return;
  row[indexes[occ]] = String(value == null ? "" : value);
}

function getFirstHeaderIndex_(headers, aliases) {
  const normalizedHeaders = headers.map(h => cleanText_(h).toUpperCase());
  for (const alias of aliases) {
    const idx = normalizedHeaders.indexOf(cleanText_(alias).toUpperCase());
    if (idx !== -1) return idx;
  }
  return -1;
}

function getFechaSolicitudTexto_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");
}

function getOrCreateFolder_(parentFolder, folderName) {
  const it = parentFolder.getFoldersByName(folderName);
  if (it.hasNext()) return it.next();
  return parentFolder.createFolder(folderName);
}

/***********************
 * LEER BANCOS DESDE HOJA
 * Columna A = Clave SAP | Columna B = Nombre visible
 * Fila 1 = encabezados (se omite)
 ***********************/
function getBancosDesdeHoja_() {
  try {
    const ss = SpreadsheetApp.openById(DEST_SS_ID);
    const sh = ss.getSheetByName(SHEET_BANCOS);
    if (!sh) return { nombres: [], mapa: {} };

    const lastRow = sh.getLastRow();
    if (lastRow < 2) return { nombres: [], mapa: {} };

    const data    = sh.getRange(2, 1, lastRow - 1, 2).getValues();
    const nombres = [];
    const mapa    = {};   // alias normalizado / código -> clave SAP de 3 dígitos

    data.forEach(([clave, nombre]) => {
      const c = formatBankCode_(clave);
      const n = cleanText_(nombre);
      if (c && n) {
        nombres.push(n);
        addBankAlias_(mapa, n, c);
      }
    });

    return { nombres, mapa };
  } catch (e) {
    Logger.log("getBancosDesdeHoja_ error: " + e.message);
    return { nombres: [], mapa: {} };
  }
}

function getBancosFallback_() {
  const nombres = [];
  const mapa = {};
  const seenCodeName = {};

  Object.keys(BANK_SAP_MAP).forEach(nombre => {
    const code3 = formatBankCode_(BANK_SAP_MAP[nombre]);
    addBankAlias_(mapa, nombre, code3);

    // Evita llenar el combo con todos los alias cortos; conserva nombres legibles.
    if (!seenCodeName[code3] && nombre.length > 4) {
      nombres.push(nombre);
      seenCodeName[code3] = true;
    }
  });

  return { nombres, mapa };
}

/***********************
 * ESTRUCTURA HOJA REGISTRO
 ***********************/
function actualizarEstructuraRegistroColaboradores() {
  const ss = SpreadsheetApp.openById(DEST_SS_ID);
  const sh = ss.getSheetByName(SHEET_REG);
  if (!sh) throw new Error(`No existe la hoja "${SHEET_REG}".`);

  const headersDeseados = [
    "Codigo SAP",
    "Fecha de Solicitud",
    "Estado",
    "Solicitante",
    "Tipo Ingreso",
    "Sociedad",
    "Organización de Compras",
    "Nombre o Razon Social 1",
    "Correo",
    "Telefono",
    "N° Identificacion Fiscal",
    "Clave Banco",
    "Numero de Cuenta",
    "Moneda Del Pedido",
    "Region",
    "Distrito",
    "Poblacion",
    "Calle",
    "Numero de Casa",
    "Codigo Postal",
    "Documento Bancario",
    "Observacion"
  ];

  const totalColsDeseadas = headersDeseados.length;
  const currentLastCol    = sh.getLastColumn();

  if (currentLastCol < totalColsDeseadas) {
    sh.insertColumnsAfter(currentLastCol, totalColsDeseadas - currentLastCol);
  }

  sh.getRange(1, 1, 1, totalColsDeseadas).setValues([headersDeseados]);

  sh.getRange(1, 1, 1, totalColsDeseadas)
    .setFontWeight("bold")
    .setBackground("#1B5E20")
    .setFontColor("#FFFFFF")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");

  sh.setFrozenRows(1);

  const widths = [120,150,160,180,140,100,170,220,220,120,170,180,150,130,120,140,140,180,120,120,240,200];
  widths.forEach((w, i) => sh.setColumnWidth(i + 1, w));

  const estadoCol  = 3;
  const maxRows    = Math.max(sh.getMaxRows(), 1000);
  const estadoRange = sh.getRange(2, estadoCol, maxRows - 1, 1);

  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(ESTADOS_REGISTRO, true)
    .setAllowInvalid(false)
    .build();
  estadoRange.setDataValidation(rule);

  const existingRules  = sh.getConditionalFormatRules() || [];
  const rulesNoEstado  = existingRules.filter(r => {
    const ranges = r.getRanges() || [];
    return !ranges.some(range => range.getColumn() === estadoCol);
  });

  const estadoFullRange = sh.getRange(2, estadoCol, maxRows - 1, 1);

  const ruleSolicitando = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("SOLICITADO")
    .setBackground("#8ED4F5").setFontColor("#FFFFFF")
    .setRanges([estadoFullRange]).build();

  const ruleCreacion = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("CREADO")
    .setBackground("#D9EAD3").setFontColor("#0B5394")
    .setRanges([estadoFullRange]).build();

  const ruleCreado = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("RECHAZADO")
    .setBackground("#F01D1D").setFontColor("#FFFFFF")
    .setRanges([estadoFullRange]).build();

  sh.setConditionalFormatRules([...rulesNoEstado, ruleSolicitando, ruleCreacion, ruleCreado]);
}

/***********************
 * VALIDACIÓN RUT
 ***********************/
function normalizarRut_(rut) {
  let v = String(rut || "").trim().toUpperCase();
  v = v.replace(/\./g, "").replace(/\s+/g, "").replace(/[^0-9K-]/g, "");

  const parts = v.split("-");
  let body = (parts[0] || "").replace(/[^0-9]/g, "");
  let dv   = (parts[1] || "").replace(/[^0-9K]/g, "");

  if (!dv && body.length >= 2) {
    dv   = body.slice(-1);
    body = body.slice(0, -1);
  }

  body = body.slice(0, 8);
  dv   = dv.slice(0, 1);

  return dv ? `${body}-${dv}` : body;
}

function rutValidoDV_(rutNorm) {
  if (!/^\d{7,8}-[\dK]$/.test(rutNorm)) return false;

  const [cuerpo, dv] = rutNorm.split("-");
  let suma = 0;
  let m    = 2;

  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo[i], 10) * m;
    m = (m === 7) ? 2 : m + 1;
  }

  const resto  = 11 - (suma % 11);
  const dvCalc = (resto === 11) ? "0" : (resto === 10) ? "K" : String(resto);

  return dvCalc === dv;
}

function rutCuerpoSinDv_(rutNorm) {
  return String(rutNorm || "").split("-")[0] || "";
}

function normalizeIdent_(v) {
  return normalizarRut_(v);
}

/***********************
 * DUPLICADOS
 ***********************/
function addRutToSourceMap_(sourceMap, rutValue, sourceName) {
  const rut = normalizarRut_(rutValue);
  if (!rut) return;
  if (!sourceMap[rut]) sourceMap[rut] = [];
  if (sourceMap[rut].indexOf(sourceName) === -1) sourceMap[rut].push(sourceName);
}

function getRutSourceMapFromSheet_(sourceMap, sheetName, sourceName, aliases, fixedColumnIndex) {
  const ss = SpreadsheetApp.openById(DEST_SS_ID);
  const sh = ss.getSheetByName(sheetName);
  if (!sh) return;

  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return;

  let idx = -1;

  if (fixedColumnIndex != null) {
    idx = Number(fixedColumnIndex) - 1;
  } else {
    const headers = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(cleanText_);
    idx = getFirstHeaderIndex_(headers, aliases || []);
  }

  if (idx < 0 || idx >= lastCol) return;

  const values = sh.getRange(2, idx + 1, lastRow - 1, 1).getValues().flat();
  values.forEach(v => addRutToSourceMap_(sourceMap, v, sourceName));
}

function getExistingRutSourceMap_() {
  const sourceMap = {};

  getRutSourceMapFromSheet_(sourceMap, SHEET_BI, "Batch Input", [
    "N° ID Fiscal",
    "N° Identificacion Fiscal",
    "N° Identificación Fiscal",
    "RUT",
    "Rut"
  ], null);

  getRutSourceMapFromSheet_(sourceMap, SHEET_REG, "Registro", [
    "N° Identificacion Fiscal",
    "N° Identificación Fiscal",
    "Nº Identificacion Fiscal",
    "Nº Identificación Fiscal",
    "RUT",
    "Rut"
  ], null);

  // ProveedoresCreados: columna C = "Nº ident.fis.1".
  getRutSourceMapFromSheet_(sourceMap, "ProveedoresCreados", "ProveedoresCreados", [], 3);

  return sourceMap;
}



/***********************
 * DRIVE
 * Colaboradores / RUT / Registrado /
 *                      / Modificado /
 ***********************/
function subirDocumentoBancarioPorProveedor_(fileObj, rutNorm) {
  // Si no se adjuntó archivo, retorna vacío sin error
  if (!fileObj || !fileObj.bytes) {
    return { url: "", fileId: "", folderId: "", folderName: "" };
  }

  const rootFolder = DriveApp.getFolderById(FOLDER_ID_DOCS);
  const safeRut    = String(rutNorm || "SIN_RUT")
    .trim()
    .replace(/[\\/:*?"<>|#%&{}$!'@+=`~]/g, "_")
    .replace(/\s+/g, "_");

  const rutFolder        = getOrCreateFolder_(rootFolder, safeRut);
  const registradoFolder = getOrCreateFolder_(rutFolder, "Registrado");
  getOrCreateFolder_(rutFolder, "Modificado");

  const bytes    = Utilities.base64Decode(fileObj.bytes);
  const blob     = Utilities.newBlob(bytes, fileObj.mimeType, fileObj.name);
  const ts       = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd_HHmmss");
  const fileName = `Documento_Bancario_${safeRut}_${ts}_${fileObj.name}`;
  const file     = registradoFolder.createFile(blob).setName(fileName);

  return {
    url:        file.getUrl(),
    fileId:     file.getId(),
    folderId:   rutFolder.getId(),
    folderName: safeRut
  };
}

/***********************
 * DATOS PARA HTML
 * bancos: solo nombres (clave NO se expone al cliente)
 ***********************/
function getTemplateInfo() {
  const bancosData = getBancosDesdeHoja_();
  const fallback   = getBancosFallback_();

  // Si la hoja está vacía, usa el fallback estático.
  const bancosFinal = bancosData.nombres.length > 0 ? bancosData : fallback;

  return {
    pasteOrder:    PASTE_ORDER,
    tiposIngreso:  ["Alumno en práctica", "Colaborador"],
    sociedades:    ["TERR", "PCL1"],
    bancos:        bancosFinal.nombres,     // nombres visibles → combobox
    bancosClaves:  bancosFinal.mapa,        // alias/código normalizado → clave SAP 3 dígitos para preselección visual
    regiones:      REGION_OPTIONS,
    monedas:       ["CLP", "USD"],
    redirectUrl:   REDIRECT_URL
  };
}

/***********************
 * PARSEAR FILA PEGADA
 * bancosMapaDinamico: { NOMBRE_NORMALIZADO -> clave_SAP }
 ***********************/
function parsePastedRow_(rawRow, existingRutSourceMap, uploadRutSet, bancosMapaDinamico) {
  const r = Array.isArray(rawRow) ? rawRow : [];

  const data = {
    nombre1:      cleanText_(r[0]),
    correo:       cleanText_(r[1]),
    telefono:     cleanText_(r[2]),
    identFiscal:  cleanText_(r[3]),
    bancoNombre:  cleanText_(r[4]),
    numeroCuenta: cleanText_(r[5]),
    moneda:       cleanText_(r[6]),
    region:       cleanText_(r[7]),
    distrito:     cleanText_(r[8]),
    poblacion:    cleanText_(r[9]),
    calle:        cleanText_(r[10]),
    numeroCasa:   cleanText_(r[11]),
    codigoPostal: cleanText_(r[12]),  // opcional
    observacion:  cleanText_(r[13]),  // opcional
    nombre2:      ""
  };

  const isEmpty = !data.nombre1 && !data.correo && !data.telefono && !data.identFiscal && !data.bancoNombre &&
                  !data.numeroCuenta && !data.moneda && !data.region && !data.distrito && !data.poblacion &&
                  !data.calle && !data.numeroCasa && !data.codigoPostal && !data.observacion;
  if (isEmpty) return null;

  const requiredFields = [
    ["Nombre o Razon Social 1", data.nombre1],
    ["Correo", data.correo],
    ["Telefono", data.telefono],
    ["N° Identificacion Fiscal", data.identFiscal],
    ["Banco", data.bancoNombre],
    ["Numero de Cuenta", data.numeroCuenta],
    ["Moneda Del Pedido", data.moneda],
    ["Region", data.region],
    ["Distrito", data.distrito],
    ["Poblacion", data.poblacion],
    ["Calle", data.calle],
    ["Numero de Casa", data.numeroCasa]
  ];

  const rowLabel = data.nombre1 || data.identFiscal || "una de las filas";
  const missing = requiredFields.filter(([_, value]) => !cleanText_(value)).map(([label]) => label);
  if (missing.length) {
    throw new Error(`Faltan campos obligatorios para "${rowLabel}": ${missing.join(", ")}. Código Postal, Observación y Documento Bancario son opcionales.`);
  }

  data.moneda = normalizeCurrency_(data.moneda);

  const rutNorm = normalizarRut_(data.identFiscal);
  if (!rutValidoDV_(rutNorm)) {
    throw new Error(`RUT inválido para "${data.nombre1}". Use formato chileno válido, ej: 12345678-9.`);
  }
  data.identFiscal = rutNorm;

  if (existingRutSourceMap && existingRutSourceMap[rutNorm]) {
    throw new Error(`El RUT ${rutNorm} ya existe. Porfavor comunicarse con Codificacion Corporativa para ver el estado del Proveedor`);
  }
  if (uploadRutSet && uploadRutSet.has(rutNorm)) {
    throw new Error(`El RUT ${rutNorm} está duplicado en la misma carga.`);
  }
  if (uploadRutSet) uploadRutSet.add(rutNorm);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.correo)) {
    throw new Error(`Correo inválido para "${data.nombre1}".`);
  }

  data.paisBanco = "CL";

  // Obtiene clave SAP: primero mapa dinámico, luego fallback estático.
  data.claveBanco   = getBankSapCode_(data.bancoNombre, bancosMapaDinamico || {});
  data.regionCodigo = normalizeRegionCode_(data.region);

  return data;
}

/***********************
 * BATCH INPUT
 ***********************/
function buildBatchRow_(data, docUrl, sociedad, tipoIngreso, map, totalCols) {
  const row = new Array(totalCols).fill("");

  Object.keys(TEMPLATE_STATIC).forEach(key => {
    setByKey_(row, map, key, TEMPLATE_STATIC[key]);
  });

  const orgCompras     = getOrgComprasBySociedad_(sociedad);
  const rutSinDv       = rutCuerpoSinDv_(data.identFiscal);
  const cuentaAsociada = getCuentaAsociadaByTipoIngreso_(tipoIngreso);
  const esAlumno       = isAlumnoPractica_(tipoIngreso);

  setByKey_(row, map, "Sociedad",               upper_(sociedad));
  setByKey_(row, map, "Organización de compras", upper_(orgCompras));

  setByKey_(row, map, "Nombre o Razón Social 1", upper_(data.nombre1));
  setByKey_(row, map, "Nombre o Razón Social 2", upper_(data.nombre2 || ""));

  setByKey_(row, map, "Concepto de busqueda 1", rutSinDv);
  setByKey_(row, map, "Concepto de busqueda 2", upper_(data.nombre1));

  setByKey_(row, map, "Calle",          upper_(data.calle));
  setByKey_(row, map, "Numero",         upper_(data.numeroCasa));
  setByKey_(row, map, "Distrito",       upper_(data.distrito));
  setByKey_(row, map, "Población",      upper_(data.poblacion));
  setByKey_(row, map, "Código postal",  upper_(data.codigoPostal));
  setByKey_(row, map, "Región",         data.regionCodigo);

  setByKey_(row, map, "Teléfono",            keepCase_(data.telefono));
  setByKey_(row, map, "Correo Electronico",  normalizeMail_(data.correo));
  setByKey_(row, map, "Correo Electrónico 2",normalizeMail_(data.correo));

  setByKey_(row, map, "N° ID Fiscal", normalizeIdent_(data.identFiscal));
  setByKey_(row, map, "N° personal",  rutSinDv);

  setByKey_(row, map, "País Banco",      data.paisBanco);
  setByKey_(row, map, "Clave Banco",     keepCase_(data.claveBanco));
  setByKey_(row, map, "Cuenta Bancaria", keepCase_(data.numeroCuenta));
  setByKey_(row, map, "Cuenta Asociada", cuentaAsociada);

  if (cleanText_(data.moneda))     setByKey_(row, map, "Moneda de pedido", upper_(data.moneda));
  if (cleanText_(data.observacion)) setByKey_(row, map, "Observacion",     upper_(data.observacion));

  if (esAlumno) {
    setByKey_(row, map, "Pais Retencion", "056");
    setByKey_(row, map, "Tipo.Ret",       "Q1");
    setByKey_(row, map, "Ind.Ret",        "B2");
    setByKey_(row, map, "Sujeto",         "X");
  } else {
    setByKey_(row, map, "Pais Retencion", "");
    setByKey_(row, map, "Tipo.Ret",       "");
    setByKey_(row, map, "Ind.Ret",        "");
    setByKey_(row, map, "Sujeto",         "");
  }

  setByKey_(row, map, "Documento Bancario", keepCase_(docUrl || ""));
  setByKey_(row, map, "IBAN",               "");
  setByKey_(row, map, "Referencia",         "");

  return row.map(v => String(v ?? ""));
}

/***********************
 * REGISTRO
 ***********************/
function buildRegistroRow_(data, docUrl, solicitante, tipoIngreso, sociedad, orgCompras) {
  return [
    "",                             // Codigo SAP
    getFechaSolicitudTexto_(),      // Fecha de Solicitud
    "SOLICITADO",              // Estado
    upper_(solicitante),            // Solicitante
    upper_(tipoIngreso),            // Tipo Ingreso
    upper_(sociedad),               // Sociedad
    upper_(orgCompras),             // Organización de Compras
    upper_(data.nombre1),           // Nombre o Razon Social 1
    keepCase_(data.correo),         // Correo
    keepCase_(data.telefono),       // Telefono
    upper_(data.identFiscal),       // N° Identificacion Fiscal
    keepCase_(data.claveBanco),       // Clave Banco SAP
    keepCase_(data.numeroCuenta),   // Numero de Cuenta
    upper_(data.moneda),            // Moneda Del Pedido
    upper_(data.region),            // Region
    upper_(data.distrito),          // Distrito
    upper_(data.poblacion),         // Poblacion
    upper_(data.calle),             // Calle
    upper_(data.numeroCasa),        // Numero de Casa
    upper_(data.codigoPostal),      // Codigo Postal
    keepCase_(docUrl || ""),        // Documento Bancario (puede estar vacío)
    upper_(data.observacion)        // Observacion
  ];
}

/***********************
 * PROCESAR CARGA MASIVA
 ***********************/
function procesarMasivoColaboradores(payload) {
  actualizarEstructuraRegistroColaboradores();

  const solicitante = cleanText_(payload && payload.solicitante);
  const tipoIngreso = cleanText_(payload && payload.tipoIngreso);
  const sociedad    = cleanText_(payload && payload.sociedad);
  const rows        = Array.isArray(payload && payload.rows) ? payload.rows : [];

  if (!solicitante) throw new Error("Debe ingresar solicitante.");
  if (!tipoIngreso) throw new Error("Debe seleccionar si es alumno en práctica o colaborador.");
  if (!sociedad)    throw new Error("Debe seleccionar sociedad.");
  if (!rows.length) throw new Error("No se recibieron filas para procesar.");

  // Lee bancos desde hoja (clave NO viaja al cliente)
  const bancosData        = getBancosDesdeHoja_();
  const bancosMapaDinamico = bancosData.mapa;

  const existingRutSourceMap = getExistingRutSourceMap_();
  const uploadRutSet   = new Set();
  const orgCompras     = getOrgComprasBySociedad_(sociedad);

  const ss    = SpreadsheetApp.openById(DEST_SS_ID);
  const shBI  = ss.getSheetByName(SHEET_BI);
  const shReg = ss.getSheetByName(SHEET_REG);

  if (!shBI)  throw new Error(`No existe la hoja "${SHEET_BI}".`);
  if (!shReg) throw new Error(`No existe la hoja "${SHEET_REG}".`);

  const { headers: biHeaders, map: biMap } = getHeadersAndMap_(shBI);
  const totalColsBI = biHeaders.length;


  const batchRows    = [];
  const registroRows = [];

  rows.forEach((item) => {
    const rawValues = Array.isArray(item.values) ? item.values : [];
    // fileObj puede ser null si el usuario no adjuntó archivo (campo opcional)
    const data = parsePastedRow_(rawValues, existingRutSourceMap, uploadRutSet, bancosMapaDinamico);
    if (!data) return;

    const fileObj = item.fileObj || null;
    const upload  = subirDocumentoBancarioPorProveedor_(fileObj, data.identFiscal);
    const docUrl  = upload.url;

    batchRows.push(buildBatchRow_(data, docUrl, sociedad, tipoIngreso, biMap, totalColsBI));
    registroRows.push(buildRegistroRow_(data, docUrl, solicitante, tipoIngreso, sociedad, orgCompras));
  });

  if (!batchRows.length) throw new Error("No se encontraron filas válidas para cargar.");

  shBI.getRange(shBI.getLastRow() + 1, 1, batchRows.length, totalColsBI)
      .setNumberFormat("@").setValues(batchRows);

  shReg.getRange(shReg.getLastRow() + 1, 1, registroRows.length, registroRows[0].length)
       .setNumberFormat("@").setValues(registroRows);

  return {
    success: true,
    message: `✅ Se cargaron ${batchRows.length} fila(s) correctamente en Batch Input y Registro.`,
    redirectUrl: REDIRECT_URL
  };
}
