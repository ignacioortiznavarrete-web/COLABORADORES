/**
 * Flujo de solicitudes en 3 etapas: Costos -> T&D -> Producción.
 * Spreadsheet: SolicitudTableros.
 *
 * Reglas del flujo (iguales en las 3 etapas):
 *   - Rechazado  -> la solicitud se cierra, no avanza.
 *   - Modificado -> vuelve SIEMPRE a Costos, se resetean los estados de las 3
 *                   hojas y Costos se reabre con todos los campos cargados
 *                   más un "Ver más" con lo que ya se registró aguas abajo.
 *   - Aprobado   -> avanza a la hoja siguiente llevando SOLO el número de
 *                   solicitud (T&D después de Costos, Producción después de T&D).
 *
 * El número de solicitud es correlativo, único, y es lo único que viaja entre hojas.
 *
 * Para cambiar campos: edita `campos` de la etapa (columna = encabezado exacto en
 * la hoja) y vuelve a ejecutar `instalarSolicitudes`.
 */

const CFG = {
  SPREADSHEET_ID: '1afMUbL2OP-i3taaX33YORRPgX2kOqDAhkGzOkgcUAYg',
  HOJA_HISTORIAL: 'Historial',
  PREFIJO_SOLICITUD: 'SOL-',
  DIGITOS_CORRELATIVO: 5,
  PROP_CORRELATIVO: 'SOLICITUDES_ULTIMO_CORRELATIVO',
  SEGUNDOS_LOCK: 30
};

/**
 * Un enlace propio por formulario.
 *
 * ''            -> un solo despliegue que atiende las 3 etapas vía ?form=costos|td|produccion.
 * 'costos'      -> este despliegue ES el formulario de Costos y nada más.
 * 'td'          -> este despliegue ES el formulario de T&D y nada más.
 * 'produccion'  -> este despliegue ES el formulario de Producción y nada más.
 *
 * Cuando está fijada, la etapa se impone en el servidor: da lo mismo lo que
 * alguien escriba en la URL, ese enlace solo abre y solo guarda esa etapa.
 * Ver README ("Un enlace por formulario") para las dos formas de montarlo.
 */
const ETAPA_FIJA = '';

/**
 * URLs de los despliegues, si usas uno por formulario. Es solo informativo:
 * alimenta el menú "Ver enlaces de los formularios" y la página de inicio.
 */
const URLS_FORMULARIOS = {
  costos: '',
  td: '',
  produccion: ''
};

const ESTADOS = {
  APROBADO: 'Aprobado',
  RECHAZADO: 'Rechazado',
  MODIFICADO: 'Modificado'
};

const ESTADOS_LISTA = [ESTADOS.APROBADO, ESTADOS.RECHAZADO, ESTADOS.MODIFICADO];

/**
 * Columnas de control que el flujo agrega al final de cada hoja.
 * Son opcionales: si borras alguna de la hoja, el código sigue funcionando
 * (el registro completo siempre queda en la hoja Historial).
 */
const COL_CONTROL = ['Comentario Estado', 'Revisado Por', 'Fecha Estado', 'Registrado Por', 'Fecha Registro'];
/** Solo en la primera etapa (Costos): deja a la vista por qué volvió la solicitud. */
const COL_CONTROL_PRIMERA = ['Devuelto Por', 'Motivo Devolución', 'Versión'];

const COL_HISTORIAL = [
  'Fecha', 'N° Solicitud', 'Etapa', 'Acción', 'Estado', 'Comentario', 'Usuario', 'Versión'
];

/**
 * Etapas en orden: el orden del arreglo define el recorrido del flujo.
 *
 * columna      : encabezado EXACTO en la hoja.
 * tipo         : texto | textarea | numero | fecha | lista | email
 * soloLectura  : se muestra en el formulario pero no se edita.
 */
const ETAPAS = [
  {
    id: 'costos',
    hoja: 'Costos',
    titulo: 'Costos',
    descripcion: 'Ingreso de la solicitud. Aquí nace el número de solicitud.',
    colNumero: 'numero de solicitud',
    colEstado: 'estado de la solicitud',
    campos: [
      { id: 'tipoSolicitud', columna: 'Tipo de solicitud', etiqueta: 'Tipo de solicitud', tipo: 'texto', requerido: true },
      { id: 'solicitante', columna: 'solicitante', etiqueta: 'Solicitante', tipo: 'texto', requerido: true },
      { id: 'material', columna: 'Material', etiqueta: 'Material', tipo: 'textarea', requerido: true },
      { id: 'consultas', columna: 'consultas', etiqueta: 'Consultas', tipo: 'textarea', requerido: false },
      { id: 'respuestas', columna: 'Respuestas', etiqueta: 'Respuestas', tipo: 'textarea', requerido: false }
    ]
  },
  {
    id: 'td',
    hoja: 'T&D',
    titulo: 'T&D',
    descripcion: 'Recibe automáticamente el número de solicitud aprobado en Costos.',
    colNumero: 'numero de solicitud',
    colEstado: 'estado',
    campos: [
      { id: 'pregunta1', columna: 'pregunta1', etiqueta: 'Pregunta 1', tipo: 'textarea', requerido: true },
      { id: 'respuesta1', columna: 'respuesta1', etiqueta: 'Respuesta 1', tipo: 'textarea', requerido: true },
      { id: 'pregunta2', columna: 'pregunta2', etiqueta: 'Pregunta 2', tipo: 'textarea', requerido: false },
      { id: 'respuesta2', columna: 'respuesta2', etiqueta: 'Respuesta 2', tipo: 'textarea', requerido: false },
      { id: 'pregunta3', columna: 'pregunta3', etiqueta: 'Pregunta 3', tipo: 'textarea', requerido: false },
      { id: 'respuesta3', columna: 'respuesta3', etiqueta: 'Respuesta 3', tipo: 'textarea', requerido: false },
      { id: 'consultas', columna: 'Consultas', etiqueta: 'Consultas', tipo: 'textarea', requerido: false }
    ]
  },
  {
    id: 'produccion',
    hoja: 'Produccion',
    titulo: 'Producción',
    descripcion: 'Recibe automáticamente el número de solicitud y el estado aprobado en T&D.',
    colNumero: 'numero de solicitud',
    colEstado: 'estado',
    campos: [
      { id: 'pregunta1', columna: 'pregunta1', etiqueta: 'Pregunta', tipo: 'textarea', requerido: true },
      { id: 'respuesta', columna: 'Respuesta', etiqueta: 'Respuesta', tipo: 'textarea', requerido: true }
    ]
  }
];

/**
 * Registro de quién hizo cada cosa.
 *
 * El correo sale de Session.getActiveUser(): con la aplicación web publicada
 * como "Ejecutar como: Yo" y acceso limitado a tu dominio, Google entrega el
 * correo real de quien está usando el formulario. Así queda el registro sin
 * necesidad de darle acceso a la planilla a nadie.
 *
 * EXIGIR_IDENTIDAD: si Google no logra identificar la cuenta (pasa cuando
 *   alguien entra con un correo de otro dominio, o si publicaste la app como
 *   "Cualquier usuario"), el guardado se bloquea en vez de anotar un registro
 *   anónimo. Ponlo en false solo si prefieres registros sin autor.
 *
 * NOTAS_EN_CELDAS: además de las columnas, deja una nota en la propia celda
 *   (el cuadradito naranja de Sheets) con quién la escribió y cuándo.
 */
const AUDITORIA = {
  EXIGIR_IDENTIDAD: true,
  NOTAS_EN_CELDAS: true
};

/**
 * Control de acceso por formulario. Arreglo vacío = cualquiera con el enlace.
 * Ej: costos: ['costos@masisa.com', 'jefatura@masisa.com']
 */
const ACCESOS = {
  costos: [],
  td: [],
  produccion: []
};

function etapaPorId_(id) {
  for (var i = 0; i < ETAPAS.length; i++) {
    if (ETAPAS[i].id === id) return ETAPAS[i];
  }
  throw new Error('Etapa desconocida: ' + id);
}

/**
 * Etapa que realmente atiende esta ejecución. Si ETAPA_FIJA está definida manda
 * ella, sin importar lo que llegue desde el cliente o la URL.
 */
function etapaEfectiva_(solicitada) {
  if (ETAPA_FIJA) {
    if (indiceEtapa_(ETAPA_FIJA) === -1) {
      throw new Error('ETAPA_FIJA inválida en Config.gs: "' + ETAPA_FIJA + '".');
    }
    return ETAPA_FIJA;
  }
  var id = String(solicitada == null ? '' : solicitada).trim().toLowerCase();
  if (indiceEtapa_(id) === -1) throw new Error('Etapa desconocida: ' + solicitada);
  return id;
}

function indiceEtapa_(id) {
  for (var i = 0; i < ETAPAS.length; i++) {
    if (ETAPAS[i].id === id) return i;
  }
  return -1;
}

function etapaSiguiente_(id) {
  var i = indiceEtapa_(id);
  return (i >= 0 && i < ETAPAS.length - 1) ? ETAPAS[i + 1] : null;
}

function esPrimeraEtapa_(id) {
  return indiceEtapa_(id) === 0;
}

function primeraEtapa_() {
  return ETAPAS[0];
}

/** Encabezados que la hoja de una etapa debe tener. */
function encabezados_(etapa) {
  var cols = [etapa.colNumero];
  etapa.campos.forEach(function (c) { cols.push(c.columna); });
  cols.push(etapa.colEstado);
  cols = cols.concat(COL_CONTROL);
  if (esPrimeraEtapa_(etapa.id)) cols = cols.concat(COL_CONTROL_PRIMERA);
  return cols;
}
