/**
 * Preparación del spreadsheet y menú.
 *
 * `instalarRegistro` se ejecuta UNA vez desde el editor de Apps Script:
 * revisa que estén BD_Maderas, PT, PCP y PP con sus columnas donde se esperan,
 * y deja la hoja Registro con sus encabezados. No crea ninguna hoja más.
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
  hechos.push('La hoja "' + CFG.HOJA_DETALLE + '" quedó lista (una fila por código).');

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
    'Listo.\n\nDe ahora en adelante, al poner "' + NUMERACION.ESTADO_FINAL + '" en la ' +
    'columna Estado de "' + CFG.HOJA_REGISTRO + '":\n' +
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
