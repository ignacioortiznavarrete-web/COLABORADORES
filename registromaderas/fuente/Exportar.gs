/**
 * El batch input, desde el propio spreadsheet.
 *
 * La pantalla web solo registra: deja la fila en la hoja de su clase y en la
 * bitácora. El Excel se baja desde acá, con las filas que estén seleccionadas
 * en PT, PCP o PP, que es donde se ve lo que ya quedó registrado y se puede
 * elegir con el mouse lo que va en cada carga a SAP.
 *
 * Se bajan tal como están escritas en la hoja —no se vuelven a calcular—, así
 * que lo que se ve en la pantalla es exactamente lo que llega al archivo.
 */

/** Menú › Descargar filas seleccionadas como Excel. */
function descargarSeleccion() {
  var elegidas;
  try {
    elegidas = filasSeleccionadas_();
  } catch (err) {
    avisar_('Descargar Excel', err.message);
    return;
  }

  var blob = armarXlsx_(EXPORTAR.HOJA, elegidas.filas, EXPORTAR.PRIMERA_FILA);
  var sello = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmm');

  var t = HtmlService.createTemplateFromFile('Descarga');
  t.nombre = EXPORTAR.NOMBRE + '-' + elegidas.hoja.toLowerCase() + '-' + sello + '.xlsx';
  t.href = 'data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,' +
    Utilities.base64Encode(blob.getBytes());
  t.filas = elegidas.filas.length;
  t.hoja = elegidas.hoja;
  t.primeraFila = EXPORTAR.PRIMERA_FILA;

  SpreadsheetApp.getUi().showModalDialog(
    t.evaluate().setWidth(460).setHeight(340), 'Descargar Excel');
}

/**
 * Lee lo que el usuario tiene seleccionado en la hoja activa.
 *
 * Acepta selecciones sueltas (Ctrl+clic), descarta los rótulos de arriba y las
 * filas vacías, y no repite una fila que caiga en dos rangos.
 */
function filasSeleccionadas_() {
  var hoja = SpreadsheetApp.getActiveSheet();
  var clase = CLASES.filter(function (c) { return c.hoja === hoja.getName(); })[0];
  if (!clase) {
    throw new Error('Estás en la hoja "' + hoja.getName() + '".\n\n' +
      'El batch input se baja desde una hoja de clase: ' +
      CLASES.map(function (c) { return c.hoja; }).join(', ') + '. ' +
      'Abre la que corresponda, selecciona las filas y vuelve a intentarlo.');
  }

  var ancho = Math.min(EXPORTAR.ULTIMA_COLUMNA, hoja.getMaxColumns());

  var lista = hoja.getActiveRangeList();
  var rangos = lista ? lista.getRanges() : [];
  if (!rangos.length && hoja.getActiveRange()) rangos = [hoja.getActiveRange()];

  var ultima = hoja.getLastRow();
  var vistas = {};
  var numeros = [];
  rangos.forEach(function (rango) {
    var desde = rango.getRow();
    var hasta = desde + rango.getNumRows() - 1;
    for (var f = Math.max(desde, CFG.PRIMERA_FILA_DATOS); f <= Math.min(hasta, ultima); f++) {
      if (vistas[f]) continue;
      vistas[f] = true;
      numeros.push(f);
    }
  });
  numeros.sort(function (a, b) { return a - b; });

  var filas = [];
  if (numeros.length) {
    // Una sola lectura para todo el tramo, aunque la selección tenga huecos.
    var arriba = numeros[0];
    var bloque = hoja.getRange(arriba, 1, numeros[numeros.length - 1] - arriba + 1, ancho)
      .getDisplayValues();
    numeros.forEach(function (f) {
      var fila = bloque[f - arriba];
      var vacia = fila.every(function (v) { return String(v).trim() === ''; });
      if (!vacia) filas.push(fila);
    });
  }

  if (!filas.length) {
    throw new Error('No hay filas con datos entre las seleccionadas.\n\n' +
      'En "' + clase.hoja + '", selecciona las filas que quieras bajar (los datos empiezan ' +
      'en la fila ' + CFG.PRIMERA_FILA_DATOS + ') y vuelve a intentarlo.');
  }
  return { hoja: clase.hoja, filas: filas };
}
