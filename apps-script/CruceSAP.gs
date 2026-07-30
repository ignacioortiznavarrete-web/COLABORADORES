/**
 * Cruce ROM (pivot en Consolidados) <-> SAP.
 *
 * El cruce se hace por RUT + Nº Documento/Guía Despacho. Cuando el RUT que
 * registra la romana no es el mismo que factura en SAP (contratista vs.
 * proveedor), la equivalencia se declara en CFG.ALIAS_RUT.
 */
const CFG = {
  // HOJA CONSOLIDADOS / TABLA DINÁMICA
  CONSOLIDADO_SHEET_ID: 1716365950,
  CONSOLIDADO_SHEET_NAME_FALLBACK: "Consolidados",
  PIVOT_ANCHOR_A1: "A1",
  HEADER_ROW: 1,

  // HOJA SAP
  SAP_SHEET_NAME: "SAP",

  // ENCABEZADOS EXACTOS EN LA PIVOT
  PIVOT_HEADERS: {
    documento: "Nº Documento",
    rut: "Origen RUT",
    pesoInformado: "Producto Peso Informado"
  },

  // ENCABEZADOS EXACTOS EN SAP
  SAP_HEADERS: {
    proveedor: "Nombre Proveedor",      // Ej: 79755000-0 / AGRICOLA Y FOREST
    guia: "Guia Despacho",
    volumen: "Volumen"
  },

  /**
   * Equivalencias RUT romana -> RUT SAP.
   * Clave: Origen RUT de la pivot (sin puntos ni dígito verificador).
   * Valor: RUT con el que ese mismo despacho llega facturado en SAP.
   *
   * Verificado sobre Mayo-2026: la diferencia mediana de volumen en los pares
   * que une cada alias es ~0,07 m³, el mismo orden que un cruce por RUT propio.
   */
  ALIAS_RUT: {
    "77339394": "77087721", // SERVICIOS FORESTALES EL ENCINO SPA -> FORESTAL TREGUALEMU SPA
    "77381372": "77087721"  // SERVIMAQ S.P.A.                    -> FORESTAL TREGUALEMU SPA
  },

  /**
   * Cuando la pivot no trae RUT de origen (celda vacía o 0), buscar la guía en
   * todo SAP y aceptarla sólo si un único proveedor la tiene. Si dos o más
   * proveedores repiten ese número, la fila queda sin match en vez de adivinar.
   */
  FALLBACK_GUIA_UNICA: true,

  // SALIDA
  OUT_HEADERS: [
    "Volumen SAP",
    "SAP RUT",
    "SAP Guía",
    "Diferencia",
    "SAP Proveedor",
    "Match"
  ],
  COL_VOLUMEN: 0,
  COL_DIFERENCIA: 3,

  LEAVE_BLANK_COLUMNS: 1,
  DEFAULT_FONT_FAMILY: "Arial",
  DEFAULT_FONT_SIZE: 10,
  HEADER_BG: "#d9ead3",

  COLOR_OK: "#d9ead3",      // verde clarito
  COLOR_WARN: "#fff2cc",    // amarillo clarito
  COLOR_MISSING: "#f4cccc", // rojo claro
  COLOR_ALIAS: "#d0e0e3",   // celeste: match resuelto por alias/fallback

  DIFF_THRESHOLD: 5,

  // Separador decimal de la planilla, usado sólo al parsear texto.
  DECIMAL_SEP: ",",

  NUM_FORMAT: "#,##0.000",
  PROP_LAST_OUTPUT: "cruceSap.lastOutputRange"
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Cruce SAP")
    .addItem("Traer SAP resumido", "sap_pegar_resumido")
    .addItem("Sugerir alias de RUT", "sap_sugerir_alias")
    .addSeparator()
    .addItem("Limpiar salida derecha", "sap_limpiar_salida")
    .addToUi();
}

function sap_pegar_resumido() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const shCons = getConsolidados_(ss);
  const shSap = ss.getSheetByName(CFG.SAP_SHEET_NAME);

  if (!shCons) throw new Error("No encontré la hoja Consolidados.");
  if (!shSap) throw new Error(`No encontré la hoja SAP: "${CFG.SAP_SHEET_NAME}"`);

  // =========================
  // 1) LEER PIVOT
  // =========================
  const pivotRange = detectPivotRange_(shCons, CFG.PIVOT_ANCHOR_A1);
  const pivotText = pivotRange.getDisplayValues();  // claves: doc, rut, totales
  const pivotRaw = pivotRange.getValues();         // números: peso informado
  const pivMap = headerMap_(pivotText, CFG.HEADER_ROW);

  requireHeaders_(pivMap, CFG.PIVOT_HEADERS, "PIVOT");

  const iDocPivot = pivMap[norm_(CFG.PIVOT_HEADERS.documento)];
  const iRutPivot = pivMap[norm_(CFG.PIVOT_HEADERS.rut)];
  const iPesoPivot = pivMap[norm_(CFG.PIVOT_HEADERS.pesoInformado)];

  // La pivot deja en blanco la celda de agrupación salvo en la primera fila
  // del grupo, así que hay que arrastrarla hacia abajo.
  const filledPivot = fillDown_(pivotText, [iDocPivot, iRutPivot]);

  // =========================
  // 2) LEER SAP AGRUPADO
  // =========================
  const sapVals = shSap.getDataRange().getValues();
  const sapMap = headerMap_(sapVals, CFG.HEADER_ROW);
  requireHeaders_(sapMap, CFG.SAP_HEADERS, "SAP");

  const sapAgg = buildSapAggregation_(sapVals, sapMap);
  const sapPorGuia = indexarPorGuia_(sapAgg);

  // =========================
  // 3) PRIMERA PASADA: peso de la pivot por documento
  // =========================
  // Un mismo documento puede venir abierto en varias filas (una por producto).
  // La diferencia se calcula contra el total del documento, no contra la fila.
  const pesoPorClave = new Map();
  const filas = [];

  for (let r = CFG.HEADER_ROW; r < filledPivot.length; r++) {
    const info = clasificarFila_(pivotText[r], filledPivot[r], pivotRaw[r], iDocPivot, iRutPivot, iPesoPivot);
    filas.push(info);
    if (info.clave) {
      pesoPorClave.set(info.clave, (pesoPorClave.get(info.clave) || 0) + info.peso);
    }
  }

  // =========================
  // 4) SEGUNDA PASADA: resolver el match y armar la salida
  // =========================
  const out = [];
  const rowColors = [];
  const usadas = new Set();
  const vistas = new Set();
  let nAlias = 0;
  let nSinMatch = 0;

  for (const info of filas) {
    if (!info.clave) {
      out.push(blankRow_(CFG.OUT_HEADERS.length));
      rowColors.push(blankColorRow_(CFG.OUT_HEADERS.length));
      continue;
    }

    const res = resolverMatch_(info.rut, info.doc, sapAgg, sapPorGuia);

    if (!res) {
      nSinMatch++;
      out.push(["", info.rut, info.doc, "", "", "sin match en SAP"]);
      rowColors.push(new Array(CFG.OUT_HEADERS.length).fill(CFG.COLOR_MISSING));
      continue;
    }

    usadas.add(res.claveSap);
    if (res.via !== "RUT") nAlias++;

    const repetida = vistas.has(info.clave);
    vistas.add(info.clave);

    const pesoDoc = pesoPorClave.get(info.clave) || 0;
    const diferencia = Math.abs((res.hit.volumenTotal || 0) - pesoDoc);

    let etiqueta = res.via;
    if (repetida) etiqueta += " (doc. repetido)";

    out.push([
      res.hit.volumenTotal,
      res.hit.rut,
      res.hit.guia,
      diferencia,
      res.hit.proveedor,
      etiqueta
    ]);

    const colores = blankColorRow_(CFG.OUT_HEADERS.length);
    colores[CFG.COL_DIFERENCIA] = diferencia > CFG.DIFF_THRESHOLD ? CFG.COLOR_WARN : CFG.COLOR_OK;
    if (res.via !== "RUT") colores[CFG.OUT_HEADERS.length - 1] = CFG.COLOR_ALIAS;
    rowColors.push(colores);
  }

  // =========================
  // 5) AGREGAR ABAJO LO QUE ESTÁ EN SAP Y NO EN LA PIVOT
  // =========================
  const extras = [];
  const extrasColors = [];

  for (const [clave, hit] of sapAgg.entries()) {
    if (usadas.has(clave)) continue;
    extras.push([
      hit.volumenTotal,
      hit.rut,
      hit.guia,
      hit.volumenTotal, // sin contraparte en la pivot: la diferencia es todo el volumen
      hit.proveedor,
      "sólo en SAP"
    ]);
    extrasColors.push(new Array(CFG.OUT_HEADERS.length).fill(CFG.COLOR_MISSING));
  }

  if (extras.length) {
    out.push(blankRow_(CFG.OUT_HEADERS.length));
    rowColors.push(blankColorRow_(CFG.OUT_HEADERS.length));
  }

  const finalOut = out.concat(extras);
  const finalColors = rowColors.concat(extrasColors);

  // =========================
  // 6) ESCRIBIR
  // =========================
  const outStartRow = pivotRange.getRow() + (CFG.HEADER_ROW - 1);
  const outStartCol = pivotRange.getColumn() + pivotRange.getNumColumns() + CFG.LEAVE_BLANK_COLUMNS;

  limpiarSalidaPrevia_(shCons);
  asegurarFilas_(shCons, outStartRow + finalOut.length + 1);

  const headerRange = shCons.getRange(outStartRow, outStartCol, 1, CFG.OUT_HEADERS.length);
  headerRange.setValues([CFG.OUT_HEADERS]);

  if (finalOut.length > 0) {
    const bodyRange = shCons.getRange(outStartRow + 1, outStartCol, finalOut.length, CFG.OUT_HEADERS.length);
    bodyRange.setValues(finalOut);
    aplicarFormatoBasico_(shCons, pivotRange, headerRange, bodyRange);
    aplicarFormatoNumerico_(bodyRange);
    bodyRange.setBackgrounds(finalColors);
  }

  recordarSalida_(shCons, outStartRow, outStartCol, finalOut.length + 1);

  SpreadsheetApp.getUi().alert(
    "Listo",
    [
      `Filas de la pivot cruzadas: ${vistas.size}`,
      `Resueltas por alias / guía única: ${nAlias}`,
      `Sin match en SAP: ${nSinMatch}`,
      `Guías sólo en SAP (al final, en rojo): ${extras.length}`
    ].join("\n"),
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * Recorre la pivot y propone equivalencias de RUT: para cada RUT de origen que
 * cruza poco contra su propio RUT en SAP, busca el proveedor SAP con el que más
 * guías comparte y confirma con la diferencia mediana de volumen. Un alias real
 * deja diferencias de décimas; una coincidencia de numeración deja decenas.
 */
function sap_sugerir_alias() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const shCons = getConsolidados_(ss);
  const shSap = ss.getSheetByName(CFG.SAP_SHEET_NAME);
  if (!shCons || !shSap) throw new Error("Falta la hoja Consolidados o SAP.");

  const pivotRange = detectPivotRange_(shCons, CFG.PIVOT_ANCHOR_A1);
  const pivotText = pivotRange.getDisplayValues();
  const pivotRaw = pivotRange.getValues();
  const pivMap = headerMap_(pivotText, CFG.HEADER_ROW);
  requireHeaders_(pivMap, CFG.PIVOT_HEADERS, "PIVOT");

  const iDoc = pivMap[norm_(CFG.PIVOT_HEADERS.documento)];
  const iRut = pivMap[norm_(CFG.PIVOT_HEADERS.rut)];
  const iPeso = pivMap[norm_(CFG.PIVOT_HEADERS.pesoInformado)];
  const filled = fillDown_(pivotText, [iDoc, iRut]);

  const sapVals = shSap.getDataRange().getValues();
  const sapMap = headerMap_(sapVals, CFG.HEADER_ROW);
  requireHeaders_(sapMap, CFG.SAP_HEADERS, "SAP");
  const sapAgg = buildSapAggregation_(sapVals, sapMap);

  // pesos de la pivot por rut -> guía
  const porRut = new Map();
  for (let r = CFG.HEADER_ROW; r < filled.length; r++) {
    const info = clasificarFila_(pivotText[r], filled[r], pivotRaw[r], iDoc, iRut, iPeso);
    if (!info.clave) continue;
    if (!porRut.has(info.rut)) porRut.set(info.rut, new Map());
    const m = porRut.get(info.rut);
    m.set(info.doc, (m.get(info.doc) || 0) + info.peso);
  }

  // SAP por rut -> guía -> volumen
  const sapPorRut = new Map();
  for (const hit of sapAgg.values()) {
    if (!sapPorRut.has(hit.rut)) sapPorRut.set(hit.rut, new Map());
    sapPorRut.get(hit.rut).set(hit.guia, hit);
  }

  const filas = [];
  for (const [rut, guias] of porRut.entries()) {
    const propias = sapPorRut.get(rut);
    const propio = contarComunes_(guias, propias);
    if (propio >= guias.size * 0.5) continue; // ya cruza bien por su propio RUT

    let mejor = null;
    for (const [otroRut, otras] of sapPorRut.entries()) {
      if (otroRut === rut) continue;
      const comunes = contarComunes_(guias, otras);
      if (!comunes) continue;
      const medianaDif = medianaDiferencias_(guias, otras);
      if (!mejor || comunes > mejor.comunes) {
        mejor = { rut: otroRut, comunes, medianaDif, proveedor: otras.values().next().value.proveedor };
      }
    }
    if (!mejor) continue;

    const veredicto = mejor.medianaDif <= CFG.DIFF_THRESHOLD
      ? "ALIAS PROBABLE"
      : "coincidencia de numeración, NO usar";

    filas.push([
      rut,
      guias.size,
      propio,
      mejor.rut,
      mejor.proveedor,
      mejor.comunes,
      mejor.medianaDif,
      veredicto
    ]);
  }

  filas.sort((a, b) => b[5] - a[5]);

  const nombre = "Alias sugeridos";
  let sh = ss.getSheetByName(nombre);
  if (!sh) sh = ss.insertSheet(nombre);
  sh.clear();

  const cab = [
    "Origen RUT (pivot)", "Guías en pivot", "Cruzan con su propio RUT",
    "SAP RUT candidato", "SAP Proveedor", "Guías en común",
    "Mediana |dif. volumen|", "Veredicto"
  ];
  sh.getRange(1, 1, 1, cab.length).setValues([cab]).setFontWeight("bold").setBackground(CFG.HEADER_BG);

  if (filas.length) {
    sh.getRange(2, 1, filas.length, cab.length).setValues(filas);
    sh.getRange(2, 7, filas.length, 1).setNumberFormat(CFG.NUM_FORMAT);
  }
  for (let c = 1; c <= cab.length; c++) sh.autoResizeColumn(c);

  SpreadsheetApp.getUi().alert(
    "Alias sugeridos",
    filas.length
      ? `Revisá la hoja "${nombre}". Las filas marcadas ALIAS PROBABLE se copian a CFG.ALIAS_RUT.`
      : "No hay RUT de origen con cruce cruzado relevante.",
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function sap_limpiar_salida() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const shCons = getConsolidados_(ss);
  if (!shCons) return;
  limpiarSalidaPrevia_(shCons);
  SpreadsheetApp.getUi().alert("Salida derecha limpiada.");
}

/************ RESOLUCIÓN DEL MATCH ************/
/**
 * Orden de resolución: RUT exacto, luego alias declarado y, si la pivot no trae
 * RUT, la guía sola siempre que un único proveedor SAP la tenga.
 */
function resolverMatch_(rut, doc, sapAgg, sapPorGuia) {
  if (rut) {
    const directo = sapAgg.get(`${rut}|${doc}`);
    if (directo) return { hit: directo, via: "RUT", claveSap: `${rut}|${doc}` };

    const alias = CFG.ALIAS_RUT[rut];
    if (alias) {
      const porAlias = sapAgg.get(`${alias}|${doc}`);
      if (porAlias) return { hit: porAlias, via: "alias RUT", claveSap: `${alias}|${doc}` };
    }
    return null;
  }

  if (CFG.FALLBACK_GUIA_UNICA) {
    const candidatos = sapPorGuia.get(doc);
    if (candidatos && candidatos.length === 1) {
      const hit = candidatos[0];
      return { hit, via: "guía única", claveSap: `${hit.rut}|${hit.guia}` };
    }
  }
  return null;
}

function indexarPorGuia_(sapAgg) {
  const idx = new Map();
  for (const hit of sapAgg.values()) {
    if (!idx.has(hit.guia)) idx.set(hit.guia, []);
    idx.get(hit.guia).push(hit);
  }
  return idx;
}

/**
 * Devuelve doc/rut/peso ya normalizados, o clave vacía si la fila no es un
 * documento (fila en blanco, subtotal o total general de la pivot).
 */
function clasificarFila_(filaOriginal, filaRellenada, filaCruda, iDoc, iRut, iPeso) {
  const vacia = { clave: "", rut: "", doc: "", peso: 0 };

  if (isEmptyRow_(filaOriginal)) return vacia;
  // El subtotal se detecta sobre la fila original: el fill-down le habría
  // copiado el documento del grupo anterior y la haría pasar por un despacho.
  if (filaOriginal.some(c => isTotalRow_(c))) return vacia;

  const doc = normalizeGuia_(filaRellenada[iDoc]);
  if (!doc) return vacia;

  const rut = cleanRut_(filaRellenada[iRut]);
  const peso = toNumber_(filaCruda[iPeso] !== "" && filaCruda[iPeso] !== null
    ? filaCruda[iPeso]
    : filaOriginal[iPeso]);

  return { clave: `${rut}|${doc}`, rut, doc, peso };
}

function contarComunes_(guiasPivot, guiasSap) {
  if (!guiasSap) return 0;
  let n = 0;
  for (const g of guiasPivot.keys()) if (guiasSap.has(g)) n++;
  return n;
}

function medianaDiferencias_(guiasPivot, guiasSap) {
  const difs = [];
  for (const [g, peso] of guiasPivot.entries()) {
    const hit = guiasSap.get(g);
    if (hit) difs.push(Math.abs((hit.volumenTotal || 0) - peso));
  }
  if (!difs.length) return Infinity;
  difs.sort((a, b) => a - b);
  const m = Math.floor(difs.length / 2);
  return difs.length % 2 ? difs[m] : (difs[m - 1] + difs[m]) / 2;
}

/************ AGRUPACIÓN SAP ************/
function buildSapAggregation_(sapVals, sapMap) {
  const agg = new Map();
  const iProveedor = sapMap[norm_(CFG.SAP_HEADERS.proveedor)];
  const iGuia = sapMap[norm_(CFG.SAP_HEADERS.guia)];
  const iVolumen = sapMap[norm_(CFG.SAP_HEADERS.volumen)];

  for (let r = CFG.HEADER_ROW; r < sapVals.length; r++) {
    const row = sapVals[r];

    const guia = normalizeGuia_(row[iGuia]);
    const proveedorRaw = norm_(row[iProveedor]);
    const rut = extractRutFromProveedor_(proveedorRaw);
    if (!guia || !rut) continue;

    const key = `${rut}|${guia}`;
    if (!agg.has(key)) {
      agg.set(key, { rut, guia, proveedor: extractRazonSocial_(proveedorRaw), volumenTotal: 0 });
    }
    agg.get(key).volumenTotal += toNumber_(row[iVolumen]);
  }
  return agg;
}

/************ FORMATO ************/
function aplicarFormatoBasico_(sheet, pivotRange, headerRange, bodyRange) {
  headerRange
    .setFontFamily(CFG.DEFAULT_FONT_FAMILY)
    .setFontSize(CFG.DEFAULT_FONT_SIZE)
    .setFontWeight("bold")
    .setFontColor("#000000")
    .setBackground(CFG.HEADER_BG)
    .setHorizontalAlignment("left")
    .setVerticalAlignment("middle")
    .setWrap(false);

  bodyRange
    .setFontFamily(CFG.DEFAULT_FONT_FAMILY)
    .setFontSize(CFG.DEFAULT_FONT_SIZE)
    .setFontWeight("normal")
    .setFontColor("#000000")
    .setHorizontalAlignment("left")
    .setVerticalAlignment("middle")
    .setWrap(false);

  for (let c = headerRange.getColumn(); c < headerRange.getColumn() + headerRange.getNumColumns(); c++) {
    sheet.autoResizeColumn(c);
  }
}

/** Volumen y Diferencia quedan numéricos; RUT y guía como texto para no perder ceros. */
function aplicarFormatoNumerico_(bodyRange) {
  const n = bodyRange.getNumRows();
  const col = bodyRange.getColumn();
  const sheet = bodyRange.getSheet();
  const row = bodyRange.getRow();

  CFG.OUT_HEADERS.forEach((_, i) => {
    const esNumero = i === CFG.COL_VOLUMEN || i === CFG.COL_DIFERENCIA;
    sheet.getRange(row, col + i, n, 1).setNumberFormat(esNumero ? CFG.NUM_FORMAT : "@");
  });
}

/************ SALIDA: UBICACIÓN Y LIMPIEZA ************/
/**
 * La ubicación anterior se guarda en propiedades: detectarla de nuevo a partir
 * de la hoja fallaría, porque el bloque ya escrito pasa a leerse como parte de
 * la pivot y la salida se iría corriendo a la derecha en cada corrida.
 */
function recordarSalida_(sheet, row, col, numRows) {
  PropertiesService.getDocumentProperties()
    .setProperty(CFG.PROP_LAST_OUTPUT, JSON.stringify({ row, col, numRows, cols: CFG.OUT_HEADERS.length }));
}

function limpiarSalidaPrevia_(sheet) {
  const props = PropertiesService.getDocumentProperties();
  const raw = props.getProperty(CFG.PROP_LAST_OUTPUT);
  if (!raw) return;

  let prev;
  try {
    prev = JSON.parse(raw);
  } catch (e) {
    props.deleteProperty(CFG.PROP_LAST_OUTPUT);
    return;
  }

  const maxRows = sheet.getMaxRows();
  const maxCols = sheet.getMaxColumns();
  if (prev.row > maxRows || prev.col > maxCols) {
    props.deleteProperty(CFG.PROP_LAST_OUTPUT);
    return;
  }

  const nFilas = Math.min(prev.numRows, maxRows - prev.row + 1);
  const nCols = Math.min(prev.cols, maxCols - prev.col + 1);
  if (nFilas > 0 && nCols > 0) {
    sheet.getRange(prev.row, prev.col, nFilas, nCols).clearContent().clearFormat();
  }
  props.deleteProperty(CFG.PROP_LAST_OUTPUT);
}

function asegurarFilas_(sheet, filasNecesarias) {
  const faltan = filasNecesarias - sheet.getMaxRows();
  if (faltan > 0) sheet.insertRowsAfter(sheet.getMaxRows(), faltan);
}

/************ FILL DOWN ************/
function fillDown_(values, colIdxs) {
  const out = values.map(r => r.slice());
  const last = {};
  colIdxs.forEach(c => last[c] = "");

  for (let r = CFG.HEADER_ROW; r < out.length; r++) {
    for (const c of colIdxs) {
      const v = norm_(out[r][c]);
      if (v) last[c] = v;
      else out[r][c] = last[c];
    }
  }
  return out;
}

/************ HELPERS ************/
function getConsolidados_(ss) {
  const byId = ss.getSheets().find(s => s.getSheetId() === CFG.CONSOLIDADO_SHEET_ID);
  if (byId) return byId;
  return ss.getSheetByName(CFG.CONSOLIDADO_SHEET_NAME_FALLBACK);
}

/**
 * El ancho sale de los encabezados contiguos, no de la última columna con datos
 * de la hoja: así el bloque de salida ya pegado a la derecha queda fuera.
 */
function detectPivotRange_(sheet, anchorA1) {
  const anchor = sheet.getRange(anchorA1);
  const startRow = anchor.getRow();
  const startCol = anchor.getColumn();
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  if (lastRow < startRow || lastCol < startCol) {
    throw new Error("La hoja Consolidados está vacía a partir de " + anchorA1);
  }

  const headerRow = startRow + CFG.HEADER_ROW - 1;
  const headers = sheet
    .getRange(headerRow, startCol, 1, lastCol - startCol + 1)
    .getDisplayValues()[0];

  let nCols = 0;
  while (nCols < headers.length && norm_(headers[nCols]) !== "") nCols++;
  if (nCols === 0) throw new Error("No encontré encabezados de la pivot en la fila " + headerRow);

  const cuerpo = sheet
    .getRange(startRow, startCol, lastRow - startRow + 1, nCols)
    .getDisplayValues();

  let nRows = cuerpo.length;
  for (let r = CFG.HEADER_ROW; r < cuerpo.length; r++) {
    if (cuerpo[r].every(v => norm_(v) === "")) { nRows = r; break; }
  }

  return sheet.getRange(startRow, startCol, nRows, nCols);
}

function headerMap_(values, headerRow1Based) {
  const header = values[headerRow1Based - 1].map(h => norm_(h));
  const map = {};
  header.forEach((h, i) => {
    if (h && !(h in map)) map[h] = i;
  });
  return map;
}

function requireHeaders_(headerMap, expectedObj, label) {
  for (const k in expectedObj) {
    const name = norm_(expectedObj[k]);
    if (!(name in headerMap)) {
      throw new Error(`[${label}] Falta encabezado exacto: "${expectedObj[k]}"`);
    }
  }
}

function norm_(v) {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

/** RUT sin puntos ni dígito verificador. */
function cleanRut_(rut) {
  let s = norm_(rut).toUpperCase().replace(/[.\s]/g, "");
  if (!s) return "";
  if (s.indexOf("-") > -1) s = s.split("-")[0];
  s = s.replace(/[^0-9K]/g, "");
  s = s.replace(/^0+(?=\d)/, "");
  return s === "0" ? "" : s;
}

/** Normaliza guías para que crucen aunque vengan como número, texto o con sufijo. */
function normalizeGuia_(v) {
  if (v === null || v === undefined) return "";

  let s = typeof v === "number" ? String(Math.round(v)) : String(v).trim();
  if (!s) return "";

  s = s.replace(/\s+/g, "");
  if (s.indexOf("-") > -1) s = s.split("-")[0];
  // Los decimales sobrantes (2025188.0) se sacan antes de limpiar signos:
  // si no, el punto ya no está y el número queda multiplicado por diez.
  s = s.replace(/[.,]0+$/, "");
  s = s.replace(/[^0-9A-Za-z]/g, "").toUpperCase();
  if (/^\d+$/.test(s)) s = s.replace(/^0+(?=\d)/, "");

  return s;
}

function extractRutFromProveedor_(txt) {
  const raw = norm_(txt);
  if (!raw) return "";
  const m = raw.match(/\d{1,3}(?:\.\d{3})*\s*-\s*[\dkK]|\d{7,9}\s*-\s*[\dkK]/);
  if (m) return cleanRut_(m[0]);
  return cleanRut_(raw.split("/")[0]);
}

function extractRazonSocial_(txt) {
  const raw = norm_(txt);
  if (!raw) return "";
  const parts = raw.split("/");
  if (parts.length < 2) return raw;
  return parts.slice(1).join("/").trim();
}

function isEmptyRow_(row) {
  return row.every(c => norm_(c) === "");
}

function blankRow_(n) {
  return new Array(n).fill("");
}

function blankColorRow_(n) {
  return new Array(n).fill(null);
}

/**
 * Las filas de subtotal de la pivot se rotulan "Total <grupo>", siempre al
 * inicio. Anclar al inicio evita marcar como total a una razón social que
 * lleve la palabra en el medio.
 */
function isTotalRow_(value) {
  const s = norm_(value).toLowerCase();
  if (!s) return false;
  return /^(gran(d)?\s+)?(sub\s?)?total(es)?\b/.test(s);
}

/**
 * Parseo de texto a número. El separador decimal se toma de CFG.DECIMAL_SEP:
 * adivinarlo por la cantidad de dígitos falla justo en los volúmenes de tres
 * decimales (25,743 son 25,743 m³, no veinticinco mil).
 */
function toNumber_(v) {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return v;

  let s = String(v).trim();
  if (!s) return 0;
  s = s.replace(/\s/g, "");

  const dec = CFG.DECIMAL_SEP;
  const miles = dec === "," ? "." : ",";
  s = s.split(miles).join("");
  s = s.split(dec).join(".");

  const num = parseFloat(s);
  return isNaN(num) ? 0 : num;
}
