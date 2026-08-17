/**
 * Puertas de entrada: la aplicación web, el menú de la planilla y el panel
 * lateral.
 *
 * Las funciones sin guion bajo al final son las que puede llamar el navegador
 * con google.script.run. Las que terminan en guion bajo son internas.
 */

function doGet() {
  return HtmlService.createTemplateFromFile('Mesa')
    .evaluate()
    .setTitle('Mesa Trading')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(nombre) {
  return HtmlService.createHtmlOutputFromFile(nombre).getContent();
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Mesa Trading')
    .addItem('Abrir la mesa', 'mostrarMesa')
    .addItem('Panel lateral', 'mostrarPanel')
    .addSeparator()
    .addItem('Traer pedidos nuevos desde Bd', 'menuTraerPedidos')
    .addItem('Sincronizar todo', 'menuSincronizar')
    .addSeparator()
    .addItem('Instalar / reparar la mesa', 'menuInstalar')
    .addToUi();
}

// ============================================================================
// Lo que llama el navegador
// ============================================================================

function datosMesa() {
  return datosMesa_();
}

/** La mesa embebida dentro de la planilla, sin salir a otra pestaña. */
function mostrarMesa() {
  var html = HtmlService.createTemplateFromFile('Mesa')
    .evaluate()
    .setWidth(1500)
    .setHeight(880);
  SpreadsheetApp.getUi().showModalDialog(html, 'Mesa Trading');
}

function mostrarPanel() {
  var html = HtmlService.createTemplateFromFile('Panel')
    .evaluate()
    .setTitle('Mesa Trading');
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * Datos del panel lateral: lo mismo que la mesa, más el pedido de la fila que
 * está seleccionada en la planilla.
 */
function datosPanel() {
  var datos = datosMesa_();
  datos.seleccionado = null;
  datos.mensaje = '';

  var hoja = SpreadsheetApp.getActiveSheet();
  var rango = SpreadsheetApp.getActiveRange();

  if (!hoja || !rango || normalizar_(hoja.getName()) !== normalizar_(MESA.HOJA_MESA)) {
    datos.mensaje = 'Selecciona una fila de "' + MESA.HOJA_MESA + '" para trabajarla aquí.';
    return datos;
  }

  var fila = rango.getRow();
  if (fila < 2) {
    datos.mensaje = 'Esa es la fila de encabezados. Elige una fila de pedido.';
    return datos;
  }

  for (var i = 0; i < datos.pedidos.length; i++) {
    if (Number(datos.pedidos[i].fila) === Number(fila)) {
      datos.seleccionado = datos.pedidos[i];
      break;
    }
  }
  if (!datos.seleccionado) datos.mensaje = 'La fila ' + fila + ' todavía no tiene pedido cargado.';

  return datos;
}

/** Guarda desde el panel, tomando la fila activa si no vino en el payload. */
function guardarDesdePanel(payload) {
  payload = payload || {};
  if (!payload.fila) {
    var rango = SpreadsheetApp.getActiveRange();
    if (rango) payload.fila = rango.getRow();
  }
  return guardarPedido(payload);
}

/** Deja la planilla en la fila del pedido que se eligió en el panel. */
function irAFila(fila) {
  var numero = parseInt(fila, 10);
  if (!numero || numero < 2) return { ok: false };

  var hoja = hoja_(MESA.HOJA_MESA, false);
  if (!hoja) return { ok: false };

  SpreadsheetApp.setActiveSheet(hoja);
  hoja.setActiveRange(hoja.getRange(numero, 1));
  return { ok: true };
}

// ============================================================================
// Menú
// ============================================================================

function menuTraerPedidos() {
  var r = traerPedidosNuevos();
  SpreadsheetApp.getUi().alert(
    r.nuevos
      ? 'Se agregaron ' + r.nuevos + ' pedido(s) nuevos a "' + MESA.HOJA_MESA + '".'
      : 'No hay pedidos nuevos en Bd: la mesa está al día.');
}

function menuSincronizar() {
  SpreadsheetApp.getUi().alert(sincronizarTodo().mensaje);
}

function menuInstalar() {
  SpreadsheetApp.getUi().alert(instalarMesaTrading().mensaje);
}
