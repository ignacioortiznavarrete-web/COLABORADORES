/**
 * ASTILLA PROCESO · INGRESOS REALES + COMPLEMENTO PLANILLA
 *
 * Unidad de trabajo: TONELADA SECA (TS).
 *
 * Fuentes:
 * - Ingresos: hoja con el registro real de recepción. Es la fuente válida
 *   y siempre tiene prioridad.
 * - InformeAstilla: detalle diario importado desde los correos
 *   "PLANILLA CUMPLIMIENTO SUB-PRODUCTOS ...". Solo completa el desfase
 *   temporal mientras la hoja Ingresos aún no contiene esos días.
 * - Plan: precio unitario y plan mensual en TS por proveedor/material.
 *
 * Regla de complemento:
 * - Hasta la última Fecha Contab. existente en Ingresos se usan únicamente
 *   datos reales.
 * - Desde el día siguiente y hasta la última planilla recibida se utiliza
 *   CAMIONES × FACTOR_CAMION.
 * - Cuando una fecha aparece en Ingresos, el estimado de esa fecha deja de
 *   entrar automáticamente al dashboard.
 *
 * Subproductos de proceso:
 *   ASTILLA EUCALYPTUS NITENS
 *   AST. PINO VERDE C/ CORTEZA
 *   ASTILLA PINO VERDE
 *
 * Homologación primaria de la hoja Ingresos:
 *   3000039 -> ASTILLA PINO VERDE
 *   3009002 -> AST. PINO VERDE C/ CORTEZA
 *   3009003 -> ASTILLA EUCALYPTUS NITENS
 */

const CONFIG = Object.freeze({
  SPREADSHEET_ID: '1PNQToRtF7g-obmmOHuoonNGN5-VhhTYnW6SEhK36EOk',
  SHEET_INGRESOS: 'Ingresos',
  SHEET_INFORME: 'InformeAstilla',
  SHEET_PLAN: 'Plan',
  SHEET_MAPEOS: 'Mapeos',
  SHEET_RUTAS: 'Rutas',
  HTML_FILE: 'Index',
  TIMEZONE: 'America/Santiago',

  // Toneladas secas por camión.
  FACTOR_CAMION: 11,
  UNIDAD: 'TS',

  // Meses de historia que viajan al dashboard (el mes vigente
  // siempre entra). Súbelo si quieres más estadística.
  HISTORY_MONTHS: 6,

  FUZZY_THRESHOLD: 0.72,

  // Cruce de precio Plan ↔ proveedor operativo. Si dos candidatos
  // quedan demasiado cerca, el precio NO se asigna automáticamente.
  PRICE_MATCH_THRESHOLD: 0.72,
  PRICE_MATCH_MARGIN: 0.08,

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
  // ÚNICA fuente de correo válida.
  // Se procesa solo el mensaje ORIGINAL enviado por esta casilla y cuyo
  // asunto tenga el formato:
  // PLANILLA CUMPLIMIENTO SUB-PRODUCTOS <DÍA> DD DE <MES> DE YYYY
  GMAIL_SUBJECT: 'PLANILLA CUMPLIMIENTO SUB-PRODUCTOS',
  GMAIL_SUBJECT_PREFIX: 'PLANILLA CUMPLIMIENTO SUB-PRODUCTOS',
  GMAIL_ALLOWED_SENDERS: Object.freeze([
    'reservador.horario@masisa.com'
  ]),
  GMAIL_PROCESSED_LABEL: 'Astilla/Planilla procesada',
  GMAIL_SEARCH_DAYS: 120,
  GMAIL_MAX_THREADS: 300,
  TRIGGER_MINUTES: 15,

  // Posición de respaldo de las columnas de Ingresos (base cero),
  // con el layout habitual de la hoja Ingresos.
  // Si la hoja trae encabezados, se detectan por nombre y esto no
  // se usa.
  MATERIAL_MAP: Object.freeze({
    '3000039': 'ASTILLA PINO VERDE',
    '3009002': 'AST. PINO VERDE C/ CORTEZA',
    '3009003': 'ASTILLA EUCALYPTUS NITENS'
  }),

  // Posiciones de respaldo (base cero) de la hoja Ingresos.
  // Si los encabezados están presentes, se detectan por nombre.
  INGRESOS_COLUMNS: Object.freeze({
    MATERIAL: 2,
    DESCRIPCION_MATERIAL: 3,
    FECHA_CONTABLE: 4,
    TEXTO_POSICION: 7,
    CANTIDAD: 8,
    UM: 10,
    PROVEEDOR: 11,
    DESCRIPCION_PROVEEDOR: 12,
    DESTINO: 13,
    ROL: 14,
    PREDIO: 16
  })
});

const SUBPRODUCTOS_OBJETIVO = Object.freeze([
  'ASTILLA EUCALYPTUS NITENS',
  'AST. PINO VERDE C/ CORTEZA',
  'ASTILLA PINO VERDE'
]);

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
      'Diagnosticar cruce Ingresos vs planilla',
      'diagnosticarCruce'
    )
    .addSeparator()
    .addItem('Validar hoja Plan (no modifica)', 'prepararHojaPlan')
    .addSeparator()
    .addItem('Preparar hoja de mapeos', 'instalarMapeos')
    .addItem('Ubicar en el mapa', 'ubicarMapeos')
    .addItem('Preparar hoja de rutas', 'instalarRutas')
    .addSeparator()
    .addItem('Instalar automatización', 'instalarDisparador')
    .addItem('Eliminar automatización', 'eliminarDisparadores')
    .addToUi();
}

function doGet() {
  return HtmlService
    .createTemplateFromFile(CONFIG.HTML_FILE)
    .evaluate()
    .setTitle('Astilla Proceso · Control de suministro')
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
    'Astilla Proceso · Control de suministro'
  );
}


/**
 * Compatibilidad con el menú anterior.
 * IMPORTANTE: esta función NO crea columnas, NO limpia celdas y NO cambia
 * formatos de la hoja Plan. Solo lee y valida la estructura existente.
 */
function prepararHojaPlan() {
  return validarHojaPlan();
}

function validarHojaPlan() {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const timezone =
    spreadsheet.getSpreadsheetTimeZone() || CONFIG.TIMEZONE;
  const month = getCurrentMonthWindow_(timezone);
  const plan = readPlan_(spreadsheet, month);

  const lines = [
    'Validación de hoja Plan',
    '',
    'Hoja: ' + (plan.sheetName || CONFIG.SHEET_PLAN),
    'Mes: ' + (plan.monthLabel || month.label),
    'Filas proveedor/material: ' + plan.details.length,
    'Plan mensual total: ' + round_(plan.totalPlan || 0, 1) + ' TS',
    'Precio promedio ponderado plan: ' +
      (
        plan.weightedPrice !== null
          ? round_(plan.weightedPrice, 2) + ' por TS'
          : 'Sin volumen planificado con precio'
      ),
    'Costo plan valorizado: ' + round_(plan.plannedCost || 0, 2),
    ''
  ];

  SUBPRODUCTOS_OBJETIVO.forEach(function(name) {
    const row = plan.rows.filter(function(item) {
      return item.subproducto === name;
    })[0];

    if (!row) {
      lines.push('- ' + name + ': sin filas en Plan');
      return;
    }

    lines.push(
      '- ' +
      name +
      ': ' +
      round_(row.plan || 0, 1) +
      ' TS · precio pond. ' +
      (
        row.weightedPrice !== null
          ? round_(row.weightedPrice, 2)
          : '—'
      )
    );
  });

  if (plan.invalidRows.length) {
    lines.push('');
    lines.push(
      'Filas no reconocidas: ' + plan.invalidRows.length
    );
    plan.invalidRows.slice(0, 15).forEach(function(item) {
      lines.push('- Fila ' + item.row + ': ' + item.reason);
    });
  }

  try {
    SpreadsheetApp.getUi().alert(lines.join('\n'));
  } catch (ignoredUi) {}

  return plan;
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

  const ingresos = readIngresos_(
    spreadsheet,
    timezone,
    historyStart
  );

  const informe = readInformeRows_(
    spreadsheet,
    timezone,
    historyStart,
    ingresos.proveedores
  );

  const supplement = buildSupplementRows_(
    ingresos.rows,
    informe.rows
  );

  const baseRows = ingresos.rows.concat(supplement.rows);

  const workdays = buildWorkdaysInfo_(
    timezone,
    month,
    supplement.lastActualDate,
    supplement.latestReportDate
  );

  const plan = readPlan_(spreadsheet, month);
  const pricing = applyPlanPricing_(
    baseRows,
    plan.details
  );
  const rows = pricing.rows;

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
    holidays: CONFIG.FERIADOS.slice(),
    subproductos: SUBPRODUCTOS_OBJETIVO.slice(),
    materialMap: CONFIG.MATERIAL_MAP,
    source: {
      spreadsheetName: spreadsheet.getName(),
      spreadsheetUrl: spreadsheet.getUrl(),
      missingIngresos: ingresos.missingSheet,
      missingInforme: informe.missingSheet,
      ingresosRows: ingresos.rows.length,
      ingresosIgnored: ingresos.ignored,
      informeRows: informe.rows.length,
      supplementRows: supplement.rows.length,
      supplementCamiones: supplement.camiones,
      reports: informe.reports,
      errors: informe.errors,
      lastActualDate: supplement.lastActualDate,
      lastActualDateLabel: supplement.lastActualDate
        ? formatDateKey_(supplement.lastActualDate)
        : 'Sin datos reales',
      supplementStart: supplement.supplementStart,
      supplementStartLabel: supplement.supplementStart
        ? formatDateKey_(supplement.supplementStart)
        : 'Sin complemento',
      latestReportDate: supplement.latestReportDate,
      latestReportDateLabel: supplement.latestReportDate
        ? formatDateKey_(supplement.latestReportDate)
        : 'Sin planilla',
      staleReports: supplement.staleReports,
      hasPlan: plan.details.length > 0,
      planInvalidRows: plan.invalidRows.length,
      planMissingProducts: SUBPRODUCTOS_OBJETIVO.filter(function(name) {
        return !plan.rows.some(function(item) {
          return item.subproducto === name;
        });
      }),
      planWeightedPrice: plan.weightedPrice,
      planCost: plan.plannedCost,
      priceCoverage: pricing.stats.coverage,
      priceUnmatchedTs: pricing.stats.unpricedTs,
      planSheetName: plan.sheetName || CONFIG.SHEET_PLAN,
      planMonthLabel: plan.monthLabel || '',
      materialesSinReconocer: ingresos.materialesSinReconocer
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
      ),
      destinos: uniqueSorted_(
        rows.map(function(item) {
          return item.destino;
        })
      )
    },
    plan: plan.rows,
    planDetails: plan.details,
    pricing: pricing.stats,
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
 * LECTURA DE INGRESOS REALES
 * ===================================================================== */

function readIngresos_(spreadsheet, timezone, historyStart) {
  const sheet = spreadsheet.getSheetByName(CONFIG.SHEET_INGRESOS);

  if (!sheet || sheet.getLastRow() < 2) {
    return {
      rows: [],
      proveedores: [],
      ignored: 0,
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
  let ignored = 0;

  for (let rowIndex = 1; rowIndex < values.length; rowIndex++) {
    const row = values[rowIndex];
    const displayRow = displayed[rowIndex] || [];

    const dateKey = toDateKey_(
      row[columns.FECHA_CONTABLE],
      displayRow[columns.FECHA_CONTABLE],
      timezone
    );

    if (!dateKey || dateKey < historyStart) {
      continue;
    }

    const material = row[columns.MATERIAL];
    const descripcion = text_(row[columns.DESCRIPCION_MATERIAL]);
    const textoPosicion = columns.TEXTO_POSICION >= 0
      ? text_(row[columns.TEXTO_POSICION])
      : '';

    const resolved = resolveIngresosSubproducto_(
      material,
      descripcion,
      textoPosicion
    );

    if (!resolved.subproducto) {
      ignored++;

      const rawKey = [
        normalizeSapMaterialCode_(material) || text_(material),
        descripcion
      ].filter(Boolean).join(' | ');

      if (rawKey) {
        noMatch[rawKey] = true;
      }

      continue;
    }

    const proveedor =
      text_(row[columns.DESCRIPCION_PROVEEDOR]) ||
      (columns.PROVEEDOR >= 0
        ? text_(row[columns.PROVEEDOR])
        : '') ||
      'SIN PROVEEDOR';

    const cantidad = toNumber_(
      row[columns.CANTIDAD],
      displayRow[columns.CANTIDAD]
    );

    if (!isFinite(cantidad) || cantidad === 0) {
      continue;
    }

    rows.push({
      fecha: dateKey,
      fechaNumero: Number(dateKey.replace(/-/g, '')),
      fechaLabel: formatDateKey_(dateKey),
      source: 'INGRESOS',
      subproducto: resolved.subproducto,
      subproductoRaw: descripcion || text_(material),
      material: normalizeSapMaterialCode_(material) || text_(material),
      proveedor: proveedor,
      proveedorRaw: proveedor,
      matchMethod: resolved.method,
      matchScore: 1,
      destino: columns.DESTINO >= 0
        ? text_(row[columns.DESTINO])
        : '',
      camiones: null,
      factor: null,
      ts: cantidad,
      um: text_(row[columns.UM]) || CONFIG.UNIDAD,
      predio: columns.PREDIO >= 0
        ? text_(row[columns.PREDIO])
        : '',
      rol: columns.ROL >= 0
        ? text_(row[columns.ROL])
        : '',
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
    materialesSinReconocer: Object.keys(noMatch).sort(),
    missingSheet: false
  };
}

function normalizeSapMaterialCode_(value) {
  if (typeof value === 'number' && isFinite(value)) {
    return String(Math.trunc(value));
  }

  const text = String(value || '').trim();

  if (!text) {
    return '';
  }

  const match = text.match(/\b(3000039|3009002|3009003)\b/);

  if (match) {
    return match[1];
  }

  if (/^\d+(?:[.,]0+)?$/.test(text)) {
    return String(Math.trunc(Number(text.replace(',', '.'))));
  }

  return text.replace(/\s+/g, '');
}

function resolveIngresosSubproducto_(material, descripcion, textoPosicion) {
  const code = normalizeSapMaterialCode_(material);

  if (CONFIG.MATERIAL_MAP[code]) {
    return {
      subproducto: CONFIG.MATERIAL_MAP[code],
      method: 'Código material ' + code
    };
  }

  const key = normalizeKey_(
    [descripcion, textoPosicion].join(' ')
  );

  if (
    key.indexOf('OTRA ESPECIE') !== -1 ||
    key.indexOf('EUCA') !== -1 ||
    key.indexOf('EUCALYPTUS') !== -1 ||
    key.indexOf('NITENS') !== -1
  ) {
    return {
      subproducto: 'ASTILLA EUCALYPTUS NITENS',
      method: 'Descripción material'
    };
  }

  if (
    key.indexOf('ASTILLA VERDE CON CORTEZA') !== -1 ||
    (
      key.indexOf('ASTILLA VERDE') !== -1 &&
      key.indexOf('CORTEZA') !== -1
    )
  ) {
    return {
      subproducto: 'AST. PINO VERDE C/ CORTEZA',
      method: 'Descripción material'
    };
  }

  if (key.indexOf('ASTILLA VERDE') !== -1) {
    return {
      subproducto: 'ASTILLA PINO VERDE',
      method: 'Descripción material'
    };
  }

  return { subproducto: '', method: '' };
}

/**
 * Ubica las columnas de Ingresos por nombre de encabezado y, si la
 * descarga no los trae, cae a las posiciones fijas de CONFIG.
 */
function resolveIngresosColumns_(headerRow) {
  const map = buildHeaderMap_(headerRow);

  function pick(names, fallback) {
    for (let index = 0; index < names.length; index++) {
      if (map[names[index]] !== undefined) {
        return map[names[index]];
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
    TEXTO_POSICION: pick(
      ['texto posicion', 'texto de posicion'],
      defaults.TEXTO_POSICION
    ),
    CANTIDAD: pick(
      ['cantidad', 'cantidad ts', 'ts', 'volumen'],
      defaults.CANTIDAD
    ),
    UM: pick(
      ['um', 'unidad', 'unidad medida'],
      defaults.UM
    ),
    PROVEEDOR: pick(
      ['proveedor', 'codigo proveedor'],
      defaults.PROVEEDOR
    ),
    DESCRIPCION_PROVEEDOR: pick(
      [
        'descripcion proveedor',
        'des proveedor',
        'desc proveedor',
        'nombre proveedor'
      ],
      defaults.DESCRIPCION_PROVEEDOR
    ),
    DESTINO: pick(['destino'], defaults.DESTINO),
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
 * Los nombres de proveedor se homologan contra los de la hoja Ingresos.
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

    const subproducto =
      canonicalSubproducto_(row[map['subproducto']]) ||
      canonicalSubproducto_(row[map['subproducto planilla']]);

    if (!subproducto) {
      continue;
    }

    const proveedorRaw =
      text_(row[map['proveedor planilla']]);

    // Regla defensiva: InformeAstilla puede contener filas antiguas de una
    // reconstrucción previa. Nunca se aceptan totales ni filas sin proveedor,
    // porque esas filas representan sumas y duplicarían los camiones.
    if (
      !proveedorRaw ||
      proveedorRaw === 'SIN PROVEEDOR' ||
      isTotalText_(proveedorRaw)
    ) {
      continue;
    }

    const match = resolveProveedor_(
      proveedorRaw,
      proveedoresSap
    );

    byDate[dateKey].rows.push({
      fecha: dateKey,
      fechaNumero: Number(dateKey.replace(/-/g, '')),
      fechaLabel: formatDateKey_(dateKey),
      source: 'PLANILLA',
      subproducto: subproducto,
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
 * COMPLEMENTO: INGRESOS MANDA, LA PLANILLA TAPA EL HUECO
 * ===================================================================== */

function buildSupplementRows_(ingresosRows, informeRows) {
  const lastActualDate = ingresosRows.reduce(
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
    // Día ya presente en Ingresos: el estimado se descarta.
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

  // La primera fecha realmente complementada. Sin datos de Ingresos el
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
 * El reservador escribe "PROMASA S.A." y en Ingresos puede figurar "PROMASA SA". Se comparan
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
 * Hoja Plan con estructura:
 *   Suministro | Proveedor | Precio | <mes>
 *
 * "Suministro" puede aparecer solo en la primera fila del grupo y se
 * arrastra hacia abajo. El precio es unitario por TS para la combinación
 * proveedor/material y la columna del mes contiene el volumen planificado.
 */
function readPlan_(spreadsheet, month) {
  const sheet = spreadsheet.getSheetByName(CONFIG.SHEET_PLAN);

  if (!sheet || sheet.getLastRow() < 2) {
    return {
      rows: [],
      details: [],
      invalidRows: [],
      sheetName: sheet ? sheet.getName() : CONFIG.SHEET_PLAN,
      monthLabel: '',
      totalPlan: 0,
      plannedCost: 0,
      weightedPrice: null
    };
  }

  const range = sheet.getDataRange();
  const values = range.getValues();
  const displayed = range.getDisplayValues();

  let headerRowIndex = -1;
  let suministroColumn = -1;
  let proveedorColumn = -1;
  let precioColumn = -1;

  for (
    let rowIndex = 0;
    rowIndex < Math.min(values.length, 20);
    rowIndex++
  ) {
    const map = buildHeaderMap_(values[rowIndex]);

    if (
      map['suministro'] !== undefined &&
      map['proveedor'] !== undefined &&
      map['precio'] !== undefined
    ) {
      headerRowIndex = rowIndex;
      suministroColumn = map['suministro'];
      proveedorColumn = map['proveedor'];
      precioColumn = map['precio'];
      break;
    }
  }

  if (headerRowIndex === -1) {
    return {
      rows: [],
      details: [],
      invalidRows: [{
        row: 1,
        reason:
          'Se esperaban las columnas Suministro, Proveedor y Precio.'
      }],
      sheetName: sheet.getName(),
      monthLabel: '',
      totalPlan: 0,
      plannedCost: 0,
      weightedPrice: null
    };
  }

  const monthColumn = findPlanMonthColumn_(
    values[headerRowIndex],
    displayed[headerRowIndex],
    month
  );

  if (monthColumn === -1) {
    return {
      rows: [],
      details: [],
      invalidRows: [{
        row: headerRowIndex + 1,
        reason: 'No existe una columna para el mes ' + month.prefix + '.'
      }],
      sheetName: sheet.getName(),
      monthLabel: '',
      totalPlan: 0,
      plannedCost: 0,
      weightedPrice: null
    };
  }

  const monthLabel =
    text_(displayed[headerRowIndex][monthColumn]) ||
    text_(values[headerRowIndex][monthColumn]);

  const details = [];
  const invalidRows = [];
  let currentSupplyRaw = '';
  let currentSubproducto = '';

  for (
    let rowIndex = headerRowIndex + 1;
    rowIndex < values.length;
    rowIndex++
  ) {
    const supplyCell = text_(
      displayed[rowIndex][suministroColumn] !== ''
        ? displayed[rowIndex][suministroColumn]
        : values[rowIndex][suministroColumn]
    );

    if (supplyCell) {
      currentSupplyRaw = supplyCell;
      currentSubproducto = resolvePlanSubproducto_(supplyCell);
    }

    const proveedorPlan = text_(
      displayed[rowIndex][proveedorColumn] !== ''
        ? displayed[rowIndex][proveedorColumn]
        : values[rowIndex][proveedorColumn]
    );

    const rawPrice =
      displayed[rowIndex][precioColumn] !== ''
        ? displayed[rowIndex][precioColumn]
        : values[rowIndex][precioColumn];

    const rawPlan =
      displayed[rowIndex][monthColumn] !== ''
        ? displayed[rowIndex][monthColumn]
        : values[rowIndex][monthColumn];

    const hasContent =
      supplyCell ||
      proveedorPlan ||
      text_(rawPrice) ||
      text_(rawPlan);

    if (!hasContent) {
      continue;
    }

    if (!currentSubproducto) {
      invalidRows.push({
        row: rowIndex + 1,
        reason:
          'Suministro no reconocido: ' +
          (currentSupplyRaw || '(vacío)')
      });
      continue;
    }

    if (!proveedorPlan) {
      invalidRows.push({
        row: rowIndex + 1,
        reason:
          'Fila de ' + currentSubproducto + ' sin proveedor.'
      });
      continue;
    }

    const precio = parseOptionalNumber_(rawPrice);
    const planValue = parseOptionalNumber_(rawPlan);
    const planTs = planValue === null ? 0 : planValue;

    const planKey =
      currentSubproducto +
      '||' +
      priceProviderComparable_(proveedorPlan);

    details.push({
      row: rowIndex + 1,
      planKey: planKey,
      subproducto: currentSubproducto,
      suministroRaw: currentSupplyRaw,
      proveedorPlan: proveedorPlan,
      proveedorPlanKey: priceProviderComparable_(proveedorPlan),
      precio: precio,
      plan: planTs,
      planCost:
        precio !== null
          ? precio * planTs
          : null
    });
  }

  const aggregate = {};

  details.forEach(function(item) {
    if (!aggregate[item.subproducto]) {
      aggregate[item.subproducto] = {
        subproducto: item.subproducto,
        plan: 0,
        pricedPlanTs: 0,
        planCost: 0,
        suppliers: 0
      };
    }

    const target = aggregate[item.subproducto];
    target.plan += Number(item.plan) || 0;
    target.suppliers++;

    if (item.precio !== null && item.plan > 0) {
      target.pricedPlanTs += item.plan;
      target.planCost += item.precio * item.plan;
    }
  });

  const rows = Object.keys(aggregate).map(function(key) {
    const item = aggregate[key];

    return {
      subproducto: item.subproducto,
      plan: item.plan,
      pricedPlanTs: item.pricedPlanTs,
      planCost: item.planCost,
      suppliers: item.suppliers,
      weightedPrice:
        item.pricedPlanTs > 0
          ? item.planCost / item.pricedPlanTs
          : null
    };
  });

  const totalPlan = rows.reduce(function(total, item) {
    return total + (Number(item.plan) || 0);
  }, 0);

  const pricedPlanTs = rows.reduce(function(total, item) {
    return total + (Number(item.pricedPlanTs) || 0);
  }, 0);

  const plannedCost = rows.reduce(function(total, item) {
    return total + (Number(item.planCost) || 0);
  }, 0);

  return {
    rows: rows,
    details: details,
    invalidRows: invalidRows,
    sheetName: sheet.getName(),
    monthLabel: monthLabel,
    totalPlan: totalPlan,
    pricedPlanTs: pricedPlanTs,
    plannedCost: plannedCost,
    weightedPrice:
      pricedPlanTs > 0
        ? plannedCost / pricedPlanTs
        : null
  };
}

function resolvePlanSubproducto_(value) {
  const raw = text_(value);
  const key = normalizeKey_(raw);

  const codes = Object.keys(CONFIG.MATERIAL_MAP);

  for (let index = 0; index < codes.length; index++) {
    const code = codes[index];

    if (key.indexOf(code) !== -1) {
      return CONFIG.MATERIAL_MAP[code];
    }
  }

  return canonicalSubproducto_(raw);
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
 * PRECIOS Y VALORIZACIÓN · PLAN ↔ INGRESOS/PLANILLA
 * ===================================================================== */

/**
 * Normalización específica de proveedores para precios.
 * A diferencia del cruce operativo, conserva palabras como FORESTAL,
 * ASERRADERO, INDUSTRIA y MADERERA porque ayudan a distinguir empresas
 * con nombres parecidos. Solo elimina formas jurídicas y unifica algunas
 * abreviaturas frecuentes.
 */
function priceProviderComparable_(value) {
  const legalWords = {
    SA: true,
    SPA: true,
    LTDA: true,
    LIMITADA: true,
    EIRL: true,
    S: true,
    A: true,
    E: true,
    I: true,
    R: true,
    L: true,
    SOC: true,
    SOCIEDAD: true
  };

  return normalizeKey_(value)
    .replace(/\bBIOBIO\b/g, 'BIO BIO')
    .replace(/\bASERRADEROS\b/g, 'ASERRADERO')
    .replace(/\bFOR\b/g, 'FORESTAL')
    .replace(/\bIND\b/g, 'INDUSTRIA')
    .replace(/\bINDUST\b/g, 'INDUSTRIA')
    .replace(/\bINMOB\b/g, 'INMOBILIARIA')
    .replace(/\bSERV\b/g, 'SERVICIOS')
    .split(' ')
    .filter(function(token) {
      return token && !legalWords[token];
    })
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function priceProviderSimilarity_(a, b) {
  if (!a || !b) {
    return 0;
  }

  if (a === b) {
    return 1;
  }

  const tokensA = uniqueTokens_(a);
  const tokensB = uniqueTokens_(b);

  if (!tokensA.length || !tokensB.length) {
    return 0;
  }

  const intersection = tokensA.filter(function(token) {
    return tokensB.indexOf(token) !== -1;
  }).length;

  const shorter = Math.min(tokensA.length, tokensB.length);
  const longer = Math.max(tokensA.length, tokensB.length);

  const shortCoverage = shorter
    ? intersection / shorter
    : 0;

  const longCoverage = longer
    ? intersection / longer
    : 0;

  const edit =
    1 - levenshtein_(a, b) / Math.max(a.length, b.length);

  let score =
    0.62 * shortCoverage +
    0.23 * longCoverage +
    0.15 * Math.max(0, edit);

  if (
    intersection >= 2 &&
    shortCoverage === 1
  ) {
    const extraTokens = longer - shorter;
    score = Math.max(
      score,
      Math.max(0.78, 0.94 - extraTokens * 0.04)
    );
  }

  return Math.min(1, score);
}

function resolvePlanPrice_(proveedor, subproducto, planDetails) {
  const raw = text_(proveedor);

  if (
    !raw ||
    normalizeKey_(raw) === 'SIN PROVEEDOR'
  ) {
    return {
      detail: null,
      method: 'Sin proveedor',
      score: 0,
      secondScore: 0
    };
  }

  const comparable = priceProviderComparable_(raw);

  const candidates = (planDetails || []).filter(function(item) {
    return (
      item.subproducto === subproducto &&
      item.precio !== null &&
      item.precio !== undefined &&
      isFinite(Number(item.precio))
    );
  });

  if (!candidates.length) {
    return {
      detail: null,
      method: 'Sin precio para material',
      score: 0,
      secondScore: 0
    };
  }

  const ranked = candidates.map(function(item) {
    const candidateKey =
      item.proveedorPlanKey ||
      priceProviderComparable_(item.proveedorPlan);

    return {
      detail: item,
      score: priceProviderSimilarity_(
        comparable,
        candidateKey
      )
    };
  }).sort(function(a, b) {
    return b.score - a.score;
  });

  const best = ranked[0];
  const second = ranked[1] || { score: 0 };

  if (!best || best.score < CONFIG.PRICE_MATCH_THRESHOLD) {
    return {
      detail: null,
      method: 'Proveedor sin precio homologado',
      score: best ? round_(best.score, 3) : 0,
      secondScore: round_(second.score || 0, 3)
    };
  }

  if (
    second.score >= CONFIG.PRICE_MATCH_THRESHOLD &&
    best.score - second.score < CONFIG.PRICE_MATCH_MARGIN
  ) {
    return {
      detail: null,
      method: 'Precio ambiguo',
      score: round_(best.score, 3),
      secondScore: round_(second.score, 3)
    };
  }

  return {
    detail: best.detail,
    method:
      best.score === 1
        ? 'Precio exacto'
        : 'Precio homologado',
    score: round_(best.score, 3),
    secondScore: round_(second.score || 0, 3)
  };
}

function applyPlanPricing_(rows, planDetails) {
  const output = [];
  const unmatched = {};
  let pricedTs = 0;
  let unpricedTs = 0;
  let estimatedCost = 0;

  (rows || []).forEach(function(row) {
    const match = resolvePlanPrice_(
      row.proveedor,
      row.subproducto,
      planDetails
    );

    const detail = match.detail;
    const precio = detail
      ? Number(detail.precio)
      : null;

    const ts = Number(row.ts) || 0;
    const hasPrice =
      precio !== null &&
      isFinite(precio);

    if (hasPrice) {
      pricedTs += ts;
      estimatedCost += ts * precio;
    } else {
      unpricedTs += ts;

      const unmatchedKey =
        row.subproducto +
        ' | ' +
        (row.proveedor || 'SIN PROVEEDOR') +
        ' | ' +
        match.method;

      unmatched[unmatchedKey] =
        (unmatched[unmatchedKey] || 0) + ts;
    }

    const enriched = Object.assign({}, row, {
      planKey: detail ? detail.planKey : '',
      planProveedor: detail ? detail.proveedorPlan : '',
      precioUnitario: hasPrice ? precio : null,
      costoEstimado: hasPrice ? ts * precio : null,
      precioMatchMethod: match.method,
      precioMatchScore: match.score,
      precioSecondScore: match.secondScore
    });

    output.push(enriched);
  });

  const totalTs = pricedTs + unpricedTs;

  return {
    rows: output,
    stats: {
      totalTs: totalTs,
      pricedTs: pricedTs,
      unpricedTs: unpricedTs,
      coverage: totalTs > 0 ? pricedTs / totalTs : 0,
      estimatedCost: estimatedCost,
      weightedPrice:
        pricedTs > 0
          ? estimatedCost / pricedTs
          : null,
      unmatched: Object.keys(unmatched)
        .map(function(key) {
          return {
            key: key,
            ts: unmatched[key]
          };
        })
        .sort(function(a, b) {
          return b.ts - a.ts;
        })
    }
  };
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

        if (!matchesPlanillaMessage_(message)) {
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

  // La búsqueda ya se restringe al remitente oficial y a la frase
  // inicial del asunto. Después matchesPlanillaMessage_ vuelve a validar
  // mensaje por mensaje porque Gmail.search() devuelve hilos completos.
  parts.push('subject:"' + CONFIG.GMAIL_SUBJECT + '"');

  if (
    CONFIG.GMAIL_ALLOWED_SENDERS &&
    CONFIG.GMAIL_ALLOWED_SENDERS.length === 1
  ) {
    parts.push('from:' + CONFIG.GMAIL_ALLOWED_SENDERS[0]);
  }

  parts.push(
    'newer_than:' + CONFIG.GMAIL_SEARCH_DAYS + 'd'
  );

  return parts.join(' ');
}

function extractEmailAddress_(value) {
  const text = String(value || '').trim().toLowerCase();
  const bracket = text.match(/<([^>]+@[^>]+)>/);

  if (bracket) {
    return bracket[1].trim();
  }

  const direct = text.match(
    /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i
  );

  return direct ? direct[0].toLowerCase() : '';
}

/**
 * Acepta únicamente la planilla original del reservador.
 * Respuestas "Re:", reenvíos y otros mensajes del hilo se excluyen para
 * evitar que una conversación interna reemplace al informe oficial.
 */
function matchesPlanillaMessage_(message) {
  const subject = text_(message.getSubject());
  const sender = extractEmailAddress_(message.getFrom());

  const allowed = CONFIG.GMAIL_ALLOWED_SENDERS || [];

  // 1) Remitente exacto. Las respuestas dentro del mismo hilo pueden ser
  // de otras personas; se descartan aunque Gmail haya devuelto el hilo.
  if (
    allowed.length &&
    allowed.map(function(item) {
      return String(item).toLowerCase();
    }).indexOf(sender) === -1
  ) {
    return false;
  }

  // 2) Asunto exacto en estructura. No se aceptan Re:, RV:, Fwd:, notas
  // internas ni textos agregados. Solo cambia el día/fecha del informe.
  const normalizedSubject = normalizeKey_(subject)
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const officialPattern = new RegExp(
    '^PLANILLA CUMPLIMIENTO SUB PRODUCTOS ' +
    '(LUNES|MARTES|MIERCOLES|JUEVES|VIERNES|SABADO|DOMINGO) ' +
    '\\d{1,2} DE ' +
    '(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|' +
    'SEPTIEMBRE|SETIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE) ' +
    'DE \\d{4}$'
  );

  if (!officialPattern.test(normalizedSubject)) {
    return false;
  }

  // 3) La fecha debe poder extraerse del propio asunto.
  return Boolean(extractSpanishDateKey_(subject));
}

function isTotalText_(value) {
  const key = normalizeKey_(value);
  return /^TOTAL\b/.test(key);
}

function isTotalGridRow_(row) {
  return (row || []).some(function(cell) {
    return isTotalText_(cell);
  });
}

function matchesSubject_(subject) {
  function collapse(value) {
    return normalizeKey_(value).replace(/[\s-]/g, '');
  }

  return (
    collapse(subject).indexOf(
      collapse(CONFIG.GMAIL_SUBJECT_PREFIX)
    ) === 0
  );
}


/**
 * Lee la última planilla y muestra lo extraído sin escribir en la
 * hoja. Conviene correrlo antes de una carga masiva.
 */
function probarUltimoCorreo() {
  const threads = GmailApp.search(buildGmailQuery_(), 0, 10);
  const candidates = [];

  threads.forEach(function(thread) {
    thread.getMessages().forEach(function(message) {
      if (matchesPlanillaMessage_(message)) {
        candidates.push(message);
      }
    });
  });

  candidates.sort(function(a, b) {
    return b.getDate().getTime() - a.getDate().getTime();
  });

  if (!candidates.length) {
    SpreadsheetApp.getUi().alert(
      'No se encontró una planilla oficial del reservador en los últimos ' +
      CONFIG.GMAIL_SEARCH_DAYS +
      ' días.'
    );
    return;
  }

  const message = candidates[0];

  try {
    const parsed = parsePlanillaEmail_(
      message,
      CONFIG.TIMEZONE
    );

    const byProduct = {};
    let camiones = 0;

    parsed.rows.forEach(function(item) {
      camiones += item.camiones;
      byProduct[item.subproducto] =
        (byProduct[item.subproducto] || 0) + item.camiones;
    });

    const lines = [
      'Asunto: ' + message.getSubject(),
      'Remitente: ' + message.getFrom(),
      'Fecha detectada: ' + formatDateKey_(parsed.fecha),
      'Método: ' + parsed.method,
      'Filas útiles: ' + parsed.rows.length,
      'Camiones proceso: ' +
        camiones +
        ' = ' +
        camiones * CONFIG.FACTOR_CAMION +
        ' ' +
        CONFIG.UNIDAD,
      ''
    ];

    SUBPRODUCTOS_OBJETIVO.forEach(function(name) {
      const trucks = byProduct[name] || 0;
      lines.push(
        name + ': ' +
        trucks + ' camiones = ' +
        trucks * CONFIG.FACTOR_CAMION + ' ' +
        CONFIG.UNIDAD
      );
    });

    lines.push('');
    lines.push('Detalle:');

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
      lines.slice(0, 70).join('\n')
    );
  } catch (error) {
    SpreadsheetApp.getUi().alert(
      'No se pudo leer la planilla.\n\n' +
      String(error.message || error)
    );
  }
}

/**
 * Muestra qué materiales de Ingresos quedaron fuera del filtro y qué
 * proveedores de la planilla no encontraron par en Ingresos. Es la forma
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
    'Última Fecha Contab. (Ingresos): ' +
      data.source.lastActualDateLabel,
    'Última planilla: ' +
      data.source.latestReportDateLabel,
    'Filas Ingresos: ' + data.source.ingresosRows,
    'Filas de complemento: ' +
      data.source.supplementRows +
      ' (' +
      data.source.supplementCamiones +
      ' camiones)',
    'Filas de planilla descartadas por estar ya en Ingresos: ' +
      data.source.staleReports,
    'Correos con error de lectura: ' + data.source.errors,
    'Cobertura de precio: ' + round_((data.pricing.coverage || 0) * 100, 1) + '%',
    'TS sin precio homologado: ' + round_(data.pricing.unpricedTs || 0, 1),
    'Precio promedio ponderado operativo: ' +
      (data.pricing.weightedPrice !== null
        ? round_(data.pricing.weightedPrice, 2)
        : '—'),
    'Precio promedio ponderado plan: ' +
      (data.source.planWeightedPrice !== null
        ? round_(data.source.planWeightedPrice, 2)
        : '—'),
    '',
    'Materiales de Ingresos fuera del filtro:'
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
  lines.push('Proveedores de planilla sin par en Ingresos:');

  const unicos = uniqueSorted_(sinPar);

  if (unicos.length) {
    unicos.slice(0, 25).forEach(function(item) {
      lines.push('- ' + item);
    });
  } else {
    lines.push('Ninguno');
  }

  lines.push('');
  lines.push('Mayores volúmenes sin precio homologado:');

  const sinPrecio =
    data.pricing && data.pricing.unmatched
      ? data.pricing.unmatched
      : [];

  if (sinPrecio.length) {
    sinPrecio.slice(0, 20).forEach(function(item) {
      lines.push(
        '- ' +
        item.key +
        ': ' +
        round_(item.ts || 0, 1) +
        ' TS'
      );
    });
  } else {
    lines.push('Ninguno');
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

    // Nunca tomar subtotales/totales. Se revisa toda la fila porque según
    // la versión del correo "Total Astilla Verde" puede aparecer en la
    // columna de subproducto, en PROVEEDORES o en otra celda combinada.
    if (isTotalGridRow_(row)) {
      currentRaw = '';
      currentCanonical = '';
      continue;
    }

    if (label) {
      currentRaw = label;
      currentCanonical = canonicalSubproducto_(label);
    }

    if (!currentCanonical) {
      continue;
    }

    // Una fila de detalle válida SIEMPRE debe tener proveedor. Los totales
    // suelen venir con proveedor vacío; por eso no se convierte a
    // "SIN PROVEEDOR".
    const proveedor = text_(row[proveedorColumn]);

    if (!proveedor || isTotalText_(proveedor)) {
      continue;
    }

    const camiones = parseOptionalNumber_(
      row[cantidadColumn]
    );

    if (
      camiones === null ||
      !isFinite(camiones) ||
      camiones <= 0
    ) {
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

    if (isTotalText_(line)) {
      currentRaw = '';
      currentCanonical = '';
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

    const proveedor = text_(tail[1]);
    const camiones = Number(tail[3]);

    if (
      !proveedor ||
      isTotalText_(proveedor) ||
      !isFinite(camiones) ||
      camiones <= 0
    ) {
      return;
    }

    rows.push({
      subproducto: currentCanonical,
      subproductoRaw: currentRaw,
      proveedor: proveedor,
      destino: normalizeKey_(tail[2]),
      camiones: camiones
    });
  });

  return { rows: rows, fecha: fecha };
}

/**
 * Devuelve el nombre canónico si el sub-producto va a proceso, o ''
 * si hay que ignorarlo. Sirve tanto para la planilla como para la
 * descripción de la planilla: tolera "AST." vs "ASTILLA",
 * plural, "C/ CORTEZA" vs "CON CORTEZA", tildes y espacios dobles.
 * Si el correo usa un nombre muy distinto, agrégalo aquí.
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

  return '';
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
    .setBackground('#4a2f21')
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
/* =====================================================================
 * MAPEO DE ASERRADEROS (HOJA "Mapeos")
 *
 * Una fila por aserradero. Tú pones nombre y, para ubicarlo, o bien la
 * coordenada o bien la dirección.
 *
 * La coordenada manda. Un aserradero rural rara vez tiene dirección
 * que un geocodificador resuelva bien ("Camino a Nacimiento s/n"
 * termina en el centro de la comuna, o en otra), así que pegar el par
 * que entrega Google Maps es más exacto y no depende de un servicio.
 *
 * El estado ES el motivo: "Cerrado" cuando se cerró carga, y
 * cualquiera de los otros cuando no. Todo nace en "Por visitar".
 * Solo "Cerrado" pide cargas, y las exige mayores que cero.
 * ===================================================================== */

const MAPEOS_HEADERS = Object.freeze([
  'ID',
  'Nombre',
  'Dirección',
  'Comuna',
  'Coordenadas',
  'Estado',
  'Cargas',
  'Contacto',
  'Teléfono',
  'Latitud',
  'Longitud',
  'Última actualización',
  'Actualizado por',
  'Notas'
]);

const ESTADO_INICIAL = 'Por visitar';
const ESTADO_CERRADO = 'Cerrado';

/**
 * El orden importa: así se ven en el filtro y en la leyenda del mapa.
 * Del primero al último es el recorrido natural de una gestión.
 */
const ESTADOS_MAPEO = Object.freeze([
  { nombre: 'Por visitar', color: '#9DB0A3', cierra: false },
  { nombre: 'En negociación', color: '#6FCB8C', cierra: false },
  { nombre: 'Cerrado', color: '#B5793F', cierra: true },
  { nombre: 'Sin stock', color: '#9A7BB5', cierra: false },
  { nombre: 'Precio fuera de mercado', color: '#D9573F', cierra: false },
  { nombre: 'Comprometido con otro', color: '#6B8CB0', cierra: false },
  { nombre: 'No hubo contacto', color: '#4E5D57', cierra: false }
]);

/**
 * Chile continental, con holgura. Sirve para dos cosas: rechazar una
 * coordenada que quedó mal pegada, y detectar el error clásico de
 * invertir latitud y longitud —que no da error, solo pone el pin en
 * medio del Atlántico—.
 */
const LIMITES_CL = Object.freeze({
  latMin: -56.5, latMax: -17.0,
  lngMin: -76.0, lngMax: -66.0
});

function nombresEstados_() {
  return ESTADOS_MAPEO.map(function(item) {
    return item.nombre;
  });
}

/**
 * Resuelve las columnas por nombre de encabezado, en base 1.
 *
 * Antes estaban fijas por posición, así que agregar o mover una
 * columna en la hoja rompía la escritura en silencio. Ahora la hoja se
 * puede reordenar sin tocar el código.
 */
function columnasMapeos_(sheet) {
  const encabezados = sheet
    .getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1))
    .getValues()[0];

  const mapa = buildHeaderMap_(encabezados);

  function col(nombre, obligatoria) {
    const indice = mapa[normalizeHeader_(nombre)];

    if (indice === undefined) {
      if (obligatoria) {
        throw new Error(
          'A la hoja "' + CONFIG.SHEET_MAPEOS + '" le falta la columna "' +
          nombre + '". Corre "Preparar hoja de mapeos".'
        );
      }

      return 0;
    }

    return indice + 1;
  }

  return {
    id: col('ID', true),
    nombre: col('Nombre', true),
    direccion: col('Dirección', true),
    comuna: col('Comuna', false),
    coordenadas: col('Coordenadas', false),
    estado: col('Estado', true),
    cargas: col('Cargas', true),
    contacto: col('Contacto', false),
    telefono: col('Teléfono', false),
    lat: col('Latitud', true),
    lng: col('Longitud', true),
    actualizado: col('Última actualización', false),
    autor: col('Actualizado por', false),
    notas: col('Notas', false)
  };
}

function valorEn_(fila, columna) {
  return columna ? fila[columna - 1] : '';
}

/**
 * Entiende lo que la gente pega de verdad:
 *   -37.0331, -72.4015
 *   -37.0331 -72.4015
 *   37°02'00.0"S 72°24'05.0"W
 *
 * Si el par no cae en Chile pero el par invertido sí, lo corrige y lo
 * dice. Es el error más común y el más difícil de notar: no falla,
 * solo deja el pin en el mar.
 */
function parseCoordenadas_(texto) {
  const crudo = text_(texto);

  if (!crudo) {
    return null;
  }

  let lat = null;
  let lng = null;
  let metodo = '';

  // Grados, minutos y segundos, como los comparte Google Maps.
  const gms = crudo.match(
    /(\d{1,3})\s*°\s*(\d{1,2})\s*['′]\s*([\d.,]+)\s*["″]?\s*([NSns])[,\s]+(\d{1,3})\s*°\s*(\d{1,2})\s*['′]\s*([\d.,]+)\s*["″]?\s*([EWOewo])/
  );

  if (gms) {
    function aDecimal(g, m, s, hemisferio) {
      const valor =
        Number(g) +
        Number(m) / 60 +
        Number(String(s).replace(',', '.')) / 3600;

      return /[SsWwOo]/.test(hemisferio) ? -valor : valor;
    }

    lat = aDecimal(gms[1], gms[2], gms[3], gms[4]);
    lng = aDecimal(gms[5], gms[6], gms[7], gms[8]);
    metodo = 'Coordenada pegada (GMS)';
  } else {
    // Par decimal. Se admite coma decimal, pero solo si el separador
    // entre ambos números es otra cosa: "-37,03 -72,40".
    let limpio = crudo.replace(/[()\[\]]/g, ' ').trim();

    if (/^-?\d{1,3},\d+\s+-?\d{1,3},\d+$/.test(limpio)) {
      limpio = limpio.replace(/,/g, '.');
    }

    const par = limpio.match(
      /^\s*(-?\d{1,3}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/
    );

    if (!par) {
      return null;
    }

    lat = Number(par[1]);
    lng = Number(par[2]);
    metodo = 'Coordenada pegada';
  }

  if (!isFinite(lat) || !isFinite(lng)) {
    return null;
  }

  function dentro(la, lo) {
    return la >= LIMITES_CL.latMin && la <= LIMITES_CL.latMax &&
           lo >= LIMITES_CL.lngMin && lo <= LIMITES_CL.lngMax;
  }

  if (dentro(lat, lng)) {
    return { lat: lat, lng: lng, metodo: metodo, invertida: false };
  }

  if (dentro(lng, lat)) {
    return {
      lat: lng,
      lng: lat,
      metodo: metodo + ', invertida',
      invertida: true
    };
  }

  return {
    lat: null,
    lng: null,
    metodo: metodo,
    fuera: true,
    crudo: crudo
  };
}

/**
 * Crea o repara la hoja: encabezados, validación de Estado, formatos y
 * relleno de los estados vacíos. Se puede correr las veces que sea.
 */
function instalarMapeos() {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);

  let sheet = spreadsheet.getSheetByName(CONFIG.SHEET_MAPEOS);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(CONFIG.SHEET_MAPEOS);
  }

  // Si la hoja viene del esquema anterior (sin "Coordenadas"), se
  // conserva lo escrito y solo se agrega la columna que falta.
  const anchoActual = sheet.getLastColumn();

  const encabezadosActuales = anchoActual
    ? sheet.getRange(1, 1, 1, anchoActual).getValues()[0].map(text_)
    : [];

  const faltaCoordenadas =
    encabezadosActuales.length &&
    encabezadosActuales.indexOf('Coordenadas') === -1 &&
    encabezadosActuales.indexOf('Comuna') !== -1;

  if (faltaCoordenadas) {
    const trasComuna = encabezadosActuales.indexOf('Comuna') + 1;
    sheet.insertColumnAfter(trasComuna);
    sheet.getRange(1, trasComuna + 1).setValue('Coordenadas');
  }

  sheet
    .getRange(1, 1, 1, MAPEOS_HEADERS.length)
    .setValues([MAPEOS_HEADERS])
    .setBackground('#121C17')
    .setFontColor('#B5793F')
    .setFontWeight('bold');

  sheet.setFrozenRows(1);

  const anchos = [
    90, 250, 280, 130, 190, 180, 85, 165, 125, 105, 105, 160, 200, 280
  ];

  anchos.forEach(function(ancho, indice) {
    sheet.setColumnWidth(indice + 1, ancho);
  });

  const columnas = columnasMapeos_(sheet);
  const ultima = sheet.getLastRow();

  if (ultima < 2) {
    SpreadsheetApp.getUi().alert(
      'Hoja "' + CONFIG.SHEET_MAPEOS + '" lista.\n\n' +
      'Agrega una fila por aserradero. Para ubicarlo en el mapa basta ' +
      'con pegar la coordenada en "Coordenadas" (en Google Maps: clic ' +
      'derecho sobre el punto y copiar). Si no la tienes, escribe la ' +
      'dirección y la comuna.\n\n' +
      'El estado se rellena solo en "' + ESTADO_INICIAL + '".'
    );
    return;
  }

  const filas = ultima - 1;

  sheet
    .getRange(2, columnas.estado, filas, 1)
    .setDataValidation(
      SpreadsheetApp.newDataValidation()
        .requireValueInList(nombresEstados_(), true)
        .setAllowInvalid(false)
        .setHelpText(
          'Solo "' + ESTADO_CERRADO + '" lleva cargas. ' +
          'Los demás estados son el motivo por el que no se cerró.'
        )
        .build()
    );

  sheet.getRange(2, columnas.cargas, filas, 1).setNumberFormat('#,##0');
  sheet.getRange(2, columnas.lat, filas, 1).setNumberFormat('0.000000');
  sheet.getRange(2, columnas.lng, filas, 1).setNumberFormat('0.000000');
  sheet.getRange(2, columnas.coordenadas, filas, 1).setNumberFormat('@');

  if (columnas.actualizado) {
    sheet
      .getRange(2, columnas.actualizado, filas, 1)
      .setNumberFormat('dd/MM/yyyy HH:mm');
  }

  const rango = sheet.getRange(2, 1, filas, MAPEOS_HEADERS.length);
  const valores = rango.getValues();

  let maximo = 0;

  valores.forEach(function(fila) {
    const numero = Number(
      String(valorEn_(fila, columnas.id) || '').replace(/\D/g, '')
    );

    if (numero > maximo) {
      maximo = numero;
    }
  });

  let sinEstado = 0;
  let sinId = 0;

  valores.forEach(function(fila) {
    if (
      !text_(valorEn_(fila, columnas.nombre)) &&
      !text_(valorEn_(fila, columnas.direccion))
    ) {
      return;
    }

    if (!text_(valorEn_(fila, columnas.id))) {
      maximo++;
      fila[columnas.id - 1] = 'MAP-' + String(maximo).padStart(4, '0');
      sinId++;
    }

    if (!text_(valorEn_(fila, columnas.estado))) {
      fila[columnas.estado - 1] = ESTADO_INICIAL;
      sinEstado++;
    }
  });

  rango.setValues(valores);

  SpreadsheetApp.getUi().alert(
    'Hoja "' + CONFIG.SHEET_MAPEOS + '" lista.\n\n' +
    'Aserraderos: ' + filas + '\n' +
    'IDs asignados: ' + sinId + '\n' +
    'Estados puestos en "' + ESTADO_INICIAL + '": ' + sinEstado +
    (faltaCoordenadas ? '\nSe agregó la columna "Coordenadas".' : '') +
    '\n\nAhora corre "Ubicar en el mapa".'
  );
}

/**
 * Deja a cada aserradero con latitud y longitud, en este orden:
 *   1. La coordenada pegada, si la hay. Es exacta y no cuesta nada.
 *   2. La dirección, geocodificada. Solo si no hay coordenada.
 *
 * Nunca pisa una fila que ya tiene latitud.
 */
function ubicarMapeos() {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(CONFIG.SHEET_MAPEOS);

  if (!sheet || sheet.getLastRow() < 2) {
    SpreadsheetApp.getUi().alert(
      'No hay nada que ubicar. Corre primero ' +
      '"Preparar hoja de mapeos".'
    );
    return;
  }

  const columnas = columnasMapeos_(sheet);
  const filas = sheet.getLastRow() - 1;
  const rango = sheet.getRange(2, 1, filas, MAPEOS_HEADERS.length);
  const valores = rango.getValues();

  let porCoordenada = 0;
  let porDireccion = 0;
  let invertidas = 0;
  const problemas = [];

  let geocoder = null;

  valores.forEach(function(fila) {
    const nombre =
      text_(valorEn_(fila, columnas.nombre)) ||
      text_(valorEn_(fila, columnas.direccion));

    if (!nombre || Number(valorEn_(fila, columnas.lat))) {
      return;
    }

    // 1) Coordenada pegada.
    const pegada = parseCoordenadas_(
      valorEn_(fila, columnas.coordenadas)
    );

    if (pegada) {
      if (pegada.fuera) {
        problemas.push(
          nombre + ': la coordenada "' + pegada.crudo +
          '" no cae en Chile'
        );
        return;
      }

      fila[columnas.lat - 1] = pegada.lat;
      fila[columnas.lng - 1] = pegada.lng;
      porCoordenada++;

      if (pegada.invertida) {
        invertidas++;
      }

      return;
    }

    // 2) Dirección.
    const direccion = text_(valorEn_(fila, columnas.direccion));

    if (!direccion) {
      problemas.push(nombre + ': sin coordenada ni dirección');
      return;
    }

    if (!geocoder) {
      geocoder = Maps.newGeocoder().setRegion('cl');
    }

    const comuna = text_(valorEn_(fila, columnas.comuna));

    try {
      const respuesta = geocoder.geocode(
        [direccion, comuna, 'Chile'].filter(Boolean).join(', ')
      );

      if (
        respuesta.status === 'OK' &&
        respuesta.results &&
        respuesta.results.length
      ) {
        const punto = respuesta.results[0].geometry.location;
        fila[columnas.lat - 1] = punto.lat;
        fila[columnas.lng - 1] = punto.lng;
        porDireccion++;
      } else {
        problemas.push(nombre + ': la dirección no se pudo ubicar');
      }
    } catch (error) {
      problemas.push(
        nombre + ': ' + String(error.message || error)
      );
    }

    Utilities.sleep(220);
  });

  rango.setValues(valores);

  const lineas = [
    'Ubicación terminada.',
    '',
    'Por coordenada pegada: ' + porCoordenada,
    'Por dirección (geocodificadas): ' + porDireccion
  ];

  if (invertidas) {
    lineas.push(
      'Coordenadas invertidas y corregidas: ' + invertidas
    );
  }

  if (problemas.length) {
    lineas.push('');
    lineas.push('Quedaron sin ubicar:');

    problemas.slice(0, 15).forEach(function(item) {
      lineas.push('  - ' + item);
    });

    lineas.push('');
    lineas.push(
      'Lo más rápido: en Google Maps, clic derecho sobre el punto, ' +
      'copiar el par y pegarlo en la columna "Coordenadas". ' +
      'También puedes fijarlo con un clic desde el mapa del dashboard.'
    );
  }

  SpreadsheetApp.getUi().alert(lineas.join('\n'));
}

/**
 * Lo que consume el mapa. Devuelve también los aserraderos sin
 * coordenadas, para poder mostrarlos aparte en vez de perderlos.
 */
function getMapeos() {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(CONFIG.SHEET_MAPEOS);

  const base = {
    estados: ESTADOS_MAPEO.map(function(item) {
      return {
        nombre: item.nombre,
        color: item.color,
        cierra: item.cierra
      };
    }),
    estadoInicial: ESTADO_INICIAL,
    estadoCerrado: ESTADO_CERRADO,
    rows: [],
    sinUbicar: 0,
    missingSheet: !sheet
  };

  if (!sheet || sheet.getLastRow() < 2) {
    return base;
  }

  const columnas = columnasMapeos_(sheet);

  const valores = sheet
    .getRange(2, 1, sheet.getLastRow() - 1, MAPEOS_HEADERS.length)
    .getValues();

  const timezone =
    spreadsheet.getSpreadsheetTimeZone() || CONFIG.TIMEZONE;

  valores.forEach(function(fila) {
    const nombre = text_(valorEn_(fila, columnas.nombre));
    const direccion = text_(valorEn_(fila, columnas.direccion));

    if (!nombre && !direccion) {
      return;
    }

    let lat = Number(valorEn_(fila, columnas.lat));
    let lng = Number(valorEn_(fila, columnas.lng));
    let ubicado = isFinite(lat) && isFinite(lng) && lat !== 0;

    // Si alguien pegó la coordenada y no corrió "Ubicar en el mapa",
    // igual se dibuja: no tiene por qué acordarse de un paso extra.
    if (!ubicado) {
      const pegada = parseCoordenadas_(
        valorEn_(fila, columnas.coordenadas)
      );

      if (pegada && !pegada.fuera) {
        lat = pegada.lat;
        lng = pegada.lng;
        ubicado = true;
      }
    }

    if (!ubicado) {
      base.sinUbicar++;
    }

    const fecha = valorEn_(fila, columnas.actualizado);

    base.rows.push({
      id: text_(valorEn_(fila, columnas.id)),
      nombre: nombre || direccion,
      direccion: direccion,
      comuna: text_(valorEn_(fila, columnas.comuna)),
      estado: text_(valorEn_(fila, columnas.estado)) || ESTADO_INICIAL,
      cargas: toNumber_(valorEn_(fila, columnas.cargas), ''),
      contacto: text_(valorEn_(fila, columnas.contacto)),
      telefono: text_(valorEn_(fila, columnas.telefono)),
      lat: ubicado ? lat : null,
      lng: ubicado ? lng : null,
      actualizado: fecha instanceof Date
        ? Utilities.formatDate(fecha, timezone, 'dd/MM/yyyy HH:mm')
        : '',
      actualizadoPor: text_(valorEn_(fila, columnas.autor)),
      notas: text_(valorEn_(fila, columnas.notas))
    });
  });

  return base;
}

/** Ubica la fila de un aserradero por ID. Devuelve -1 si no está. */
function filaDeMapeo_(sheet, columnas, id) {
  const filas = sheet.getLastRow() - 1;

  if (filas < 1) {
    return -1;
  }

  const ids = sheet.getRange(2, columnas.id, filas, 1).getValues();

  for (let indice = 0; indice < ids.length; indice++) {
    if (text_(ids[indice][0]) === id) {
      return indice + 2;
    }
  }

  return -1;
}

function autorActual_() {
  try {
    return Session.getActiveUser().getEmail() || '';
  } catch (ignored) {
    return '';
  }
}

/**
 * Guarda el resultado de una visita.
 *
 * "Cerrado" sin cargas es el error que hay que atajar: sería una
 * gestión cerrada que no suma tonelaje. Se rechaza antes de escribir.
 */
function guardarMapeo(payload) {
  payload = payload || {};

  const id = text_(payload.id);
  const estado = text_(payload.estado);

  if (!id) {
    throw new Error('Falta el identificador del aserradero.');
  }

  if (nombresEstados_().indexOf(estado) === -1) {
    throw new Error('Estado desconocido: ' + estado);
  }

  const cierra = estado === ESTADO_CERRADO;
  const cargas = cierra ? Number(payload.cargas) : '';

  if (cierra && (!isFinite(cargas) || cargas <= 0)) {
    throw new Error(
      'Un aserradero en "' + ESTADO_CERRADO +
      '" necesita cuántas cargas se cerraron.'
    );
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(CONFIG.SHEET_MAPEOS);

    if (!sheet) {
      throw new Error(
        'No existe la hoja "' + CONFIG.SHEET_MAPEOS + '".'
      );
    }

    const columnas = columnasMapeos_(sheet);
    const objetivo = filaDeMapeo_(sheet, columnas, id);

    if (objetivo === -1) {
      throw new Error('No se encontró el aserradero ' + id + '.');
    }

    sheet.getRange(objetivo, columnas.estado).setValue(estado);
    sheet.getRange(objetivo, columnas.cargas).setValue(cargas);

    if (columnas.actualizado) {
      sheet.getRange(objetivo, columnas.actualizado).setValue(new Date());
    }

    if (columnas.autor) {
      sheet.getRange(objetivo, columnas.autor).setValue(autorActual_());
    }

    if (columnas.notas) {
      sheet
        .getRange(objetivo, columnas.notas)
        .setValue(text_(payload.notas));
    }

    return getMapeos();
  } finally {
    lock.releaseLock();
  }
}

/**
 * Fija la posición desde el mapa del dashboard, con un clic.
 * Es la salida para el aserradero cuya dirección no existe en ningún
 * callejero pero que sabes exactamente dónde está.
 */
function guardarUbicacion(payload) {
  payload = payload || {};

  const id = text_(payload.id);
  const lat = Number(payload.lat);
  const lng = Number(payload.lng);

  if (!id) {
    throw new Error('Falta el identificador del aserradero.');
  }

  if (!isFinite(lat) || !isFinite(lng)) {
    throw new Error('La coordenada no es válida.');
  }

  if (
    lat < LIMITES_CL.latMin || lat > LIMITES_CL.latMax ||
    lng < LIMITES_CL.lngMin || lng > LIMITES_CL.lngMax
  ) {
    throw new Error('Ese punto queda fuera de Chile.');
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(CONFIG.SHEET_MAPEOS);

    if (!sheet) {
      throw new Error(
        'No existe la hoja "' + CONFIG.SHEET_MAPEOS + '".'
      );
    }

    const columnas = columnasMapeos_(sheet);
    const objetivo = filaDeMapeo_(sheet, columnas, id);

    if (objetivo === -1) {
      throw new Error('No se encontró el aserradero ' + id + '.');
    }

    const redondear = function(valor) {
      return Math.round(valor * 1000000) / 1000000;
    };

    sheet.getRange(objetivo, columnas.lat).setValue(redondear(lat));
    sheet.getRange(objetivo, columnas.lng).setValue(redondear(lng));

    if (columnas.coordenadas) {
      sheet
        .getRange(objetivo, columnas.coordenadas)
        .setValue(redondear(lat) + ', ' + redondear(lng));
    }

    if (columnas.actualizado) {
      sheet.getRange(objetivo, columnas.actualizado).setValue(new Date());
    }

    if (columnas.autor) {
      sheet.getRange(objetivo, columnas.autor).setValue(autorActual_());
    }

    return getMapeos();
  } finally {
    lock.releaseLock();
  }
}

/** Alta rápida desde el mapa, sin pasar por la hoja. */
function agregarMapeo(payload) {
  payload = payload || {};

  const nombre = text_(payload.nombre);
  const direccion = text_(payload.direccion);
  const coordenadas = text_(payload.coordenadas);

  if (!nombre) {
    throw new Error('El nombre es obligatorio.');
  }

  if (!direccion && !coordenadas) {
    throw new Error(
      'Hace falta la coordenada o la dirección para poder ubicarlo.'
    );
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(CONFIG.SHEET_MAPEOS);

    if (!sheet) {
      throw new Error(
        'No existe la hoja "' + CONFIG.SHEET_MAPEOS +
        '". Corre "Preparar hoja de mapeos".'
      );
    }

    const columnas = columnasMapeos_(sheet);

    let maximo = 0;

    if (sheet.getLastRow() > 1) {
      sheet
        .getRange(2, columnas.id, sheet.getLastRow() - 1, 1)
        .getValues()
        .forEach(function(fila) {
          const numero = Number(
            String(fila[0] || '').replace(/\D/g, '')
          );

          if (numero > maximo) {
            maximo = numero;
          }
        });
    }

    const comuna = text_(payload.comuna);

    let lat = '';
    let lng = '';

    const pegada = parseCoordenadas_(coordenadas);

    if (pegada && !pegada.fuera) {
      lat = pegada.lat;
      lng = pegada.lng;
    } else if (direccion) {
      try {
        const respuesta = Maps.newGeocoder()
          .setRegion('cl')
          .geocode(
            [direccion, comuna, 'Chile'].filter(Boolean).join(', ')
          );

        if (
          respuesta.status === 'OK' &&
          respuesta.results &&
          respuesta.results.length
        ) {
          lat = respuesta.results[0].geometry.location.lat;
          lng = respuesta.results[0].geometry.location.lng;
        }
      } catch (ignored) {}
    }

    const nueva = [];

    nueva[columnas.id - 1] = 'MAP-' + String(maximo + 1).padStart(4, '0');
    nueva[columnas.nombre - 1] = nombre;
    nueva[columnas.direccion - 1] = direccion;
    nueva[columnas.estado - 1] = ESTADO_INICIAL;
    nueva[columnas.cargas - 1] = '';
    nueva[columnas.lat - 1] = lat;
    nueva[columnas.lng - 1] = lng;

    if (columnas.comuna) { nueva[columnas.comuna - 1] = comuna; }
    if (columnas.coordenadas) {
      nueva[columnas.coordenadas - 1] = coordenadas;
    }
    if (columnas.contacto) {
      nueva[columnas.contacto - 1] = text_(payload.contacto);
    }
    if (columnas.telefono) {
      nueva[columnas.telefono - 1] = text_(payload.telefono);
    }
    if (columnas.actualizado) {
      nueva[columnas.actualizado - 1] = new Date();
    }
    if (columnas.autor) { nueva[columnas.autor - 1] = autorActual_(); }

    for (let i = 0; i < MAPEOS_HEADERS.length; i++) {
      if (nueva[i] === undefined) { nueva[i] = ''; }
    }

    sheet.appendRow(nueva);

    return getMapeos();
  } finally {
    lock.releaseLock();
  }
}

/* =====================================================================
 * RUTAS DE VISITA (HOJA "Rutas")
 *
 * Una ruta es un día de terreno: varios aserraderos en orden, con una
 * fecha y una hora de partida. Al guardarla con fecha, queda agendada
 * en el calendario del usuario como un solo bloque.
 *
 * SOBRE LA ESTIMACIÓN DE TIEMPO
 * Apps Script no trae un servicio de ruteo sin API key, así que el
 * tiempo se calcula con distancia en línea recta (haversine) corregida
 * por un factor de camino. Es un APROXIMADO y la pantalla lo dice: en
 * caminos forestales el factor real varía harto. Sirve para saber si el
 * día alcanza, no para prometer una hora de llegada.
 * ===================================================================== */

const RUTAS_HEADERS = Object.freeze([
  'ID',
  'Nombre',
  'Fecha',
  'Hora inicio',
  'Paradas',
  'N° paradas',
  'Kilómetros',
  'Minutos viaje',
  'Minutos visita',
  'Duración total',
  'Hora término',
  'Evento calendario',
  'Estado',
  'Creado por',
  'Actualizado',
  'Notas'
]);

const RUTA_CONFIG = Object.freeze({
  // Desde dónde parte y a dónde vuelve el recorrido.
  ORIGEN: Object.freeze({
    nombre: 'Planta Cabrero',
    lat: -37.0333,
    lng: -72.4000
  }),

  // Velocidad promedio de camino rural, en km/h.
  VELOCIDAD_KMH: 55,

  // La línea recta subestima: los caminos forestales dan vueltas.
  // 1.35 es un factor conservador para la zona.
  FACTOR_CAMINO: 1.35,

  // Cuánto dura estar en cada aserradero.
  MINUTOS_VISITA: 45,

  HORA_INICIO: '08:30',

  // Sobre este total, la ruta no cabe en una jornada.
  MINUTOS_JORNADA: 9 * 60
});

function columnasRutas_(sheet) {
  const encabezados = sheet
    .getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1))
    .getValues()[0];

  const mapa = buildHeaderMap_(encabezados);

  function col(nombre, obligatoria) {
    const indice = mapa[normalizeHeader_(nombre)];

    if (indice === undefined) {
      if (obligatoria) {
        throw new Error(
          'A la hoja "' + CONFIG.SHEET_RUTAS + '" le falta la columna "' +
          nombre + '". Corre "Preparar hoja de rutas".'
        );
      }

      return 0;
    }

    return indice + 1;
  }

  return {
    id: col('ID', true),
    nombre: col('Nombre', true),
    fecha: col('Fecha', true),
    hora: col('Hora inicio', true),
    paradas: col('Paradas', true),
    cuantas: col('N° paradas', false),
    km: col('Kilómetros', false),
    minutosViaje: col('Minutos viaje', false),
    minutosVisita: col('Minutos visita', false),
    duracion: col('Duración total', false),
    termino: col('Hora término', false),
    evento: col('Evento calendario', true),
    estado: col('Estado', false),
    autor: col('Creado por', false),
    actualizado: col('Actualizado', false),
    notas: col('Notas', false)
  };
}

function instalarRutas() {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);

  let sheet = spreadsheet.getSheetByName(CONFIG.SHEET_RUTAS);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(CONFIG.SHEET_RUTAS);
  }

  sheet
    .getRange(1, 1, 1, RUTAS_HEADERS.length)
    .setValues([RUTAS_HEADERS])
    .setBackground('#175239')
    .setFontColor('#C9903F')
    .setFontWeight('bold');

  sheet.setFrozenRows(1);

  const anchos = [
    90, 220, 105, 95, 280, 90, 100, 110, 110, 110, 105, 260, 110, 200, 150, 260
  ];

  anchos.forEach(function(ancho, indice) {
    sheet.setColumnWidth(indice + 1, ancho);
  });

  if (sheet.getLastRow() > 1) {
    const filas = sheet.getLastRow() - 1;
    const columnas = columnasRutas_(sheet);

    sheet.getRange(2, columnas.fecha, filas, 1)
      .setNumberFormat('dd/MM/yyyy');

    if (columnas.actualizado) {
      sheet.getRange(2, columnas.actualizado, filas, 1)
        .setNumberFormat('dd/MM/yyyy HH:mm');
    }
  }

  SpreadsheetApp.getUi().alert(
    'Hoja "' + CONFIG.SHEET_RUTAS + '" lista.\n\n' +
    'Las rutas se arman desde el dashboard: pestaña Mapeos › ' +
    '"Armar ruta". Esta hoja es el registro; no hace falta editarla ' +
    'a mano.'
  );
}

/* --- Estimación de tiempo ------------------------------------------ */

function haversineKm_(a, b) {
  const R = 6371;
  const rad = Math.PI / 180;

  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;

  const s =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

/**
 * Devuelve el itinerario completo: cuánto se viaja hasta cada parada,
 * a qué hora se llega y cuándo se vuelve al origen.
 *
 * Es un aproximado por línea recta corregida. No es ruteo.
 */
function estimarRuta_(paradas, horaInicio) {
  // Ojo: Number(null) es 0 y isFinite(0) es true, así que un filtro
  // ingenuo deja pasar las paradas sin coordenada como si estuvieran
  // en el golfo de Guinea, y mete un tramo de 10.000 km en la ruta.
  function tieneCoordenada(valor) {
    return valor !== null && valor !== undefined && valor !== '' &&
      isFinite(Number(valor));
  }

  const conPunto = (paradas || []).filter(function(p) {
    return tieneCoordenada(p.lat) && tieneCoordenada(p.lng);
  });

  const base = {
    km: 0,
    minutosViaje: 0,
    minutosVisita: 0,
    minutosTotal: 0,
    tramos: [],
    sinUbicar: (paradas || []).length - conPunto.length,
    excedeJornada: false
  };

  if (!conPunto.length) {
    return base;
  }

  const minutosInicio = horaAMinutos_(horaInicio) ;
  let reloj = minutosInicio;
  let anterior = RUTA_CONFIG.ORIGEN;

  conPunto.forEach(function(parada) {
    const km = haversineKm_(anterior, parada) * RUTA_CONFIG.FACTOR_CAMINO;
    const viaje = Math.round(km / RUTA_CONFIG.VELOCIDAD_KMH * 60);

    reloj += viaje;

    base.tramos.push({
      id: parada.id,
      nombre: parada.nombre,
      desde: anterior.nombre,
      km: round_(km, 1),
      minutosViaje: viaje,
      llegada: minutosAHora_(reloj),
      salida: minutosAHora_(reloj + RUTA_CONFIG.MINUTOS_VISITA)
    });

    reloj += RUTA_CONFIG.MINUTOS_VISITA;

    base.km += km;
    base.minutosViaje += viaje;
    base.minutosVisita += RUTA_CONFIG.MINUTOS_VISITA;

    anterior = parada;
  });

  // El regreso también es parte del día.
  const kmVuelta =
    haversineKm_(anterior, RUTA_CONFIG.ORIGEN) * RUTA_CONFIG.FACTOR_CAMINO;
  const viajeVuelta = Math.round(
    kmVuelta / RUTA_CONFIG.VELOCIDAD_KMH * 60
  );

  reloj += viajeVuelta;

  base.tramos.push({
    id: '',
    nombre: 'Regreso a ' + RUTA_CONFIG.ORIGEN.nombre,
    desde: anterior.nombre,
    km: round_(kmVuelta, 1),
    minutosViaje: viajeVuelta,
    llegada: minutosAHora_(reloj),
    salida: ''
  });

  base.km = round_(base.km + kmVuelta, 1);
  base.minutosViaje += viajeVuelta;
  base.minutosTotal = base.minutosViaje + base.minutosVisita;
  base.horaTermino = minutosAHora_(reloj);
  base.excedeJornada = base.minutosTotal > RUTA_CONFIG.MINUTOS_JORNADA;

  return base;
}

function horaAMinutos_(texto) {
  const m = String(texto || RUTA_CONFIG.HORA_INICIO).match(
    /^(\d{1,2}):(\d{2})$/
  );

  return m ? Number(m[1]) * 60 + Number(m[2]) : 8 * 60 + 30;
}

function minutosAHora_(minutos) {
  const total = Math.max(0, Math.round(minutos));
  const h = Math.floor(total / 60) % 24;

  return String(h).padStart(2, '0') + ':' +
    String(total % 60).padStart(2, '0');
}

function duracionLegible_(minutos) {
  const total = Math.max(0, Math.round(minutos));
  const h = Math.floor(total / 60);
  const m = total % 60;

  if (!h) { return m + ' min'; }

  return h + ' h' + (m ? ' ' + m + ' min' : '');
}

/* --- Lectura -------------------------------------------------------- */

function getRutas() {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(CONFIG.SHEET_RUTAS);

  const base = {
    rows: [],
    missingSheet: !sheet,
    origen: RUTA_CONFIG.ORIGEN.nombre,
    minutosVisita: RUTA_CONFIG.MINUTOS_VISITA,
    velocidad: RUTA_CONFIG.VELOCIDAD_KMH,
    factorCamino: RUTA_CONFIG.FACTOR_CAMINO,
    horaInicio: RUTA_CONFIG.HORA_INICIO,
    minutosJornada: RUTA_CONFIG.MINUTOS_JORNADA
  };

  if (!sheet || sheet.getLastRow() < 2) {
    return base;
  }

  const columnas = columnasRutas_(sheet);
  const timezone =
    spreadsheet.getSpreadsheetTimeZone() || CONFIG.TIMEZONE;

  const valores = sheet
    .getRange(2, 1, sheet.getLastRow() - 1, RUTAS_HEADERS.length)
    .getValues();

  valores.forEach(function(fila) {
    const id = text_(valorEn_(fila, columnas.id));

    if (!id) {
      return;
    }

    const fecha = valorEn_(fila, columnas.fecha);
    const actualizado = valorEn_(fila, columnas.actualizado);

    base.rows.push({
      id: id,
      nombre: text_(valorEn_(fila, columnas.nombre)),
      fecha: fecha instanceof Date
        ? Utilities.formatDate(fecha, timezone, 'yyyy-MM-dd')
        : text_(fecha),
      hora: text_(valorEn_(fila, columnas.hora)) ||
        RUTA_CONFIG.HORA_INICIO,
      paradas: text_(valorEn_(fila, columnas.paradas))
        .split(/\s*,\s*/)
        .filter(Boolean),
      km: toNumber_(valorEn_(fila, columnas.km), ''),
      minutosViaje: toNumber_(valorEn_(fila, columnas.minutosViaje), ''),
      minutosVisita: toNumber_(valorEn_(fila, columnas.minutosVisita), ''),
      minutosTotal: toNumber_(valorEn_(fila, columnas.duracion), ''),
      horaTermino: text_(valorEn_(fila, columnas.termino)),
      eventoId: text_(valorEn_(fila, columnas.evento)),
      estado: text_(valorEn_(fila, columnas.estado)),
      autor: text_(valorEn_(fila, columnas.autor)),
      actualizado: actualizado instanceof Date
        ? Utilities.formatDate(actualizado, timezone, 'dd/MM/yyyy HH:mm')
        : '',
      notas: text_(valorEn_(fila, columnas.notas))
    });
  });

  return base;
}

/* --- Guardar y agendar ---------------------------------------------- */

/**
 * Guarda la ruta y, si tiene fecha, la deja en el calendario.
 *
 * Si la ruta ya tenía evento, se actualiza el mismo en vez de crear
 * otro: agendar dos veces la misma ruta llenaría el día de duplicados.
 */
function guardarRuta(payload) {
  payload = payload || {};

  const nombre = text_(payload.nombre);
  const paradas = (payload.paradas || [])
    .map(text_)
    .filter(Boolean);

  if (!nombre) {
    throw new Error('La ruta necesita un nombre.');
  }

  if (!paradas.length) {
    throw new Error('La ruta necesita al menos un aserradero.');
  }

  const fecha = text_(payload.fecha);

  if (fecha && !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    throw new Error('La fecha no es válida.');
  }

  const hora = text_(payload.hora) || RUTA_CONFIG.HORA_INICIO;

  if (!/^\d{1,2}:\d{2}$/.test(hora)) {
    throw new Error('La hora de inicio no es válida.');
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(CONFIG.SHEET_RUTAS);

    if (!sheet) {
      throw new Error(
        'No existe la hoja "' + CONFIG.SHEET_RUTAS +
        '". Corre "Preparar hoja de rutas".'
      );
    }

    const columnas = columnasRutas_(sheet);

    // Las paradas se resuelven contra Mapeos para tener coordenadas y
    // nombres frescos, no los que se guardaron alguna vez.
    const mapeos = getMapeos();
    const porId = {};

    (mapeos.rows || []).forEach(function(m) { porId[m.id] = m; });

    const detalle = paradas
      .map(function(id) { return porId[id]; })
      .filter(Boolean);

    if (!detalle.length) {
      throw new Error(
        'Ninguna de las paradas existe en la hoja de mapeos.'
      );
    }

    const estimacion = estimarRuta_(detalle, hora);

    let objetivo = -1;
    let id = text_(payload.id);

    if (sheet.getLastRow() > 1) {
      const ids = sheet
        .getRange(2, columnas.id, sheet.getLastRow() - 1, 1)
        .getValues();

      let maximo = 0;

      ids.forEach(function(f, indice) {
        const actual = text_(f[0]);

        if (id && actual === id) {
          objetivo = indice + 2;
        }

        const numero = Number(String(actual).replace(/\D/g, ''));

        if (numero > maximo) { maximo = numero; }
      });

      if (!id) {
        id = 'RUT-' + String(maximo + 1).padStart(3, '0');
      }
    } else if (!id) {
      id = 'RUT-001';
    }

    if (objetivo === -1) {
      objetivo = Math.max(2, sheet.getLastRow() + 1);
    }

    // Evento previo, para actualizar en vez de duplicar.
    const eventoPrevio = columnas.evento && objetivo <= sheet.getLastRow()
      ? text_(sheet.getRange(objetivo, columnas.evento).getValue())
      : '';

    const agenda = fecha
      ? sincronizarEvento_(
          eventoPrevio, id, nombre, fecha, hora, detalle, estimacion,
          text_(payload.notas)
        )
      : { eventoId: '', estado: 'Sin fecha', mensaje: '' };

    let autor = '';

    try {
      autor = Session.getActiveUser().getEmail() || '';
    } catch (ignored) {}

    const fila = [];

    fila[columnas.id - 1] = id;
    fila[columnas.nombre - 1] = nombre;
    fila[columnas.fecha - 1] = fecha ? dateKeyToLocalDate_(fecha) : '';
    fila[columnas.hora - 1] = hora;
    fila[columnas.paradas - 1] = detalle.map(function(d) {
      return d.id;
    }).join(', ');
    fila[columnas.evento - 1] = agenda.eventoId;

    if (columnas.cuantas) { fila[columnas.cuantas - 1] = detalle.length; }
    if (columnas.km) { fila[columnas.km - 1] = estimacion.km; }
    if (columnas.minutosViaje) {
      fila[columnas.minutosViaje - 1] = estimacion.minutosViaje;
    }
    if (columnas.minutosVisita) {
      fila[columnas.minutosVisita - 1] = estimacion.minutosVisita;
    }
    if (columnas.duracion) {
      fila[columnas.duracion - 1] = estimacion.minutosTotal;
    }
    if (columnas.termino) {
      fila[columnas.termino - 1] = estimacion.horaTermino || '';
    }
    if (columnas.estado) { fila[columnas.estado - 1] = agenda.estado; }
    if (columnas.autor) { fila[columnas.autor - 1] = autor; }
    if (columnas.actualizado) {
      fila[columnas.actualizado - 1] = new Date();
    }
    if (columnas.notas) {
      fila[columnas.notas - 1] = text_(payload.notas);
    }

    for (let i = 0; i < RUTAS_HEADERS.length; i++) {
      if (fila[i] === undefined) { fila[i] = ''; }
    }

    sheet
      .getRange(objetivo, 1, 1, RUTAS_HEADERS.length)
      .setValues([fila]);

    const salida = getRutas();
    salida.ultimoId = id;
    salida.mensajeAgenda = agenda.mensaje;

    return salida;
  } finally {
    lock.releaseLock();
  }
}

/**
 * Crea o actualiza el bloque en el calendario del usuario.
 * Un solo evento por ruta: el itinerario va en la descripción, así el
 * día no queda partido en cinco eventos de media hora.
 */
function sincronizarEvento_(
  eventoPrevio, id, nombre, fecha, hora, detalle, estimacion, notas
) {
  const partes = fecha.split('-');
  const minutos = horaAMinutos_(hora);

  const inicio = new Date(
    Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]),
    Math.floor(minutos / 60), minutos % 60
  );

  const fin = new Date(
    inicio.getTime() + Math.max(30, estimacion.minutosTotal) * 60000
  );

  const titulo =
    nombre + ' · ' + detalle.length +
    (detalle.length === 1 ? ' aserradero' : ' aserraderos');

  const lineas = [
    'Ruta de visita a aserraderos · ' + id,
    '',
    'Salida de ' + RUTA_CONFIG.ORIGEN.nombre + ' a las ' + hora + '.',
    'Duración estimada: ' + duracionLegible_(estimacion.minutosTotal) +
      ' (' + estimacion.km + ' km aprox.).',
    '',
    'Itinerario estimado:'
  ];

  estimacion.tramos.forEach(function(t, indice) {
    if (!t.id) {
      lineas.push('  · ' + t.llegada + '  ' + t.nombre +
        '  (' + t.km + ' km)');
      return;
    }

    const parada = detalle.filter(function(d) {
      return d.id === t.id;
    })[0] || {};

    lineas.push(
      '  ' + (indice + 1) + '. ' + t.llegada + '–' + t.salida + '  ' +
      t.nombre + '  (' + t.km + ' km)'
    );

    if (parada.direccion) {
      lineas.push('      ' + parada.direccion +
        (parada.comuna ? ', ' + parada.comuna : ''));
    }

    if (parada.contacto || parada.telefono) {
      lineas.push('      ' +
        [parada.contacto, parada.telefono].filter(Boolean).join(' · '));
    }
  });

  if (notas) {
    lineas.push('');
    lineas.push('Notas: ' + notas);
  }

  lineas.push('');
  lineas.push(
    'Tiempos aproximados: distancia en línea recta × ' +
    RUTA_CONFIG.FACTOR_CAMINO + ' a ' + RUTA_CONFIG.VELOCIDAD_KMH +
    ' km/h, con ' + RUTA_CONFIG.MINUTOS_VISITA +
    ' min por visita. No es ruteo real.'
  );

  const descripcion = lineas.join('\n');
  const primera = detalle[0] || {};

  const lugar = [primera.direccion, primera.comuna]
    .filter(Boolean)
    .join(', ');

  try {
    const calendario = CalendarApp.getDefaultCalendar();

    if (eventoPrevio) {
      try {
        const existente = calendario.getEventById(eventoPrevio);

        if (existente) {
          existente.setTitle(titulo);
          existente.setTime(inicio, fin);
          existente.setDescription(descripcion);

          if (lugar) { existente.setLocation(lugar); }

          return {
            eventoId: eventoPrevio,
            estado: 'Agendada',
            mensaje: 'Se actualizó el evento del calendario.'
          };
        }
      } catch (ignorado) {
        // El evento pudo borrarse a mano: se crea uno nuevo.
      }
    }

    const nuevo = calendario.createEvent(titulo, inicio, fin, {
      description: descripcion,
      location: lugar
    });

    return {
      eventoId: nuevo.getId(),
      estado: 'Agendada',
      mensaje: 'Agendada en tu calendario.'
    };
  } catch (error) {
    // Guardar la ruta no puede fallar porque el calendario no responda.
    return {
      eventoId: eventoPrevio,
      estado: 'Sin agendar',
      mensaje:
        'La ruta se guardó, pero no se pudo escribir en el calendario: ' +
        String(error.message || error)
    };
  }
}

/** Borra la ruta y su evento. */
function eliminarRuta(id) {
  const objetivoId = text_(id);

  if (!objetivoId) {
    throw new Error('Falta el identificador de la ruta.');
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(CONFIG.SHEET_RUTAS);

    if (!sheet || sheet.getLastRow() < 2) {
      throw new Error('No hay rutas guardadas.');
    }

    const columnas = columnasRutas_(sheet);
    const filas = sheet.getLastRow() - 1;
    const ids = sheet.getRange(2, columnas.id, filas, 1).getValues();

    let objetivo = -1;

    for (let i = 0; i < ids.length; i++) {
      if (text_(ids[i][0]) === objetivoId) {
        objetivo = i + 2;
        break;
      }
    }

    if (objetivo === -1) {
      throw new Error('No se encontró la ruta ' + objetivoId + '.');
    }

    const eventoId = text_(
      sheet.getRange(objetivo, columnas.evento).getValue()
    );

    if (eventoId) {
      try {
        const evento = CalendarApp.getDefaultCalendar()
          .getEventById(eventoId);

        if (evento) { evento.deleteEvent(); }
      } catch (ignorado) {}
    }

    sheet.deleteRow(objetivo);

    return getRutas();
  } finally {
    lock.releaseLock();
  }
}
