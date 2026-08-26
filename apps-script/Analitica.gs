/*******************************************************
 ANALÍTICA
 Todo lo que el tablero necesita para analizar y no solo
 para mostrar totales: curva acumulada contra plan,
 concentración de proveedores, mezcla de calidad en el
 tiempo, anomalías de eficiencia y corte semanal.

 Se calcula una sola vez, junto con el resumen, y viaja
 en la misma caché.
*******************************************************/

const ANALITICA_CONFIG = {
  MIN_RECEPCIONES_POR_CLASE: 5,   // bajo esto una clase de diámetro no tiene con qué comparar
  Z_OUTLIER: 2,                   // desvíos estándar para marcar una recepción atípica
  MAX_OUTLIERS: 40,
  BIN_DIAMETRO_CM: 5,
  MAX_SEMANAS: 14
};

function buildAnalytics_(detalle, plan, projection) {
  detalle = detalle || [];
  plan = plan || {};
  projection = projection || { rows: [] };

  const semanas = buildWeeklySeries_(detalle, plan);

  return {
    curvaAcumulada: buildCumulativeCurve_(detalle, plan, projection),
    mixCalidadDia: buildQualityMixByDay_(detalle, plan),
    pareto: buildProviderPareto_(detalle),
    concentracion: buildConcentration_(detalle),
    eficiencia: buildEfficiencyAnalysis_(detalle),
    semanas,
    comparativoSemanal: buildWeeklyComparison_(semanas)
  };
}

/*******************************************************
 CURVA ACUMULADA: real contra plan, más el cierre
 proyectado al ritmo actual.
*******************************************************/

function buildCumulativeCurve_(detalle, plan, projection) {
  const totalDias = Number(plan.businessDaysInMonth) || 0;
  const transcurridos = Number(plan.businessDaysElapsed) || 0;
  const planDiario = Number(plan.dailyPlan) || 0;

  const realPorDia = {};
  const camionesPorDia = {};
  let maxDia = 0;

  detalle.forEach(item => {
    const dia = Number(item.dia) || 0;
    if (!dia) return;
    realPorDia[dia] = (realPorDia[dia] || 0) + (Number(item.cubicacion) || 0);
    if (dia > maxDia) maxDia = dia;
  });

  (projection.rows || []).forEach(item => {
    const dia = Number(item.dia) || 0;
    if (!dia) return;
    camionesPorDia[dia] = (camionesPorDia[dia] || 0) + (Number(item.cubicacion) || 0);
    if (dia > maxDia) maxDia = dia;
  });

  const dias = Math.max(totalDias, transcurridos, maxDia);
  if (!dias) return [];

  // Ritmo observado hasta hoy: es lo que sostiene la proyección de cierre.
  let realHastaHoy = 0;
  for (let d = 1; d <= transcurridos; d++) realHastaHoy += realPorDia[d] || 0;
  const ritmo = transcurridos ? realHastaHoy / transcurridos : 0;

  const out = [];
  let acumReal = 0;
  let acumCamiones = 0;

  for (let dia = 1; dia <= dias; dia++) {
    const real = realPorDia[dia] || 0;
    acumReal += real;
    acumCamiones += camionesPorDia[dia] || 0;

    const esFuturo = dia > transcurridos;

    out.push({
      dia,
      real,
      realAcumulado: esFuturo ? null : acumReal,
      planAcumulado: planDiario * dia,
      // La proyección arranca donde termina el dato real y sigue al ritmo actual.
      proyeccionAcumulada: esFuturo
        ? realHastaHoy + ritmo * (dia - transcurridos)
        : (dia === transcurridos ? acumReal : null),
      camionesAcumulado: acumCamiones,
      brecha: esFuturo ? null : acumReal - planDiario * dia
    });
  }

  return out;
}

/*******************************************************
 MEZCLA DE CALIDAD POR DÍA HÁBIL
 Sirve para ver si el siniestrado sube, que es lo que
 nadie quiere descubrir a fin de mes.
*******************************************************/

function buildQualityMixByDay_(detalle, plan) {
  const porDia = {};
  let maxDia = 0;

  detalle.forEach(item => {
    const dia = Number(item.dia) || 0;
    if (!dia) return;

    if (!porDia[dia]) porDia[dia] = { dia, total: 0, calidades: {} };

    const cub = Number(item.cubicacion) || 0;
    const cal = text_(item.calidad) || 'SIN CALIDAD';

    porDia[dia].total += cub;
    porDia[dia].calidades[cal] = (porDia[dia].calidades[cal] || 0) + cub;
    if (dia > maxDia) maxDia = dia;
  });

  const dias = Math.min(maxDia, Number(plan.businessDaysInMonth) || maxDia);
  const out = [];

  for (let dia = 1; dia <= dias; dia++) {
    const row = porDia[dia] || { dia, total: 0, calidades: {} };

    out.push({
      dia,
      total: row.total,
      verde: row.calidades['VERDE'] || 0,
      manchado: row.calidades['MANCHADO'] || 0,
      siniestrado: row.calidades['SINIESTRADO'] || 0,
      participacionSiniestrado: row.total ? (row.calidades['SINIESTRADO'] || 0) / row.total : 0
    });
  }

  return out;
}

/*******************************************************
 PARETO DE PROVEEDORES
 Cuántos proveedores explican el 80% del volumen.
*******************************************************/

function buildProviderPareto_(detalle) {
  const agg = {};
  let total = 0;

  detalle.forEach(item => {
    const key = item.proveedor || 'SIN PROVEEDOR';
    const cub = Number(item.cubicacion) || 0;
    if (!agg[key]) agg[key] = { proveedor: key, cubicacion: 0, trozos: 0 };
    agg[key].cubicacion += cub;
    agg[key].trozos += Number(item.trozos) || 0;
    total += cub;
  });

  const orden = Object.values(agg)
    .filter(x => x.cubicacion > 0)
    .sort((a, b) => b.cubicacion - a.cubicacion);

  let acum = 0;

  return orden.map((x, i) => {
    acum += x.cubicacion;
    return {
      proveedor: x.proveedor,
      cubicacion: x.cubicacion,
      trozos: x.trozos,
      participacion: total ? x.cubicacion / total : 0,
      acumulado: total ? acum / total : 0,
      rank: i + 1
    };
  });
}

/*******************************************************
 CONCENTRACIÓN DE ABASTECIMIENTO
 HHI y cuántos proveedores hacen el 80%: es la medida de
 riesgo si uno se cae.
*******************************************************/

function buildConcentration_(detalle) {
  const pareto = buildProviderPareto_(detalle);

  if (!pareto.length) {
    return {
      proveedoresActivos: 0,
      top1: 0, top3: 0, top5: 0,
      hhi: 0,
      nivel: 'sin datos',
      proveedoresPara80: 0,
      lider: ''
    };
  }

  const share = n => pareto.slice(0, n).reduce((s, x) => s + x.participacion, 0);
  const hhi = pareto.reduce((s, x) => s + Math.pow(x.participacion * 100, 2), 0);

  let proveedoresPara80 = pareto.length;
  for (let i = 0; i < pareto.length; i++) {
    if (pareto[i].acumulado >= 0.8) { proveedoresPara80 = i + 1; break; }
  }

  // Umbrales estándar de HHI: bajo 1500 mercado desconcentrado,
  // sobre 2500 altamente concentrado.
  const nivel = hhi >= 2500 ? 'alta' : hhi >= 1500 ? 'moderada' : 'baja';

  return {
    proveedoresActivos: pareto.length,
    top1: share(1),
    top3: share(3),
    top5: share(5),
    hhi,
    nivel,
    proveedoresPara80,
    lider: pareto[0].proveedor
  };
}

/*******************************************************
 EFICIENCIA (m³ por troza)
 Histograma y detección de recepciones atípicas.
 La eficiencia sube con el diámetro, así que comparar
 contra el promedio global solo marcaría trozos gruesos.
 La comparación se hace dentro de la clase de diámetro.
*******************************************************/

function buildEfficiencyAnalysis_(detalle) {
  const validos = detalle.filter(x => Number(x.trozos) > 0 && Number(x.cubicacion) > 0);

  if (!validos.length) {
    return { histograma: [], media: 0, desviacion: 0, outliers: [], clases: [] };
  }

  const eficiencias = validos.map(x => Number(x.eficiencia) || 0);
  const media = eficiencias.reduce((s, v) => s + v, 0) / eficiencias.length;
  const desviacion = Math.sqrt(
    eficiencias.reduce((s, v) => s + Math.pow(v - media, 2), 0) / eficiencias.length
  );

  // ── Histograma ──
  const min = Math.min.apply(null, eficiencias);
  const max = Math.max.apply(null, eficiencias);
  const nBins = Math.min(14, Math.max(6, Math.ceil(Math.sqrt(eficiencias.length))));
  const ancho = (max - min) / nBins || 1;

  const histograma = [];
  for (let i = 0; i < nBins; i++) {
    histograma.push({
      desde: min + ancho * i,
      hasta: min + ancho * (i + 1),
      recepciones: 0,
      trozos: 0,
      cubicacion: 0
    });
  }

  validos.forEach(x => {
    const idx = Math.min(nBins - 1, Math.max(0, Math.floor(((Number(x.eficiencia) || 0) - min) / ancho)));
    histograma[idx].recepciones += 1;
    histograma[idx].trozos += Number(x.trozos) || 0;
    histograma[idx].cubicacion += Number(x.cubicacion) || 0;
  });

  // ── Clases de diámetro y anomalías dentro de cada clase ──
  const bin = Number(ANALITICA_CONFIG.BIN_DIAMETRO_CM) || 5;
  const clases = {};

  validos.forEach(x => {
    const d = Number(x.diametroPromedio) || 0;
    const clase = Math.floor(d / bin) * bin;
    if (!clases[clase]) clases[clase] = { clase, valores: [], filas: [] };
    clases[clase].valores.push(Number(x.eficiencia) || 0);
    clases[clase].filas.push(x);
  });

  const outliers = [];
  const resumenClases = [];

  Object.keys(clases).forEach(k => {
    const c = clases[k];
    const n = c.valores.length;
    const mu = c.valores.reduce((s, v) => s + v, 0) / n;
    const sd = Math.sqrt(c.valores.reduce((s, v) => s + Math.pow(v - mu, 2), 0) / n);

    resumenClases.push({
      clase: c.clase,
      etiqueta: c.clase + '–' + (c.clase + bin) + ' cm',
      recepciones: n,
      eficienciaMedia: mu,
      desviacion: sd,
      cubicacion: c.filas.reduce((s, f) => s + (Number(f.cubicacion) || 0), 0)
    });

    if (n < ANALITICA_CONFIG.MIN_RECEPCIONES_POR_CLASE || !sd) return;

    c.filas.forEach((f, i) => {
      const z = (c.valores[i] - mu) / sd;
      if (Math.abs(z) < ANALITICA_CONFIG.Z_OUTLIER) return;

      outliers.push({
        proveedor: f.proveedor,
        predio: f.predio,
        comuna: f.comuna,
        calidad: f.calidad,
        fecha: f.fecha,
        diametroPromedio: f.diametroPromedio,
        claseDiametro: c.clase + '–' + (c.clase + bin) + ' cm',
        largo: f.largo,
        trozos: f.trozos,
        cubicacion: f.cubicacion,
        eficiencia: f.eficiencia,
        eficienciaEsperada: mu,
        z: z,
        signo: z > 0 ? 'sobre' : 'bajo'
      });
    });
  });

  outliers.sort((a, b) => Math.abs(b.z) - Math.abs(a.z));

  return {
    histograma,
    media,
    desviacion,
    clases: resumenClases.sort((a, b) => a.clase - b.clase),
    outliers: outliers.slice(0, ANALITICA_CONFIG.MAX_OUTLIERS),
    totalOutliers: outliers.length
  };
}

/*******************************************************
 SEMANAS
 La reunión es semanal, así que la semana es una unidad
 de análisis de primera clase y no un filtro de fechas.
*******************************************************/

function isoWeekInfo_(date) {
  if (!date || isNaN(date)) return null;

  // Norma ISO 8601: la semana empieza el lunes y la semana 1
  // es la que contiene el primer jueves del año.
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dow = (d.getDay() + 6) % 7;           // lunes = 0
  d.setDate(d.getDate() - dow + 3);           // jueves de esa semana

  const jueves = new Date(d.getTime());
  const primerJueves = new Date(jueves.getFullYear(), 0, 4);
  const pdow = (primerJueves.getDay() + 6) % 7;
  primerJueves.setDate(primerJueves.getDate() - pdow + 3);

  const semana = 1 + Math.round((jueves - primerJueves) / (7 * 24 * 3600 * 1000));

  const lunes = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  lunes.setDate(lunes.getDate() - dow);
  const domingo = new Date(lunes.getTime());
  domingo.setDate(domingo.getDate() + 6);

  return {
    anio: jueves.getFullYear(),
    semana,
    clave: jueves.getFullYear() + '-W' + String(semana).padStart(2, '0'),
    desde: Utilities.formatDate(lunes, 'America/Santiago', 'yyyy-MM-dd'),
    hasta: Utilities.formatDate(domingo, 'America/Santiago', 'yyyy-MM-dd')
  };
}

function isoWeekKeyFromValue_(value) {
  const date = parseDateKey_(value);
  const info = isoWeekInfo_(date);
  return info ? info.clave : '';
}

function buildWeeklySeries_(detalle, plan) {
  const semanas = {};

  detalle.forEach(item => {
    const date = parseDateKey_(item.fecha);
    const info = isoWeekInfo_(date);
    if (!info) return;

    if (!semanas[info.clave]) {
      semanas[info.clave] = {
        clave: info.clave,
        anio: info.anio,
        semana: info.semana,
        desde: info.desde,
        hasta: info.hasta,
        cubicacion: 0,
        trozos: 0,
        diametroPonderado: 0,
        diasConIngreso: {},
        proveedores: {},
        calidades: {}
      };
    }

    const w = semanas[info.clave];
    const cub = Number(item.cubicacion) || 0;
    const trz = Number(item.trozos) || 0;

    w.cubicacion += cub;
    w.trozos += trz;
    w.diametroPonderado += (Number(item.diametroPromedio) || 0) * trz;
    w.diasConIngreso[item.fecha] = true;
    w.proveedores[item.proveedor] = (w.proveedores[item.proveedor] || 0) + cub;

    const cal = text_(item.calidad) || 'SIN CALIDAD';
    w.calidades[cal] = (w.calidades[cal] || 0) + cub;
  });

  const dailyPlan = Number(plan.dailyPlan) || 0;

  return Object.values(semanas)
    .map(w => {
      const dias = Object.keys(w.diasConIngreso).length;
      const proveedores = Object.keys(w.proveedores);
      const lider = proveedores
        .map(p => ({ proveedor: p, cubicacion: w.proveedores[p] }))
        .sort((a, b) => b.cubicacion - a.cubicacion)[0];

      const habiles = businessDaysBetweenKeys_(w.desde, w.hasta);

      return {
        clave: w.clave,
        anio: w.anio,
        semana: w.semana,
        desde: w.desde,
        hasta: w.hasta,
        etiqueta: 'S' + w.semana,
        cubicacion: w.cubicacion,
        trozos: w.trozos,
        diametroPromedio: w.trozos ? w.diametroPonderado / w.trozos : 0,
        eficiencia: w.trozos ? w.cubicacion / w.trozos : 0,
        diasConIngreso: dias,
        diasHabiles: habiles,
        planSemana: dailyPlan * habiles,
        cumplimiento: dailyPlan && habiles ? w.cubicacion / (dailyPlan * habiles) : 0,
        proveedoresActivos: proveedores.length,
        lider: lider ? lider.proveedor : '',
        liderCubicacion: lider ? lider.cubicacion : 0,
        verde: w.calidades['VERDE'] || 0,
        manchado: w.calidades['MANCHADO'] || 0,
        siniestrado: w.calidades['SINIESTRADO'] || 0,
        participacionSiniestrado: w.cubicacion ? (w.calidades['SINIESTRADO'] || 0) / w.cubicacion : 0
      };
    })
    .sort((a, b) => (a.anio - b.anio) || (a.semana - b.semana))
    .slice(-ANALITICA_CONFIG.MAX_SEMANAS);
}

function businessDaysBetweenKeys_(desdeKey, hastaKey) {
  const desde = parseDateKey_(desdeKey);
  const hasta = parseDateKey_(hastaKey);
  if (!desde || !hasta || isNaN(desde) || isNaN(hasta)) return 0;

  let count = 0;
  const cursor = new Date(desde.getTime());

  while (cursor <= hasta) {
    if (isBusinessDay_(cursor)) count++;
    cursor.setDate(cursor.getDate() + 1);
  }

  return count;
}

/*******************************************************
 COMPARATIVO SEMANA CONTRA SEMANA
 Es el insumo de la reunión: qué cambió desde el lunes
 pasado, en hechos y no en impresiones.
*******************************************************/

function buildWeeklyComparison_(semanas) {
  semanas = semanas || [];

  const actual = semanas[semanas.length - 1] || null;
  const anterior = semanas[semanas.length - 2] || null;

  if (!actual) return { actual: null, anterior: null, deltas: [] };

  const delta = (label, a, b, formato, mejorArriba) => {
    const variacion = b ? (a - b) / Math.abs(b) : (a ? 1 : 0);
    return {
      metrica: label,
      actual: a,
      anterior: b,
      diferencia: a - b,
      variacion,
      formato: formato,
      // Con qué signo se lee: en siniestrado, subir es malo.
      direccion: a === b ? 'igual' : (a > b) === Boolean(mejorArriba) ? 'mejor' : 'peor'
    };
  };

  const b = anterior || {
    cubicacion: 0, trozos: 0, eficiencia: 0, cumplimiento: 0,
    participacionSiniestrado: 0, proveedoresActivos: 0, diametroPromedio: 0
  };

  return {
    actual,
    anterior,
    deltas: [
      delta('Cubicación de la semana', actual.cubicacion, b.cubicacion, 'm3', true),
      delta('Cumplimiento del plan semanal', actual.cumplimiento, b.cumplimiento, 'pct', true),
      delta('Trozos recibidos', actual.trozos, b.trozos, 'num', true),
      delta('Diámetro promedio', actual.diametroPromedio, b.diametroPromedio, 'cm', true),
      delta('Participación de siniestrado', actual.participacionSiniestrado, b.participacionSiniestrado, 'pct', false),
      delta('Proveedores activos', actual.proveedoresActivos, b.proveedoresActivos, 'num', true)
    ]
  };
}
