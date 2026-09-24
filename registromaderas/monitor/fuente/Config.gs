/**
 * Monitor de solicitudes.
 *
 * Es un proyecto de Apps Script aparte del de entrada. Comparten el mismo
 * spreadsheet y nada más.
 *
 * Lo único que escribe es el estado de una solicitud: el combo de la tabla.
 * Ningún otro dato se toca desde acá —ni los códigos, ni el batch input, ni la
 * bitácora de detalle—, y por eso el manifiesto pide `spreadsheets` a secas en
 * vez de `readonly`, que era lo que bastaba cuando solo miraba.
 */

const ID_SPREADSHEET = '15THGajqCDH0YuBaoEUt9uLM8s-6iKsUf9_-vY8bABmE';

const HOJAS = {
  /** Una fila por solicitud. */
  REGISTRO: 'Registro',
  /** Una fila por código, enlazada por N° Solicitud. */
  DETALLE: 'Registro Detalle'
};

/**
 * Las columnas se buscan por su rótulo, no por su posición.
 *
 * Si mañana se agrega una columna en medio, el monitor sigue andando: lo
 * único que no puede cambiar es cómo se llama cada una.
 */
const COL = {
  NUMERO: 'N° Solicitud',
  FECHA: 'Fecha',
  USUARIO: 'Usuario',
  TIPO: 'Tipo Solicitud',
  ESTADO: 'Estado',
  FECHA_CREACION: 'Fecha de creación',
  SKU: 'SKU',
  OBSERVACION: 'Observación',
  OBSERVACION_CODIFICACION: 'Observación codificación'
};

/** Lo que se muestra de cada código, cuando se despliega la solicitud. */
const COL_DETALLE_VISTA = [
  { campo: 'Código', titulo: 'Código', mono: true },
  { campo: 'Clase Requerimiento', titulo: 'Clase' },
  { campo: 'Descripción Material', titulo: 'Descripción' },
  { campo: 'Espesor', titulo: 'Esp.', mono: true },
  { campo: 'Ancho', titulo: 'Ancho', mono: true },
  { campo: 'Largo', titulo: 'Largo', mono: true },
  { campo: 'Piezas', titulo: 'PAK', mono: true },
  { campo: 'UMB', titulo: 'UMB' },
  { campo: 'Aserradero', titulo: 'Aserradero', mono: true },
  { campo: 'Secado', titulo: 'Secado', mono: true },
  { campo: 'Cepillado', titulo: 'Cepillado', mono: true },
  { campo: 'Hoja Destino', titulo: 'Hoja' },
  { campo: 'Fila Destino', titulo: 'Fila', mono: true }
];

/** Cuántas solicitudes se traen, de la más nueva hacia atrás. */
const MAXIMO_SOLICITUDES = 400;

/** Por dónde pasa una solicitud, en orden. Es lo que ofrece el combo. */
const ESTADOS = [
  'Solicitando',
  'Validando información',
  'Pendiente',
  'Creando',
  'Finalizado'
];

/**
 * Al llegar a este estado se estampa la fecha de creación, si estaba vacía.
 *
 * Es lo que evita tener que escribirla a mano en cada solicitud, y no la pisa
 * si ya estaba puesta: la primera vez que se termina manda.
 */
const ESTADO_QUE_CIERRA = 'Finalizado';

function normalizar_(texto) {
  return String(texto == null ? '' : texto)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ').trim().toLowerCase();
}
