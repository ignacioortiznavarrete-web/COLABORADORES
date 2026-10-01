/**
 * El disparador que manda los correos de codificación.
 *
 * Mira una sola columna de una sola hoja: `Estado` en `Registro`. Ahí se
 * maneja el estado y en ninguna otra parte, así que cualquier otra edición del
 * spreadsheet no es asunto suyo y se devuelve sin hacer nada.
 *
 * Tiene que ser un disparador INSTALABLE, no el `onEdit` simple: el simple
 * corre sin permisos y no puede mandar correo. Y tiene que instalarlo
 * codificación desde su propia cuenta, porque de esa cuenta es de la que van a
 * salir los avisos.
 */

function libro_() { return SpreadsheetApp.openById(ID_SPREADSHEET); }

function alEditarRegistro(evento) {
  try {
    if (!evento || !evento.range) return;
    var hoja = evento.range.getSheet();
    if (hoja.getName() !== HOJAS.REGISTRO) return;

    var columna = columnaDe_(hoja, COL.ESTADO);
    if (!columna || evento.range.getColumn() !== columna) return;

    var estado = String(evento.value == null ? '' : evento.value).trim();
    if (!estado) return;

    var aviso = avisoDe_(estado);
    if (!aviso) return;

    var numero = valorDe_(hoja, evento.range.getRow(), COL.NUMERO);
    if (!numero) return;

    mandarAviso_(aviso, numero);
  } catch (err) {
    Logger.log('alEditarRegistro: ' + err.message);
  }
}

/** El aviso configurado para ese estado, o null si ese estado no manda ninguno. */
function avisoDe_(estado) {
  var buscado = normalizar_(estado);
  for (var i = 0; i < AVISOS.length; i++) {
    if (normalizar_(AVISOS[i].estado) === buscado) return AVISOS[i];
  }
  return null;
}

/**
 * Arma y manda el correo de esa solicitud.
 *
 * @return {{ok: boolean, mensaje: string}} qué pasó, para poder decirlo.
 */
function mandarAviso_(aviso, numero) {
  var lineas = lineasDeSolicitud_(numero);
  if (!lineas.length) {
    return { ok: false, mensaje: 'La solicitud ' + numero + ' no tiene líneas en ' +
      HOJAS.DETALLE + '.' };
  }

  var para = lineas[0].correo;
  if (!para) {
    return { ok: false, mensaje: 'No hay correo de quien pidió ' + numero + ' en ' +
      HOJAS.DETALLE + '.' };
  }

  var cuerpo = aviso.encabezado
    .map(function (l) { return l.replace('{numero}', numero); })
    .concat(['']);

  lineas.forEach(function (l) { cuerpo.push('· ' + describir_(l)); });
  if (MONITOR_URL) cuerpo.push('', 'Monitor: ' + MONITOR_URL);

  return enviar_(para, aviso.asunto + ' · ' + numero, cuerpo.join('\n'));
}

/** Una línea del detalle, contada en una sola línea de texto. */
function describir_(l) {
  var partes = [l.codigo];
  if (l.descripcion) partes.push(l.descripcion);
  var medida = [l.espesor, l.ancho, l.largo].filter(Boolean).join(' x ');
  if (medida) partes.push(medida);
  if (l.piezas) partes.push(l.piezas + ' ' + (l.umb || 'PZA'));
  else if (l.umb) partes.push(l.umb);
  return partes.join(' · ');
}

function enviar_(para, asunto, cuerpo) {
  try {
    MailApp.sendEmail(para, asunto, cuerpo, { name: REMITENTE });
    return { ok: true, mensaje: 'Enviado a ' + para + '.' };
  } catch (err) {
    // Un correo que no sale no puede tumbar nada: la solicitud ya está
    // finalizada y los materiales ya entraron a la base desde el otro
    // proyecto. Pero sí queda dicho por qué.
    Logger.log('No se pudo enviar "' + asunto + '" a ' + para + ': ' + err.message);
    return { ok: false, mensaje: err.message };
  }
}

/* ------------------------------------------------------- leer el spreadsheet */

/** En qué columna está ese rótulo, en la fila 1. 0 si no está. */
function columnaDe_(hoja, rotulo) {
  var ancho = Math.max(hoja.getLastColumn(), 1);
  var rotulos = hoja.getRange(1, 1, 1, ancho).getDisplayValues()[0]
    .map(function (h) { return String(h).trim(); });
  return rotulos.indexOf(rotulo) + 1;
}

function valorDe_(hoja, fila, rotulo) {
  var c = columnaDe_(hoja, rotulo);
  return c ? String(hoja.getRange(fila, c).getDisplayValue()).trim() : '';
}

/** Las líneas de `Registro Detalle` que son de esa solicitud. */
function lineasDeSolicitud_(numero) {
  var hoja = libro_().getSheetByName(HOJAS.DETALLE);
  if (!hoja || hoja.getLastRow() < 2) return [];

  var datos = hoja.getRange(1, 1, hoja.getLastRow(), hoja.getLastColumn()).getDisplayValues();
  var rotulos = datos[0].map(function (h) { return String(h).trim(); });
  var donde = function (nombre) { return rotulos.indexOf(nombre); };
  var leer = function (fila, nombre) {
    var c = donde(nombre);
    return c >= 0 ? String(fila[c]).trim() : '';
  };

  if (donde(COL.NUMERO) < 0 || donde(COL.CODIGO) < 0) return [];

  var salida = [];
  for (var i = 1; i < datos.length; i++) {
    if (leer(datos[i], COL.NUMERO) !== String(numero).trim()) continue;
    salida.push({
      codigo: leer(datos[i], COL.CODIGO),
      descripcion: leer(datos[i], COL.DESCRIPCION),
      correo: leer(datos[i], COL.CORREO),
      espesor: leer(datos[i], COL.ESPESOR),
      ancho: leer(datos[i], COL.ANCHO),
      largo: leer(datos[i], COL.LARGO),
      piezas: leer(datos[i], COL.PIEZAS),
      umb: leer(datos[i], COL.UMB)
    });
  }
  return salida;
}

/* ------------------------------------------------------------ instalación */

/**
 * Deja andando el disparador. Se corre UNA vez, desde la cuenta de
 * codificación, y de esa cuenta saldrán los correos.
 *
 * Se borra el que hubiera antes: instalarlo dos veces dejaría dos, y cada
 * solicitud mandaría dos correos iguales.
 */
function instalarAlertas() {
  var repetidos = 0;
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'alEditarRegistro') {
      ScriptApp.deleteTrigger(t);
      repetidos++;
    }
  });

  ScriptApp.newTrigger('alEditarRegistro')
    .forSpreadsheet(libro_())
    .onEdit()
    .create();

  var texto = 'Listo.\n\nDe ahora en adelante, al poner en la columna Estado de "' +
    HOJAS.REGISTRO + '":\n' +
    AVISOS.map(function (a) {
      return '· ' + a.estado + ' → se le manda "' + a.asunto + '" a quien pidió';
    }).join('\n') +
    '\n\nEsos correos salen de TU cuenta (' + cuenta_() + '). Si deben salir de otra, ' +
    'que instale esto esa cuenta.' +
    (repetidos ? '\n\nSe quitó ' + repetidos + ' disparador repetido.' : '');

  avisar_('Activar las alertas', texto);
  return texto;
}

/**
 * Manda uno de prueba y dice en voz alta qué pasó.
 *
 * Los avisos van envueltos a propósito, y eso los vuelve mudos: no llega nada
 * y no hay a quién preguntarle. Esto lo pregunta.
 */
function probarCorreo() {
  var pasos = [];
  pasos.push('Sale de: ' + (cuenta_() || '(Google no entrega la cuenta)'));
  try {
    pasos.push('Cuota que queda hoy: ' + MailApp.getRemainingDailyQuota() + ' correos');
  } catch (err) {
    pasos.push('No se pudo leer la cuota: ' + err.message);
  }

  var disparadores = ScriptApp.getProjectTriggers().filter(function (t) {
    return t.getHandlerFunction() === 'alEditarRegistro';
  }).length;
  pasos.push('Disparadores instalados: ' + disparadores +
    (disparadores ? '' : '  ← sin esto no se manda nada; corre instalarAlertas'));

  pasos.push('');
  var r = enviar_(cuenta_(), 'Prueba · alertas de codificación',
    'Esto es una prueba. Si te llegó, los avisos de codificación pueden salir.');
  pasos.push(r.ok ? 'Salió. ' + r.mensaje : 'NO salió: ' + r.mensaje);

  avisar_('Probar correo', pasos.join('\n'));
  return pasos.join('\n');
}

function cuenta_() {
  try {
    return String(Session.getEffectiveUser().getEmail() || '');
  } catch (err) {
    return '';
  }
}

function avisar_(titulo, mensaje) {
  try {
    SpreadsheetApp.getUi().alert(titulo, mensaje, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (err) {
    // Sin interfaz —desde el editor o un disparador— basta con dejarlo escrito.
    Logger.log(titulo + ': ' + mensaje);
  }
}
