/**
 * Alertas de codificación: los correos que tienen que salir DE ELLOS.
 *
 * Es un proyecto de Apps Script aparte del de entrada, y existe por una sola
 * razón: un correo de Apps Script sale siempre de la cuenta con la que corre
 * el script, y no hay forma de poner otro remitente. El formulario corre con
 * la cuenta de quien lo publicó, así que desde ahí nunca podría salir un
 * correo de codificación. Acá sí: lo instala codificación desde su cuenta, y
 * de esa cuenta salen los avisos.
 *
 * No escribe una sola celda. Mira una columna de una hoja —`Estado` en
 * `Registro`, que es donde se maneja el estado y en ninguna otra parte— y
 * manda el correo que corresponda. Los permisos lo dejan por escrito:
 * `spreadsheets.readonly`.
 */

const ID_SPREADSHEET = '15THGajqCDH0YuBaoEUt9uLM8s-6iKsUf9_-vY8bABmE';

const HOJAS = {
  /** La única hoja donde se maneja el estado. */
  REGISTRO: 'Registro',
  /** Una fila por código: de acá sale a quién escribirle y qué decirle. */
  DETALLE: 'Registro Detalle'
};

/** Las columnas se buscan por su rótulo, no por su posición. */
const COL = {
  NUMERO: 'N° Solicitud',
  ESTADO: 'Estado',
  USUARIO: 'Usuario',
  CORREO: 'Correo',
  CODIGO: 'Código',
  DESCRIPCION: 'Descripción Material',
  ESPESOR: 'Espesor',
  ANCHO: 'Ancho',
  LARGO: 'Largo',
  PIEZAS: 'Piezas',
  UMB: 'UMB'
};

/**
 * Qué estado manda qué correo.
 *
 * Hoy es uno solo: al finalizar, se le avisa a quien pidió. Está como lista
 * para que agregar otro sea agregar una entrada acá y nada más — el resto del
 * código no sabe cuántos son.
 *
 * `estado` tiene que escribirse igual que en el combo de la hoja; se compara
 * sin tildes ni mayúsculas, así que una diferencia de acento no lo rompe.
 */
const AVISOS = [
  {
    estado: 'Finalizado',
    asunto: 'Código registrado · costo plan liberado',
    encabezado: [
      'Tu solicitud {numero} quedó finalizada.',
      '',
      'Los códigos están registrados y su costo plan, liberado.'
    ]
  }
];

/** Adonde mandar al que quiera ver cómo va. Vacío = no se menciona. */
const MONITOR_URL =
  'https://script.google.com/a/macros/masisa.com/s/AKfycbw_EpqnZ262uD-5k-tnrfpjEC-d3VTlEpRF_5heoujkCZhdu2e53V8z78SlihjKBAMsLw/exec';

/** Quién firma los correos que salen de acá. */
const REMITENTE = 'Codificación · Maderas';

function normalizar_(texto) {
  return String(texto == null ? '' : texto)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ').trim().toLowerCase();
}
