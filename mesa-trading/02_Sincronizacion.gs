/**
 * Procesos principales de consolidacion y automatizacion
 * Proyecto: Seguimiento Trading
 */

function consolidarVentasConProveedoresPorFila() {
  var resultado;
  try {
    resultado = consolidarVentasTradingSilencioso_();
  } catch (e) {
    SpreadsheetApp.getUi().alert("Error: " + e.message);
    return;
  }

  var resultadoHistorial = registrarHistorialVolumenPorProducir(false);

  if (resultado.nuevasFilas > 0) {
    SpreadsheetApp.getUi().alert("Actualizacion completa. Se agregaron " + resultado.nuevasFilas + " nuevos registros.\nHistorial volumen: " + resultadoHistorial.registrosAgregados + " cambios registrados.");
  } else {
    SpreadsheetApp.getUi().alert("Tu panel esta al dia. Se actualizo la validacion dinamica de proveedores.\nHistorial volumen: " + resultadoHistorial.registrosAgregados + " cambios registrados.");
  }
}

function sincronizarColoresEHistorialTrading() {
  actualizarColoresTablaSeguimientoCompleta();
  registrarHistorialVolumenPorProducir(true);
}

function configurarSistemaTradingCompleto() {
  prepararHojaProveedores();
  asegurarHojaHistorialVolumen_();

  var resultado = sincronizarTradingAutomatico();
  var trigger = instalarAutomatizacionTrading(false);

  SpreadsheetApp.getUi().alert(
    "Sistema Trading configurado.\n" +
    "Pedidos nuevos agregados: " + resultado.nuevasFilas + "\n" +
    "Historial volumen: " + resultado.historial.registrosAgregados + " cambios registrados.\n" +
    "Automatizacion: " + trigger.mensaje
  );
}

function instalarAutomatizacionTrading(mostrarAlerta) {
  if (mostrarAlerta === undefined) mostrarAlerta = true;

  var handler = "sincronizarTradingAutomatico";
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction && triggers[i].getHandlerFunction() === handler) {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  ScriptApp.newTrigger(handler)
    .timeBased()
    .everyHours(1)
    .create();

  var resultado = {
    ok: true,
    mensaje: "activa cada 1 hora"
  };

  if (mostrarAlerta) {
    SpreadsheetApp.getUi().alert("Automatizacion instalada: sincronizacion cada 1 hora.");
  }

  return resultado;
}

function sincronizarTradingAutomatico() {
  var resultadoConsolidacion = consolidarVentasTradingSilencioso_();
  actualizarColoresTablaSeguimientoCompleta();
  var resultadoHistorial = registrarHistorialVolumenPorProducir(false);

  return {
    ok: true,
    nuevasFilas: resultadoConsolidacion.nuevasFilas,
    historial: resultadoHistorial
  };
}

function consolidarVentasTradingSilencioso_() {
  var libro = SpreadsheetApp.getActiveSpreadsheet();
  var hojaBd = libro.getSheetByName(TRADING_CONFIG.sheets.bd);
  var hojaProveedores = prepararHojaProveedores();
  var hojaDestino = asegurarHojaUnica_(libro);

  if (!hojaBd || !hojaProveedores || !hojaDestino) {
    throw new Error("Faltan hojas base: Bd, Proveedores u Hoja Unica.");
  }

  actualizarValidacionProveedoresEnHojaUnica_(hojaDestino, hojaProveedores);

  var datosDestinoExistentes = hojaDestino.getDataRange().getValues();
  var mapaExistentes = {};
  for (var d = 1; d < datosDestinoExistentes.length; d++) {
    var docExistente = datosDestinoExistentes[d][1];
    var matExistente = datosDestinoExistentes[d][2];
    if (docExistente && matExistente) {
      mapaExistentes[clavePedido_(docExistente, matExistente)] = true;
    }
  }

  var datosBd = hojaBd.getDataRange().getValues();
  if (datosBd.length < 2) {
    return { nuevasFilas: 0 };
  }

  var encabezadosBd = datosBd[0];
  var colDocVenta = encabezadosBd.indexOf("Documento de ventas");
  var colMaterial = encabezadosBd.indexOf("Material");
  var colTextoComercial = encabezadosBd.indexOf("Texto Comercial");
  var colOrigen = encabezadosBd.indexOf("Origen");
  var colCantidad = encabezadosBd.indexOf("Ctd.Ped.(m3)");
  var colPuertoDestino = obtenerIndiceHeader_(encabezadosBd, [
    "Puerto Destino",
    "Puerto destino",
    "Puerto de destino",
    "Puerto Dest.",
    "Destino Puerto"
  ]);

  if (colDocVenta === -1 || colMaterial === -1 || colTextoComercial === -1 || colOrigen === -1 || colCantidad === -1) {
    throw new Error("Faltan columnas requeridas en Bd para consolidar trading.");
  }

  var nuevasFilas = [];
  for (var f = 1; f < datosBd.length; f++) {
    var origen = datosBd[f][colOrigen] ? String(datosBd[f][colOrigen]).toLowerCase() : "";
    var cantidad = parseNumeroFlexible_(datosBd[f][colCantidad]);

    if (origen.indexOf("trading") !== -1 && cantidad !== 0) {
      var docVenta = datosBd[f][colDocVenta];
      var material = datosBd[f][colMaterial];
      var textoComercial = datosBd[f][colTextoComercial];
      var puertoDestino = valorFilaPorIndice_(datosBd[f], colPuertoDestino);
      var claveNueva = clavePedido_(docVenta, material);

      if (claveNueva && !mapaExistentes[claveNueva]) {
        nuevasFilas.push(["Bd", docVenta, material, textoComercial, "", "", "", puertoDestino]);
        mapaExistentes[claveNueva] = true;
      }
    }
  }

  if (nuevasFilas.length > 0) {
    var ultimaFilaDestino = hojaDestino.getLastRow();
    hojaDestino.getRange(ultimaFilaDestino + 1, 1, nuevasFilas.length, TRADING_CONFIG.unicaHeaders.length).setValues(nuevasFilas);
    hojaDestino.getRange(ultimaFilaDestino + 1, 5, nuevasFilas.length, 1).setBackground(TRADING_CONFIG.pendingColor);
  }

  actualizarPuertoDestinoHojaUnica_(hojaDestino, datosBd, encabezadosBd);
  actualizarValidacionProveedoresEnHojaUnica_(hojaDestino, hojaProveedores);

  return {
    nuevasFilas: nuevasFilas.length
  };
}

function onEdit(e) {
  if (!e) return;
  var rango = e.range;
  var hoja = rango.getSheet();
  var nombreHoja = normalizarNombreHoja_(hoja.getName());

  if (
    nombreHoja === normalizarNombreHoja_(TRADING_CONFIG.sheets.unica) &&
    (rango.getColumn() === 5 || rango.getColumn() === 6 || rango.getColumn() === 7) &&
    rango.getRow() > 1
  ) {
    actualizarColoresTablaSeguimientoCompleta();
    return;
  }

  if (
    nombreHoja === normalizarNombreHoja_(TRADING_CONFIG.sheets.proveedores) &&
    rango.getRow() > 1 &&
    rango.getColumn() <= 4
  ) {
    prepararHojaProveedores();
    actualizarColoresTablaSeguimientoCompleta();
  }
}
