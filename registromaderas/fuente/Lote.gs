/**
 * Carga masiva: se pegan códigos, uno por línea, y de cada uno sale su fila de
 * batch input.
 *
 * Todo lo que el código dice, se deduce y no se pregunta:
 *   · especie H  -> Trading, y el centro que SAP tenga para esa agrupación
 *   · con largo  -> PT · sin largo -> PP, o PCP si el producto es cepillado
 * Lo único que hay que escribir son las hojas de ruta de las etapas que apliquen.
 */

/* ---------------------------------------------------------------- lectura */

/**
 * Una sola pasada por BD_Maderas para todo el lote: qué códigos ya existen y
 * qué rutas hay por escuadría. Con cincuenta líneas, leer la columna una vez
 * es la diferencia entre un segundo y un minuto.
 */
function leerBD_() {
  var hoja = hoja_(CFG.HOJA_BD);
  var ultima = hoja.getLastRow();
  var bd = { codigos: {}, rutas: {} };
  if (ultima < 2) return bd;

  var valores = hoja.getRange(2, 1, ultima - 1, 4).getValues();
  for (var i = 0; i < valores.length; i++) {
    var codigo = normalizarCodigo_(valores[i][BD.MATERIAL - 1]);
    if (!codigo) continue;
    var descripcion = texto_(valores[i][BD.DESCRIPCION - 1]);

    bd.codigos[codigo] = {
      codigo: codigo,
      grupo: texto_(valores[i][BD.GRUPO - 1]),
      tipoMaterial: texto_(valores[i][BD.TIPO_MATERIAL - 1]),
      descripcion: descripcion
    };

    var escuadria = escuadriaDeRuta_(codigo);
    if (!escuadria) continue;
    if (!bd.rutas[escuadria]) bd.rutas[escuadria] = [];
    if (bd.rutas[escuadria].length < RUTAS.MAXIMO) {
      bd.rutas[escuadria].push({
        codigo: codigo,
        descripcion: descripcion,
        etapa: familiaDeRuta_(codigo)
      });
    }
  }
  return bd;
}

/* -------------------------------------------------------------- deducción */

/** El origen que usa ese centro sin ser Trading; Trading exige especie H. */
function origenSinTerceros_(centro) {
  var candidatos = ORIGENES.filter(function (o) {
    return o.centros.indexOf(centro) !== -1;
  });
  for (var i = 0; i < candidatos.length; i++) {
    if (candidatos[i].id !== TRADING.ORIGEN) return candidatos[i].id;
  }
  return (candidatos[0] || {}).id || DEDUCCION.ORIGEN_SIN_TERCEROS;
}

/** Todo lo que el código dice por sí solo. */
function deducirDeCodigo_(texto) {
  var partes = descomponerCodigo_(texto);
  if (!partes) {
    return {
      ok: false,
      mensaje: 'No reconozco la forma de "' + normalizarCodigo_(texto) + '". Un código va como ' +
        'PREFIJO + espesor X ancho, y si lleva largo se agrega X y cuatro dígitos.'
    };
  }

  var agrupacion = buscarAgrupacion_(partes.agrupacion);
  if (!agrupacion) {
    return {
      ok: false,
      mensaje: 'El prefijo ' + partes.agrupacion + ' no está en la hoja ' + CFG.HOJA_SAP + '.'
    };
  }

  var prefijo = prefijo_(agrupacion.agrupacion);
  var esTerceros = prefijo.charAt(3) === TRADING.ESPECIE;

  return {
    ok: true,
    codigo: armarCodigo_(agrupacion.agrupacion, partes.espesor, partes.ancho, partes.largo),
    agrupacion: agrupacion.agrupacion,
    agrupacionTexto: agrupacion.textoLargo,
    prefijo: prefijo,
    partes: descomponerPrefijo_(agrupacion.agrupacion),
    centro: agrupacion.centro,
    tipoMaterial: agrupacion.tipoMaterial,
    origen: esTerceros ? TRADING.ORIGEN : origenSinTerceros_(agrupacion.centro),
    esTerceros: esTerceros,
    clase: partes.largo
      ? DEDUCCION.CLASE_CON_LARGO
      : (prefijo.charAt(0) === 'C' ? DEDUCCION.CLASE_PROCESO_CEPILLADO : DEDUCCION.CLASE_PROCESO),
    espesor: partes.espesor,
    ancho: partes.ancho,
    largo: partes.largo,
    etapas: etapasAplicables_(agrupacion.agrupacion)
  };
}

/* ----------------------------------------------------------------- el lote */

/**
 * Lee una línea del pegado, sin juzgarla todavía.
 *
 * El primer campo es el código; los demás se reconocen solos: lo que tenga
 * forma de ruta se asigna a su etapa y un número suelto es la cantidad de
 * piezas. Así da igual el orden en que vengan.
 */
function leerLinea_(linea, numero, bd) {
  var campos = String(linea).split(/\t|;|\|/)
    .map(function (c) { return c.trim(); })
    .filter(function (c) { return c !== ''; });

  var fila = {
    n: numero,
    entrada: campos[0] || '',
    rutas: { aserradero: '', secado: '', cepillado: '' },
    opciones: { aserradero: [], secado: [], cepillado: [] },
    piezas: '',
    problemas: [],
    ok: false
  };

  var base = deducirDeCodigo_(campos[0] || '');
  if (!base.ok) {
    fila.problemas.push(base.mensaje);
    return fila;
  }
  Object.keys(base).forEach(function (k) { if (k !== 'ok') fila[k] = base[k]; });

  for (var i = 1; i < campos.length; i++) {
    var campo = campos[i];
    if (/^\d+$/.test(campo)) { fila.piezas = campo; continue; }
    var familia = familiaDeRuta_(campo);
    if (escuadriaDeRuta_(campo) && familia) fila.rutas[familia] = normalizarCodigo_(campo);
  }

  // Rutas de la escuadría del producto, separadas por etapa.
  var disponibles = bd.rutas[fila.espesor + 'X' + fila.ancho] || [];
  ETAPAS.forEach(function (etapa) {
    if (!fila.etapas[etapa.id]) return;
    fila.opciones[etapa.id] = disponibles.filter(function (r) { return r.etapa === etapa.id; });
  });
  return fila;
}

/** Si una etapa tiene una sola ruta posible, se pone sola. */
function proponerRutas_(fila) {
  if (!fila.etapas) return fila;
  ETAPAS.forEach(function (etapa) {
    if (!fila.etapas[etapa.id] || fila.rutas[etapa.id]) return;
    var suyas = fila.opciones[etapa.id] || [];
    if (suyas.length === 1) fila.rutas[etapa.id] = suyas[0].codigo;
  });
  return fila;
}

/**
 * Juzga una fila: el código no puede existir todavía y las rutas sí.
 * `existe` dice si un código está en BD_Maderas: al analizar un lote se
 * consulta el índice ya leído, y al revisar una fila suelta, la caché.
 */
function validarFila_(fila, existe) {
  if (!fila.codigo || !fila.etapas) { fila.ok = false; return fila; }
  fila.problemas = [];

  var existente = existe(fila.codigo);
  fila.existe = !!existente;
  fila.descripcionExistente = existente ? existente.descripcion : '';
  if (fila.existe && MEDIDAS.EXIGIR_NUEVO) {
    fila.problemas.push('Ya existe en ' + CFG.HOJA_BD +
      (existente.descripcion ? ': ' + existente.descripcion : '') + '.');
  }

  var exigeEnBD = RUTAS.DEBE_EXISTIR_EN.indexOf(fila.clase) !== -1;
  ETAPAS.forEach(function (etapa) {
    if (!fila.etapas[etapa.id]) return;
    var ruta = normalizarCodigo_(fila.rutas[etapa.id]);
    if (!ruta) {
      if (RUTAS.OBLIGATORIA) fila.problemas.push('Falta la hoja de ruta de ' + etapa.titulo + '.');
      return;
    }
    if (!escuadriaDeRuta_(ruta)) {
      fila.problemas.push('La ruta de ' + etapa.titulo + ' ("' + ruta + '") no tiene la forma ' +
        'de una ruta: prefijo más escuadría, como RVFD032X180.');
      return;
    }
    var familia = familiaDeRuta_(ruta);
    if (familia && familia !== etapa.id) {
      fila.problemas.push('La ruta ' + ruta + ' es de ' + familia + ', no de ' + etapa.titulo + '.');
      return;
    }
    if (!existe(ruta) && exigeEnBD) {
      fila.problemas.push('La ruta ' + ruta + ' no existe en ' + CFG.HOJA_BD +
        ', y en ' + fila.clase + ' tiene que existir.');
    }
  });

  fila.ok = !fila.problemas.length;
  return fila;
}

/** La solicitud que espera `validar_`, armada desde una fila del lote. */
function solicitudDeFila_(fila) {
  var desglose = {};
  ETAPAS.forEach(function (etapa) {
    desglose[etapa.id] = { ruta: (fila.rutas || {})[etapa.id] || '' };
  });
  return {
    clase: fila.clase,
    origen: fila.origen,
    centro: fila.centro,
    tipoMaterial: fila.tipoMaterial,
    agrupacion: fila.agrupacion,
    espesor: fila.espesor,
    ancho: fila.ancho,
    largo: fila.largo,
    desglose: desglose,
    piezas: fila.piezas,
    umb: fila.umb || POR_DEFECTO.UMB,
    stockPedido: fila.stockPedido || POR_DEFECTO.STOCK_PEDIDO
  };
}

/** La fila de batch input, en el orden de las columnas de PT/PCP/PP. */
function filaBatch_(v) {
  var datos = datosParaHoja_(v);
  var ancho = 0;
  MAPEO_DESTINO.forEach(function (m) { ancho = Math.max(ancho, m.col); });
  var fila = [];
  for (var i = 0; i < ancho; i++) fila.push('');
  MAPEO_DESTINO.forEach(function (m) {
    var dato = datos[m.dato];
    fila[m.col - 1] = (dato === undefined || dato === null) ? '' : dato;
  });
  return fila;
}

/* --------------------------------------------------------------------- API */

function porLineas_(texto) {
  return String(texto == null ? '' : texto).split(/\r?\n/);
}

/**
 * Analiza el pegado y devuelve una fila por línea.
 *
 * La entrada son columnas paralelas: la línea 5 de los códigos va con la
 * línea 5 de cada columna de rutas y con la 5 del PAK. Por eso las líneas en
 * blanco no se renumeran: el número de fila es el de la línea escrita.
 */
function apiLote(entrada) {
  var correo = usuario_();
  if (AUDITORIA.EXIGIR_IDENTIDAD && !correo) {
    throw new Error('No se pudo identificar tu cuenta. Entra con tu correo corporativo.');
  }
  if (!puedeAcceder_(correo)) throw new Error('Tu cuenta no está autorizada.');

  var datos = (typeof entrada === 'string') ? { codigos: entrada } : (entrada || {});
  var codigos = porLineas_(datos.codigos);
  var piezas = porLineas_(datos.piezas);
  var rutas = {};
  ETAPAS.forEach(function (etapa) {
    rutas[etapa.id] = porLineas_((datos.rutas || {})[etapa.id]);
  });

  var bd = leerBD_();
  var enBD = function (codigo) { return bd.codigos[codigo]; };
  var filas = [];

  codigos.forEach(function (linea, i) {
    if (!linea.trim()) return;
    var fila = leerLinea_(linea, i + 1, bd);

    // Lo escrito en la columna de la etapa manda sobre lo que venga pegado
    // en la misma línea del código.
    ETAPAS.forEach(function (etapa) {
      var suya = (rutas[etapa.id][i] || '').trim();
      if (suya) fila.rutas[etapa.id] = normalizarCodigo_(suya);
    });
    var pak = (piezas[i] || '').trim();
    if (pak) fila.piezas = pak.replace(/\D/g, '');

    filas.push(validarFila_(proponerRutas_(fila), enBD));
  });

  return {
    ok: true,
    filas: filas,
    listas: filas.filter(function (f) { return f.ok; }).length,
    conProblemas: filas.filter(function (f) { return !f.ok; }).length
  };
}

/** Vuelve a revisar las filas después de que alguien completó las rutas. */
function apiRevisarLote(filas) {
  // Acá no se relee la base entera: se consultan solo los códigos en juego,
  // y esas consultas van por caché.
  var existe = function (codigo) { return buscarEnBD_(normalizarCodigo_(codigo)); };
  var salida = (filas || []).map(function (fila) {
    return validarFila_(fila, existe);
  });

  return {
    ok: true,
    filas: salida,
    listas: salida.filter(function (f) { return f.ok; }).length,
    conProblemas: salida.filter(function (f) { return !f.ok; }).length
  };
}

/** El Excel de batch input con las filas elegidas: en blanco hasta la fila 3. */
function apiExcelLote(filas) {
  if (!filas || !filas.length) throw new Error('No hay filas seleccionadas.');

  var datos = filas.map(function (fila, i) {
    try {
      return filaBatch_(validar_(solicitudDeFila_(fila)));
    } catch (err) {
      throw new Error('Línea ' + (fila.n || (i + 1)) + ' (' + (fila.codigo || fila.entrada) +
        '): ' + err.message);
    }
  });

  var blob = armarXlsx_(EXPORTAR.HOJA, datos, EXPORTAR.PRIMERA_FILA);
  var sello = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmm');
  return {
    ok: true,
    nombre: EXPORTAR.NOMBRE + '-' + sello + '.xlsx',
    filas: datos.length,
    primeraFila: EXPORTAR.PRIMERA_FILA,
    base64: Utilities.base64Encode(blob.getBytes())
  };
}

/** Guarda las filas elegidas en su hoja y en la bitácora. */
function apiGuardarLote(filas) {
  if (!filas || !filas.length) throw new Error('No hay filas seleccionadas.');

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(CFG.SEGUNDOS_LOCK * 1000)) {
    throw new Error('Hay otro registro guardándose en este momento. Inténtalo de nuevo.');
  }
  try {
    var resultados = filas.map(function (fila, i) {
      try {
        var v = validar_(solicitudDeFila_(fila));
        var destino = guardarEnClase_(v);
        var filaRegistro = guardarEnRegistro_(v, destino);
        return {
          n: fila.n || (i + 1), ok: true, codigo: v.codigo,
          hoja: destino.hoja, fila: destino.fila, filaRegistro: filaRegistro
        };
      } catch (err) {
        return {
          n: fila.n || (i + 1), ok: false,
          codigo: fila.codigo || fila.entrada, mensaje: err.message
        };
      }
    });
    SpreadsheetApp.flush();
    return {
      ok: true,
      resultados: resultados,
      guardadas: resultados.filter(function (r) { return r.ok; }).length,
      fallidas: resultados.filter(function (r) { return !r.ok; }).length
    };
  } finally {
    lock.releaseLock();
  }
}
