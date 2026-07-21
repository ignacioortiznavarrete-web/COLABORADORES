/**
 * Marcado de colores y comentarios en Tabla Seguimiento
 * Proyecto: Seguimiento Trading
 */

function actualizarColoresTablaSeguimientoCompleta() {
  var libro = SpreadsheetApp.getActiveSpreadsheet();
  var timeZone = libro.getSpreadsheetTimeZone();

  var hojaUnica = obtenerHojaFlexible_(libro, TRADING_CONFIG.sheets.unica);
  var hojaProveedores = prepararHojaProveedores();
  var hojaSeguimiento = libro.getSheetByName(TRADING_CONFIG.sheets.seguimiento);
  var hojaBd = libro.getSheetByName(TRADING_CONFIG.sheets.bd);

  if (!hojaUnica || !hojaProveedores || !hojaSeguimiento || !hojaBd) {
    SpreadsheetApp.getUi().alert("Error: faltan hojas base esenciales.");
    return;
  }

  asegurarHojaUnica_(libro);
  actualizarValidacionProveedoresEnHojaUnica_(hojaUnica, hojaProveedores);

  var provColor = obtenerMapaColoresProveedores_(hojaProveedores);
  var rangoUnica = hojaUnica.getDataRange();
  var datosUnica = rangoUnica.getValues();
  var datosUnicaDisplay = rangoUnica.getDisplayValues();
  var mapaAsignaciones = {};

  for (var j = 1; j < datosUnica.length; j++) {
    var dV = String(datosUnicaDisplay[j][1] || datosUnica[j][1] || "").trim();
    var mT = String(datosUnicaDisplay[j][2] || datosUnica[j][2] || "").trim();
    var pR = String(datosUnicaDisplay[j][4] || datosUnica[j][4] || "").trim();

    // Importante: comentarios / notas se leen con getDisplayValues().
    // Si el usuario escribe una fecha en esas columnas, se respeta el formato visible
    // de la hoja y no se convierte al formato largo de JavaScript.
    var cM = String(datosUnicaDisplay[j][5] || "").trim();
    var cG = String(datosUnicaDisplay[j][6] || "").trim();

    if (dV && mT) {
      mapaAsignaciones[dV + "_" + mT] = {
        proveedor: pR,
        comentario: cM,
        comentarioG: cG,
        filaIndex: j + 1
      };
    }
  }

  for (var claveAsig in mapaAsignaciones) {
    var info = mapaAsignaciones[claveAsig];
    var fIdx = info.filaIndex;
    var esNegociacion = normalizarTexto(info.comentario) === "negociacion";

    hojaUnica.getRange(fIdx, 2).setBackground(esNegociacion ? TRADING_CONFIG.negotiationColor : "#ffffff");
    hojaUnica.getRange(fIdx, 6).setBackground(esNegociacion ? TRADING_CONFIG.negotiationColor : "#ffffff");

    var provInfo = buscarProveedor_(provColor, info.proveedor);
    var hexProv = provInfo ? provInfo.hex : TRADING_CONFIG.pendingColor;
    hojaUnica.getRange(fIdx, 5).setBackground(hexProv).setFontColor(colorTextoLegible_(hexProv));
  }

  var datosBd = hojaBd.getDataRange().getValues();
  if (datosBd.length < 2) return;

  var encabezadosBd = datosBd[0];
  var colBdDoc = encabezadosBd.indexOf("Documento de ventas");
  var colBdMat = encabezadosBd.indexOf("Material");
  var colBdFecha = encabezadosBd.indexOf("Fecha Embarque Comprometida");
  var colOrigen = encabezadosBd.indexOf("Origen");
  var colCantidad = encabezadosBd.indexOf("Ctd.Ped.(m3)");

  if (colBdDoc === -1 || colBdMat === -1 || colBdFecha === -1 || colOrigen === -1 || colCantidad === -1) {
    SpreadsheetApp.getUi().alert("Error: faltan columnas requeridas en Bd para sincronizar seguimiento.");
    return;
  }

  var mapaMaster = {};
  for (var b = 1; b < datosBd.length; b++) {
    var origen = datosBd[b][colOrigen] ? String(datosBd[b][colOrigen]).toLowerCase() : "";
    var cantidad = parseNumeroFlexible_(datosBd[b][colCantidad]);

    if (origen.indexOf("trading") !== -1 && cantidad !== 0) {
      var dVenta = String(datosBd[b][colBdDoc] || "").trim();
      var matri = String(datosBd[b][colBdMat] || "").trim();
      var fCompromiso = datosBd[b][colBdFecha];

      if (dVenta && matri && fCompromiso) {
        var fechaString = normalizarFecha(fCompromiso, timeZone);
        var asigViva = mapaAsignaciones[dVenta + "_" + matri] || {
          proveedor: "",
          comentario: "",
          comentarioG: ""
        };

        var provInfoBd = buscarProveedor_(provColor, asigViva.proveedor);
        if (!mapaMaster[matri]) mapaMaster[matri] = {};
        if (!mapaMaster[matri][fechaString]) mapaMaster[matri][fechaString] = [];

        mapaMaster[matri][fechaString].push({
          docVenta: dVenta,
          proveedor: asigViva.proveedor,
          proveedorCanonico: provInfoBd ? provInfoBd.nombre : asigViva.proveedor,
          comentario: asigViva.comentario,
          comentarioG: asigViva.comentarioG || "",
          tieneProveedor: !!provInfoBd,
          colorRgb: provInfoBd ? provInfoBd.rgb : null
        });
      }
    }
  }

  var lastRowSeguimiento = hojaSeguimiento.getLastRow();
  var lastColSeguimiento = hojaSeguimiento.getLastColumn();
  if (lastRowSeguimiento < 3 || lastColSeguimiento < 3) return;

  var datosSeguimiento = hojaSeguimiento.getRange(1, 1, lastRowSeguimiento, lastColSeguimiento).getValues();
  var colSumaTotal = datosSeguimiento[1].indexOf("Suma total");
  if (colSumaTotal === -1) colSumaTotal = lastColSeguimiento - 1;

  var encabezadosFechas = [];
  for (var c = 2; c < colSumaTotal; c++) {
    encabezadosFechas.push(normalizarFecha(datosSeguimiento[1][c], timeZone));
  }

  if (datosSeguimiento.length > 2 && colSumaTotal > 2) {
    var rangoCeldasDatos = hojaSeguimiento.getRange(3, 3, datosSeguimiento.length - 2, colSumaTotal - 2);
    rangoCeldasDatos.setBackground("#ffffff");
    rangoCeldasDatos.setFontColor("#14231c");
    rangoCeldasDatos.clearComment();
  }

  for (var f = 2; f < datosSeguimiento.length; f++) {
    var matSeguimiento = String(datosSeguimiento[f][0] || "").trim();
    if (!matSeguimiento || !mapaMaster[matSeguimiento]) continue;

    var fechasDelMaterialMaster = mapaMaster[matSeguimiento];

    for (var col = 2; col < colSumaTotal; col++) {
      var fechaColumna = encabezadosFechas[col - 2];
      var valorCelda = datosSeguimiento[f][col];
      var pedidosDeEstaCelda = fechasDelMaterialMaster[fechaColumna];

      if (pedidosDeEstaCelda && pedidosDeEstaCelda.length > 0 && valorCelda !== "" && parseFloat(valorCelda) !== 0) {
        var coloresRgbALicuar = [];
        var lineasComentario = [];
        var contieneNegociacionEnCelda = false;

        for (var o = 0; o < pedidosDeEstaCelda.length; o++) {
          var itemPedido = pedidosDeEstaCelda[o];
          var esNeg = normalizarTexto(itemPedido.comentario) === "negociacion";
          var formatoLinea = "";

          if (esNeg) {
            contieneNegociacionEnCelda = true;
            formatoLinea = "- [EN NEGOCIACION] Pedido: " + itemPedido.docVenta;
            if (itemPedido.proveedorCanonico) formatoLinea += " (Prov: " + itemPedido.proveedorCanonico + ")";
            if (itemPedido.comentario) formatoLinea += " - Mensaje: " + itemPedido.comentario;
            if (itemPedido.comentarioG) formatoLinea += " - Comentarios: " + itemPedido.comentarioG;
          } else if (itemPedido.tieneProveedor) {
            formatoLinea = "- Prov: " + itemPedido.proveedorCanonico + " (Pedido: " + itemPedido.docVenta + ")";
            if (itemPedido.comentario) formatoLinea += " - Nota: " + itemPedido.comentario;
            if (itemPedido.comentarioG) formatoLinea += " - Comentarios: " + itemPedido.comentarioG;
          } else {
            formatoLinea = "- Pedido: " + itemPedido.docVenta + " [Pendiente de asignar]";
            if (itemPedido.comentario) formatoLinea += " - Nota: " + itemPedido.comentario;
            if (itemPedido.comentarioG) formatoLinea += " - Comentarios: " + itemPedido.comentarioG;
          }

          lineasComentario.push(formatoLinea);

          if (esNeg) {
            coloresRgbALicuar.push(hexToRgb_(TRADING_CONFIG.negotiationColor));
          } else if (itemPedido.tieneProveedor && itemPedido.colorRgb) {
            coloresRgbALicuar.push(itemPedido.colorRgb);
          }
        }

        var hexFinalCelda = "#ffffff";
        var tituloSeccionComentario = "";

        if (coloresRgbALicuar.length === 0) {
          tituloSeccionComentario = "Pedidos pendientes de asignacion para esta fecha:\n";
        } else {
          if (contieneNegociacionEnCelda) {
            tituloSeccionComentario = "Pedido en proceso de negociacion:\n";
          } else if (coloresRgbALicuar.length === 1) {
            tituloSeccionComentario = "Asignacion de pedido:\n";
          } else {
            tituloSeccionComentario = "Pedidos multiples / compartidos en esta fecha:\n";
          }
          hexFinalCelda = promedioRgbAHex_(coloresRgbALicuar);
        }

        var textoComentarioCompleto = tituloSeccionComentario + lineasComentario.join("\n");
        var celdaDestinoReal = hojaSeguimiento.getRange(f + 1, col + 1);
        celdaDestinoReal.setBackground(hexFinalCelda);
        celdaDestinoReal.setFontColor(colorTextoLegible_(hexFinalCelda));
        celdaDestinoReal.setComment(textoComentarioCompleto);
      }
    }
  }
}
