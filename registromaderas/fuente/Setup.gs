/**
 * Preparación del spreadsheet y menú.
 *
 * `instalarRegistro` se ejecuta UNA vez desde el editor de Apps Script:
 * revisa que estén las hojas que el formulario necesita y crea la hoja
 * Registro con sus encabezados.
 */

function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('Registro Maderas')
      .addItem('Preparar hojas', 'instalarRegistro')
      .addItem('Ver enlace del formulario', 'mostrarEnlace')
      .addToUi();
  } catch (err) {
    // Sin interfaz (ejecución por trigger o desde el editor): no hay menú que crear.
  }
}

function instalarRegistro() {
  var libro = ss_();
  var problemas = [];

  if (!libro.getSheetByName(CFG.HOJA_BD)) {
    problemas.push('Falta la hoja "' + CFG.HOJA_BD + '" (la base de códigos).');
  }
  CLASES.forEach(function (clase) {
    var hoja = libro.getSheetByName(clase.hoja);
    if (!hoja) {
      problemas.push('Falta la hoja "' + clase.hoja + '" (' + clase.titulo + ').');
      return;
    }
    var indices = indicePorEncabezado_(hoja);
    var sinColumna = Object.keys(MAPEO_DESTINO).filter(function (encabezado) {
      return !indices[normalizar_(encabezado)];
    });
    if (sinColumna.length === Object.keys(MAPEO_DESTINO).length) {
      problemas.push('La hoja "' + clase.hoja + '" no tiene los encabezados en la fila ' +
        CFG.FILA_ENCABEZADOS + '.');
    } else if (sinColumna.length) {
      problemas.push('En "' + clase.hoja + '" no se encontraron estas columnas y quedarán ' +
        'sin escribir: ' + sinColumna.join(', ') + '.');
    }
  });

  var registro = hojaRegistro_();
  asegurarEncabezadosRegistro_(registro);

  var resumen = problemas.length
    ? 'Listo, pero revisa esto:\n\n· ' + problemas.join('\n· ')
    : 'Listo. Las hojas ' + CLASES.map(function (c) { return c.hoja; }).join(', ') +
      ', ' + CFG.HOJA_BD + ' y ' + CFG.HOJA_REGISTRO + ' están en orden.';

  avisar_('Preparar hojas', resumen);
  return resumen;
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
