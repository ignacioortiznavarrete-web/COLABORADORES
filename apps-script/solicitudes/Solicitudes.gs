/**
 * Núcleo del flujo: lectura/escritura en las hojas, correlativo, transiciones
 * de estado e historial. Todas las funciones `api*` son las que invoca el HTML
 * mediante google.script.run.
 */

/* ------------------------------------------------------------------ *
 * Utilidades de hoja
 * ------------------------------------------------------------------ */

function ss_() {
  return SpreadsheetApp.openById(CFG.SPREADSHEET_ID);
}

function tz_() {
  return ss_().getSpreadsheetTimeZone() || Session.getScriptTimeZone() || 'America/Santiago';
}

/** Normaliza un encabezado para comparar sin importar mayúsculas, tildes ni espacios. */
function clave_(valor) {
  return String(valor == null ? '' : valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function leerEncabezados_(hoja) {
  var ancho = hoja.getLastColumn();
  if (!ancho || hoja.getLastRow() < 1) return [];
  return hoja.getRange(1, 1, 1, ancho).getValues()[0].map(function (v) {
    return String(v == null ? '' : v).trim();
  });
}

/** { claveNormalizada: nroColumna(1-based) } */
function mapaColumnas_(hoja) {
  var mapa = {};
  leerEncabezados_(hoja).forEach(function (h, i) {
    var k = clave_(h);
    if (k && !mapa[k]) mapa[k] = i + 1;
  });
  return mapa;
}

function colDe_(mapa, nombre) {
  return mapa[clave_(nombre)] || 0;
}

function hojaDe_(etapa) {
  var hoja = ss_().getSheetByName(etapa.hoja);
  if (!hoja) throw new Error('No existe la hoja "' + etapa.hoja + '". Ejecuta Solicitudes > Instalar / reparar hojas.');
  return hoja;
}

/** Contexto de una hoja: filas indexadas por número de solicitud. */
function ctxEtapa_(etapa) {
  var hoja = hojaDe_(etapa);
  var mapa = mapaColumnas_(hoja);
  var colNum = colDe_(mapa, etapa.colNumero);
  if (!colNum) {
    throw new Error('La hoja "' + etapa.hoja + '" no tiene la columna "' + etapa.colNumero + '".');
  }
  var ctx = { etapa: etapa, hoja: hoja, mapa: mapa, colNumero: colNum, filas: {} };
  var ultima = hoja.getLastRow();
  if (ultima < 2) return ctx;
  var ancho = hoja.getLastColumn();
  hoja.getRange(2, 1, ultima - 1, ancho).getValues().forEach(function (valores, i) {
    var numero = String(valores[colNum - 1] == null ? '' : valores[colNum - 1]).trim();
    if (!numero) return;
    ctx.filas[numero] = { indice: i + 2, valores: valores };
  });
  return ctx;
}

function ctxTodas_() {
  var ctxs = {};
  ETAPAS.forEach(function (e) { ctxs[e.id] = ctxEtapa_(e); });
  return ctxs;
}

/* ------------------------------------------------------------------ *
 * Valores
 * ------------------------------------------------------------------ */

function valorDe_(ctx, numero, columna) {
  var fila = ctx.filas[numero];
  if (!fila) return '';
  var c = colDe_(ctx.mapa, columna);
  if (!c) return '';
  var v = fila.valores[c - 1];
  return v == null ? '' : v;
}

function textoDe_(ctx, numero, columna) {
  var v = valorDe_(ctx, numero, columna);
  if (v instanceof Date) return Utilities.formatDate(v, tz_(), 'dd-MM-yyyy HH:mm');
  return String(v).trim();
}

/** Convierte el valor del formulario al tipo que corresponde escribir en la hoja. */
function valorParaHoja_(campo, valor) {
  var texto = String(valor == null ? '' : valor).trim();
  if (!texto) return '';
  if (campo.tipo === 'numero') {
    var n = Number(texto.replace(/\./g, '').replace(',', '.'));
    return isNaN(n) ? texto : n;
  }
  if (campo.tipo === 'fecha') {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
    return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : texto;
  }
  return texto;
}

/** Convierte el valor de la hoja al formato que espera el formulario. */
function valorParaFormulario_(campo, valor) {
  if (valor == null || valor === '') return '';
  if (valor instanceof Date) {
    return campo.tipo === 'fecha'
      ? Utilities.formatDate(valor, tz_(), 'yyyy-MM-dd')
      : Utilities.formatDate(valor, tz_(), 'dd-MM-yyyy HH:mm');
  }
  return String(valor);
}

/**
 * Escribe una sola celda por nombre de columna. Si la columna no existe en la
 * hoja (columna de control opcional que el usuario borró) simplemente no escribe:
 * el dato igual queda registrado en la hoja Historial.
 */
function escribirCelda_(ctx, indiceFila, columna, valor) {
  var c = colDe_(ctx.mapa, columna);
  if (!c) return;
  ctx.hoja.getRange(indiceFila, c).setValue(valor);
}

/** Devuelve el índice de fila de la solicitud en la hoja; la crea si no existe. */
function filaDe_(ctx, numero) {
  if (ctx.filas[numero]) return ctx.filas[numero].indice;
  var indice = Math.max(ctx.hoja.getLastRow(), 1) + 1;
  ctx.hoja.getRange(indice, ctx.colNumero).setValue(numero);
  ctx.filas[numero] = { indice: indice, valores: [] };
  return indice;
}

/* ------------------------------------------------------------------ *
 * Número de solicitud
 * ------------------------------------------------------------------ */

function formatearNumero_(correlativo) {
  var s = String(correlativo);
  while (s.length < CFG.DIGITOS_CORRELATIVO) s = '0' + s;
  return CFG.PREFIJO_SOLICITUD + s;
}

function correlativoDe_(valor) {
  var m = /(\d+)\s*$/.exec(String(valor == null ? '' : valor).trim());
  return m ? parseInt(m[1], 10) : 0;
}

/** Correlativo único. Debe llamarse dentro del lock de `apiGuardar`. */
function nuevoNumero_() {
  var props = PropertiesService.getScriptProperties();
  var actual = parseInt(props.getProperty(CFG.PROP_CORRELATIVO) || '0', 10) || 0;
  var enHojas = sincronizarCorrelativo_();
  var siguiente = Math.max(actual, enHojas) + 1;
  props.setProperty(CFG.PROP_CORRELATIVO, String(siguiente));
  return formatearNumero_(siguiente);
}

/* ------------------------------------------------------------------ *
 * Usuario y acceso
 * ------------------------------------------------------------------ */

function usuario_() {
  try {
    return Session.getActiveUser().getEmail() || '';
  } catch (e) {
    return '';
  }
}

function puedeAcceder_(etapaId) {
  var permitidos = (ACCESOS[etapaId] || []).map(clave_).filter(String);
  if (!permitidos.length) return true;
  return permitidos.indexOf(clave_(usuario_())) !== -1;
}

function exigirAcceso_(etapaId) {
  if (!puedeAcceder_(etapaId)) {
    throw new Error('Tu cuenta (' + (usuario_() || 'anónima') + ') no tiene acceso al formulario ' +
      etapaPorId_(etapaId).titulo + '.');
  }
}

/* ------------------------------------------------------------------ *
 * Historial
 * ------------------------------------------------------------------ */

function hojaHistorial_() {
  var ss = ss_();
  return ss.getSheetByName(CFG.HOJA_HISTORIAL) || prepararHojaHistorial_(ss);
}

function leerHistorial_() {
  var hoja = hojaHistorial_();
  if (hoja.getLastRow() < 2) return [];
  var valores = hoja.getRange(2, 1, hoja.getLastRow() - 1, COL_HISTORIAL.length).getValues();
  var eventos = [];
  valores.forEach(function (f) {
    var numero = String(f[1] || '').trim();
    if (!numero) return;
    eventos.push({
      fecha: f[0] instanceof Date ? Utilities.formatDate(f[0], tz_(), 'dd-MM-yyyy HH:mm') : String(f[0] || ''),
      numero: numero,
      etapa: String(f[2] || ''),
      etapaId: etapaIdPorTitulo_(f[2]),
      accion: String(f[3] || ''),
      estado: String(f[4] || '').trim(),
      comentario: String(f[5] || ''),
      usuario: String(f[6] || ''),
      version: Number(f[7] || 1)
    });
  });
  return eventos;
}

function etapaIdPorTitulo_(titulo) {
  var k = clave_(titulo);
  for (var i = 0; i < ETAPAS.length; i++) {
    if (clave_(ETAPAS[i].titulo) === k || clave_(ETAPAS[i].hoja) === k || ETAPAS[i].id === k) {
      return ETAPAS[i].id;
    }
  }
  return '';
}

function registrarHistorial_(numero, etapa, accion, estado, comentario, version) {
  hojaHistorial_().appendRow([
    new Date(), numero, etapa.titulo, accion, estado || '', comentario || '', usuario_(), version
  ]);
}

/**
 * Estado de devolución de una solicitud, derivado del historial.
 * Un guardado en Costos limpia la marca; un "Modificado" en cualquier etapa la activa.
 */
function devolucionDe_(numero, eventos) {
  var res = { devueltoPor: '', motivo: '', version: 1 };
  eventos.forEach(function (ev) {
    if (ev.numero !== numero) return;
    if (ev.etapaId === primeraEtapa_().id) { res.devueltoPor = ''; res.motivo = ''; }
    if (ev.estado === ESTADOS.MODIFICADO) {
      res.devueltoPor = ev.etapaId || primeraEtapa_().id;
      res.motivo = ev.comentario;
      res.version += 1;
    }
  });
  return res;
}

/* ------------------------------------------------------------------ *
 * Flujo
 * ------------------------------------------------------------------ */

function estadoEnHoja_(ctx, etapa, numero) {
  return String(valorDe_(ctx, numero, etapa.colEstado) || '').trim();
}

/**
 * Situación actual de una solicitud:
 *  - etapaActual: hoja que debe actuar ahora
 *  - cerrada / resultado
 *  - devueltoPor / motivoDevolucion: viene de un "Modificado"
 */
function flujoDe_(numero, ctxs, eventos) {
  var primera = primeraEtapa_();
  var res = {
    numero: numero,
    existe: false,
    etapaActual: primera.id,
    cerrada: false,
    resultado: '',
    estados: {},
    devueltoPor: '',
    motivoDevolucion: '',
    version: 1
  };

  if (!ctxs[primera.id].filas[numero]) return res;
  res.existe = true;

  var dev = devolucionDe_(numero, eventos || []);
  res.devueltoPor = dev.devueltoPor;
  res.motivoDevolucion = dev.motivo;
  res.version = dev.version;

  ETAPAS.forEach(function (e) { res.estados[e.id] = estadoEnHoja_(ctxs[e.id], e, numero); });

  for (var i = 0; i < ETAPAS.length; i++) {
    var e = ETAPAS[i];
    var est = res.estados[e.id];

    if (clave_(est) === clave_(ESTADOS.RECHAZADO)) {
      res.etapaActual = e.id;
      res.cerrada = true;
      res.resultado = 'Rechazada en ' + e.titulo;
      return res;
    }
    // "Modificado" escrito a mano en la hoja: se trata como devolución.
    if (clave_(est) === clave_(ESTADOS.MODIFICADO)) {
      res.etapaActual = primera.id;
      res.devueltoPor = res.devueltoPor || e.id;
      res.resultado = 'Devuelta para modificación desde ' + e.titulo;
      return res;
    }
    if (clave_(est) !== clave_(ESTADOS.APROBADO)) {
      res.etapaActual = e.id;
      res.resultado = res.devueltoPor
        ? 'Devuelta para modificación desde ' + etapaPorId_(res.devueltoPor).titulo
        : 'Pendiente en ' + e.titulo;
      return res;
    }
  }

  res.etapaActual = ETAPAS[ETAPAS.length - 1].id;
  res.cerrada = true;
  res.resultado = 'Finalizada';
  return res;
}

function datosEtapa_(etapa, ctx, numero) {
  var datos = {};
  etapa.campos.forEach(function (campo) {
    datos[campo.id] = valorParaFormulario_(campo, valorDe_(ctx, numero, campo.columna));
  });
  return {
    etapaId: etapa.id,
    titulo: etapa.titulo,
    existe: !!ctx.filas[numero],
    datos: datos,
    estado: estadoEnHoja_(ctx, etapa, numero),
    comentario: textoDe_(ctx, numero, 'Comentario Estado'),
    revisadoPor: textoDe_(ctx, numero, 'Revisado Por'),
    fechaEstado: textoDe_(ctx, numero, 'Fecha Estado'),
    registradoPor: textoDe_(ctx, numero, 'Registrado Por'),
    fechaRegistro: textoDe_(ctx, numero, 'Fecha Registro')
  };
}

function resumenSolicitud_(numero, ctxs, eventos) {
  var flujo = flujoDe_(numero, ctxs, eventos);
  var primera = primeraEtapa_();
  var ctxP = ctxs[primera.id];
  var etiquetas = [];
  primera.campos.slice(0, 2).forEach(function (campo) {
    var v = valorParaFormulario_(campo, valorDe_(ctxP, numero, campo.columna));
    if (v) etiquetas.push(v);
  });
  return {
    numero: numero,
    resumen: etiquetas.join(' · '),
    etapaActual: flujo.etapaActual,
    resultado: flujo.resultado,
    cerrada: flujo.cerrada,
    devueltoPor: flujo.devueltoPor,
    version: flujo.version
  };
}

/* ------------------------------------------------------------------ *
 * API para los formularios
 * ------------------------------------------------------------------ */

/** Metadatos del formulario de una etapa + su bandeja de solicitudes. */
function apiContexto(etapaId) {
  var etapa = etapaPorId_(etapaId);
  exigirAcceso_(etapaId);
  return {
    etapa: {
      id: etapa.id,
      titulo: etapa.titulo,
      hoja: etapa.hoja,
      descripcion: etapa.descripcion,
      esPrimera: esPrimeraEtapa_(etapa.id),
      siguiente: etapaSiguiente_(etapa.id) ? etapaSiguiente_(etapa.id).titulo : '',
      campos: etapa.campos.map(function (c) {
        return {
          id: c.id, etiqueta: c.etiqueta, tipo: c.tipo,
          requerido: !!c.requerido, opciones: c.opciones || [], ayuda: c.ayuda || ''
        };
      })
    },
    etapas: ETAPAS.map(function (e) { return { id: e.id, titulo: e.titulo }; }),
    estados: ESTADOS_LISTA,
    usuario: usuario_(),
    bandeja: apiBandeja(etapaId)
  };
}

/** Solicitudes que esta etapa debe atender ahora. */
function apiBandeja(etapaId) {
  var etapa = etapaPorId_(etapaId);
  exigirAcceso_(etapaId);
  var ctxs = ctxTodas_();
  var eventos = leerHistorial_();
  var numeros = Object.keys(ctxs[primeraEtapa_().id].filas);
  var lista = [];
  numeros.forEach(function (numero) {
    var r = resumenSolicitud_(numero, ctxs, eventos);
    if (!r.cerrada && r.etapaActual === etapa.id) lista.push(r);
  });
  lista.sort(function (a, b) { return correlativoDe_(b.numero) - correlativoDe_(a.numero); });
  return lista;
}

/** Ficha completa de una solicitud: su etapa, el avance de las demás y el historial. */
function apiObtener(etapaId, numero) {
  exigirAcceso_(etapaId);
  numero = String(numero || '').trim();
  if (!numero) throw new Error('Falta el número de solicitud.');

  var ctxs = ctxTodas_();
  var eventos = leerHistorial_();
  var flujo = flujoDe_(numero, ctxs, eventos);
  if (!flujo.existe) throw new Error('La solicitud ' + numero + ' no existe.');

  var avance = ETAPAS.map(function (e) {
    var d = datosEtapa_(e, ctxs[e.id], numero);
    d.campos = e.campos.map(function (c) { return { id: c.id, etiqueta: c.etiqueta }; });
    return d;
  });

  return {
    numero: numero,
    flujo: {
      etapaActual: flujo.etapaActual,
      etapaActualTitulo: etapaPorId_(flujo.etapaActual).titulo,
      cerrada: flujo.cerrada,
      resultado: flujo.resultado,
      devueltoPor: flujo.devueltoPor,
      devueltoPorTitulo: flujo.devueltoPor ? etapaPorId_(flujo.devueltoPor).titulo : '',
      motivoDevolucion: flujo.motivoDevolucion,
      version: flujo.version,
      estados: flujo.estados
    },
    avance: avance,
    puedeEditar: !flujo.cerrada && flujo.etapaActual === etapaId,
    historial: eventos.filter(function (ev) { return ev.numero === numero; })
  };
}

/**
 * Guarda el formulario de una etapa y aplica la transición de estado.
 *
 * payload = { etapaId, numero, datos:{campoId:valor}, estado, comentario }
 */
function apiGuardar(payload) {
  payload = payload || {};
  var etapaId = String(payload.etapaId || '');
  var etapa = etapaPorId_(etapaId);
  exigirAcceso_(etapaId);

  var estado = String(payload.estado || '').trim();
  if (ESTADOS_LISTA.map(clave_).indexOf(clave_(estado)) === -1) {
    throw new Error('Debes seleccionar un estado: ' + ESTADOS_LISTA.join(', ') + '.');
  }
  estado = ESTADOS_LISTA[ESTADOS_LISTA.map(clave_).indexOf(clave_(estado))];

  var comentario = String(payload.comentario || '').trim();
  if (clave_(estado) !== clave_(ESTADOS.APROBADO) && !comentario) {
    throw new Error('Indica el motivo para el estado "' + estado + '".');
  }

  var datos = payload.datos || {};
  var faltantes = [];
  etapa.campos.forEach(function (campo) {
    if (campo.requerido && !String(datos[campo.id] == null ? '' : datos[campo.id]).trim()) {
      faltantes.push(campo.etiqueta);
    }
  });
  if (faltantes.length) throw new Error('Completa los campos obligatorios: ' + faltantes.join(', ') + '.');

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(CFG.SEGUNDOS_LOCK * 1000)) {
    throw new Error('El sistema está procesando otra solicitud. Intenta nuevamente en unos segundos.');
  }

  try {
    var ctxs = ctxTodas_();
    var eventos = leerHistorial_();
    var numero = String(payload.numero || '').trim();
    var esNueva = false;

    if (!numero) {
      if (!esPrimeraEtapa_(etapaId)) {
        throw new Error('El formulario ' + etapa.titulo + ' solo puede trabajar sobre una solicitud existente.');
      }
      numero = nuevoNumero_();
      esNueva = true;
    } else {
      var flujoPrevio = flujoDe_(numero, ctxs, eventos);
      if (!flujoPrevio.existe) throw new Error('La solicitud ' + numero + ' no existe.');
      if (flujoPrevio.cerrada) throw new Error('La solicitud ' + numero + ' está cerrada (' + flujoPrevio.resultado + ').');
      if (flujoPrevio.etapaActual !== etapaId) {
        throw new Error('La solicitud ' + numero + ' está en ' +
          etapaPorId_(flujoPrevio.etapaActual).titulo + ', no en ' + etapa.titulo + '.');
      }
    }

    var version = devolucionDe_(numero, eventos).version;
    if (clave_(estado) === clave_(ESTADOS.MODIFICADO)) version += 1;

    var ctx = ctxs[etapaId];
    var fila = filaDe_(ctx, numero);
    var ahora = new Date();

    // 1) Campos del formulario.
    etapa.campos.forEach(function (campo) {
      escribirCelda_(ctx, fila, campo.columna, valorParaHoja_(campo, datos[campo.id]));
    });

    // 2) Datos de registro.
    if (esNueva || !textoDe_(ctx, numero, 'Fecha Registro')) {
      escribirCelda_(ctx, fila, 'Fecha Registro', ahora);
      escribirCelda_(ctx, fila, 'Registrado Por', usuario_());
    }

    // 3) Estado. "Modificado" nunca queda escrito: reinicia el flujo.
    var esModificado = clave_(estado) === clave_(ESTADOS.MODIFICADO);
    escribirCelda_(ctx, fila, etapa.colEstado, esModificado ? '' : estado);
    escribirCelda_(ctx, fila, 'Comentario Estado', comentario);
    escribirCelda_(ctx, fila, 'Revisado Por', usuario_());
    escribirCelda_(ctx, fila, 'Fecha Estado', ahora);

    // 4) Al reenviar Costos se limpia la marca de devolución previa.
    if (esPrimeraEtapa_(etapaId)) {
      var ctxP = ctxs[primeraEtapa_().id];
      var filaP = filaDe_(ctxP, numero);
      escribirCelda_(ctxP, filaP, 'Devuelto Por', '');
      escribirCelda_(ctxP, filaP, 'Motivo Devolución', '');
      escribirCelda_(ctxP, filaP, 'Versión', version);
    }

    var mensaje;

    if (esModificado) {
      // Vuelve SIEMPRE a la primera hoja y se resetean los estados de las 3 hojas.
      reiniciarEstados_(ctxs, numero);
      marcarDevolucion_(ctxs, numero, etapa, comentario, version);
      registrarHistorial_(numero, etapa, 'Devuelta para modificación', ESTADOS.MODIFICADO, comentario, version);
      mensaje = 'Solicitud ' + numero + ' devuelta a ' + primeraEtapa_().titulo +
        '. Se reiniciaron los estados de las ' + ETAPAS.length + ' hojas.';

    } else if (clave_(estado) === clave_(ESTADOS.RECHAZADO)) {
      registrarHistorial_(numero, etapa, 'Rechazada', ESTADOS.RECHAZADO, comentario, version);
      mensaje = 'Solicitud ' + numero + ' rechazada en ' + etapa.titulo + '. El flujo termina aquí.';

    } else {
      var siguiente = etapaSiguiente_(etapaId);
      if (siguiente) {
        // A la hoja siguiente viaja únicamente el número de solicitud.
        filaDe_(ctxs[siguiente.id], numero);
        registrarHistorial_(numero, etapa, 'Aprobada, pasa a ' + siguiente.titulo, ESTADOS.APROBADO, comentario, version);
        mensaje = 'Solicitud ' + numero + ' aprobada. Pasa a ' + siguiente.titulo + '.';
      } else {
        registrarHistorial_(numero, etapa, 'Aprobada, flujo finalizado', ESTADOS.APROBADO, comentario, version);
        mensaje = 'Solicitud ' + numero + ' aprobada en ' + etapa.titulo + '. Flujo finalizado.';
      }
    }

    SpreadsheetApp.flush();
    return { ok: true, numero: numero, estado: estado, mensaje: mensaje, version: version };

  } finally {
    lock.releaseLock();
  }
}

/** Deja en blanco el estado de las 3 hojas para que el flujo se rehaga desde Costos. */
function reiniciarEstados_(ctxs, numero) {
  ETAPAS.forEach(function (e) {
    var ctx = ctxs[e.id];
    if (!ctx.filas[numero]) return;   // no se crean filas que aún no existen
    var fila = ctx.filas[numero].indice;
    escribirCelda_(ctx, fila, e.colEstado, '');
  });
}

/** Marca en Costos quién devolvió la solicitud y por qué. */
function marcarDevolucion_(ctxs, numero, etapaOrigen, motivo, version) {
  var primera = primeraEtapa_();
  var ctxP = ctxs[primera.id];
  var fila = filaDe_(ctxP, numero);
  escribirCelda_(ctxP, fila, 'Devuelto Por', etapaOrigen.titulo);
  escribirCelda_(ctxP, fila, 'Motivo Devolución', motivo);
  escribirCelda_(ctxP, fila, 'Versión', version);
}
