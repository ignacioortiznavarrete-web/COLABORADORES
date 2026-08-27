/*******************************************************
 * DASHBOARD FORESTAL HISTORICO · PLAN vs INGRESADO
 * -----------------------------------------------------
 * Fuente : spreadsheet "Ingresos Historico"
 * Objetivo: analitica comparativa (mes anterior, mismo
 *           mes de otro anio, acumulados) sobre la que se
 *           puedan armar planes de accion concretos.
 *
 * El servidor entrega UN bundle columnar comprimido y el
 * cliente hace toda la agregacion en memoria, para que
 * cambiar un filtro no cueste una llamada al servidor.
 *******************************************************/

const CONFIG = {
  SPREADSHEET_ID: '1ZR7sTAOUa-Nk-pBzgO8-FLB4clyDawEnhxd8oqXcJs8',
  SHEET_NAME: 'Hoja 1',
  PLAN_SHEET_NAME: 'Plan',
  CACHE_PREFIX: 'ING_BUNDLE_FORESTAL_V16_',
  CACHE_SECONDS: 3600,
  CHUNK_SIZE: 90000,
  TIMEZONE: 'America/Santiago',
  USE_GZIP_CACHE: true
};

/**
 * Relacion comuna -> region para todos los valores encontrados en Hoja 1.
 * Las claves estan normalizadas porque clean_() elimina tildes y signos.
 */
const REGION_BY_COMUNA = {
  // Region del Biobio
  'CABRERO': 'Biobío',
  'CONCEPCION': 'Biobío',
  'FLORIDA': 'Biobío',
  'HUALQUI': 'Biobío',
  'LAJA': 'Biobío',
  'LOS ANGELES': 'Biobío',
  'NACIMIENTO': 'Biobío',
  'PENCO': 'Biobío',
  'QUILLECO': 'Biobío',
  'SAN ROSENDO': 'Biobío',
  'SANTA BARBARA': 'Biobío',
  'TOME': 'Biobío',
  'TUCAPEL': 'Biobío',
  'YUMBEL': 'Biobío',
  'MULCHEN': 'Biobío',

  // Region de Nuble
  'BULNES': 'Ñuble',
  'CHILLAN': 'Ñuble',
  'CHILLAN VIEJO': 'Ñuble',
  'COBQUECURA': 'Ñuble',
  'COELEMU': 'Ñuble',
  'COIHUECO': 'Ñuble',
  'EL CARMEN': 'Ñuble',
  'NINHUE': 'Ñuble',
  'PEMUCO': 'Ñuble',
  'PINTO': 'Ñuble',
  'PORTEZUELO': 'Ñuble',
  'PORTEZULO': 'Ñuble', // error ortografico detectado en la fuente
  'QUILLON': 'Ñuble',
  'QUIRIHUE': 'Ñuble',
  'SAN CARLOS': 'Ñuble',
  'SAN FABIAN': 'Ñuble',
  'SAN IGNACIO': 'Ñuble',
  'SAN NICOLAS': 'Ñuble',
  'YUNGAY': 'Ñuble',

  // Region del Maule
  'CAUQUENES': 'Maule',
  'PARRAL': 'Maule',
  'RETIRO': 'Maule',

  // Region de La Araucania
  'CUNCO': 'La Araucanía',
  'ERCILLA': 'La Araucanía',
  'LAUTARO': 'La Araucanía',
  'LOS SAUCES': 'La Araucanía',
  'LUMACO': 'La Araucanía',
  'TEMUCO': 'La Araucanía',
  'VICTORIA': 'La Araucanía',
  'VILCUN': 'La Araucanía',

  // Comunas oficiales que aparecen en la fuente, sujetas a validacion por ROL
  'CHIMBARONGO': "O'Higgins",
  'SAN ANTONIO': 'Valparaíso',

  // Valor no oficial encontrado en la columna Comuna
  'G SANCHEZ': 'Biobío',

  // Nombre adicional contemplado para evitar confundir Florida con La Florida
  'LA FLORIDA': 'Metropolitana de Santiago'
};

/**
 * Excepciones confirmadas usando coincidencias exactas de ROL dentro de la
 * propia fuente. El ROL es unico a nivel comunal, por lo que estos registros
 * se asignan a la comuna/region que comparte el mismo ROL en otras filas.
 */
const REGION_BY_COMUNA_ROL = {
  'CHIMBARONGO|2206 103': 'Ñuble',   // mismo ROL registrado como CHILLAN
  'SAN ANTONIO|155 21': 'Ñuble',     // mismo ROL registrado como PORTEZUELO
  'G SANCHEZ|574 168': 'Biobío',     // mismo ROL registrado como HUALQUI
  'PORTEZULO|155 21': 'Ñuble'
};

const REGION_ORDER = [
  'Biobío',
  'Ñuble',
  'Maule',
  'La Araucanía',
  "O'Higgins",
  'Valparaíso',
  'Metropolitana de Santiago',
  'Sin región'
];

const PROVIDER_ALIASES = {
  'MASISA':'MASISA SA','MASISA SA':'MASISA SA','MASISA S A':'MASISA SA',

  'ALSAL':'COMERCIAL ALSAL LTDA',
  'COMERCIAL ALSAL':'COMERCIAL ALSAL LTDA',
  'COMERCIAL ALSAL LTDA':'COMERCIAL ALSAL LTDA',

  'COMACO':'FORESTAL COMACO S A',
  'FORESTAL COMACO':'FORESTAL COMACO S A',
  'FORESTAL COMACO SA':'FORESTAL COMACO S A',
  'FORESTAL COMACO S A':'FORESTAL COMACO S A',

  'FHO':'FORESTAL FHO',
  'FORESTAL FHO':'FORESTAL FHO',

  'LOS SAUCES':'FORESTAL LOS SAUCES SPA',
  'FORESTAL LOS SAUCES':'FORESTAL LOS SAUCES SPA',
  'FORESTAL LOS SAUCES SPA':'FORESTAL LOS SAUCES SPA',

  'FORESOL':'FORESTAL FORESOL SPA',
  'FORESTAL FORESOL':'FORESTAL FORESOL SPA',
  'FORESTAL FORESOL SPA':'FORESTAL FORESOL SPA',

  'RC FOREST':'RODRIGO CAMPOS FOREST SPA',
  'RODRIGO CAMPOS':'RODRIGO CAMPOS FOREST SPA',
  'RODRIGO CAMPOS FOREST SPA':'RODRIGO CAMPOS FOREST SPA',

  'VOLCAN':'VOLCAN',
  'EL VOLCAN':'VOLCAN',

  'WOOD CARFU':'WOOD CARFU SPA',
  'WOOD CARFU SPA':'WOOD CARFU SPA',

  'FOREXMA':'FOREXMA',

  'CAYUMANQUI':'CAYUMANQUI SA',
  'CAYUMANQUI SA':'CAYUMANQUI SA',

  'QUILODRAN':'COMERCIAL QUILODRAN S A',
  'COMERCIAL QUILODRAN':'COMERCIAL QUILODRAN S A',
  'COMERCIAL QUILODRAN SA':'COMERCIAL QUILODRAN S A',
  'COMERCIAL QUILODRAN S A':'COMERCIAL QUILODRAN S A',

  'NUBLE':'COMERCIAL FORESTAL NUBLE LTDA',
  'FORESTAL NUBLE':'COMERCIAL FORESTAL NUBLE LTDA',
  'COMERCIAL FORESTAL NUBLE LTDA':'COMERCIAL FORESTAL NUBLE LTDA',

  'C LAGOS':'CESAR LAGOS',
  'CESAR LAGOS':'CESAR LAGOS',

  'D RODRIGUEZ':'DOMINGO ALFONSO RODRIGUEZ PINO',
  'DOMINGO RODRIGUEZ':'DOMINGO ALFONSO RODRIGUEZ PINO',
  'DOMINGO ALFONSO RODRIGUEZ PINO':'DOMINGO ALFONSO RODRIGUEZ PINO',

  'F ARANEDA':'FORESTAL ARANEDA SPA',
  'FORESTAL ARANEDA':'FORESTAL ARANEDA SPA',
  'FORESTAL ARANEDA SPA':'FORESTAL ARANEDA SPA',

  'FRANCISCO ARANEDA':'FRANCISCO ARANEDA ARANEDA',
  'FRANCISCO ARANEDA ARANEDA':'FRANCISCO ARANEDA ARANEDA',

  'BIOCHIPER':'FORESTAL BIOCHIPER LTDA',
  'FORESTAL BIOCHIPER':'FORESTAL BIOCHIPER LTDA',
  'FORESTAL BIO CHIPER':'FORESTAL BIOCHIPER LTDA',
  'FORESTAL BIOCHIPER LTDA':'FORESTAL BIOCHIPER LTDA',

  'TRINIDAD':'FORESTAL LA TRINIDAD SPA',
  'FORESTAL TRINIDAD':'FORESTAL LA TRINIDAD SPA',
  'FORESTAL LA TRINIDAD':'FORESTAL LA TRINIDAD SPA',
  'FORESTAL LA TRINIDAD SPA':'FORESTAL LA TRINIDAD SPA',

  'H SILVA':'HECTOR SILVA',
  'HECTOR SILVA':'HECTOR SILVA',

  'H ZENTENO':'HUGO ZENTENO',
  'HUGO ZENTENO':'HUGO ZENTENO',

  'J ELGUETA':'JHON ELGUETA',
  'JOHN ELGUETA':'JHON ELGUETA',
  'JHON ELGUETA':'JHON ELGUETA',

  'J JARA':'JULIO JORGE LISANDRO JARA',
  'JULIO JARA':'JULIO JORGE LISANDRO JARA',
  'JULIO JORGE LISANDRO JARA':'JULIO JORGE LISANDRO JARA',

  'M MORALES':'MARCO MORALES',
  'MARCO MORALES':'MARCO MORALES',

  'V TORRES':'SERVICIOS FORESTALES VICTOR TORRES',
  'VICTOR TORRES':'SERVICIOS FORESTALES VICTOR TORRES',
  'SERVICIOS FORESTALES VICTOR TORRES':'SERVICIOS FORESTALES VICTOR TORRES',

  'RIO ITATA':'SOCIEDAD BOSQUES RIO ITATA SPA',
  'BOSQUES RIO ITATA':'SOCIEDAD BOSQUES RIO ITATA SPA',
  'SOCIEDAD BOSQUES RIO ITATA SPA':'SOCIEDAD BOSQUES RIO ITATA SPA',

  'X CUNCO':'X-CUNCO SPA',
  'XCUNCO':'X-CUNCO SPA',
  'X CUNCO SPA':'X-CUNCO SPA',
  'X-CUNCO':'X-CUNCO SPA',
  'X-CUNCO SPA':'X-CUNCO SPA',

  'SERFOREST':'SERFORES FYF SPA',
  'SERFORES':'SERFORES FYF SPA',
  'SERFORES FYF SPA':'SERFORES FYF SPA',

  'LOS TRONCOS':'AGRICOLA Y FORESTAL LOS TRONCOS SPA',
  'AGRICOLA Y FORESTAL LOS TRONCOS':'AGRICOLA Y FORESTAL LOS TRONCOS SPA',
  'AGRICOLA Y FORESTAL LOS TRONCOS SPA':'AGRICOLA Y FORESTAL LOS TRONCOS SPA',

  'FORESTAL COELEMU':'ASERRADEROS COELEMU VICTOR GAVILAN',
  'ASERRADEROS COELEMU':'ASERRADEROS COELEMU VICTOR GAVILAN',
  'VICTOR GAVILAN':'ASERRADEROS COELEMU VICTOR GAVILAN',

  'CRISTIAN ARANEDA':'CRISTIAN ARANEDA JIMENEZ Y CIA LTD',
  'CRISTIAN ARANEDA JIMENEZ Y CIA LTD':'CRISTIAN ARANEDA JIMENEZ Y CIA LTD',

  'ANGOL':'ANGOL LMTD',
  'FORESTAL ANGOL':'ANGOL LMTD',
  'ANGOL LMTD':'ANGOL LMTD',

  'CHILE VERDE':'FORESTAL CHILE VERDE SPA',
  'FORESTAL CHILE VERDE':'FORESTAL CHILE VERDE SPA',
  'FORESTAL CHILE VERDE SPA':'FORESTAL CHILE VERDE SPA',

  'SAVI':'SAVI',
  'SERGESAL':'SERGESAL',
  'LAS PALMAS':'LAS PALMAS',
  'LAS ASTAS':'LAS ASTAS',
  'M NAVARRO':'M NAVARRO',
  'P AGUAYO':'P AGUAYO',
  'U MELGAREJO':'U MELGAREJO',
  'PROMASA':'PROMASA',
  'EL MANZANO':'EL MANZANO',
  'FORESTAL COLLICURA':'FORESTAL COLLICURA',
  'FORESTAL LM':'FORESTAL LM'
};

const PREDIO_ALIASES = {
  'LLOHUE':'MASISA LLOHUE',
  'MASISA LLOHUE':'MASISA LLOHUE',
  'LA MONTANA':'MONTAÑA',
  'LA MONTAÑA':'MONTAÑA',
  'MONTAÑA':'MONTAÑA',
  'EL CAPAO':'EL CAPAO',
  'SAN FRANCISCO':'SAN FRANCISCO',
  'CHAPALES':'CHAPALES',
  'NAHUELTORO':'NAHUELTORO'
};

const MASISA_FAENAS = {
  'NAHUELTORO': true,
  'MASISA LLOHUE': true,
  'LLOHUE': true,
  'EL CAPAO': true,
  'SAN FRANCISCO': true,
  'CHAPALES': true,
  'MONTAÑA': true,
  'LA MONTAÑA': true,
  'LA MONTANA': true
};

/** Filas de la hoja Plan que no son origenes sino subtotales. */
const PLAN_ROW_IGNORE = { 'TOTAL':true, 'TOTALES':true, 'SUMA':true, 'TOTAL GENERAL':true };

/*******************************************************
 * ENTRADAS
 *******************************************************/

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Ingresos')
    .addItem('Abrir dashboard', 'abrirDashboard')
    .addSeparator()
    .addItem('Limpiar caché', 'limpiarCache')
    .addToUi();
}

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Dashboard Forestal · Histórico')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function abrirDashboard() {
  const html = HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setWidth(1800)
    .setHeight(980);

  SpreadsheetApp.getUi().showModalDialog(html, 'Dashboard Forestal · Histórico');
}

function limpiarCache() {
  clearBundleCache_();
  SpreadsheetApp.getUi().alert('Caché limpiada. Ahora pulsa Recargar datos.');
}

/*******************************************************
 * BUNDLE
 *******************************************************/

function getBundle(force) {
  const t0 = Date.now();

  if (!force) {
    const cached = getBundleCache_();
    if (cached) {
      cached.fromCache = true;
      return cached;
    }
  }

  const data = readData_();
  const plan = readPlan_();

  const bundle = {
    ok: true,
    fromCache: false,
    generatedAt: new Date().toISOString(),
    buildMs: 0,
    source: {
      spreadsheetId: CONFIG.SPREADSHEET_ID,
      sheetName: CONFIG.SHEET_NAME,
      totalRows: data.n,
      skippedRows: data.skipped,
      minDate: data.minDate,
      maxDate: data.maxDate,
      years: data.years,
      months: data.months
    },
    dicts: data.dicts,
    cols: data.cols,
    caps: data.caps,
    plan: plan.rows,
    planMonths: plan.months,
    planDims: plan.dims,
    hasPlan: plan.rows.length > 0,
    regionOrder: REGION_ORDER,
    aliases: { prov: PROVIDER_ALIASES, pred: PREDIO_ALIASES }
  };

  bundle.buildMs = Date.now() - t0;
  putBundleCache_(bundle);
  return bundle;
}

function getSheet_(name) {
  return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(name);
}

/**
 * Lee Hoja 1 y devuelve estructura columnar.
 * Ademas de las columnas que ya se usaban (cubicacion, fecha, proveedor,
 * predio, comuna, calidad, largo, diametro, cantidad) se incorporan
 * Guia, Hora, Turno, Patente, Estado y Producto, que permiten medir
 * viajes, m3 por viaje, turnos, curva horaria y rechazos.
 */
function readData_() {
  const sh = getSheet_(CONFIG.SHEET_NAME);
  if (!sh) throw new Error('No se encontró la hoja "' + CONFIG.SHEET_NAME + '".');

  const values = sh.getDataRange().getValues();
  if (values.length < 2) throw new Error('Hoja 1 no tiene datos.');

  const headers = values[0].map(normalize_);

  const col = {
    estado: findHeader_(headers, ['estado']),
    producto: findHeader_(headers, ['producto']),
    calTrz: findHeader_(headers, ['cal trz', 'caltrz']),
    calidad: findHeader_(headers, ['calidad']),
    largo: findHeader_(headers, ['largo']),
    diametro: findHeader_(headers, ['diametro', 'diámetro']),
    cantidad: findHeader_(headers, ['cantidad']),
    cubicacion: findHeader_(headers, ['cubicacion', 'cubicación']),
    fecha: findHeader_(headers, ['fecha']),
    hora: findHeader_(headers, ['hora']),
    guia: findHeader_(headers, ['guia', 'guía', 'n guia', 'nro guia']),
    turno: findHeader_(headers, ['turno']),
    patente: findHeader_(headers, ['patente']),
    proveedor: findHeader_(headers, ['proveedor']),
    predio: findHeader_(headers, ['predio']),
    comuna: findHeader_(headers, ['comuna']),
    rol: findHeader_(headers, ['rol', 'rol predial', 'rol avaluo', 'rol avalúo'])
  };

  ['cubicacion','fecha','proveedor','predio','comuna'].forEach(k => {
    if (col[k] === -1) throw new Error('Falta columna obligatoria en Hoja 1: ' + k);
  });

  // Diccionarios internados: solo se transmiten etiquetas unicas.
  const dictDefs = ['prov','pred','com','cal','reg','tur','est','prod','pat'];
  const maps = {}, arrs = {};
  dictDefs.forEach(k => { maps[k] = {}; arrs[k] = []; });

  function intern(kind, label) {
    const map = maps[kind];
    if (Object.prototype.hasOwnProperty.call(map, label)) return map[label];
    const idx = arrs[kind].length;
    arrs[kind].push(label);
    map[label] = idx;
    return idx;
  }

  const cub=[], dia=[], lar=[], qty=[], ymd=[], hrs=[], via=[];
  const prov=[], pred=[], com=[], cal=[], reg=[], tur=[], est=[], prod=[], pat=[];

  const tripMap = {};
  let tripCount = 0;
  let minY = null, maxY = null, skipped = 0;
  const yearsSeen = {}, monthsSeen = {};

  for (let i = 1; i < values.length; i++) {
    const r = values[i];

    const cubic = num_(r[col.cubicacion]);
    const cant = col.cantidad > -1 ? num_(r[col.cantidad]) : 0;
    if (!cubic && !cant) { skipped++; continue; }

    const y = dateToYmd_(r[col.fecha]);
    if (!y) { skipped++; continue; }

    cub.push(round3_(cubic));
    qty.push(cant);
    dia.push(col.diametro > -1 ? num_(r[col.diametro]) : 0);
    lar.push(col.largo > -1 ? num_(r[col.largo]) : 0);
    ymd.push(y);
    hrs.push(col.hora > -1 ? hourFrom_(r[col.hora]) : -1);

    const comunaLimpia = clean_(r[col.comuna]) || 'SIN COMUNA';
    const region = regionFromComuna_(comunaLimpia, col.rol > -1 ? r[col.rol] : '');

    prov.push(intern('prov', cleanProvider_(r[col.proveedor]) || 'SIN PROVEEDOR'));
    pred.push(intern('pred', cleanPredio_(r[col.predio]) || 'SIN PREDIO'));
    com.push(intern('com', comunaLimpia));
    cal.push(intern('cal', qualityLabel_(r[col.calTrz], col.calidad > -1 ? r[col.calidad] : '')));
    reg.push(intern('reg', region));
    tur.push(intern('tur', col.turno > -1 ? (clean_(r[col.turno]) || 'SIN TURNO') : 'SIN TURNO'));
    est.push(intern('est', col.estado > -1 ? (clean_(r[col.estado]) || 'SIN ESTADO') : 'SIN ESTADO'));
    prod.push(intern('prod', col.producto > -1 ? (clean_(r[col.producto]) || 'SIN PRODUCTO') : 'SIN PRODUCTO'));

    const patente = col.patente > -1 ? (clean_(r[col.patente]) || 'SIN PATENTE') : 'SIN PATENTE';
    pat.push(intern('pat', patente));

    // Un "viaje" es una guia dentro de un dia. Si no hay guia se aproxima
    // por patente + dia, que es la mejor senal disponible.
    let tripKey = '';
    if (col.guia > -1) {
      const g = clean_(r[col.guia]);
      tripKey = g ? (g + '|' + y) : ('SG|' + patente + '|' + y);
    } else {
      tripKey = patente + '|' + y;
    }

    let tripId = tripMap[tripKey];
    if (tripId === undefined) {
      tripId = tripCount++;
      tripMap[tripKey] = tripId;
    }
    via.push(tripId);

    if (minY === null || y < minY) minY = y;
    if (maxY === null || y > maxY) maxY = y;

    const yy = Math.floor(y / 10000);
    yearsSeen[yy] = true;
    monthsSeen[yy + '-' + pad2_(Math.floor(y / 100) % 100)] = true;
  }

  return {
    n: cub.length,
    skipped: skipped,
    minDate: ymdToISO_(minY),
    maxDate: ymdToISO_(maxY),
    years: Object.keys(yearsSeen).map(Number).sort(function(a,b){ return a-b; }),
    months: Object.keys(monthsSeen).sort(),
    dicts: {
      prov: arrs.prov, pred: arrs.pred, com: arrs.com, cal: arrs.cal,
      reg: arrs.reg, tur: arrs.tur, est: arrs.est, prod: arrs.prod, pat: arrs.pat
    },
    cols: {
      cub: cub, dia: dia, lar: lar, qty: qty, ymd: ymd, hr: hrs, via: via,
      prov: prov, pred: pred, com: com, cal: cal, reg: reg,
      tur: tur, est: est, prod: prod, pat: pat
    },
    caps: {
      viajes: col.guia > -1 || col.patente > -1,
      guia: col.guia > -1,
      hora: col.hora > -1,
      turno: col.turno > -1,
      patente: col.patente > -1,
      estado: col.estado > -1,
      producto: col.producto > -1,
      totalViajes: tripCount
    }
  };
}

/**
 * Plan:
 * Proveedores = proveedor padre.
 * Origen      = faena SOLO para MASISA; para el resto, Origen es el proveedor.
 * Si la hoja Plan trae ademas Comuna o Region, se capturan para poder
 * comparar plan vs real tambien filtrando por territorio.
 */
function readPlan_() {
  const empty = { rows: [], months: [], dims: { prov: true, pred: true, com: false, reg: false } };

  const sh = getSheet_(CONFIG.PLAN_SHEET_NAME);
  if (!sh) return empty;

  const values = sh.getDataRange().getValues();
  if (values.length < 2) return empty;

  const rawHeaders = values[0];
  const headers = rawHeaders.map(normalize_);

  const cProv = findHeader_(headers, ['proveedor', 'proveedores']);
  const cOrigen = findHeader_(headers, ['origen', 'predio', 'faena']);
  const cCom = findHeader_(headers, ['comuna']);
  const cReg = findHeader_(headers, ['region', 'región']);

  if (cProv === -1 || cOrigen === -1) {
    throw new Error('La hoja Plan debe tener columnas Proveedores y Origen.');
  }

  const monthCols = [];
  for (let j = 0; j < rawHeaders.length; j++) {
    if (j === cProv || j === cOrigen || j === cCom || j === cReg) continue;
    const mk = toMesKey_(rawHeaders[j]);
    if (mk) monthCols.push({ col: j, mesKey: mk });
  }

  if (!monthCols.length) {
    throw new Error('No se encontraron columnas de meses en Plan.');
  }

  const out = [];
  const monthsSeen = {};
  let proveedorActual = '';

  for (let i = 1; i < values.length; i++) {
    const r = values[i];

    const provCell = cleanProvider_(r[cProv]);
    // El proveedor padre se arrastra aunque la fila no traiga origen.
    if (provCell && !PLAN_ROW_IGNORE[provCell]) proveedorActual = provCell;

    const origenRaw = r[cOrigen];
    const origenPredio = cleanPredio_(origenRaw);
    const origenProveedor = cleanProvider_(origenRaw);

    if (!origenPredio) continue;
    if (PLAN_ROW_IGNORE[origenPredio]) continue;

    let proveedorPlan = '';
    let predioPlan = '';

    if (proveedorActual === 'MASISA SA' && MASISA_FAENAS[origenPredio]) {
      proveedorPlan = 'MASISA SA';
      predioPlan = origenPredio;
    } else {
      proveedorPlan = origenProveedor;
      predioPlan = '';
    }

    if (!proveedorPlan) continue;

    const comunaPlan = cCom > -1 ? clean_(r[cCom]) : '';
    const regionPlan = cReg > -1
      ? String(r[cReg] || '').trim()
      : (comunaPlan ? regionFromComuna_(comunaPlan, '') : '');

    for (let k = 0; k < monthCols.length; k++) {
      const m = monthCols[k];
      const planM3 = num_(r[m.col]);
      if (!planM3) continue;

      out.push({
        mesKey: m.mesKey,
        prov: proveedorPlan,
        pred: predioPlan,
        com: comunaPlan,
        reg: regionPlan,
        plan: round2_(planM3)
      });

      monthsSeen[m.mesKey] = true;
    }
  }

  return {
    rows: out,
    months: Object.keys(monthsSeen).sort(),
    dims: { prov: true, pred: true, com: cCom > -1, reg: cReg > -1 || cCom > -1 }
  };
}

/*******************************************************
 * NORMALIZACION
 *******************************************************/

function regionFromComuna_(comuna, rol) {
  const comunaKey = clean_(comuna);
  const rolKey = clean_(rol);
  const exactKey = comunaKey + '|' + rolKey;
  return REGION_BY_COMUNA_ROL[exactKey] || REGION_BY_COMUNA[comunaKey] || 'Sin región';
}

function normalize_(v) {
  return String(v || '').toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\./g, ' ')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ');
}

function clean_(v) {
  return String(v || '').trim().toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[.\-_,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanProvider_(v) {
  const key = clean_(v);
  return clean_(PROVIDER_ALIASES[key] || key);
}

function cleanPredio_(v) {
  const key = clean_(v);
  return clean_(PREDIO_ALIASES[key] || key);
}

function num_(v) {
  if (typeof v === 'number') return isFinite(v) ? v : 0;

  const t = String(v || '').trim().replace(/\s/g, '');
  if (!t) return 0;

  let norm = t;
  if (/,/.test(norm)) norm = norm.replace(/\./g, '').replace(',', '.');

  const n = Number(norm);
  return isFinite(n) ? n : 0;
}

function round2_(n) { return Math.round(n * 100) / 100; }
function round3_(n) { return Math.round(n * 1000) / 1000; }
function pad2_(n) { return ('0' + n).slice(-2); }

function findHeader_(headers, aliases) {
  const al = aliases.map(normalize_);
  for (let i = 0; i < headers.length; i++) {
    if (al.indexOf(headers[i]) !== -1) return i;
  }
  return -1;
}

function qualityLabel_(calTrz, fallback) {
  const key = String(calTrz == null ? '' : calTrz).trim().replace(/\.0+$/, '');
  if (key === '1') return 'SINIESTRADO';
  if (key === '2') return 'VERDE';
  if (key === '3') return 'MANCHADO';
  return clean_(fallback) || 'SIN CALIDAD';
}

function dateToYmd_(v) {
  let d = null;

  if (v instanceof Date && !isNaN(v)) {
    d = v;
  } else {
    const t = String(v || '').trim();
    if (!t) return null;

    let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) d = new Date(+m[1], +m[2] - 1, +m[3]);
    else {
      m = t.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
      if (m) d = new Date(+m[3], +m[2] - 1, +m[1]);
      else {
        const dd = new Date(t);
        if (!isNaN(dd)) d = dd;
      }
    }
  }

  if (!d) return null;
  return parseInt(Utilities.formatDate(d, CONFIG.TIMEZONE, 'yyyyMMdd'), 10);
}

function hourFrom_(v) {
  if (v instanceof Date && !isNaN(v)) return v.getHours();

  const t = String(v || '').trim();
  if (!t) return -1;

  const m = t.match(/(\d{1,2}):(\d{2})/);
  if (m) {
    const h = parseInt(m[1], 10);
    return (h >= 0 && h <= 23) ? h : -1;
  }

  // Google Sheets puede entregar la hora como fraccion de dia.
  const n = Number(t.replace(',', '.'));
  if (isFinite(n) && n > 0 && n < 1) return Math.floor(n * 24);

  return -1;
}

function ymdToISO_(y) {
  if (!y) return '';
  const s = String(y);
  return s.slice(0, 4) + '-' + s.slice(4, 6) + '-' + s.slice(6, 8);
}

function toMesKey_(v) {
  if (v instanceof Date && !isNaN(v)) {
    return Utilities.formatDate(v, CONFIG.TIMEZONE, 'yyyy-MM');
  }

  const t = String(v || '').trim();
  if (!t) return '';

  const monthMap = {
    ene:'01', enero:'01',
    feb:'02', febrero:'02',
    mar:'03', marzo:'03',
    abr:'04', abril:'04',
    may:'05', mayo:'05',
    jun:'06', junio:'06',
    jul:'07', julio:'07',
    ago:'08', agosto:'08',
    sep:'09', sept:'09', septiembre:'09',
    oct:'10', octubre:'10',
    nov:'11', noviembre:'11',
    dic:'12', diciembre:'12'
  };

  const low = t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  let m = low.match(/^([a-z]+)[-\/ .]+(\d{2,4})$/);
  if (m && monthMap[m[1]]) {
    const yr = m[2].length === 2 ? '20' + m[2] : m[2];
    return yr + '-' + monthMap[m[1]];
  }

  m = low.match(/^(\d{4})[-\/](\d{1,2})/);
  if (m) return m[1] + '-' + pad2_(+m[2]);

  m = low.match(/^(\d{1,2})[-\/](\d{4})$/);
  if (m) return m[2] + '-' + pad2_(+m[1]);

  const y = dateToYmd_(v);
  return y ? ymdToISO_(y).slice(0, 7) : '';
}

/*******************************************************
 * CACHE (con gzip para bajar el numero de chunks)
 *******************************************************/

function putBundleCache_(bundle) {
  try {
    const cache = CacheService.getScriptCache();
    let str = JSON.stringify(bundle);
    let gz = false;

    if (CONFIG.USE_GZIP_CACHE) {
      try {
        str = compress_(str);
        gz = true;
      } catch (e) {
        Logger.log('gzip falló, se guarda plano: ' + e);
      }
    }

    const payload = {};
    let chunks = 0;

    for (let i = 0; i < str.length; i += CONFIG.CHUNK_SIZE) {
      payload[CONFIG.CACHE_PREFIX + chunks] = str.substring(i, i + CONFIG.CHUNK_SIZE);
      chunks++;
    }

    payload[CONFIG.CACHE_PREFIX + 'META'] = JSON.stringify({ chunks: chunks, gz: gz });
    cache.putAll(payload, CONFIG.CACHE_SECONDS);
  } catch (err) {
    Logger.log('No se pudo cachear: ' + err);
  }
}

function getBundleCache_() {
  try {
    const cache = CacheService.getScriptCache();
    const metaRaw = cache.get(CONFIG.CACHE_PREFIX + 'META');
    if (!metaRaw) return null;

    const meta = JSON.parse(metaRaw);
    const keys = [];
    for (let i = 0; i < meta.chunks; i++) keys.push(CONFIG.CACHE_PREFIX + i);

    const map = cache.getAll(keys);
    let str = '';

    for (let j = 0; j < meta.chunks; j++) {
      const part = map[CONFIG.CACHE_PREFIX + j];
      if (part == null) return null;
      str += part;
    }

    if (meta.gz) str = decompress_(str);
    return JSON.parse(str);
  } catch (err) {
    Logger.log('No se pudo leer caché: ' + err);
    return null;
  }
}

function clearBundleCache_() {
  try {
    const cache = CacheService.getScriptCache();
    const metaRaw = cache.get(CONFIG.CACHE_PREFIX + 'META');
    const keys = [CONFIG.CACHE_PREFIX + 'META'];

    if (metaRaw) {
      const meta = JSON.parse(metaRaw);
      for (let i = 0; i < meta.chunks; i++) keys.push(CONFIG.CACHE_PREFIX + i);
    }

    cache.removeAll(keys);
  } catch (err) {
    Logger.log('No se pudo limpiar caché: ' + err);
  }
}

function compress_(str) {
  const blob = Utilities.newBlob(str, 'application/json', 'bundle.json');
  return Utilities.base64Encode(Utilities.gzip(blob).getBytes());
}

function decompress_(b64) {
  const blob = Utilities.newBlob(Utilities.base64Decode(b64), 'application/x-gzip', 'bundle.gz');
  return Utilities.ungzip(blob).getDataAsString();
}

/*******************************************************
 * EXPORTAR A GOOGLE SLIDES
 * El cliente captura cada grafico como PNG con
 * getImageURI() y aqui se arma la presentacion.
 *******************************************************/

function crearPresentacion(payload) {
  if (!payload || !payload.imagenes || !payload.imagenes.length) {
    throw new Error('No llegaron gráficos que insertar.');
  }

  const titulo = String(payload.titulo || 'Ingresos forestales').slice(0, 120);
  const pres = SlidesApp.create(titulo);

  const ANCHO = pres.getPageWidth();
  const ALTO = pres.getPageHeight();
  const MARGEN = 40;

  // --- portada ---
  const portada = pres.getSlides()[0];
  setPlaceholder_(portada, SlidesApp.PlaceholderType.TITLE, titulo);
  setPlaceholder_(portada, SlidesApp.PlaceholderType.SUBTITLE,
    'Periodo ' + (payload.periodo || '') +
    '\nComparación: ' + (payload.comparacion || 'sin comparación') +
    '\n' + (payload.filtros || ''));

  // --- resumen de cifras ---
  if (payload.metricas && payload.metricas.length) {
    const resumen = pres.appendSlide(SlidesApp.PredefinedLayout.TITLE_AND_BODY);
    setPlaceholder_(resumen, SlidesApp.PlaceholderType.TITLE, 'Resumen del periodo');
    setPlaceholder_(resumen, SlidesApp.PlaceholderType.BODY, payload.metricas.join('\n'));
  }

  // --- un gráfico por lámina ---
  let insertados = 0;

  payload.imagenes.forEach(function (img) {
    const partes = String(img && img.uri || '').split(',');
    if (partes.length < 2) return;

    let blob;
    try {
      blob = Utilities.newBlob(Utilities.base64Decode(partes[1]), 'image/png',
                               (img.id || 'grafico') + '.png');
    } catch (err) {
      Logger.log('Imagen ilegible (' + img.id + '): ' + err);
      return;
    }

    const slide = pres.appendSlide(SlidesApp.PredefinedLayout.TITLE_ONLY);
    setPlaceholder_(slide, SlidesApp.PlaceholderType.TITLE, String(img.titulo || img.id || ''));

    const pic = slide.insertImage(blob);
    const w0 = pic.getWidth(), h0 = pic.getHeight();

    const maxW = ANCHO - MARGEN * 2;
    const maxH = ALTO - 150;
    const escala = Math.min(maxW / w0, maxH / h0);

    pic.setWidth(w0 * escala)
       .setHeight(h0 * escala)
       .setLeft((ANCHO - w0 * escala) / 2)
       .setTop(105);

    ponerPie_(slide, ANCHO, ALTO, payload.periodo, payload.filtros);
    insertados++;
  });

  if (!insertados) {
    throw new Error('Ninguna de las imágenes recibidas se pudo decodificar.');
  }

  pres.saveAndClose();
  return pres.getUrl();
}

/** Escribe en un marcador de posición; si la plantilla no lo trae, no falla. */
function setPlaceholder_(slide, tipo, texto) {
  try {
    const ph = slide.getPlaceholder(tipo);
    if (ph) {
      ph.asShape().getText().setText(texto);
      return;
    }
  } catch (err) {
    Logger.log('No se pudo escribir el marcador ' + tipo + ': ' + err);
  }

  // Sin marcador disponible se inserta una caja de texto arriba.
  try {
    slide.insertTextBox(texto, 40, 30, slide.getParentPresentation().getPageWidth() - 80, 50);
  } catch (err2) {
    Logger.log('Tampoco se pudo insertar la caja de texto: ' + err2);
  }
}

function ponerPie_(slide, ancho, alto, periodo, filtros) {
  try {
    const pie = slide.insertTextBox(
      [periodo || '', filtros || ''].filter(String).join('  ·  '),
      40, alto - 34, ancho - 80, 22
    );
    const estilo = pie.getText().getTextStyle();
    estilo.setFontSize(8);
    estilo.setForegroundColor('#7a7a7a');
  } catch (err) {
    Logger.log('No se pudo poner el pie: ' + err);
  }
}

/*******************************************************
 * DIAGNOSTICO (util desde el editor de Apps Script)
 *******************************************************/

function diagnostico() {
  const b = getBundle(true);
  const lines = [
    'Filas válidas: ' + b.source.totalRows,
    'Filas descartadas: ' + b.source.skippedRows,
    'Rango: ' + b.source.minDate + ' a ' + b.source.maxDate,
    'Años: ' + b.source.years.join(', '),
    'Meses con datos: ' + b.source.months.length,
    'Proveedores: ' + b.dicts.prov.length,
    'Comunas: ' + b.dicts.com.length,
    'Predios: ' + b.dicts.pred.length,
    'Viajes detectados: ' + b.caps.totalViajes,
    'Columnas extra -> guía:' + b.caps.guia + ' hora:' + b.caps.hora +
      ' turno:' + b.caps.turno + ' patente:' + b.caps.patente + ' estado:' + b.caps.estado,
    'Plan: ' + (b.hasPlan ? b.plan.length + ' registros en ' + b.planMonths.length + ' meses' : 'no cargado'),
    'Meses de plan: ' + b.planMonths.join(', '),
    'Build: ' + b.buildMs + ' ms'
  ];

  Logger.log(lines.join('\n'));
  return lines.join('\n');
}
