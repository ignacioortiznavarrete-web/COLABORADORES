/**
 * Tablero de Capacitacion, Becas, OTIC y Presupuesto
 * Masisa S.A. - Gestion de Personas / Formacion y Desarrollo
 *
 * Backend Apps Script. Lee las hojas del spreadsheet de BUK y entrega un
 * paquete consolidado al frontend (Index.html).
 *
 * Todo lo configurable vive en CONFIG. No hay valores de negocio escondidos
 * dentro del HTML.
 */

var CONFIG = {
  // Planilla origen. Si se deja vacio se usa la planilla activa.
  SPREADSHEET_ID: '1o7J0Z5NnlHVld2OR4DdmN8BC5vLuCJcy3nN8aMvRySY',

  // Cache. CacheService admite 100 KB por clave, por eso se guarda en trozos.
  CACHE_KEY: 'TABLERO_CAPACITACION_V1',
  CACHE_SEGUNDOS: 900,
  CACHE_CHARS_POR_TROZO: 45000,
  CACHE_MAX_TROZOS: 40,

  // Reglas de negocio OTIC.
  FONDO_INICIAL_EXCEDENTES: 193660057,
  COMISION_OTIC: 0.15,

  // Metas de gestion. Alimentan semaforos y alertas del tablero.
  META_COBERTURA: 0.80,       // % de la dotacion vigente con al menos un curso aprobado
  META_HORAS_PER_CAPITA: 16,  // horas de formacion por persona al ano
  UMBRAL_COBERTURA_CRITICA: 0.50,

  // Dotacion externa (EST / contratistas) que se controla a mano.
  DOTACION_EST_POR_DEFECTO: 100
};

/* ------------------------------------------------------------------ */
/* Punto de entrada web                                                */
/* ------------------------------------------------------------------ */

function doGet() {
  var salida = HtmlService.createTemplateFromFile('Index').evaluate();
  salida.setTitle('Tablero de Capacitacion | Masisa');
  salida.addMetaTag('viewport', 'width=device-width, initial-scale=1');
  salida.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  return salida;
}

function include(nombreArchivo) {
  return HtmlService.createHtmlOutputFromFile(nombreArchivo).getContent();
}

/* ------------------------------------------------------------------ */
/* Carga consolidada                                                   */
/* ------------------------------------------------------------------ */

function obtenerDatosConsolidados(forzarRecarga) {
  var cache = CacheService.getScriptCache();

  if (forzarRecarga) {
    limpiarCache_(cache);
  } else {
    var enCache = leerDeCache_(cache);
    if (enCache) return enCache;
  }

  var ss = abrirPlanilla_();
  if (!ss) {
    throw new Error('No se pudo abrir la planilla. Revisa el ID en CONFIG o los permisos de la cuenta.');
  }

  var capacitaciones = [];
  var dotacion = [];
  var becas = [];
  var costoOtic = [];
  var saldos = [];
  var hojasLeidas = [];

  ss.getSheets().forEach(function (hoja) {
    var nombre = hoja.getName().trim();
    var bajo = quitarAcentos_(nombre.toLowerCase());
    var filas = 0;

    if (bajo.indexOf('dotacion') !== -1) {
      dotacion = procesarDotacion_(hoja);
      filas = dotacion.length;
    } else if (bajo.indexOf('beca') !== -1) {
      becas = procesarBecas_(hoja);
      filas = becas.length;
    } else if (bajo.indexOf('otic') !== -1) {
      costoOtic = procesarCostoOtic_(hoja);
      filas = costoOtic.length;
    } else if (bajo.indexOf('saldo') !== -1 || bajo.indexOf('presupuesto') !== -1) {
      saldos = procesarSaldos_(hoja);
      filas = saldos.length;
    } else if (/(^|[^0-9])20\d{2}([^0-9]|$)/.test(nombre) || bajo === 'buk') {
      var anioHoja = (nombre.match(/20\d{2}/) || [String(new Date().getFullYear())])[0];
      var lote = procesarCapacitaciones_(hoja, anioHoja);
      capacitaciones = capacitaciones.concat(lote);
      filas = lote.length;
    } else {
      return;
    }

    hojasLeidas.push({ hoja: nombre, filas: filas });
  });

  var paquete = {
    capacitaciones: capacitaciones,
    dotacion: dotacion,
    becas: becas,
    costoOtic: costoOtic,
    saldos: saldos,
    config: {
      fondoInicialExcedentes: CONFIG.FONDO_INICIAL_EXCEDENTES,
      comisionOtic: CONFIG.COMISION_OTIC,
      metaCobertura: CONFIG.META_COBERTURA,
      metaHorasPerCapita: CONFIG.META_HORAS_PER_CAPITA,
      umbralCoberturaCritica: CONFIG.UMBRAL_COBERTURA_CRITICA,
      dotacionEstPorDefecto: CONFIG.DOTACION_EST_POR_DEFECTO
    },
    meta: {
      actualizado: new Date().toISOString(),
      planilla: ss.getName(),
      hojas: hojasLeidas
    }
  };

  guardarEnCache_(cache, paquete);
  return paquete;
}

/**
 * Diagnostico para el analista: que hojas se detectaron, con cuantas filas y
 * que encabezados quedaron sin reconocer. Se ejecuta desde el editor.
 */
function obtenerDiagnostico() {
  var ss = abrirPlanilla_();
  if (!ss) return 'No se pudo abrir la planilla.';

  var lineas = ['Planilla: ' + ss.getName(), ''];
  ss.getSheets().forEach(function (hoja) {
    var rango = hoja.getDataRange();
    var encabezados = rango.getNumRows() > 0 ? rango.getValues()[0] : [];
    lineas.push('- ' + hoja.getName() + ' (' + Math.max(0, rango.getNumRows() - 1) + ' filas)');
    lineas.push('    ' + encabezados.slice(0, 60).join(' | '));
  });

  var texto = lineas.join('\n');
  Logger.log(texto);
  return texto;
}

/* ------------------------------------------------------------------ */
/* Lectores de hoja                                                    */
/* ------------------------------------------------------------------ */

function procesarCapacitaciones_(hoja, anioPorDefecto) {
  var datos = hoja.getDataRange().getValues();
  if (!datos || datos.length < 2) return [];

  var enc = normalizarEncabezados_(datos[0]);
  var buscar = crearBuscador_(enc);

  var iNombre = buscar(['Nombre (Colaborador)', 'Responsable', 'Nombre Colaborador']);
  var iRut = buscar(['Identificador (Colaborador)', 'RUT', 'Rut']);
  var iDepto = buscar(['Departamento (Colaborador)', 'Departamento', 'Area Solicitante']);
  var iTipoOrigen = buscar(['Interno o Externo', 'Interno/Externo', 'Tipo Colaborador']);
  var iCurso = buscar(['Nombre (Curso)', 'Nombre Curso', 'Categoria de Capacitacion']);
  var iModalidad = buscar(['Modalidad del curso (Curso)', 'Modalidad']);
  var iProveedor = buscar(['Nombre (Proveedor)', 'Proveedor']);
  var iHoras = buscar(['Horas totales realizadas (Colaborador)', 'Horas de capacitacion', 'Horas']);
  var iCostoEmpresa = buscar(['Costo empresa total (Colaborador/$)', 'Valor Empresa', 'Costo Empresa']);
  var iCostoSence = buscar(['Costo sence total (Colaborador/$)', 'Valor SENCE', 'Costo Sence']);
  var iOrigenCuenta = buscar(['Origen de cuenta', 'Origen Cuenta', 'Tipo Cuenta', 'Cuenta OTIC']);
  var iRuta = buscar(['Ruta de Capacitacion', 'Categoria Cursos (Curso)', 'Categoria Curso']);
  var iGenero = buscar(['Genero', 'Sexo']);
  var iEnia = buscar(['Encuesta ENIA (Colaborador)', 'Encuesta Enia', 'Funcion del puesto']);
  var iGerencia = buscar(['Gerencia', 'Gerencia (Colaborador)']);
  var iDivision = buscar(['Trabajo - Nombre Division', 'Division']);
  var iUbicacion = buscar(['Ubicacion', 'Planta', 'Sede', 'Centro de Trabajo']);
  var iCargo = buscar(['Cargo', 'Cargo (Colaborador)']);
  var iAnio = buscar(['ANO', 'Ano']);
  var iMes = buscar(['Mes']);
  var iFecha = buscar(['Fecha inicio (Curso)', 'Fecha Inicio', 'Fecha']);

  // Respaldos por posicion, para el layout historico de la exportacion BUK.
  var iAprobado = buscar(['Aprobado (Colaborador)', 'Aprobado']);
  if (iAprobado === -1 && enc.length >= 44) iAprobado = 43;

  var iEmpresa = buscar(['Empresa', 'Empresa (Colaborador)']);
  if (iEmpresa === -1 && enc.length >= 36) iEmpresa = 35;

  var iOrigenCap = buscar(['Origen de Capacitacion', 'Origen Capacitacion']);
  if (iOrigenCap === -1 && enc.length >= 52) iOrigenCap = 51;

  var registros = [];

  for (var f = 1; f < datos.length; f++) {
    var fila = datos[f];
    if (!fila) continue;

    var nombre = texto_(fila, iNombre);
    var curso = texto_(fila, iCurso);
    if (!nombre && !curso) continue;

    var origenCap = texto_(fila, iOrigenCap) || 'No Especificado';
    var esComunidad = quitarAcentos_(origenCap.toLowerCase()).indexOf('comunidad') !== -1;

    var aprobado = false;
    if (iAprobado !== -1 && fila[iAprobado] !== undefined && fila[iAprobado] !== null && fila[iAprobado] !== '') {
      var marca = fila[iAprobado].toString().trim().toLowerCase();
      aprobado = (marca === '1' || marca === 'true' || marca === 'si' || marca === 'aprobado' || fila[iAprobado] === 1 || fila[iAprobado] === true);
    } else if (esComunidad) {
      aprobado = true;
    }

    var rut = texto_(fila, iRut);

    registros.push({
      Anio: texto_(fila, iAnio) || anioPorDefecto,
      Mes: aNumeroDeMes_(iMes !== -1 ? fila[iMes] : null, iFecha !== -1 ? fila[iFecha] : null),
      Colaborador: nombre || (esComunidad ? 'Participante Comunidad' : ''),
      Rut: rut,
      RutId: normalizarRut_(rut) || quitarAcentos_(nombre.toLowerCase()),
      Departamento: texto_(fila, iDepto),
      Gerencia: texto_(fila, iGerencia) || 'Sin Gerencia',
      Division: texto_(fila, iDivision) || 'Sin Division',
      Ubicacion: texto_(fila, iUbicacion) || texto_(fila, iDivision) || 'Sin Ubicacion',
      Cargo: texto_(fila, iCargo),
      TipoOrigen: texto_(fila, iTipoOrigen) || 'No Definido',
      OrigenCapacitacion: origenCap,
      Curso: curso,
      Modalidad: texto_(fila, iModalidad) || 'Sin Modalidad',
      Proveedor: texto_(fila, iProveedor) || 'Interno / No Informado',
      Horas: aNumero_(fila, iHoras),
      CostoEmpresa: aNumero_(fila, iCostoEmpresa),
      CostoSence: aNumero_(fila, iCostoSence),
      OrigenCuenta: texto_(fila, iOrigenCuenta) || 'Cuenta Normal',
      Categoria: texto_(fila, iRuta) || 'Sin Categoria',
      Genero: texto_(fila, iGenero) || 'No Informado',
      Enia: texto_(fila, iEnia) || 'Sin Clasificar',
      Empresa: texto_(fila, iEmpresa) || 'Sin Empresa',
      Aprobado: aprobado
    });
  }

  return registros;
}

function procesarDotacion_(hoja) {
  var datos = hoja.getDataRange().getValues();
  if (!datos || datos.length < 2) return [];

  var enc = normalizarEncabezados_(datos[0]);
  var buscar = crearBuscador_(enc);

  var iRut = buscar(['Identificador (Colaborador)', 'RUT', 'Rut']);
  var iNombre = buscar(['Nombre (Colaborador)', 'Nombre']);
  var iEnia = buscar(['Encuesta ENIA (Colaborador)', 'Encuesta Enia', 'Encuesta ENIA', 'Funcion del puesto']);
  var iGenero = buscar(['Genero', 'Sexo']);
  var iGerencia = buscar(['Gerencia']);
  var iSubdivision = buscar(['Subdivision']);
  var iDivision = buscar(['Division']);
  var iDepto = buscar(['Departamento']);
  var iCargo = buscar(['Cargo']);
  var iUbicacion = buscar(['Ubicacion', 'Planta', 'Sede']);

  var iEmpresa = buscar(['Trabajo - Nombre Division', 'Empresa', 'Empresa (Colaborador)', 'Nombre Empresa']);
  if (iEmpresa === -1 && enc.length >= 36) iEmpresa = 35;

  var iEstado = buscar(['Estado Contrato', 'Estado', 'Estatus Contrato', 'Estado del Contrato']);
  if (iEstado === -1 && enc.length >= 12) iEstado = 11;

  var personas = [];

  for (var f = 1; f < datos.length; f++) {
    var fila = datos[f];
    if (!fila) continue;
    if (!texto_(fila, iEnia) && !texto_(fila, iRut) && !texto_(fila, iNombre)) continue;

    var rut = texto_(fila, iRut);
    var nombre = texto_(fila, iNombre);
    var estado = texto_(fila, iEstado) || 'Vinculado';

    personas.push({
      Rut: rut,
      RutId: normalizarRut_(rut) || quitarAcentos_(nombre.toLowerCase()) || ('fila_' + f),
      Nombre: nombre,
      Enia: texto_(fila, iEnia) || 'Sin Clasificar',
      Empresa: texto_(fila, iEmpresa) || 'Sin Empresa',
      Genero: texto_(fila, iGenero) || 'No Informado',
      Gerencia: texto_(fila, iGerencia) || 'Sin Gerencia',
      Subdivision: texto_(fila, iSubdivision) || 'Sin Subdivision',
      Division: texto_(fila, iDivision) || 'Sin Division',
      Departamento: texto_(fila, iDepto),
      Cargo: texto_(fila, iCargo),
      Ubicacion: texto_(fila, iUbicacion) || texto_(fila, iDivision) || 'Sin Ubicacion',
      EstadoContrato: estado,
      Vigente: esContratoVigente_(estado)
    });
  }

  return personas;
}

function procesarBecas_(hoja) {
  var datos = hoja.getDataRange().getValues();
  if (!datos || datos.length < 2) return [];

  var enc = normalizarEncabezados_(datos[0]);
  var buscar = crearBuscador_(enc);

  var iAnio = buscar(['ANO', 'Ano']);
  var iMes = buscar(['MES', 'Mes']);
  var iRut = buscar(['RUT', 'Rut']);
  var iNombre = buscar(['NOMBRE COLABORADOR', 'Nombre Colaborador', 'Nombre']);
  var iCargo = buscar(['Cargo', 'CARGO']);
  var iGenero = buscar(['Genero', 'Sexo']);
  var iEmpresa = buscar(['EMPRESA', 'Empresa']);
  var iGerencia = buscar(['GERENCIA', 'Gerencia']);
  var iPrograma = buscar(['Nombre del programa:', 'Nombre del programa', 'Programa']);
  var iInstitucion = buscar(['Nombre de la institucion:', 'Nombre de la institucion', 'Institucion']);
  var iMonto = buscar(['$ BECADO EMPRESA', 'Becado Empresa', 'Monto Becado']);

  var iPct = buscar(['% Aprobado', 'Porcentaje Aprobado']);
  if (iPct === -1) {
    for (var c = 0; c < enc.length; c++) {
      if (enc[c].indexOf('%') !== -1 && enc[c].toLowerCase().indexOf('aprobado') !== -1) { iPct = c; break; }
    }
  }

  var lista = [];

  for (var f = 1; f < datos.length; f++) {
    var fila = datos[f];
    if (!fila) continue;

    var nombre = texto_(fila, iNombre);
    var rut = texto_(fila, iRut);
    if (!nombre && !rut) continue;

    lista.push({
      Anio: texto_(fila, iAnio) || String(new Date().getFullYear()),
      Mes: texto_(fila, iMes),
      MesNum: aNumeroDeMes_(iMes !== -1 ? fila[iMes] : null, null),
      Rut: rut,
      RutId: normalizarRut_(rut) || quitarAcentos_(nombre.toLowerCase()),
      Nombre: nombre,
      Cargo: texto_(fila, iCargo),
      Genero: texto_(fila, iGenero),
      Empresa: texto_(fila, iEmpresa) || 'Masisa S.A.',
      Gerencia: texto_(fila, iGerencia) || 'Sin Gerencia',
      Programa: texto_(fila, iPrograma) || 'Sin Programa',
      Institucion: texto_(fila, iInstitucion) || 'No Informada',
      PctAprobado: texto_(fila, iPct) || '',
      Monto: aNumero_(fila, iMonto)
    });
  }

  return lista;
}

function procesarCostoOtic_(hoja) {
  var datos = hoja.getDataRange().getValues();
  if (!datos || datos.length < 2) return [];

  var enc = normalizarEncabezados_(datos[0]);
  var buscar = crearBuscador_(enc);

  var iAnio = buscar(['ANO', 'Ano']);
  var iMes = buscar(['MES', 'Mes']);
  var iFecha = buscar(['FECHA REGISTRO', 'Fecha Registro', 'Fecha']);
  var iCuenta = buscar(['TIPO CUENTA', 'Tipo Cuenta']);
  var iMovimiento = buscar(['TIPO MOVIMIENTO', 'Tipo Movimiento']);
  var iCurso = buscar(['NOMBRE CURSO', 'Nombre Curso', 'Detalle']);
  var iAportado = buscar(['MONTO APORTADO', 'Monto Aportado']);
  var iOtic = buscar(['MONTO DESCONTADO OTIC', 'Monto Descontado OTIC']);
  var iEmpresa = buscar(['MONTO DESCONTADO EMPRESA', 'Monto Descontado Empresa']);

  var lista = [];

  for (var f = 1; f < datos.length; f++) {
    var fila = datos[f];
    if (!fila) continue;

    var movimiento = texto_(fila, iMovimiento) || 'Gasto Curso';
    var aportado = aNumero_(fila, iAportado);
    var descOtic = aNumero_(fila, iOtic);
    var descEmpresa = aNumero_(fila, iEmpresa);
    if (!aportado && !descOtic && !descEmpresa && !texto_(fila, iCurso)) continue;

    lista.push({
      Anio: texto_(fila, iAnio) || String(new Date().getFullYear()),
      Mes: texto_(fila, iMes),
      MesNum: aNumeroDeMes_(iMes !== -1 ? fila[iMes] : null, iFecha !== -1 ? fila[iFecha] : null),
      Fecha: texto_(fila, iFecha),
      TipoCuenta: texto_(fila, iCuenta) || 'Cuenta Normal',
      TipoMovimiento: movimiento,
      Concepto: texto_(fila, iCurso) || 'Sin Detalle',
      MontoAportado: aportado,
      DescontadoOtic: descOtic,
      DescontadoEmpresa: descEmpresa
    });
  }

  return lista;
}

function procesarSaldos_(hoja) {
  var datos = hoja.getDataRange().getValues();
  if (!datos || datos.length < 2) return [];

  var enc = normalizarEncabezados_(datos[0]);
  var buscar = crearBuscador_(enc);

  var iAnio = buscar(['ANO', 'Ano']);
  var iMes = buscar(['MES', 'Mes']);
  var iCentro = buscar(['CENTRO DE COSTO', 'Centro de Costo', 'Centro Costo', 'CONCEPTO', 'Concepto']);
  var iMovimiento = buscar(['TIPO MOVIMIENTO', 'Tipo Movimiento', 'Tipo de Movimiento']);
  var iMonto = buscar(['SALDO', 'Saldo', 'MONTO', 'Monto']);
  var iObs = buscar(['OBSERVACION', 'Observacion', 'Observaciones']);

  var lista = [];

  for (var f = 1; f < datos.length; f++) {
    var fila = datos[f];
    if (!fila) continue;

    var monto = aNumero_(fila, iMonto);
    var centro = texto_(fila, iCentro);
    if (!monto && !centro) continue;

    lista.push({
      Anio: texto_(fila, iAnio) || String(new Date().getFullYear()),
      Mes: texto_(fila, iMes),
      MesNum: aNumeroDeMes_(iMes !== -1 ? fila[iMes] : null, null),
      CentroCosto: centro || 'Capacitacion',
      TipoMovimiento: texto_(fila, iMovimiento) || 'Presupuesto Inicial',
      Monto: monto,
      Observacion: texto_(fila, iObs)
    });
  }

  return lista;
}

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

function abrirPlanilla_() {
  if (CONFIG.SPREADSHEET_ID) {
    try {
      return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    } catch (e) {
      Logger.log('No se pudo abrir por ID: ' + e);
    }
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

function quitarAcentos_(valor) {
  if (valor === null || valor === undefined) return '';
  return valor.toString()
    .replace(/[áàäâ]/g, 'a')
    .replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i')
    .replace(/[óòöô]/g, 'o')
    .replace(/[úùüû]/g, 'u')
    .replace(/[ÁÀÄÂ]/g, 'A')
    .replace(/[ÉÈËÊ]/g, 'E')
    .replace(/[ÍÌÏÎ]/g, 'I')
    .replace(/[ÓÒÖÔ]/g, 'O')
    .replace(/[ÚÙÜÛ]/g, 'U')
    .replace(/ñ/g, 'n')
    .replace(/Ñ/g, 'N');
}

function normalizarEncabezados_(fila) {
  return fila.map(function (h) {
    return h === null || h === undefined ? '' : h.toString().replace(/\s+/g, ' ').trim();
  });
}

/**
 * Devuelve una funcion que ubica una columna probando varios nombres.
 * La comparacion ignora mayusculas, acentos y espacios repetidos, para que un
 * cambio menor de encabezado en la planilla no rompa el tablero.
 */
function crearBuscador_(encabezados) {
  var indice = {};
  encabezados.forEach(function (h, i) {
    var clave = quitarAcentos_(h.toLowerCase()).replace(/[\s:]+/g, ' ').trim();
    if (clave && indice[clave] === undefined) indice[clave] = i;
  });

  return function (candidatos) {
    for (var i = 0; i < candidatos.length; i++) {
      var clave = quitarAcentos_(candidatos[i].toLowerCase()).replace(/[\s:]+/g, ' ').trim();
      if (indice[clave] !== undefined) return indice[clave];
    }
    return -1;
  };
}

function texto_(fila, indice) {
  if (indice === -1 || indice === undefined) return '';
  var valor = fila[indice];
  if (valor === null || valor === undefined) return '';
  if (valor instanceof Date) return Utilities.formatDate(valor, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return valor.toString().replace(/\s+/g, ' ').trim();
}

function aNumero_(fila, indice) {
  if (indice === -1 || indice === undefined) return 0;
  var valor = fila[indice];
  if (valor === null || valor === undefined || valor === '') return 0;
  if (typeof valor === 'number') return valor;

  // Formato chileno: 1.234.567,89 y simbolos de moneda.
  var limpio = valor.toString().replace(/[^0-9,.\-]/g, '');
  if (limpio.indexOf(',') !== -1 && limpio.indexOf('.') !== -1) {
    limpio = limpio.replace(/\./g, '').replace(',', '.');
  } else if (limpio.indexOf(',') !== -1) {
    limpio = limpio.replace(',', '.');
  } else if ((limpio.match(/\./g) || []).length > 1) {
    limpio = limpio.replace(/\./g, '');
  }

  var n = parseFloat(limpio);
  return isNaN(n) ? 0 : n;
}

/** Deja el RUT en una forma comparable: sin puntos, guion ni digito verificador. */
function normalizarRut_(valor) {
  if (!valor) return '';
  var limpio = valor.toString().toUpperCase().replace(/[^0-9K]/g, '');
  if (!limpio) return '';
  if (limpio.length > 1) limpio = limpio.substring(0, limpio.length - 1);
  return limpio.replace(/^0+/, '');
}

function aNumeroDeMes_(valorMes, valorFecha) {
  if (valorMes instanceof Date) return valorMes.getMonth() + 1;
  if (typeof valorMes === 'number' && valorMes >= 1 && valorMes <= 12) return Math.round(valorMes);

  if (valorMes) {
    var texto = quitarAcentos_(valorMes.toString().toLowerCase()).trim();
    var soloNumero = parseInt(texto, 10);
    if (!isNaN(soloNumero) && soloNumero >= 1 && soloNumero <= 12) return soloNumero;

    var nombres = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    for (var m = 0; m < nombres.length; m++) {
      if (texto.indexOf(nombres[m]) !== -1) return m + 1;
    }
  }

  if (valorFecha instanceof Date) return valorFecha.getMonth() + 1;
  return 0;
}

function esContratoVigente_(estado) {
  var e = quitarAcentos_((estado || '').toLowerCase());
  if (!e) return true;
  var termino = ['desvincul', 'inactiv', 'retirad', 'finiquit', 'egresad', 'baja', 'termin'];
  for (var i = 0; i < termino.length; i++) {
    if (e.indexOf(termino[i]) !== -1) return false;
  }
  return true;
}

/* ------------------------------------------------------------------ */
/* Cache en trozos (CacheService admite 100 KB por clave)              */
/* ------------------------------------------------------------------ */

function guardarEnCache_(cache, paquete) {
  try {
    var json = JSON.stringify(paquete);
    var trozos = Math.ceil(json.length / CONFIG.CACHE_CHARS_POR_TROZO);
    if (trozos > CONFIG.CACHE_MAX_TROZOS) return;

    var mapa = {};
    for (var i = 0; i < trozos; i++) {
      mapa[CONFIG.CACHE_KEY + '_' + i] = json.substr(i * CONFIG.CACHE_CHARS_POR_TROZO, CONFIG.CACHE_CHARS_POR_TROZO);
    }
    mapa[CONFIG.CACHE_KEY + '_n'] = String(trozos);
    cache.putAll(mapa, CONFIG.CACHE_SEGUNDOS);
  } catch (e) {
    Logger.log('No se pudo guardar en cache: ' + e);
  }
}

function leerDeCache_(cache) {
  try {
    var total = parseInt(cache.get(CONFIG.CACHE_KEY + '_n'), 10);
    if (!total || isNaN(total)) return null;

    var claves = [];
    for (var i = 0; i < total; i++) claves.push(CONFIG.CACHE_KEY + '_' + i);

    var partes = cache.getAll(claves);
    var json = '';
    for (var j = 0; j < total; j++) {
      var parte = partes[CONFIG.CACHE_KEY + '_' + j];
      if (parte === undefined || parte === null) return null; // expiro un trozo
      json += parte;
    }
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

function limpiarCache_(cache) {
  try {
    var claves = [CONFIG.CACHE_KEY + '_n'];
    for (var i = 0; i < CONFIG.CACHE_MAX_TROZOS; i++) claves.push(CONFIG.CACHE_KEY + '_' + i);
    cache.removeAll(claves);
  } catch (e) {
    Logger.log('No se pudo limpiar la cache: ' + e);
  }
}
