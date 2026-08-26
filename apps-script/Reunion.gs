/*******************************************************
 REUNIÓN SEMANAL
 Apuntes de la semana y plan de acción, guardados en el
 mismo libro que los datos.

 Las hojas se crean solas la primera vez. La reunión es
 semanal, así que la semana ISO es la clave de todo.
*******************************************************/

const REUNION_CONFIG = {
  SHEET_APUNTES: 'ApuntesSemana',
  SHEET_ACCIONES: 'PlanAccion',
  LOCK_MS: 15000,
  MAX_TEXTO: 8000
};

const APUNTES_HEADERS = [
  'Semana', 'Desde', 'Hasta', 'Fecha reunión', 'Participantes',
  'Foco de la semana', 'Apuntes', 'Acuerdos', 'Actualizado', 'Autor'
];

const ACCIONES_HEADERS = [
  'ID', 'Semana', 'Creada', 'Tema', 'Acción', 'Responsable',
  'Vencimiento', 'Prioridad', 'Estado', 'Notas', 'Actualizado', 'Autor'
];

const ESTADOS_ACCION = ['Pendiente', 'En curso', 'Bloqueada', 'Cerrada'];
const PRIORIDADES_ACCION = ['Alta', 'Media', 'Baja'];

/*******************************************************
 HOJAS
*******************************************************/

function getOrCreateSheet_(ss, name, headers) {
  let sh = ss.getSheetByName(name);

  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#07724e')
      .setFontColor('#FFFFFF');
    sh.setColumnWidths(1, headers.length, 150);
    return sh;
  }

  // Si la hoja existe pero está vacía, le ponemos el encabezado.
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.setFrozenRows(1);
  }

  return sh;
}

function getApuntesSheet_(ss) {
  return getOrCreateSheet_(ss, REUNION_CONFIG.SHEET_APUNTES, APUNTES_HEADERS);
}

function getAccionesSheet_(ss) {
  return getOrCreateSheet_(ss, REUNION_CONFIG.SHEET_ACCIONES, ACCIONES_HEADERS);
}

function sheetRows_(sh, headers) {
  const last = sh.getLastRow();
  if (last < 2) return [];

  const values = sh.getRange(2, 1, last - 1, headers.length).getValues();

  return values.map((row, i) => {
    const obj = { _fila: i + 2 };
    headers.forEach((h, c) => { obj[h] = row[c]; });
    return obj;
  });
}

/*******************************************************
 LECTURA
*******************************************************/

function getReunionSemanal(semanaClave) {
  const ss = getSpreadsheet_();
  const semana = normalizeWeekKey_(semanaClave) || currentWeekKey_();

  const apuntesSh = getApuntesSheet_(ss);
  const accionesSh = getAccionesSheet_(ss);

  const apuntes = sheetRows_(apuntesSh, APUNTES_HEADERS)
    .filter(r => normalizeWeekKey_(r['Semana']) === semana)[0] || null;

  const acciones = sheetRows_(accionesSh, ACCIONES_HEADERS)
    .filter(r => rawText_(r['ID']))
    .map(mapAccionRow_);

  return {
    semana,
    rango: weekRangeFromKey_(semana),
    apunte: apuntes ? {
      semana,
      fechaReunion: dateKey_(apuntes['Fecha reunión']),
      participantes: rawText_(apuntes['Participantes']),
      foco: rawText_(apuntes['Foco de la semana']),
      apuntes: rawText_(apuntes['Apuntes']),
      acuerdos: rawText_(apuntes['Acuerdos']),
      actualizado: dateKey_(apuntes['Actualizado']),
      autor: rawText_(apuntes['Autor'])
    } : null,
    // Todas las acciones abiertas viajan siempre: una acción de hace tres
    // semanas que sigue pendiente es justamente lo que hay que revisar.
    acciones,
    resumen: buildResumenSemana_(semana),
    estados: ESTADOS_ACCION,
    prioridades: PRIORIDADES_ACCION,
    semanasDisponibles: listWeekKeys_(accionesSh, apuntesSh),
    usuario: currentUserLabel_()
  };
}

function mapAccionRow_(r) {
  return {
    id: rawText_(r['ID']),
    semana: normalizeWeekKey_(r['Semana']),
    creada: dateKey_(r['Creada']),
    tema: rawText_(r['Tema']),
    accion: rawText_(r['Acción']),
    responsable: rawText_(r['Responsable']),
    vencimiento: dateKey_(r['Vencimiento']),
    prioridad: rawText_(r['Prioridad']) || 'Media',
    estado: rawText_(r['Estado']) || 'Pendiente',
    notas: rawText_(r['Notas']),
    actualizado: dateKey_(r['Actualizado']),
    autor: rawText_(r['Autor']),
    fila: r._fila
  };
}

function listWeekKeys_(accionesSh, apuntesSh) {
  const keys = {};

  sheetRows_(accionesSh, ACCIONES_HEADERS).forEach(r => {
    const k = normalizeWeekKey_(r['Semana']);
    if (k) keys[k] = true;
  });

  sheetRows_(apuntesSh, APUNTES_HEADERS).forEach(r => {
    const k = normalizeWeekKey_(r['Semana']);
    if (k) keys[k] = true;
  });

  keys[currentWeekKey_()] = true;

  return Object.keys(keys).sort().reverse();
}

/*******************************************************
 ESCRITURA
*******************************************************/

function guardarApunteSemanal(payload) {
  payload = payload || {};

  const semana = normalizeWeekKey_(payload.semana) || currentWeekKey_();
  const lock = LockService.getScriptLock();

  if (!lock.tryLock(REUNION_CONFIG.LOCK_MS)) {
    throw new Error('El libro está ocupado. Intenta de nuevo en unos segundos.');
  }

  try {
    const ss = getSpreadsheet_();
    const sh = getApuntesSheet_(ss);
    const rango = weekRangeFromKey_(semana);
    const ahora = new Date();

    const fila = [
      semana,
      rango.desde,
      rango.hasta,
      rawText_(payload.fechaReunion),
      limitText_(payload.participantes),
      limitText_(payload.foco),
      limitText_(payload.apuntes),
      limitText_(payload.acuerdos),
      Utilities.formatDate(ahora, 'America/Santiago', 'yyyy-MM-dd HH:mm'),
      currentUserLabel_()
    ];

    const existente = sheetRows_(sh, APUNTES_HEADERS)
      .filter(r => normalizeWeekKey_(r['Semana']) === semana)[0];

    if (existente) {
      sh.getRange(existente._fila, 1, 1, APUNTES_HEADERS.length).setValues([fila]);
    } else {
      sh.appendRow(fila);
    }

    return getReunionSemanal(semana);
  } finally {
    lock.releaseLock();
  }
}

function guardarAccion(payload) {
  payload = payload || {};

  const accion = limitText_(payload.accion);
  if (!accion) throw new Error('La acción no puede quedar vacía.');

  const semana = normalizeWeekKey_(payload.semana) || currentWeekKey_();
  const lock = LockService.getScriptLock();

  if (!lock.tryLock(REUNION_CONFIG.LOCK_MS)) {
    throw new Error('El libro está ocupado. Intenta de nuevo en unos segundos.');
  }

  try {
    const ss = getSpreadsheet_();
    const sh = getAccionesSheet_(ss);
    const ahora = Utilities.formatDate(new Date(), 'America/Santiago', 'yyyy-MM-dd HH:mm');
    const id = rawText_(payload.id);

    const estado = ESTADOS_ACCION.indexOf(rawText_(payload.estado)) !== -1
      ? rawText_(payload.estado) : 'Pendiente';
    const prioridad = PRIORIDADES_ACCION.indexOf(rawText_(payload.prioridad)) !== -1
      ? rawText_(payload.prioridad) : 'Media';

    if (id) {
      const existente = sheetRows_(sh, ACCIONES_HEADERS)
        .filter(r => rawText_(r['ID']) === id)[0];

      if (existente) {
        sh.getRange(existente._fila, 1, 1, ACCIONES_HEADERS.length).setValues([[
          id,
          normalizeWeekKey_(existente['Semana']) || semana,
          dateKey_(existente['Creada']) || ahora,
          limitText_(payload.tema),
          accion,
          limitText_(payload.responsable),
          rawText_(payload.vencimiento),
          prioridad,
          estado,
          limitText_(payload.notas),
          ahora,
          currentUserLabel_()
        ]]);

        return getReunionSemanal(semana);
      }
    }

    sh.appendRow([
      id || nuevoIdAccion_(),
      semana,
      ahora,
      limitText_(payload.tema),
      accion,
      limitText_(payload.responsable),
      rawText_(payload.vencimiento),
      prioridad,
      estado,
      limitText_(payload.notas),
      ahora,
      currentUserLabel_()
    ]);

    return getReunionSemanal(semana);
  } finally {
    lock.releaseLock();
  }
}

function actualizarEstadoAccion(id, estado, semana) {
  id = rawText_(id);
  if (!id) throw new Error('Falta el identificador de la acción.');

  if (ESTADOS_ACCION.indexOf(rawText_(estado)) === -1) {
    throw new Error('Estado no reconocido: ' + estado);
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(REUNION_CONFIG.LOCK_MS)) {
    throw new Error('El libro está ocupado. Intenta de nuevo en unos segundos.');
  }

  try {
    const ss = getSpreadsheet_();
    const sh = getAccionesSheet_(ss);

    const existente = sheetRows_(sh, ACCIONES_HEADERS)
      .filter(r => rawText_(r['ID']) === id)[0];

    if (!existente) throw new Error('No se encontró la acción ' + id + '.');

    const colEstado = ACCIONES_HEADERS.indexOf('Estado') + 1;
    const colActualizado = ACCIONES_HEADERS.indexOf('Actualizado') + 1;
    const colAutor = ACCIONES_HEADERS.indexOf('Autor') + 1;

    sh.getRange(existente._fila, colEstado).setValue(rawText_(estado));
    sh.getRange(existente._fila, colActualizado)
      .setValue(Utilities.formatDate(new Date(), 'America/Santiago', 'yyyy-MM-dd HH:mm'));
    sh.getRange(existente._fila, colAutor).setValue(currentUserLabel_());

    return getReunionSemanal(normalizeWeekKey_(semana) || normalizeWeekKey_(existente['Semana']));
  } finally {
    lock.releaseLock();
  }
}

function eliminarAccion(id, semana) {
  id = rawText_(id);
  if (!id) throw new Error('Falta el identificador de la acción.');

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(REUNION_CONFIG.LOCK_MS)) {
    throw new Error('El libro está ocupado. Intenta de nuevo en unos segundos.');
  }

  try {
    const ss = getSpreadsheet_();
    const sh = getAccionesSheet_(ss);

    const existente = sheetRows_(sh, ACCIONES_HEADERS)
      .filter(r => rawText_(r['ID']) === id)[0];

    if (!existente) throw new Error('No se encontró la acción ' + id + '.');

    sh.deleteRow(existente._fila);

    return getReunionSemanal(normalizeWeekKey_(semana) || currentWeekKey_());
  } finally {
    lock.releaseLock();
  }
}

/*******************************************************
 RESUMEN AUTOMÁTICO
 La reunión no debería empezar recordando qué pasó: el
 tablero lo calcula y lo deja escrito. Son hechos con
 su número al lado, no interpretaciones.
*******************************************************/

function buildResumenSemana_(semana) {
  let data;

  try {
    data = getDashboardData(false);
  } catch (err) {
    return { disponible: false, motivo: String(err && err.message || err), hechos: [] };
  }

  const analitica = data && data.analitica;
  if (!analitica) return { disponible: false, motivo: 'Sin analítica disponible.', hechos: [] };

  const semanas = analitica.semanas || [];
  const actual = semanas.filter(w => w.clave === semana)[0]
    || semanas[semanas.length - 1]
    || null;

  if (!actual) return { disponible: false, motivo: 'Sin ingresos registrados en la semana.', hechos: [] };

  const idx = semanas.indexOf(actual);
  const anterior = idx > 0 ? semanas[idx - 1] : null;
  const k = data.kpis || {};
  const conc = analitica.concentracion || {};
  const hechos = [];

  const pct = v => (Number(v || 0) * 100).toFixed(1).replace('.', ',') + '%';
  const m3 = v => Math.round(Number(v || 0)).toLocaleString('es-CL') + ' m³';

  hechos.push({
    tema: 'Volumen',
    texto: 'La semana cerró con ' + m3(actual.cubicacion) + ' en ' + actual.diasConIngreso +
      ' días con ingreso' + (anterior
        ? ', ' + (actual.cubicacion >= anterior.cubicacion ? 'sobre' : 'bajo') + ' los ' +
          m3(anterior.cubicacion) + ' de la semana anterior.'
        : '.'),
    tono: !anterior ? 'neutro' : actual.cubicacion >= anterior.cubicacion ? 'bueno' : 'alerta'
  });

  hechos.push({
    tema: 'Plan del mes',
    texto: 'Cumplimiento a la fecha ' + pct(k.cumplimientoPlan) + ' (' + m3(k.totalCubicacion) +
      ' contra un plan a fecha de ' + m3(k.planAFecha) + '). Quedan ' +
      Math.round(Number(k.diasHabilesFaltantes || 0)) + ' días hábiles.',
    tono: Number(k.cumplimientoPlan || 0) >= 1 ? 'bueno'
      : Number(k.cumplimientoPlan || 0) >= 0.9 ? 'neutro' : 'alerta'
  });

  hechos.push({
    tema: 'Cierre proyectado',
    texto: 'Al ritmo actual de ' + m3(k.ritmoDiarioActual) + ' por día hábil, el mes cierra en ' +
      m3(k.proyeccionCierreMes) + ', un ' + pct(k.cumplimientoProyectado) + ' del plan.',
    tono: Number(k.cumplimientoProyectado || 0) >= 1 ? 'bueno'
      : Number(k.cumplimientoProyectado || 0) >= 0.9 ? 'neutro' : 'alerta'
  });

  if (anterior) {
    const dif = Number(actual.participacionSiniestrado || 0) - Number(anterior.participacionSiniestrado || 0);

    hechos.push({
      tema: 'Calidad',
      texto: 'El siniestrado representa ' + pct(actual.participacionSiniestrado) +
        ' del volumen semanal (' + (dif >= 0 ? '+' : '') + pct(dif).replace('%', '') +
        ' puntos contra la semana anterior).',
      tono: dif > 0.02 ? 'alerta' : dif < -0.02 ? 'bueno' : 'neutro'
    });
  }

  hechos.push({
    tema: 'Abastecimiento',
    texto: conc.proveedoresPara80 + ' proveedores explican el 80% del volumen del mes sobre ' +
      conc.proveedoresActivos + ' activos. Concentración ' + conc.nivel +
      ' (HHI ' + Math.round(Number(conc.hhi || 0)) + '). Lidera ' + conc.lider + ' con ' +
      pct(conc.top1) + '.',
    tono: conc.nivel === 'alta' ? 'alerta' : conc.nivel === 'moderada' ? 'neutro' : 'bueno'
  });

  const bajoPlan = (data.cumplimientoProveedores || [])
    .filter(x => Number(x.plan) > 0 && Number(x.cumplimiento) < 0.8)
    .sort((a, b) => (Number(a.cumplimiento) || 0) - (Number(b.cumplimiento) || 0))
    .slice(0, 3);

  if (bajoPlan.length) {
    hechos.push({
      tema: 'Proveedores bajo plan',
      texto: bajoPlan.map(x => x.proveedor + ' (' + pct(x.cumplimiento) + ')').join(', ') +
        (bajoPlan.length === 3 ? ' entre los más rezagados contra su plan a fecha.' : ' bajo el 80% de su plan a fecha.'),
      tono: 'alerta'
    });
  }

  const outliers = (analitica.eficiencia && analitica.eficiencia.outliers) || [];
  if (outliers.length) {
    const top = outliers[0];
    hechos.push({
      tema: 'Anomalías de eficiencia',
      texto: outliers.length + ' recepciones se apartan más de 2 desviaciones de su clase de diámetro. ' +
        'La mayor: ' + top.proveedor + ' en ' + top.predio + ', ' +
        Number(top.eficiencia || 0).toFixed(3).replace('.', ',') + ' m³ por troza contra ' +
        Number(top.eficienciaEsperada || 0).toFixed(3).replace('.', ',') + ' esperados en ' + top.claseDiametro + '.',
      tono: 'neutro'
    });
  }

  return {
    disponible: true,
    semana: actual.clave,
    desde: actual.desde,
    hasta: actual.hasta,
    hechos,
    comparativo: analitica.comparativoSemanal || null,
    generado: Utilities.formatDate(new Date(), 'America/Santiago', 'dd/MM/yyyy HH:mm')
  };
}

/*******************************************************
 UTILIDADES DE SEMANA
*******************************************************/

function currentWeekKey_() {
  const info = isoWeekInfo_(new Date());
  return info ? info.clave : '';
}

function normalizeWeekKey_(value) {
  if (value instanceof Date && !isNaN(value)) {
    const info = isoWeekInfo_(value);
    return info ? info.clave : '';
  }

  const text = rawText_(value).toUpperCase();
  const m = text.match(/^(\d{4})-?W(\d{1,2})$/);
  if (!m) return '';

  return m[1] + '-W' + String(Number(m[2])).padStart(2, '0');
}

function weekRangeFromKey_(key) {
  const m = normalizeWeekKey_(key).match(/^(\d{4})-W(\d{2})$/);
  if (!m) return { desde: '', hasta: '' };

  const anio = Number(m[1]);
  const semana = Number(m[2]);

  // Jueves de la semana 1 según ISO, y de ahí al lunes buscado.
  const cuatroEnero = new Date(anio, 0, 4);
  const dow = (cuatroEnero.getDay() + 6) % 7;
  const lunesSemana1 = new Date(anio, 0, 4 - dow);

  const lunes = new Date(lunesSemana1.getTime());
  lunes.setDate(lunes.getDate() + (semana - 1) * 7);

  const domingo = new Date(lunes.getTime());
  domingo.setDate(domingo.getDate() + 6);

  return {
    desde: Utilities.formatDate(lunes, 'America/Santiago', 'yyyy-MM-dd'),
    hasta: Utilities.formatDate(domingo, 'America/Santiago', 'yyyy-MM-dd')
  };
}

function nuevoIdAccion_() {
  return 'A-' + Utilities.formatDate(new Date(), 'America/Santiago', 'yyyyMMdd-HHmmss') +
    '-' + Math.floor(Math.random() * 900 + 100);
}

function limitText_(value) {
  const text = rawText_(value);
  return text.length > REUNION_CONFIG.MAX_TEXTO
    ? text.slice(0, REUNION_CONFIG.MAX_TEXTO)
    : text;
}

function currentUserLabel_() {
  try {
    return Session.getActiveUser().getEmail() || 'sin identificar';
  } catch (err) {
    return 'sin identificar';
  }
}
