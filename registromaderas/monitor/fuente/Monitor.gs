/**
 * Lee las dos bitácoras y las junta en una sola cosa mirable.
 *
 * La unión es por `N° Solicitud`: la cabecera sale de `Registro` y sus códigos
 * de `Registro Detalle`. Se hace de una pasada —las dos hojas enteras, una vez
 * cada una— y no una consulta por solicitud: con cuatrocientas solicitudes eso
 * serían cuatrocientas idas al spreadsheet.
 */

function doGet() {
  return HtmlService.createTemplateFromFile('Index').evaluate()
    .setTitle('Monitor de solicitudes')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include(nombre) {
  return HtmlService.createHtmlOutputFromFile(nombre).getContent();
}

function libro_() { return SpreadsheetApp.openById(ID_SPREADSHEET); }

/**
 * Una hoja como lista de objetos, con la fila 1 de rótulos.
 *
 * Devuelve también `fila`, el número de fila real, para poder decir dónde está
 * cada cosa en el spreadsheet.
 */
function leerHoja_(nombre) {
  var hoja = libro_().getSheetByName(nombre);
  if (!hoja) return { falta: nombre, encabezados: [], filas: [] };

  var ultimaFila = hoja.getLastRow();
  var ultimaColumna = hoja.getLastColumn();
  if (ultimaFila < 2 || ultimaColumna < 1) return { encabezados: [], filas: [] };

  var datos = hoja.getRange(1, 1, ultimaFila, ultimaColumna).getDisplayValues();
  var encabezados = datos[0].map(function (h) { return String(h).trim(); });

  var filas = [];
  for (var i = 1; i < datos.length; i++) {
    var fila = { fila: i + 1 };
    var vacia = true;
    for (var j = 0; j < encabezados.length; j++) {
      if (!encabezados[j]) continue;
      var valor = datos[i][j];
      fila[encabezados[j]] = valor;
      if (String(valor).trim() !== '') vacia = false;
    }
    if (!vacia) filas.push(fila);
  }
  return { encabezados: encabezados, filas: filas };
}

/**
 * Todo lo que el monitor necesita, de una sola llamada.
 *
 * Cada solicitud llega con sus códigos adentro, así que desplegar una no
 * vuelve a preguntarle nada al servidor.
 */
function apiSolicitudes() {
  var registro = leerHoja_(HOJAS.REGISTRO);
  var detalle = leerHoja_(HOJAS.DETALLE);

  var faltantes = [registro, detalle]
    .filter(function (h) { return h.falta; })
    .map(function (h) { return h.falta; });
  if (faltantes.length) {
    return { ok: false, mensaje: 'No encuentro la hoja ' + faltantes.join(' ni ') + '.' };
  }

  // Los códigos de cada solicitud, agrupados por su número.
  var porNumero = {};
  detalle.filas.forEach(function (f) {
    var numero = String(f[COL.NUMERO] || '').trim();
    if (!numero) return;
    if (!porNumero[numero]) porNumero[numero] = [];
    porNumero[numero].push(f);
  });

  // De la más nueva hacia atrás: lo recién pedido es lo que se mira.
  var solicitudes = registro.filas.slice().reverse()
    .slice(0, MAXIMO_SOLICITUDES)
    .map(function (f) {
      var numero = String(f[COL.NUMERO] || '').trim();
      var suyos = porNumero[numero] || [];
      return {
        fila: f.fila,
        numero: numero,
        fecha: f[COL.FECHA] || '',
        usuario: f[COL.USUARIO] || '',
        tipo: f[COL.TIPO] || '',
        estado: f[COL.ESTADO] || '',
        fechaCreacion: f[COL.FECHA_CREACION] || '',
        observacion: f[COL.OBSERVACION] || '',
        observacionCodificacion: f[COL.OBSERVACION_CODIFICACION] || '',
        // Los códigos salen del detalle, que es la fuente fina. La columna SKU
        // se usa solo si el detalle no tiene nada de esa solicitud.
        codigos: suyos.length ? suyos : codigosDelSku_(f[COL.SKU]),
        cuantos: suyos.length || codigosDelSku_(f[COL.SKU]).length,
        deDetalle: suyos.length > 0
      };
    });

  return {
    ok: true,
    usuario: usuario_(),
    columnas: COL_DETALLE_VISTA,
    estados: ESTADOS.slice(),
    solicitudes: solicitudes,
    total: registro.filas.length
  };
}

/**
 * Cambia el estado de una solicitud. Es lo único que el monitor escribe.
 *
 * La fila se busca por su número, no por la posición que tenía cuando se
 * cargó la página: entre medio alguien pudo ordenar la hoja, y escribir en
 * una fila por índice viejo sería escribir en la solicitud equivocada.
 */
function apiCambiarEstado(numero, estado) {
  numero = String(numero || '').trim();
  if (!numero) throw new Error('Falta el número de solicitud.');
  if (ESTADOS.indexOf(estado) === -1) {
    throw new Error('El estado "' + estado + '" no es uno de los que existen.');
  }

  var hoja = libro_().getSheetByName(HOJAS.REGISTRO);
  if (!hoja) throw new Error('No encuentro la hoja ' + HOJAS.REGISTRO + '.');

  var ultimaFila = hoja.getLastRow();
  var ultimaColumna = hoja.getLastColumn();
  var datos = hoja.getRange(1, 1, ultimaFila, ultimaColumna).getDisplayValues();
  var encabezados = datos[0].map(function (h) { return String(h).trim(); });

  var colNumero = encabezados.indexOf(COL.NUMERO) + 1;
  var colEstado = encabezados.indexOf(COL.ESTADO) + 1;
  var colFecha = encabezados.indexOf(COL.FECHA_CREACION) + 1;
  if (!colNumero || !colEstado) {
    throw new Error('A ' + HOJAS.REGISTRO + ' le faltan las columnas ' +
      COL.NUMERO + ' o ' + COL.ESTADO + '.');
  }

  var fila = 0;
  for (var i = 1; i < datos.length; i++) {
    if (String(datos[i][colNumero - 1]).trim() === numero) { fila = i + 1; break; }
  }
  if (!fila) throw new Error('No encuentro la solicitud ' + numero + '.');

  hoja.getRange(fila, colEstado).setValue(estado);

  // Al terminar se estampa la fecha, si nadie la había puesto.
  var fechaCreacion = colFecha ? String(datos[fila - 1][colFecha - 1]).trim() : '';
  if (colFecha && estado === ESTADO_QUE_CIERRA && !fechaCreacion) {
    fechaCreacion = Utilities.formatDate(new Date(),
      libro_().getSpreadsheetTimeZone(), 'dd.MM.yyyy');
    hoja.getRange(fila, colFecha).setNumberFormat('@').setValue(fechaCreacion);
  }

  SpreadsheetApp.flush();
  return { ok: true, numero: numero, estado: estado, fechaCreacion: fechaCreacion, fila: fila };
}

/** Respaldo para solicitudes viejas: los códigos que estén en la columna SKU. */
function codigosDelSku_(sku) {
  return String(sku == null ? '' : sku)
    .split(/[,;\n]+/)
    .map(function (c) { return c.trim(); })
    .filter(Boolean)
    .map(function (c) { return { 'Código': c }; });
}

function usuario_() {
  try {
    return Session.getActiveUser().getEmail() || '';
  } catch (err) {
    return '';
  }
}
