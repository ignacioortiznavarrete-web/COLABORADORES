/**
 * Registro historico de volumen por producir
 * Proyecto: Seguimiento Trading
 */

function registrarHistorialVolumenPorProducir(mostrarAlerta) {
  if (mostrarAlerta === undefined) mostrarAlerta = true;

  var lock = LockService.getDocumentLock();
  lock.waitLock(10000);

  try {
    // Incluye pedidos con 0 por producir: hay que registrar cuando llegan a 0.
    var datosMesa = obtenerDatosMesaTrading(true);
    var hojaHistorial = asegurarHojaHistorialVolumen_();
    var estadoHistorial = obtenerEstadoHistorialVolumen_(hojaHistorial);
    var filas = [];
    var fechaRegistro = new Date();

    for (var i = 0; i < datosMesa.pedidos.length; i++) {
      var pedido = datosMesa.pedidos[i];
      var clave = pedido.id || clavePedido_(pedido.docVenta, pedido.material);
      if (!clave) continue;

      var volumenActual = Number(pedido.cantidad || 0);
      var estadoPedido = estadoHistorial[clave];

      if (estadoPedido && Math.abs(estadoPedido.ultimoVolumen - volumenActual) < 0.000001) {
        continue;
      }

      var volumenInicial = estadoPedido ? estadoPedido.volumenInicial : volumenActual;
      var volumenAnterior = estadoPedido ? estadoPedido.ultimoVolumen : volumenActual;
      var diferenciaVsInicial = volumenInicial - volumenActual;
      var diferenciaVsAnterior = volumenAnterior - volumenActual;

      filas.push([
        fechaRegistro,
        pedido.docVenta,
        pedido.material,
        pedido.textoComercial,
        pedido.cliente,
        pedido.proveedor,
        pedido.estado,
        volumenInicial,
        volumenActual,
        diferenciaVsInicial,
        diferenciaVsAnterior,
        pedido.comentarioVentas,
        pedido.comentarioCompras,
        pedido.rowIndex,
        clave
      ]);
    }

    if (filas.length > 0) {
      var startRow = hojaHistorial.getLastRow() + 1;
      hojaHistorial.getRange(startRow, 1, filas.length, TRADING_CONFIG.historialVolumenHeaders.length).setValues(filas);
      hojaHistorial.getRange(startRow, 1, filas.length, 1).setNumberFormat("dd-mm-yyyy hh:mm");
      hojaHistorial.getRange(startRow, 8, filas.length, 4).setNumberFormat("#,##0.00");
    }

    var resultado = {
      ok: true,
      registrosAgregados: filas.length,
      pedidosRevisados: datosMesa.pedidos.length,
      hoja: TRADING_CONFIG.sheets.historialVolumen
    };

    if (mostrarAlerta) {
      SpreadsheetApp.getUi().alert(
        "Historial de volumen actualizado.\n" +
        "Pedidos revisados: " + resultado.pedidosRevisados + "\n" +
        "Cambios registrados: " + resultado.registrosAgregados
      );
    }

    return resultado;
  } finally {
    lock.releaseLock();
  }
}

function asegurarHojaHistorialVolumen_() {
  var libro = SpreadsheetApp.getActiveSpreadsheet();
  var nombreHoja = TRADING_CONFIG.sheets.historialVolumen;
  var hoja = obtenerHojaFlexible_(libro, nombreHoja);
  if (!hoja) hoja = libro.insertSheet(nombreHoja);

  var headers = TRADING_CONFIG.historialVolumenHeaders;
  var current = hoja.getRange(1, 1, 1, headers.length).getValues()[0];
  var necesitaHeaders = false;

  for (var i = 0; i < headers.length; i++) {
    if (String(current[i] || "").trim() !== headers[i]) {
      necesitaHeaders = true;
      break;
    }
  }

  if (necesitaHeaders) {
    hoja.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  hoja.getRange(1, 1, 1, headers.length)
    .setFontWeight("bold")
    .setFontColor(TRADING_CONFIG.headerTextColor)
    .setBackground(TRADING_CONFIG.headerColor)
    .setBorder(true, true, true, true, true, true);

  hoja.setFrozenRows(1);
  hoja.getRange("A:A").setNumberFormat("dd-mm-yyyy hh:mm");
  hoja.getRange("H:K").setNumberFormat("#,##0.00");

  if (hoja.getFilter()) hoja.getFilter().remove();
  hoja.getRange(1, 1, Math.max(hoja.getLastRow(), 1), headers.length).createFilter();

  return hoja;
}

function obtenerEstadoHistorialVolumen_(hojaHistorial) {
  var lastRow = hojaHistorial.getLastRow();
  var estado = {};
  if (lastRow < 2) return estado;

  var headersLength = TRADING_CONFIG.historialVolumenHeaders.length;
  var datos = hojaHistorial.getRange(2, 1, lastRow - 1, headersLength).getValues();

  for (var i = 0; i < datos.length; i++) {
    var fila = datos[i];
    var clave = String(fila[14] || clavePedido_(fila[1], fila[2]) || "").trim();
    if (!clave) continue;

    var volumenInicial = Number(fila[7] || 0);
    var volumenActual = Number(fila[8] || 0);
    if (!volumenInicial && volumenActual) volumenInicial = volumenActual;

    if (!estado[clave]) {
      estado[clave] = {
        volumenInicial: volumenInicial,
        ultimoVolumen: volumenActual
      };
    } else {
      estado[clave].ultimoVolumen = volumenActual;
    }
  }

  return estado;
}
