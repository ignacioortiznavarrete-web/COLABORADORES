/**
 * Planilla Yasna — columnas Año / Hoy / Días de los casos.
 * Spreadsheet: 1FfRbv_jkU17hfGLlyQ7N-0RZmsCrW1txtroOFDmc41Y
 *
 * Al abrir la planilla se dejan tres columnas a partir de la E:
 *
 *   E  Año                  el año de la fecha de apertura (columna B)
 *   F  Hoy                  la fecha del día en que se ejecuta el script
 *   G  Días casos abiertos  días entre la fecha de apertura y hoy
 *
 * Las tres se reescriben COMPLETAS en cada ejecución, fila por fila hasta la
 * última que tenga datos, y se borra lo que haya quedado más abajo de una
 * ejecución anterior.
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
  /** Nombre de la pestaña. Vacío = la primera hoja de la planilla. */
  NOMBRE_HOJA: 'BD',
  /** Columna con la fecha de apertura. 2 = B. */
  COL_FECHA_APERTURA: 2,
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
   * true : se escriben fórmulas (=HOY(), =AÑO(B2), =HOY()-B2) que la planilla
   *        recalcula sola. Ojo: con muchas filas, HOY() es volátil y la hoja
   *        se pone más lenta.
   */
  USAR_FORMULAS: false,
  /** false: el script solo corre desde el menú "Casos", no al abrir. */
  EJECUTAR_AL_ABRIR: true,
  /**
   * Permite que el tablero cambie casos a abierto o cerrado en la hoja.
   * Ponlo en false si publicas la aplicación web con acceso amplio: ahí el
   * script escribe con TU cuenta, así que cualquiera con el enlace escribiría
   * en la planilla. Ver README.
   */
  PERMITIR_EDICION: true
};

/**
 * Se ejecuta solo, cada vez que alguien abre la planilla.
 * Deja el menú "Casos" y actualiza las tres columnas.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Casos')
    .addItem('Abrir tablero', 'abrirTablero')
    .addSeparator()
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

/** Inserta (si hace falta) y rellena las columnas Año / Hoy / Días. */
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
 *   { col: columna donde empieza el bloque, colApertura: columna de la fecha de apertura }
 *
 * Si el bloque no existe se inserta en CFG_CASOS.COL_INICIO y el resto de las
 * columnas se corre hacia la derecha.
 */
function prepararColumnas_(hoja) {
  var n = CFG_CASOS.ENCABEZADOS.length;
  var colApertura = CFG_CASOS.COL_FECHA_APERTURA;
  var col = buscarBloque_(hoja, n);

  if (col === -1) {
    col = CFG_CASOS.COL_INICIO;
    if (hoja.getMaxColumns() < col) {
      // La hoja ni siquiera llega hasta la columna de destino: basta agregarlas.
      hoja.insertColumnsAfter(hoja.getMaxColumns(), col + n - 1 - hoja.getMaxColumns());
    } else {
      hoja.insertColumnsBefore(col, n);
      if (colApertura >= col) colApertura += n;
    }
  }

  hoja.getRange(1, col, 1, n).setValues([CFG_CASOS.ENCABEZADOS]);
  return { col: col, colApertura: colApertura };
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

/**
 * Reescribe las tres columnas enteras, de la fila 2 hasta la última con datos.
 * Devuelve cuántas filas llenó.
 */
function escribirColumnas_(hoja, destino, hoy) {
  var n = CFG_CASOS.ENCABEZADOS.length;
  var col = destino.col;
  var ultima = ultimaFilaDeCasos_(hoja, col, n);

  limpiarSobrantes_(hoja, col, n, ultima);
  var filas = ultima - 1;
  if (filas < 1) return 0;

  if (CFG_CASOS.USAR_FORMULAS) {
    // RC2 = misma fila, columna B: la fórmula sirve igual para todas las filas.
    var ref = 'RC' + destino.colApertura;
    hoja.getRange(2, col, filas, 1).setFormulaR1C1('=IF(' + ref + '="","",YEAR(' + ref + '))');
    hoja.getRange(2, col + 1, filas, 1).setFormulaR1C1('=TODAY()');
    hoja.getRange(2, col + 2, filas, 1).setFormulaR1C1('=IF(' + ref + '="","",TODAY()-' + ref + ')');
  } else {
    hoja.getRange(2, col, filas, n)
      .setValues(valoresDeCasos_(hoja, destino.colApertura, filas, hoy));
  }

  hoja.getRange(2, col, filas, 1).setNumberFormat('0');                      // año: 2023, no 2.023
  hoja.getRange(2, col + 1, filas, 1).setNumberFormat(CFG_CASOS.FORMATO_FECHA);
  hoja.getRange(2, col + 2, filas, 1).setNumberFormat('0');
  return filas;
}

/** Arma la matriz [año, hoy, días] de cada fila a partir de la fecha de apertura. */
function valoresDeCasos_(hoja, colApertura, filas, hoy) {
  var aperturas = hoja.getRange(2, colApertura, filas, 1).getValues();
  var salida = [];
  for (var i = 0; i < filas; i++) {
    var apertura = aFecha_(aperturas[i][0]);
    salida.push(apertura
      ? [apertura.getFullYear(), hoy, diasEntre_(apertura, hoy)]
      : ['', hoy, '']);
  }
  return salida;
}

/**
 * Última fila con datos de casos. Se miran solo las columnas que NO son del
 * script: si contáramos la columna "Hoy", que el script llena, la hoja seguiría
 * creciendo sola aunque ya no queden casos abajo.
 */
function ultimaFilaDeCasos_(hoja, col, n) {
  var filas = hoja.getLastRow() - 1;
  if (filas < 1) return 1;

  var bloques = [];
  if (col > 1) bloques.push(hoja.getRange(2, 1, filas, col - 1).getValues());
  var derecha = hoja.getMaxColumns() - (col + n - 1);
  if (derecha > 0) bloques.push(hoja.getRange(2, col + n, filas, derecha).getValues());

  var ultima = 1;
  for (var b = 0; b < bloques.length; b++) {
    var valores = bloques[b];
    for (var i = valores.length - 1; i + 2 > ultima; i--) {
      if (tieneAlgo_(valores[i])) {
        ultima = i + 2;
        break;
      }
    }
  }
  return ultima;
}

/** Borra lo que el script haya dejado más abajo de la última fila con casos. */
function limpiarSobrantes_(hoja, col, n, ultima) {
  var sobran = hoja.getLastRow() - ultima;
  if (sobran > 0) hoja.getRange(ultima + 1, col, sobran, n).clearContent();
}

function tieneAlgo_(fila) {
  for (var i = 0; i < fila.length; i++) {
    if (fila[i] !== '' && fila[i] != null) return true;
  }
  return false;
}

/** La fecha de hoy, sin hora, en la zona horaria de la planilla. */
function hoyEn_(zona) {
  var p = Utilities.formatDate(new Date(), zona, 'yyyy-MM-dd').split('-');
  return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
}

/** Días completos entre las dos fechas. Negativo si la apertura es a futuro. */
function diasEntre_(apertura, hoy) {
  return Math.round((hoy.getTime() - apertura.getTime()) / 86400000);
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

// ===========================================================================
// TABLERO
//
// Dashboard.html es una página completa que no sabe nada de Google: espera
// encontrar el texto __DATOS__ y lo cambia por el JSON de la hoja. El mismo
// archivo se usa tal cual para las vistas previas fuera de Sheets.
// ===========================================================================

/** Columnas que el tablero necesita y encabezados con los que se reconocen. */
var COLUMNAS_TABLERO = [
  { llave: 'n', busca: ['numero del caso', 'numero de caso', 'n° del caso'] },
  { llave: 'ap', busca: ['fecha de apertura'], fecha: true },
  { llave: 'ci', busca: ['fecha de cierre'], fecha: true },
  // Columna P: es la que decide si un caso está abierto o cerrado.
  { llave: 'cer', busca: ['cerrado'], bool: true },
  // Columna O: el espejo de la anterior. El tablero las escribe juntas.
  { llave: 'abi', busca: ['abierto'], bool: true },
  { llave: 'due', busca: ['propietario del caso', 'propietario'] },
  { llave: 'cli', busca: ['nombre de la cuenta', 'cliente'] },
  { llave: 'est', busca: ['estado'] },
  { llave: 'ori', busca: ['origen del caso', 'origen'] },
  { llave: 'tip', busca: ['tipo'] },
  { llave: 'sub', busca: ['subcategoria'] },
  { llave: 'req', busca: ['requerimiento del cliente', 'requerimiento'] },
  { llave: 'cau', busca: ['causa comercial'] },
  { llave: 'asu', busca: ['asunto'] }
];

/** Menú "Casos": abre el tablero en un cuadro sobre la planilla. */
function abrirTablero() {
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput(paginaTablero_(false)).setWidth(1600).setHeight(1000),
    'Reclamos de exportación'
  );
}

/**
 * Aplicación web: el mismo tablero con enlace propio para compartir.
 * Agregando ?lectura=1 al enlace, el tablero se abre sin controles: se mira y
 * no se toca. Sirve para mandarlo por WhatsApp o abrirlo en el teléfono.
 */
function doGet(e) {
  var lectura = !!(e && e.parameter && (e.parameter.lectura === '1' || e.parameter.lectura === 'true'));
  return HtmlService.createHtmlOutput(paginaTablero_(lectura))
    .setTitle('Reclamos de exportación')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
}

function paginaTablero_(lectura) {
  var datos = datosDelTablero_();
  if (lectura) datos.lectura = true;
  // El reemplazo va con función para que un "$" en los datos no se interprete
  // como referencia de String.replace.
  var json = JSON.stringify(datos).replace(/</g, '\\u003c');
  return HtmlService.createHtmlOutputFromFile('Dashboard').getContent()
    .replace('__DATOS__', function () { return json; });
}

/** Lee la hoja y arma el paquete que consume el tablero. */
function datosDelTablero_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = hojaDeCasos_(ss);
  var paquete = { hoy: iso_(hoyEn_(ss.getSpreadsheetTimeZone())), hoja: hoja.getName(), casos: [] };
  var filas = hoja.getLastRow() - 1;
  if (filas < 1) return paquete;

  var valores = hoja.getRange(1, 1, filas + 1, hoja.getLastColumn()).getValues();
  var indices = mapaDeColumnas_(valores[0]);
  for (var f = 1; f <= filas; f++) {
    var caso = casoDeFila_(valores[f], indices);
    if (caso) paquete.casos.push(caso);
  }
  return paquete;
}

function casoDeFila_(fila, indices) {
  var caso = {}, vacio = true;
  for (var i = 0; i < COLUMNAS_TABLERO.length; i++) {
    var col = COLUMNAS_TABLERO[i], pos = indices[col.llave], valor = (pos === undefined) ? '' : fila[pos];
    if (col.fecha) {
      var fecha = aFecha_(valor);
      caso[col.llave] = fecha ? iso_(fecha) : '';
    } else if (col.bool) {
      caso[col.llave] = siONo_(valor);
    } else {
      caso[col.llave] = String(valor == null ? '' : valor).trim().slice(0, 140);
    }
    if (caso[col.llave]) vacio = false;
  }
  return vacio ? null : caso;
}

/**
 * Encuentra cada columna por su encabezado: primero el nombre exacto y solo
 * después por prefijo, para que "Estado" no se lo lleve "Estado caso" ni los
 * encabezados con notas al lado se queden fuera.
 */
function mapaDeColumnas_(cabeceras) {
  var norma = cabeceras.map(normalizar_), mapa = {};
  COLUMNAS_TABLERO.forEach(function (col) {
    col.busca.forEach(function (nombre) {
      if (mapa[col.llave] !== undefined) return;
      var i = norma.indexOf(nombre);
      if (i !== -1) mapa[col.llave] = i;
    });
  });
  COLUMNAS_TABLERO.forEach(function (col) {
    col.busca.forEach(function (nombre) {
      if (mapa[col.llave] !== undefined) return;
      for (var i = 0; i < norma.length; i++) {
        if (norma[i].indexOf(nombre) === 0) { mapa[col.llave] = i; return; }
      }
    });
  });
  return mapa;
}

/** VERDADERO / FALSO de la hoja a 'si' / 'no'. Vacío si la celda no se entiende. */
function siONo_(valor) {
  if (typeof valor === 'boolean') return valor ? 'si' : 'no';
  var t = normalizar_(valor);
  if (t === 'verdadero' || t === 'true' || t === 'si' || t === '1' || t === 'x') return 'si';
  if (t === 'falso' || t === 'false' || t === 'no' || t === '0') return 'no';
  return '';
}

function iso_(fecha) {
  return fecha.getFullYear() + '-' +
    ('0' + (fecha.getMonth() + 1)).slice(-2) + '-' +
    ('0' + fecha.getDate()).slice(-2);
}

// ===========================================================================
// EDICIÓN DESDE EL TABLERO
// ===========================================================================

/**
 * Cambia un caso a abierto o cerrado desde la cola de trabajo del tablero.
 *
 *   cerrado = true  -> Abierto FALSO, Cerrado VERDADERO, fecha de cierre = hoy
 *   cerrado = false -> Abierto VERDADERO, Cerrado FALSO, fecha de cierre vacía
 *
 * Las tres celdas se escriben imitando lo que ya hay en su columna: casilla de
 * verificación o texto, y la fecha con el mismo formato que sus vecinas.
 */
function cambiarEstadoCaso(numero, cerrado) {
  if (!CFG_CASOS.PERMITIR_EDICION) throw new Error('La edición desde el tablero está desactivada.');
  cerrado = !!cerrado;

  var candado = LockService.getDocumentLock();
  if (!candado.tryLock(15000)) throw new Error('La planilla está ocupada. Inténtalo de nuevo.');
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var hoja = hojaDeCasos_(ss);
    var filas = hoja.getLastRow() - 1;
    if (filas < 1) throw new Error('La hoja no tiene casos.');

    var valores = hoja.getRange(1, 1, filas + 1, hoja.getLastColumn()).getValues();
    var indices = mapaDeColumnas_(valores[0]);
    if (indices.n === undefined) throw new Error('No encuentro la columna del número de caso.');
    if (indices.cer === undefined) throw new Error('No encuentro la columna "Cerrado".');

    var buscado = String(numero).trim(), fila = 0;
    for (var f = 1; f <= filas && !fila; f++) {
      if (String(valores[f][indices.n]).trim() === buscado) fila = f + 1;
    }
    if (!fila) throw new Error('No encuentro el caso ' + buscado + ' en la hoja.');

    var zona = ss.getSpreadsheetTimeZone(), hoy = hoyEn_(zona);
    hoja.getRange(fila, indices.cer + 1).setValue(comoLaColumna_(valores, indices.cer, cerrado));
    if (indices.abi !== undefined) {
      hoja.getRange(fila, indices.abi + 1).setValue(comoLaColumna_(valores, indices.abi, !cerrado));
    }
    if (indices.ci !== undefined) {
      var celda = hoja.getRange(fila, indices.ci + 1);
      if (cerrado) celda.setValue(fechaComoLaColumna_(valores, indices.ci, hoy, zona));
      else celda.clearContent();
    }
    SpreadsheetApp.flush();
    return { n: buscado, cerrado: cerrado, ci: cerrado ? iso_(hoy) : '' };
  } finally {
    candado.releaseLock();
  }
}

/**
 * Devuelve VERDADERO/FALSO escrito como ya está escrita esa columna: casilla
 * de verificación, texto en español o texto en inglés. Escribir el texto donde
 * hay casillas rompe la validación de la celda, y al revés se ve distinto.
 */
function comoLaColumna_(valores, col, valor) {
  for (var f = 1; f < valores.length; f++) {
    var v = valores[f][col];
    if (typeof v === 'boolean') return valor;
    var t = normalizar_(v);
    if (t === 'verdadero' || t === 'falso') return valor ? 'VERDADERO' : 'FALSO';
    if (t === 'true' || t === 'false') return valor ? 'TRUE' : 'FALSE';
  }
  return valor;
}

/** La fecha, con la misma pinta que las demás de su columna. */
function fechaComoLaColumna_(valores, col, fecha, zona) {
  for (var f = 1; f < valores.length; f++) {
    var v = valores[f][col];
    if (v instanceof Date || typeof v === 'number') return fecha;
    var t = String(v == null ? '' : v).trim();
    if (!t) continue;
    if (/^\d{4}[\/\-.]\d{1,2}[\/\-.]\d{1,2}/.test(t)) return Utilities.formatDate(fecha, zona, 'yyyy-MM-dd');
    if (/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(t)) return Utilities.formatDate(fecha, zona, 'd/M/yyyy');
    if (/^\d{1,2}-\d{1,2}-\d{2,4}/.test(t)) return Utilities.formatDate(fecha, zona, 'd-M-yyyy');
    return fecha;
  }
  return fecha;
}
