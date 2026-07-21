/**
 * Catalogo de proveedores, validaciones y colores
 * Proyecto: Seguimiento Trading
 */

function prepararHojaProveedores() {
  var libro = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = obtenerHojaFlexible_(libro, TRADING_CONFIG.sheets.proveedores);
  if (!hoja) hoja = libro.insertSheet(TRADING_CONFIG.sheets.proveedores);

  var headers = TRADING_CONFIG.providerHeaders;
  var existingHeaders = hoja.getRange(1, 1, 1, headers.length).getValues()[0];
  var necesitaHeaders = false;
  for (var i = 0; i < headers.length; i++) {
    if (String(existingHeaders[i] || "").trim() !== headers[i]) {
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
  actualizarValidacionHojaProveedores_(hoja);
  colorearCatalogoProveedores_(hoja);

  return hoja;
}

function obtenerDatosPanelProveedores() {
  var hoja = prepararHojaProveedores();
  var proveedores = obtenerListaProveedores_(hoja);
  return {
    proveedores: proveedores,
    colores: obtenerColoresParaPanel_()
  };
}

function guardarProveedorDesdePanel(datos) {
  datos = datos || {};
  return agregarOActualizarProveedor(
    datos.nombre,
    datos.color,
    datos.estado || "Activo",
    datos.nota || ""
  );
}

function agregarOActualizarProveedor(nombre, color, estado, nota) {
  nombre = String(nombre || "").trim();
  estado = String(estado || "Activo").trim() || "Activo";
  nota = String(nota || "").trim();

  if (!nombre) {
    throw new Error("Debes indicar el nombre del proveedor.");
  }

  var colorNormalizado = normalizarColorEntrada_(color || "gris");
  if (!colorNormalizado) {
    throw new Error("Color invalido. Usa un color del catalogo o un HEX como #88CCFF.");
  }

  var libro = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = prepararHojaProveedores();
  var lastRow = Math.max(hoja.getLastRow(), 1);
  var datos = lastRow >= 2 ? hoja.getRange(2, 1, lastRow - 1, 4).getValues() : [];
  var filaDestino = null;
  var claveNueva = normalizarProveedorClave_(nombre);

  for (var i = 0; i < datos.length; i++) {
    if (normalizarProveedorClave_(datos[i][0]) === claveNueva) {
      filaDestino = i + 2;
      break;
    }
  }

  if (!filaDestino) {
    filaDestino = lastRow + 1;
  }

  hoja.getRange(filaDestino, 1, 1, 4).setValues([[nombre, colorNormalizado.valor, estado, nota]]);
  hoja.getRange(filaDestino, 2)
    .setBackground(colorNormalizado.hex)
    .setFontColor(colorTextoLegible_(colorNormalizado.hex));
  hoja.getRange(filaDestino, 3).setBackground(normalizarTexto(estado) === "inactivo" ? "#f4cccc" : "#d9ead3");

  actualizarValidacionHojaProveedores_(hoja);

  var hojaUnica = obtenerHojaFlexible_(libro, TRADING_CONFIG.sheets.unica);
  if (hojaUnica) actualizarValidacionProveedoresEnHojaUnica_(hojaUnica, hoja);

  return {
    ok: true,
    mensaje: "Proveedor guardado: " + nombre + " (" + colorNormalizado.valor + ")",
    proveedores: obtenerListaProveedores_(hoja)
  };
}

function actualizarValidacionHojaProveedores_(hoja) {
  var maxRows = Math.max(hoja.getMaxRows(), 200);
  if (hoja.getMaxRows() < maxRows) {
    hoja.insertRowsAfter(hoja.getMaxRows(), maxRows - hoja.getMaxRows());
  }

  var colores = obtenerColoresParaPanel_().map(function(item) { return item.nombre; });
  var reglaColores = SpreadsheetApp.newDataValidation()
    .requireValueInList(colores, true)
    .setAllowInvalid(true)
    .build();

  var reglaEstado = SpreadsheetApp.newDataValidation()
    .requireValueInList(["Activo", "Inactivo"], true)
    .setAllowInvalid(false)
    .build();

  hoja.getRange(2, 2, maxRows - 1, 1).setDataValidation(reglaColores);
  hoja.getRange(2, 3, maxRows - 1, 1).setDataValidation(reglaEstado);
  hoja.getRange(1, 2).setNote("Puedes elegir un color del desplegable o escribir un HEX como #88CCFF.");
}

function obtenerMapaColoresProveedores_(hojaProveedores) {
  var lastRow = Math.max(hojaProveedores.getLastRow(), 1);
  var mapa = {};
  if (lastRow < 2) return mapa;

  var datosProv = hojaProveedores.getRange(2, 1, lastRow - 1, 4).getValues();
  var fondosColor = hojaProveedores.getRange(2, 2, lastRow - 1, 1).getBackgrounds();

  for (var i = 0; i < datosProv.length; i++) {
    var nombreProv = String(datosProv[i][0] || "").trim();
    if (!nombreProv) continue;

    var colorEntrada = String(datosProv[i][1] || "").trim();
    var hex = resolverHexColor_(colorEntrada, fondosColor[i][0]);
    var key = normalizarProveedorClave_(nombreProv);

    mapa[key] = {
      nombre: nombreProv,
      hex: hex,
      rgb: hexToRgb_(hex),
      estado: String(datosProv[i][2] || "").trim(),
      nota: String(datosProv[i][3] || "").trim()
    };
  }

  return mapa;
}

function buscarProveedor_(mapa, nombre) {
  var key = normalizarProveedorClave_(nombre);
  return key ? mapa[key] : null;
}

function obtenerListaProveedores_(hoja) {
  var lastRow = Math.max(hoja.getLastRow(), 1);
  if (lastRow < 2) return [];

  var datos = hoja.getRange(2, 1, lastRow - 1, 4).getValues();
  var fondos = hoja.getRange(2, 2, lastRow - 1, 1).getBackgrounds();
  var lista = [];

  for (var i = 0; i < datos.length; i++) {
    var nombre = String(datos[i][0] || "").trim();
    if (!nombre) continue;
    var hex = resolverHexColor_(datos[i][1], fondos[i][0]);
    lista.push({
      fila: i + 2,
      nombre: nombre,
      color: String(datos[i][1] || "").trim(),
      hex: hex,
      estado: String(datos[i][2] || "Activo").trim(),
      nota: String(datos[i][3] || "").trim()
    });
  }

  return lista;
}

function colorearCatalogoProveedores_(hoja) {
  var lastRow = Math.max(hoja.getLastRow(), 1);
  if (lastRow < 2) return;

  var valores = hoja.getRange(2, 2, lastRow - 1, 1).getValues();
  var fondos = [];
  var tintas = [];
  for (var i = 0; i < valores.length; i++) {
    var hex = resolverHexColor_(valores[i][0], TRADING_CONFIG.defaultProviderColor);
    fondos.push([hex]);
    tintas.push([colorTextoLegible_(hex)]);
  }
  hoja.getRange(2, 2, fondos.length, 1).setBackgrounds(fondos).setFontColors(tintas);
}

function obtenerColoresParaPanel_() {
  var catalogo = obtenerCatalogoColores_();
  var salida = [];
  for (var nombre in catalogo) {
    salida.push({ nombre: nombre, hex: catalogo[nombre] });
  }
  return salida;
}

/**
 * Catalogo categorico validado: la separacion minima entre cualquier par de
 * colores es ~12.6 dE (OKLab x100); la paleta pastel anterior tenia pares
 * practicamente identicos (2.9 dE entre Morado y Azul). Los tonos oscuros
 * requieren texto blanco: usar colorTextoLegible_() al pintar celdas.
 */
function obtenerCatalogoColores_() {
  return {
    "Verde": "#2e9e5b",
    "Azul": "#1f4fa8",
    "Naranjo": "#f28c28",
    "Morado": "#a678e8",
    "Amarillo": "#f6d33f",
    "Rojo": "#e04b40",
    "Gris": "#9aa39c",
    "Cafe": "#9a5f1e",
    "Rosado": "#f9b8cd",
    "Celeste": "#2ba3d4",
    "Fucsia": "#e357c2",
    "RojoFuerte": "#8f1d15"
  };
}

function normalizarColorEntrada_(valor) {
  var texto = String(valor || "").trim();
  if (!texto) return null;

  if (esHexColor_(texto)) {
    return { valor: texto.toUpperCase(), hex: texto.toUpperCase() };
  }

  var catalogo = obtenerCatalogoColores_();
  var keyEntrada = normalizarTexto(texto).replace(/\s+/g, "");
  for (var nombre in catalogo) {
    var keyCatalogo = normalizarTexto(nombre).replace(/\s+/g, "");
    if (keyEntrada === keyCatalogo) {
      return { valor: nombre, hex: catalogo[nombre] };
    }
  }

  return null;
}

function resolverHexColor_(valorColor, colorFondo) {
  var normalizado = normalizarColorEntrada_(valorColor);
  if (normalizado) return normalizado.hex;

  if (esHexColor_(colorFondo) && String(colorFondo).toLowerCase() !== "#ffffff") {
    return String(colorFondo).toUpperCase();
  }

  return TRADING_CONFIG.defaultProviderColor;
}
