/**
 * Preparación del spreadsheet y menú.
 *
 * `instalarRegistro` se ejecuta UNA vez desde el editor de Apps Script:
 * revisa que estén BD_Maderas, PT, PCP y PP con sus columnas donde se esperan,
 * y deja listas las tres bitácoras: Registro, Registro Detalle y Registro
 * Estados. No crea ninguna hoja más.
 */

function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('Registro Maderas')
      .addItem('Descargar filas seleccionadas como Excel', 'descargarSeleccion')
      .addSeparator()
      .addItem('Ver enlace del formulario', 'mostrarEnlace')
      .addItem('Preparar hojas', 'instalarRegistro')
      .addItem('Activar el cierre al finalizar', 'instalarDisparador')
      .addItem('Revisar permisos', 'revisarPermisos')
      .addItem('Probar correo', 'probarCorreo')
      .addToUi();
  } catch (err) {
    // Sin interfaz (trigger o editor): no hay menú que crear.
  }
}

function instalarRegistro() {
  var libro = ss_();
  var problemas = [];
  var hechos = [];

  if (!libro.getSheetByName(CFG.HOJA_BD)) {
    problemas.push('Falta la hoja "' + CFG.HOJA_BD + '" (la base de códigos).');
  }

  CLASES.forEach(function (clase) {
    var hoja = libro.getSheetByName(clase.hoja);
    if (!hoja) {
      problemas.push('Falta la hoja "' + clase.hoja + '" (' + clase.titulo + ').');
      return;
    }
    var ancho = Math.max(hoja.getLastColumn(), 1);
    var encabezados = hoja.getRange(CFG.FILA_ENCABEZADOS, 1, 1, ancho).getValues()[0];
    var movidas = MAPEO_DESTINO.filter(function (m) {
      return normalizar_(encabezados[m.col - 1]) !== normalizar_(m.encabezado);
    });
    if (movidas.length) {
      problemas.push('En "' + clase.hoja + '" estas columnas no están donde se esperaba: ' +
        movidas.map(function (m) { return m.encabezado + ' (columna ' + m.col + ')'; }).join(', ') +
        '. Revisa la fila ' + CFG.FILA_ENCABEZADOS + '.');
    }
  });

  asegurarEncabezadosRegistro_(hojaRegistro_());
  asegurarComboEstado_(hojaRegistro_());
  hechos.push('La hoja "' + CFG.HOJA_REGISTRO + '" quedó lista (una fila por solicitud), ' +
    'con el combo de Estado en su columna: ' + ESTADOS.join(', ') + '.');
  asegurarEncabezadosDetalle_(hojaDetalle_());
  asegurarMedidasComoTexto_(hojaDetalle_());
  hechos.push('La hoja "' + CFG.HOJA_DETALLE + '" quedó lista (una fila por código), ' +
    'con Espesor, Ancho y Largo en formato texto para que no se pierdan los ceros.');
  asegurarEncabezadosEstados_(hojaEstados_());
  hechos.push('La hoja "' + CFG.HOJA_ESTADOS + '" quedó lista (una fila por cambio de estado).');

  // Los rótulos de las bitácoras, uno por uno. Una hoja creada antes de que se
  // agregara una columna se queda con los rótulos viejos —`encabezados_` no
  // pisa una hoja con datos— y quien lee por rótulo no la encuentra. Eso no da
  // error: simplemente devuelve vacío, y el aviso que dependía de esa columna
  // no sale sin decir nada.
  [
    [hojaRegistro_(), COL_REGISTRO, CFG.HOJA_REGISTRO],
    [hojaDetalle_(), COL_DETALLE, CFG.HOJA_DETALLE],
    [hojaEstados_(), COL_ESTADOS, CFG.HOJA_ESTADOS]
  ].forEach(function (x) {
    var malos = revisarEncabezados_(x[0], x[1]);
    if (!malos.length) return;
    problemas.push('En "' + x[2] + '" los rótulos no son los que el código espera:\n    · ' +
      malos.join('\n    · ') +
      '\n  Los datos SÍ se escriben en ese orden; lo que falta es el rótulo. ' +
      'Corrígelo a mano en la fila 1, o si esa hoja no tiene nada que valga la ' +
      'pena, bórrala entera y vuelve a correr esto.');
  });

  var resumen = hechos.join('\n· ');
  resumen = '· ' + resumen;
  if (problemas.length) resumen += '\n\nRevisa esto:\n· ' + problemas.join('\n· ');
  else resumen += '\n\nTodo en orden.';

  avisar_('Preparar hojas', resumen);
  return resumen;
}

/**
 * Deja andando el disparador que cierra una solicitud.
 *
 * Tiene que ser instalable, no el onEdit simple: el simple corre sin permisos
 * y no puede escribir en BD_Maderas ni mandar correos, que es justo lo que
 * hace falta al poner Finalizado.
 *
 * Se borra el que hubiera antes: instalarlo dos veces dejaría dos, y cada
 * solicitud se cerraría dos veces.
 */
function instalarDisparador() {
  var libro = ss_();
  var repetidos = 0;
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'alEditarRegistro') {
      ScriptApp.deleteTrigger(t);
      repetidos++;
    }
  });

  ScriptApp.newTrigger('alEditarRegistro')
    .forSpreadsheet(libro)
    .onEdit()
    .create();

  avisar_('Activar el cierre al finalizar',
    'Listo.\n\nDe ahora en adelante, cada vez que cambies el Estado de una ' +
    'solicitud en "' + CFG.HOJA_REGISTRO + '" queda anotado en "' + CFG.HOJA_ESTADOS +
    '" con su fecha y hora, y el monitor lo muestra.\n\n' +
    'Y al poner "' + NUMERACION.ESTADO_FINAL + '" en esa columna, además:\n' +
    '· los códigos de esa solicitud y sus hojas de ruta se agregan a ' + CFG.HOJA_BD +
    ' (los que ya estén, no)\n' +
    '· se le avisa por correo a quien la pidió\n\n' +
    'Ese correo sale de TU cuenta (' + usuario_() + '), porque es la que acaba de ' +
    'instalar el disparador. Si debe salir de codificación, que lo instale ' +
    'codificación desde su cuenta.' +
    (repetidos ? '\n\nSe quitó ' + repetidos + ' disparador repetido.' : ''));
}

function mostrarEnlace() {
  var url = urlFormulario_();
  avisar_('Enlace del formulario', url
    ? url + '\n\nPara entrar con la clase ya elegida:\n' +
      CLASES.map(function (c) { return '· ' + c.titulo + ': ' + url + '?clase=' + c.id; }).join('\n')
    : 'Todavía no hay una implementación web publicada. Usa Implementar › Nueva implementación › Aplicación web.');
}

function avisar_(titulo, mensaje) {
  try {
    SpreadsheetApp.getUi().alert(titulo, mensaje, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (err) {
    Logger.log(titulo + ': ' + mensaje);
  }
}
