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

/**
 * Menu > Revisar permisos.
 *
 * Se ejecuta desde el editor de Apps Script la primera vez: dispara la
 * pantalla de autorizacion y, de paso, hace el viaje completo de la
 * exportacion con una fila de mentira. Asi se sabe si el permiso quedo bien
 * ANTES de necesitarlo con datos de verdad, en vez de descubrirlo a medias.
 */
function revisarPermisos() {
  var pasos = [];
  try {
    pasos.push('Tu cuenta: ' + (Session.getActiveUser().getEmail() || '(no la entrega)'));
    pasos.push('Leer el spreadsheet: ' +
      (ss_().getSheetByName(CFG.HOJA_BD) ? 'si' : 'no encuentro ' + CFG.HOJA_BD));

    var blob = exportarComoExcel_([['CL', 'TCP1', '032']], 'prueba-de-permisos');
    pasos.push('Crear la hoja temporal, exportarla a Excel y borrarla: si (' +
      blob.getBytes().length + ' bytes)');

    avisar_('Revisar permisos', '· ' + pasos.join('\n· ') +
      '\n\nTodo en orden: el menu de descarga va a funcionar.');
  } catch (err) {
    avisar_('Revisar permisos', '· ' + pasos.join('\n· ') +
      '\n\nSe cortó acá:\n' + err.message +
      '\n\nSi habla de permisos o autorizacion, ejecuta esta misma funcion ' +
      'desde el editor de Apps Script: ahi aparece la pantalla para aceptarlos.');
  }
}

/** Menú › Descargar filas seleccionadas como Excel. */
function descargarSeleccion() {
  var elegidas;
  try {
    elegidas = filasSeleccionadas_();
  } catch (err) {
    avisar_('Descargar Excel', err.message);
    return;
  }

  var sello = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmm');
  var blob;
  try {
    blob = exportarComoExcel_(elegidas.filas, EXPORTAR.NOMBRE + '-' + sello);
  } catch (err) {
    avisar_('Descargar Excel', 'No se pudo generar el archivo.\n\n' + err.message);
    return;
  }

  var bytes = blob.getBytes();
  var t = HtmlService.createTemplateFromFile('Descarga');
  t.nombre = EXPORTAR.NOMBRE + '-' + elegidas.hoja.toLowerCase() + '-' + sello + '.xlsx';
  // El archivo va como base64 en un atributo comun, no en el href: ver Descarga.html.
  t.base64 = Utilities.base64Encode(bytes);
  t.bytes = bytes.length;
  t.filas = elegidas.filas.length;
  t.hoja = elegidas.hoja;
  t.primeraFila = EXPORTAR.PRIMERA_FILA;

  SpreadsheetApp.getUi().showModalDialog(
    t.evaluate().setWidth(460).setHeight(340), 'Descargar Excel');
}

/**
 * Genera el xlsx sin escribir una sola linea del formato.
 *
 * Se copian las filas a una hoja de calculo temporal y se pide la exportacion
 * a Excel que Google ya sabe hacer —la misma de Archivo > Descargar > Microsoft
 * Excel—, que es un archivo hecho por el mismo motor que Excel abre todos los
 * dias. Armar el xlsx a mano funcionaba en los lectores de scripting y Excel lo
 * rechazaba, y no habia forma de probarlo sin tener Excel delante.
 *
 * La temporal se borra siempre, salga bien o mal.
 *
 * @param {Array<Array<string>>} filas  Todas del mismo ancho.
 * @param {string} nombre               Nombre de la hoja temporal.
 * @return {Blob} el xlsx.
 */
function exportarComoExcel_(filas, nombre) {
  var temporal = SpreadsheetApp.create(nombre);
  try {
    var hoja = temporal.getSheets()[0];
    hoja.setName(EXPORTAR.HOJA);

    // Todo como texto: es lo que mantiene los ceros a la izquierda (032,
    // 019X100) y la fecha 21.07.2026 sin que Sheets los lea como numeros.
    var rango = hoja.getRange(EXPORTAR.PRIMERA_FILA, 1, filas.length, filas[0].length);
    rango.setNumberFormat('@');
    rango.setValues(filas);
    SpreadsheetApp.flush();

    var respuesta = UrlFetchApp.fetch(
      'https://docs.google.com/spreadsheets/d/' + temporal.getId() + '/export?format=xlsx',
      {
        headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
        muteHttpExceptions: true
      });
    if (respuesta.getResponseCode() !== 200) {
      throw new Error('Google respondio ' + respuesta.getResponseCode() +
        ' al exportar la hoja temporal.');
    }
    return respuesta.getBlob();
  } finally {
    DriveApp.getFileById(temporal.getId()).setTrashed(true);
  }
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
