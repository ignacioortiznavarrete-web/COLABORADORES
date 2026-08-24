/**
 * REGISTRO DE MADERAS — formulario de ingreso de requerimientos.
 * Spreadsheet: Maderas (15THGajqCDH0YuBaoEUt9uLM8s-6iKsUf9_-vY8bABmE).
 *
 * El formulario pregunta en este orden:
 *
 *   1. Clase de requerimiento : PT | PCP | PP   -> define la hoja de destino.
 *   2. Origen                 : Trading | Planta
 *                               Trading elige centro (TCP1 o TCD2);
 *                               Planta queda fijo en TCP1.
 *   3. Tipo de material       : TTAS | TPAS
 *   4. Código de material     : 16 caracteres, se busca en BD_Maderas y se
 *                               asocian descripción, grupo y dimensiones.
 *   5. Cantidad de piezas.
 *
 * Al guardar se escriben DOS filas:
 *   - una en la hoja de la clase (PT, PCP o PP), respetando sus columnas;
 *   - una en la hoja Registro, que es la bitácora de quién pidió qué y cuándo.
 *
 * Lo que se completa solo, sin preguntarlo:
 *   País = CL · Tipo Requerimiento = No · Clase Requerimiento = la elegida ·
 *   Llegada requerimiento = fecha y hora del ingreso · Usuario Solicitante =
 *   correo de quien está usando el formulario.
 */

const CFG = {
  SPREADSHEET_ID: '15THGajqCDH0YuBaoEUt9uLM8s-6iKsUf9_-vY8bABmE',

  HOJA_BD: 'BD_Maderas',
  HOJA_REGISTRO: 'Registro',

  /** En PT/PCP/PP la fila 1 es la numeración y la fila 2 son los rótulos. */
  FILA_ENCABEZADOS: 2,
  PRIMERA_FILA_DATOS: 3,

  SEGUNDOS_LOCK: 30,
  /** Cuánto se recuerda una búsqueda en BD_Maderas (son ~42.000 filas). */
  SEGUNDOS_CACHE: 21600
};

/** Las tres clases de requerimiento y la hoja donde cae cada una. */
const CLASES = [
  {
    id: 'PT',
    hoja: 'PT',
    titulo: 'Producto Terminado',
    descripcion: 'Producto listo para despacho.'
  },
  {
    id: 'PCP',
    hoja: 'PCP',
    titulo: 'Producto Cepillado Proceso',
    descripcion: 'Cepillado que sigue en proceso.'
  },
  {
    id: 'PP',
    hoja: 'PP',
    titulo: 'Producto de Proceso',
    descripcion: 'Material en proceso.'
  }
];

/**
 * Origen del requerimiento y centros habilitados en cada uno.
 * Si un origen tiene un solo centro, el formulario lo deja fijo y no pregunta:
 * por eso Planta entra siempre como TCP1.
 */
const ORIGENES = [
  { id: 'Trading', titulo: 'Trading', descripcion: 'Elige el centro.', centros: ['TCP1', 'TCD2'] },
  { id: 'Planta', titulo: 'Planta', descripcion: 'Centro fijo TCP1.', centros: ['TCP1'] }
];

const TIPOS_MATERIAL = ['TTAS', 'TPAS'];

const CODIGO = {
  /** Largo exacto exigido al código. Pon 0 para no validar el largo. */
  LARGO: 16,
  /** El código debe existir en BD_Maderas para poder guardar. */
  EXIGIR_EN_BD: true,
  /**
   * Si el TpMt del código en BD no coincide con el tipo de material elegido:
   * true bloquea el guardado, false solo avisa.
   */
  EXIGIR_TIPO_MATERIAL: false
};

/** Valores que se escriben siempre igual, sin preguntarlos. */
const POR_DEFECTO = {
  PAIS: 'CL',
  TIPO_REQUERIMIENTO: 'No',
  UMB: 'PZA'
};

/** Columnas de BD_Maderas (Material | Grupo art. | TpMt | Texto breve | Ce). */
const BD = {
  MATERIAL: 1,
  GRUPO: 2,
  TIPO_MATERIAL: 3,
  DESCRIPCION: 4,
  CE: 5,
  COLUMNAS: 5
};

/**
 * Qué dato del formulario va en cada columna de PT/PCP/PP.
 *
 *   clave  = encabezado EXACTO de la fila 2 de la hoja (se compara sin
 *            distinguir mayúsculas ni acentos).
 *   valor  = dato calculado en `datosParaHoja_` (Registro.gs).
 *
 * Las columnas que no aparecen aquí NO se tocan: quedan vacías para que las
 * complete el desglose. Cuando definas las asociaciones del código (aserradero,
 * secado, cepillado, empaquetado), agrégalas como líneas nuevas en este mapa.
 *
 * Nota: `PAK` recibe la cantidad de piezas por ser la única columna de conteo
 * de la hoja. Si en tu operación PAK significa otra cosa, borra esa línea: la
 * cantidad igual queda guardada en la hoja Registro.
 */
const MAPEO_DESTINO = {
  'País': 'pais',
  'Centro': 'centro',
  'Clase Requerimiento': 'clase',
  'Tipo Requerimiento': 'tipoRequerimiento',
  'Llegada requerimiento': 'fecha',
  'Usuario Solicitante': 'solicitante',
  'Espesor': 'espesor',
  'Ancho': 'ancho',
  'Largo': 'largo',
  'PAK': 'piezas',
  'UMB PZA ó M3': 'umb'
};

/** Columna de la hoja de destino que lleva la fecha (para darle formato). */
const COL_FECHA_DESTINO = 'Llegada requerimiento';

/** Encabezados de la hoja Registro. Se crean solos la primera vez. */
const COL_REGISTRO = [
  'Fecha', 'Solicitante', 'País', 'Clase Requerimiento', 'Tipo Requerimiento',
  'Origen', 'Centro', 'Tipo Material', 'Código', 'Descripción Material',
  'Grupo Artículo', 'Piezas', 'UMB', 'Espesor', 'Ancho', 'Largo',
  'Hoja Destino', 'Fila Destino'
];

/**
 * Registro de quién ingresa cada solicitud.
 *
 * El correo sale de Session.getActiveUser(): con la aplicación web publicada
 * como "Ejecutar como: Yo" y acceso limitado a tu dominio, Google entrega el
 * correo real de quien está usando el formulario.
 *
 * EXIGIR_IDENTIDAD: si Google no logra identificar la cuenta, el guardado se
 *   bloquea en vez de anotar una solicitud sin solicitante.
 */
const AUDITORIA = {
  EXIGIR_IDENTIDAD: true
};

/** Correos autorizados. Arreglo vacío = cualquiera con el enlace. */
const ACCESOS = [];

/* --------------------------------------------------------------- utilidades */

/** Compara encabezados sin distinguir mayúsculas, acentos ni espacios de más. */
function normalizar_(texto) {
  return String(texto == null ? '' : texto)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[áàä]/g, 'a').replace(/[éèë]/g, 'e').replace(/[íìï]/g, 'i')
    .replace(/[óòö]/g, 'o').replace(/[úùü]/g, 'u').replace(/ñ/g, 'n');
}

function clasePorId_(id) {
  var buscado = normalizar_(id);
  for (var i = 0; i < CLASES.length; i++) {
    if (normalizar_(CLASES[i].id) === buscado) return CLASES[i];
  }
  throw new Error('Clase de requerimiento desconocida: ' + id);
}

function origenPorId_(id) {
  var buscado = normalizar_(id);
  for (var i = 0; i < ORIGENES.length; i++) {
    if (normalizar_(ORIGENES[i].id) === buscado) return ORIGENES[i];
  }
  throw new Error('Origen desconocido: ' + id);
}

/** Centro válido para el origen. Si el origen tiene uno solo, ese manda. */
function centroEfectivo_(origen, centroPedido) {
  if (origen.centros.length === 1) return origen.centros[0];
  var buscado = normalizar_(centroPedido);
  for (var i = 0; i < origen.centros.length; i++) {
    if (normalizar_(origen.centros[i]) === buscado) return origen.centros[i];
  }
  throw new Error('El centro "' + (centroPedido || '') + '" no corresponde a ' + origen.titulo +
    '. Opciones: ' + origen.centros.join(', ') + '.');
}

function tipoMaterialEfectivo_(pedido) {
  var buscado = normalizar_(pedido);
  for (var i = 0; i < TIPOS_MATERIAL.length; i++) {
    if (normalizar_(TIPOS_MATERIAL[i]) === buscado) return TIPOS_MATERIAL[i];
  }
  throw new Error('Tipo de material desconocido: ' + pedido + '. Opciones: ' + TIPOS_MATERIAL.join(', ') + '.');
}
