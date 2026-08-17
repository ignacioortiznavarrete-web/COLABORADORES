/**
 * Esquema de las hojas.
 *
 * Todo el acceso a columnas pasa por aquí y siempre por NOMBRE. Es lo que
 * permite que la mesa conviva con una planilla que ya tiene sus encabezados
 * puestos a mano ("PV", "MAterial", "Descripcion Material") y que se le
 * agreguen columnas nuevas sin mover ni pisar ninguna de las existentes.
 */

function libro_() {
  return MESA.SPREADSHEET_ID
    ? SpreadsheetApp.openById(MESA.SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
}

/** Busca la hoja ignorando mayúsculas, acentos y espacios de más. */
function hoja_(nombre, crearSiFalta) {
  var ss = libro_();
  var exacta = ss.getSheetByName(nombre);
  if (exacta) return exacta;

  var buscado = normalizar_(nombre);
  var hojas = ss.getSheets();
  for (var i = 0; i < hojas.length; i++) {
    if (normalizar_(hojas[i].getName()) === buscado) return hojas[i];
  }
  return crearSiFalta ? ss.insertSheet(nombre) : null;
}

function hojaObligatoria_(nombre) {
  var h = hoja_(nombre, false);
  if (!h) throw new Error('Falta la hoja "' + nombre + '" en la planilla.');
  return h;
}

/** Encabezados de la primera fila, ya normalizados para comparar. */
function encabezados_(hoja) {
  var ultimaCol = hoja.getLastColumn();
  if (ultimaCol < 1) return [];
  return hoja.getRange(1, 1, 1, ultimaCol).getValues()[0].map(function (v) { return textoDe_(v); });
}

/**
 * Posición (base 1) de una columna, probando el nombre oficial y sus alias.
 * Devuelve 0 si no está.
 */
function columna_(encabezados, definicion) {
  var candidatos = [definicion.nombre].concat(definicion.alias || []);
  for (var c = 0; c < candidatos.length; c++) {
    var buscado = normalizar_(candidatos[c]);
    for (var i = 0; i < encabezados.length; i++) {
      if (normalizar_(encabezados[i]) === buscado) return i + 1;
    }
  }
  return 0;
}

/**
 * Mapa columna -> posición para la Hoja Unica, agregando al final las que
 * falten y estén marcadas `crear`.
 *
 * Nunca renombra ni reordena: si "Comentarios Compra" no existe se agrega
 * como columna nueva. Es deliberado, porque en la planilla real la columna
 * que ocupaba esa posición se llama "Puerto Destino" y sí contiene puertos.
 */
function esquemaMesa_(hoja) {
  var cabeceras = encabezados_(hoja);
  var mapa = {};
  var porCrear = [];

  for (var id in COL_MESA) {
    if (!Object.prototype.hasOwnProperty.call(COL_MESA, id)) continue;
    var def = COL_MESA[id];
    var pos = columna_(cabeceras, def);

    if (!pos && def.crear) {
      porCrear.push({ id: id, nombre: def.nombre });
      pos = cabeceras.length + porCrear.length;
    }
    mapa[id] = pos;
  }

  if (porCrear.length) {
    var desde = cabeceras.length + 1;
    var fila = porCrear.map(function (c) { return c.nombre; });
    if (hoja.getMaxColumns() < desde + fila.length - 1) {
      hoja.insertColumnsAfter(hoja.getMaxColumns(), desde + fila.length - 1 - hoja.getMaxColumns());
    }
    hoja.getRange(1, desde, 1, fila.length).setValues([fila]);
  }

  mapa.__total = Math.max(hoja.getLastColumn(), cabeceras.length + porCrear.length);
  mapa.__creadas = porCrear.map(function (c) { return c.nombre; });
  return mapa;
}

/** Lee una celda de una fila ya cargada en memoria. `pos` es base 1; 0 = no existe. */
function celda_(fila, pos) {
  return pos > 0 && pos <= fila.length ? fila[pos - 1] : '';
}

// ============================================================================
// Preparación de hojas
// ============================================================================

/** Deja la Hoja Unica con las columnas de la mesa y las validaciones puestas. */
function prepararMesa_() {
  var hoja = hoja_(MESA.HOJA_MESA, true);
  var esquema = esquemaMesa_(hoja);

  hoja.getRange(1, 1, 1, Math.max(esquema.__total, 1))
    .setFontWeight('bold')
    .setBackground(COLOR_ENCABEZADO)
    .setFontColor(COLOR_ENCABEZADO_TEXTO);
  hoja.setFrozenRows(1);

  aplicarValidaciones_(hoja, esquema);
  return { hoja: hoja, esquema: esquema };
}

/** Desplegables de Estado y de Proveedor sobre toda la columna. */
function aplicarValidaciones_(hoja, esquema) {
  var filas = Math.max(hoja.getMaxRows() - 1, 1);
  var hojaProv = prepararProveedores_();

  if (esquema.estado) {
    hoja.getRange(2, esquema.estado, filas, 1).setDataValidation(
      SpreadsheetApp.newDataValidation()
        .requireValueInList(ESTADOS_LISTA, true)
        .setAllowInvalid(true)
        .build());
  }

  if (esquema.proveedor) {
    var filasProv = Math.max(hojaProv.getMaxRows() - 1, 1);
    hoja.getRange(2, esquema.proveedor, filas, 1).setDataValidation(
      SpreadsheetApp.newDataValidation()
        .requireValueInRange(hojaProv.getRange(2, 1, filasProv, 1), true)
        .setAllowInvalid(true)
        .build());
  }

  if (esquema.fechaProv) {
    hoja.getRange(2, esquema.fechaProv, filas, 1).setNumberFormat('dd-mm-yyyy');
  }
}

/** Crea o repara la hoja Proveedores y pinta cada color en su celda. */
function prepararProveedores_() {
  var hoja = hoja_(MESA.HOJA_PROVEEDORES, true);
  var actuales = encabezados_(hoja);
  var falta = false;

  for (var i = 0; i < COL_PROVEEDORES.length; i++) {
    if (normalizar_(actuales[i] || '') !== normalizar_(COL_PROVEEDORES[i])) { falta = true; break; }
  }
  if (falta) hoja.getRange(1, 1, 1, COL_PROVEEDORES.length).setValues([COL_PROVEEDORES]);

  hoja.getRange(1, 1, 1, COL_PROVEEDORES.length)
    .setFontWeight('bold')
    .setBackground(COLOR_ENCABEZADO)
    .setFontColor(COLOR_ENCABEZADO_TEXTO);
  hoja.setFrozenRows(1);

  var filas = Math.max(hoja.getMaxRows() - 1, 1);
  hoja.getRange(2, 2, filas, 1).setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(Object.keys(CATALOGO_COLORES), true)
      .setAllowInvalid(true)
      .build());
  hoja.getRange(2, 3, filas, 1).setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(['Activo', 'Inactivo'], true)
      .setAllowInvalid(false)
      .build());
  hoja.getRange(1, 2).setNote('Elige un color de la lista o escribe un HEX propio, por ejemplo #88CCFF.');

  pintarCatalogoProveedores_(hoja);
  return hoja;
}

/** Pinta la celda de color de cada proveedor con su propio color. */
function pintarCatalogoProveedores_(hoja) {
  var ultima = hoja.getLastRow();
  if (ultima < 2) return;

  var valores = hoja.getRange(2, 2, ultima - 1, 2).getValues();
  var fondosColor = [];
  var fondosEstado = [];

  for (var i = 0; i < valores.length; i++) {
    var color = colorDesde_(valores[i][0]);
    fondosColor.push([color ? color.hex : COLOR_NEUTRO]);
    fondosEstado.push([normalizar_(valores[i][1]) === 'inactivo' ? '#F4CCCC' : '#D9EAD3']);
  }

  hoja.getRange(2, 2, fondosColor.length, 1).setBackgrounds(fondosColor);
  hoja.getRange(2, 3, fondosEstado.length, 1).setBackgrounds(fondosEstado);
}

/** Bitácora: una fila por mensaje, nunca se sobrescribe. */
function prepararBitacora_() {
  return prepararHojaSimple_(MESA.HOJA_BITACORA, COL_BITACORA, function (hoja) {
    hoja.getRange('A:A').setNumberFormat('dd-mm-yyyy hh:mm');
    hoja.getRange('J:J').setNumberFormat('dd-mm-yyyy');
  });
}

function prepararHistorial_() {
  return prepararHojaSimple_(MESA.HOJA_HISTORIAL, COL_HISTORIAL, function (hoja) {
    hoja.getRange('A:A').setNumberFormat('dd-mm-yyyy hh:mm');
    hoja.getRange('H:K').setNumberFormat('#,##0.00');
  });
}

function prepararHojaSimple_(nombre, columnas, formato) {
  var hoja = hoja_(nombre, true);
  var actuales = encabezados_(hoja);
  var falta = false;

  for (var i = 0; i < columnas.length; i++) {
    if (normalizar_(actuales[i] || '') !== normalizar_(columnas[i])) { falta = true; break; }
  }
  if (falta) hoja.getRange(1, 1, 1, columnas.length).setValues([columnas]);

  hoja.getRange(1, 1, 1, columnas.length)
    .setFontWeight('bold')
    .setBackground(COLOR_ENCABEZADO)
    .setFontColor(COLOR_ENCABEZADO_TEXTO);
  hoja.setFrozenRows(1);
  if (formato) formato(hoja);

  return hoja;
}

// ============================================================================
// Proveedores
// ============================================================================

/** Lista de proveedores con su color ya resuelto a HEX. */
function leerProveedores_() {
  var hoja = prepararProveedores_();
  var ultima = hoja.getLastRow();
  if (ultima < 2) return [];

  var datos = hoja.getRange(2, 1, ultima - 1, COL_PROVEEDORES.length).getValues();
  var fondos = hoja.getRange(2, 2, ultima - 1, 1).getBackgrounds();
  var lista = [];

  for (var i = 0; i < datos.length; i++) {
    var nombre = textoDe_(datos[i][0]);
    if (!nombre) continue;

    var color = colorDesde_(datos[i][1]);
    // Si el color no está escrito pero alguien pintó la celda a mano, se respeta.
    var hex = color ? color.hex
      : (esHex_(fondos[i][0]) && String(fondos[i][0]).toUpperCase() !== '#FFFFFF'
          ? String(fondos[i][0]).toUpperCase()
          : COLOR_NEUTRO);

    lista.push({
      fila: i + 2,
      nombre: nombre,
      color: textoDe_(datos[i][1]),
      hex: hex,
      estado: textoDe_(datos[i][2]) || 'Activo',
      nota: textoDe_(datos[i][3])
    });
  }
  return lista;
}

/** Índice por nombre normalizado, para resolver "guivar" -> "Guivar". */
function indiceProveedores_(lista) {
  var mapa = {};
  for (var i = 0; i < lista.length; i++) {
    mapa[normalizar_(lista[i].nombre)] = lista[i];
  }
  return mapa;
}

function buscarProveedor_(indice, nombre) {
  var clave = normalizar_(nombre);
  return clave && indice[clave] ? indice[clave] : null;
}
