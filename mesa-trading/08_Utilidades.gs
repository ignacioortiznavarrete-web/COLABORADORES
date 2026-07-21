/**
 * Funciones auxiliares generales
 * Proyecto: Seguimiento Trading
 */

function obtenerIndiceHeader_(headers, nombres) {
  var normalizados = {};
  for (var i = 0; i < nombres.length; i++) {
    normalizados[normalizarTexto(nombres[i])] = true;
  }

  for (var c = 0; c < headers.length; c++) {
    var header = normalizarTexto(headers[c]);
    if (normalizados[header]) return c;
  }
  return -1;
}

function valorFilaPorIndice_(fila, indice) {
  return indice >= 0 ? fila[indice] : "";
}

function clavePedido_(docVenta, material) {
  var doc = String(docVenta || "").trim();
  var mat = String(material || "").trim();
  return doc && mat ? doc + "_" + mat : "";
}

function normalizarFechaMesa_(valor, timeZone) {
  if (!valor) return "";
  if (valor instanceof Date && !isNaN(valor.getTime())) {
    return Utilities.formatDate(valor, timeZone, "dd-MM-yyyy");
  }
  return normalizarFecha(valor, timeZone);
}

function fechaOrdenMesa_(valor) {
  if (!valor) return "";
  if (valor instanceof Date && !isNaN(valor.getTime())) {
    return Utilities.formatDate(valor, "UTC", "yyyyMMdd");
  }

  var texto = String(valor || "").trim();
  var p;
  if (/^\d{2}-\d{2}-\d{4}$/.test(texto)) {
    p = texto.split("-");
    return p[2] + p[1] + p[0];
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    p = texto.split("-");
    return p[0] + p[1] + p[2];
  }
  return "";
}

function formatNumeroMesa_(valor) {
  var numero = Number(valor || 0);
  return Utilities.formatString("%.2f", numero).replace(".", ",");
}

function normalizarProveedorClave_(valor) {
  return normalizarTexto(valor).replace(/\s+/g, " ");
}

function normalizarNombreHoja_(valor) {
  return normalizarTexto(valor).replace(/\s+/g, " ");
}

function normalizarTexto(texto) {
  if (!texto) return "";
  return String(texto)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function normalizarFecha(val, timeZone) {
  if (!val) return "";
  if (val instanceof Date && !isNaN(val.getTime())) {
    return Utilities.formatDate(val, timeZone, "dd-MM-yyyy");
  }

  var str = String(val).trim();
  if (/^\d{2}-\d{2}-\d{4}$/.test(str)) return str;
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    var p = str.split("-");
    return p[2] + "-" + p[1] + "-" + p[0];
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) return str.replace(/\//g, "-");
  return str;
}

function parseNumeroFlexible_(valor) {
  if (typeof valor === "number") return valor;
  var texto = String(valor || "").trim();
  if (!texto) return 0;
  texto = texto.replace(/\./g, "").replace(",", ".");
  return parseFloat(texto) || 0;
}

function esHexColor_(valor) {
  return /^#[0-9a-fA-F]{6}$/.test(String(valor || "").trim());
}

function hexToRgb_(hex) {
  hex = String(hex || "#ffffff").replace("#", "");
  return [
    parseInt(hex.substring(0, 2), 16),
    parseInt(hex.substring(2, 4), 16),
    parseInt(hex.substring(4, 6), 16)
  ];
}

function rgbToHex(r, g, b) {
  var toHex = function(c) {
    c = Math.max(0, Math.min(255, Math.round(c)));
    var hex = c.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  return "#" + toHex(r) + toHex(g) + toHex(b);
}

/**
 * Texto negro o blanco segun la luminancia del fondo, para que los colores
 * oscuros del catalogo sigan siendo legibles en las celdas de Sheets.
 */
function colorTextoLegible_(hex) {
  var rgb = hexToRgb_(hex);
  var lin = [];
  for (var i = 0; i < 3; i++) {
    var v = rgb[i] / 255;
    lin.push(v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  }
  var luminancia = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
  return luminancia < 0.36 ? "#ffffff" : "#14231c";
}

function promedioRgbAHex_(coloresRgb) {
  var rSum = 0;
  var gSum = 0;
  var bSum = 0;

  for (var i = 0; i < coloresRgb.length; i++) {
    rSum += coloresRgb[i][0];
    gSum += coloresRgb[i][1];
    bSum += coloresRgb[i][2];
  }

  return rgbToHex(
    rSum / coloresRgb.length,
    gSum / coloresRgb.length,
    bSum / coloresRgb.length
  );
}

function obtenerHojaFlexible_(libro, nombreEsperado) {
  var exacta = libro.getSheetByName(nombreEsperado);
  if (exacta) return exacta;

  var clave = normalizarNombreHoja_(nombreEsperado);
  var hojas = libro.getSheets();
  for (var i = 0; i < hojas.length; i++) {
    if (normalizarNombreHoja_(hojas[i].getName()) === clave) return hojas[i];
  }
  return null;
}
