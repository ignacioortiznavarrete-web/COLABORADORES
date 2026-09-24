/**
 * El aviso a codificación, y lo que pasa cuando una solicitud se termina.
 *
 * Por ahora sale un solo correo: el de ingreso. El de finalizado queda para
 * cuando se defina a quién y con qué texto.
 *
 * Nada de esto detiene un registro: si el correo no sale, la solicitud ya
 * quedó guardada igual. Por eso el aviso va envuelto y solo deja una línea en
 * el registro de ejecución si falla.
 */

/**
 * Avisa a codificación que entró una solicitud nueva.
 *
 * Todo va envuelto, no solo el envío: armar el texto también puede fallar, y
 * un aviso que no sale no puede tumbar un registro que ya quedó escrito.
 */
function avisarIngreso_(numero, cabecera, skus) {
  try {
    armarAvisoDeIngreso_(numero, cabecera, skus);
  } catch (err) {
    Logger.log('avisarIngreso_: ' + err.message);
  }
}

function armarAvisoDeIngreso_(numero, cabecera, skus) {
  if (!CORREOS.CODIFICACION) return;
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

  enviar_(CORREOS.CODIFICACION, CORREOS.ASUNTO_INGRESO + ' · ' + numero,
    cuerpo.join('\n'), cabecera.correo);
}

/**
 * Manda un correo.
 *
 * Apps Script siempre lo manda desde la cuenta con la que corre el script; no
 * hay forma de poner otro remitente. Por eso va `responderA`: codificación
 * recibe el aviso y al responder le escribe a quien pidió, no al buzón desde
 * el que salió.
 *
 * @param {string} responderA  A quién contesta el que reciba, si no es el remitente.
 */
function enviar_(para, asunto, cuerpo, responderA) {
  try {
    var opciones = { name: 'Solicitud Código Maderas' };
    if (CORREOS.COPIA) opciones.cc = CORREOS.COPIA;
    if (responderA) {
      opciones.replyTo = responderA;
      opciones.name = 'Solicitud Código Maderas · ' + responderA;
    }
    MailApp.sendEmail(para, asunto, cuerpo, opciones);
  } catch (err) {
    // Un correo que no sale no puede tumbar un registro que ya quedó escrito.
    Logger.log('No se pudo enviar "' + asunto + '" a ' + para + ': ' + err.message);
  }
}

/* ------------------------------------------------ cuando se da por terminada */

/**
 * Se dispara al editar el spreadsheet.
 *
 * Solo mira una cosa: que alguien haya puesto `Finalizado` en la columna
 * Estado de `Registro`. Cuando pasa, los materiales de esa solicitud —y las
 * hojas de ruta que usaron— se dan de alta en BD_Maderas, y se avisa a quien
 * la pidió.
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
    if (normalizar_(evento.value) !== normalizar_(NUMERACION.ESTADO_FINAL)) return;

    cerrarSolicitud_(hoja, evento.range.getRow());
  } catch (err) {
    Logger.log('alEditarRegistro: ' + err.message);
  }
}

/**
 * Da por terminada una solicitud: sus materiales entran a BD_Maderas.
 *
 * Entran dos cosas: los códigos que se pidieron y las hojas de ruta que
 * nombraron. Lo que ya está no se vuelve a agregar —la base no debería tener
 * un material dos veces— y por eso se lee entera una vez antes de escribir.
 *
 * @return {{codigos: number, rutas: number}} cuántos se agregaron de cada cosa.
 */
function cerrarSolicitud_(hojaRegistro, fila) {
  var numero = String(hojaRegistro.getRange(fila, COL_REGISTRO.indexOf('N° Solicitud') + 1)
    .getDisplayValue()).trim();
  if (!numero) return { codigos: 0, rutas: 0 };

  var lineas = lineasDeSolicitud_(numero);
  if (!lineas.length) return { codigos: 0, rutas: 0 };

  // Por ahora finalizar solo da de alta los materiales. El aviso a quien pidió
  // queda para cuando se defina.
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
