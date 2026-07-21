/**
 * Menu de Sheets, WebApp y apertura de paneles
 * Proyecto: Seguimiento Trading
 */

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu("Mesa Trading")
    .addItem("Sincronizar ahora (todo en un paso)", "sincronizarTradingConResumen")
    .addSeparator()
    .addItem("Abrir mesa trading web", "mostrarLinkMesaTrading")
    .addItem("Abrir sidebar operativo", "mostrarSidebarTrading")
    .addItem("Administrar proveedores", "mostrarPanelProveedores")
    .addSeparator()
    .addSubMenu(
      ui.createMenu("Avanzado")
        .addItem("Configurar sistema completo", "configurarSistemaTradingCompleto")
        .addItem("Instalar automatizacion cada hora", "instalarAutomatizacionTrading")
        .addItem("Registrar historial volumen", "registrarHistorialVolumenPorProducir")
        .addItem("Preparar hoja Proveedores", "prepararHojaProveedores")
    )
    .addToUi();
}

/**
 * Un solo paso para el dia a dia: trae pedidos nuevos desde Bd,
 * sincroniza colores/comentarios y registra el historial de volumen.
 */
function sincronizarTradingConResumen() {
  var resultado = sincronizarTradingAutomatico();
  SpreadsheetApp.getUi().alert(
    "Sincronizacion completa.\n" +
    "Pedidos nuevos agregados: " + resultado.nuevasFilas + "\n" +
    "Historial volumen: " + resultado.historial.registrosAgregados + " cambios registrados."
  );
}

function doGet(e) {
  var template = HtmlService.createTemplateFromFile("Index");
  template.appTitle = "Mesa Trading Madera";
  return template
    .evaluate()
    .setTitle("Mesa Trading Madera")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function mostrarLinkMesaTrading() {
  var url = ScriptApp.getService().getUrl();
  var html = HtmlService.createHtmlOutput(
    '<div style="font-family:Arial,sans-serif;padding:16px;line-height:1.45;color:#1f2933">' +
      '<h2 style="margin:0 0 12px;font-size:18px">Mesa Trading Madera</h2>' +
      (url
        ? '<a href="' + url + '" target="_blank" style="display:inline-block;background:#175843;color:#fff;text-decoration:none;padding:10px 14px;border-radius:6px;font-weight:bold">Abrir mesa</a>'
        : '<p>Primero despliega el proyecto como aplicacion web desde Apps Script.</p>') +
    '</div>'
  ).setWidth(360).setHeight(160);
  SpreadsheetApp.getUi().showModalDialog(html, "Mesa Trading");
}

function mostrarPanelProveedores() {
  prepararHojaProveedores();
  var template = HtmlService.createTemplateFromFile("SidebarTrading");
  template.initialTab = "proveedores";
  var html = template.evaluate()
    .setTitle("Sidebar Trading")
    .setWidth(380);
  SpreadsheetApp.getUi().showSidebar(html);
}

function mostrarSidebarTrading() {
  prepararHojaProveedores();
  var template = HtmlService.createTemplateFromFile("SidebarTrading");
  template.initialTab = "pedido";
  var html = template.evaluate()
    .setTitle("Sidebar Trading")
    .setWidth(380);
  SpreadsheetApp.getUi().showSidebar(html);
}
