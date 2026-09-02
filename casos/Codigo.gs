/**
 * Planilla Yasna — columnas Año / Hoy / Días de los casos.
 * Spreadsheet: 1FfRbv_jkU17hfGLlyQ7N-0RZmsCrW1txtroOFDmc41Y
 *
 * Al abrir la planilla se dejan tres columnas a partir de la E:
 *
 *   E  Año                  el año de la fecha de cierre (columna C)
 *   F  Hoy                  la fecha del día en que se ejecuta el script
 *   G  Días casos abiertos  días entre la fecha de cierre y hoy
 *
 * Si esas tres columnas todavía no están, se INSERTAN en la E y todo lo que
 * había desde la E hacia adelante se corre a la derecha: no se pisa ningún
 * dato. Si ya están (porque el script corrió antes, o porque los encabezados
 * ya existen en la hoja), solo se actualizan los valores.
 *
 * Instalación: en la planilla, Extensiones › Apps Script, pega este archivo,
 * guarda y vuelve a abrir la planilla. Ver README.md.
 */

var CFG_CASOS = {
  /** Nombre de la hoja. Vacío = la primera hoja de la planilla. */
  NOMBRE_HOJA: '',
  /** Columna con la fecha de cierre. 3 = C. */
  COL_FECHA_CIERRE: 3,
  /** Dónde se insertan las tres columnas si no existen. 5 = E. */
  COL_INICIO: 5,
  /** Encabezados que quedan escritos en la fila 1. */
  ENCABEZADOS: ['Año', 'Hoy', 'Días casos abiertos'],
  /**
   * Con qué empieza el encabezado de cada columna para darla por existente.
   * Se compara en minúsculas y sin tildes, así que "año(llenarlo atravez de
   * appscript on open)" cuenta como la columna "Año".
   */
  CLAVES: ['ano', 'hoy', 'dia'],
  FORMATO_FECHA: 'dd/mm/yyyy',
  /**
   * false: se escriben valores fijos, calculados en el momento de ejecutar.
   * true : se escriben fórmulas (=HOY(), =AÑO(C2), =HOY()-C2) que la planilla
   *        recalcula sola. Ojo: con muchas filas, HOY() es volátil y la hoja
   *        se pone más lenta.
   */
  USAR_FORMULAS: false,
  /** false: el script solo corre desde el menú "Casos", no al abrir. */
  EJECUTAR_AL_ABRIR: true
};

/**
 * Se ejecuta solo, cada vez que alguien abre la planilla.
 * Deja el menú "Casos" y actualiza las tres columnas.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Casos')
    .addItem('Actualizar año / hoy / días', 'actualizarCasos')
    .addToUi();

  if (!CFG_CASOS.EJECUTAR_AL_ABRIR) return;
  try {
    actualizarCasos();
  } catch (err) {
    // El menú ya quedó puesto: si la hoja está protegida o alguien abrió la
    // planilla sin permiso de edición, no vale la pena romper la apertura.
    console.error('Casos: no se pudieron actualizar las columnas. ' + err);
  }
}

/** Inserta (si hace falta) y llena las columnas Año / Hoy / Días. */
function actualizarCasos() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = hojaDeCasos_(ss);
  var destino = prepararColumnas_(hoja);
  var filas = escribirColumnas_(hoja, destino, hoyEn_(ss.getSpreadsheetTimeZone()));

  ss.toast(filas
    ? filas + ' fila(s) actualizadas.'
    : 'No hay filas con datos que actualizar.', 'Casos', 5);
  return filas;
}

function hojaDeCasos_(ss) {
  if (!CFG_CASOS.NOMBRE_HOJA) return ss.getSheets()[0];
  var hoja = ss.getSheetByName(CFG_CASOS.NOMBRE_HOJA);
  if (!hoja) throw new Error('No existe la hoja "' + CFG_CASOS.NOMBRE_HOJA + '" en esta planilla.');
  return hoja;
}

/**
 * Deja las tres columnas listas y devuelve dónde quedaron:
 *   { col: columna donde empieza el bloque, colCierre: columna de la fecha de cierre }
 *
 * Si el bloque no existe se inserta en CFG_CASOS.COL_INICIO y el resto de las
 * columnas se corre hacia la derecha.
 */
function prepararColumnas_(hoja) {
  var n = CFG_CASOS.ENCABEZADOS.length;
  var colCierre = CFG_CASOS.COL_FECHA_CIERRE;
  var col = buscarBloque_(hoja, n);

  if (col === -1) {
    col = CFG_CASOS.COL_INICIO;
    if (hoja.getMaxColumns() < col) {
      // La hoja ni siquiera llega hasta la columna de destino: basta agregarlas.
      hoja.insertColumnsAfter(hoja.getMaxColumns(), col + n - 1 - hoja.getMaxColumns());
    } else {
      hoja.insertColumnsBefore(col, n);
      if (colCierre >= col) colCierre += n;
    }
  }

  hoja.getRange(1, col, 1, n).setValues([CFG_CASOS.ENCABEZADOS]);
  return { col: col, colCierre: colCierre };
}

/**
 * Busca en la fila 1 las tres columnas del script (aunque las hayan movido de
 * lugar). Devuelve la columna donde empiezan, o -1 si todavía no están.
 */
function buscarBloque_(hoja, n) {
  var total = hoja.getMaxColumns();
  if (hoja.getLastRow() < 1 || total < n) return -1;

  var cabeceras = hoja.getRange(1, 1, 1, total).getValues()[0];
  for (var c = 0; c + n <= total; c++) {
    var coincide = true;
    for (var i = 0; i < n; i++) {
      if (normalizar_(cabeceras[c + i]).indexOf(CFG_CASOS.CLAVES[i]) !== 0) {
        coincide = false;
        break;
      }
    }
    if (coincide) return c + 1;
  }
  return -1;
}

/** Escribe las tres columnas de la fila 2 hacia abajo. Devuelve cuántas filas llenó. */
function escribirColumnas_(hoja, destino, hoy) {
  var filas = hoja.getLastRow() - 1;
  if (filas < 1) return 0;

  var col = destino.col;

  if (CFG_CASOS.USAR_FORMULAS) {
    // RC3 = misma fila, columna C: la fórmula sirve igual para todas las filas.
    var ref = 'RC' + destino.colCierre;
    hoja.getRange(2, col, filas, 1).setFormulaR1C1('=IF(' + ref + '="","",YEAR(' + ref + '))');
    hoja.getRange(2, col + 1, filas, 1).setFormulaR1C1('=TODAY()');
    hoja.getRange(2, col + 2, filas, 1).setFormulaR1C1('=IF(' + ref + '="","",TODAY()-' + ref + ')');
  } else {
    hoja.getRange(2, col, filas, CFG_CASOS.ENCABEZADOS.length)
      .setValues(valoresDeCasos_(hoja, destino.colCierre, filas, hoy));
  }

  hoja.getRange(2, col, filas, 1).setNumberFormat('0');                      // año: 2023, no 2.023
  hoja.getRange(2, col + 1, filas, 1).setNumberFormat(CFG_CASOS.FORMATO_FECHA);
  hoja.getRange(2, col + 2, filas, 1).setNumberFormat('0');
  return filas;
}

/** Arma la matriz [año, hoy, días] de cada fila a partir de la fecha de cierre. */
function valoresDeCasos_(hoja, colCierre, filas, hoy) {
  var cierres = hoja.getRange(2, colCierre, filas, 1).getValues();
  var salida = [];
  for (var i = 0; i < filas; i++) {
    var cierre = aFecha_(cierres[i][0]);
    salida.push(cierre
      ? [cierre.getFullYear(), hoy, diasEntre_(cierre, hoy)]
      : ['', hoy, '']);
  }
  return salida;
}

/** La fecha de hoy, sin hora, en la zona horaria de la planilla. */
function hoyEn_(zona) {
  var p = Utilities.formatDate(new Date(), zona, 'yyyy-MM-dd').split('-');
  return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
}

/** Días completos entre las dos fechas. Negativo si el cierre es a futuro. */
function diasEntre_(cierre, hoy) {
  return Math.round((hoy.getTime() - cierre.getTime()) / 86400000);
}

/**
 * Convierte a fecha (sin hora) lo que haya en la celda: una fecha de verdad,
 * un número de serie de Sheets, o texto tipo 26/12/2023 o 2023-12-26.
 * Devuelve null si está vacía o no se entiende.
 */
function aFecha_(valor) {
  if (valor instanceof Date) {
    return isNaN(valor.getTime())
      ? null
      : new Date(valor.getFullYear(), valor.getMonth(), valor.getDate());
  }
  if (typeof valor === 'number') {
    // Número de serie de Sheets: días desde el 30/12/1899.
    return isFinite(valor) && valor > 0 ? new Date(1899, 11, 30 + Math.floor(valor)) : null;
  }

  var texto = String(valor == null ? '' : valor).trim();
  var iso = texto.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/);
  if (iso) return armarFecha_(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  var dmy = texto.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (dmy) return armarFecha_(Number(dmy[3]), Number(dmy[2]), Number(dmy[1]));
  return null;
}

/** Arma la fecha y comprueba que exista de verdad (descarta 31/02/2024, etc.). */
function armarFecha_(anio, mes, dia) {
  if (anio < 100) anio += 2000;
  var fecha = new Date(anio, mes - 1, dia);
  var valida = fecha.getFullYear() === anio && fecha.getMonth() === mes - 1 && fecha.getDate() === dia;
  return valida ? fecha : null;
}

/** Minúsculas, sin tildes y sin espacios de más, para comparar encabezados. */
function normalizar_(valor) {
  return String(valor == null ? '' : valor)
    .toLowerCase()
    .replace(/[áàäâ]/g, 'a')
    .replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i')
    .replace(/[óòöô]/g, 'o')
    .replace(/[úùüû]/g, 'u')
    .replace(/ñ/g, 'n')
    .replace(/\s+/g, ' ')
    .trim();
}
