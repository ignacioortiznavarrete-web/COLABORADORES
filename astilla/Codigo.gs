/**
 * ASTILLA · SAP + COMPLEMENTO PLANILLA SUB-PRODUCTOS
 *
 * Unidad de trabajo: TONELADA SECA (TS).
 *
 * Fuentes:
 * - Ingresos: descarga de SAP con la cantidad real por Fecha Contab.
 *   Es la fuente válida; manda siempre.
 * - InformeAstilla: detalle diario importado desde los correos
 *   "PLANILLA CUMPLIMIENTO SUB-PRODUCTOS ...". Solo sirve para tapar
 *   el hueco mientras SAP va desfasado.
 *
 * Regla de complemento (idéntica a MetroRuma):
 * - Hasta la última Fecha Contab. se usan únicamente los datos de SAP.
 * - Desde el día siguiente y hasta la última planilla recibida se usa
 *   CAMIONES × FACTOR_CAMION.
 * - Un día que ya existe en SAP nunca se complementa: cuando SAP
 *   avanza, el estimado de ese día desaparece solo.
 *
 * Sub-productos que entran a proceso (el resto de la planilla se
 * ignora: aserrín, álamo, pino combustible, etc.):
 *   ASTILLA EUCALYPTUS NITENS
 *   AST. PINO VERDE C/ CORTEZA
 *   ASTILLA PINO VERDE
 *
 * Plan diario en días hábiles:
 * - El plan mensual se prorratea linealmente entre los días hábiles
 *   del mes (WORKDAYS y FERIADOS).
 * - "Plan a la fecha" = Plan × días hábiles transcurridos / días
 *   hábiles del mes, tomando como referencia la mayor entre la última
 *   Fecha Contab. y la última planilla.
 *
 * Limitación conocida (pendiente):
 * - readPlan_ lee solo la columna del mes calendario vigente. Si en el
 *   dashboard se filtra un rango de otro mes, el plan mostrado sigue
 *   siendo el del mes actual y el desvío queda mal. Mientras no se
 *   resuelva, usar el filtro de fechas por defecto (mes vigente).
 */

const CONFIG = Object.freeze({
  SPREADSHEET_ID: '1PNQToRtF7g-obmmOHuoonNGN5-VhhTYnW6SEhK36EOk',
  SHEET_INGRESOS: 'Ingresos',
  SHEET_INFORME: 'InformeAstilla',
  SHEET_PLAN: 'PlanAstilla',
  HTML_FILE: 'Index',
  TIMEZONE: 'America/Santiago',

  // Toneladas secas por camión.
  FACTOR_CAMION: 11,
  UNIDAD: 'TS',

  // Códigos de material de SAP que cuentan como astilla a proceso.
  // OJO: SAP no desglosa sub-productos. Todo el ingreso llega como
  // "ASTILLA VERDE (TS)" bajo el material 3000039; el desglose en
  // NITENS / PINO VERDE C/CORTEZA / PINO VERDE solo existe en la
  // planilla que llega por Gmail.
  SAP_MATERIALES: Object.freeze(['3000039']),

  // Meses de historia que viajan al dashboard (el mes vigente
  // siempre entra). Súbelo si quieres más estadística.
  HISTORY_MONTHS: 6,

  FUZZY_THRESHOLD: 0.72,

  // 0=domingo ... 6=sábado. Agrega el 6 si trabajan sábados.
  WORKDAYS: Object.freeze([1, 2, 3, 4, 5]),

  // Feriados excluidos del prorrateo, formato 'yyyy-MM-dd'.
  // Lista tomada del dashboard MASISA GIS de este mismo repositorio
  // (apps-script/Code.gs). Sin esto, el 18 de septiembre y el 1 de
  // mayo cuentan como días hábiles y el plan a la fecha queda inflado.
  FERIADOS: Object.freeze([
    '2024-01-01', '2024-04-19', '2024-05-01', '2024-05-21',
    '2024-06-20', '2024-06-29', '2024-07-16', '2024-08-15',
    '2024-09-18', '2024-09-19', '2024-10-12', '2024-10-31',
    '2024-11-01', '2024-12-08', '2024-12-25',

    '2025-01-01', '2025-04-18', '2025-04-19', '2025-05-01',
    '2025-05-21', '2025-06-20', '2025-06-29', '2025-07-16',
    '2025-08-15', '2025-09-18', '2025-09-19', '2025-10-12',
    '2025-10-31', '2025-11-01', '2025-12-08', '2025-12-25',

    '2026-01-01', '2026-04-03', '2026-04-04', '2026-05-01',
    '2026-05-21', '2026-06-29', '2026-07-16', '2026-08-15',
    '2026-09-18', '2026-09-19', '2026-09-21', '2026-10-12',
    '2026-10-31', '2026-11-01', '2026-12-08', '2026-12-25'
  ]),

  GMAIL_LABEL: '',
  GMAIL_SUBJECT: 'CUMPLIMIENTO SUB-PRODUCTOS',
  GMAIL_PROCESSED_LABEL: 'Astilla/Planilla procesada',
  GMAIL_SEARCH_DAYS: 120,
  GMAIL_MAX_THREADS: 300,
  TRIGGER_MINUTES: 15,

  // Posición de respaldo de las columnas de Ingresos (base cero),
  // con el mismo layout de la descarga de SAP de MetroRuma.
  // Si la hoja trae encabezados, se detectan por nombre y esto no
  // se usa.
  INGRESOS_COLUMNS: Object.freeze({
    MATERIAL: 2,
    DESCRIPCION_MATERIAL: 3,
    FECHA_CONTABLE: 4,
    CANTIDAD: 8,
    UM: 10,
    DESCRIPCION_PROVEEDOR: 12,
    ROL: 15,
    PREDIO: 16
  })
});

const SUBPRODUCTOS_OBJETIVO = Object.freeze([
  'ASTILLA EUCALYPTUS NITENS',
  'AST. PINO VERDE C/ CORTEZA',
  'ASTILLA PINO VERDE'
]);

/**
 * Lo que SAP entrega sin desglosar. No se puede repartir entre los
 * tres sub-productos de arriba, así que vive en su propio bucket.
 */
const SUBPRODUCTO_SAP = 'ASTILLA VERDE (TOTAL SAP)';

const INFORME_HEADERS = Object.freeze([
  'Fecha Informe',
  'Fecha ISO',
  'Subproducto Planilla',
  'Subproducto',
  'Proveedor Planilla',
  'Destino',
  'Camiones',
  'Factor',
  'TS Estimadas',
  'Asunto',
  'Message ID',
  'Remitente',
  'Fecha correo',
  'Fecha procesamiento',
  'Estado',
  'Método extracción'
]);

/* =====================================================================
 * MENÚ Y APLICACIÓN WEB
 * ===================================================================== */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Astilla Dashboard')
    .addItem('Abrir dashboard', 'abrirDashboard')
    .addSeparator()
    .addItem(
      'Importar nuevas planillas',
      'procesarPlanillasGmail'
    )
    .addItem(
      'Reconstruir planillas desde Gmail',
      'reconstruirPlanillas'
    )
    .addSeparator()
    .addItem(
      'Probar último correo (sin escribir)',
      'probarUltimoCorreo'
    )
    .addItem(
      'Diagnosticar hoja de SAP',
      'diagnosticarIngresos'
    )
    .addItem(
      'Diagnosticar cruce SAP vs planilla',
      'diagnosticarCruce'
    )
    .addSeparator()
    .addItem('Instalar automatización', 'instalarDisparador')
    .addItem('Eliminar automatización', 'eliminarDisparadores')
    .addToUi();
}

function doGet() {
  return HtmlService
    .createTemplateFromFile(CONFIG.HTML_FILE)
    .evaluate()
    .setTitle('Astilla · SAP vs planilla')
    .setXFrameOptionsMode(
      HtmlService.XFrameOptionsMode.ALLOWALL
    );
}

function abrirDashboard() {
  const output = HtmlService
    .createTemplateFromFile(CONFIG.HTML_FILE)
    .evaluate()
    .setWidth(1700)
    .setHeight(950);

  SpreadsheetApp.getUi().showModalDialog(
    output,
    'Astilla · SAP vs planilla'
  );
}

/* =====================================================================
 * API DEL DASHBOARD
 * ===================================================================== */

function getDashboardData() {
  const spreadsheet = SpreadsheetApp.openById(
    CONFIG.SPREADSHEET_ID
  );

  const timezone =
    spreadsheet.getSpreadsheetTimeZone() ||
    CONFIG.TIMEZONE;

  const month = getCurrentMonthWindow_(timezone);
  const historyStart = buildHistoryStart_(month);

  const sap = readIngresos_(
    spreadsheet,
    timezone,
    historyStart
  );

  const informe = readInformeRows_(
    spreadsheet,
    timezone,
    historyStart,
    sap.proveedores
  );

  const supplement = buildSupplementRows_(
    sap.rows,
    informe.rows
  );

  const rows = sap.rows.concat(supplement.rows);

  const workdays = buildWorkdaysInfo_(
    timezone,
    month,
    supplement.lastActualDate,
    supplement.latestReportDate
  );

  const plan = readPlan_(spreadsheet, month);

  return {
    generatedAt: Utilities.formatDate(
      new Date(),
      timezone,
      "yyyy-MM-dd'T'HH:mm:ss"
    ),
    timezone: timezone,
    unidad: CONFIG.UNIDAD,
    factor: CONFIG.FACTOR_CAMION,
    month: month,
    workdays: workdays,
    subproductos: SUBPRODUCTOS_OBJETIVO.slice(),
    source: {
      spreadsheetName: spreadsheet.getName(),
      spreadsheetUrl: spreadsheet.getUrl(),
      missingIngresos: sap.missingSheet,
      missingInforme: informe.missingSheet,
      sapRows: sap.rows.length,
      sapIgnored: sap.ignored,
      informeRows: informe.rows.length,
      supplementRows: supplement.rows.length,
      supplementCamiones: supplement.camiones,
      reports: informe.reports,
      errors: informe.errors,
      lastActualDate: supplement.lastActualDate,
      lastActualDateLabel: supplement.lastActualDate
        ? formatDateKey_(supplement.lastActualDate)
        : 'Sin datos SAP',
      supplementStart: supplement.supplementStart,
      supplementStartLabel: supplement.supplementStart
        ? formatDateKey_(supplement.supplementStart)
        : 'Sin complemento',
      latestReportDate: supplement.latestReportDate,
      latestReportDateLabel: supplement.latestReportDate
        ? formatDateKey_(supplement.latestReportDate)
        : 'Sin planilla',
      staleReports: supplement.staleReports,
      hasPlan: plan.rows.length > 0,
      materialesSinReconocer: sap.materialesSinReconocer
    },
    filters: {
      subproductos: uniqueSorted_(
        rows.map(function(item) {
          return item.subproducto;
        })
      ),
      proveedores: uniqueSorted_(
        rows.map(function(item) {
          return item.proveedor;
        })
      )
    },
    plan: plan.rows,
    rows: rows
  };
}

function buildHistoryStart_(month) {
  const back = Math.max(
    0,
    Number(CONFIG.HISTORY_MONTHS) - 1
  );

  const date = new Date(
    Date.UTC(month.year, month.month - 1 - back, 1)
  );

  return buildDateKey_(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    1
  );
}

/* =====================================================================
 * LECTURA DE SAP (HOJA INGRESOS)
 * ===================================================================== */

function readIngresos_(spreadsheet, timezone, historyStart) {
  const sheet = spreadsheet.getSheetByName(
    CONFIG.SHEET_INGRESOS
  );

  if (!sheet || sheet.getLastRow() < 2) {
    return {
      rows: [],
      proveedores: [],
      ignored: 0,
      skipped: {
        sinFecha: 0,
        fueraDeHistoria: 0,
        materialNoReconocido: 0
      },
      columns: null,
      headers: [],
      totalRows: 0,
      materialesSinReconocer: [],
      missingSheet: !sheet
    };
  }

  const range = sheet.getDataRange();
  const values = range.getValues();
  const displayed = range.getDisplayValues();
  const columns = resolveIngresosColumns_(values[0]);

  const rows = [];
  const noMatch = {};

  const skipped = {
    sinFecha: 0,
    fueraDeHistoria: 0,
    materialNoReconocido: 0
  };

  let ignored = 0;

  for (
    let rowIndex = 1;
    rowIndex < values.length;
    rowIndex++
  ) {
    const row = values[rowIndex];
    const displayRow = displayed[rowIndex] || [];

    const dateKey = toDateKey_(
      row[columns.FECHA_CONTABLE],
      displayRow[columns.FECHA_CONTABLE],
      timezone
    );

    if (!dateKey) {
      skipped.sinFecha++;
      continue;
    }

    if (dateKey < historyStart) {
      skipped.fueraDeHistoria++;
      continue;
    }

    const descripcion = text_(
      row[columns.DESCRIPCION_MATERIAL]
    );

    const subproducto =
      canonicalSubproducto_(descripcion) ||
      canonicalSubproducto_(row[columns.MATERIAL]) ||
      subproductoPorMaterial_(row[columns.MATERIAL]);

    if (!subproducto) {
      ignored++;
      skipped.materialNoReconocido++;

      if (descripcion) {
        noMatch[descripcion] = true;
      }

      continue;
    }

    const proveedor =
      text_(row[columns.DESCRIPCION_PROVEEDOR]) ||
      'SIN PROVEEDOR';

    rows.push({
      fecha: dateKey,
      fechaNumero: Number(dateKey.replace(/-/g, '')),
      fechaLabel: formatDateKey_(dateKey),
      source: 'SAP',
      subproducto: subproducto,
      subproductoRaw: descripcion,
      proveedor: proveedor,
      proveedorRaw: proveedor,
      matchMethod: 'SAP',
      matchScore: 1,
      destino: '',
      camiones: null,
      factor: null,
      ts: toNumber_(
        row[columns.CANTIDAD],
        displayRow[columns.CANTIDAD]
      ),
      um: text_(row[columns.UM]) || CONFIG.UNIDAD,
      predio: text_(row[columns.PREDIO]),
      rol: text_(row[columns.ROL]),
      messageId: ''
    });
  }

  return {
    rows: rows,
    proveedores: uniqueSorted_(
      rows.map(function(item) {
        return item.proveedor;
      })
    ),
    ignored: ignored,
    skipped: skipped,
    columns: columns,
    headers: values[0].map(text_),
    totalRows: values.length - 1,
    materialesSinReconocer: Object.keys(noMatch).sort(),
    missingSheet: false
  };
}

/**
 * Ubica las columnas de Ingresos por nombre de encabezado y, si la
 * descarga no los trae, cae a las posiciones fijas de CONFIG.
 */
function resolveIngresosColumns_(headerRow) {
  const map = buildHeaderMap_(headerRow);
  const keys = Object.keys(map);

  function pick(names, fallback) {
    // 1) Coincidencia exacta. Va primero para que una hoja con
    //    "Proveedor" (código) y "Des. Proveedor" (nombre) elija el
    //    nombre y no el código.
    for (let index = 0; index < names.length; index++) {
      if (map[names[index]] !== undefined) {
        return map[names[index]];
      }
    }

    // 2) El encabezado empieza por el alias. Necesario porque SAP
    //    exporta títulos como "Proveedor Origen (RUT + NOMBRE )",
    //    que ningún alias exacto puede cubrir.
    for (let index = 0; index < names.length; index++) {
      for (let k = 0; k < keys.length; k++) {
        if (keys[k].indexOf(names[index]) === 0) {
          return map[keys[k]];
        }
      }
    }

    return fallback;
  }

  const defaults = CONFIG.INGRESOS_COLUMNS;

  return {
    MATERIAL: pick(
      ['material', 'cod material', 'codigo material'],
      defaults.MATERIAL
    ),
    DESCRIPCION_MATERIAL: pick(
      [
        'descripcion material',
        'des material',
        'desc material',
        'texto breve material',
        'descripcion del material'
      ],
      defaults.DESCRIPCION_MATERIAL
    ),
    FECHA_CONTABLE: pick(
      [
        'fecha contab',
        'fecha contable',
        'fecha contabilizacion'
      ],
      defaults.FECHA_CONTABLE
    ),
    CANTIDAD: pick(
      [
        'cantidad',
        'cantidad ts',
        'recepcion',
        'volumen',
        'ts'
      ],
      defaults.CANTIDAD
    ),
    UM: pick(
      [
        'um',
        'unidad medida pedido',
        'unidad medida',
        'unidad'
      ],
      defaults.UM
    ),
    DESCRIPCION_PROVEEDOR: pick(
      [
        'descripcion proveedor',
        'des proveedor',
        'proveedor origen',
        'nombre proveedor',
        'proveedor'
      ],
      defaults.DESCRIPCION_PROVEEDOR
    ),
    ROL: pick(['rol'], defaults.ROL),
    PREDIO: pick(['predio'], defaults.PREDIO)
  };
}

/* =====================================================================
 * LECTURA DE LA PLANILLA IMPORTADA
 * ===================================================================== */

/**
 * Se queda con el correo más reciente de cada fecha, de modo que una
 * planilla corregida reemplace a la original sin duplicar camiones.
 * Los nombres de proveedor se homologan contra los de SAP.
 */
function readInformeRows_(
  spreadsheet,
  timezone,
  historyStart,
  proveedoresSap
) {
  const sheet = spreadsheet.getSheetByName(
    CONFIG.SHEET_INFORME
  );

  if (!sheet || sheet.getLastRow() < 2) {
    return {
      rows: [],
      reports: 0,
      errors: 0,
      missingSheet: !sheet
    };
  }

  const range = sheet.getDataRange();
  const values = range.getValues();
  const displayed = range.getDisplayValues();
  const map = buildHeaderMap_(values[0]);

  const required = [
    'fecha iso',
    'subproducto',
    'proveedor planilla',
    'camiones',
    'message id',
    'estado'
  ];

  const missing = required.filter(function(key) {
    return map[key] === undefined;
  });

  if (missing.length) {
    throw new Error(
      'La hoja ' +
      CONFIG.SHEET_INFORME +
      ' no tiene las columnas: ' +
      missing.join(', ') +
      '. Ejecuta "Reconstruir planillas desde Gmail".'
    );
  }

  const byDate = {};
  let errors = 0;

  for (
    let rowIndex = 1;
    rowIndex < values.length;
    rowIndex++
  ) {
    const row = values[rowIndex];
    const displayRow = displayed[rowIndex] || [];

    if (text_(row[map['estado']]) !== 'OK') {
      errors++;
      continue;
    }

    const dateKey =
      parseDateText_(displayRow[map['fecha iso']]) ||
      toDateKey_(
        row[map['fecha informe']],
        displayRow[map['fecha informe']],
        timezone
      );

    if (!dateKey || dateKey < historyStart) {
      continue;
    }

    const messageId = text_(row[map['message id']]);

    const emailDate =
      row[map['fecha correo']] instanceof Date
        ? row[map['fecha correo']].getTime()
        : 0;

    if (
      !byDate[dateKey] ||
      emailDate > byDate[dateKey].emailDate
    ) {
      byDate[dateKey] = {
        messageId: messageId,
        emailDate: emailDate,
        rows: []
      };
    }

    if (byDate[dateKey].messageId !== messageId) {
      continue;
    }

    const camiones = toNumber_(
      row[map['camiones']],
      displayRow[map['camiones']]
    );

    const factor =
      toNumber_(
        row[map['factor']],
        displayRow[map['factor']]
      ) || CONFIG.FACTOR_CAMION;

    const proveedorRaw =
      text_(row[map['proveedor planilla']]) ||
      'SIN PROVEEDOR';

    const match = resolveProveedor_(
      proveedorRaw,
      proveedoresSap
    );

    byDate[dateKey].rows.push({
      fecha: dateKey,
      fechaNumero: Number(dateKey.replace(/-/g, '')),
      fechaLabel: formatDateKey_(dateKey),
      source: 'PLANILLA',
      subproducto: text_(row[map['subproducto']]),
      subproductoRaw: text_(
        row[map['subproducto planilla']]
      ),
      proveedor: match.proveedor,
      proveedorRaw: proveedorRaw,
      matchMethod: match.method,
      matchScore: match.score,
      destino: text_(row[map['destino']]),
      camiones: camiones,
      factor: factor,
      ts: camiones * factor,
      um: CONFIG.UNIDAD,
      predio: '',
      rol: '',
      messageId: messageId
    });
  }

  const rows = [];

  Object.keys(byDate)
    .sort()
    .forEach(function(dateKey) {
      byDate[dateKey].rows.forEach(function(item) {
        rows.push(item);
      });
    });

  return {
    rows: rows,
    reports: Object.keys(byDate).length,
    errors: errors,
    missingSheet: false
  };
}

/* =====================================================================
 * COMPLEMENTO: SAP MANDA, LA PLANILLA TAPA EL HUECO
 * ===================================================================== */

function buildSupplementRows_(sapRows, informeRows) {
  const lastActualDate = sapRows.reduce(
    function(maxDate, item) {
      return !maxDate || item.fecha > maxDate
        ? item.fecha
        : maxDate;
    },
    ''
  );

  const latestReportDate = informeRows.reduce(
    function(maxDate, item) {
      return !maxDate || item.fecha > maxDate
        ? item.fecha
        : maxDate;
    },
    ''
  );

  let staleReports = 0;

  const rows = informeRows.filter(function(item) {
    // Día ya cerrado en SAP: el estimado se descarta.
    if (lastActualDate && item.fecha <= lastActualDate) {
      staleReports++;
      return false;
    }

    if (latestReportDate && item.fecha > latestReportDate) {
      return false;
    }

    return true;
  });

  const camiones = rows.reduce(function(total, item) {
    return total + (Number(item.camiones) || 0);
  }, 0);

  // La primera fecha realmente complementada. Sin datos de SAP el
  // complemento arranca en la planilla más antigua, no en la última.
  const firstSupplementDate = rows.reduce(
    function(minDate, item) {
      return !minDate || item.fecha < minDate
        ? item.fecha
        : minDate;
    },
    ''
  );

  return {
    rows: rows,
    camiones: camiones,
    staleReports: staleReports,
    lastActualDate: lastActualDate,
    latestReportDate: latestReportDate,
    supplementStart: rows.length && lastActualDate
      ? addDaysToDateKey_(lastActualDate, 1)
      : firstSupplementDate
  };
}

/* =====================================================================
 * HOMOLOGACIÓN DE PROVEEDORES
 * ===================================================================== */

/**
 * El reservador escribe "PROMASA S.A." y SAP "PROMASA SA". Se comparan
 * sin razón social ni palabras vacías; si nada supera el umbral, se
 * conserva el nombre de la planilla.
 */
function resolveProveedor_(rawName, candidates) {
  const cleaned = proveedorComparable_(rawName);

  if (!cleaned) {
    return {
      proveedor: 'SIN PROVEEDOR',
      method: 'Sin nombre',
      score: 0
    };
  }

  let best = null;

  (candidates || []).forEach(function(candidate) {
    const score = proveedorSimilitud_(
      cleaned,
      proveedorComparable_(candidate)
    );

    if (!best || score > best.score) {
      best = { proveedor: candidate, score: score };
    }
  });

  if (best && best.score >= CONFIG.FUZZY_THRESHOLD) {
    return {
      proveedor: best.proveedor,
      method: best.score === 1
        ? 'Coincidencia exacta'
        : 'Coincidencia aproximada',
      score: round_(best.score, 3)
    };
  }

  return {
    proveedor: text_(rawName),
    method: 'Solo en planilla',
    score: 0
  };
}

function proveedorComparable_(value) {
  const stopWords = {
    SA: true, SPA: true, LTDA: true, LIMITADA: true,
    EIRL: true, CIA: true, COMPANIA: true,
    SOCIEDAD: true, SOC: true, EMPRESA: true,
    EMPRESAS: true, SERV: true, SERVICIO: true,
    SERVICIOS: true, AGRICOLA: true, FORESTAL: true,
    COMERCIAL: true, INDUSTRIAL: true,
    INDUSTRIAS: true, INMOBILIARIA: true, INV: true,
    INVERSIONES: true, ASERRADERO: true,
    ASERRADEROS: true, E: true, Y: true, DE: true,
    DEL: true, LA: true, EL: true, LOS: true,
    LAS: true
  };

  return normalizeKey_(value)
    .split(' ')
    .filter(function(token) {
      return token && !stopWords[token];
    })
    .join(' ')
    .trim();
}

function proveedorSimilitud_(a, b) {
  if (!a || !b) {
    return 0;
  }

  if (a === b) {
    return 1;
  }

  const tokensA = uniqueTokens_(a);
  const tokensB = uniqueTokens_(b);

  const intersection = tokensA.filter(function(token) {
    return tokensB.indexOf(token) !== -1;
  }).length;

  const union = uniqueTokens_(
    tokensA.concat(tokensB).join(' ')
  ).length;

  const jaccard = union ? intersection / union : 0;

  const edit =
    1 - levenshtein_(a, b) / Math.max(a.length, b.length);

  return Math.max(jaccard, 0.55 * jaccard + 0.45 * edit);
}

function levenshtein_(a, b) {
  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] =
        b.charAt(i - 1) === a.charAt(j - 1)
          ? matrix[i - 1][j - 1]
          : Math.min(
              matrix[i - 1][j - 1] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j] + 1
            );
    }
  }

  return matrix[b.length][a.length];
}

/* =====================================================================
 * PLAN MENSUAL (OPCIONAL)
 * ===================================================================== */

/**
 * Hoja PlanAstilla: una columna con el sub-producto y una columna por
 * mes ('AGO-2026', '2026-08' o una fecha). El valor es el plan del mes
 * en TS. Sin la hoja, el dashboard funciona igual y omite el plan.
 */
function readPlan_(spreadsheet, month) {
  const sheet = spreadsheet.getSheetByName(
    CONFIG.SHEET_PLAN
  );

  if (!sheet || sheet.getLastRow() < 2) {
    return { rows: [] };
  }

  const range = sheet.getDataRange();
  const values = range.getValues();
  const displayed = range.getDisplayValues();

  let headerRowIndex = -1;
  let subproductoColumn = -1;

  for (
    let rowIndex = 0;
    rowIndex < Math.min(values.length, 20);
    rowIndex++
  ) {
    for (
      let columnIndex = 0;
      columnIndex < values[rowIndex].length;
      columnIndex++
    ) {
      const key = normalizeHeader_(
        values[rowIndex][columnIndex]
      );

      if (
        key === 'subproducto' ||
        key === 'subproductos' ||
        key === 'material' ||
        key === 'producto'
      ) {
        headerRowIndex = rowIndex;
        subproductoColumn = columnIndex;
        break;
      }
    }

    if (headerRowIndex !== -1) {
      break;
    }
  }

  if (headerRowIndex === -1) {
    return { rows: [] };
  }

  const monthColumn = findPlanMonthColumn_(
    values[headerRowIndex],
    displayed[headerRowIndex],
    month
  );

  if (monthColumn === -1) {
    return { rows: [] };
  }

  const aggregate = {};

  for (
    let rowIndex = headerRowIndex + 1;
    rowIndex < values.length;
    rowIndex++
  ) {
    const subproducto = canonicalSubproducto_(
      values[rowIndex][subproductoColumn]
    );

    if (!subproducto) {
      continue;
    }

    aggregate[subproducto] =
      (aggregate[subproducto] || 0) +
      toNumber_(
        values[rowIndex][monthColumn],
        displayed[rowIndex][monthColumn]
      );
  }

  return {
    rows: Object.keys(aggregate).map(function(key) {
      return {
        subproducto: key,
        plan: aggregate[key]
      };
    })
  };
}

function findPlanMonthColumn_(
  header,
  displayedHeader,
  month
) {
  for (
    let columnIndex = 0;
    columnIndex < header.length;
    columnIndex++
  ) {
    const raw = header[columnIndex];

    if (
      raw instanceof Date &&
      Utilities.formatDate(
        raw,
        CONFIG.TIMEZONE,
        'yyyy-MM'
      ) === month.prefix
    ) {
      return columnIndex;
    }

    if (
      parseMonthHeader_(
        displayedHeader[columnIndex] || raw
      ) === month.prefix
    ) {
      return columnIndex;
    }
  }

  return -1;
}

function parseMonthHeader_(value) {
  const text = normalizeKey_(value);

  let match = text.match(/^(\d{4})[-/](\d{1,2})/);

  if (match) {
    return (
      String(match[1]) +
      '-' +
      String(match[2]).padStart(2, '0')
    );
  }

  match = text.match(
    /^(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)[A-Z]*[- ](\d{4})/
  );

  if (!match) {
    return '';
  }

  const months = {
    ENE: 1, FEB: 2, MAR: 3, ABR: 4, MAY: 5, JUN: 6,
    JUL: 7, AGO: 8, SEP: 9, OCT: 10, NOV: 11, DIC: 12
  };

  return (
    String(match[2]) +
    '-' +
    String(months[match[1]]).padStart(2, '0')
  );
}

/* =====================================================================
 * IMPORTACIÓN DESDE GMAIL
 * ===================================================================== */

function procesarPlanillasGmail() {
  return importarPlanillas_(false);
}

function reconstruirPlanillas() {
  const ui = SpreadsheetApp.getUi();

  const response = ui.alert(
    'Reconstruir InformeAstilla',
    'Se respalda la tabla actual y se vuelven a importar todas ' +
    'las planillas encontradas en Gmail. ¿Continuar?',
    ui.ButtonSet.OK_CANCEL
  );

  if (response !== ui.Button.OK) {
    return;
  }

  return importarPlanillas_(true);
}

function importarPlanillas_(rebuild) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const spreadsheet = SpreadsheetApp.openById(
      CONFIG.SPREADSHEET_ID
    );

    const timezone =
      spreadsheet.getSpreadsheetTimeZone() ||
      CONFIG.TIMEZONE;

    const sheet = ensureInformeSheet_(
      spreadsheet,
      rebuild
    );

    const processedIds = rebuild
      ? {}
      : getProcessedMessageIds_(sheet);

    const threads = GmailApp.search(
      buildGmailQuery_(),
      0,
      CONFIG.GMAIL_MAX_THREADS
    );

    const processedLabel =
      GmailApp.getUserLabelByName(
        CONFIG.GMAIL_PROCESSED_LABEL
      ) ||
      GmailApp.createLabel(
        CONFIG.GMAIL_PROCESSED_LABEL
      );

    const output = [];

    let examined = 0;
    let imported = 0;
    let detailRows = 0;
    let duplicates = 0;
    let ignored = 0;
    let errors = 0;

    threads.forEach(function(thread) {
      thread.getMessages().forEach(function(message) {
        examined++;

        const messageId = message.getId();
        const subject = text_(message.getSubject());

        if (!matchesSubject_(subject)) {
          ignored++;
          return;
        }

        if (processedIds[messageId]) {
          duplicates++;
          return;
        }

        try {
          const parsed = parsePlanillaEmail_(
            message,
            timezone
          );

          parsed.rows.forEach(function(item) {
            output.push([
              dateKeyToLocalDate_(parsed.fecha),
              parsed.fecha,
              item.subproductoRaw,
              item.subproducto,
              item.proveedor,
              item.destino,
              item.camiones,
              CONFIG.FACTOR_CAMION,
              item.camiones * CONFIG.FACTOR_CAMION,
              subject,
              messageId,
              message.getFrom(),
              message.getDate(),
              new Date(),
              'OK',
              parsed.method
            ]);

            detailRows++;
          });

          processedIds[messageId] = true;
          imported++;
          thread.addLabel(processedLabel);
        } catch (error) {
          errors++;

          output.push([
            '', '', '', '', '', '', '',
            CONFIG.FACTOR_CAMION,
            '',
            subject,
            messageId,
            message.getFrom(),
            message.getDate(),
            new Date(),
            'ERROR: ' + String(error.message || error),
            'No extraído'
          ]);

          processedIds[messageId] = true;
        }
      });
    });

    if (output.length) {
      sheet
        .getRange(
          sheet.getLastRow() + 1,
          1,
          output.length,
          INFORME_HEADERS.length
        )
        .setValues(output);

      formatInformeSheet_(sheet);
    }

    const result = {
      examined: examined,
      imported: imported,
      detailRows: detailRows,
      duplicates: duplicates,
      ignored: ignored,
      errors: errors
    };

    console.log(JSON.stringify(result));

    try {
      SpreadsheetApp.getUi().alert(
        'Importación finalizada\n\n' +
        'Mensajes revisados: ' + examined + '\n' +
        'Planillas importadas: ' + imported + '\n' +
        'Filas de detalle: ' + detailRows + '\n' +
        'Ya procesadas: ' + duplicates + '\n' +
        'Asuntos ignorados: ' + ignored + '\n' +
        'Errores: ' + errors
      );
    } catch (ignoredUi) {}

    return result;
  } finally {
    lock.releaseLock();
  }
}

function buildGmailQuery_() {
  const parts = [];

  if (CONFIG.GMAIL_LABEL) {
    parts.push('label:"' + CONFIG.GMAIL_LABEL + '"');
  }

  parts.push('subject:"' + CONFIG.GMAIL_SUBJECT + '"');

  parts.push(
    'newer_than:' + CONFIG.GMAIL_SEARCH_DAYS + 'd'
  );

  return parts.join(' ');
}

/**
 * Compara el asunto tolerando "SUB-PRODUCTOS", "SUB PRODUCTOS" y
 * "SUBPRODUCTOS": el guion y los espacios se eliminan en ambos lados
 * antes de comparar. Sin esto, un cambio de tipeo en el remitente
 * deja la importación en cero sin explicar por qué.
 */
function matchesSubject_(subject) {
  function collapse(value) {
    return normalizeKey_(value).replace(/[\s-]/g, '');
  }

  return (
    collapse(subject).indexOf(
      collapse(CONFIG.GMAIL_SUBJECT)
    ) !== -1
  );
}

/**
 * Lee la última planilla y muestra lo extraído sin escribir en la
 * hoja. Conviene correrlo antes de una carga masiva.
 */
function probarUltimoCorreo() {
  const threads = GmailApp.search(buildGmailQuery_(), 0, 5);

  if (!threads.length) {
    SpreadsheetApp.getUi().alert(
      'No se encontró ningún correo con el asunto "' +
      CONFIG.GMAIL_SUBJECT +
      '" en los últimos ' +
      CONFIG.GMAIL_SEARCH_DAYS +
      ' días.'
    );
    return;
  }

  const messages = threads[0].getMessages();
  const message = messages[messages.length - 1];

  try {
    const parsed = parsePlanillaEmail_(
      message,
      CONFIG.TIMEZONE
    );

    const camiones = parsed.rows.reduce(
      function(total, item) {
        return total + item.camiones;
      },
      0
    );

    const lines = [
      'Asunto: ' + message.getSubject(),
      'Fecha detectada: ' + formatDateKey_(parsed.fecha),
      'Método: ' + parsed.method,
      'Filas útiles: ' + parsed.rows.length,
      'Camiones: ' +
        camiones +
        ' = ' +
        camiones * CONFIG.FACTOR_CAMION +
        ' ' +
        CONFIG.UNIDAD,
      ''
    ];

    parsed.rows.forEach(function(item) {
      lines.push(
        item.subproducto +
        ' | ' +
        item.proveedor +
        ' | ' +
        item.destino +
        ' | ' +
        item.camiones +
        ' camiones'
      );
    });

    SpreadsheetApp.getUi().alert(
      lines.slice(0, 60).join('\n')
    );
  } catch (error) {
    SpreadsheetApp.getUi().alert(
      'No se pudo leer la planilla.\n\n' +
      String(error.message || error)
    );
  }
}

/**
 * Muestra qué materiales de SAP quedaron fuera del filtro y qué
 * proveedores de la planilla no encontraron par en SAP. Es la forma
 * rápida de detectar que un nombre cambió y el cruce se rompió.
 */
function diagnosticarCruce() {
  const data = getDashboardData();

  const sinPar = data.rows
    .filter(function(row) {
      return (
        row.source === 'PLANILLA' &&
        row.matchMethod === 'Solo en planilla'
      );
    })
    .map(function(row) {
      return row.proveedorRaw;
    });

  const lines = [
    'Diagnóstico de cruce',
    '',
    'Mes: ' + data.month.label,
    'Última Fecha Contab. (SAP): ' +
      data.source.lastActualDateLabel,
    'Última planilla: ' +
      data.source.latestReportDateLabel,
    'Filas SAP: ' + data.source.sapRows,
    'Filas de complemento: ' +
      data.source.supplementRows +
      ' (' +
      data.source.supplementCamiones +
      ' camiones)',
    'Planillas descartadas por estar ya en SAP: ' +
      data.source.staleReports,
    'Correos con error de lectura: ' + data.source.errors,
    '',
    'Materiales de SAP fuera del filtro:'
  ];

  const materiales = data.source.materialesSinReconocer || [];

  if (materiales.length) {
    materiales.slice(0, 25).forEach(function(item) {
      lines.push('- ' + item);
    });
  } else {
    lines.push('Ninguno');
  }

  lines.push('');
  lines.push('Proveedores de planilla sin par en SAP:');

  const unicos = uniqueSorted_(sinPar);

  if (unicos.length) {
    unicos.slice(0, 25).forEach(function(item) {
      lines.push('- ' + item);
    });
  } else {
    lines.push('Ninguno');
  }

  SpreadsheetApp.getUi().alert(lines.join('\n'));
}

/**
 * Responde la pregunta "¿por qué no me toma la hoja Ingresos?".
 * Muestra qué hojas existen, qué encabezados encontró, a qué columna
 * mapeó cada campo y cuántas filas descartó por cada motivo.
 */
function diagnosticarIngresos() {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);

  const timezone =
    spreadsheet.getSpreadsheetTimeZone() || CONFIG.TIMEZONE;

  const nombres = spreadsheet.getSheets().map(function(hoja) {
    return hoja.getName();
  });

  const lines = [
    'Diagnóstico de la hoja de SAP',
    '',
    'Planilla: ' + spreadsheet.getName(),
    'Hojas que existen: ' + nombres.join(' · '),
    'Hoja buscada (CONFIG.SHEET_INGRESOS): ' + CONFIG.SHEET_INGRESOS
  ];

  if (nombres.indexOf(CONFIG.SHEET_INGRESOS) === -1) {
    lines.push('');
    lines.push('>>> Esa hoja NO existe en esta planilla.');
    lines.push(
      'Corrige CONFIG.SHEET_INGRESOS con uno de los nombres de arriba, ' +
      'o revisa que CONFIG.SPREADSHEET_ID apunte al archivo correcto.'
    );

    SpreadsheetApp.getUi().alert(lines.join('\n'));
    return;
  }

  const month = getCurrentMonthWindow_(timezone);
  const historyStart = buildHistoryStart_(month);
  const sap = readIngresos_(spreadsheet, timezone, historyStart);

  lines.push('Ventana de historia: desde ' + formatDateKey_(historyStart));
  lines.push('');
  lines.push('Encabezados de la fila 1:');
  lines.push(sap.headers.join(' | '));
  lines.push('');
  lines.push('Columnas que se van a usar (base cero):');

  if (sap.columns) {
    Object.keys(sap.columns).forEach(function(campo) {
      const indice = sap.columns[campo];

      lines.push(
        '  ' + campo + ' -> col ' + indice +
        ' (' + (sap.headers[indice] || 'FUERA DE RANGO') + ')'
      );
    });
  }

  lines.push('');
  lines.push('Filas de datos: ' + sap.totalRows);
  lines.push('  Aceptadas: ' + sap.rows.length);
  lines.push('  Sin fecha legible: ' + sap.skipped.sinFecha);
  lines.push('  Fuera de la ventana: ' + sap.skipped.fueraDeHistoria);
  lines.push('  Material no reconocido: ' + sap.skipped.materialNoReconocido);

  if (sap.materialesSinReconocer.length) {
    lines.push('');
    lines.push('Descripciones que quedaron fuera:');

    sap.materialesSinReconocer.slice(0, 15).forEach(function(item) {
      lines.push('  - ' + item);
    });

    lines.push('');
    lines.push(
      'Si alguna de esas SÍ es astilla a proceso, agrégala en ' +
      'canonicalSubproducto_ o suma su código a CONFIG.SAP_MATERIALES.'
    );
  }

  if (sap.rows.length) {
    lines.push('');
    lines.push('Primeras filas aceptadas:');

    sap.rows.slice(0, 5).forEach(function(item) {
      lines.push(
        '  ' + item.fechaLabel +
        ' | ' + item.subproducto +
        ' | ' + item.proveedor +
        ' | ' + item.ts + ' ' + item.um
      );
    });
  }

  SpreadsheetApp.getUi().alert(lines.join('\n'));
}

function instalarDisparador() {
  eliminarDisparadores();

  ScriptApp
    .newTrigger('procesarPlanillasGmail')
    .timeBased()
    .everyMinutes(CONFIG.TRIGGER_MINUTES)
    .create();

  SpreadsheetApp.getUi().alert(
    'Automatización instalada. Gmail se revisará cada ' +
    CONFIG.TRIGGER_MINUTES +
    ' minutos.'
  );
}

function eliminarDisparadores() {
  let removed = 0;

  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (
      trigger.getHandlerFunction() ===
      'procesarPlanillasGmail'
    ) {
      ScriptApp.deleteTrigger(trigger);
      removed++;
    }
  });

  return removed;
}

/* =====================================================================
 * EXTRACCIÓN DE LA PLANILLA
 * ===================================================================== */

/**
 * Una planilla sin fecha reconocible NO puede darse por buena: se
 * escribiría con Estado OK y fechas en blanco, readInformeRows_ la
 * descartaría en silencio y, al quedar el messageId registrado, no se
 * volvería a intentar nunca. Por eso cada rama valida la fecha antes
 * de devolver: así queda como ERROR visible y recuperable con
 * "Reconstruir planillas desde Gmail".
 */
function parsePlanillaEmail_(message, timezone) {
  const subject = message.getSubject() || '';
  const htmlBody = message.getBody() || '';
  const plainBody = message.getPlainBody() || '';

  const fecha =
    extractSpanishDateKey_(subject) ||
    extractSpanishDateKey_(plainBody) ||
    extractSpanishDateKey_(htmlToText_(htmlBody));

  // 1) Tabla pegada en el cuerpo del correo.
  const fromHtml = parseGridRows_(
    extractHtmlTableRows_(htmlBody)
  );

  if (fromHtml.rows.length) {
    return buildParsedReport_(
      fromHtml.fecha || fecha,
      fromHtml.rows,
      'Tabla HTML del correo'
    );
  }

  // 2) Planilla adjunta (CSV o Excel).
  const fromAttachment = parseAttachments_(message);

  if (fromAttachment.rows.length) {
    return buildParsedReport_(
      fromAttachment.fecha || fecha,
      fromAttachment.rows,
      fromAttachment.method
    );
  }

  // 3) Texto plano como último recurso.
  const fromText = parsePlanillaText_(
    plainBody || htmlToText_(htmlBody)
  );

  if (fromText.rows.length) {
    return buildParsedReport_(
      fromText.fecha || fecha,
      fromText.rows,
      'Texto del correo'
    );
  }

  if (!fecha) {
    throw new Error(
      'No se encontró la fecha ni la tabla de la planilla.'
    );
  }

  throw new Error(
    'No se encontraron filas de ' +
    SUBPRODUCTOS_OBJETIVO.join(', ') +
    ' en el correo.'
  );
}

function buildParsedReport_(fecha, rows, method) {
  if (!fecha) {
    throw new Error(
      'Se leyeron ' +
      rows.length +
      ' filas por "' +
      method +
      '", pero no se pudo determinar la fecha del informe. ' +
      'Revisa el asunto o la columna FECHA de la planilla.'
    );
  }

  return {
    fecha: fecha,
    rows: rows,
    method: method
  };
}

/**
 * Núcleo del parser. Recibe la planilla como matriz de celdas, venga
 * de una tabla HTML o de un adjunto, y devuelve solo las filas útiles.
 */
function parseGridRows_(grid) {
  const empty = { rows: [], fecha: '' };

  if (!grid || !grid.length) {
    return empty;
  }

  let headerIndex = -1;
  let fechaColumn = -1;
  let subproductoColumn = -1;
  let proveedorColumn = -1;
  let destinoColumn = -1;
  let cantidadColumn = -1;

  for (
    let rowIndex = 0;
    rowIndex < Math.min(grid.length, 15);
    rowIndex++
  ) {
    const row = grid[rowIndex];
    const productosColumns = [];

    let hasProveedores = false;
    let localFecha = -1;
    let localSubproducto = -1;
    let localProveedor = -1;

    row.forEach(function(cell, columnIndex) {
      const key = normalizeKey_(cell);

      if (key === 'FECHA') {
        localFecha = columnIndex;
      }

      if (
        key.indexOf('SUBPRODUCTO') !== -1 ||
        key.indexOf('SUB PRODUCTO') !== -1 ||
        key.indexOf('CUMPLIMIENTO') !== -1
      ) {
        localSubproducto = columnIndex;
      }

      if (key === 'PROVEEDORES' || key === 'PROVEEDOR') {
        localProveedor = columnIndex;
        hasProveedores = true;
      }

      if (key === 'PRODUCTOS') {
        productosColumns.push(columnIndex);
      }
    });

    if (!hasProveedores || !productosColumns.length) {
      continue;
    }

    headerIndex = rowIndex;
    fechaColumn = localFecha;
    subproductoColumn = localSubproducto;
    proveedorColumn = localProveedor;

    // "PRODUCTOS" en mayúsculas es el destino (TABLEROS,
    // COGENERACIÓN, NEOMAS); "productos" en minúsculas, la última,
    // es la cantidad de camiones.
    cantidadColumn =
      productosColumns[productosColumns.length - 1];

    destinoColumn =
      productosColumns.length > 1
        ? productosColumns[0]
        : -1;

    break;
  }

  if (headerIndex === -1) {
    return empty;
  }

  if (subproductoColumn === -1) {
    subproductoColumn = Math.max(0, proveedorColumn - 1);
  }

  const rows = [];

  let currentRaw = '';
  let currentCanonical = '';
  let fecha = '';

  for (
    let rowIndex = headerIndex + 1;
    rowIndex < grid.length;
    rowIndex++
  ) {
    const row = grid[rowIndex];

    if (fechaColumn >= 0 && !fecha) {
      fecha =
        parseDateText_(row[fechaColumn]) ||
        extractSpanishDateKey_(row[fechaColumn]) ||
        '';
    }

    const label = text_(row[subproductoColumn]);
    const labelKey = normalizeKey_(label);

    // Los "Total ..." son subtotales: ni arrastran grupo ni suman.
    if (labelKey.indexOf('TOTAL') === 0) {
      continue;
    }

    if (label) {
      currentRaw = label;
      currentCanonical = canonicalSubproducto_(label);
    }

    if (!currentCanonical) {
      continue;
    }

    const proveedor =
      text_(row[proveedorColumn]) || 'SIN PROVEEDOR';

    const camiones = parseOptionalNumber_(
      row[cantidadColumn]
    );

    if (camiones === null || !isFinite(camiones)) {
      continue;
    }

    if (camiones === 0 && proveedor === 'SIN PROVEEDOR') {
      continue;
    }

    rows.push({
      subproducto: currentCanonical,
      subproductoRaw: currentRaw,
      proveedor: proveedor,
      destino:
        destinoColumn >= 0
          ? text_(row[destinoColumn])
          : '',
      camiones: camiones
    });
  }

  return { rows: rows, fecha: fecha };
}

/**
 * Adjuntos: CSV se lee directo; XLSX necesita el servicio avanzado
 * "Drive API" activado en el editor de Apps Script.
 */
function parseAttachments_(message) {
  const empty = { rows: [], fecha: '', method: '' };

  const attachments = message.getAttachments({
    includeInlineImages: false
  });

  for (
    let index = 0;
    index < attachments.length;
    index++
  ) {
    const attachment = attachments[index];
    const name = attachment.getName() || '';

    if (/\.(csv|txt)$/i.test(name)) {
      const parsed = parseGridRows_(
        Utilities.parseCsv(
          attachment.getDataAsString()
        )
      );

      if (parsed.rows.length) {
        parsed.method = 'Adjunto CSV (' + name + ')';
        return parsed;
      }
    }

    if (/\.(xlsx|xls)$/i.test(name)) {
      const parsed = parseExcelAttachment_(attachment);

      if (parsed.rows.length) {
        parsed.method = 'Adjunto Excel (' + name + ')';
        return parsed;
      }
    }
  }

  return empty;
}

/**
 * Convierte el adjunto a Google Sheets para poder leerlo.
 *
 * Usa Drive API v3 (Files.create con mimeType de destino en el
 * recurso). La forma v2 —Files.insert con {convert: true}— ya no
 * existe: el servicio avanzado de Drive que se activa hoy en el
 * editor es v3, y ahí el campo es "name", no "title".
 */
function parseExcelAttachment_(attachment) {
  const empty = { rows: [], fecha: '', method: '' };

  let fileId = '';

  try {
    const file = Drive.Files.create(
      {
        name: 'temp_planilla_' + Utilities.getUuid(),
        mimeType: MimeType.GOOGLE_SHEETS
      },
      attachment.copyBlob()
    );

    fileId = file.id;

    const sheets = SpreadsheetApp
      .openById(fileId)
      .getSheets();

    for (let index = 0; index < sheets.length; index++) {
      const parsed = parseGridRows_(
        sheets[index].getDataRange().getDisplayValues()
      );

      if (parsed.rows.length) {
        return parsed;
      }
    }

    return empty;
  } catch (error) {
    throw new Error(
      'La planilla viene como Excel adjunto y no se pudo convertir. ' +
      'En el editor de Apps Script, agrega el servicio "Drive API" ' +
      '(Servicios › + › Drive API, versión v3). Detalle: ' +
      String(error.message || error)
    );
  } finally {
    if (fileId) {
      try {
        DriveApp.getFileById(fileId).setTrashed(true);
      } catch (ignored) {}
    }
  }
}

/**
 * Respaldo cuando el correo llega sin tabla: líneas del tipo
 * "ASTILLA PINO VERDE  PROMASA S.A.  TABLEROS  6".
 */
function parsePlanillaText_(body) {
  const lines = String(body || '')
    .replace(/\r/g, '')
    .split('\n')
    .map(function(line) {
      return decodeHtmlEntities_(line)
        .replace(/\s+/g, ' ')
        .trim();
    })
    .filter(Boolean);

  const rows = [];

  let currentRaw = '';
  let currentCanonical = '';
  let fecha = '';

  lines.forEach(function(line) {
    if (!fecha) {
      fecha = extractSpanishDateKey_(line) || '';
    }

    if (normalizeKey_(line).indexOf('TOTAL') === 0) {
      return;
    }

    const startMatch = line.match(
      /^([A-Za-zÁÉÍÓÚÑáéíóúñ.\/ ]+?)\s{2,}/
    );

    let rest = line;

    if (startMatch) {
      const candidate = canonicalSubproducto_(
        startMatch[1]
      );

      if (candidate) {
        currentRaw = startMatch[1].trim();
        currentCanonical = candidate;
        rest = line.slice(startMatch[0].length);
      } else if (
        /^(AST|ASTILLA|ASTILLAS|ASERRIN)\b/.test(
          normalizeKey_(startMatch[1])
        )
      ) {
        // Empieza otro grupo que no interesa.
        currentCanonical = '';
        return;
      }
    }

    if (!currentCanonical) {
      return;
    }

    const tail = rest.match(
      /^(.*?)\s+(TABLEROS|COGENERACI[OÓ]N|NEOMAS)\s+(\d+)\s*$/i
    );

    if (!tail) {
      return;
    }

    rows.push({
      subproducto: currentCanonical,
      subproductoRaw: currentRaw,
      proveedor: text_(tail[1]) || 'SIN PROVEEDOR',
      destino: normalizeKey_(tail[2]),
      camiones: Number(tail[3])
    });
  });

  return { rows: rows, fecha: fecha };
}

/**
 * Devuelve el nombre canónico si el sub-producto va a proceso, o ''
 * si hay que ignorarlo. Sirve tanto para la planilla como para la
 * descripción de material de SAP: tolera "AST." vs "ASTILLA",
 * plural, "C/ CORTEZA" vs "CON CORTEZA", tildes y espacios dobles.
 * Si SAP usa un nombre muy distinto, agrégalo aquí.
 */
function canonicalSubproducto_(value) {
  const key = normalizeKey_(value)
    .replace(/\//g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!key || key.indexOf('TOTAL') === 0) {
    return '';
  }

  if (!/^(AST|ASTILLA|ASTILLAS)\b/.test(key)) {
    return '';
  }

  if (key.indexOf('NITENS') !== -1) {
    return 'ASTILLA EUCALYPTUS NITENS';
  }

  if (key.indexOf('PINO VERDE') !== -1) {
    if (key.indexOf('COMBUSTIBLE') !== -1) {
      return '';
    }

    // "S/CORTEZA" queda como pino verde a secas.
    if (
      /\bS CORTEZA\b/.test(key) ||
      key.indexOf('SIN CORTEZA') !== -1
    ) {
      return 'ASTILLA PINO VERDE';
    }

    if (key.indexOf('CORTEZA') !== -1) {
      return 'AST. PINO VERDE C/ CORTEZA';
    }

    return 'ASTILLA PINO VERDE';
  }

  // "ASTILLA VERDE (TS)": el nombre que usa SAP para todo el ingreso.
  // Se acepta al final, después de los tres específicos, para no
  // robarle filas al desglose de la planilla.
  if (/^ASTILLA VERDE\b/.test(key)) {
    return SUBPRODUCTO_SAP;
  }

  return '';
}

/**
 * Respaldo por código de material, para cuando la descripción viene
 * abreviada o en blanco pero el código sí identifica la astilla.
 */
function subproductoPorMaterial_(value) {
  return CONFIG.SAP_MATERIALES.indexOf(text_(value)) !== -1
    ? SUBPRODUCTO_SAP
    : '';
}

/* =====================================================================
 * HOJA DE DESTINO
 * ===================================================================== */

function ensureInformeSheet_(spreadsheet, rebuild) {
  let sheet = spreadsheet.getSheetByName(
    CONFIG.SHEET_INFORME
  );

  if (!sheet) {
    sheet = spreadsheet.insertSheet(
      CONFIG.SHEET_INFORME
    );
  }

  const currentHeaders = sheet.getLastColumn()
    ? sheet
        .getRange(
          1,
          1,
          1,
          Math.max(
            sheet.getLastColumn(),
            INFORME_HEADERS.length
          )
        )
        .getDisplayValues()[0]
        .slice(0, INFORME_HEADERS.length)
    : [];

  const schemaMatches =
    currentHeaders.join('|') === INFORME_HEADERS.join('|');

  if (
    rebuild ||
    (!schemaMatches && sheet.getLastRow() > 1)
  ) {
    const backupName = uniqueSheetName_(
      spreadsheet,
      CONFIG.SHEET_INFORME +
      '_respaldo_' +
      Utilities.formatDate(
        new Date(),
        CONFIG.TIMEZONE,
        'yyyyMMdd_HHmmss'
      )
    );

    sheet.copyTo(spreadsheet).setName(backupName);
    sheet.clear();
  }

  sheet
    .getRange(1, 1, 1, INFORME_HEADERS.length)
    .setValues([INFORME_HEADERS]);

  formatInformeSheet_(sheet);
  return sheet;
}

function formatInformeSheet_(sheet) {
  const lastRow = Math.max(sheet.getLastRow(), 2);

  sheet.setFrozenRows(1);

  sheet
    .getRange(1, 1, 1, INFORME_HEADERS.length)
    .setBackground('#173f2d')
    .setFontColor('#ffffff')
    .setFontWeight('bold');

  sheet
    .getRange(2, 1, lastRow - 1, 1)
    .setNumberFormat('dd/MM/yyyy');

  sheet
    .getRange(2, 7, lastRow - 1, 3)
    .setNumberFormat('#,##0.##');

  sheet
    .getRange(2, 13, lastRow - 1, 2)
    .setNumberFormat('dd/MM/yyyy HH:mm');

  const widths = [
    105, 100, 250, 240, 280, 130, 90, 70, 105,
    330, 180, 250, 145, 145, 220, 190
  ];

  widths.forEach(function(width, index) {
    sheet.setColumnWidth(index + 1, width);
  });
}

function uniqueSheetName_(spreadsheet, baseName) {
  let name = baseName;
  let counter = 2;

  while (spreadsheet.getSheetByName(name)) {
    name = baseName + '_' + counter;
    counter++;
  }

  return name;
}

function getProcessedMessageIds_(sheet) {
  const ids = {};

  if (sheet.getLastRow() < 2) {
    return ids;
  }

  const values = sheet
    .getRange(2, 11, sheet.getLastRow() - 1, 5)
    .getDisplayValues();

  values.forEach(function(row) {
    const messageId = text_(row[0]);
    const state = text_(row[4]);

    if (
      messageId &&
      (state === 'OK' || state.indexOf('ERROR:') === 0)
    ) {
      ids[messageId] = true;
    }
  });

  return ids;
}

/* =====================================================================
 * DÍAS HÁBILES
 * ===================================================================== */

function buildWorkdaysInfo_(
  timezone,
  month,
  lastActualDate,
  latestReportDate
) {
  const todayKey = Utilities.formatDate(
    new Date(),
    timezone || CONFIG.TIMEZONE,
    'yyyy-MM-dd'
  );

  let referenceDate = latestReportDate || '';

  if (lastActualDate && lastActualDate > referenceDate) {
    referenceDate = lastActualDate;
  }

  if (!referenceDate || referenceDate > todayKey) {
    referenceDate = todayKey;
  }

  if (referenceDate > month.endKey) {
    referenceDate = month.endKey;
  }

  if (referenceDate < month.startKey) {
    referenceDate = month.startKey;
  }

  const holidays = {};

  CONFIG.FERIADOS.forEach(function(key) {
    holidays[key] = true;
  });

  const lastDay = Number(month.endKey.split('-')[2]);
  const workdayKeys = [];

  let elapsed = 0;

  for (let day = 1; day <= lastDay; day++) {
    const key = buildDateKey_(
      month.year,
      month.month,
      day
    );

    const dayOfWeek = new Date(
      Date.UTC(month.year, month.month - 1, day)
    ).getUTCDay();

    if (CONFIG.WORKDAYS.indexOf(dayOfWeek) === -1) {
      continue;
    }

    if (holidays[key]) {
      continue;
    }

    workdayKeys.push(key);

    if (key <= referenceDate) {
      elapsed++;
    }
  }

  const total = workdayKeys.length;

  return {
    todayKey: todayKey,
    referenceDate: referenceDate,
    referenceDateLabel: formatDateKey_(referenceDate),
    total: total,
    elapsed: elapsed,
    remaining: Math.max(0, total - elapsed),
    fraction: total ? round_(elapsed / total, 6) : 0,
    workdayKeys: workdayKeys
  };
}

/* =====================================================================
 * UTILIDADES
 * ===================================================================== */

function getCurrentMonthWindow_(timezone) {
  const prefix = Utilities.formatDate(
    new Date(),
    timezone || CONFIG.TIMEZONE,
    'yyyy-MM'
  );

  const parts = prefix.split('-');
  const year = Number(parts[0]);
  const month = Number(parts[1]);

  const lastDay = new Date(
    Date.UTC(year, month, 0)
  ).getUTCDate();

  const monthNames = [
    '', 'enero', 'febrero', 'marzo', 'abril', 'mayo',
    'junio', 'julio', 'agosto', 'septiembre',
    'octubre', 'noviembre', 'diciembre'
  ];

  return {
    prefix: prefix,
    year: year,
    month: month,
    startKey: buildDateKey_(year, month, 1),
    endKey: buildDateKey_(year, month, lastDay),
    label: monthNames[month] + ' de ' + year
  };
}

function extractHtmlTableRows_(html) {
  const rows = [];
  const rowRegex = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;

  let rowMatch;

  while (
    (rowMatch = rowRegex.exec(String(html || ''))) !== null
  ) {
    const cells = [];
    const cellRegex =
      /<(?:td|th)\b([^>]*)>([\s\S]*?)<\/(?:td|th)>/gi;

    let cellMatch;

    while (
      (cellMatch = cellRegex.exec(rowMatch[1])) !== null
    ) {
      cells.push(cleanHtmlCell_(cellMatch[2]));

      const colspan = Number(
        (cellMatch[1].match(
          /colspan\s*=\s*["']?(\d+)/i
        ) || [])[1] || 1
      );

      // Rellena lo que ocupa un colspan para no desalinear los
      // índices detectados en el encabezado.
      for (let extra = 1; extra < colspan; extra++) {
        cells.push('');
      }
    }

    if (cells.length) {
      rows.push(cells);
    }
  }

  return rows;
}

function cleanHtmlCell_(html) {
  return decodeHtmlEntities_(
    String(html || '')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

function htmlToText_(html) {
  return decodeHtmlEntities_(
    String(html || '')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<\/t[dh]>/gi, '  ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(?:p|div|tr|li|table)>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s+/g, '\n')
  );
}

function buildHeaderMap_(headerRow) {
  const map = {};

  headerRow.forEach(function(value, index) {
    map[normalizeHeader_(value)] = index;
  });

  return map;
}

function toDateKey_(rawValue, displayValue, timezone) {
  if (
    rawValue instanceof Date &&
    !isNaN(rawValue.getTime())
  ) {
    return Utilities.formatDate(
      rawValue,
      timezone || CONFIG.TIMEZONE,
      'yyyy-MM-dd'
    );
  }

  const parsed =
    parseDateText_(displayValue) ||
    parseDateText_(rawValue);

  if (parsed) {
    return parsed;
  }

  if (
    typeof rawValue === 'number' &&
    isFinite(rawValue)
  ) {
    const date = new Date(
      Date.UTC(1899, 11, 30) +
      Math.round(rawValue * 86400000)
    );

    return buildDateKey_(
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      date.getUTCDate()
    );
  }

  return '';
}

function parseDateText_(value) {
  const text = String(value || '').trim();

  if (!text) {
    return '';
  }

  let match = text.match(
    /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s].*)?$/
  );

  if (match) {
    return buildDateKey_(
      Number(match[1]),
      Number(match[2]),
      Number(match[3])
    );
  }

  match = text.match(
    /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})(?:\s.*)?$/
  );

  if (match) {
    return buildDateKey_(
      Number(match[3]),
      Number(match[2]),
      Number(match[1])
    );
  }

  return '';
}

function extractSpanishDateKey_(value) {
  const text = normalizeKey_(value);

  let match = text.match(
    /\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})\b/
  );

  if (match) {
    return buildDateKey_(
      Number(match[3]),
      Number(match[2]),
      Number(match[1])
    );
  }

  match = text.match(
    /\b(\d{1,2})\s+(?:DE\s+)?([A-Z]+)\s+(?:DE\s+)?(\d{4})\b/
  );

  if (!match) {
    return '';
  }

  const months = {
    ENERO: 1, FEBRERO: 2, MARZO: 3, ABRIL: 4,
    MAYO: 5, JUNIO: 6, JULIO: 7, AGOSTO: 8,
    SEPTIEMBRE: 9, SETIEMBRE: 9, OCTUBRE: 10,
    NOVIEMBRE: 11, DICIEMBRE: 12
  };

  return months[match[2]]
    ? buildDateKey_(
        Number(match[3]),
        months[match[2]],
        Number(match[1])
      )
    : '';
}

function buildDateKey_(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return '';
  }

  return [
    String(year).padStart(4, '0'),
    String(month).padStart(2, '0'),
    String(day).padStart(2, '0')
  ].join('-');
}

function dateKeyToLocalDate_(dateKey) {
  const parts = String(dateKey || '').split('-');

  if (parts.length !== 3) {
    return '';
  }

  return new Date(
    Number(parts[0]),
    Number(parts[1]) - 1,
    Number(parts[2])
  );
}

function addDaysToDateKey_(dateKey, days) {
  const parts = String(dateKey || '').split('-');

  const date = new Date(
    Date.UTC(
      Number(parts[0]),
      Number(parts[1]) - 1,
      Number(parts[2]) + days
    )
  );

  return buildDateKey_(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate()
  );
}

function formatDateKey_(dateKey) {
  const match = String(dateKey || '').match(
    /^(\d{4})-(\d{2})-(\d{2})$/
  );

  return match
    ? [match[3], match[2], match[1]].join('/')
    : 'Sin fecha';
}

function normalizeHeader_(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeKey_(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s/-]/g, ' ')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function text_(value) {
  return String(
    value === null || value === undefined ? '' : value
  )
    .trim()
    .replace(/\s+/g, ' ');
}

function toNumber_(rawValue, displayValue) {
  if (
    typeof rawValue === 'number' &&
    isFinite(rawValue)
  ) {
    return rawValue;
  }

  let value = String(
    displayValue !== null &&
    displayValue !== undefined &&
    displayValue !== ''
      ? displayValue
      : rawValue || ''
  )
    .trim()
    .replace(/\s/g, '');

  if (!value) {
    return 0;
  }

  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(value)) {
    value = value.replace(/\./g, '').replace(',', '.');
  } else if (/^-?\d+,\d+$/.test(value)) {
    value = value.replace(',', '.');
  } else {
    value = value.replace(/,/g, '');
  }

  const number = Number(value);

  return isFinite(number) ? number : 0;
}

function parseOptionalNumber_(value) {
  const text = String(value || '')
    .replace(/\s/g, '')
    .replace(/[^\d,.\-]/g, '');

  if (!text) {
    return null;
  }

  const number = toNumber_(text, text);

  return isFinite(number) ? number : null;
}

function uniqueSorted_(values) {
  const found = {};
  const output = [];

  values.forEach(function(value) {
    const display = text_(value);

    if (!display) {
      return;
    }

    const key = normalizeKey_(display);

    if (!found[key]) {
      found[key] = true;
      output.push(display);
    }
  });

  return output.sort(function(a, b) {
    return a.localeCompare(b, 'es', {
      sensitivity: 'base',
      numeric: true
    });
  });
}

function uniqueTokens_(value) {
  return uniqueSorted_(
    String(value || '').split(' ').filter(Boolean)
  );
}

function round_(value, decimals) {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function decodeHtmlEntities_(text) {
  const entities = {
    '&nbsp;': ' ',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&aacute;': 'á',
    '&eacute;': 'é',
    '&iacute;': 'í',
    '&oacute;': 'ó',
    '&uacute;': 'ú',
    '&ntilde;': 'ñ',
    '&Aacute;': 'Á',
    '&Eacute;': 'É',
    '&Iacute;': 'Í',
    '&Oacute;': 'Ó',
    '&Uacute;': 'Ú',
    '&Ntilde;': 'Ñ'
  };

  let result = String(text || '');

  Object.keys(entities).forEach(function(entity) {
    result = result.split(entity).join(entities[entity]);
  });

  return result.replace(
    /&#(\d+);/g,
    function(match, code) {
      return String.fromCharCode(Number(code));
    }
  );
}
