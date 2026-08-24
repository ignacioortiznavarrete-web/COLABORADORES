/**
 * REGISTRO DE MADERAS — arma el código y deja lista la fila de batch input.
 * Spreadsheet: Maderas (15THGajqCDH0YuBaoEUt9uLM8s-6iKsUf9_-vY8bABmE).
 *
 * LA IDEA
 * -------
 * Nadie escribe el código de material. Se elige la agrupación y se dictan las
 * medidas, y el código se arma solo:
 *
 *     RVMH  +  032 X 180 X 3960   ->  RVMH032X180X3960
 *     └prefijo┘ └espesor┘└ancho┘└largo┘
 *
 * El prefijo son cuatro caracteres, según "MAderas Trading Estructura":
 *   1 Elaboración  C = Cepillado · R = Rústico
 *   2 Estado       V = Verde · S = Estufada · 2/3/4 = caras · B = CTS Bisel · C = CTS
 *   3 Calidad      M = Médula · J = COL B · K = Primera · N = Mill Run · ...
 *   4 Especie      H = Radiata Terceros · R = Radiata EERR · " " = producto en proceso
 * Después van espesor (3), "X", ancho (3) y, si el producto lo lleva, "X" y
 * largo (4). Con largo el código mide 16 caracteres; sin largo, 11.
 *
 * LAS CONDICIONALES
 * -----------------
 * · Centro + Tipo de material deciden QUÉ agrupaciones se pueden pedir; sale de
 *   la hoja SAP (Ce. + TpMt -> AgrupMad).
 * · El carácter 1 del prefijo decide si hay etapa de CEPILLADO (solo si es C).
 * · El carácter 2 decide si hay etapa de SECADO (no la hay si es V, verde).
 * · La etapa de ASERRADERO va siempre.
 * Las plantillas de cada etapa salen de la hoja Agrupamiento.
 *
 * LO QUE SE ESCRIBE
 * -----------------
 * Una fila completa de batch input en la hoja de la clase (PT, PCP o PP) y una
 * línea en la bitácora Registro.
 */

const CFG = {
  SPREADSHEET_ID: '15THGajqCDH0YuBaoEUt9uLM8s-6iKsUf9_-vY8bABmE',

  HOJA_BD: 'BD_Maderas',
  HOJA_SAP: 'SAP',
  HOJA_AGRUPAMIENTO: 'Agrupamiento',
  HOJA_REGISTRO: 'Registro',

  /** En PT/PCP/PP la fila 1 es la numeración y la fila 2 son los rótulos. */
  FILA_ENCABEZADOS: 2,
  PRIMERA_FILA_DATOS: 3,

  /** SAP recibe la fecha como texto. */
  FORMATO_FECHA: 'dd.MM.yyyy',

  SEGUNDOS_LOCK: 30,
  SEGUNDOS_CACHE: 21600,
  /** Tope de largos que se ofrecen al buscar variantes de una medida. */
  MAX_LARGOS: 24
};

/** Las tres clases de requerimiento y la hoja donde cae cada una. */
const CLASES = [
  { id: 'PT', hoja: 'PT', titulo: 'Producto Terminado', descripcion: 'Listo para despacho.' },
  { id: 'PCP', hoja: 'PCP', titulo: 'Producto Cepillado Proceso', descripcion: 'Cepillado que sigue en proceso.' },
  { id: 'PP', hoja: 'PP', titulo: 'Producto de Proceso', descripcion: 'Material en proceso.' }
];

/**
 * Origen del requerimiento y centros habilitados.
 * Si un origen tiene un solo centro, el formulario lo deja fijo y no pregunta:
 * por eso Planta entra siempre como TCP1.
 */
const ORIGENES = [
  { id: 'Trading', titulo: 'Trading', descripcion: 'Elige el centro.', centros: ['TCP1', 'TCD2'] },
  { id: 'Planta', titulo: 'Planta', descripcion: 'Centro fijo TCP1.', centros: ['TCP1'] }
];

const TIPOS_MATERIAL = ['TTAS', 'TPAS'];

/** Columna Z: de dónde sale el material. */
const STOCK_PEDIDO = [
  { id: 'P', titulo: 'Pedido' },
  { id: 'S', titulo: 'Stock' }
];

const UNIDADES = ['PZA', 'M3'];

/** Valores que se escriben siempre igual, sin preguntarlos. */
const POR_DEFECTO = {
  PAIS: 'CL',
  TIPO_REQUERIMIENTO: 'NO',
  UMB: 'PZA',
  STOCK_PEDIDO: 'P'
};

const MEDIDAS = {
  DIGITOS_ESPESOR: 3,
  DIGITOS_ANCHO: 3,
  DIGITOS_LARGO: 4,
  /** El código tiene que existir en BD_Maderas para poder guardar. */
  EXIGIR_EN_BD: true
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
 * Cómo se llena la fila de PT/PCP/PP.
 *
 * Va por NÚMERO de columna y no por nombre a propósito: en esas hojas los
 * rótulos "Tamaño dimensión", "EE" y "AA" se repiten tres veces (una por
 * etapa), así que buscar por nombre no distingue cuál es cuál. `encabezado` se
 * usa solo para avisar, al ejecutar instalarRegistro, si alguien movió una
 * columna de lugar.
 *
 * Las columnas que no están acá no se tocan: Descripcion Especial EN/ES (27 y
 * 28) y los rendimientos quedan como estén.
 */
const MAPEO_DESTINO = [
  { col: 1, dato: 'pais', encabezado: 'País' },
  { col: 2, dato: 'centro', encabezado: 'Centro' },
  { col: 3, dato: 'clase', encabezado: 'Clase Requerimiento' },
  { col: 4, dato: 'tipoRequerimiento', encabezado: 'Tipo Requerimiento' },
  { col: 5, dato: 'fecha', encabezado: 'Llegada requerimiento' },
  { col: 6, dato: 'solicitante', encabezado: 'Usuario Solicitante' },
  { col: 7, dato: 'aserraderoPlantilla', encabezado: 'Aserradero(Template)' },
  { col: 8, dato: 'aserraderoDimension', encabezado: 'Tamaño Dimensión' },
  { col: 9, dato: 'aserraderoEspesor', encabezado: 'EE' },
  { col: 10, dato: 'aserraderoAncho', encabezado: 'AA' },
  { col: 11, dato: 'secadoPlantilla', encabezado: 'Secado(Template)' },
  { col: 12, dato: 'secadoDimension', encabezado: 'Tamaño dimensión' },
  { col: 13, dato: 'secadoEspesor', encabezado: 'EE' },
  { col: 14, dato: 'secadoAncho', encabezado: 'AA' },
  { col: 15, dato: 'cepilladoPlantilla', encabezado: 'Cepillado(Template)' },
  { col: 16, dato: 'cepilladoDimension', encabezado: 'Tamaño dimensión' },
  { col: 17, dato: 'cepilladoEspesor', encabezado: 'EE' },
  { col: 18, dato: 'cepilladoAncho', encabezado: 'AA' },
  { col: 19, dato: 'agrupacion', encabezado: 'Empaquetado' },
  { col: 20, dato: 'dimension', encabezado: 'Tamaño dimensión' },
  { col: 21, dato: 'espesor', encabezado: 'Espesor' },
  { col: 22, dato: 'ancho', encabezado: 'Ancho' },
  { col: 23, dato: 'largo', encabezado: 'Largo' },
  { col: 24, dato: 'piezas', encabezado: 'PAK' },
  { col: 25, dato: 'umb', encabezado: 'UMB PZA ó M3' },
  { col: 26, dato: 'stockPedido', encabezado: 'Stock/Pedido toda la posicion del ID en consulta' }
];

/** Encabezados de la hoja Registro. Se crean solos la primera vez. */
const COL_REGISTRO = [
  'Fecha', 'Solicitante', 'País', 'Clase Requerimiento', 'Tipo Requerimiento',
  'Origen', 'Centro', 'Tipo Material', 'Agrupación', 'Descripción Agrupación',
  'Código', 'Descripción Material', 'Grupo Artículo',
  'Espesor', 'Ancho', 'Largo', 'Piezas', 'UMB', 'Stock/Pedido',
  'Aserradero', 'Secado', 'Cepillado', 'Hoja Destino', 'Fila Destino'
];

/**
 * Significado de cada carácter del prefijo, según la hoja
 * "MAderas Trading Estructura". El formulario lo usa para ir explicando el
 * código mientras se arma.
 */
const NOMENCLATURA = [
  {
    posicion: 1, titulo: 'Elaboración',
    valores: { 'C': 'Cepillado', 'R': 'Rústico' }
  },
  {
    posicion: 2, titulo: 'Estado',
    valores: {
      '2': 'Dos caras', '3': 'Tres caras', '4': 'Cuatro caras',
      'B': 'CTS Bisel', 'C': 'CTS', 'S': 'Estufada', 'V': 'Verde'
    }
  },
  {
    posicion: 3, titulo: 'Calidad',
    valores: {
      '2': 'Grado 2', '3': 'Grado 3', '4': 'Grado 4', 'A': 'Aprovechamiento',
      'B': 'Machimbre', 'C': 'Clear', 'D': 'FAS', 'E': 'Selecta', 'F': 'Finger',
      'G': 'Primera', 'H': 'Húmeda', 'I': 'Impregnado', 'J': 'Pecas',
      'K': 'Primera (C-1 Mueble)', 'L': 'Pallet Chep', 'M': 'Médula',
      'N': 'Mill Run', 'O': 'Otro', 'P': 'Premium', 'Q': 'Construcción',
      'R': 'Rechazo', 'S': 'Segunda (C-2 Comercial)', 'T': 'Tabique',
      'U': 'Calidad única', 'V': 'Moulding', 'W': 'Excedente de tercera',
      'Y': 'ST Mueble', 'Z': 'Mill Run M'
    }
  },
  {
    posicion: 4, titulo: 'Especie',
    valores: {
      ' ': 'Producto en proceso', 'A': 'Álamo Terceros', 'B': 'Abeto Albo Euro.',
      'C': 'Caribean EERR', 'D': 'Encino Rojo Americano', 'E': 'Eucalipto Terceros',
      'F': 'Maple del Pacífico', 'H': 'Radiata Terceros', 'K': 'Ellioti/Taeda EERR',
      'P': 'Radiata Podado', 'R': 'Radiata EERR', 'T': 'Taeda'
    }
  }
];

/**
 * Registro de quién ingresa cada solicitud.
 *
 * El correo sale de Session.getActiveUser(): con la aplicación web publicada
 * como "Ejecutar como: Yo" y acceso limitado a tu dominio, Google entrega el
 * correo real de quien está usando el formulario.
 */
const AUDITORIA = {
  EXIGIR_IDENTIDAD: true
};

/** Correos autorizados. Arreglo vacío = cualquiera con el enlace. */
const ACCESOS = [];

/* --------------------------------------------------------------- utilidades */

/** Compara rótulos sin distinguir mayúsculas, acentos ni espacios de más. */
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
  throw new Error('Tipo de material desconocido: ' + pedido +
    '. Opciones: ' + TIPOS_MATERIAL.join(', ') + '.');
}

function unoDe_(valor, lista, porDefecto) {
  var buscado = normalizar_(valor);
  for (var i = 0; i < lista.length; i++) {
    if (normalizar_(lista[i]) === buscado) return lista[i];
  }
  return porDefecto;
}
