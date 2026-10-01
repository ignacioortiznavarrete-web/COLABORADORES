/**
 * Los dos avisos, y lo que pasa cuando una solicitud se termina.
 *
 * Van en el mismo proyecto aunque salgan de cuentas distintas, y eso no es un
 * descuido: un correo sale de la cuenta con la que corre el script, y los dos
 * caminos corren con cuentas distintas. El de ingreso lo dispara el formulario
 * web, que corre como quien lo publicó. El de finalizado lo dispara el
 * disparador de edición, que corre como quien lo instaló: si lo instala
 * codificación, ese correo sale de codificación.
 *
 * Nada de esto detiene un registro: si el correo no sale, la solicitud ya
 * quedó guardada igual. Por eso cada aviso va envuelto y solo deja una línea
 * en el registro de ejecución si falla.
 */

/**
 * Avisa a codificación que entró una solicitud nueva.
 *
 * Todo va envuelto, no solo el envío: armar el texto también puede fallar, y
 * un aviso que no sale no puede tumbar un registro que ya quedó escrito.
 */
function avisarIngreso_(numero, cabecera, skus) {
  try {
    return armarAvisoDeIngreso_(numero, cabecera, skus);
  } catch (err) {
    Logger.log('avisarIngreso_: ' + err.message);
    return { ok: false, mensaje: err.message };
  }
}

function armarAvisoDeIngreso_(numero, cabecera, skus) {
  if (!CORREOS.CODIFICACION) {
    return { ok: false, mensaje: 'La casilla de codificación está vacía en Config.gs.' };
  }
  var cuerpo = [
    'Entró una solicitud de códigos de maderas.',
    '',
    'N° Solicitud: ' + numero,
    'Solicitante:  ' + cabecera.solicitante + ' (' + (cabecera.correo || '') + ')',
    'Tipo:         ' + cabecera.tipo,
    'Fecha:        ' + cabecera.fechaTexto,
    'Códigos:      ' + skus.length,
    '',
    skus.join('\n')
  ];
  if (cabecera.observacion) cuerpo.push('', 'Observación: ' + cabecera.observacion);
  if (MONITOR.URL) cuerpo.push('', 'Monitor: ' + MONITOR.URL);

  return enviar_(CORREOS.CODIFICACION, CORREOS.ASUNTO_INGRESO + ' · ' + numero,
    cuerpo.join('\n'), cabecera.correo);
}

/**
 * Manda un correo.
 *
 * Apps Script siempre lo manda desde la cuenta con la que corre el script; no
 * hay forma de poner otro remitente. Con el formulario publicado como
 * "Ejecutar como: el usuario que accede", esa cuenta es la de quien pide, y
 * el aviso de ingreso sale de él sin más.
 *
 * Si está publicado de la otra forma, el remitente es el buzón que publicó, y
 * ahí sirve `responderA`: codificación recibe el aviso y al responder le
 * escribe a quien pidió, no al buzón desde el que salió. Cuando el remitente
 * ya es esa persona, `responderA` sobra y no se pone.
 *
 * @param {string} responderA  A quién contesta el que reciba, si no es el remitente.
 */
/**
 * Avisa a quien pidió que su material ya está creado, y con qué quedó.
 *
 * Sale de ESTE proyecto —de la cuenta que instaló el disparador, la de quien
 * publicó el formulario— porque es nuestro el aviso de que el trabajo está
 * hecho. El de finalizado es otra cosa y sale de codificación, desde el
 * proyecto `alertas`.
 */
function avisarCreado_(numero, lineas) {
  try {
    return armarAvisoDeCreado_(numero, lineas);
  } catch (err) {
    Logger.log('avisarCreado_: ' + err.message);
    return { ok: false, mensaje: err.message };
  }
}

function armarAvisoDeCreado_(numero, lineas) {
  if (!lineas || !lineas.length) {
    return { ok: false, mensaje: 'La solicitud no tiene líneas en ' + CFG.HOJA_DETALLE + '.' };
  }
  var correo = lineas[0].correo;
  if (!correo) {
    return { ok: false, mensaje: 'No hay correo de quien pidió en ' + CFG.HOJA_DETALLE + '.' };
  }

  var cuerpo = [
    'Tu material ya está creado.',
    '',
    'N° Solicitud: ' + numero,
    'Códigos:      ' + lineas.length,
    ''
  ];

  // El detalle, uno por línea: el código y lo que lo define. Quien recibe
  // tiene que poder revisarlo sin abrir nada.
  lineas.forEach(function (l) {
    var partes = [l.codigo];
    if (l.descripcion) partes.push(l.descripcion);
    var medida = [l.espesor, l.ancho, l.largo].filter(Boolean).join(' x ');
    if (medida) partes.push(medida);
    if (l.piezas) partes.push(l.piezas + ' ' + (l.umb || 'PZA'));
    else if (l.umb) partes.push(l.umb);
    if (l.rutas.length) partes.push('rutas: ' + l.rutas.join(', '));
    cuerpo.push('· ' + partes.join(' · '));
  });

  if (MONITOR.URL) cuerpo.push('', 'Monitor: ' + MONITOR.URL);

  return enviar_(correo, CORREOS.ASUNTO_CREADO + ' · ' + numero, cuerpo.join('\n'),
    CORREOS.CODIFICACION);
}

function enviar_(para, asunto, cuerpo, responderA) {
  if (!para) return { ok: false, mensaje: 'No hay a quién mandarlo: la casilla está vacía.' };
  try {
    var opciones = { name: 'Solicitud Código Maderas' };
    if (CORREOS.COPIA) opciones.cc = CORREOS.COPIA;
    if (responderA && !esLaCuentaQueCorre_(responderA)) {
      opciones.replyTo = responderA;
      opciones.name = 'Solicitud Código Maderas · ' + responderA;
    }
    MailApp.sendEmail(para, asunto, cuerpo, opciones);
    return { ok: true, mensaje: 'Enviado a ' + para + '.' };
  } catch (err) {
    // Un correo que no sale no puede tumbar un registro que ya quedó escrito,
    // pero tampoco puede desaparecer sin dejar dicho por qué: el que llama
    // decide qué hacer con esto, y la pantalla lo muestra.
    Logger.log('No se pudo enviar "' + asunto + '" a ' + para + ': ' + err.message);
    return { ok: false, mensaje: err.message };
  }
}

/** Si el correo ya sale de esa persona, no hay a quién redirigir la respuesta. */
function esLaCuentaQueCorre_(correo) {
  try {
    var remitente = String(Session.getEffectiveUser().getEmail() || '').trim();
    return !!remitente && remitente.toLowerCase() === String(correo).trim().toLowerCase();
  } catch (err) {
    return false;
  }
}

/* ------------------------------------------------------------ diagnóstico */

/**
 * Por qué no llegó el correo.
 *
 * Los avisos van envueltos a propósito —una solicitud guardada no se puede
 * deshacer porque un correo falló—, pero eso los vuelve mudos: no llega nada y
 * no hay a quién preguntarle. Esto manda uno de prueba y dice en voz alta lo
 * que pasó, con el error de Google tal cual.
 *
 * Importante: esto corre con el código de AHORA, el del editor. La aplicación
 * web corre el de la ÚLTIMA IMPLEMENTACIÓN. Si acá sale bien y desde el
 * formulario no llega nada, el problema no es el correo: es que la
 * implementación quedó en una versión vieja y hay que publicar una nueva.
 */
function probarCorreo() {
  var pasos = [];

  try {
    var quien = String(Session.getEffectiveUser().getEmail() || '');
    pasos.push('Sale de: ' + (quien || '(Google no entrega la cuenta)'));
  } catch (err) {
    pasos.push('No se pudo saber de qué cuenta sale: ' + err.message);
  }

  try {
    pasos.push('Cuota que queda hoy: ' + MailApp.getRemainingDailyQuota() + ' correos');
  } catch (err) {
    pasos.push('No se pudo leer la cuota: ' + err.message);
  }

  if (!CORREOS.CODIFICACION) {
    pasos.push('');
    pasos.push('La casilla de codificación está VACÍA en Config.gs, así que no se manda');
    pasos.push('nada y tampoco falla: simplemente no sale. Ponla en CORREOS.CODIFICACION.');
    avisar_('Probar correo', pasos.join('\n'));
    return pasos.join('\n');
  }

  pasos.push('Va a: ' + CORREOS.CODIFICACION);
  pasos.push('');

  var r = enviar_(CORREOS.CODIFICACION, 'Prueba · ' + CORREOS.ASUNTO_INGRESO,
    'Esto es una prueba del aviso de ingreso. Si te llegó, el correo funciona.\n\n' +
    'Salió de ' + (usuario_() || 'la cuenta que corre el script') + '.');

  if (r.ok) {
    pasos.push('Salió. ' + r.mensaje);
    pasos.push('');
    pasos.push('Si el formulario igual no avisa, el correo no es el problema: la');
    pasos.push('aplicación web corre la última implementación, no lo que está en el');
    pasos.push('editor. Publica una nueva versión en Implementar › Administrar');
    pasos.push('implementaciones › ✏ › Versión: Nueva.');
  } else {
    pasos.push('NO salió: ' + r.mensaje);
    if (/authoriz|permis|scope/i.test(r.mensaje)) {
      pasos.push('');
      pasos.push('Eso es de permisos. Corre esta misma función desde el editor de Apps');
      pasos.push('Script y acepta lo que pida; el permiso de enviar correo se agregó');
      pasos.push('después, así que hay que volver a autorizar.');
    }
  }

  avisar_('Probar correo', pasos.join('\n'));
  return pasos.join('\n');
}

/* ------------------------------------------------ cuando se da por terminada */

/**
 * Se dispara al editar el spreadsheet.
 *
 * Mira una sola columna de una sola hoja: `Estado` en `Registro`. El estado se
 * maneja ahí y en ninguna otra parte —ni en el monitor, ni en la bitácora de
 * estados, que solo anota lo que ya pasó—, así que cualquier otra edición no
 * es asunto suyo.
 *
 * Cada paso queda anotado, y dos de ellos además hacen algo:
 *
 *   Creando     avisa a quien pidió que su material está creado, con el detalle
 *   Finalizado  da de alta los materiales y sus rutas en BD_Maderas
 *
 * El aviso de finalizado no está acá: tiene que salir de codificación, y vive
 * en el proyecto `alertas`, que ellos instalan desde su cuenta.
 *
 * Para que corra hay que instalar el disparador una vez, desde el menú.
 */
function alEditarRegistro(evento) {
  try {
    if (!evento || !evento.range) return;
    var hoja = evento.range.getSheet();
    if (hoja.getName() !== CFG.HOJA_REGISTRO) return;

    var columna = COL_REGISTRO.indexOf('Estado') + 1;
    if (!columna || evento.range.getColumn() !== columna) return;

    var estado = String(evento.value == null ? '' : evento.value).trim();
    if (!estado) return;

    // Primero se anota el paso, después se actúa. Si lo de abajo falla —la
    // base, un correo— el recorrido ya quedó escrito igual, que es lo que el
    // monitor muestra.
    var fila = evento.range.getRow();
    anotarPasoDeEstado_(hoja, fila, estado, quienEdito_(evento));

    if (normalizar_(estado) === normalizar_(NUMERACION.ESTADO_CREADO)) {
      var numero = numeroDeFila_(hoja, fila);
      if (numero) avisarCreado_(numero, lineasDeSolicitud_(numero));
      return;
    }
    if (normalizar_(estado) !== normalizar_(NUMERACION.ESTADO_FINAL)) return;
    cerrarSolicitud_(hoja, fila);
  } catch (err) {
    Logger.log('alEditarRegistro: ' + err.message);
  }
}

/** El número de solicitud que hay en esa fila de `Registro`. */
function numeroDeFila_(hojaRegistro, fila) {
  return String(hojaRegistro.getRange(fila, COL_REGISTRO.indexOf('N° Solicitud') + 1)
    .getDisplayValue()).trim();
}

/** Anota en la bitácora de estados el paso que se acaba de hacer en la hoja. */
function anotarPasoDeEstado_(hojaRegistro, fila, estado, quien) {
  try {
    var numero = numeroDeFila_(hojaRegistro, fila);
    if (!numero) return false;
    return anotarEstado_(numero, estado, quien);
  } catch (err) {
    Logger.log('anotarPasoDeEstado_: ' + err.message);
    return false;
  }
}

/**
 * Quién movió el combo.
 *
 * El disparador corre con la cuenta de quien lo instaló, así que preguntar por
 * la cuenta activa devolvería siempre a esa persona. Google pone a quien editó
 * en el propio evento, y eso es lo que se usa; si no viene —pasa cuando la
 * edición es de otro dominio— se cae a la cuenta activa antes que dejarlo en
 * blanco.
 */
function quienEdito_(evento) {
  try {
    var quien = evento && evento.user ? String(evento.user.getEmail ?
      evento.user.getEmail() : evento.user).trim() : '';
    return quien || usuario_();
  } catch (err) {
    return usuario_();
  }
}

/**
 * Da por terminada una solicitud: sus materiales entran a BD_Maderas.
 *
 * Entran dos cosas: los códigos que se pidieron y las hojas de ruta que
 * nombraron. Lo que ya está no se vuelve a agregar —la base no debería tener
 * un material dos veces— y por eso se lee entera una vez antes de escribir.
 *
 * El aviso a quien pidió no sale de acá: tiene que salir de codificación, y
 * de eso se encarga el proyecto `alertas`.
 *
 * @return {{codigos: number, rutas: number}} cuántos se agregaron de cada cosa.
 */
function cerrarSolicitud_(hojaRegistro, fila) {
  var numero = numeroDeFila_(hojaRegistro, fila);
  if (!numero) return { codigos: 0, rutas: 0 };

  var lineas = lineasDeSolicitud_(numero);
  if (!lineas.length) return { codigos: 0, rutas: 0 };

  return agregarABd_(lineas);
}

/** Las líneas de `Registro Detalle` que son de esa solicitud. */
function lineasDeSolicitud_(numero) {
  var hoja = ss_().getSheetByName(CFG.HOJA_DETALLE);
  if (!hoja || hoja.getLastRow() < 2) return [];

  var datos = hoja.getRange(1, 1, hoja.getLastRow(), hoja.getLastColumn()).getDisplayValues();
  var rotulos = datos[0].map(function (h) { return String(h).trim(); });
  var donde = function (nombre) { return rotulos.indexOf(nombre); };

  var cNumero = donde('N° Solicitud');
  var cCodigo = donde('Código');
  if (cNumero < 0 || cCodigo < 0) return [];

  var salida = [];
  for (var i = 1; i < datos.length; i++) {
    if (String(datos[i][cNumero]).trim() !== numero) continue;
    salida.push({
      codigo: String(datos[i][cCodigo]).trim(),
      descripcion: donde('Descripción Material') >= 0 ? datos[i][donde('Descripción Material')] : '',
      grupo: donde('Grupo Artículo') >= 0 ? datos[i][donde('Grupo Artículo')] : '',
      tipoMaterial: donde('Tipo Material') >= 0 ? datos[i][donde('Tipo Material')] : '',
      correo: donde('Correo') >= 0 ? datos[i][donde('Correo')] : '',
      espesor: donde('Espesor') >= 0 ? String(datos[i][donde('Espesor')]).trim() : '',
      ancho: donde('Ancho') >= 0 ? String(datos[i][donde('Ancho')]).trim() : '',
      largo: donde('Largo') >= 0 ? String(datos[i][donde('Largo')]).trim() : '',
      piezas: donde('Piezas') >= 0 ? String(datos[i][donde('Piezas')]).trim() : '',
      umb: donde('UMB') >= 0 ? String(datos[i][donde('UMB')]).trim() : '',
      rutas: ETAPAS.map(function (e) {
        var c = donde(e.titulo);
        return c >= 0 ? String(datos[i][c]).trim() : '';
      }).filter(Boolean)
    });
  }
  return salida;
}

/**
 * Agrega a BD_Maderas lo que todavía no esté.
 *
 * Las rutas entran con el mismo grupo y tipo de material que el código que las
 * usó: no hay de dónde sacarlos mejor, y dejarlos en blanco sería peor que
 * aproximarlos.
 */
function agregarABd_(lineas) {
  var hoja = hoja_(CFG.HOJA_BD);
  var ultima = hoja.getLastRow();
  var existentes = {};
  if (ultima >= BD.PRIMERA_FILA) {
    hoja.getRange(1, BD.MATERIAL, ultima, 1).getDisplayValues().forEach(function (f) {
      var c = normalizarCodigo_(f[0]);
      if (c) existentes[c] = true;
    });
  }

  var nuevas = [];
  var contar = { codigos: 0, rutas: 0 };

  var anotar = function (codigo, linea, esRuta) {
    var limpio = normalizarCodigo_(codigo);
    if (!limpio || existentes[limpio]) return;
    existentes[limpio] = true;   // dentro de la misma tanda tampoco se repite
    var fila = [];
    for (var i = 0; i < BD.COLUMNAS; i++) fila.push('');
    fila[BD.MATERIAL - 1] = limpio;
    fila[BD.GRUPO - 1] = linea.grupo;
    fila[BD.TIPO_MATERIAL - 1] = esRuta ? 'TPAS' : linea.tipoMaterial;
    fila[BD.DESCRIPCION - 1] = esRuta ? descripcionDeRuta_(limpio) : linea.descripcion;
    nuevas.push(fila);
    if (esRuta) contar.rutas++; else contar.codigos++;
  };

  lineas.forEach(function (linea) {
    anotar(linea.codigo, linea, false);
    linea.rutas.forEach(function (ruta) { anotar(ruta, linea, true); });
  });

  if (nuevas.length) {
    hoja.getRange(hoja.getLastRow() + 1, 1, nuevas.length, BD.COLUMNAS).setValues(nuevas);
    SpreadsheetApp.flush();
  }
  return contar;
}

/** Un texto breve para la ruta, armado con lo que el propio código dice. */
function descripcionDeRuta_(ruta) {
  var partes = descomponerPrefijo_(prefijo_(ruta).trim())
    .map(function (x) { return x.significado; })
    .filter(Boolean);
  var escuadria = escuadriaDeRuta_(ruta);
  return (partes.join(' ') + (escuadria ? ' ' + escuadria : '')).trim();
}
