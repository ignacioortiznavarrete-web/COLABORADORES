/**
 * MESA TRADING · madera
 * Spreadsheet: Seguimiento Trading.
 *
 * La mesa junta en una sola pantalla lo que hoy vive repartido entre la tabla
 * dinámica, la Hoja Unica y los comentarios sueltos: qué pedido es, cuánto
 * volumen falta, a qué proveedor se le compra, para cuándo se comprometió y
 * qué se conversó entre ventas y compras.
 *
 * Tres decisiones de diseño explican casi todo el código:
 *
 *   1. Las columnas se buscan POR NOMBRE, nunca por posición. En la planilla
 *      real la columna 7 se llama "Puerto Destino" pero guardaba comentarios
 *      de compra; escribir por posición pisaba datos buenos.
 *
 *   2. La fecha que promete el proveedor es un CAMPO DE FECHA, no un
 *      comentario. Hoy se escribe "20 julio" o "FIN AGOSTO" en texto libre y
 *      alguien lo pasa a fecha a mano en otra hoja. `interpretarFecha_` hace
 *      esa traducción y deja el texto original a la vista.
 *
 *   3. Los comentarios se ACUMULAN en la hoja Bitacora con autor y fecha. La
 *      celda de la Hoja Unica sigue mostrando el último mensaje para que la
 *      tabla dinámica de siempre no cambie.
 */

const MESA = {
  /** Vacío = usa la planilla donde está instalado el script. */
  SPREADSHEET_ID: '',

  HOJA_BD: 'Bd',
  HOJA_PROVEEDORES: 'Proveedores',
  HOJA_MESA: 'Hoja Unica',
  HOJA_SEGUIMIENTO: 'Tabla Seguimiento',
  HOJA_BITACORA: 'Bitacora',
  HOJA_HISTORIAL: 'Historial Volumen',

  /**
   * Qué filas de Bd son de la mesa. En la planilla real la columna Origen
   * viene vacía en muchas filas, así que el filtro es tolerante: si la columna
   * Origen no existe o está vacía en TODAS las filas, se toma todo Bd y la
   * mesa lo avisa en pantalla en vez de aparecer vacía sin explicación.
   */
  FILTRO_ORIGEN: 'trading',

  /** Días de anticipación con que se clasifica la urgencia del embarque. */
  DIAS_CRITICO: 7,
  DIAS_PROXIMO: 21,

  SEGUNDOS_LOCK: 30,
  CACHE_SEGUNDOS: 45,
  CACHE_CLAVE: 'MESA_TRADING_V1'
};

/**
 * Estados de la compra. El orden es el del avance real del pedido y es el que
 * usan el tablero y el modo reunión.
 */
const ESTADOS = {
  PENDIENTE: 'Pendiente',
  NEGOCIACION: 'Negociación',
  ASIGNADO: 'Asignado',
  CONFIRMADO: 'Confirmado',
  CERRADO: 'Cerrado'
};

const ESTADOS_LISTA = [
  ESTADOS.PENDIENTE, ESTADOS.NEGOCIACION, ESTADOS.ASIGNADO,
  ESTADOS.CONFIRMADO, ESTADOS.CERRADO
];

/**
 * Colores de estado. Elegidos para que se distingan proyectados en una sala:
 * suficiente contraste con el texto oscuro y diferenciables también en
 * proyectores que lavan los colores.
 */
const COLOR_ESTADO = {
  'Pendiente':   { fondo: '#FDE8C8', texto: '#7A4A05' },
  'Negociación': { fondo: '#D6E4FF', texto: '#1B44A0' },
  'Asignado':    { fondo: '#DED8FB', texto: '#4A2FA8' },
  'Confirmado':  { fondo: '#CDEBD8', texto: '#17603A' },
  'Cerrado':     { fondo: '#E4E8EB', texto: '#44525C' }
};

/** Urgencia según cuántos días faltan para la fecha de embarque comprometida. */
const URGENCIAS = {
  VENCIDO:  { clave: 'vencido',  etiqueta: 'Vencido',  fondo: '#F9D2CE', texto: '#8C1D14' },
  CRITICO:  { clave: 'critico',  etiqueta: 'Crítico',  fondo: '#FBDCC4', texto: '#8A3D04' },
  PROXIMO:  { clave: 'proximo',  etiqueta: 'Próximo',  fondo: '#FCEFC2', texto: '#6B5104' },
  HOLGADO:  { clave: 'holgado',  etiqueta: 'Holgado',  fondo: '#E4E8EB', texto: '#44525C' },
  SIN_FECHA:{ clave: 'sin-fecha',etiqueta: 'Sin fecha',fondo: '#EDEFF1', texto: '#5A666E' }
};

/** Colores con que se pinta cada proveedor. La hoja Proveedores acepta el
 *  nombre o un HEX propio (#RRGGBB). */
const CATALOGO_COLORES = {
  'Verde':      '#B7E1CD',
  'Azul':       '#C9DAF8',
  'Naranjo':    '#FCE5CD',
  'Morado':     '#D9D2E9',
  'Amarillo':   '#FFF2CC',
  'Rojo':       '#F4C7C3',
  'Gris':       '#EFEFEF',
  'Cafe':       '#DCC5B2',
  'Rosado':     '#F4CEDD',
  'Celeste':    '#C1E7F4',
  'Fucsia':     '#F3B0F3',
  'RojoFuerte': '#F08A7A',
  'Oliva':      '#DCE6C4',
  'Turquesa':   '#BFE8E2'
};

const COLOR_SIN_PROVEEDOR = '#FFF2CC';
const COLOR_NEUTRO = '#FFFFFF';
const COLOR_ENCABEZADO = '#1F2A30';
const COLOR_ENCABEZADO_TEXTO = '#FFFFFF';

/** Columnas que la mesa necesita en Hoja Unica, con sus nombres alternativos.
 *  `crear: true` = si no está, se agrega al final sin tocar las que ya existen. */
const COL_MESA = {
  origen:      { nombre: 'Origen / Tienda',            alias: ['Hoja', 'Origen', 'Tienda'], crear: false },
  docVenta:    { nombre: 'Documento de Venta',         alias: ['PV', 'Documento de ventas', 'Pedido de venta', 'Pedido'], crear: false },
  material:    { nombre: 'Material',                   alias: ['MAterial', 'Codigo Material'], crear: false },
  texto:       { nombre: 'Texto Comercial',            alias: ['Descripcion Material', 'Descripción Material', 'Texto comercial'], crear: false },
  proveedor:   { nombre: 'Proveedor Asignado',         alias: ['Proveedor'], crear: false },
  comentario:  { nombre: 'Comentarios',                alias: ['Comentario', 'Comentario ventas'], crear: false },
  puerto:      { nombre: 'Puerto Destino',             alias: ['Puerto destino', 'Puerto de destino'], crear: false },
  estado:      { nombre: 'Estado',                     alias: ['Estado mesa'], crear: true },
  fechaProv:   { nombre: 'Fecha Compromiso Proveedor', alias: ['Fecha compromiso proveedor', 'Fecha Proveedor'], crear: true },
  comentarioC: { nombre: 'Comentarios Compra',         alias: ['Comentario compras', 'Comentarios compra'], crear: true },
  actualizado: { nombre: 'Ultima Actualizacion',       alias: ['Última Actualización'], crear: true }
};

const COL_PROVEEDORES = ['Proveedor', 'Color', 'Estado', 'Nota'];

const COL_BITACORA = [
  'Fecha', 'Clave pedido', 'Documento de venta', 'Material',
  'Area', 'Autor', 'Mensaje', 'Estado', 'Proveedor', 'Fecha compromiso'
];

const COL_HISTORIAL = [
  'Fecha registro', 'Documento de venta', 'Material', 'Texto comercial',
  'Cliente', 'Proveedor', 'Estado',
  'Volumen inicial por producir (m3)', 'Volumen actual por producir (m3)',
  'Diferencia vs inicial (m3)', 'Diferencia vs registro anterior (m3)',
  'Comentario ventas', 'Comentario compras', 'Fila Hoja Unica', 'Clave pedido'
];

/** Las dos áreas que conversan en la mesa. */
const AREAS = { VENTAS: 'Ventas', COMPRAS: 'Compras' };

// ============================================================================
// Texto
// ============================================================================

/** Minúsculas, sin acentos y sin espacios sobrantes: para comparar. */
function normalizar_(texto) {
  if (texto === null || texto === undefined) return '';
  return String(texto)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function textoDe_(valor) {
  if (valor === null || valor === undefined) return '';
  if (valor instanceof Date) return formatearFecha_(valor);
  return String(valor).trim();
}

/** Identifica un pedido: documento de venta + material. */
function clave_(docVenta, material) {
  var doc = textoDe_(docVenta);
  var mat = textoDe_(material);
  return doc && mat ? doc + '_' + mat : '';
}

// ============================================================================
// Números
// ============================================================================

/**
 * Lee los números como los escribe la planilla: formato chileno, donde el
 * punto separa miles y la coma separa decimales ("1.436,72" = 1436.72;
 * "35,001" = 35.001).
 *
 * Cuando la celda trae un número de verdad esto ni se usa: getValues() ya
 * devuelve un number. Solo entra a jugar con las celdas guardadas como texto.
 */
function numero_(valor) {
  if (typeof valor === 'number') return isNaN(valor) ? 0 : valor;
  if (valor instanceof Date) return 0;

  var texto = String(valor === null || valor === undefined ? '' : valor).trim();
  if (!texto) return 0;

  texto = texto.replace(/\s/g, '').replace(/[^0-9.,\-]/g, '');
  if (!texto) return 0;

  var hayComa = texto.indexOf(',') !== -1;
  var hayPunto = texto.indexOf('.') !== -1;

  if (hayComa) {
    // Con coma presente, la coma es el decimal y el punto es separador de miles.
    return parseFloat(texto.replace(/\./g, '').replace(',', '.')) || 0;
  }
  if (hayPunto && /^-?\d{1,3}(\.\d{3})+$/.test(texto)) {
    // "1.436" o "12.345.678": puntos cada tres dígitos, son miles.
    return parseFloat(texto.replace(/\./g, '')) || 0;
  }
  return parseFloat(texto) || 0;
}

/** 1436.723 -> "1.436,72" */
function formatearNumero_(valor, decimales) {
  var n = Number(valor || 0);
  if (isNaN(n)) n = 0;
  if (decimales === undefined) decimales = 2;

  var negativo = n < 0;
  var partes = Math.abs(n).toFixed(decimales).split('.');
  var entero = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (negativo ? '-' : '') + entero + (partes[1] ? ',' + partes[1] : '');
}

// ============================================================================
// Fechas
// ============================================================================

const MESES = {
  enero: 1, ene: 1, jan: 1,
  febrero: 2, feb: 2,
  marzo: 3, mar: 3,
  abril: 4, abr: 4, apr: 4,
  mayo: 5, may: 5,
  junio: 6, jun: 6,
  julio: 7, jul: 7,
  agosto: 8, ago: 8, aug: 8,
  septiembre: 9, setiembre: 9, sep: 9, sept: 9,
  octubre: 10, oct: 10,
  noviembre: 11, nov: 11,
  diciembre: 12, dic: 12, dec: 12
};

const MESES_NOMBRE = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function esFecha_(valor) {
  return valor instanceof Date && !isNaN(valor.getTime());
}

function fecha_(anio, mes, dia) {
  return new Date(anio, mes - 1, dia, 12, 0, 0, 0);
}

function ultimoDiaDe_(anio, mes) {
  return new Date(anio, mes, 0).getDate();
}

/** dd-MM-yyyy, el formato que ya usa la planilla. */
function formatearFecha_(valor) {
  if (!esFecha_(valor)) return '';
  var d = String(valor.getDate());
  var m = String(valor.getMonth() + 1);
  return (d.length < 2 ? '0' + d : d) + '-' + (m.length < 2 ? '0' + m : m) + '-' + valor.getFullYear();
}

/** yyyyMMdd: para ordenar y para comparar dos fechas sin depender del formato. */
function claveFecha_(valor) {
  if (!esFecha_(valor)) return '';
  var m = String(valor.getMonth() + 1);
  var d = String(valor.getDate());
  return String(valor.getFullYear()) + (m.length < 2 ? '0' + m : m) + (d.length < 2 ? '0' + d : d);
}

/**
 * Convierte a fecha lo que la gente escribe de verdad.
 *
 * Reconoce fechas normales en cualquier orden y con uno o dos dígitos
 * ("5/08/2026", "30-06-2026", "2026-06-30") y también las que están en
 * castellano ("20 julio", "20 de julio", "FIN AGOSTO", "mediados de agosto").
 *
 * Devuelve siempre un objeto para poder mostrar en pantalla qué tan segura es
 * la interpretación, en vez de inventar una fecha exacta donde no la hay:
 *
 *   { fecha, texto, confianza, aproximada }
 *   confianza: 'exacta' | 'interpretada' | 'aproximada' | 'ninguna'
 *
 * `referencia` es la fecha desde la que se resuelve un año que no vino escrito
 * (normalmente la fecha de embarque comprometida del pedido).
 */
function interpretarFecha_(valor, referencia) {
  var vacio = { fecha: null, texto: textoDe_(valor), confianza: 'ninguna', aproximada: false };

  if (valor === null || valor === undefined || valor === '') return vacio;
  if (esFecha_(valor)) {
    return { fecha: fecha_(valor.getFullYear(), valor.getMonth() + 1, valor.getDate()),
             texto: formatearFecha_(valor), confianza: 'exacta', aproximada: false };
  }

  var bruto = String(valor).trim();
  if (!bruto) return vacio;

  // Sheets a veces guarda una fecha como texto completo de JavaScript.
  if (/^[A-Z][a-z]{2} [A-Z][a-z]{2} \d{2} \d{4}/.test(bruto)) {
    var directo = new Date(bruto);
    if (esFecha_(directo)) {
      return { fecha: fecha_(directo.getFullYear(), directo.getMonth() + 1, directo.getDate()),
               texto: formatearFecha_(directo), confianza: 'exacta', aproximada: false };
    }
  }

  var t = normalizar_(bruto);
  if (!t || t === 'sin fecha' || t === 'sf' || t === '-') return vacio;

  var ref = esFecha_(referencia) ? referencia : new Date();

  // 1. Fecha numérica: d/m/aaaa, d-m-aaaa, aaaa-m-d (1 o 2 dígitos).
  var num = t.match(/(\d{1,4})[\/\-.](\d{1,2})[\/\-.](\d{1,4})/);
  if (num) {
    var a = parseInt(num[1], 10), b = parseInt(num[2], 10), c = parseInt(num[3], 10);
    var anio, mes, dia;

    if (num[1].length === 4) {          // aaaa-mm-dd
      anio = a; mes = b; dia = c;
    } else {                            // dd-mm-aaaa (lo que usa la planilla)
      dia = a; mes = b; anio = c;
      if (anio < 100) anio += 2000;
      // Si el "día" no puede serlo pero el "mes" sí, vino al revés (mm/dd).
      if (dia > 12 && mes > 12) return vacio;
      if (dia <= 12 && mes > 12) { var tmp = dia; dia = mes; mes = tmp; }
    }

    if (mes >= 1 && mes <= 12 && dia >= 1 && dia <= ultimoDiaDe_(anio, mes)) {
      return { fecha: fecha_(anio, mes, dia), texto: bruto, confianza: 'exacta', aproximada: false };
    }
    return vacio;
  }

  // 2. Mes escrito en castellano.
  var mesEncontrado = null;
  for (var nombre in MESES) {
    if (!Object.prototype.hasOwnProperty.call(MESES, nombre)) continue;
    if (new RegExp('(^|[^a-z])' + nombre + '([^a-z]|$)').test(t)) {
      // Nos quedamos con el nombre más largo que calce ("septiembre" antes que "sep").
      if (!mesEncontrado || nombre.length > mesEncontrado.largo) {
        mesEncontrado = { mes: MESES[nombre], largo: nombre.length };
      }
    }
  }
  if (!mesEncontrado) return vacio;

  var mesN = mesEncontrado.mes;
  var anioN = ref.getFullYear();
  var anioTexto = t.match(/\b(20\d{2})\b/);
  if (anioTexto) {
    anioN = parseInt(anioTexto[1], 10);
  } else if (mesN < ref.getMonth() + 1 - 6) {
    // Sin año escrito: si el mes ya quedó muy atrás, se refiere al año siguiente.
    anioN = ref.getFullYear() + 1;
  }

  // "20 julio" / "julio 20": el día es el número suelto que no sea el año.
  var dias = t.replace(/\b20\d{2}\b/g, ' ').match(/\b(\d{1,2})\b/);
  if (dias) {
    var diaN = parseInt(dias[1], 10);
    if (diaN >= 1 && diaN <= ultimoDiaDe_(anioN, mesN)) {
      return { fecha: fecha_(anioN, mesN, diaN), texto: bruto, confianza: 'interpretada', aproximada: false };
    }
  }

  // "fin de agosto", "principios de agosto", "mediados de agosto".
  if (/\b(fin|fines|final|finales|ultima|ultimos|fin de mes)\b/.test(t)) {
    return { fecha: fecha_(anioN, mesN, ultimoDiaDe_(anioN, mesN)), texto: bruto,
             confianza: 'aproximada', aproximada: true };
  }
  if (/\b(inicio|inicios|principio|principios|comienzo|comienzos|primera|primeros)\b/.test(t)) {
    return { fecha: fecha_(anioN, mesN, 1), texto: bruto, confianza: 'aproximada', aproximada: true };
  }
  if (/\b(mediados|medio|mitad|quincena)\b/.test(t)) {
    return { fecha: fecha_(anioN, mesN, 15), texto: bruto, confianza: 'aproximada', aproximada: true };
  }

  // Solo el mes: se toma el último día, que es el escenario más exigente.
  return { fecha: fecha_(anioN, mesN, ultimoDiaDe_(anioN, mesN)), texto: bruto,
           confianza: 'aproximada', aproximada: true };
}

/** Días de calendario entre dos fechas (negativo = ya pasó). */
function diasEntre_(desde, hasta) {
  if (!esFecha_(desde) || !esFecha_(hasta)) return null;
  var a = Date.UTC(desde.getFullYear(), desde.getMonth(), desde.getDate());
  var b = Date.UTC(hasta.getFullYear(), hasta.getMonth(), hasta.getDate());
  return Math.round((b - a) / 86400000);
}

function urgenciaPorDias_(dias) {
  if (dias === null || dias === undefined) return URGENCIAS.SIN_FECHA;
  if (dias < 0) return URGENCIAS.VENCIDO;
  if (dias <= MESA.DIAS_CRITICO) return URGENCIAS.CRITICO;
  if (dias <= MESA.DIAS_PROXIMO) return URGENCIAS.PROXIMO;
  return URGENCIAS.HOLGADO;
}

/** "en 12 días", "hace 3 días", "hoy". */
function textoDias_(dias) {
  if (dias === null || dias === undefined) return 'sin fecha';
  if (dias === 0) return 'hoy';
  if (dias === 1) return 'mañana';
  if (dias === -1) return 'ayer';
  return dias > 0 ? 'en ' + dias + ' días' : 'hace ' + Math.abs(dias) + ' días';
}

function nombreMes_(mes) {
  return MESES_NOMBRE[mes - 1] || '';
}

/** "1 fila quedó" / "3 filas quedaron", para que los avisos se lean bien. */
function contar_(cantidad, singular, plural) {
  return cantidad + ' ' + (cantidad === 1 ? singular : plural);
}

// ============================================================================
// Colores
// ============================================================================

function esHex_(valor) {
  return /^#[0-9a-fA-F]{6}$/.test(String(valor === null || valor === undefined ? '' : valor).trim());
}

/** Acepta el nombre del catálogo o un HEX escrito a mano. */
function colorDesde_(valor) {
  var texto = textoDe_(valor);
  if (!texto) return null;
  if (esHex_(texto)) return { nombre: texto.toUpperCase(), hex: texto.toUpperCase() };

  var buscado = normalizar_(texto).replace(/\s+/g, '');
  for (var nombre in CATALOGO_COLORES) {
    if (!Object.prototype.hasOwnProperty.call(CATALOGO_COLORES, nombre)) continue;
    if (normalizar_(nombre).replace(/\s+/g, '') === buscado) {
      return { nombre: nombre, hex: CATALOGO_COLORES[nombre] };
    }
  }
  return null;
}

function hexARgb_(hex) {
  var h = String(hex || '#FFFFFF').replace('#', '');
  return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)];
}

function rgbAHex_(r, g, b) {
  function dos(c) {
    var v = Math.max(0, Math.min(255, Math.round(c))).toString(16);
    return v.length === 1 ? '0' + v : v;
  }
  return '#' + dos(r) + dos(g) + dos(b);
}

/** Mezcla los colores de varios proveedores que comparten una misma celda. */
function mezclarColores_(listaRgb) {
  if (!listaRgb.length) return COLOR_NEUTRO;
  var r = 0, g = 0, b = 0;
  for (var i = 0; i < listaRgb.length; i++) {
    r += listaRgb[i][0]; g += listaRgb[i][1]; b += listaRgb[i][2];
  }
  return rgbAHex_(r / listaRgb.length, g / listaRgb.length, b / listaRgb.length);
}
