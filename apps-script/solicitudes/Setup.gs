/**
 * Creación y reparación de las hojas del flujo.
 *
 * Ejecutar `instalarSolicitudes` una vez, y cada vez que cambie el esquema de
 * campos en Config.gs. Nunca borra ni reordena columnas existentes: solo agrega
 * al final las que falten y aplica formato/validaciones.
 */

function instalarSolicitudes() {
  var ss = ss_();
  ETAPAS.forEach(function (etapa) {
    var hoja = ss.getSheetByName(etapa.hoja) || ss.insertSheet(etapa.hoja);
    prepararHojaEtapa_(hoja, etapa);
  });
  prepararHojaHistorial_(ss);
  sincronizarCorrelativo_();
  SpreadsheetApp.flush();
  return 'Listo. Hojas: ' + ETAPAS.map(function (e) { return e.hoja; }).join(' > ') +
    ' + ' + CFG.HOJA_HISTORIAL;
}

function prepararHojaEtapa_(hoja, etapa) {
  var esperados = encabezados_(etapa);
  var actuales = leerEncabezados_(hoja);

  if (!actuales.join('')) {
    hoja.getRange(1, 1, 1, esperados.length).setValues([esperados]);
    actuales = esperados.slice();
  } else {
    var presentes = {};
    actuales.forEach(function (h) { if (h) presentes[clave_(h)] = true; });
    var faltantes = esperados.filter(function (h) { return !presentes[clave_(h)]; });
    if (faltantes.length) {
      hoja.getRange(1, actuales.length + 1, 1, faltantes.length).setValues([faltantes]);
      actuales = actuales.concat(faltantes);
    }
  }

  hoja.getRange(1, 1, 1, actuales.length)
    .setFontWeight('bold')
    .setBackground('#1f3864')
    .setFontColor('#ffffff')
    .setVerticalAlignment('middle')
    .setWrap(true);
  hoja.setFrozenRows(1);
  hoja.setRowHeight(1, 34);

  var mapa = mapaColumnas_(hoja);
  aplicarValidacionEstado_(hoja, mapa, etapa);
  aplicarFormatos_(hoja, mapa, etapa);
}

function aplicarValidacionEstado_(hoja, mapa, etapa) {
  var col = colDe_(mapa, etapa.colEstado);
  if (!col) return;
  var filas = Math.max(hoja.getMaxRows() - 1, 1);
  var regla = SpreadsheetApp.newDataValidation()
    .requireValueInList(ESTADOS_LISTA, true)
    .setAllowInvalid(false)
    .setHelpText('Seleccione ' + ESTADOS_LISTA.join(' / ') + '. Vacío = pendiente.')
    .build();
  hoja.getRange(2, col, filas, 1).setDataValidation(regla);
}

function aplicarFormatos_(hoja, mapa, etapa) {
  var filas = Math.max(hoja.getMaxRows() - 1, 1);

  ['Fecha Registro', 'Fecha Estado'].forEach(function (h) {
    var c = colDe_(mapa, h);
    if (c) hoja.getRange(2, c, filas, 1).setNumberFormat('dd-MM-yyyy HH:mm');
  });

  etapa.campos.forEach(function (campo) {
    var c = colDe_(mapa, campo.columna);
    if (!c) return;
    if (campo.tipo === 'fecha') hoja.getRange(2, c, filas, 1).setNumberFormat('dd-MM-yyyy');
    if (campo.tipo === 'numero') hoja.getRange(2, c, filas, 1).setNumberFormat('#,##0.##');
    if (campo.tipo === 'lista' && campo.opciones && campo.opciones.length) {
      hoja.getRange(2, c, filas, 1).setDataValidation(
        SpreadsheetApp.newDataValidation()
          .requireValueInList(campo.opciones, true)
          .setAllowInvalid(false)
          .build()
      );
    }
  });

  var colNum = colDe_(mapa, etapa.colNumero);
  if (colNum) {
    hoja.getRange(2, colNum, filas, 1)
      .setNumberFormat('@')
      .setHorizontalAlignment('left')
      .setFontWeight('bold');
  }
}

function prepararHojaHistorial_(ss) {
  var hoja = ss.getSheetByName(CFG.HOJA_HISTORIAL) || ss.insertSheet(CFG.HOJA_HISTORIAL);
  if (!leerEncabezados_(hoja).join('')) {
    hoja.getRange(1, 1, 1, COL_HISTORIAL.length).setValues([COL_HISTORIAL]);
  }
  hoja.getRange(1, 1, 1, COL_HISTORIAL.length)
    .setFontWeight('bold')
    .setBackground('#37474f')
    .setFontColor('#ffffff');
  hoja.setFrozenRows(1);
  hoja.getRange(2, 1, Math.max(hoja.getMaxRows() - 1, 1), 1).setNumberFormat('dd-MM-yyyy HH:mm:ss');
  return hoja;
}

/**
 * Alinea el correlativo guardado en propiedades con el mayor número existente
 * en las hojas, para que jamás se repita un N° de solicitud.
 */
function sincronizarCorrelativo_() {
  var maximo = 0;
  ETAPAS.forEach(function (etapa) {
    var hoja = ss_().getSheetByName(etapa.hoja);
    if (!hoja || hoja.getLastRow() < 2) return;
    var col = colDe_(mapaColumnas_(hoja), etapa.colNumero);
    if (!col) return;
    hoja.getRange(2, col, hoja.getLastRow() - 1, 1).getValues().forEach(function (f) {
      var n = correlativoDe_(f[0]);
      if (n > maximo) maximo = n;
    });
  });
  var props = PropertiesService.getScriptProperties();
  var guardado = parseInt(props.getProperty(CFG.PROP_CORRELATIVO) || '0', 10) || 0;
  if (maximo > guardado) props.setProperty(CFG.PROP_CORRELATIVO, String(maximo));
  return Math.max(maximo, guardado);
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Solicitudes')
    .addItem('Instalar / reparar hojas', 'instalarSolicitudes')
    .addItem('Ver enlaces de los formularios', 'mostrarUrlsFormularios')
    .addToUi();
}

function mostrarUrlsFormularios() {
  var base = '';
  try { base = ScriptApp.getService().getUrl() || ''; } catch (e) { base = ''; }
  var html = base
    ? '<p style="font:14px Arial">Un enlace por formulario:</p>' + ETAPAS.map(function (e) {
        var url = base + '?form=' + e.id;
        return '<p style="font:13px Arial"><b>' + e.titulo + '</b><br>' +
          '<a href="' + url + '" target="_blank">' + url + '</a></p>';
      }).join('')
    : '<p style="font:14px Arial">Primero publica el proyecto: <i>Implementar &gt; Nueva implementación &gt; Aplicación web</i>.</p>';
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput(html).setWidth(580).setHeight(300),
    'Formularios del flujo'
  );
}
