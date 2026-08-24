/**
 * Lógica del registro: buscar el código en BD_Maderas, validar lo que llega
 * del formulario y escribir en la hoja de la clase (PT/PCP/PP) + Registro.
 *
 * Todo lo que el formulario manda se vuelve a validar aquí: el navegador
 * ayuda, pero no decide.
 */

/* ------------------------------------------------------------------ hojas */

function ss_() {
  return SpreadsheetApp.openById(CFG.SPREADSHEET_ID);
}

function hoja_(nombre) {
  var hoja = ss_().getSheetByName(nombre);
  if (!hoja) throw new Error('Falta la hoja "' + nombre + '" en el spreadsheet.');
  return hoja;
}

/** La hoja Registro se crea sola si no existe: es la bitácora del formulario. */
function hojaRegistro_() {
  var libro = ss_();
  var hoja = libro.getSheetByName(CFG.HOJA_REGISTRO);
  if (!hoja) hoja = libro.insertSheet(CFG.HOJA_REGISTRO);
  return hoja;
}

/** Encabezados de una hoja de clase: están en la fila 2, no en la 1. */
function encabezadosDestino_(hoja) {
  var ancho = Math.max(hoja.getLastColumn(), 1);
  return hoja.getRange(CFG.FILA_ENCABEZADOS, 1, 1, ancho).getValues()[0];
}

/** { encabezado normalizado -> número de columna } de una hoja de clase. */
function indicePorEncabezado_(hoja) {
  var indices = {};
  encabezadosDestino_(hoja).forEach(function (titulo, i) {
    var clave = normalizar_(titulo);
    if (clave && !indices[clave]) indices[clave] = i + 1;
  });
  return indices;
}

/* --------------------------------------------------------------- identidad */

function usuario_() {
  try {
    return String(Session.getActiveUser().getEmail() || '').trim();
  } catch (err) {
    return '';
  }
}

function puedeAcceder_(correo) {
  if (!ACCESOS.length) return true;
  var buscado = normalizar_(correo);
  if (!buscado) return false;
  for (var i = 0; i < ACCESOS.length; i++) {
    if (normalizar_(ACCESOS[i]) === buscado) return true;
  }
  return false;
}

/* ----------------------------------------------------------------- código */

function normalizarCodigo_(codigo) {
  return String(codigo == null ? '' : codigo).trim().toUpperCase();
}

/** Devuelve el problema de largo, o '' si el código mide lo que debe. */
function problemaDeLargo_(codigo) {
  if (!codigo) return 'Escribe el código del material.';
  if (!CODIGO.LARGO) return '';
  var faltan = CODIGO.LARGO - codigo.length;
  if (faltan > 0) {
    return 'El código debe tener ' + CODIGO.LARGO + ' caracteres: te ' +
      (faltan === 1 ? 'falta 1' : 'faltan ' + faltan) + '.';
  }
  if (faltan < 0) {
    var sobran = -faltan;
    return 'El código debe tener ' + CODIGO.LARGO + ' caracteres: te ' +
      (sobran === 1 ? 'sobra 1' : 'sobran ' + sobran) + '.';
  }
  return '';
}

/**
 * Espesor, ancho y largo escritos dentro de un texto (032X180X3960).
 * Devuelve null si no hay ninguna medida reconocible.
 */
function dimensiones_(texto) {
  var s = String(texto == null ? '' : texto).toUpperCase();
  var m, ultimo = null;

  var tres = /(\d{2,4})\s*X\s*(\d{2,4})\s*X\s*(\d{3,5})/g;
  while ((m = tres.exec(s)) !== null) ultimo = m;
  if (ultimo) {
    return { espesor: Number(ultimo[1]), ancho: Number(ultimo[2]), largo: Number(ultimo[3]) };
  }

  var dos = /(\d{2,4})\s*X\s*(\d{2,4})/g;
  while ((m = dos.exec(s)) !== null) ultimo = m;
  if (ultimo) {
    return { espesor: Number(ultimo[1]), ancho: Number(ultimo[2]), largo: '' };
  }
  return null;
}

/**
 * La descripción de BD manda sobre el código: en códigos como
 * C23H001X006X0013 los números NO son la medida, y la descripción sí la trae.
 */
function dimensionesDe_(descripcion, codigo) {
  var deTexto = dimensiones_(descripcion);
  if (deTexto && deTexto.largo !== '') return deTexto;
  var deCodigo = dimensiones_(codigo);
  if (deCodigo && deCodigo.largo !== '') return deCodigo;
  return deTexto || deCodigo || { espesor: '', ancho: '', largo: '' };
}

/**
 * Busca el código en la columna Material de BD_Maderas.
 *
 * Son ~42.000 filas: se usa createTextFinder (busca en el servidor, sin traer
 * la planilla completa) y se recuerda el resultado un rato en caché.
 */
function buscarEnBD_(codigo) {
  var cache = cache_();
  var llave = 'bd:' + codigo;
  if (cache) {
    var guardado = cache.get(llave);
    if (guardado) {
      var previo = JSON.parse(guardado);
      return previo.vacio ? null : previo;
    }
  }

  var ficha = leerDeBD_(codigo);
  if (cache) {
    cache.put(llave, JSON.stringify(ficha || { vacio: true }), CFG.SEGUNDOS_CACHE);
  }
  return ficha;
}

function leerDeBD_(codigo) {
  var hoja = hoja_(CFG.HOJA_BD);
  var ultima = hoja.getLastRow();
  if (ultima < 2) return null;

  var rango = hoja.getRange(2, BD.MATERIAL, ultima - 1, 1);
  var celda = rango.createTextFinder(codigo).matchEntireCell(true).findNext();
  if (!celda) celda = buscarConEspacios_(rango, codigo);
  if (!celda) return null;

  var fila = celda.getRow();
  var valores = hoja.getRange(fila, 1, 1, BD.COLUMNAS).getValues()[0];
  var descripcion = String(valores[BD.DESCRIPCION - 1] || '').trim();
  var material = String(valores[BD.MATERIAL - 1] || '').trim();
  var medidas = dimensionesDe_(descripcion, material);

  return {
    fila: fila,
    codigo: material,
    grupo: String(valores[BD.GRUPO - 1] || '').trim(),
    tipoMaterial: String(valores[BD.TIPO_MATERIAL - 1] || '').trim(),
    descripcion: descripcion,
    ce: String(valores[BD.CE - 1] || '').trim(),
    espesor: medidas.espesor,
    ancho: medidas.ancho,
    largo: medidas.largo
  };
}

/**
 * Rescate para los códigos que en la base traen espacios pegados: hay varios
 * con un espacio duro al final (RSFR037X130X3600 + \u00a0), y la búsqueda de
 * celda exacta no los ve. Se busca por contenido y se confirma que, sin
 * espacios, sea exactamente el mismo código.
 */
function buscarConEspacios_(rango, codigo) {
  var finder = rango.createTextFinder(codigo).matchEntireCell(false);
  var primera = 0;
  for (var i = 0; i < 20; i++) {
    var celda = finder.findNext();
    if (!celda) return null;
    var fila = celda.getRow();
    if (primera && fila === primera) return null;  // dio la vuelta entera
    if (!primera) primera = fila;
    if (normalizarCodigo_(celda.getValue()) === codigo) return celda;
  }
  return null;
}

function cache_() {
  try {
    return CacheService.getScriptCache();
  } catch (err) {
    return null;
  }
}

/* -------------------------------------------------------------- validación */

/** Deja la solicitud lista para escribir, o lanza el error que corresponda. */
function validar_(datos) {
  datos = datos || {};

  var correo = usuario_();
  if (AUDITORIA.EXIGIR_IDENTIDAD && !correo) {
    throw new Error('No se pudo identificar tu cuenta, así que la solicitud quedaría sin ' +
      'solicitante. Entra con tu correo corporativo y vuelve a intentarlo.');
  }
  if (!puedeAcceder_(correo)) {
    throw new Error('Tu cuenta no está autorizada para registrar solicitudes.');
  }

  var clase = clasePorId_(datos.clase);
  var origen = origenPorId_(datos.origen);
  var centro = centroEfectivo_(origen, datos.centro);
  var tipoMaterial = tipoMaterialEfectivo_(datos.tipoMaterial);

  var codigo = normalizarCodigo_(datos.codigo);
  var problema = problemaDeLargo_(codigo);
  if (problema) throw new Error(problema);

  var ficha = buscarEnBD_(codigo);
  if (!ficha && CODIGO.EXIGIR_EN_BD) {
    throw new Error('El código ' + codigo + ' no está en la hoja ' + CFG.HOJA_BD + '.');
  }
  if (ficha && CODIGO.EXIGIR_TIPO_MATERIAL && ficha.tipoMaterial &&
      normalizar_(ficha.tipoMaterial) !== normalizar_(tipoMaterial)) {
    throw new Error('El código ' + codigo + ' es ' + ficha.tipoMaterial + ' en ' + CFG.HOJA_BD +
      ', pero elegiste ' + tipoMaterial + '.');
  }

  var piezas = Number(datos.piezas);
  if (!isFinite(piezas) || piezas <= 0 || Math.floor(piezas) !== piezas) {
    throw new Error('La cantidad de piezas debe ser un número entero mayor que cero.');
  }

  var medidas = ficha
    ? { espesor: ficha.espesor, ancho: ficha.ancho, largo: ficha.largo }
    : dimensionesDe_('', codigo);

  return {
    clase: clase.id,
    claseTitulo: clase.titulo,
    hojaDestino: clase.hoja,
    origen: origen.id,
    centro: centro,
    tipoMaterial: tipoMaterial,
    codigo: ficha ? ficha.codigo : codigo,
    descripcion: ficha ? ficha.descripcion : '',
    grupo: ficha ? ficha.grupo : '',
    ce: ficha ? ficha.ce : '',
    piezas: piezas,
    espesor: medidas.espesor,
    ancho: medidas.ancho,
    largo: medidas.largo,
    pais: POR_DEFECTO.PAIS,
    tipoRequerimiento: POR_DEFECTO.TIPO_REQUERIMIENTO,
    umb: POR_DEFECTO.UMB,
    fecha: new Date(),
    solicitante: correo
  };
}

/* --------------------------------------------------------------- escritura */

/** Los datos que MAPEO_DESTINO puede pedir por nombre. */
function datosParaHoja_(v) {
  return {
    pais: v.pais,
    centro: v.centro,
    clase: v.clase,
    tipoRequerimiento: v.tipoRequerimiento,
    fecha: v.fecha,
    solicitante: v.solicitante,
    origen: v.origen,
    tipoMaterial: v.tipoMaterial,
    codigo: v.codigo,
    descripcion: v.descripcion,
    grupo: v.grupo,
    piezas: v.piezas,
    umb: v.umb,
    espesor: v.espesor,
    ancho: v.ancho,
    largo: v.largo
  };
}

/**
 * Escribe solo las columnas mapeadas, agrupando las contiguas en un rango.
 * Así no se pisa nada de las columnas del desglose que quedan en blanco.
 */
function escribirEnBloques_(hoja, fila, valoresPorColumna) {
  var columnas = Object.keys(valoresPorColumna)
    .map(Number)
    .sort(function (a, b) { return a - b; });

  var i = 0;
  while (i < columnas.length) {
    var j = i;
    while (j + 1 < columnas.length && columnas[j + 1] === columnas[j] + 1) j++;
    var bloque = [];
    for (var c = columnas[i]; c <= columnas[j]; c++) bloque.push(valoresPorColumna[c]);
    hoja.getRange(fila, columnas[i], 1, bloque.length).setValues([bloque]);
    i = j + 1;
  }
}

function guardarEnClase_(v) {
  var hoja = hoja_(v.hojaDestino);
  var indices = indicePorEncabezado_(hoja);
  var datos = datosParaHoja_(v);

  var valores = {};
  Object.keys(MAPEO_DESTINO).forEach(function (encabezado) {
    var col = indices[normalizar_(encabezado)];
    if (!col) return;  // la hoja no tiene esa columna: se ignora sin romper
    var dato = datos[MAPEO_DESTINO[encabezado]];
    valores[col] = (dato === undefined || dato === null) ? '' : dato;
  });

  if (!Object.keys(valores).length) {
    throw new Error('La hoja ' + hoja.getName() + ' no tiene ninguna de las columnas de ' +
      'MAPEO_DESTINO en la fila ' + CFG.FILA_ENCABEZADOS + '.');
  }

  var fila = Math.max(hoja.getLastRow() + 1, CFG.PRIMERA_FILA_DATOS);
  escribirEnBloques_(hoja, fila, valores);

  var colFecha = indices[normalizar_(COL_FECHA_DESTINO)];
  if (colFecha) hoja.getRange(fila, colFecha).setNumberFormat('dd-mm-yyyy hh:mm');

  return { hoja: hoja.getName(), fila: fila };
}

function asegurarEncabezadosRegistro_(hoja) {
  if (hoja.getLastRow() > 0) return;
  hoja.getRange(1, 1, 1, COL_REGISTRO.length)
    .setValues([COL_REGISTRO])
    .setFontWeight('bold')
    .setBackground('#1f3864')
    .setFontColor('#ffffff');
  hoja.setFrozenRows(1);
}

function guardarEnRegistro_(v, destino) {
  var hoja = hojaRegistro_();
  asegurarEncabezadosRegistro_(hoja);
  hoja.appendRow([
    v.fecha, v.solicitante, v.pais, v.clase, v.tipoRequerimiento,
    v.origen, v.centro, v.tipoMaterial, v.codigo, v.descripcion,
    v.grupo, v.piezas, v.umb, v.espesor, v.ancho, v.largo,
    destino.hoja, destino.fila
  ]);
  var fila = hoja.getLastRow();
  hoja.getRange(fila, 1).setNumberFormat('dd-mm-yyyy hh:mm');
  return fila;
}

/* --------------------------------------------------------------------- API */

/** Todo lo que el formulario necesita para dibujarse. */
function apiContexto() {
  var correo = usuario_();
  var faltantes = [];
  var libro = ss_();
  [CFG.HOJA_BD].concat(CLASES.map(function (c) { return c.hoja; })).forEach(function (nombre) {
    if (!libro.getSheetByName(nombre)) faltantes.push(nombre);
  });

  return {
    clases: CLASES.map(function (c) {
      return { id: c.id, hoja: c.hoja, titulo: c.titulo, descripcion: c.descripcion };
    }),
    origenes: ORIGENES.map(function (o) {
      return { id: o.id, titulo: o.titulo, descripcion: o.descripcion, centros: o.centros.slice() };
    }),
    tiposMaterial: TIPOS_MATERIAL.slice(),
    largoCodigo: CODIGO.LARGO,
    exigeCodigoEnBD: CODIGO.EXIGIR_EN_BD,
    porDefecto: POR_DEFECTO,
    hojaBD: CFG.HOJA_BD,
    hojaRegistro: CFG.HOJA_REGISTRO,
    usuario: correo,
    identificado: !!correo,
    exigeIdentidad: AUDITORIA.EXIGIR_IDENTIDAD,
    autorizado: puedeAcceder_(correo),
    hojasFaltantes: faltantes
  };
}

/** Busca el código mientras la persona escribe. Nunca lanza: siempre responde. */
function apiBuscarCodigo(codigo, tipoMaterial) {
  var limpio = normalizarCodigo_(codigo);
  var problema = problemaDeLargo_(limpio);
  if (problema) {
    return { ok: false, encontrado: false, codigo: limpio, mensaje: problema };
  }

  var ficha;
  try {
    ficha = buscarEnBD_(limpio);
  } catch (err) {
    return { ok: false, encontrado: false, codigo: limpio, mensaje: err.message };
  }

  if (!ficha) {
    return {
      ok: !CODIGO.EXIGIR_EN_BD,
      encontrado: false,
      codigo: limpio,
      mensaje: 'El código ' + limpio + ' no está en la hoja ' + CFG.HOJA_BD + '.'
    };
  }

  var aviso = '';
  if (tipoMaterial && ficha.tipoMaterial &&
      normalizar_(ficha.tipoMaterial) !== normalizar_(tipoMaterial)) {
    aviso = 'En ' + CFG.HOJA_BD + ' este código figura como ' + ficha.tipoMaterial +
      ' y elegiste ' + tipoMaterial + '.';
    if (CODIGO.EXIGIR_TIPO_MATERIAL) {
      return { ok: false, encontrado: true, codigo: ficha.codigo, material: ficha, mensaje: aviso };
    }
  }

  return { ok: true, encontrado: true, codigo: ficha.codigo, material: ficha, aviso: aviso };
}

/** Guarda la solicitud en la hoja de la clase y en la hoja Registro. */
function apiGuardar(datos) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(CFG.SEGUNDOS_LOCK * 1000)) {
    throw new Error('Hay otro registro guardándose en este momento. Inténtalo de nuevo.');
  }
  try {
    var v = validar_(datos);
    var destino = guardarEnClase_(v);
    var filaRegistro = guardarEnRegistro_(v, destino);
    SpreadsheetApp.flush();
    return {
      ok: true,
      hoja: destino.hoja,
      fila: destino.fila,
      hojaRegistro: CFG.HOJA_REGISTRO,
      filaRegistro: filaRegistro,
      codigo: v.codigo,
      descripcion: v.descripcion,
      piezas: v.piezas,
      fecha: Utilities.formatDate(v.fecha, Session.getScriptTimeZone(), 'dd-MM-yyyy HH:mm'),
      solicitante: v.solicitante
    };
  } finally {
    lock.releaseLock();
  }
}
