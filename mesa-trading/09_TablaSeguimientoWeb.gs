/**
 * API web SOLO LECTURA para construir la matriz de seguimiento directamente desde Bd.
 * Regla principal: SOLO se consideran filas donde la columna Origen contiene "Trading".
 * No depende de la tabla dinamica "Tabla Seguimiento" para calcular los volumenes.
 * Usa Hoja Unica solo como mapa de proveedor/comentarios para conectar con la mesa.
 * No modifica la funcionalidad ni formulas de Tabla Seguimiento en Sheets.
 */

function obtenerDatosTablaSeguimientoWeb() {
  return construirTablaSeguimientoDesdeBdTrading_(false);
}

function sincronizarYObtenerTablaSeguimientoWeb() {
  // Solo reconstruye la vista web desde Bd.
  // No escribe ni modifica Bd, Hoja Unica ni Tabla Seguimiento.
  return construirTablaSeguimientoDesdeBdTrading_(true);
}

function construirTablaSeguimientoDesdeBdTrading_(forzarSync) {
  var libro = SpreadsheetApp.getActiveSpreadsheet();
  var timeZone = libro.getSpreadsheetTimeZone();
  var hojaBd = obtenerHojaFlexible_(libro, TRADING_CONFIG.sheets.bd);
  var hojaUnica = obtenerHojaFlexible_(libro, TRADING_CONFIG.sheets.unica);
  var hojaProveedores = prepararHojaProveedores();

  if (!hojaBd) {
    throw new Error('No existe la hoja Bd configurada como: ' + TRADING_CONFIG.sheets.bd);
  }

  var lastRow = hojaBd.getLastRow();
  var lastCol = hojaBd.getLastColumn();

  if (lastRow < 2 || lastCol < 1) {
    return crearRespuestaTablaBdTradingVacia_(libro, timeZone);
  }

  var rango = hojaBd.getRange(1, 1, lastRow, lastCol);
  var display = rango.getDisplayValues();
  var values = rango.getValues();
  var headersBd = display[0];

  var colOrigen = obtenerIndiceHeader_(headersBd, ['Origen', 'Origen / Tienda', 'Tienda']);
  var colDocVenta = obtenerIndiceHeader_(headersBd, ['Documento de ventas', 'Documento de Venta', 'Pedido', 'Documento']);
  var colMaterial = obtenerIndiceHeader_(headersBd, ['Material', 'Codigo Material', 'Codigo']);
  var colTextoComercial = obtenerIndiceHeader_(headersBd, ['Texto Comercial', 'Descripcion', 'Producto']);
  var colFecha = obtenerIndiceHeader_(headersBd, ['Fecha Embarque Comprometida']);
  var colVolumen = obtenerIndiceHeader_(headersBd, [
    'Vol. Producir (M3)',
    'Vol Producir (M3)',
    'Vol.Producir (M3)',
    'Vol.Producir(M3)',
    'Vol. Producir',
    'Vol.Producir'
  ]);
  var colCliente = obtenerIndiceHeader_(headersBd, ['Nombre Solicitante', 'Cliente', 'Nombre Cliente', 'Solicitante', 'Destinatario', 'Razon Social']);
  var colPuertoDestino = obtenerIndiceHeader_(headersBd, ['Puerto Destino', 'Puerto destino', 'Puerto de destino', 'Puerto Dest.', 'Destino Puerto']);

  if (colOrigen === -1 || colMaterial === -1 || colTextoComercial === -1 || colFecha === -1 || colVolumen === -1) {
    throw new Error('Faltan columnas requeridas en Bd: Origen, Material, Texto Comercial, Fecha Embarque Comprometida y Vol. Producir (M3).');
  }

  var provColor = hojaProveedores ? obtenerMapaColoresProveedores_(hojaProveedores) : {};
  var asignaciones = construirMapaAsignacionesHojaUnicaParaWeb_(hojaUnica);

  var fechas = {};
  var fechaOrdenes = [];
  var filas = {};
  var filaOrden = [];
  var totalGeneral = 0;
  var totalRegistrosBd = 0;

  for (var r = 1; r < values.length; r++) {
    var origen = String(display[r][colOrigen] || values[r][colOrigen] || '').trim();
    if (normalizarTexto(origen).indexOf('trading') === -1) continue;

    var material = String(display[r][colMaterial] || values[r][colMaterial] || '').trim();
    var textoComercial = String(display[r][colTextoComercial] || values[r][colTextoComercial] || '').trim();
    var fechaValor = values[r][colFecha];
    var fechaVisible = String(display[r][colFecha] || '').trim();
    var fechaLabel = normalizarFechaVisibleBdTrading_(fechaVisible, fechaValor, timeZone);
    var fechaOrden = fechaOrdenMesa_(fechaValor) || normalizarFechaOrdenTextoBdTrading_(fechaLabel) || fechaLabel;
    var volumen = parseNumeroFlexible_(display[r][colVolumen] || values[r][colVolumen]);

    if (!material || !textoComercial || !fechaLabel || Math.abs(volumen) < 0.000001) continue;

    var rowKey = material + '|' + textoComercial;
    var fechaKey = String(fechaOrden || fechaLabel);
    var docVenta = colDocVenta === -1 ? '' : String(display[r][colDocVenta] || values[r][colDocVenta] || '').trim();
    var cliente = colCliente === -1 ? '' : String(display[r][colCliente] || values[r][colCliente] || '').trim();
    var puertoDestino = colPuertoDestino === -1 ? '' : String(display[r][colPuertoDestino] || values[r][colPuertoDestino] || '').trim();
    var clavePedido = clavePedido_(docVenta, material);
    var asignacion = asignaciones[clavePedido] || {};
    var proveedor = String(asignacion.proveedor || '').trim();
    var comentarioVentas = String(asignacion.comentarioVentas || '').trim();
    var comentarioCompras = String(asignacion.comentarioCompras || '').trim();
    var proveedorInfo = buscarProveedor_(provColor, proveedor);
    var esNegociacion = normalizarTexto([comentarioVentas, comentarioCompras].join(' ')).indexOf('negociacion') !== -1;
    var colorItem = TRADING_CONFIG.pendingColor;

    if (esNegociacion) {
      colorItem = TRADING_CONFIG.negotiationColor;
    } else if (proveedorInfo && proveedorInfo.hex) {
      colorItem = proveedorInfo.hex;
    }

    if (!fechas[fechaKey]) {
      fechas[fechaKey] = {
        key: fechaKey,
        label: fechaLabel,
        order: fechaOrden,
        total: 0
      };
      fechaOrdenes.push(fechaKey);
    }

    if (!filas[rowKey]) {
      filas[rowKey] = {
        key: rowKey,
        material: material,
        textoComercial: textoComercial,
        cellsMap: {},
        total: 0,
        searchParts: [material, textoComercial]
      };
      filaOrden.push(rowKey);
    }

    var fila = filas[rowKey];
    if (!fila.cellsMap[fechaKey]) {
      fila.cellsMap[fechaKey] = {
        valueNumber: 0,
        colorsRgb: [],
        entries: [],
        searchParts: []
      };
    }

    var celda = fila.cellsMap[fechaKey];
    celda.valueNumber += volumen;
    celda.colorsRgb.push(hexToRgb_(colorItem));
    celda.entries.push({
      docVenta: docVenta,
      cliente: cliente,
      puertoDestino: puertoDestino,
      proveedor: proveedor,
      proveedorCanonico: proveedorInfo ? proveedorInfo.nombre : proveedor,
      volumen: volumen,
      comentarioVentas: comentarioVentas,
      comentarioCompras: comentarioCompras,
      esNegociacion: esNegociacion
    });
    celda.searchParts.push([docVenta, cliente, puertoDestino, proveedor, comentarioVentas, comentarioCompras].join(' '));

    fila.total += volumen;
    fila.searchParts.push([docVenta, cliente, puertoDestino, proveedor, comentarioVentas, comentarioCompras].join(' '));
    fechas[fechaKey].total += volumen;
    totalGeneral += volumen;
    totalRegistrosBd++;
  }

  fechaOrdenes.sort(function(a, b) {
    return String(fechas[a].order || a).localeCompare(String(fechas[b].order || b));
  });

  filaOrden.sort(function(a, b) {
    var fa = filas[a];
    var fb = filas[b];
    return String(fa.material + ' ' + fa.textoComercial).localeCompare(String(fb.material + ' ' + fb.textoComercial));
  });

  var headers = [];
  for (var h = 0; h < fechaOrdenes.length; h++) {
    var fInfo = fechas[fechaOrdenes[h]];
    headers.push({
      index: h + 3,
      key: fInfo.key,
      top: 'Fecha Embarque Comprometida',
      label: fInfo.label,
      bg: '#e7f5ef',
      fg: '#063b2f',
      isTotal: false,
      total: fInfo.total,
      totalTexto: formatNumeroMesa_(fInfo.total)
    });
  }

  headers.push({
    index: headers.length + 3,
    key: '__TOTAL__',
    top: '',
    label: 'Total',
    bg: '#0e3328',
    fg: '#ffffff',
    isTotal: true,
    total: totalGeneral,
    totalTexto: formatNumeroMesa_(totalGeneral)
  });

  var rows = [];
  var celdasConDato = 0;
  var celdasConColor = 0;
  var celdasConComentario = 0;
  var celdasNegociacion = 0;

  for (var fi = 0; fi < filaOrden.length; fi++) {
    var fKey = filaOrden[fi];
    var dataFila = filas[fKey];
    var cells = [];
    var rowHasColoredValue = false;

    for (var hc = 0; hc < headers.length; hc++) {
      var header = headers[hc];
      var cellData = dataFila.cellsMap[header.key];
      var valueText = '';
      var bg = '#ffffff';
      var fg = '#06130f';
      var comment = '';
      var hasValue = false;
      var hasColor = false;

      if (header.isTotal) {
        hasValue = Math.abs(dataFila.total) > 0.000001;
        valueText = hasValue ? formatNumeroMesa_(dataFila.total) : '';
        bg = '#eaf7f1';
        fg = '#063b2f';
        hasColor = false;
      } else if (cellData && Math.abs(cellData.valueNumber) > 0.000001) {
        hasValue = true;
        valueText = formatNumeroMesa_(cellData.valueNumber);
        bg = promedioRgbAHex_(cellData.colorsRgb);
        fg = '#06130f';
        comment = construirNotaCeldaDesdeBdTrading_(cellData.entries);
        hasColor = esColorVisibleSeguimiento_(bg);
        rowHasColoredValue = rowHasColoredValue || hasColor;
        celdasConDato++;
        if (hasColor) celdasConColor++;
        if (comment) celdasConComentario++;
        if (normalizarTexto(comment).indexOf('negociacion') !== -1) celdasNegociacion++;
      }

      cells.push({
        col: header.index,
        key: dataFila.key + '|' + header.key,
        value: valueText,
        valueNumber: header.isTotal ? dataFila.total : (cellData ? cellData.valueNumber : 0),
        bg: bg,
        fg: fg,
        comment: comment,
        entries: cellData && cellData.entries ? normalizarEntradasDetalleOperativo_(cellData.entries) : [],
        hasValue: hasValue,
        hasColor: hasColor,
        isTotal: header.isTotal
      });
    }

    rows.push({
      rowNumber: fi + 1,
      material: dataFila.material,
      textoComercial: dataFila.textoComercial,
      bgMaterial: '#ffffff',
      fgMaterial: '#06130f',
      bgTexto: '#ffffff',
      fgTexto: '#06130f',
      hasValue: Math.abs(dataFila.total) > 0.000001,
      hasColoredValue: rowHasColoredValue,
      isTotalRow: false,
      searchText: normalizarTexto(dataFila.searchParts.join(' ')),
      cells: cells
    });
  }

  if (rows.length > 0) {
    var totalCells = [];
    for (var th = 0; th < headers.length; th++) {
      var hTotal = headers[th];
      var totalValor = hTotal.isTotal ? totalGeneral : hTotal.total;
      totalCells.push({
        col: hTotal.index,
        key: 'TOTAL|' + hTotal.key,
        value: Math.abs(totalValor) > 0.000001 ? formatNumeroMesa_(totalValor) : '',
        bg: '#d8efe6',
        fg: '#063b2f',
        comment: hTotal.isTotal ? 'Total general Bd Trading' : 'Total fecha ' + hTotal.label,
        entries: [],
        hasValue: Math.abs(totalValor) > 0.000001,
        hasColor: false,
        isTotal: true
      });
    }

    rows.push({
      rowNumber: rows.length + 1,
      material: 'm3 total',
      textoComercial: 'Solo Origen Trading',
      bgMaterial: '#0e3328',
      fgMaterial: '#ffffff',
      bgTexto: '#0e3328',
      fgTexto: '#ffffff',
      hasValue: true,
      hasColoredValue: false,
      isTotalRow: true,
      searchText: normalizarTexto('m3 total solo origen trading'),
      cells: totalCells
    });
  }

  return {
    ok: true,
    title: 'Tabla Seguimiento desde Bd',
    spreadsheetName: libro.getName(),
    sheetName: 'Bd · solo Origen Trading',
    updatedAt: Utilities.formatDate(new Date(), timeZone, 'dd-MM-yyyy HH:mm'),
    groupTitle: 'SUM de Vol. Producir (M3)',
    dateGroupTitle: 'Fecha Embarque Comprometida',
    firstColumnTitle: 'Material',
    secondColumnTitle: 'Texto Comercial',
    headers: headers,
    rows: rows,
    source: {
      sheet: hojaBd.getName(),
      filter: 'Origen contiene Trading',
      records: totalRegistrosBd
    },
    kpis: crearKpisTablaSeguimiento_(rows.length, headers.length, celdasConDato, celdasConColor, celdasConComentario, celdasNegociacion, totalGeneral)
  };
}

function construirMapaAsignacionesHojaUnicaParaWeb_(hojaUnica) {
  var mapa = {};
  if (!hojaUnica || hojaUnica.getLastRow() < 2) return mapa;

  var datos = hojaUnica.getDataRange().getValues();
  var headers = datos[0];
  var colDoc = obtenerIndiceHeader_(headers, ['Documento de Venta', 'Documento de ventas', 'Pedido', 'Documento']);
  var colMaterial = obtenerIndiceHeader_(headers, ['Material', 'Codigo Material', 'Codigo']);
  var colProveedor = obtenerIndiceHeader_(headers, ['Proveedor Asignado', 'Proveedor']);
  var colComentarioVentas = obtenerIndiceHeader_(headers, ['Comentarios', 'Comentario Ventas', 'Mensaje ventas']);
  var colComentarioCompras = obtenerIndiceHeader_(headers, ['Comentarios Compra', 'Comentarios Compras', 'Respuesta compras']);

  // Compatibilidad con la estructura historica de Hoja Unica.
  if (colDoc === -1) colDoc = 1;
  if (colMaterial === -1) colMaterial = 2;
  if (colProveedor === -1) colProveedor = 4;
  if (colComentarioVentas === -1) colComentarioVentas = 5;
  if (colComentarioCompras === -1) colComentarioCompras = 6;

  for (var i = 1; i < datos.length; i++) {
    var doc = String(valorFilaPorIndice_(datos[i], colDoc) || '').trim();
    var mat = String(valorFilaPorIndice_(datos[i], colMaterial) || '').trim();
    var key = clavePedido_(doc, mat);
    if (!key) continue;
    mapa[key] = {
      proveedor: String(valorFilaPorIndice_(datos[i], colProveedor) || '').trim(),
      comentarioVentas: String(valorFilaPorIndice_(datos[i], colComentarioVentas) || '').trim(),
      comentarioCompras: String(valorFilaPorIndice_(datos[i], colComentarioCompras) || '').trim()
    };
  }

  return mapa;
}

function construirNotaCeldaDesdeBdTrading_(entries) {
  if (!entries || entries.length === 0) return '';

  var contieneNegociacion = false;
  var contieneProveedor = false;
  var lineas = [];

  for (var i = 0; i < entries.length; i++) {
    var item = entries[i];
    if (item.esNegociacion) contieneNegociacion = true;
    if (item.proveedorCanonico) contieneProveedor = true;

    var linea = '';
    if (item.esNegociacion) {
      linea = '- [EN NEGOCIACION] Pedido: ' + (item.docVenta || '-');
    } else if (item.proveedorCanonico) {
      linea = '- Prov: ' + item.proveedorCanonico + ' · Pedido: ' + (item.docVenta || '-');
    } else {
      linea = '- Pedido: ' + (item.docVenta || '-') + ' [Pendiente de asignar]';
    }

    linea += ' · m3: ' + formatNumeroMesa_(item.volumen || 0);
    if (item.cliente) linea += ' · Cliente: ' + item.cliente;
    if (item.puertoDestino) linea += ' · Puerto: ' + item.puertoDestino;
    if (item.comentarioVentas) linea += ' · Ventas: ' + item.comentarioVentas;
    if (item.comentarioCompras) linea += ' · Compras: ' + item.comentarioCompras;

    lineas.push(linea);
  }

  var titulo = 'Pedidos Bd Trading para esta celda:';
  if (contieneNegociacion) titulo = 'Pedido en proceso de negociacion:';
  else if (entries.length > 1) titulo = 'Pedidos multiples / compartidos:';
  else if (contieneProveedor) titulo = 'Asignacion de pedido:';

  return titulo + '\n' + lineas.join('\n');
}


function normalizarEntradasDetalleOperativo_(entries) {
  var salida = [];
  for (var i = 0; i < entries.length; i++) {
    var item = entries[i] || {};
    var proveedor = String(item.proveedorCanonico || item.proveedor || '').trim();
    var comentarioVentas = String(item.comentarioVentas || '').trim();
    var comentarioCompras = String(item.comentarioCompras || '').trim();
    var nota = [];
    if (comentarioVentas) nota.push('Ventas: ' + comentarioVentas);
    if (comentarioCompras) nota.push('Compras: ' + comentarioCompras);

    salida.push({
      pedido: String(item.docVenta || '').trim(),
      proveedor: proveedor || 'Pendiente de asignar',
      cliente: String(item.cliente || '').trim(),
      m3: formatNumeroMesa_(item.volumen || 0),
      m3Number: Number(item.volumen || 0),
      puerto: String(item.puertoDestino || '').trim(),
      notaVentas: comentarioVentas,
      notaCompras: comentarioCompras,
      nota: nota.join('\n'),
      estado: item.esNegociacion ? 'Negociacion' : (proveedor ? 'Asignado' : 'Pendiente')
    });
  }
  return salida;
}

function normalizarFechaVisibleBdTrading_(fechaVisible, fechaValor, timeZone) {
  var visible = String(fechaVisible || '').trim();
  if (visible && visible.indexOf('GMT') === -1) return visible;
  return normalizarFechaMesa_(fechaValor, timeZone);
}

function normalizarFechaOrdenTextoBdTrading_(texto) {
  texto = String(texto || '').trim();
  var p;
  if (/^\d{2}[-\/]\d{2}[-\/]\d{4}$/.test(texto)) {
    p = texto.replace(/\//g, '-').split('-');
    return p[2] + p[1] + p[0];
  }
  if (/^\d{4}[-\/]\d{2}[-\/]\d{2}$/.test(texto)) {
    p = texto.replace(/\//g, '-').split('-');
    return p[0] + p[1] + p[2];
  }
  return '';
}

function crearRespuestaTablaBdTradingVacia_(libro, timeZone) {
  return {
    ok: true,
    title: 'Tabla Seguimiento desde Bd',
    spreadsheetName: libro.getName(),
    sheetName: 'Bd · solo Origen Trading',
    updatedAt: Utilities.formatDate(new Date(), timeZone, 'dd-MM-yyyy HH:mm'),
    groupTitle: 'SUM de Vol. Producir (M3)',
    dateGroupTitle: 'Fecha Embarque Comprometida',
    firstColumnTitle: 'Material',
    secondColumnTitle: 'Texto Comercial',
    headers: [],
    rows: [],
    source: {
      sheet: 'Bd',
      filter: 'Origen contiene Trading',
      records: 0
    },
    kpis: crearKpisTablaSeguimiento_(0, 0, 0, 0, 0, 0, 0)
  };
}

function crearKpisTablaSeguimiento_(filas, columnas, celdasDato, celdasColor, celdasComentario, celdasNegociacion, sumaM3) {
  return {
    filas: filas || 0,
    columnas: columnas || 0,
    celdasDato: celdasDato || 0,
    celdasColor: celdasColor || 0,
    celdasComentario: celdasComentario || 0,
    celdasNegociacion: celdasNegociacion || 0,
    sumaM3: sumaM3 || 0,
    sumaM3Texto: formatNumeroMesa_(sumaM3 || 0)
  };
}

function esColorVisibleSeguimiento_(hex) {
  var color = String(hex || '').toLowerCase();
  return color && color !== '#ffffff' && color !== '#fff' && color !== '#00000000';
}
