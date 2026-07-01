const DEST_SS_ID = "1QH4y2H5b0wZ-03Jn7GuSionNKFJI-83D_DSSnj95SlU";
const SHEET_REG = "Registro";
const SHEET_BI = "Batch Input";
const SHEET_BANCOS = "Bancos";
const SHEET_PROV_CREADOS = "ProveedoresCreados";
const SHEET_RUT_ENVIADO = "Rut Enviado";

const ROOT_PROVIDER_FOLDER_ID = "1rPDEn_0_13ym8Z3-svqPtrknYCkGCsVp";
const BI_CONDICION_PAGO_COLUMN = "AY";

const REDIRECT_URL = "https://script.google.com/a/macros/masisa.com/s/AKfycbyFgyB4dQLsVm4NYKkj1lacls8DMCBAUqOEJjgI9JAOJWyBjqxZZjf8x3AJ60F9KkXN/exec";

const ORGS_POR_SOCIEDAD = {
  TERR: ["TCSM", "TCSF", "TCSE", "TCMR", "TCMF", "TCMA", "TCIN", "TCCC"],
  PCL1: ["PCL1"]
};

const ESTATICOS_SAP = {
  condicionPago: "CPP1",
  verifFactBasePedido: "X",
  pedidoAutomatico: "X",
  verifFactServ: "X",
  grupoLiberacion: "M271",
  grupoTesoreria: "PROVNAC",
  cuentaAsociada: "2131001",
  verificacionFraDob: "X",
  idioma: "ES",
  pais: "CL",
  grupoCuentas: "PCOR",
  grupoEsquema: "01",
  ramo: "0999"
};

const ESTADOS_REGISTRO = [
  "En analisis",
  "SOLICITANDO V°B",
  "EN CREACION",
  "CREADO",
  "Pendiente Licitaciones"
];

/***********************
 * WEBAPP
 ***********************/
function doGet() {
  return HtmlService.createHtmlOutputFromFile("formulario")
    .setTitle("Solicitud de creación proveedor nacional")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/***********************
 * HELPERS
 ***********************/
function getSS_() {
  return SpreadsheetApp.openById(DEST_SS_ID);
}

function getSheet_(name) {
  const sh = getSS_().getSheetByName(name);
  if (!sh) throw new Error("No existe la hoja: " + name);
  return sh;
}

function normalizeHeader_(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function getHeaderMap_(sheet, headerRow) {
  headerRow = headerRow || 1;
  const headers = sheet.getRange(headerRow, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  const map = {};
  headers.forEach((header, index) => {
    const normalized = normalizeHeader_(header);
    if (normalized) map[normalized] = index;
  });
  return map;
}

function setByHeader_(row, headerMap, candidates, value) {
  const names = Array.isArray(candidates) ? candidates : [candidates];
  for (let i = 0; i < names.length; i++) {
    const key = normalizeHeader_(names[i]);
    if (Object.prototype.hasOwnProperty.call(headerMap, key)) {
      row[headerMap[key]] = value == null ? "" : String(value);
      return true;
    }
  }
  return false;
}

function upperIfString_(value) {
  return typeof value === "string" ? value.toUpperCase() : value;
}

function columnLetterToZeroBasedIndex_(columnLetter) {
  return String(columnLetter || "")
    .toUpperCase()
    .split("")
    .reduce((total, char) => total * 26 + char.charCodeAt(0) - 64, 0) - 1;
}

function forceBatchInputStaticValues_(row) {
  const condicionPagoIndex = columnLetterToZeroBasedIndex_(BI_CONDICION_PAGO_COLUMN);
  if (condicionPagoIndex >= 0 && condicionPagoIndex < row.length) {
    row[condicionPagoIndex] = ESTATICOS_SAP.condicionPago;
  }
}

function forceHeadersIfNeeded_(sheetName, headers) {
  const sh = getSheet_(sheetName);
  const current = sh.getRange(1, 1, 1, headers.length).getDisplayValues()[0];
  const same = headers.every((h, i) => String(current[i] || "").trim() === h);
  if (!same) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
}

function getRegistroHeaders_() {
  return [
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
    "Clave Banco",
    "Numero de Cuenta",
    "Tipo de Cuenta",
    "Moneda Del Pedido",
    "Referencia",
    "Documento Bancario",
    "IBAN",
    "Observacion",
    "Pregunta1",
    "Pregunta2",
    "Pregunta3"
  ];
}

/***********************
 * SETUP OPCIONAL
 ***********************/
function crearEncabezadoRegistro() {
  const sh = getSheet_(SHEET_REG);
  const headers = getRegistroHeaders_();
  sh.getRange(1, 1, 1, headers.length).setValues([headers]);
}

function crearEncabezadoRutEnviado() {
  const sh = getSheet_(SHEET_RUT_ENVIADO);
  sh.getRange(1, 1, 1, 2).setValues([["Rut", "Razon Social"]]);
}

/***********************
 * RUT
 ***********************/
function normalizarRut_(rut) {
  let value = String(rut || "").trim().toUpperCase();
  value = value.replace(/\./g, "").replace(/\s+/g, "").replace(/[^0-9K-]/g, "");
  const parts = value.split("-");
  const body = (parts[0] || "").replace(/[^0-9]/g, "").slice(0, 8);
  const dv = (parts[1] || "").replace(/[^0-9K]/g, "").slice(0, 1);

  if (dv) return `${body}-${dv}`;
  if (body.length >= 8) return `${body.slice(0, -1)}-${body.slice(-1)}`;
  return body;
}

function rutValidoDV_(rutNorm) {
  if (!/^\d{7,8}-[\dK]$/.test(rutNorm)) return false;

  const [cuerpo, dv] = rutNorm.split("-");
  let suma = 0;
  let multiplicador = 2;

  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo[i], 10) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }

  const resto = 11 - (suma % 11);
  const dvCalc = resto === 11 ? "0" : resto === 10 ? "K" : String(resto);
  return dvCalc === dv;
}

function rutSinDv_(rut) {
  const rutNorm = normalizarRut_(rut);
  return rutNorm.includes("-") ? rutNorm.split("-")[0] : rutNorm;
}

function onlyDigits_(value) {
  return String(value || "").replace(/\D/g, "");
}

function normalizarClaveBanco_(value) {
  const text = String(value || "").trim();

  // Mantener Vale Vista y otros códigos alfanuméricos: MP-02, MP-04, etc.
  if (!/^\d+$/.test(text)) return text;

  // Si el banco viene como unidad: 1, 2, 9 => 01, 02, 09.
  return text.length === 1 ? "0" + text : text;
}

function isValidPhone_(value) {
  const digits = onlyDigits_(value);
  return digits.length >= 8 && digits.length <= 15;
}

function isValidEmailStrict_(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function isValidBankAccount_(value) {
  return /^[A-Z0-9-]{4,34}$/i.test(String(value || "").trim());
}

function isValidSwift_(value) {
  return /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/i.test(String(value || "").trim());
}

function isValidIbanOptional_(value) {
  const text = String(value || "").trim();
  return !text || /^[A-Z]{2}[0-9A-Z]{13,32}$/i.test(text);
}

/***********************
 * OPCIONES FORMULARIO
 ***********************/
function getOpcionesFormulario() {
  return {
    organizacionesPorSociedad: ORGS_POR_SOCIEDAD,
    bancosChile: getBancosChile_(),
    redirectUrl: REDIRECT_URL
  };
}

function getBancosChile_() {
  const sh = getSheet_(SHEET_BANCOS);
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return [];

  const values = sh.getRange(2, 1, lastRow - 1, 2).getDisplayValues();

  return values
    .filter(row => String(row[0] || "").trim() && String(row[1] || "").trim())
    .map(row => ({
      codigo: String(row[0]).trim(),
      nombre: String(row[1]).trim()
    }));
}

/***********************
 * VALIDAR EXISTENCIA RUT
 ***********************/
function consultarRutProveedor(rut) {
  const rutNorm = normalizarRut_(rut);
  if (!rutNorm) return { existe: false, tipo: "NO_EXISTE", rut: "" };

  const ss = getSS_();

  const shPC = ss.getSheetByName(SHEET_PROV_CREADOS);
  if (shPC && shPC.getLastRow() >= 2) {
    const mapPC = getHeaderMap_(shPC, 1);
    const idxRut = mapPC[normalizeHeader_("Nº ident.fis.1")];
    const idxAcreedor = mapPC[normalizeHeader_("Acreedor")];

    if (idxRut !== undefined) {
      const values = shPC.getRange(2, 1, shPC.getLastRow() - 1, shPC.getLastColumn()).getDisplayValues();

      for (let i = 0; i < values.length; i++) {
        if (normalizarRut_(values[i][idxRut]) === rutNorm) {
          return {
            existe: true,
            tipo: "PROVEEDOR_CREADO",
            mensaje: "El proveedor ya existe.",
            rut: rutNorm,
            acreedor: idxAcreedor !== undefined ? String(values[i][idxAcreedor] || "").trim() : ""
          };
        }
      }
    }
  }

  const shReg = ss.getSheetByName(SHEET_REG);
  if (shReg && shReg.getLastRow() >= 2) {
    const mapReg = getHeaderMap_(shReg, 1);
    const idxRut = mapReg[normalizeHeader_("N° Identificacion Fiscal")];
    const idxCodigoSap = mapReg[normalizeHeader_("Codigo SAP")];

    if (idxRut !== undefined) {
      const values = shReg.getRange(2, 1, shReg.getLastRow() - 1, shReg.getLastColumn()).getDisplayValues();

      for (let i = 0; i < values.length; i++) {
        if (normalizarRut_(values[i][idxRut]) === rutNorm) {
          const codigoSap = idxCodigoSap !== undefined ? String(values[i][idxCodigoSap] || "").trim() : "";

          if (codigoSap) {
            return {
              existe: true,
              tipo: "REGISTRO_CON_CODIGO_SAP",
              mensaje: "El proveedor ya tiene Código SAP.",
              rut: rutNorm,
              codigoSap
            };
          }

          return {
            existe: true,
            tipo: "REGISTRO_SIN_CODIGO_SAP",
            mensaje: "El proveedor ya se ha solicitado.",
            rut: rutNorm
          };
        }
      }
    }
  }

  const shBI = ss.getSheetByName(SHEET_BI);
  if (shBI && shBI.getLastRow() >= 2) {
    const mapBI = getHeaderMap_(shBI, 1);
    const idxBI = mapBI[normalizeHeader_("N° ID Fiscal")];

    if (idxBI !== undefined) {
      const valuesBI = shBI.getRange(2, idxBI + 1, shBI.getLastRow() - 1, 1).getDisplayValues();
      const foundBI = valuesBI.some(row => normalizarRut_(row[0]) === rutNorm);

      if (foundBI) {
        return {
          existe: true,
          tipo: "BATCH_INPUT",
          mensaje: "El proveedor ya se encuentra en proceso de creación.",
          rut: rutNorm
        };
      }
    }
  }

  return {
    existe: false,
    tipo: "NO_EXISTE",
    rut: rutNorm
  };
}

function existeRutEnBatchOProveedores(rut) {
  return consultarRutProveedor(rut).existe;
}

/***********************
 * DRIVE - CARPETAS POR RUT
 ***********************/
function getOrCreateChildFolder_(parentFolder, folderName) {
  const folders = parentFolder.getFoldersByName(folderName);
  if (folders.hasNext()) return folders.next();
  return parentFolder.createFolder(folderName);
}

function crearEstructuraProveedor_(rutNorm) {
  const root = DriveApp.getFolderById(ROOT_PROVIDER_FOLDER_ID);
  const proveedorFolder = getOrCreateChildFolder_(root, rutNorm);
  const registroFolder = getOrCreateChildFolder_(proveedorFolder, "Registro");
  const modificacionFolder = getOrCreateChildFolder_(proveedorFolder, "Modificacion");

  return {
    proveedorFolderId: proveedorFolder.getId(),
    proveedorFolderUrl: proveedorFolder.getUrl(),
    registroFolderId: registroFolder.getId(),
    registroFolderUrl: registroFolder.getUrl(),
    modificacionFolderId: modificacionFolder.getId(),
    modificacionFolderUrl: modificacionFolder.getUrl()
  };
}

function subirDocumentoBancario_(fileObj, rutNorm) {
  const estructura = crearEstructuraProveedor_(rutNorm);

  if (!fileObj) {
    return {
      url: "",
      fileId: "",
      proveedorFolderUrl: estructura.proveedorFolderUrl,
      registroFolderUrl: estructura.registroFolderUrl,
      modificacionFolderUrl: estructura.modificacionFolderUrl
    };
  }

  const fileName = String(fileObj.name || "");
  const fileExt = fileName.toLowerCase().split(".").pop();
  const allowedExt = ["pdf", "jpg", "jpeg", "png"];
  const allowedMimeTypes = ["application/pdf", "image/jpeg", "image/png"];
  if (!fileObj.bytes || !allowedExt.includes(fileExt) || !allowedMimeTypes.includes(String(fileObj.mimeType || ""))) {
    throw new Error("El documento bancario debe ser PDF, JPG, JPEG o PNG.");
  }

  const registroFolder = DriveApp.getFolderById(estructura.registroFolderId);
  const bytes = Utilities.base64Decode(fileObj.bytes);
  if (bytes.length > 10 * 1024 * 1024) {
    throw new Error("El documento bancario no puede superar 10 MB.");
  }
  const blob = Utilities.newBlob(bytes, fileObj.mimeType, fileObj.name);

  const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd_HHmmss");
  const safeRut = String(rutNorm).replace(/[^0-9K-]/g, "");
  const file = registroFolder.createFile(blob).setName(`${safeRut}_${timestamp}_${fileObj.name}`);

  return {
    url: file.getUrl(),
    fileId: file.getId(),
    proveedorFolderUrl: estructura.proveedorFolderUrl,
    registroFolderUrl: estructura.registroFolderUrl,
    modificacionFolderUrl: estructura.modificacionFolderUrl
  };
}

/***********************
 * VALIDACIÓN SERVER
 ***********************/
function esCorreoValido_(correo) {
  return isValidEmailStrict_(correo);
}

function validarDataServer_(data) {
  data.nif = normalizarRut_(data.nif);

  if (!rutValidoDV_(data.nif)) {
    throw new Error("RUT inválido. Formato esperado 1234567-8 o 12345678-9.");
  }

  if (!String(data.solicitante || "").trim()) throw new Error("Debe indicar solicitante.");
  if (!esCorreoValido_(data.solicitante)) throw new Error("El solicitante debe ser un correo válido.");

  if (!String(data.sociedad || "").trim()) throw new Error("Debe seleccionar sociedad.");
  if (!String(data.orgCompras || "").trim()) throw new Error("Debe seleccionar organización de compras.");
  if (!String(data.tratamiento || "").trim()) throw new Error("Debe seleccionar tratamiento.");
  if (String(data.nombreRazon1 || "").trim().length < 3) throw new Error("Debe ingresar Nombre o Razon Social 1 con al menos 3 caracteres.");

  const orgsValidas = ORGS_POR_SOCIEDAD[String(data.sociedad).trim()] || [];
  if (!orgsValidas.includes(String(data.orgCompras).trim())) {
    throw new Error("La organización de compras no corresponde a la sociedad seleccionada.");
  }

  if (data.mostrarNombreRazon2 && String(data.nombreRazon2 || "").trim().length < 3) {
    throw new Error("Debe ingresar Nombre o Razon Social 2 con al menos 3 caracteres.");
  }

  if (!String(data.region || "").trim()) throw new Error("Debe seleccionar Región.");
  if (!String(data.distrito || "").trim()) throw new Error("Debe ingresar Distrito.");
  if (!String(data.poblacion || "").trim()) throw new Error("Debe ingresar Población.");
  if (!String(data.calle || "").trim()) throw new Error("Debe ingresar Calle.");
  if (!String(data.numero || "").trim()) throw new Error("Debe ingresar Número.");
  if (!isValidPhone_(data.telefono)) throw new Error("Debe ingresar un Teléfono válido de 8 a 15 dígitos.");
  if (!String(data.correo || "").trim()) throw new Error("Debe ingresar Correo.");
  if (!esCorreoValido_(data.correo)) throw new Error("El correo de contacto no es válido.");

  if (!String(data.paisBanco || "").trim()) throw new Error("Debe seleccionar País Banco.");
  if (!["CL", "OTRO"].includes(String(data.paisBanco || "").trim())) {
    throw new Error("País Banco inválido. Solo se permite Chile u Otros.");
  }

  if (String(data.paisBanco) === "CL") {
    if (!String(data.bancoChileCodigo || "").trim()) throw new Error("Debe seleccionar Banco.");

    const esValeVista = data.bancoChileCodigo === "MP-02" || data.bancoChileCodigo === "MP-04";

    if (esValeVista) {
      data.referencia = "BC0000000001";
    } else {
      if (!isValidBankAccount_(data.numeroCuenta)) throw new Error("Debe ingresar una cuenta bancaria válida.");
    }
  } else {
    if (String(data.nombreBanco || "").trim().length < 3) throw new Error("Debe ingresar Nombre Banco.");
    if (!isValidSwift_(data.codigoSwift)) throw new Error("Debe ingresar un Swift válido.");
    if (!isValidIbanOptional_(data.iban)) throw new Error("Debe ingresar un IBAN válido o dejarlo vacío.");
    if (!isValidBankAccount_(data.numeroCuenta)) throw new Error("Debe ingresar una cuenta bancaria válida.");
  }
}

/***********************
 * FORMATO REGISTRO
 ***********************/
function aplicarValidacionYColorEstado_(sheet, row, estado) {
  const headers = getHeaderMap_(sheet, 1);
  const estadoIdx = headers[normalizeHeader_("Estado")];
  if (estadoIdx === undefined) return;

  const cell = sheet.getRange(row, estadoIdx + 1);
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(ESTADOS_REGISTRO, true)
    .setAllowInvalid(false)
    .build();

  cell.setDataValidation(rule);
  cell.setValue(estado || "En analisis");
  pintarEstadoCell_(cell, cell.getDisplayValue());
}

function pintarEstadoCell_(cell, estado) {
  const value = String(estado || "").trim();

  if (value === "En analisis") {
    cell.setBackground("#fff2cc").setFontColor("#7f6000").setFontWeight("bold");
  } else if (value === "SOLICITANDO V°B") {
    cell.setBackground("#fff2cc").setFontColor("#7f6000").setFontWeight("bold");
  } else if (value === "EN CREACION") {
    cell.setBackground("#cfe2f3").setFontColor("#0b5394").setFontWeight("bold");
  } else if (value === "CREADO") {
    cell.setBackground("#d9ead3").setFontColor("#274e13").setFontWeight("bold");
  } else if (value === "Pendiente Licitaciones") {
    cell.setBackground("#fce5cd").setFontColor("#b45f06").setFontWeight("bold");
  } else {
    cell.setBackground("#ffffff").setFontColor("#000000").setFontWeight("normal");
  }
}

function aplicarColorPaisBanco_(sheet, row, paisBanco) {
  const headers = getHeaderMap_(sheet, 1);
  const paisIdx = headers[normalizeHeader_("Pais De Banco")];
  if (paisIdx === undefined) return;

  const cell = sheet.getRange(row, paisIdx + 1);
  if (String(paisBanco || "").trim() === "OTRO") {
    cell.setBackground("#f4cccc").setFontColor("#990000").setFontWeight("bold");
  } else {
    cell.setBackground("#d9ead3").setFontColor("#274e13").setFontWeight("bold");
  }
}

function onEdit(e) {
  try {
    const range = e.range;
    const sheet = range.getSheet();
    if (sheet.getName() !== SHEET_REG || range.getRow() < 2) return;

    const headers = getHeaderMap_(sheet, 1);
    const estadoIdx = headers[normalizeHeader_("Estado")];

    if (estadoIdx !== undefined && range.getColumn() === (estadoIdx + 1)) {
      pintarEstadoCell_(range, range.getDisplayValue());
    }
  } catch (err) {
    Logger.log(err);
  }
}

/***********************
 * INSERTAR EN REGISTRO
 ***********************/
function insertarEnRegistro_(data, docUrl) {
  const sh = getSheet_(SHEET_REG);
  const headers = getRegistroHeaders_();
  forceHeadersIfNeeded_(SHEET_REG, headers);

  const rutNorm = normalizarRut_(data.nif);
  const razon2 = data.mostrarNombreRazon2 ? (data.nombreRazon2 || "") : "";
  const esValeVista = data.bancoChileCodigo === "MP-02" || data.bancoChileCodigo === "MP-04";
  const fechaSolicitud = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy");

  const fila = [[
    "",
    fechaSolicitud,
    "En analisis",
    data.solicitante || "",
    data.sociedad || "",
    data.orgCompras || "",
    data.tratamiento || "",
    data.nombreRazon1 || "",
    razon2 || "",
    data.region || "",
    data.distrito || "",
    data.poblacion || "",
    data.calle || "",
    data.numero || "",
    data.codigoPostal || "",
    data.telefono || "",
    data.correo || "",
    rutNorm || "",
    data.paisBanco || "",
    String(data.paisBanco || "") === "CL" ? normalizarClaveBanco_(data.bancoChileCodigo) : "",
    esValeVista ? "" : (data.numeroCuenta || ""),
    data.tipoCuenta || "",
    data.moneda || "",
    data.referencia || "",
    docUrl || "",
    data.iban || "",
    data.observacion || "",
    data.pregunta1 || "",
    data.pregunta2 || "",
    data.pregunta3 || ""
  ]];

  const nextRow = sh.getLastRow() + 1;
  const range = sh.getRange(nextRow, 1, 1, headers.length);
  range.setNumberFormat("@");
  range.setValues(fila);

  aplicarValidacionYColorEstado_(sh, nextRow, "En analisis");
  aplicarColorPaisBanco_(sh, nextRow, data.paisBanco || "");
}

function construirFilaRegistroPorEncabezado_(data, docUrl, sh) {
  const headerMap = getHeaderMap_(sh, 1);
  const row = new Array(Math.max(sh.getLastColumn(), getRegistroHeaders_().length)).fill("");
  const rutNorm = normalizarRut_(data.nif);
  const razon2 = data.mostrarNombreRazon2 ? (data.nombreRazon2 || "") : "";
  const esValeVista = data.bancoChileCodigo === "MP-02" || data.bancoChileCodigo === "MP-04";
  const fechaSolicitud = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy");

  setByHeader_(row, headerMap, "Codigo SAP", "");
  setByHeader_(row, headerMap, ["Fecha de Solicitud", "Fecha Solicitud"], fechaSolicitud);
  setByHeader_(row, headerMap, "Estado", "En analisis");
  setByHeader_(row, headerMap, "Solicitante", data.solicitante || "");
  setByHeader_(row, headerMap, "Sociedad", data.sociedad || "");
  setByHeader_(row, headerMap, ["Organización de Compras", "Organizacion de Compras"], data.orgCompras || "");
  setByHeader_(row, headerMap, "Tratamiento", data.tratamiento || "");
  setByHeader_(row, headerMap, ["Nombre o Razon Social 1", "Nombre o Razón Social 1"], data.nombreRazon1 || "");
  setByHeader_(row, headerMap, ["Nombre o Razon Social 2", "Nombre o Razón Social 2"], razon2 || "");
  setByHeader_(row, headerMap, ["Region", "Región"], data.region || "");
  setByHeader_(row, headerMap, "Distrito", data.distrito || "");
  setByHeader_(row, headerMap, ["Poblacion", "Población"], data.poblacion || "");
  setByHeader_(row, headerMap, "Calle", data.calle || "");
  setByHeader_(row, headerMap, ["Numero de Casa", "Número de Casa", "Numero"], data.numero || "");
  setByHeader_(row, headerMap, ["Codigo Postal", "Código Postal"], data.codigoPostal || "");
  setByHeader_(row, headerMap, ["Telefono", "Teléfono"], data.telefono || "");
  setByHeader_(row, headerMap, "Correo", data.correo || "");
  setByHeader_(row, headerMap, ["N° Identificacion Fiscal", "N° Identificación Fiscal", "N Identificacion Fiscal"], rutNorm || "");
  setByHeader_(row, headerMap, ["Pais De Banco", "País De Banco"], data.paisBanco || "");
  setByHeader_(row, headerMap, ["Clave Banco", "Clave de Banco"], String(data.paisBanco || "") === "CL" ? normalizarClaveBanco_(data.bancoChileCodigo) : "");
  setByHeader_(row, headerMap, ["Numero de Cuenta", "Número de Cuenta"], esValeVista ? "" : (data.numeroCuenta || ""));
  setByHeader_(row, headerMap, "Tipo de Cuenta", data.tipoCuenta || "");
  setByHeader_(row, headerMap, "Moneda Del Pedido", data.moneda || "");
  setByHeader_(row, headerMap, "Referencia", data.referencia || "");
  setByHeader_(row, headerMap, "Documento Bancario", docUrl || "");
  setByHeader_(row, headerMap, "IBAN", data.iban || "");
  setByHeader_(row, headerMap, "Observacion", data.observacion || "");
  setByHeader_(row, headerMap, "Pregunta1", data.pregunta1 || "");
  setByHeader_(row, headerMap, "Pregunta2", data.pregunta2 || "");
  setByHeader_(row, headerMap, "Pregunta3", data.pregunta3 || "");
  return row;
}

function insertarEnRegistroOrdenado_(data, docUrl) {
  const sh = getSheet_(SHEET_REG);
  forceHeadersIfNeeded_(SHEET_REG, getRegistroHeaders_());
  const fila = [construirFilaRegistroPorEncabezado_(data, docUrl, sh)];
  const nextRow = sh.getLastRow() + 1;
  const range = sh.getRange(nextRow, 1, 1, fila[0].length);
  range.setNumberFormat("@");
  range.setValues(fila);

  aplicarValidacionYColorEstado_(sh, nextRow, "En analisis");
  aplicarColorPaisBanco_(sh, nextRow, data.paisBanco || "");
}

/***********************
 * CONSTRUIR BATCH INPUT
 ***********************/
function construirFilaBI_(data, sh) {
  const headerMap = getHeaderMap_(sh, 1);
  const row = new Array(sh.getLastColumn()).fill("");

  const rutNorm = normalizarRut_(data.nif);
  const rutBody = rutSinDv_(rutNorm);
  const razon2 = data.mostrarNombreRazon2 ? (data.nombreRazon2 || "") : "";
  const esValeVista = data.bancoChileCodigo === "MP-02" || data.bancoChileCodigo === "MP-04";

  setByHeader_(row, headerMap, "Sociedad", data.sociedad || "");
  setByHeader_(row, headerMap, ["Organización de compras", "Organizacion de compras"], data.orgCompras || "");
  setByHeader_(row, headerMap, "GrupoCuentas", ESTATICOS_SAP.grupoCuentas);
  setByHeader_(row, headerMap, "Tratamiento", data.tratamiento || "");
  setByHeader_(row, headerMap, ["Nombre o Razón Social 1", "Nombre o Razon Social 1"], data.nombreRazon1 || "");
  setByHeader_(row, headerMap, ["Nombre o Razón Social 2", "Nombre o Razon Social 2"], razon2 || "");
  setByHeader_(row, headerMap, "Concepto de busqueda 1", rutBody || "");
  setByHeader_(row, headerMap, "Concepto de busqueda 2", data.nombreRazon1 || "");
  setByHeader_(row, headerMap, "Calle", data.calle || "");
  setByHeader_(row, headerMap, ["Numero", "Número"], data.numero || "");
  setByHeader_(row, headerMap, "Distrito", data.distrito || "");
  setByHeader_(row, headerMap, ["Población", "Poblacion"], data.poblacion || "");
  setByHeader_(row, headerMap, ["Código postal", "Codigo postal"], data.codigoPostal || "");
  setByHeader_(row, headerMap, "País", ESTATICOS_SAP.pais);
  setByHeader_(row, headerMap, ["Región", "Region"], data.region || "");
  setByHeader_(row, headerMap, "Idioma", ESTATICOS_SAP.idioma);
  setByHeader_(row, headerMap, ["Teléfono", "Telefono"], data.telefono || "");
  setByHeader_(row, headerMap, ["Correo Electronico", "Correo Electrónico"], data.correo || "");
  setByHeader_(row, headerMap, "Comentario", "PP");
  setByHeader_(row, headerMap, "Correo Electrónico 2", data.correo || "");
  setByHeader_(row, headerMap, "N° ID Fiscal", rutNorm || "");
  setByHeader_(row, headerMap, "N.I.F.", "");
  setByHeader_(row, headerMap, "Ramo", ESTATICOS_SAP.ramo);
  setByHeader_(row, headerMap, ["País Banco", "Pais Banco"], data.paisBanco || "");
  setByHeader_(row, headerMap, ["Clave Banco", "Clave de Banco"], String(data.paisBanco || "") === "CL" ? normalizarClaveBanco_(data.bancoChileCodigo) : "");
  setByHeader_(row, headerMap, "Cuenta Bancaria", esValeVista ? "" : (data.numeroCuenta || ""));
  setByHeader_(row, headerMap, "Tipo de Banco", "");
  setByHeader_(row, headerMap, "Referencia", esValeVista ? "BC0000000001" : (data.referencia || ""));
  setByHeader_(row, headerMap, "Cuenta Asociada", ESTATICOS_SAP.cuentaAsociada);
  setByHeader_(row, headerMap, "Grupo Tesoreria", ESTATICOS_SAP.grupoTesoreria);
  setByHeader_(row, headerMap, "Grupo Liberacion", ESTATICOS_SAP.grupoLiberacion);
  setByHeader_(row, headerMap, ["Condición de pago", "Condicion de pago"], ESTATICOS_SAP.condicionPago);
  setByHeader_(row, headerMap, ["Verificación fra. Dob.(flag)", "Verificacion fra. Dob.(flag)"], ESTATICOS_SAP.verificacionFraDob);
  setByHeader_(row, headerMap, "Vias de pago", "N");
  setByHeader_(row, headerMap, ["Moneda de pedido", "Moneda de Pedido"], data.moneda || "");
  setByHeader_(row, headerMap, ["Condición de pago", "Condicion de pago"], ESTATICOS_SAP.condicionPago);
  setByHeader_(row, headerMap, "Grupo esquema", ESTATICOS_SAP.grupoEsquema);
  setByHeader_(row, headerMap, ["Verificación fact base (flag)", "Verificacion fact base (flag)"], ESTATICOS_SAP.verifFactBasePedido);
  setByHeader_(row, headerMap, "Pedido automatico (flag)", ESTATICOS_SAP.pedidoAutomatico);
  setByHeader_(row, headerMap, ["Verificación Fact. Serv. (flag)", "Verificacion Fact. Serv. (flag)"], ESTATICOS_SAP.verifFactServ);

  forceBatchInputStaticValues_(row);
  return row;
}

/***********************
 * INSERTAR EN BATCH INPUT
 ***********************/
function insertarEnBatchInput_(data) {
  const sh = getSheet_(SHEET_BI);
  let row = construirFilaBI_(data, sh);
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0];

  row = row.map((value, index) => {
    const header = String(headers[index] || "").trim();
    if (header === "Correo Electronico" || header === "Correo Electrónico 2") return String(value ?? "");
    return upperIfString_(String(value ?? ""));
  });
  forceBatchInputStaticValues_(row);

  const nextRow = sh.getLastRow() + 1;
  const range = sh.getRange(nextRow, 1, 1, row.length);
  range.setNumberFormat("@");
  range.setValues([row.map(v => (v == null ? "" : String(v)))]);
}

/***********************
 * INSERTAR EN RUT ENVIADO
 ***********************/
function insertarEnRutEnviado_(data) {
  const sh = getSheet_(SHEET_RUT_ENVIADO);

  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, 2).setValues([["Rut", "Razon Social"]]);
  } else {
    const current = sh.getRange(1, 1, 1, 2).getDisplayValues()[0];
    if (!String(current[0] || "").trim() && !String(current[1] || "").trim()) {
      sh.getRange(1, 1, 1, 2).setValues([["Rut", "Razon Social"]]);
    }
  }

  const nextRow = sh.getLastRow() + 1;
  const rutNorm = normalizarRut_(data.nif);
  const razon = String(data.nombreRazon1 || "");

  const range = sh.getRange(nextRow, 1, 1, 2);
  range.setNumberFormat("@");
  range.setValues([[rutNorm, razon]]);
}

/***********************
 * PROCESO PRINCIPAL
 ***********************/
function procesarFormularioCompleto(data, fileObj) {
  validarDataServer_(data);

  const consulta = consultarRutProveedor(data.nif);

  if (consulta.existe) {
    let message = consulta.mensaje || "El proveedor ya existe o ya fue solicitado.";

    if (consulta.tipo === "PROVEEDOR_CREADO") {
      message = `El proveedor ya existe. Acreedor: ${consulta.acreedor || "Sin acreedor informado"}`;
    } else if (consulta.tipo === "REGISTRO_CON_CODIGO_SAP") {
      message = `El proveedor ya tiene Código SAP: ${consulta.codigoSap || "Sin código informado"}`;
    } else if (consulta.tipo === "REGISTRO_SIN_CODIGO_SAP") {
      message = "El proveedor ya se ha solicitado.";
    } else if (consulta.tipo === "BATCH_INPUT") {
      message = "El proveedor ya se encuentra en proceso de creación.";
    }

    return {
      success: false,
      message,
      consulta
    };
  }

  const rutNorm = normalizarRut_(data.nif);
  const subida = subirDocumentoBancario_(fileObj, rutNorm);

  insertarEnRegistroOrdenado_(data, subida.url);
  insertarEnBatchInput_(data);
  insertarEnRutEnviado_(data);

  return {
    success: true,
    message: "Registro, Batch Input y Rut Enviado creados correctamente.",
    docUrl: subida.url,
    proveedorFolderUrl: subida.proveedorFolderUrl,
    registroFolderUrl: subida.registroFolderUrl,
    modificacionFolderUrl: subida.modificacionFolderUrl,
    redirectUrl: REDIRECT_URL
  };
}
