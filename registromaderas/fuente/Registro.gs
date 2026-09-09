/**
 * El motor: arma el código, decide qué etapas del proceso aplican, comprueba
 * contra BD_Maderas y escribe la fila de batch input.
 *
 * Dos comprobaciones opuestas contra la misma base, y conviene no confundirlas:
 *   · el CÓDIGO que se registra NO debe existir todavía (se está creando);
 *   · las HOJAS DE RUTA que referencia SÍ deben existir (son materiales de
 *     proceso que ya están dados de alta).
 *
 * Todo lo que manda el formulario se vuelve a validar acá: el navegador ayuda,
 * pero no decide.
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

function hojaRegistro_() {
  var libro = ss_();
  var hoja = libro.getSheetByName(CFG.HOJA_REGISTRO);
  if (!hoja) hoja = libro.insertSheet(CFG.HOJA_REGISTRO);
  return hoja;
}

function cache_() {
  try {
    return CacheService.getScriptCache();
  } catch (err) {
    return null;
  }
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

/* ------------------------------------------------------- armado del código */

function normalizarCodigo_(codigo) {
  return String(codigo == null ? '' : codigo).trim().toUpperCase();
}

/** El prefijo siempre ocupa 4 caracteres; el 4º es un espacio si va en blanco. */
function prefijo_(agrupacion) {
  return (normalizarCodigo_(agrupacion) + '    ').substring(0, 4);
}

/** Número a texto con ceros a la izquierda, como pide la nomenclatura. */
function rellenar_(valor, digitos, rotulo) {
  var limpio = String(valor == null ? '' : valor).trim();
  if (!limpio) return '';
  if (!/^\d{1,}$/.test(limpio)) {
    throw new Error('El ' + rotulo + ' tiene que ser un número entero, sin puntos ni comas.');
  }
  var numero = String(Number(limpio));
  if (numero.length > digitos) {
    throw new Error('El ' + rotulo + ' no puede tener más de ' + digitos + ' dígitos.');
  }
  while (numero.length < digitos) numero = '0' + numero;
  return numero;
}

function dimension_(espesor, ancho, largo) {
  return espesor + 'X' + ancho + (largo ? 'X' + largo : '');
}

function armarCodigo_(agrupacion, espesor, ancho, largo) {
  return prefijo_(agrupacion) + dimension_(espesor, ancho, largo);
}

/**
 * Qué etapas del proceso tiene el producto, leídas del propio prefijo:
 *   carácter 1 = C  -> pasa por cepillado
 *   carácter 2 = V  -> es verde, no pasa por secado
 * El aserradero va siempre.
 */
function etapasAplicables_(agrupacion) {
  var p = prefijo_(agrupacion);
  return {
    aserradero: true,
    secado: p.charAt(1) !== 'V',
    cepillado: p.charAt(0) === 'C'
  };
}

/** Cada carácter del prefijo con su significado, para explicarlo en pantalla. */
function descomponerPrefijo_(agrupacion) {
  var p = prefijo_(agrupacion);
  return NOMENCLATURA.map(function (n) {
    var caracter = p.charAt(n.posicion - 1);
    return {
      posicion: n.posicion,
      titulo: n.titulo,
      caracter: caracter,
      significado: n.valores[caracter] || (caracter === ' ' ? 'Producto en proceso' : '')
    };
  });
}

/**
 * Desarma un código ya armado en sus partes.
 *
 *   RVMH032X180X3960  ->  prefijo RVMH · 032 · 180 · 3960
 *   CSF 019X075       ->  prefijo "CSF " · 019 · 075 · sin largo
 *
 * El prefijo son los primeros cuatro caracteres. Si al copiar y pegar se perdió
 * el espacio del cuarto lugar (CSF019X075), se reintenta con tres.
 * Devuelve null si el resto no tiene la forma EEEXAAA[XLLLL].
 */
function descomponerCodigo_(texto) {
  var limpio = normalizarCodigo_(texto).replace(/\u00a0/g, ' ').replace(/ {2,}/g, ' ');
  var intentos = [
    { prefijo: limpio.substring(0, 4), resto: limpio.substring(4) },
    { prefijo: limpio.substring(0, 3) + ' ', resto: limpio.substring(3) }
  ];
  for (var i = 0; i < intentos.length; i++) {
    var m = /^(\d{3})X(\d{3})(?:X(\d{4}))?$/.exec(intentos[i].resto);
    if (!m) continue;
    return {
      prefijo: intentos[i].prefijo,
      agrupacion: intentos[i].prefijo.trim(),
      espesor: m[1],
      ancho: m[2],
      largo: m[3] || ''
    };
  }
  return null;
}

/* ------------------------------------------------------- búsqueda en BD */

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
  if (cache) cache.put(llave, JSON.stringify(ficha || { vacio: true }), CFG.SEGUNDOS_CACHE);
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
  return {
    fila: fila,
    codigo: normalizarCodigo_(valores[BD.MATERIAL - 1]),
    grupo: texto_(valores[BD.GRUPO - 1]),
    tipoMaterial: texto_(valores[BD.TIPO_MATERIAL - 1]),
    descripcion: texto_(valores[BD.DESCRIPCION - 1]),
    ce: texto_(valores[BD.CE - 1])
  };
}

/**
 * Rescate para los códigos que en la base traen espacios pegados: hay varios
 * con un espacio duro al final, y la búsqueda de celda exacta no los ve.
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

/**
 * Largos que la base tiene para esa agrupación y esa escuadría. Es lo que
 * evita adivinar: se elige de lo que existe.
 */
function largosDisponibles_(agrupacion, espesor, ancho) {
  if (!espesor || !ancho) return [];
  var base = prefijo_(agrupacion) + espesor + 'X' + ancho + 'X';
  var hoja = hoja_(CFG.HOJA_BD);
  var ultima = hoja.getLastRow();
  if (ultima < 2) return [];

  var finder = hoja.getRange(2, BD.MATERIAL, ultima - 1, 1)
    .createTextFinder(base).matchEntireCell(false);
  var vistos = {};
  var salida = [];
  var primera = 0;

  for (var i = 0; i < CFG.MAX_LARGOS * 3; i++) {
    var celda = finder.findNext();
    if (!celda) break;
    var fila = celda.getRow();
    if (primera && fila === primera) break;
    if (!primera) primera = fila;

    var valor = normalizarCodigo_(celda.getValue());
    if (valor.indexOf(base) !== 0) continue;
    var largo = valor.substring(base.length);
    if (/^\d{1,4}$/.test(largo) && !vistos[largo]) {
      vistos[largo] = true;
      salida.push(largo);
      if (salida.length >= CFG.MAX_LARGOS) break;
    }
  }
  salida.sort();
  return salida;
}

/* ------------------------------------------------------------------ rutas */

/** A qué etapa pertenece una ruta, por sus dos primeros caracteres. */
function familiaDeRuta_(codigo) {
  var c = normalizarCodigo_(codigo);
  var etapas = Object.keys(RUTAS.FAMILIAS);
  for (var i = 0; i < etapas.length; i++) {
    var prefijos = RUTAS.FAMILIAS[etapas[i]];
    for (var j = 0; j < prefijos.length; j++) {
      if (c.indexOf(prefijos[j]) === 0) return etapas[i];
    }
  }
  return '';
}

/** La escuadría de una ruta: los 7 caracteres finales, EEEXAAA. */
function escuadriaDeRuta_(codigo) {
  var c = normalizarCodigo_(codigo);
  return /^.{4}\d{3}X\d{3}$/.test(c) ? c.substring(4) : '';
}

/**
 * Las hojas de ruta que BD_Maderas tiene para una escuadría: los códigos de
 * 11 caracteres que terminan en EEEXAAA. Para 032X180 son dos, RVFD032X180 y
 * RSFD032X180, que es justo lo que el desglose necesita.
 */
function rutasDisponibles_(espesor, ancho) {
  if (!espesor || !ancho) return [];
  var escuadria = espesor + 'X' + ancho;
  var cache = cache_();
  var llave = 'rutas:' + escuadria;
  if (cache) {
    var guardado = cache.get(llave);
    if (guardado) return JSON.parse(guardado);
  }

  var hoja = hoja_(CFG.HOJA_BD);
  var ultima = hoja.getLastRow();
  var salida = [];
  if (ultima >= 2) {
    // Se lee solo la columna de códigos; la descripción se busca después,
    // y son pocas: la mediana es de dos rutas por escuadría.
    var codigos = hoja.getRange(2, BD.MATERIAL, ultima - 1, 1).getValues();
    for (var i = 0; i < codigos.length && salida.length < RUTAS.MAXIMO; i++) {
      var cod = normalizarCodigo_(codigos[i][0]);
      if (cod.length !== 11 || cod.substring(4) !== escuadria) continue;
      var fila = hoja.getRange(i + 2, 1, 1, BD.COLUMNAS).getValues()[0];
      salida.push({
        codigo: cod,
        descripcion: texto_(fila[BD.DESCRIPCION - 1]),
        tipoMaterial: texto_(fila[BD.TIPO_MATERIAL - 1]),
        etapa: familiaDeRuta_(cod)
      });
    }
    salida.sort(function (a, b) { return a.codigo < b.codigo ? -1 : 1; });
  }
  if (cache) cache.put(llave, JSON.stringify(salida), CFG.SEGUNDOS_CACHE);
  return salida;
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

  // La condicional de fondo: el centro y el tipo de material mandan la lista.
  var agrupacion = agrupacionPorCodigo_(centro, tipoMaterial, datos.agrupacion);
  if (!agrupacion) {
    throw new Error('La agrupación "' + (datos.agrupacion || '') + '" no está habilitada para ' +
      centro + ' + ' + tipoMaterial + ' en la hoja ' + CFG.HOJA_SAP + '.');
  }

  var espesor = rellenar_(datos.espesor, MEDIDAS.DIGITOS_ESPESOR, 'espesor');
  var ancho = rellenar_(datos.ancho, MEDIDAS.DIGITOS_ANCHO, 'ancho');
  var largo = rellenar_(datos.largo, MEDIDAS.DIGITOS_LARGO, 'largo');
  if (!espesor || !ancho) throw new Error('Faltan el espesor y el ancho.');

  // Trading compra a terceros: eso va escrito en la especie del código.
  if (normalizar_(origen.id) === normalizar_(TRADING.ORIGEN) &&
      prefijo_(agrupacion.agrupacion).charAt(3) !== TRADING.ESPECIE) {
    throw new Error('En Trading la especie del código tiene que ser ' + TRADING.ESPECIE +
      ' (Radiata Terceros), y ' + agrupacion.agrupacion + ' termina en "' +
      prefijo_(agrupacion.agrupacion).charAt(3).replace(' ', '␣') + '".');
  }

  var codigo = armarCodigo_(agrupacion.agrupacion, espesor, ancho, largo);
  var ficha = buscarEnBD_(codigo);
  if (ficha && MEDIDAS.EXIGIR_NUEVO) {
    throw new Error('El código ' + codigo + ' ya existe en ' + CFG.HOJA_BD +
      (ficha.descripcion ? ' (' + ficha.descripcion + ')' : '') +
      '. Este formulario crea materiales nuevos: no hace falta pedirlo de nuevo.');
  }

  var piezas = Number(datos.piezas);
  if (!isFinite(piezas) || piezas <= 0 || Math.floor(piezas) !== piezas) {
    throw new Error('La cantidad de piezas debe ser un número entero mayor que cero.');
  }

  var aplica = etapasAplicables_(agrupacion.agrupacion);
  var exigeRuta = RUTAS.DEBE_EXISTIR_EN.indexOf(clase.id) !== -1;
  var pedido = datos.desglose || {};
  var desglose = {};
  ETAPAS.forEach(function (etapa) {
    if (!aplica[etapa.id]) {
      desglose[etapa.id] = { ruta: '', plantilla: '', dimension: '', espesor: '', ancho: '' };
      return;
    }
    var ruta = normalizarCodigo_((pedido[etapa.id] || {}).ruta);
    if (!ruta) {
      if (!RUTAS.OBLIGATORIA) {
        desglose[etapa.id] = { ruta: '', plantilla: '', dimension: '', espesor: '', ancho: '' };
        return;
      }
      throw new Error('Falta la hoja de ruta de ' + etapa.titulo + '.');
    }

    var escuadria = escuadriaDeRuta_(ruta);
    if (!escuadria) {
      throw new Error('La hoja de ruta de ' + etapa.titulo + ' ("' + ruta + '") no tiene la ' +
        'forma de una ruta: cuatro caracteres de prefijo más la escuadría, como RVFD032X180.');
    }

    var enBD = buscarEnBD_(ruta);
    if (!enBD && exigeRuta) {
      throw new Error('La hoja de ruta ' + ruta + ' de ' + etapa.titulo + ' no existe en ' +
        CFG.HOJA_BD + ', y en ' + clase.id + ' la ruta tiene que existir.');
    }

    var familia = familiaDeRuta_(ruta);
    if (familia && familia !== etapa.id) {
      throw new Error('La ruta ' + ruta + ' es de ' + familia + ', no de ' + etapa.titulo + '.');
    }

    desglose[etapa.id] = {
      ruta: enBD ? enBD.codigo : ruta,
      plantilla: ruta.substring(0, 4).trim(),
      dimension: escuadria,
      espesor: escuadria.substring(0, 3),
      ancho: escuadria.substring(4),
      existe: !!enBD,
      descripcion: enBD ? enBD.descripcion : ''
    };
  });

  return {
    clase: clase.id,
    claseTitulo: clase.titulo,
    hojaDestino: clase.hoja,
    origen: origen.id,
    centro: centro,
    tipoMaterial: tipoMaterial,
    agrupacion: agrupacion.agrupacion,
    agrupacionTexto: agrupacion.textoLargo,
    codigo: ficha ? ficha.codigo : codigo,
    descripcion: ficha ? ficha.descripcion : '',
    grupo: ficha ? ficha.grupo : '',
    espesor: espesor,
    ancho: ancho,
    largo: largo,
    dimension: dimension_(espesor, ancho, largo),
    piezas: piezas,
    umb: unoDe_(datos.umb, UNIDADES, POR_DEFECTO.UMB),
    stockPedido: unoDe_(datos.stockPedido, STOCK_PEDIDO.map(function (o) { return o.id; }),
      POR_DEFECTO.STOCK_PEDIDO),
    desglose: desglose,
    pais: POR_DEFECTO.PAIS,
    tipoRequerimiento: POR_DEFECTO.TIPO_REQUERIMIENTO,
    fechaTexto: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), CFG.FORMATO_FECHA),
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
    fecha: v.fechaTexto,
    solicitante: v.solicitante,

    aserraderoPlantilla: v.desglose.aserradero.plantilla,
    aserraderoDimension: v.desglose.aserradero.dimension,
    aserraderoEspesor: v.desglose.aserradero.espesor,
    aserraderoAncho: v.desglose.aserradero.ancho,

    secadoPlantilla: v.desglose.secado.plantilla,
    secadoDimension: v.desglose.secado.dimension,
    secadoEspesor: v.desglose.secado.espesor,
    secadoAncho: v.desglose.secado.ancho,

    cepilladoPlantilla: v.desglose.cepillado.plantilla,
    cepilladoDimension: v.desglose.cepillado.dimension,
    cepilladoEspesor: v.desglose.cepillado.espesor,
    cepilladoAncho: v.desglose.cepillado.ancho,

    agrupacion: v.agrupacion,
    dimension: v.dimension,
    espesor: v.espesor,
    ancho: v.ancho,
    largo: v.largo,
    piezas: v.piezas,
    umb: v.umb,
    stockPedido: v.stockPedido
  };
}

/**
 * Escribe solo las columnas mapeadas, agrupando las contiguas en un rango.
 * Así no se pisa nada de lo que quede fuera del mapa.
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
  var datos = datosParaHoja_(v);
  var valores = {};
  MAPEO_DESTINO.forEach(function (m) {
    var dato = datos[m.dato];
    valores[m.col] = (dato === undefined || dato === null) ? '' : dato;
  });

  var fila = Math.max(hoja.getLastRow() + 1, CFG.PRIMERA_FILA_DATOS);
  escribirEnBloques_(hoja, fila, valores);
  return { hoja: hoja.getName(), fila: fila };
}

function asegurarEncabezadosRegistro_(hoja) {
  var ultima = hoja.getLastRow();
  if (ultima > 1) return;  // ya tiene datos: no se toca

  if (ultima === 1) {
    var actuales = hoja.getRange(1, 1, 1, Math.max(hoja.getLastColumn(), 1)).getValues()[0];
    if (normalizar_(actuales.join('|')) === normalizar_(COL_REGISTRO.join('|'))) return;
  }
  hoja.getRange(1, 1, 1, COL_REGISTRO.length)
    .setValues([COL_REGISTRO])
    .setFontWeight('bold')
    .setBackground('#14352a')
    .setFontColor('#ffffff');
  hoja.setFrozenRows(1);
}

function guardarEnRegistro_(v, destino) {
  var hoja = hojaRegistro_();
  asegurarEncabezadosRegistro_(hoja);
  hoja.appendRow([
    v.fechaTexto, v.solicitante, v.pais, v.clase, v.tipoRequerimiento,
    v.origen, v.centro, v.tipoMaterial, v.agrupacion, v.agrupacionTexto,
    v.codigo, v.descripcion, v.grupo,
    v.espesor, v.ancho, v.largo, v.piezas, v.umb, v.stockPedido,
    v.desglose.aserradero.ruta, v.desglose.secado.ruta, v.desglose.cepillado.ruta,
    destino.hoja, destino.fila
  ]);
  return hoja.getLastRow();
}

/* --------------------------------------------------------------------- API */

/** Todo lo que el formulario necesita para dibujarse. */
function apiContexto() {
  var correo = usuario_();
  var libro = ss_();
  var faltantes = [];
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
    etapas: ETAPAS.map(function (e) { return { id: e.id, titulo: e.titulo }; }),
    catalogoEtapas: catalogoEtapas_(),
    unidades: UNIDADES.slice(),
    stockPedido: STOCK_PEDIDO.slice(),
    medidas: {
      espesor: MEDIDAS.DIGITOS_ESPESOR,
      ancho: MEDIDAS.DIGITOS_ANCHO,
      largo: MEDIDAS.DIGITOS_LARGO
    },
    porDefecto: POR_DEFECTO,
    hojaBD: CFG.HOJA_BD,
    hojaSAP: CFG.HOJA_SAP,
    hojaRegistro: CFG.HOJA_REGISTRO,
    exigeCodigoNuevo: MEDIDAS.EXIGIR_NUEVO,
    rutaObligatoria: RUTAS.OBLIGATORIA,
    clasesConRutaEnBD: RUTAS.DEBE_EXISTIR_EN.slice(),
    trading: { origen: TRADING.ORIGEN, especie: TRADING.ESPECIE },
    usuario: correo,
    identificado: !!correo,
    exigeIdentidad: AUDITORIA.EXIGIR_IDENTIDAD,
    autorizado: puedeAcceder_(correo),
    hojasFaltantes: faltantes
  };
}

/**
 * Agrupaciones habilitadas para ese centro y tipo de material.
 * En Trading, además, solo las de especie H (Radiata Terceros).
 */
function apiAgrupaciones(centro, tipoMaterial, origen) {
  var esTrading = normalizar_(origen) === normalizar_(TRADING.ORIGEN);
  var lista = agrupacionesDe_(centro, tipoMaterial).filter(function (f) {
    return !esTrading || prefijo_(f.agrupacion).charAt(3) === TRADING.ESPECIE;
  });
  return {
    centro: centro,
    tipoMaterial: tipoMaterial,
    origen: origen || '',
    filtradoPorTrading: esTrading,
    agrupaciones: lista.map(function (f) {
      return {
        codigo: f.agrupacion,
        prefijo: prefijo_(f.agrupacion),
        texto: f.textoLargo,
        textoEs: f.textoEs,
        textoEn: f.textoEn,
        etapas: etapasAplicables_(f.agrupacion),
        partes: descomponerPrefijo_(f.agrupacion)
      };
    })
  };
}

/** Las hojas de ruta que existen en BD_Maderas para una escuadría. */
function apiRutas(espesor, ancho) {
  try {
    var ee = rellenar_(espesor, MEDIDAS.DIGITOS_ESPESOR, 'espesor');
    var aa = rellenar_(ancho, MEDIDAS.DIGITOS_ANCHO, 'ancho');
    if (!ee || !aa) return { ok: false, escuadria: '', rutas: [], mensaje: 'Faltan las medidas.' };
    return { ok: true, escuadria: ee + 'X' + aa, rutas: rutasDisponibles_(ee, aa) };
  } catch (err) {
    return { ok: false, escuadria: '', rutas: [], mensaje: err.message };
  }
}

/**
 * Arma el código con las medidas escritas y cuenta qué encontró.
 * Nunca lanza: el formulario necesita una respuesta para mostrar.
 */
function apiMedidas(datos) {
  datos = datos || {};
  try {
    var espesor = rellenar_(datos.espesor, MEDIDAS.DIGITOS_ESPESOR, 'espesor');
    var ancho = rellenar_(datos.ancho, MEDIDAS.DIGITOS_ANCHO, 'ancho');
    var largo = rellenar_(datos.largo, MEDIDAS.DIGITOS_LARGO, 'largo');
    var agrupacion = normalizarCodigo_(datos.agrupacion);
    if (!agrupacion) return { ok: false, mensaje: 'Elige primero la agrupación.' };
    if (!espesor || !ancho) {
      return {
        ok: false, espesor: espesor, ancho: ancho, largo: largo,
        largos: (espesor && ancho) ? largosDisponibles_(agrupacion, espesor, ancho) : [],
        mensaje: 'Escribe el espesor y el ancho.'
      };
    }

    var codigo = armarCodigo_(agrupacion, espesor, ancho, largo);
    var ficha = buscarEnBD_(codigo);

    return {
      ok: !ficha || !MEDIDAS.EXIGIR_NUEVO,
      codigo: codigo,
      espesor: espesor,
      ancho: ancho,
      largo: largo,
      largos: largosDisponibles_(agrupacion, espesor, ancho),
      rutas: rutasDisponibles_(espesor, ancho),
      existe: !!ficha,
      material: ficha || null,
      mensaje: ficha
        ? 'El código ' + codigo + ' ya existe en ' + CFG.HOJA_BD +
          (ficha.descripcion ? ': ' + ficha.descripcion : '') + '.'
        : ''
    };
  } catch (err) {
    return { ok: false, mensaje: err.message };
  }
}

/**
 * Recibe un código ya armado y devuelve todo lo que se puede deducir de él:
 * agrupación, centro, tipo de material, medidas y la ficha de BD_Maderas.
 *
 * Lo que NO sale del código es la clase de requerimiento (esa decide en qué
 * hoja cae la fila) y, cuando el centro es TCP1, el origen: TCP1 lo usan
 * tanto Trading como Planta.
 */
function apiPegarCodigo(texto) {
  var limpio = normalizarCodigo_(texto);
  if (!limpio) return { ok: false, mensaje: 'Pega el código que quieres registrar.' };

  var partes = descomponerCodigo_(limpio);
  if (!partes) {
    return {
      ok: false,
      mensaje: 'No reconozco la forma de "' + limpio + '". Un código va como ' +
        'PREFIJO + espesor X ancho, y si lleva largo se agrega X y cuatro dígitos: ' +
        'RVMH032X180X3960.'
    };
  }

  var agrupacion = buscarAgrupacion_(partes.agrupacion);
  if (!agrupacion) {
    return {
      ok: false,
      mensaje: 'El prefijo ' + partes.agrupacion + ' no está en la hoja ' + CFG.HOJA_SAP +
        '. Agrégalo ahí con su Ce. y su TpMt si corresponde pedirlo.'
    };
  }

  var codigo = armarCodigo_(agrupacion.agrupacion, partes.espesor, partes.ancho, partes.largo);
  var ficha = buscarEnBD_(codigo);

  // Origen: se deduce si un único origen usa ese centro. Con especie H manda
  // Trading, que es lo que significa comprarle a terceros.
  var posibles = ORIGENES.filter(function (o) {
    return o.centros.indexOf(agrupacion.centro) !== -1;
  }).map(function (o) { return o.id; });
  if (prefijo_(agrupacion.agrupacion).charAt(3) === TRADING.ESPECIE &&
      posibles.indexOf(TRADING.ORIGEN) !== -1) {
    posibles = [TRADING.ORIGEN];
  }

  return {
    ok: !ficha || !MEDIDAS.EXIGIR_NUEVO,
    codigo: codigo,
    centro: agrupacion.centro,
    tipoMaterial: agrupacion.tipoMaterial,
    origenes: posibles,
    origen: posibles.length === 1 ? posibles[0] : '',
    agrupacion: {
      codigo: agrupacion.agrupacion,
      prefijo: prefijo_(agrupacion.agrupacion),
      texto: agrupacion.textoLargo,
      textoEs: agrupacion.textoEs,
      textoEn: agrupacion.textoEn,
      etapas: etapasAplicables_(agrupacion.agrupacion),
      partes: descomponerPrefijo_(agrupacion.agrupacion)
    },
    espesor: partes.espesor,
    ancho: partes.ancho,
    largo: partes.largo,
    largos: largosDisponibles_(agrupacion.agrupacion, partes.espesor, partes.ancho),
    rutas: rutasDisponibles_(partes.espesor, partes.ancho),
    existe: !!ficha,
    material: ficha || null,
    mensaje: ficha
      ? 'El código ' + codigo + ' ya existe en ' + CFG.HOJA_BD +
        (ficha.descripcion ? ': ' + ficha.descripcion : '') +
        '. Este formulario crea materiales nuevos.'
      : ''
  };
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
      fecha: v.fechaTexto,
      solicitante: v.solicitante
    };
  } finally {
    lock.releaseLock();
  }
}
