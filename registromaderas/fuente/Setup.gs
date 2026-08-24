/**
 * Preparación del spreadsheet y menú.
 *
 * `instalarRegistro` se ejecuta UNA vez desde el editor de Apps Script:
 * revisa las hojas, crea SAP y Agrupamiento con los catálogos si no existen,
 * y deja la hoja Registro con sus encabezados.
 */

function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('Registro Maderas')
      .addItem('Preparar hojas', 'instalarRegistro')
      .addItem('Ver enlace del formulario', 'mostrarEnlace')
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

  if (crearCatalogo_(libro, CFG.HOJA_SAP, SAP_ENCABEZADOS, SAP_SEMILLA)) {
    hechos.push('Se creó la hoja "' + CFG.HOJA_SAP + '" con las agrupaciones por centro y tipo de material.');
  }
  if (crearCatalogo_(libro, CFG.HOJA_AGRUPAMIENTO, AGRUPAMIENTO_ENCABEZADOS, AGRUPAMIENTO_SEMILLA)) {
    hechos.push('Se creó la hoja "' + CFG.HOJA_AGRUPAMIENTO + '" con las plantillas de cada etapa.');
  }
  olvidarCatalogos_();

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
  hechos.push('La hoja "' + CFG.HOJA_REGISTRO + '" quedó lista.');

  var resumen = hechos.join('\n· ');
  resumen = '· ' + resumen;
  if (problemas.length) resumen += '\n\nRevisa esto:\n· ' + problemas.join('\n· ');
  else resumen += '\n\nTodo en orden.';

  avisar_('Preparar hojas', resumen);
  return resumen;
}

/** Crea una hoja de catálogo con su semilla. Devuelve true si la creó. */
function crearCatalogo_(libro, nombre, encabezados, filas) {
  if (libro.getSheetByName(nombre)) return false;
  var hoja = libro.insertSheet(nombre);
  hoja.getRange(1, 1, 1, encabezados.length)
    .setValues([encabezados])
    .setFontWeight('bold')
    .setBackground('#14352a')
    .setFontColor('#ffffff');
  hoja.getRange(2, 1, filas.length, encabezados.length).setValues(filas);
  hoja.setFrozenRows(1);
  return true;
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
