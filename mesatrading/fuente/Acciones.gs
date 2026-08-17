/**
 * Todo lo que escribe en la planilla.
 *
 * Dos reglas que valen para este archivo entero:
 *
 *   - Guardar un pedido escribe UNA fila y nada más. La sincronización pesada
 *     (repintar la tabla de seguimiento) va por su lado, a mano o cada hora.
 *     Antes cada "Guardar" repintaba la planilla completa y tardaba segundos.
 *
 *   - Pintar se hace por lotes. La tabla de seguimiento son ~110 materiales
 *     por ~13 fechas: celda por celda son más de mil llamadas y se acaba el
 *     tiempo de ejecución. Con setBackgrounds/setNotes son dos.
 */

function conBloqueo_(fn) {
  var lock = LockService.getDocumentLock();
  if (!lock.tryLock(MESA.SEGUNDOS_LOCK * 1000)) {
    throw new Error('La planilla está ocupada procesando otro cambio. Intenta de nuevo en unos segundos.');
  }
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

function limpiarCache_() {
  try {
    CacheService.getDocumentCache().remove(MESA.CACHE_CLAVE);
  } catch (e) {
    // Sin caché disponible no pasa nada: se vuelve a leer de la planilla.
  }
}

// ============================================================================
// Guardar un pedido
// ============================================================================

/**
 * Guarda la decisión de la mesa sobre un pedido y, si viene mensaje, lo suma
 * a la bitácora.
 *
 * payload: { fila, docVenta, material, proveedor, estado, fechaProveedor,
 *            mensaje, area }
 */
function guardarPedido(payload) {
  payload = payload || {};

  return conBloqueo_(function () {
    var preparada = prepararMesa_();
    var hoja = preparada.hoja;
    var esq = preparada.esquema;
    var fila = ubicarFila_(hoja, esq, payload);

    if (!fila) throw new Error('No encontré el pedido en la Hoja Unica.');

    var proveedores = leerProveedores_();
    var indiceProv = indiceProveedores_(proveedores);
    var proveedor = textoDe_(payload.proveedor);

    if (proveedor && !buscarProveedor_(indiceProv, proveedor)) {
      throw new Error('El proveedor "' + proveedor + '" no está en la hoja Proveedores. ' +
        'Agrégalo primero desde el panel de proveedores.');
    }

    var actual = hoja.getRange(fila, 1, 1, esq.__total).getValues()[0];
    var docVenta = textoDe_(celda_(actual, esq.docVenta));
    var material = textoDe_(celda_(actual, esq.material));
    var id = clave_(docVenta, material);

    var area = normalizar_(payload.area) === normalizar_(AREAS.COMPRAS) ? AREAS.COMPRAS : AREAS.VENTAS;
    var mensaje = textoDe_(payload.mensaje);
    var usuario = usuarioActual_();
    var ahora = new Date();

    // Estado: el que venga, o el que corresponda por lo que ya hay.
    var estado = textoDe_(payload.estado);
    var interpretada = interpretarFecha_(payload.fechaProveedor);
    if (!estado) {
      estado = resolverEstado_('', proveedor, mensaje, '', !!interpretada.fecha);
    }

    if (esq.proveedor) escribir_(hoja, fila, esq.proveedor, proveedor);
    if (esq.estado) escribir_(hoja, fila, esq.estado, estado);
    if (esq.fechaProv) escribir_(hoja, fila, esq.fechaProv, interpretada.fecha || '');

    // La celda de comentario de la Hoja Unica guarda el último mensaje del
    // área: así la tabla dinámica de siempre sigue mostrando lo mismo de antes.
    if (mensaje) {
      var destino = area === AREAS.COMPRAS ? esq.comentarioC : esq.comentario;
      if (destino) escribir_(hoja, fila, destino, mensaje);
    }

    if (esq.actualizado) {
      escribir_(hoja, fila, esq.actualizado,
        Utilities.formatDate(ahora, zonaHoraria_(), 'dd-MM-yyyy HH:mm') + (usuario ? ' · ' + usuario : ''));
    }

    pintarFilaMesa_(hoja, esq, fila, proveedor, estado, indiceProv);

    if (esq.estado && usuario) {
      hoja.getRange(fila, esq.estado).setNote(
        estado + ' por ' + usuario + ' el ' +
        Utilities.formatDate(ahora, zonaHoraria_(), 'dd-MM-yyyy HH:mm'));
    }

    if (mensaje && id) {
      anotarBitacora_({
        fecha: ahora, id: id, docVenta: docVenta, material: material,
        area: area, autor: usuario, mensaje: mensaje,
        estado: estado, proveedor: proveedor, fechaCompromiso: interpretada.fecha
      });
    }

    limpiarCache_();
    return datosMesa_();
  });
}

/** Escribe respetando el tipo: las fechas van como fecha, no como texto. */
function escribir_(hoja, fila, columna, valor) {
  if (!columna) return;
  hoja.getRange(fila, columna).setValue(valor === null || valor === undefined ? '' : valor);
}

/** Ubica la fila por número y, si no calza, por documento de venta + material. */
function ubicarFila_(hoja, esq, payload) {
  var ultima = hoja.getLastRow();
  var fila = parseInt(payload.fila, 10);
  var buscada = clave_(payload.docVenta, payload.material);

  if (fila >= 2 && fila <= ultima) {
    if (!buscada) return fila;
    var actual = hoja.getRange(fila, 1, 1, esq.__total).getValues()[0];
    if (clave_(celda_(actual, esq.docVenta), celda_(actual, esq.material)) === buscada) return fila;
    // La fila cambió de lugar (alguien ordenó la hoja): se busca por clave.
  }
  if (!buscada || ultima < 2) return 0;

  var datos = hoja.getRange(2, 1, ultima - 1, esq.__total).getValues();
  for (var i = 0; i < datos.length; i++) {
    if (clave_(celda_(datos[i], esq.docVenta), celda_(datos[i], esq.material)) === buscada) return i + 2;
  }
  return 0;
}

function pintarFilaMesa_(hoja, esq, fila, proveedor, estado, indiceProv) {
  var prov = buscarProveedor_(indiceProv, proveedor);
  if (esq.proveedor) {
    hoja.getRange(fila, esq.proveedor).setBackground(prov ? prov.hex : COLOR_SIN_PROVEEDOR);
  }
  if (esq.estado) {
    var color = COLOR_ESTADO[estado] || COLOR_ESTADO[ESTADOS.PENDIENTE];
    hoja.getRange(fila, esq.estado).setBackground(color.fondo).setFontColor(color.texto);
  }
}

function anotarBitacora_(m) {
  var hoja = prepararBitacora_();
  hoja.appendRow([
    m.fecha, m.id, m.docVenta, m.material,
    m.area, m.autor || '(sin identificar)', m.mensaje,
    m.estado || '', m.proveedor || '', m.fechaCompromiso || ''
  ]);
}

/** Agrega un mensaje sin tocar proveedor ni estado. */
function comentarPedido(payload) {
  payload = payload || {};
  if (!textoDe_(payload.mensaje)) throw new Error('Escribe un mensaje antes de enviarlo.');

  return guardarPedido({
    fila: payload.fila,
    docVenta: payload.docVenta,
    material: payload.material,
    proveedor: payload.proveedor,
    estado: payload.estado,
    fechaProveedor: payload.fechaProveedor,
    mensaje: payload.mensaje,
    area: payload.area
  });
}

// ============================================================================
// Proveedores
// ============================================================================

function guardarProveedor(datos) {
  datos = datos || {};
  var nombre = textoDe_(datos.nombre);
  if (!nombre) throw new Error('Indica el nombre del proveedor.');

  var color = colorDesde_(datos.color || 'Gris');
  if (!color) throw new Error('Color no válido. Usa uno de la lista o un HEX como #88CCFF.');

  return conBloqueo_(function () {
    var hoja = prepararProveedores_();
    var ultima = Math.max(hoja.getLastRow(), 1);
    var filas = ultima >= 2 ? hoja.getRange(2, 1, ultima - 1, 1).getValues() : [];
    var destino = 0;
    var buscado = normalizar_(nombre);

    for (var i = 0; i < filas.length; i++) {
      if (normalizar_(filas[i][0]) === buscado) { destino = i + 2; break; }
    }
    if (!destino) destino = ultima + 1;

    hoja.getRange(destino, 1, 1, COL_PROVEEDORES.length).setValues([[
      nombre, color.nombre, textoDe_(datos.estado) || 'Activo', textoDe_(datos.nota)
    ]]);
    pintarCatalogoProveedores_(hoja);

    limpiarCache_();
    return { ok: true, mensaje: 'Proveedor guardado: ' + nombre, proveedores: leerProveedores_() };
  });
}

// ============================================================================
// Traer pedidos nuevos desde Bd
// ============================================================================

/**
 * Baja a la Hoja Unica los pedidos de Bd que todavía no están.
 * No toca los que ya existen: la decisión de la mesa nunca se sobrescribe.
 */
function traerPedidosNuevos() {
  return conBloqueo_(function () {
    var avisos = [];
    var bd = leerBd_(avisos);
    var preparada = prepararMesa_();
    var hoja = preparada.hoja;
    var esq = preparada.esquema;

    var ultima = hoja.getLastRow();
    var existentes = {};
    if (ultima >= 2) {
      var datos = hoja.getRange(2, 1, ultima - 1, esq.__total).getValues();
      for (var i = 0; i < datos.length; i++) {
        var id = clave_(celda_(datos[i], esq.docVenta), celda_(datos[i], esq.material));
        if (id) existentes[id] = true;
      }
    }

    var nuevas = [];
    for (var k in bd) {
      if (!Object.prototype.hasOwnProperty.call(bd, k) || existentes[k]) continue;
      var p = bd[k];
      var fila = new Array(esq.__total);
      for (var c = 0; c < esq.__total; c++) fila[c] = '';

      poner_(fila, esq.origen, p.origen || 'Bd');
      poner_(fila, esq.docVenta, p.docVenta);
      poner_(fila, esq.material, p.material);
      poner_(fila, esq.texto, p.texto);
      poner_(fila, esq.puerto, p.puerto);
      poner_(fila, esq.estado, ESTADOS.PENDIENTE);
      nuevas.push(fila);
    }

    if (nuevas.length) {
      var desde = hoja.getLastRow() + 1;
      hoja.getRange(desde, 1, nuevas.length, esq.__total).setValues(nuevas);
      if (esq.proveedor) {
        hoja.getRange(desde, esq.proveedor, nuevas.length, 1).setBackground(COLOR_SIN_PROVEEDOR);
      }
      if (esq.estado) {
        var c = COLOR_ESTADO[ESTADOS.PENDIENTE];
        hoja.getRange(desde, esq.estado, nuevas.length, 1)
          .setBackground(c.fondo).setFontColor(c.texto);
      }
    }

    limpiarCache_();
    return { ok: true, nuevos: nuevas.length, avisos: avisos };
  });
}

function poner_(fila, columna, valor) {
  if (columna > 0) fila[columna - 1] = valor === null || valor === undefined ? '' : valor;
}

// ============================================================================
// Tabla Seguimiento: pintado por lotes
// ============================================================================

/**
 * Repinta la tabla dinámica de seguimiento: cada celda con volumen queda del
 * color del proveedor asignado y con una nota que dice qué pedido es, en qué
 * estado va y qué se conversó.
 *
 * Estructura esperada (la que ya tiene la planilla):
 *   fila 1: título
 *   fila 2: Material | Texto Comercial | fechas... | Suma total | ... | Proveedores
 *   fila 3 en adelante: datos
 */
function sincronizarSeguimiento() {
  var hoja = hoja_(MESA.HOJA_SEGUIMIENTO, false);
  if (!hoja) return { ok: false, mensaje: 'No existe la hoja "' + MESA.HOJA_SEGUIMIENTO + '".' };

  var ultimaFila = hoja.getLastRow();
  var ultimaCol = hoja.getLastColumn();
  if (ultimaFila < 3 || ultimaCol < 3) {
    return { ok: false, mensaje: 'La tabla de seguimiento no tiene datos todavía.' };
  }

  var datos = hoja.getRange(1, 1, ultimaFila, ultimaCol).getValues();
  var cabecera = datos[1];

  var colSuma = -1;
  for (var c = 0; c < cabecera.length; c++) {
    if (normalizar_(cabecera[c]) === 'suma total') { colSuma = c; break; }
  }
  if (colSuma === -1) colSuma = ultimaCol - 1;

  var colProveedores = -1;
  for (var cp = 0; cp < cabecera.length; cp++) {
    if (normalizar_(cabecera[cp]) === 'proveedores') { colProveedores = cp; break; }
  }

  // Fechas de las columnas, comparadas por clave yyyyMMdd. Es lo que arregla
  // que "5/08/2026" no calzara nunca con el "05-08-2026" de Bd.
  var fechasCol = [];
  for (var f = 2; f < colSuma; f++) {
    fechasCol.push(claveFecha_(interpretarFecha_(cabecera[f]).fecha));
  }

  var mesa = datosMesa_();
  var porMaterial = {};
  for (var i = 0; i < mesa.pedidos.length; i++) {
    var p = mesa.pedidos[i];
    if (!p.material) continue;
    var claveMat = normalizar_(p.material);
    if (!porMaterial[claveMat]) porMaterial[claveMat] = {};

    var claveF = p.ordenEmbarque || 'sin-fecha';
    if (!porMaterial[claveMat][claveF]) porMaterial[claveMat][claveF] = [];
    porMaterial[claveMat][claveF].push(p);
  }

  var provIndice = indiceProveedores_(mesa.proveedores);
  var alto = ultimaFila - 2;
  var ancho = colSuma - 2;
  if (alto < 1 || ancho < 1) return { ok: false, mensaje: 'No hay celdas de fecha que pintar.' };

  var fondos = [];
  var notas = [];
  var pintadas = 0;

  for (var r = 2; r < ultimaFila; r++) {
    var filaFondos = [];
    var filaNotas = [];
    var material = normalizar_(datos[r][0]);
    var delMaterial = porMaterial[material] || {};

    for (var col = 2; col < colSuma; col++) {
      var valor = datos[r][col];
      var lista = delMaterial[fechasCol[col - 2]];
      var vacia = valor === '' || valor === null || numero_(valor) === 0;

      if (vacia || !lista || !lista.length) {
        filaFondos.push(COLOR_NEUTRO);
        filaNotas.push('');
        continue;
      }

      var colores = [];
      var lineas = [];
      for (var n = 0; n < lista.length; n++) {
        var ped = lista[n];
        lineas.push(lineaNota_(ped));
        var prov = buscarProveedor_(provIndice, ped.proveedor);
        if (prov) colores.push(hexARgb_(prov.hex));
      }

      filaFondos.push(colores.length ? mezclarColores_(colores) : COLOR_SIN_PROVEEDOR);
      filaNotas.push(
        (lista.length > 1 ? lista.length + ' pedidos en esta fecha' : 'Pedido') + '\n\n' +
        lineas.join('\n\n'));
      pintadas++;
    }

    fondos.push(filaFondos);
    notas.push(filaNotas);
  }

  // Dos llamadas para toda la tabla, en vez de una por celda.
  var rango = hoja.getRange(3, 3, alto, ancho);
  rango.setBackgrounds(fondos);
  rango.setNotes(notas);

  if (colProveedores !== -1) escribirProveedoresSeguimiento_(hoja, datos, porMaterial, colProveedores, ultimaFila);

  return { ok: true, celdas: pintadas, mensaje: 'Seguimiento actualizado: ' + pintadas + ' celdas con pedido.' };
}

/** Una línea de nota por pedido: proveedor, estado, compromiso y comentarios. */
function lineaNota_(p) {
  var partes = ['Pedido ' + p.docVenta + '  ·  ' + p.estado];
  partes.push(p.proveedor ? 'Proveedor: ' + p.proveedor : 'Proveedor: sin asignar');

  if (p.fechaProveedor) {
    var nota = 'Compromiso proveedor: ' + p.fechaProveedor;
    if (p.fechaProveedorConfianza === 'aproximada') nota += ' (aprox.)';
    if (p.desfase !== null && p.desfase > 0) nota += '  ->  ' + p.desfase + ' días tarde';
    partes.push(nota);
  }
  if (p.porEmbarcarM3) partes.push('Por embarcar: ' + formatearNumero_(p.porEmbarcarM3) + ' m3');
  if (p.comentario) partes.push('Ventas: ' + p.comentario);
  if (p.comentarioCompra) partes.push('Compras: ' + p.comentarioCompra);

  return partes.join('\n');
}

/** Deja en la columna "Proveedores" quién surte cada material. */
function escribirProveedoresSeguimiento_(hoja, datos, porMaterial, colProveedores, ultimaFila) {
  var valores = [];
  for (var r = 2; r < ultimaFila; r++) {
    var delMaterial = porMaterial[normalizar_(datos[r][0])] || {};
    var nombres = {};
    for (var f in delMaterial) {
      if (!Object.prototype.hasOwnProperty.call(delMaterial, f)) continue;
      for (var i = 0; i < delMaterial[f].length; i++) {
        var nombre = delMaterial[f][i].proveedor;
        if (nombre) nombres[nombre] = true;
      }
    }
    valores.push([Object.keys(nombres).join(', ')]);
  }
  if (valores.length) hoja.getRange(3, colProveedores + 1, valores.length, 1).setValues(valores);
}

// ============================================================================
// Historial de volumen
// ============================================================================

/** Anota solo los pedidos cuyo volumen por producir cambió desde la vez pasada. */
function registrarHistorial() {
  return conBloqueo_(function () {
    var mesa = datosMesa_();
    var hoja = prepararHistorial_();
    var previo = estadoHistorial_(hoja);
    var filas = [];
    var ahora = new Date();

    for (var i = 0; i < mesa.pedidos.length; i++) {
      var p = mesa.pedidos[i];
      if (!p.id) continue;

      var actual = Number(p.porProducirM3 || 0);
      var antes = previo[p.id];
      if (antes && Math.abs(antes.ultimo - actual) < 0.000001) continue;

      var inicial = antes ? antes.inicial : actual;
      var anterior = antes ? antes.ultimo : actual;

      filas.push([
        ahora, p.docVenta, p.material, p.texto, p.cliente, p.proveedor, p.estado,
        inicial, actual, inicial - actual, anterior - actual,
        p.comentario, p.comentarioCompra, p.fila, p.id
      ]);
    }

    if (filas.length) {
      hoja.getRange(hoja.getLastRow() + 1, 1, filas.length, COL_HISTORIAL.length).setValues(filas);
    }
    return { ok: true, registrados: filas.length, revisados: mesa.pedidos.length };
  });
}

function estadoHistorial_(hoja) {
  var ultima = hoja.getLastRow();
  var estado = {};
  if (ultima < 2) return estado;

  var datos = hoja.getRange(2, 1, ultima - 1, COL_HISTORIAL.length).getValues();
  for (var i = 0; i < datos.length; i++) {
    var id = textoDe_(datos[i][14]) || clave_(datos[i][1], datos[i][2]);
    if (!id) continue;

    var inicial = numero_(datos[i][7]);
    var actual = numero_(datos[i][8]);
    if (!inicial && actual) inicial = actual;

    if (!estado[id]) estado[id] = { inicial: inicial, ultimo: actual };
    else estado[id].ultimo = actual;
  }
  return estado;
}

// ============================================================================
// Sincronización completa y automatización
// ============================================================================

/** Lo que corre el trigger cada hora y el botón "Sincronizar todo". */
function sincronizarTodo() {
  var nuevos = traerPedidosNuevos();
  var seguimiento = sincronizarSeguimiento();
  var historial = registrarHistorial();
  limpiarCache_();

  return {
    ok: true,
    nuevos: nuevos.nuevos,
    celdas: seguimiento.celdas || 0,
    registrados: historial.registrados,
    mensaje: 'Pedidos nuevos: ' + nuevos.nuevos +
             ' · Celdas de seguimiento: ' + (seguimiento.celdas || 0) +
             ' · Cambios de volumen: ' + historial.registrados
  };
}

function instalarAutomatizacion() {
  var handler = 'sincronizarTodo';
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === handler) ScriptApp.deleteTrigger(triggers[i]);
  }
  ScriptApp.newTrigger(handler).timeBased().everyHours(1).create();
  return { ok: true, mensaje: 'Sincronización automática cada 1 hora.' };
}

/**
 * Deja la planilla lista de una sola vez: hojas, columnas, validaciones,
 * pedidos nuevos y la automatización.
 */
function instalarMesaTrading() {
  prepararProveedores_();
  prepararBitacora_();
  prepararHistorial_();
  prepararMesa_();

  var resultado = sincronizarTodo();
  var trigger = instalarAutomatizacion();

  return {
    ok: true,
    mensaje: 'Mesa instalada.\n' + resultado.mensaje + '\n' + trigger.mensaje
  };
}
