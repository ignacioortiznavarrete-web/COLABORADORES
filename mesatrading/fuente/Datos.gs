/**
 * El modelo de la mesa: un pedido por fila, con todo lo que hace falta para
 * decidir en la reunión.
 *
 * De Bd sale la realidad comercial (cuánto se vendió, cuánto falta por
 * embarcar, para cuándo se comprometió con el cliente). De la Hoja Unica sale
 * la decisión de la mesa (a qué proveedor se le compra, en qué estado va y qué
 * fecha prometió). De la Bitacora sale la conversación.
 *
 * El número que manda la reunión es el DESFASE: cuántos días después del
 * embarque comprometido con el cliente promete entregar el proveedor. Si es
 * positivo, ese pedido llega tarde y hay que hacer algo hoy.
 */

/** Columnas de Bd. Los alias cubren las variantes que aparecen en la práctica. */
const COL_BD = {
  docVenta:   ['Documento de ventas', 'Documento de Venta', 'Pedido de venta'],
  posicion:   ['Posición Ped.Venta', 'Posicion Ped.Venta'],
  material:   ['Material'],
  texto:      ['Texto Comercial', 'Texto comercial'],
  origen:     ['Origen'],
  cliente:    ['Nombre Solicitante', 'Cliente', 'Solicitante'],
  destino:    ['Nombre Destinatario de Mercancía', 'Nombre Destinatario de Mercancia', 'Destinatario'],
  puerto:     ['Puerto Destino', 'Puerto destino'],
  pais:       ['País Destino', 'Pais Destino'],
  incoterm:   ['Incoterms2', 'Incoterms'],
  fechaEmb:   ['Fecha Embarque Comprometida', 'Fecha Compromiso', 'Fecha Embarque'],
  fechaVenta: ['Fecha Crea.Ped.Venta', 'Fecha Creacion Pedido'],
  pedido:     ['Ctd.Ped.(m3)', 'Ctd.Ped. (m3)', 'Cantidad'],
  embarcado:  ['Vol. Embarcado (M3)', 'Vol Embarcado (M3)'],
  porEmbarcar:['P.Emb(M3)', 'P.Emb (M3)', 'Por Embarcar (M3)'],
  transito:   ['Vol. Transito (M3)', 'Vol Transito (M3)'],
  porProducir:['Vol. Producir (M3)', 'Vol Producir (M3)', 'Volumen por producir'],
  estadoPos:  ['Estado Pos'],
  subfamilia: ['Desc. SubFamilia', 'Desc SubFamilia'],
  espesor:    ['Espesor (mm)']
};

function indiceBd_(cabeceras) {
  var mapa = {};
  for (var id in COL_BD) {
    if (!Object.prototype.hasOwnProperty.call(COL_BD, id)) continue;
    mapa[id] = columna_(cabeceras, { nombre: COL_BD[id][0], alias: COL_BD[id].slice(1) });
  }
  return mapa;
}

/**
 * Agrupa Bd por pedido (documento de venta + material) sumando los volúmenes
 * de todas sus posiciones.
 */
function leerBd_(avisos) {
  var hoja = hojaObligatoria_(MESA.HOJA_BD);
  var ultima = hoja.getLastRow();
  var mapa = {};
  if (ultima < 2) return mapa;

  var datos = hoja.getRange(1, 1, ultima, hoja.getLastColumn()).getValues();
  var cab = datos[0].map(function (v) { return textoDe_(v); });
  var col = indiceBd_(cab);

  if (!col.docVenta || !col.material) {
    throw new Error('En la hoja "' + MESA.HOJA_BD + '" faltan las columnas ' +
      '"Documento de ventas" y/o "Material".');
  }

  // El filtro por Origen solo se aplica si de verdad hay filas marcadas. En la
  // planilla real la columna viene vacía en la mayoría, y filtrar de más
  // dejaba la mesa vacía sin decir por qué.
  var conOrigen = 0;
  if (col.origen) {
    for (var k = 1; k < datos.length; k++) {
      if (normalizar_(celda_(datos[k], col.origen)).indexOf(MESA.FILTRO_ORIGEN) !== -1) conOrigen++;
    }
  }
  var filtrar = conOrigen > 0;
  if (col.origen && !filtrar) {
    avisos.push({
      tipo: 'origen',
      texto: 'Ninguna fila de Bd dice "' + MESA.FILTRO_ORIGEN + '" en la columna Origen, ' +
             'así que la mesa está mostrando todas las filas de Bd.'
    });
  }

  var descartadas = 0;
  for (var i = 1; i < datos.length; i++) {
    var fila = datos[i];
    var doc = textoDe_(celda_(fila, col.docVenta));
    var mat = textoDe_(celda_(fila, col.material));
    var id = clave_(doc, mat);
    if (!id) continue;

    if (filtrar && normalizar_(celda_(fila, col.origen)).indexOf(MESA.FILTRO_ORIGEN) === -1) {
      descartadas++;
      continue;
    }

    if (!mapa[id]) {
      var fEmb = interpretarFecha_(celda_(fila, col.fechaEmb));
      mapa[id] = {
        docVenta: doc,
        material: mat,
        texto: textoDe_(celda_(fila, col.texto)),
        origen: textoDe_(celda_(fila, col.origen)),
        cliente: textoDe_(celda_(fila, col.cliente)),
        destinatario: textoDe_(celda_(fila, col.destino)),
        puerto: textoDe_(celda_(fila, col.puerto)),
        pais: textoDe_(celda_(fila, col.pais)),
        incoterm: textoDe_(celda_(fila, col.incoterm)),
        estadoPos: textoDe_(celda_(fila, col.estadoPos)),
        subfamilia: textoDe_(celda_(fila, col.subfamilia)),
        espesor: numero_(celda_(fila, col.espesor)),
        fechaEmbarque: fEmb.fecha,
        posiciones: 0,
        pedido: 0, embarcado: 0, porEmbarcar: 0, transito: 0, porProducir: 0
      };
    }

    var p = mapa[id];
    p.posiciones++;
    p.pedido      += numero_(celda_(fila, col.pedido));
    p.embarcado   += numero_(celda_(fila, col.embarcado));
    p.porEmbarcar += numero_(celda_(fila, col.porEmbarcar));
    p.transito    += numero_(celda_(fila, col.transito));
    p.porProducir += numero_(celda_(fila, col.porProducir));

    // De varias posiciones nos quedamos con el embarque más próximo: es el que
    // manda para la urgencia.
    var otra = interpretarFecha_(celda_(fila, col.fechaEmb)).fecha;
    if (otra && (!p.fechaEmbarque || otra < p.fechaEmbarque)) p.fechaEmbarque = otra;
  }

  if (descartadas) {
    avisos.push({
      tipo: 'origen',
      texto: contar_(descartadas, 'fila de Bd quedó fuera', 'filas de Bd quedaron fuera') +
             ' por no ser de ' + MESA.FILTRO_ORIGEN + '.'
    });
  }
  return mapa;
}

/** Último mensaje de cada área y conteo, leído de la Bitacora. */
function leerBitacora_() {
  var hoja = prepararBitacora_();
  var ultima = hoja.getLastRow();
  var mapa = {};
  if (ultima < 2) return mapa;

  var datos = hoja.getRange(2, 1, ultima - 1, COL_BITACORA.length).getValues();
  for (var i = 0; i < datos.length; i++) {
    var id = textoDe_(datos[i][1]) || clave_(datos[i][2], datos[i][3]);
    if (!id) continue;

    if (!mapa[id]) mapa[id] = { mensajes: [], total: 0 };
    mapa[id].mensajes.push({
      fecha: esFecha_(datos[i][0]) ? datos[i][0] : null,
      fechaTexto: esFecha_(datos[i][0])
        ? formatearFecha_(datos[i][0]) + ' ' + Utilities.formatDate(datos[i][0], zonaHoraria_(), 'HH:mm')
        : textoDe_(datos[i][0]),
      area: textoDe_(datos[i][4]) || AREAS.VENTAS,
      autor: textoDe_(datos[i][5]),
      mensaje: textoDe_(datos[i][6]),
      estado: textoDe_(datos[i][7]),
      proveedor: textoDe_(datos[i][8])
    });
    mapa[id].total++;
  }
  return mapa;
}

function zonaHoraria_() {
  return libro_().getSpreadsheetTimeZone() || Session.getScriptTimeZone() || 'America/Santiago';
}

/**
 * Decide el estado del pedido.
 *
 * Si la columna Estado tiene un valor válido, manda ese: es lo que alguien
 * eligió a mano. Si está vacía se deduce de lo que ya hay escrito, que es como
 * funcionaba antes de que existiera la columna.
 */
function resolverEstado_(explicito, proveedor, comentario, comentarioCompra, tieneFechaProv) {
  var puesto = normalizar_(explicito);
  for (var i = 0; i < ESTADOS_LISTA.length; i++) {
    if (normalizar_(ESTADOS_LISTA[i]) === puesto) return ESTADOS_LISTA[i];
  }

  var todo = normalizar_([comentario, comentarioCompra].join(' '));
  if (/\b(completa|completo|cerrado|cerrada|listo|embarcado)\b/.test(todo)) return ESTADOS.CERRADO;
  if (todo.indexOf('negociacion') !== -1) return ESTADOS.NEGOCIACION;
  if (textoDe_(proveedor)) return tieneFechaProv ? ESTADOS.CONFIRMADO : ESTADOS.ASIGNADO;
  return ESTADOS.PENDIENTE;
}

/**
 * Arma la mesa completa. Es la única función que leen la web y el sidebar.
 */
function datosMesa_() {
  var avisos = [];
  var hoy = new Date();
  var tz = zonaHoraria_();

  var preparada = prepararMesa_();
  var hojaMesa = preparada.hoja;
  var esq = preparada.esquema;

  if (esq.__creadas.length) {
    avisos.push({
      tipo: 'columnas',
      texto: 'Se agregaron a la Hoja Unica las columnas: ' + esq.__creadas.join(', ') + '.'
    });
  }

  var bd = leerBd_(avisos);
  var proveedores = leerProveedores_();
  var indiceProv = indiceProveedores_(proveedores);
  var bitacora = leerBitacora_();

  var ultima = hojaMesa.getLastRow();
  var filas = ultima >= 2
    ? hojaMesa.getRange(2, 1, ultima - 1, Math.max(esq.__total, 1)).getValues()
    : [];

  var pedidos = [];
  var vistos = {};
  var interpretadas = 0;
  var sinBd = 0;

  for (var i = 0; i < filas.length; i++) {
    var fila = filas[i];
    var doc = textoDe_(celda_(fila, esq.docVenta));
    var mat = textoDe_(celda_(fila, esq.material));
    if (!doc && !mat) continue;

    var id = clave_(doc, mat);
    var info = bd[id] || {};
    if (!bd[id]) sinBd++;
    if (id) vistos[id] = true;

    var proveedorTexto = textoDe_(celda_(fila, esq.proveedor));
    var prov = buscarProveedor_(indiceProv, proveedorTexto);
    var comentario = textoDe_(celda_(fila, esq.comentario));
    var comentarioCompra = textoDe_(celda_(fila, esq.comentarioC));

    // La fecha que promete el proveedor: primero la columna dedicada; si está
    // vacía, se interpreta el comentario ("20 julio", "FIN AGOSTO"). Así los
    // comentarios que ya estaban escritos se convierten solos.
    var fp = interpretarFecha_(celda_(fila, esq.fechaProv), info.fechaEmbarque);
    var desdeComentario = false;
    if (!fp.fecha && comentario) {
      var alterno = interpretarFecha_(comentario, info.fechaEmbarque);
      if (alterno.fecha) { fp = alterno; desdeComentario = true; interpretadas++; }
    }

    var estado = resolverEstado_(
      celda_(fila, esq.estado), proveedorTexto, comentario, comentarioCompra, !!fp.fecha);

    var diasEmbarque = info.fechaEmbarque ? diasEntre_(hoy, info.fechaEmbarque) : null;
    var urgencia = estado === ESTADOS.CERRADO ? URGENCIAS.HOLGADO : urgenciaPorDias_(diasEmbarque);

    // Desfase: días que el proveedor promete DESPUÉS del embarque comprometido.
    var desfase = (info.fechaEmbarque && fp.fecha) ? diasEntre_(info.fechaEmbarque, fp.fecha) : null;

    var hilo = bitacora[id] || { mensajes: [], total: 0 };
    var pedido = {
      id: id || ('fila-' + (i + 2)),
      fila: i + 2,
      docVenta: doc,
      material: mat,
      texto: textoDe_(celda_(fila, esq.texto)) || info.texto || '',
      origen: textoDe_(celda_(fila, esq.origen)) || info.origen || '',
      cliente: info.cliente || '',
      destinatario: info.destinatario || '',
      puerto: textoDe_(celda_(fila, esq.puerto)) || info.puerto || '',
      pais: info.pais || '',
      incoterm: info.incoterm || '',
      estadoPos: info.estadoPos || '',
      subfamilia: info.subfamilia || '',

      pedidoM3: info.pedido || 0,
      embarcadoM3: info.embarcado || 0,
      porEmbarcarM3: info.porEmbarcar || 0,
      transitoM3: info.transito || 0,
      porProducirM3: info.porProducir || 0,
      posiciones: info.posiciones || 0,
      enBd: !!bd[id],

      fechaEmbarque: info.fechaEmbarque ? formatearFecha_(info.fechaEmbarque) : '',
      ordenEmbarque: info.fechaEmbarque ? claveFecha_(info.fechaEmbarque) : '',
      diasEmbarque: diasEmbarque,
      diasTexto: textoDias_(diasEmbarque),

      proveedor: proveedorTexto,
      proveedorColor: prov ? prov.hex : COLOR_SIN_PROVEEDOR,
      proveedorNota: prov ? prov.nota : '',
      proveedorConocido: !!prov,

      estado: estado,
      estadoClave: normalizar_(estado).replace(/\s+/g, '-'),
      estadoColor: COLOR_ESTADO[estado] || COLOR_ESTADO[ESTADOS.PENDIENTE],

      fechaProveedor: fp.fecha ? formatearFecha_(fp.fecha) : '',
      fechaProveedorTextoOriginal: fp.fecha ? fp.texto : '',
      fechaProveedorConfianza: fp.confianza,
      fechaProveedorDesdeComentario: desdeComentario,
      desfase: desfase,

      comentario: comentario,
      comentarioCompra: comentarioCompra,
      mensajes: hilo.mensajes,
      totalMensajes: hilo.total,

      urgencia: urgencia.clave,
      urgenciaEtiqueta: urgencia.etiqueta
    };

    pedido.alerta = calcularAlerta_(pedido);
    pedidos.push(pedido);
  }

  // Pedidos que están en Bd pero todavía no bajaron a la Hoja Unica.
  var faltantes = 0;
  for (var k in bd) {
    if (Object.prototype.hasOwnProperty.call(bd, k) && !vistos[k]) faltantes++;
  }
  if (faltantes) {
    avisos.push({
      tipo: 'nuevos',
      texto: contar_(faltantes, 'pedido de Bd todavía no está', 'pedidos de Bd todavía no están') +
             ' en la mesa. Usa "Sincronizar" para traerlos.'
    });
  }
  if (sinBd) {
    avisos.push({
      tipo: 'sinbd',
      texto: contar_(sinBd, 'pedido de la Hoja Unica ya no aparece', 'pedidos de la Hoja Unica ya no aparecen') +
             ' en Bd: quedan sin volumen ni fechas.'
    });
  }
  if (interpretadas) {
    avisos.push({
      tipo: 'fechas',
      texto: contar_(interpretadas, 'comentario se leyó', 'comentarios se leyeron') +
             ' como fecha de compromiso del proveedor. Revísalos y guárdalos para dejarlos fijos.'
    });
  }

  ordenarPedidos_(pedidos);

  return {
    titulo: 'Mesa Trading',
    planilla: libro_().getName(),
    zona: tz,
    actualizado: Utilities.formatDate(hoy, tz, 'dd-MM-yyyy HH:mm'),
    usuario: usuarioActual_(),
    estados: ESTADOS_LISTA,
    proveedores: proveedores,
    colores: coloresParaPanel_(),
    pedidos: pedidos,
    kpis: calcularKpis_(pedidos),
    porProveedor: resumenPorProveedor_(pedidos, indiceProv),
    agenda: construirAgenda_(pedidos),
    avisos: avisos
  };
}

/**
 * Por qué este pedido necesita que alguien haga algo.
 *
 * El orden importa: se busca la CAUSA sobre la que se puede actuar, no el
 * síntoma. Un embarque vencido cuyo proveedor además promete tarde se discute
 * como problema del proveedor, porque eso es lo que hay que ir a resolver.
 * "Vencido" queda para los que ya tienen proveedor comprometido en fecha y
 * aun así siguen abiertos.
 */
function calcularAlerta_(p) {
  if (p.estado === ESTADOS.CERRADO) return null;

  if (p.desfase !== null && p.desfase > 0) {
    return {
      clave: 'desfase',
      etiqueta: 'Proveedor entrega ' + p.desfase + ' días tarde',
      nivel: p.desfase > 30 ? 'alto' : 'medio'
    };
  }
  if ((p.urgencia === 'vencido' || p.urgencia === 'critico') &&
      (p.estado === ESTADOS.PENDIENTE || p.estado === ESTADOS.NEGOCIACION)) {
    return {
      clave: 'sin-proveedor',
      etiqueta: p.urgencia === 'vencido' ? 'Vencido y sin proveedor cerrado' : 'Embarque esta semana y sin cerrar',
      nivel: 'alto'
    };
  }
  if (p.urgencia === 'vencido' && p.porEmbarcarM3 > 0) {
    return { clave: 'vencido', etiqueta: 'Embarque vencido y todavía abierto', nivel: 'medio' };
  }
  if (!p.fechaEmbarque && p.porEmbarcarM3 > 0) {
    return { clave: 'sin-fecha', etiqueta: 'Sin fecha de embarque', nivel: 'bajo' };
  }
  return null;
}

/** Primero lo que quema: alerta alta, luego embarque más próximo. */
function ordenarPedidos_(pedidos) {
  var peso = { alto: 0, medio: 1, bajo: 2 };
  pedidos.sort(function (a, b) {
    var pa = a.alerta ? peso[a.alerta.nivel] : 3;
    var pb = b.alerta ? peso[b.alerta.nivel] : 3;
    if (pa !== pb) return pa - pb;
    var fa = a.ordenEmbarque || '99999999';
    var fb = b.ordenEmbarque || '99999999';
    if (fa !== fb) return fa < fb ? -1 : 1;
    return b.porEmbarcarM3 - a.porEmbarcarM3;
  });
}

function calcularKpis_(pedidos) {
  var k = {
    total: pedidos.length,
    pedidoM3: 0, embarcadoM3: 0, porEmbarcarM3: 0, porProducirM3: 0,
    enRiesgo: 0, riesgoM3: 0, sinProveedor: 0, sinProveedorM3: 0,
    desfaseM3: 0, proveedoresUsados: 0
  };
  var porEstado = {};
  var provs = {};

  for (var i = 0; i < ESTADOS_LISTA.length; i++) porEstado[ESTADOS_LISTA[i]] = 0;

  for (var j = 0; j < pedidos.length; j++) {
    var p = pedidos[j];
    k.pedidoM3      += p.pedidoM3;
    k.embarcadoM3   += p.embarcadoM3;
    k.porEmbarcarM3 += p.porEmbarcarM3;
    k.porProducirM3 += p.porProducirM3;

    porEstado[p.estado] = (porEstado[p.estado] || 0) + 1;
    if (p.proveedor) provs[normalizar_(p.proveedor)] = true;

    if (p.alerta) { k.enRiesgo++; k.riesgoM3 += p.porEmbarcarM3; }
    if (!p.proveedor && p.estado !== ESTADOS.CERRADO) {
      k.sinProveedor++;
      k.sinProveedorM3 += p.porEmbarcarM3;
    }
    if (p.desfase !== null && p.desfase > 0) k.desfaseM3 += p.porEmbarcarM3;
  }

  k.proveedoresUsados = Object.keys(provs).length;
  k.porEstado = porEstado;
  k.texto = {
    pedidoM3: formatearNumero_(k.pedidoM3),
    embarcadoM3: formatearNumero_(k.embarcadoM3),
    porEmbarcarM3: formatearNumero_(k.porEmbarcarM3),
    porProducirM3: formatearNumero_(k.porProducirM3),
    riesgoM3: formatearNumero_(k.riesgoM3),
    sinProveedorM3: formatearNumero_(k.sinProveedorM3),
    desfaseM3: formatearNumero_(k.desfaseM3)
  };
  return k;
}

/** Cuánto volumen le estamos comprando a cada proveedor. */
function resumenPorProveedor_(pedidos, indiceProv) {
  var mapa = {};

  for (var i = 0; i < pedidos.length; i++) {
    var p = pedidos[i];
    var nombre = p.proveedor || 'Sin asignar';
    var clave = normalizar_(nombre);

    if (!mapa[clave]) {
      var prov = buscarProveedor_(indiceProv, nombre);
      mapa[clave] = {
        nombre: p.proveedor || 'Sin asignar',
        hex: prov ? prov.hex : COLOR_SIN_PROVEEDOR,
        pedidos: 0, porEmbarcarM3: 0, enRiesgo: 0, asignado: !!p.proveedor
      };
    }
    mapa[clave].pedidos++;
    mapa[clave].porEmbarcarM3 += p.porEmbarcarM3;
    if (p.alerta) mapa[clave].enRiesgo++;
  }

  var lista = [];
  for (var k in mapa) {
    if (!Object.prototype.hasOwnProperty.call(mapa, k)) continue;
    mapa[k].porEmbarcarTexto = formatearNumero_(mapa[k].porEmbarcarM3);
    lista.push(mapa[k]);
  }
  lista.sort(function (a, b) { return b.porEmbarcarM3 - a.porEmbarcarM3; });
  return lista;
}

/**
 * La pauta de la reunión: los pedidos que necesitan una decisión, agrupados
 * por el motivo. Es lo que se proyecta en el modo reunión.
 */
function construirAgenda_(pedidos) {
  // El orden de los grupos es el orden en que conviene tratarlos en la reunión:
  // primero lo que se decide en la mesa, después lo que hay que explicar.
  var grupos = [
    { clave: 'sin-proveedor', titulo: 'Hay que asignar proveedor', detalle: 'El embarque está encima y la compra sigue sin cerrarse.', pedidos: [] },
    { clave: 'desfase', titulo: 'El proveedor llega tarde', detalle: 'La fecha que prometió el proveedor es posterior al embarque comprometido.', pedidos: [] },
    { clave: 'vencido', titulo: 'Vencidos y todavía abiertos', detalle: 'Ya hay proveedor en fecha, pero el embarque comprometido pasó.', pedidos: [] },
    { clave: 'sin-fecha', titulo: 'Sin fecha comprometida', detalle: 'Falta definir cuándo embarca.', pedidos: [] }
  ];
  var indice = {};
  for (var g = 0; g < grupos.length; g++) indice[grupos[g].clave] = grupos[g];

  for (var i = 0; i < pedidos.length; i++) {
    var p = pedidos[i];
    if (!p.alerta) continue;
    var destino = indice[p.alerta.clave];
    if (destino) destino.pedidos.push(p);
  }

  return grupos.filter(function (g) { return g.pedidos.length > 0; }).map(function (g) {
    var m3 = 0;
    for (var i = 0; i < g.pedidos.length; i++) m3 += g.pedidos[i].porEmbarcarM3;
    g.totalM3 = m3;
    g.totalM3Texto = formatearNumero_(m3);
    return g;
  });
}

function coloresParaPanel_() {
  var salida = [];
  for (var nombre in CATALOGO_COLORES) {
    if (!Object.prototype.hasOwnProperty.call(CATALOGO_COLORES, nombre)) continue;
    salida.push({ nombre: nombre, hex: CATALOGO_COLORES[nombre] });
  }
  return salida;
}

/** Correo de quien está usando la mesa; vacío si Google no lo entrega. */
function usuarioActual_() {
  try {
    return Session.getActiveUser().getEmail() || '';
  } catch (e) {
    return '';
  }
}
