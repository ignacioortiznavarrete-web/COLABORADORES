/**
 * El disparador que manda los correos de codificación.
 *
 * Mira una sola columna de una sola hoja: `Estado` en `Registro`. Ahí se
 * maneja el estado y en ninguna otra parte, así que cualquier otra edición del
 * spreadsheet no es asunto suyo y se devuelve sin hacer nada.
 *
 * Tiene que ser un disparador INSTALABLE, no el `onEdit` simple: el simple
 * corre sin permisos y no puede mandar correo.
 *
 * Lo puede instalar cualquiera que tenga la dirección de codificación agregada
 * en "Enviar como" de su Gmail: el correo sale con esa dirección aunque lo
 * mande su cuenta. Quién movió el estado sigue quedando anotado en
 * `Registro Estados` con su propio correo, que es la trazabilidad que importa.
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
    if (!numero) {
      Logger.log('Sin N° Solicitud en esa fila: no hay a quién avisarle.');
      return;
    }

    // Lo que pase queda escrito. Antes, un "no hay correo de quien pidió" se
    // perdía en silencio y desde afuera se veía igual que si todo hubiera
    // andado bien.
    var r = mandarAviso_(aviso, numero);
    Logger.log(numero + ' · ' + aviso.estado + ': ' + (r.ok ? 'OK' : 'NO SALIÓ') +
      ' · ' + r.mensaje);
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

  // Quién la movió va en el correo, no solo en la hoja: el aviso sale con la
  // dirección de codificación, así que sin esto no quedaría dicho en ninguna
  // parte quién la cerró de verdad.
  var quien = quienMovio_(numero, aviso.estado);
  if (quien) cuerpo.push('', aviso.estado + ' por: ' + quien.usuario + ' · ' + quien.fecha);

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

/**
 * Los alias de la cuenta que corre esto: las direcciones desde las que puede
 * mandar aunque no sean la suya.
 *
 * Va envuelto porque leerlos pide su propio permiso, y no tenerlo no debería
 * impedir mandar el correo: simplemente sale desde la cuenta de siempre.
 */
function aliasDisponibles_() {
  try {
    return GmailApp.getAliases() || [];
  } catch (err) {
    Logger.log('No se pudieron leer los alias: ' + err.message);
    return [];
  }
}

function puedeUsarElAlias_() {
  if (!REMITENTE_ALIAS) return false;
  var buscado = normalizar_(REMITENTE_ALIAS);
  return aliasDisponibles_().some(function (a) { return normalizar_(a) === buscado; });
}

/**
 * Manda el correo, desde la dirección de codificación si se puede.
 *
 * Con el alias configurado sale CON esa dirección aunque lo mande otra cuenta.
 * Sin él sale desde la cuenta que corre el disparador: se manda igual —un
 * aviso que no llega es peor que uno que llega del remitente equivocado— y el
 * resultado dice de dónde salió, para que no haya que adivinarlo.
 */
function enviar_(para, asunto, cuerpo) {
  var conAlias = puedeUsarElAlias_();
  try {
    if (conAlias) {
      // Solo GmailApp admite `from`, y solo con un alias verificado de la
      // propia cuenta. MailApp no tiene forma de cambiar el remitente.
      GmailApp.sendEmail(para, asunto, cuerpo, { from: REMITENTE_ALIAS, name: REMITENTE });
      return { ok: true, alias: true, mensaje: 'Enviado a ' + para + ' desde ' + REMITENTE_ALIAS + '.' };
    }
    MailApp.sendEmail(para, asunto, cuerpo, { name: REMITENTE });
    return {
      ok: true, alias: false,
      mensaje: 'Enviado a ' + para + ', pero desde ' + (cuenta_() || 'la cuenta que corre esto') +
        ': ' + (REMITENTE_ALIAS
          ? REMITENTE_ALIAS + ' no está en "Enviar como" de esa cuenta.'
          : 'no hay alias configurado en REMITENTE_ALIAS.')
    };
  } catch (err) {
    // Un correo que no sale no puede tumbar nada: la solicitud ya está
    // finalizada y los materiales ya entraron a la base desde el otro
    // proyecto. Pero sí queda dicho por qué.
    Logger.log('No se pudo enviar "' + asunto + '" a ' + para + ': ' + err.message);
    return { ok: false, alias: conAlias, mensaje: err.message };
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

/**
 * Quién movió esa solicitud a ese estado, y cuándo. El último, si pasó varias
 * veces. Null si todavía no se anota el recorrido.
 */
function quienMovio_(numero, estado) {
  var hoja = libro_().getSheetByName(HOJAS.ESTADOS);
  if (!hoja || hoja.getLastRow() < 2) return null;

  var datos = hoja.getRange(1, 1, hoja.getLastRow(), hoja.getLastColumn()).getDisplayValues();
  var rotulos = datos[0].map(function (h) { return String(h).trim(); });
  var cNumero = rotulos.indexOf(COL.NUMERO);
  var cEstado = rotulos.indexOf(COL.ESTADO);
  var cFecha = rotulos.indexOf(COL.FECHA);
  var cUsuario = rotulos.indexOf(COL.USUARIO);
  if (cNumero < 0 || cEstado < 0 || cUsuario < 0) return null;

  for (var i = datos.length - 1; i >= 1; i--) {
    if (String(datos[i][cNumero]).trim() !== String(numero).trim()) continue;
    if (normalizar_(datos[i][cEstado]) !== normalizar_(estado)) continue;
    var usuario = String(datos[i][cUsuario]).trim();
    if (!usuario) return null;
    return { usuario: usuario, fecha: cFecha >= 0 ? String(datos[i][cFecha]).trim() : '' };
  }
  return null;
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
    '\n\n' + (puedeUsarElAlias_()
      ? 'Esos correos se verán salidos de ' + REMITENTE_ALIAS + ', aunque los mande tu ' +
        'cuenta (' + cuenta_() + '). Quién mueve el estado sigue quedando anotado con su ' +
        'propio correo en "' + HOJAS.ESTADOS + '".'
      : 'OJO: van a salir de TU cuenta (' + cuenta_() + '), no de ' +
        (REMITENTE_ALIAS || 'codificación') + '. Corre "probarCorreo" para ver cómo ' +
        'arreglarlo.') +
    (repetidos ? '\n\nSe quitó ' + repetidos + ' disparador repetido.' : '');

  avisar_('Activar las alertas', texto);
  return texto;
}

/**
 * Revisa el camino entero y dice dónde se corta.
 *
 * Se corre UNA vez, desde el editor, cuando el aviso no llega. Mira las seis
 * cosas que tienen que estar bien, en orden, y al final SIMULA la edición
 * —llama al mismo `alEditarRegistro` que llamaría Google— para ver qué pasa de
 * verdad, sin esperar a que alguien mueva el combo.
 *
 * No manda ningún correo de prueba a nadie que no sea quien pidió, y la
 * simulación sí manda el aviso: si llega, el camino está completo.
 */
function diagnostico() {
  var lineas = ['DIAGNÓSTICO · alertas de codificación', ''];
  var falla = null;
  var anotar = function (bien, texto) {
    lineas.push((bien ? '✓ ' : '✗ ') + texto);
    if (!bien && !falla) falla = texto;
  };

  // 1. ¿Está instalado el disparador? Sin esto no pasa absolutamente nada.
  var cuantos = ScriptApp.getProjectTriggers().filter(function (t) {
    return t.getHandlerFunction() === 'alEditarRegistro';
  }).length;
  anotar(cuantos === 1, cuantos === 1
    ? 'Disparador instalado (1)'
    : cuantos === 0
      ? 'NO hay disparador instalado. Corre instalarAlertas.'
      : 'Hay ' + cuantos + ' disparadores: mandarían ' + cuantos +
        ' correos iguales. Corre instalarAlertas, que deja uno.');

  // 2. ¿Llega al spreadsheet? Un ID equivocado falla acá y no antes.
  var libro;
  try {
    libro = libro_();
    anotar(true, 'Abre el spreadsheet: ' + libro.getName());
  } catch (err) {
    anotar(false, 'NO puede abrir el spreadsheet ' + ID_SPREADSHEET + ': ' + err.message);
    return terminar_(lineas, falla);
  }

  // 3. La hoja y la columna que escucha.
  var registro = libro.getSheetByName(HOJAS.REGISTRO);
  if (!registro) {
    anotar(false, 'No existe la hoja "' + HOJAS.REGISTRO + '".');
    return terminar_(lineas, falla);
  }
  var cEstado = columnaDe_(registro, COL.ESTADO);
  anotar(cEstado > 0, cEstado > 0
    ? 'La columna "' + COL.ESTADO + '" es la ' + cEstado + ' de "' + HOJAS.REGISTRO + '"'
    : 'En "' + HOJAS.REGISTRO + '" no hay ninguna columna rotulada "' + COL.ESTADO + '".');
  if (!cEstado) return terminar_(lineas, falla);

  // 4. Lo que está escrito en esa columna, ¿coincide con lo configurado?
  var fila = registro.getLastRow();
  var estadoAhi = String(registro.getRange(fila, cEstado).getDisplayValue()).trim();
  var reconocido = !!avisoDe_(estadoAhi);
  anotar(reconocido, reconocido
    ? 'La última solicitud está en "' + estadoAhi + '", que sí manda correo'
    : 'La última solicitud está en "' + estadoAhi + '", que NO manda correo. ' +
      'Los que mandan son: ' + AVISOS.map(function (a) { return a.estado; }).join(', ') +
      '. Ponla en Finalizado y vuelve a correr esto.');

  // 5. A quién le llegaría.
  ensayoDeLaUltima_().slice(1).forEach(function (l) { lineas.push(' ' + l); });

  // 6. De qué dirección sale.
  lineas.push('');
  anotar(true, 'Corre con: ' + (cuenta_() || '(Google no entrega la cuenta)'));
  if (REMITENTE_ALIAS && !puedeUsarElAlias_()) {
    lineas.push('  (sale de esa cuenta, no de ' + REMITENTE_ALIAS +
      ': falta agregarla en Gmail › Enviar como)');
  }

  // 7. Y la prueba de verdad: se simula la edición, igual que la haría Google.
  lineas.push('', 'Simulando el cambio de estado…');
  if (!reconocido) {
    lineas.push('  Saltado: la última solicitud no está en un estado que mande correo.');
    return terminar_(lineas, falla);
  }
  try {
    alEditarRegistro({
      range: registro.getRange(fila, cEstado),
      value: estadoAhi
    });
    lineas.push('  Corrió sin reventar. Mira arriba a quién le llegaría, y ' +
      'revisa esa casilla.');
    lineas.push('  Si acá dice que le llegaría y no llegó, el problema ya no es ' +
      'el código: mira Ejecuciones en el menú de la izquierda.');
  } catch (err) {
    anotar(false, 'La simulación REVENTÓ: ' + err.message);
  }

  return terminar_(lineas, falla);
}

function terminar_(lineas, falla) {
  lineas.push('', falla ? 'LO PRIMERO QUE HAY QUE ARREGLAR:\n' + falla
    : 'No encontré nada roto en el camino.');
  var texto = lineas.join('\n');
  avisar_('Diagnóstico', texto);
  Logger.log(texto);
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
  pasos.push('Corre con: ' + (cuenta_() || '(Google no entrega la cuenta)'));

  // Lo primero que hay que saber: si el correo va a verse salido de
  // codificación o de la cuenta de quien instaló esto.
  var alias = aliasDisponibles_();
  if (!REMITENTE_ALIAS) {
    pasos.push('Sale de: esa misma cuenta (REMITENTE_ALIAS está vacío en Config.gs)');
  } else if (puedeUsarElAlias_()) {
    pasos.push('Sale de: ' + REMITENTE_ALIAS + '  ← el alias está puesto');
  } else {
    pasos.push('Sale de: esa misma cuenta, NO de ' + REMITENTE_ALIAS);
    pasos.push('  Alias que tiene: ' + (alias.length ? alias.join(', ') : 'ninguno'));
    pasos.push('  Para que salga de codificación, agrega esa dirección en');
    pasos.push('  Gmail › Configuración › Cuentas › "Enviar como" › Añadir otra');
    pasos.push('  dirección, y verifícala. Después vuelve a correr esto.');
  }

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

  // La prueba que importa: sobre una solicitud de verdad. Mandar un correo a
  // uno mismo demuestra que el correo anda, no que este aviso vaya a salir.
  pasos.push('');
  pasos.push(ensayoDeLaUltima_().join('\n'));

  pasos.push('');
  var r = enviar_(cuenta_(), 'Prueba · alertas de codificación',
    'Esto es una prueba. Si te llegó, los avisos de codificación pueden salir.');
  pasos.push(r.ok ? 'El correo de prueba salió. ' + r.mensaje
    : 'El correo de prueba NO salió: ' + r.mensaje);

  avisar_('Probar correo', pasos.join('\n'));
  return pasos.join('\n');
}

/**
 * Un ensayo sobre la última solicitud, sin mandar nada.
 *
 * Es lo único que contesta "¿por qué no llegó?". Sigue el mismo camino que el
 * disparador —busca la solicitud, busca sus líneas, busca el correo de quien
 * pidió— y dice en cuál de esos pasos se corta.
 *
 * El que más falla: la columna `Correo` de `Registro Detalle`. Se agregó
 * después, y una hoja que ya existía se quedó con los rótulos viejos. El dato
 * está escrito, pero sin el rótulo nadie lo encuentra.
 */
function ensayoDeLaUltima_() {
  var pasos = ['Ensayo sobre la última solicitud (no manda nada):'];

  var registro = libro_().getSheetByName(HOJAS.REGISTRO);
  if (!registro || registro.getLastRow() < 2) {
    pasos.push('  No hay ninguna solicitud en "' + HOJAS.REGISTRO + '" todavía.');
    return pasos;
  }

  var numero = valorDe_(registro, registro.getLastRow(), COL.NUMERO);
  if (!numero) {
    pasos.push('  La última fila de "' + HOJAS.REGISTRO + '" no tiene N° Solicitud.');
    return pasos;
  }
  pasos.push('  Solicitud: ' + numero);

  var detalle = libro_().getSheetByName(HOJAS.DETALLE);
  if (!detalle) {
    pasos.push('  ✗ No existe la hoja "' + HOJAS.DETALLE + '".');
    return pasos;
  }

  // El rótulo, antes que nada: sin él no hay de dónde sacar el correo.
  var rotulos = detalle.getRange(1, 1, 1, Math.max(detalle.getLastColumn(), 1))
    .getDisplayValues()[0].map(function (h) { return String(h).trim(); });
  if (rotulos.map(normalizar_).indexOf(normalizar_(COL.CORREO)) === -1) {
    pasos.push('  ✗ "' + HOJAS.DETALLE + '" NO tiene una columna rotulada "' +
      COL.CORREO + '".');
    pasos.push('    Sus rótulos son: ' + rotulos.filter(Boolean).join(' | '));
    pasos.push('    Por eso no sale el aviso: no hay de dónde sacar a quién escribirle.');
    pasos.push('    Arréglalo con "Registro Maderas › Preparar hojas" en el spreadsheet,');
    pasos.push('    que dice exactamente qué rótulo falta y dónde.');
    return pasos;
  }

  var lineas = lineasDeSolicitud_(numero);
  if (!lineas.length) {
    pasos.push('  ✗ No tiene ninguna línea en "' + HOJAS.DETALLE + '".');
    return pasos;
  }
  pasos.push('  Líneas en el detalle: ' + lineas.length);

  if (!lineas[0].correo) {
    pasos.push('  ✗ La columna "' + COL.CORREO + '" existe pero está VACÍA en esa solicitud.');
    pasos.push('    Las guardadas antes de que esa columna existiera no la tienen.');
    pasos.push('    Registra una solicitud nueva y vuelve a probar.');
    return pasos;
  }

  pasos.push('  ✓ Le llegaría a: ' + lineas[0].correo);
  return pasos;
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
