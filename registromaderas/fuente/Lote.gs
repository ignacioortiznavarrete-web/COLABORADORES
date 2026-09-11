/**
 * Carga masiva: se pegan códigos, uno por línea, y de cada uno sale su fila de
 * batch input.
 *
 * Todo lo que el código dice, se deduce y no se pregunta:
 *   · especie H  -> Trading, y su centro es TCD2
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
  var bd = { codigos: {}, rutas: {}, prefijos: {} };
  if (ultima < 2) return bd;

  var valores = hoja.getRange(2, 1, ultima - 1, 4).getValues();
  for (var i = 0; i < valores.length; i++) {
    var codigo = normalizarCodigo_(valores[i][BD.MATERIAL - 1]);
    if (!codigo) continue;
    var descripcion = texto_(valores[i][BD.DESCRIPCION - 1]);

    // Qué familias existen: el prefijo de un material ya creado es válido,
    // y su TpMt y su descripción sirven para los que se creen igual.
    var pre = codigo.substring(0, 4);
    if (pre.length === 4 && !bd.prefijos[pre]) {
      bd.prefijos[pre] = {
        tipoMaterial: texto_(valores[i][BD.TIPO_MATERIAL - 1]),
        descripcion: sinMedida_(descripcion)
      };
    }

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

/** La descripción sin su medida final, que es lo que describe a la familia. */
function sinMedida_(descripcion) {
  return texto_(descripcion).replace(/\s*\d{2,4}\s*[xX]\s*\d{2,4}(\s*[xX]\s*\d{3,5})?\s*\S*\s*$/, '').trim();
}

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

/**
 * Todo lo que el código dice por sí solo, sin más fuente que BD_Maderas.
 *
 * Un prefijo vale si ya hay materiales de esa familia en la base. Si no los
 * hay, se acepta igual siempre que la nomenclatura explique sus cuatro
 * caracteres: eso permite estrenar una familia sin dejar pasar un código
 * inventado.
 */
function deducirDeCodigo_(texto, bd) {
  var partes = descomponerCodigo_(texto);
  if (!partes) {
    return {
      ok: false,
      mensaje: 'No reconozco la forma de "' + normalizarCodigo_(texto) + '". Un código va como ' +
        'PREFIJO + espesor X ancho, y si lleva largo se agrega X y cuatro dígitos.'
    };
  }

  var prefijo = prefijo_(partes.agrupacion);
  var descompuesto = descomponerPrefijo_(partes.agrupacion);
  var familia = (bd && bd.prefijos) ? bd.prefijos[prefijo] : null;

  if (!familia) {
    var sinGlosa = descompuesto.filter(function (x) {
      return x.caracter !== ' ' && !x.significado;
    });
    if (sinGlosa.length) {
      var x = sinGlosa[0];
      return {
        ok: false,
        mensaje: 'El prefijo ' + partes.agrupacion + ' no existe en ' + CFG.HOJA_BD +
          ' y su ' + x.titulo.toLowerCase() + ' ("' + x.caracter + '") tampoco está en la ' +
          'nomenclatura.'
      };
    }
  }

  var esTerceros = prefijo.charAt(3) === TRADING.ESPECIE;
  var centro = esTerceros ? TRADING.CENTRO : DEDUCCION.CENTRO_PLANTA;

  return {
    ok: true,
    codigo: armarCodigo_(partes.agrupacion, partes.espesor, partes.ancho, partes.largo),
    agrupacion: partes.agrupacion,
    agrupacionTexto: familia ? familia.descripcion : descompuesto.map(function (x) {
      return x.significado;
    }).filter(Boolean).join(' '),
    familiaConocida: !!familia,
    prefijo: prefijo,
    partes: descompuesto,
    centro: centro,
    tipoMaterial: familia && familia.tipoMaterial
      ? familia.tipoMaterial
      : (prefijo.charAt(3) === ' ' ? 'TPAS' : 'TTAS'),
    origen: esTerceros ? TRADING.ORIGEN : origenSinTerceros_(centro),
    esTerceros: esTerceros,
    clase: partes.largo
      ? DEDUCCION.CLASE_CON_LARGO
      : (prefijo.charAt(0) === 'C' ? DEDUCCION.CLASE_PROCESO_CEPILLADO : DEDUCCION.CLASE_PROCESO),
    espesor: partes.espesor,
    ancho: partes.ancho,
    largo: partes.largo,
    etapas: etapasAplicables_(partes.agrupacion)
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

  var base = deducirDeCodigo_(campos[0] || '', bd);
  if (!base.ok) {
    fila.problemas.push(base.mensaje);
    return fila;
  }
  Object.keys(base).forEach(function (k) { if (k !== 'ok') fila[k] = base[k]; });

  for (var i = 1; i < campos.length; i++) {
    var campo = campos[i];
    if (/^\d+$/.test(campo)) { fila.piezas = campo; continue; }
    var familia = familiaDeRuta_(campo);
    if (escuadriaDeRuta_(campo) && familia) fila.rutas[familia] = normalizarRuta_(campo);
  }

  // Rutas de la escuadría del producto, separadas por etapa.
  var disponibles = bd.rutas[fila.espesor + 'X' + fila.ancho] || [];
  fila.motivos = {};
  ETAPAS.forEach(function (etapa) {
    if (!fila.etapas[etapa.id]) {
      fila.motivos[etapa.id] = motivoSinEtapa_(fila, etapa.id);
      return;
    }
    fila.opciones[etapa.id] = disponibles.filter(function (r) { return r.etapa === etapa.id; });
  });
  return fila;
}

/** Por qué una etapa no pide ruta. Lo usa la pantalla para explicarlo. */
function motivoSinEtapa_(fila, etapaId) {
  var p = fila.prefijo || '';
  if (p.charAt(3) === TRADING.ESPECIE) return 'Trading: se compra hecha, no lleva ruta.';
  if (etapaId === 'cepillado') return 'Es rústico, no pasa por cepillado.';
  if (etapaId === 'secado') return 'Es verde, no pasa por secado.';
  return 'No aplica.';
}

/** Qué etapas pide al menos una fila del lote. La pantalla muestra solo esas. */
function etapasDelLote_(filas) {
  var usa = {};
  ETAPAS.forEach(function (etapa) {
    usa[etapa.id] = filas.some(function (f) {
      return f.etapas && f.etapas[etapa.id];
    });
  });
  return usa;
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
    // Se guarda de vuelta ya completa, para que la columna muestre la ruta
    // como queda escrita y no como se tecleó.
    var ruta = normalizarRuta_(fila.rutas[etapa.id]);
    fila.rutas[etapa.id] = ruta;
    if (!ruta) {
      if (RUTAS.OBLIGATORIA) fila.problemas.push('Falta la hoja de ruta de ' + etapa.titulo + '.');
      return;
    }
    if (!escuadriaDeRuta_(ruta)) {
      fila.problemas.push('La ruta de ' + etapa.titulo + ' ("' + ruta + '") no tiene la forma ' +
        'de una ruta: tres letras, un espacio y la escuadría, como RVM 019X020.');
      return;
    }
    var familia = familiaDeRuta_(ruta);
    if (familia && familia !== etapa.id) {
      fila.problemas.push('La ruta ' + ruta + ' es de ' + familia + ', no de ' + etapa.titulo + '.');
      return;
    }
    // Bajando por el proceso la madera solo se achica: una etapa puede ir
    // sobredimensionada, nunca por debajo del producto que sale de ella.
    var escuadria = escuadriaDeRuta_(ruta);
    if (Number(escuadria.substring(0, 3)) < Number(fila.espesor) ||
        Number(escuadria.substring(4)) < Number(fila.ancho)) {
      fila.problemas.push('La ruta ' + ruta + ' es de ' + escuadria + ', más chica que el ' +
        'producto (' + fila.espesor + 'X' + fila.ancho + ').');
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
    agrupacionTexto: fila.agrupacionTexto,
    espesor: fila.espesor,
    ancho: fila.ancho,
    largo: fila.largo,
    desglose: desglose,
    piezas: fila.piezas,
    umb: fila.umb || POR_DEFECTO.UMB,
    stockPedido: fila.stockPedido || POR_DEFECTO.STOCK_PEDIDO
  };
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
    etapasUsadas: etapasDelLote_(filas),
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
    etapasUsadas: etapasDelLote_(salida),
    listas: salida.filter(function (f) { return f.ok; }).length,
    conProblemas: salida.filter(function (f) { return !f.ok; }).length
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
