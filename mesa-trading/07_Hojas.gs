/**
 * Preparacion y actualizacion de hojas auxiliares
 * Proyecto: Seguimiento Trading
 */

function actualizarValidacionProveedoresEnHojaUnica_(hojaUnica, hojaProveedores) {
  var maxRowsProv = Math.max(hojaProveedores.getMaxRows(), 200);
  var rangoOrigenProv = hojaProveedores.getRange(2, 1, maxRowsProv - 1, 1);
  var reglaDesplegable = SpreadsheetApp.newDataValidation()
    .requireValueInRange(rangoOrigenProv, true)
    .setAllowInvalid(false)
    .build();

  var totalRows = Math.max(hojaUnica.getMaxRows(), 2);
  hojaUnica.getRange(2, 5, totalRows - 1, 1).setDataValidation(reglaDesplegable);
}

function actualizarPuertoDestinoHojaUnica_(hojaUnica, datosBd, encabezadosBd) {
  var colPuertoDestino = obtenerIndiceHeader_(encabezadosBd, [
    "Puerto Destino",
    "Puerto destino",
    "Puerto de destino",
    "Puerto Dest.",
    "Destino Puerto"
  ]);

  if (colPuertoDestino === -1) return;

  var colDocVenta = encabezadosBd.indexOf("Documento de ventas");
  var colMaterial = encabezadosBd.indexOf("Material");
  if (colDocVenta === -1 || colMaterial === -1) return;

  var mapaPuerto = {};
  for (var i = 1; i < datosBd.length; i++) {
    var docVenta = String(datosBd[i][colDocVenta] || "").trim();
    var material = String(datosBd[i][colMaterial] || "").trim();
    var puertoDestino = String(valorFilaPorIndice_(datosBd[i], colPuertoDestino) || "").trim();
    var clave = clavePedido_(docVenta, material);

    if (clave && puertoDestino && !mapaPuerto[clave]) {
      mapaPuerto[clave] = puertoDestino;
    }
  }

  var colPuertoHojaUnica = TRADING_CONFIG.unicaHeaders.indexOf("Puerto Destino") + 1;
  var lastRow = hojaUnica.getLastRow();
  if (lastRow < 2 || colPuertoHojaUnica < 1) return;

  var datosUnica = hojaUnica.getRange(2, 1, lastRow - 1, Math.max(colPuertoHojaUnica, 3)).getValues();
  var valoresPuerto = [];

  for (var r = 0; r < datosUnica.length; r++) {
    var claveUnica = clavePedido_(datosUnica[r][1], datosUnica[r][2]);
    valoresPuerto.push([mapaPuerto[claveUnica] || ""]);
  }

  hojaUnica.getRange(2, colPuertoHojaUnica, valoresPuerto.length, 1).setValues(valoresPuerto);
}

function asegurarHojaUnica_(libro) {
  var hoja = obtenerHojaFlexible_(libro, TRADING_CONFIG.sheets.unica);
  if (!hoja) hoja = libro.insertSheet(TRADING_CONFIG.sheets.unica);

  var headers = TRADING_CONFIG.unicaHeaders;
  var current = hoja.getRange(1, 1, 1, headers.length).getValues()[0];
  for (var i = 0; i < headers.length; i++) {
    if (!current[i]) {
      hoja.getRange(1, i + 1).setValue(headers[i]);
    }
  }

  hoja.getRange(1, 1, 1, headers.length)
    .setFontWeight("bold")
    .setBackground("#e6e6e6")
    .setBorder(true, true, true, true, true, true);

  return hoja;
}
