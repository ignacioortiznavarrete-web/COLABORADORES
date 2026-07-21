/**
 * Datos y actualizaciones usados por la mesa web y sidebar
 * Proyecto: Seguimiento Trading
 */

/**
 * Datos de la mesa. El volumen (cantidad) es siempre Vol. Producir (M3).
 * Por defecto se excluyen los pedidos con 0 por producir: no hay nada que
 * comprar. Pasar incluirSinVolumen=true para verlos igual (lo usa el
 * historial, que necesita registrar cuando un pedido llega a 0).
 */
function obtenerDatosMesaTrading(incluirSinVolumen) {
  var libro = SpreadsheetApp.getActiveSpreadsheet();
  var timeZone = libro.getSpreadsheetTimeZone();
  var hojaBd = libro.getSheetByName(TRADING_CONFIG.sheets.bd);
  var hojaProveedores = prepararHojaProveedores();
  var hojaUnica = asegurarHojaUnica_(libro);

  if (!hojaBd || !hojaProveedores || !hojaUnica) {
    throw new Error("Faltan hojas base: Bd, Proveedores u Hoja Unica.");
  }

  actualizarValidacionProveedoresEnHojaUnica_(hojaUnica, hojaProveedores);

  var proveedores = obtenerListaProveedores_(hojaProveedores);
  var provColor = obtenerMapaColoresProveedores_(hojaProveedores);
  var bdMap = construirMapaBdTrading_(hojaBd, timeZone);
  var datosUnica = hojaUnica.getDataRange().getValues();
  var pedidos = [];

  for (var i = 1; i < datosUnica.length; i++) {
    var docVenta = String(datosUnica[i][1] || "").trim();
    var material = String(datosUnica[i][2] || "").trim();
    if (!docVenta && !material) continue;

    var key = clavePedido_(docVenta, material);
    var infoBd = bdMap[key] || {};
    var proveedor = String(datosUnica[i][4] || "").trim();
    var comentarioVentas = String(datosUnica[i][5] || "").trim();
    var comentarioCompras = String(datosUnica[i][6] || "").trim();
    var provInfo = buscarProveedor_(provColor, proveedor);
    var estado = determinarEstadoPedido_(proveedor, comentarioVentas, comentarioCompras);
    var volumenPorProducir = Number(infoBd.cantidad || 0);

    if (!incluirSinVolumen && Math.abs(volumenPorProducir) < 0.000001) continue;

    pedidos.push({
      id: key || String(i + 1),
      rowIndex: i + 1,
      origen: String(datosUnica[i][0] || infoBd.origen || "").trim(),
      docVenta: docVenta,
      material: material,
      textoComercial: String(datosUnica[i][3] || infoBd.textoComercial || "").trim(),
      cliente: String(infoBd.cliente || "").trim(),
      vendedor: String(infoBd.vendedor || "").trim(),
      centro: String(infoBd.centro || "").trim(),
      puertoDestino: String(datosUnica[i][7] || infoBd.puertoDestino || "").trim(),
      cantidad: infoBd.cantidad || 0,
      cantidadTexto: formatNumeroMesa_(infoBd.cantidad || 0),
      fechaCompromiso: infoBd.fechaCompromiso || "",
      fechaOrden: infoBd.fechaOrden || "",
      proveedor: proveedor,
      proveedorColor: provInfo ? provInfo.hex : TRADING_CONFIG.pendingColor,
      proveedorEstado: provInfo ? provInfo.estado : "",
      proveedorNota: provInfo ? provInfo.nota : "",
      comentarioVentas: comentarioVentas,
      comentarioCompras: comentarioCompras,
      estado: estado,
      estadoClave: normalizarTexto(estado).replace(/\s+/g, "-"),
      actualizado: Utilities.formatDate(new Date(), timeZone, "dd-MM-yyyy HH:mm")
    });
  }

  return {
    titulo: "Mesa Trading Madera",
    spreadsheetName: libro.getName(),
    timezone: timeZone,
    updatedAt: Utilities.formatDate(new Date(), timeZone, "dd-MM-yyyy HH:mm"),
    proveedores: proveedores,
    pedidos: pedidos,
    kpis: calcularKpisMesa_(pedidos)
  };
}

/**
 * Sincronizacion completa lanzada desde la mesa web:
 * consolida pedidos nuevos desde Bd, actualiza colores/comentarios,
 * registra historial y devuelve los datos frescos de la mesa.
 */
function sincronizarMesaTradingDesdeWeb() {
  var resultado = sincronizarTradingAutomatico();
  var datos = obtenerDatosMesaTrading();
  datos.sync = {
    nuevasFilas: resultado.nuevasFilas,
    historial: resultado.historial.registrosAgregados
  };
  return datos;
}

function obtenerDatosSidebarTrading() {
  var libro = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = libro.getActiveSheet();
  var rango = libro.getActiveRange();
  var respuesta = obtenerDatosPanelProveedores();
  respuesta.pedido = null;
  respuesta.mensaje = "";

  if (!hoja || !rango || normalizarNombreHoja_(hoja.getName()) !== normalizarNombreHoja_(TRADING_CONFIG.sheets.unica)) {
    respuesta.mensaje = "Selecciona una fila de Hoja Unica para cargar un pedido.";
    return respuesta;
  }

  var fila = rango.getRow();
  if (fila < 2) {
    respuesta.mensaje = "Selecciona una fila de pedido, no el encabezado.";
    return respuesta;
  }

  var datos = obtenerDatosMesaTrading(true);
  respuesta.proveedores = datos.proveedores;
  respuesta.pedido = buscarPedidoPorFila_(datos.pedidos, fila);

  if (!respuesta.pedido) {
    respuesta.mensaje = "La fila seleccionada no tiene pedido cargado.";
  }

  return respuesta;
}

function guardarPedidoSidebarTrading(payload) {
  payload = payload || {};
  if (!payload.rowIndex) {
    var libro = SpreadsheetApp.getActiveSpreadsheet();
    var rango = libro.getActiveRange();
    if (rango) payload.rowIndex = rango.getRow();
  }
  return actualizarPedidoMesaTrading(payload);
}

function actualizarPedidoMesaTrading(payload) {
  payload = payload || {};
  var lock = LockService.getDocumentLock();
  lock.waitLock(10000);

  try {
    var libro = SpreadsheetApp.getActiveSpreadsheet();
    var hojaUnica = asegurarHojaUnica_(libro);
    var hojaProveedores = prepararHojaProveedores();
    var provColor = obtenerMapaColoresProveedores_(hojaProveedores);
    var fila = resolverFilaPedidoMesa_(hojaUnica, payload);

    if (!fila || fila < 2) {
      throw new Error("No pude encontrar el pedido para actualizar.");
    }

    var proveedor = String(payload.proveedor || "").trim();
    var comentarioVentas = String(payload.comentarioVentas || "").trim();
    var comentarioCompras = String(payload.comentarioCompras || "").trim();

    if (proveedor && !buscarProveedor_(provColor, proveedor)) {
      throw new Error("El proveedor no existe en la hoja Proveedores: " + proveedor);
    }

    hojaUnica.getRange(fila, 5, 1, 3).setValues([[
      proveedor,
      comentarioVentas,
      comentarioCompras
    ]]);

    var provInfo = buscarProveedor_(provColor, proveedor);
    var hexProv = provInfo ? provInfo.hex : TRADING_CONFIG.pendingColor;
    hojaUnica.getRange(fila, 5).setBackground(hexProv).setFontColor(colorTextoLegible_(hexProv));
    hojaUnica.getRange(fila, 6).setBackground(normalizarTexto(comentarioVentas) === "negociacion" ? TRADING_CONFIG.negotiationColor : "#ffffff");
    hojaUnica.getRange(fila, 7).setBackground("#ffffff");
    hojaUnica.getRange(fila, 7).setNote("Ultima actualizacion web: " + new Date());

    actualizarColoresTablaSeguimientoCompleta();
    return obtenerDatosMesaTrading();
  } finally {
    lock.releaseLock();
  }
}

function resolverFilaPedidoMesa_(hojaUnica, payload) {
  var fila = parseInt(payload.rowIndex, 10);
  if (fila && fila >= 2 && fila <= hojaUnica.getLastRow()) return fila;

  var docVenta = String(payload.docVenta || "").trim();
  var material = String(payload.material || "").trim();
  if (!docVenta || !material) return null;

  var keyBuscada = clavePedido_(docVenta, material);
  var datos = hojaUnica.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (clavePedido_(datos[i][1], datos[i][2]) === keyBuscada) return i + 1;
  }
  return null;
}

function buscarPedidoPorFila_(pedidos, fila) {
  for (var i = 0; i < pedidos.length; i++) {
    if (Number(pedidos[i].rowIndex) === Number(fila)) return pedidos[i];
  }
  return null;
}

function construirMapaBdTrading_(hojaBd, timeZone) {
  var datos = hojaBd.getDataRange().getValues();
  var mapa = {};
  if (datos.length < 2) return mapa;

  var h = datos[0];
  var colDoc = obtenerIndiceHeader_(h, ["Documento de ventas", "Documento de Venta", "Pedido", "Documento"]);
  var colMat = obtenerIndiceHeader_(h, ["Material", "Codigo Material", "Codigo"]);
  var colTexto = obtenerIndiceHeader_(h, ["Texto Comercial", "Descripcion", "Producto"]);
  var colOrigen = obtenerIndiceHeader_(h, ["Origen", "Origen / Tienda", "Tienda"]);
  var colCantidadPedido = obtenerIndiceHeader_(h, ["Ctd.Ped.(m3)", "Ctd.Ped. (m3)", "m3", "Volumen", "Cantidad"]);
  var colVolumenProducir = obtenerIndiceHeader_(h, [
    "Vol. Producir (M3)",
    "Vol Producir (M3)",
    "Vol.Producir (M3)",
    "Vol.Producir(M3)",
    "Vol. Producir",
    "Vol.Producir",
    "Volumen por producir",
    "Vol. por producir",
    "Por producir (M3)"
  ]);
  var colFecha = obtenerIndiceHeader_(h, ["Fecha Embarque Comprometida", "Fecha Compromiso", "Fecha Embarque", "Fecha"]);
  var colCliente = obtenerIndiceHeader_(h, ["Cliente", "Nombre Cliente", "Solicitante", "Destinatario", "Razon Social"]);
  var colVendedor = obtenerIndiceHeader_(h, ["Vendedor", "Ejecutivo", "Responsable Venta"]);
  var colCentro = obtenerIndiceHeader_(h, ["Centro", "Planta", "Bodega", "Sucursal"]);
  var colPuertoDestino = obtenerIndiceHeader_(h, ["Puerto Destino", "Puerto destino", "Puerto de destino", "Puerto Dest.", "Destino Puerto"]);

  if (colDoc === -1 || colMat === -1) return mapa;

  for (var i = 1; i < datos.length; i++) {
    var origen = String(valorFilaPorIndice_(datos[i], colOrigen) || "").toLowerCase();
    var cantidadPedido = parseNumeroFlexible_(valorFilaPorIndice_(datos[i], colCantidadPedido));
    var volumenPorProducir = colVolumenProducir === -1
      ? cantidadPedido
      : parseNumeroFlexible_(valorFilaPorIndice_(datos[i], colVolumenProducir));
    if (origen.indexOf("trading") === -1 || cantidadPedido === 0) continue;

    var doc = String(valorFilaPorIndice_(datos[i], colDoc) || "").trim();
    var mat = String(valorFilaPorIndice_(datos[i], colMat) || "").trim();
    if (!doc || !mat) continue;

    var key = clavePedido_(doc, mat);
    var fechaValor = valorFilaPorIndice_(datos[i], colFecha);
    var fechaTexto = normalizarFechaMesa_(fechaValor, timeZone);

    if (!mapa[key]) {
      mapa[key] = {
        origen: valorFilaPorIndice_(datos[i], colOrigen),
        textoComercial: valorFilaPorIndice_(datos[i], colTexto),
        cliente: valorFilaPorIndice_(datos[i], colCliente),
        vendedor: valorFilaPorIndice_(datos[i], colVendedor),
        centro: valorFilaPorIndice_(datos[i], colCentro),
        puertoDestino: valorFilaPorIndice_(datos[i], colPuertoDestino),
        cantidad: 0,
        fechaCompromiso: fechaTexto,
        fechaOrden: fechaOrdenMesa_(fechaValor)
      };
    }

    mapa[key].cantidad += volumenPorProducir;

    if (!mapa[key].fechaCompromiso && fechaTexto) {
      mapa[key].fechaCompromiso = fechaTexto;
      mapa[key].fechaOrden = fechaOrdenMesa_(fechaValor);
    }
  }

  return mapa;
}

function calcularKpisMesa_(pedidos) {
  var totalM3 = 0;
  var pendientes = 0;
  var negociacion = 0;
  var asignados = 0;
  var cerrados = 0;
  var proveedores = {};

  for (var i = 0; i < pedidos.length; i++) {
    totalM3 += Number(pedidos[i].cantidad || 0);
    if (pedidos[i].proveedor) proveedores[pedidos[i].proveedor] = true;

    switch (pedidos[i].estado) {
      case "Pendiente":
        pendientes++;
        break;
      case "Negociacion":
        negociacion++;
        break;
      case "Cerrado":
        cerrados++;
        break;
      default:
        asignados++;
        break;
    }
  }

  return {
    totalPedidos: pedidos.length,
    totalM3: totalM3,
    totalM3Texto: formatNumeroMesa_(totalM3),
    pendientes: pendientes,
    negociacion: negociacion,
    asignados: asignados,
    cerrados: cerrados,
    proveedoresUsados: Object.keys(proveedores).length
  };
}

function determinarEstadoPedido_(proveedor, comentarioVentas, comentarioCompras) {
  var combinado = normalizarTexto([comentarioVentas, comentarioCompras].join(" "));
  if (combinado.indexOf("completa") !== -1 || combinado.indexOf("cerrado") !== -1 || combinado.indexOf("cerrada") !== -1) {
    return "Cerrado";
  }
  if (normalizarTexto(comentarioVentas) === "negociacion" || combinado.indexOf("negociacion") !== -1) {
    return "Negociacion";
  }
  if (String(proveedor || "").trim()) {
    return "Asignado";
  }
  return "Pendiente";
}
