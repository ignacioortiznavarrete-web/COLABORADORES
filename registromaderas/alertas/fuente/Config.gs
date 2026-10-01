/**
 * Alertas de codificación: los correos que tienen que salir DE ELLOS.
 *
 * Es un proyecto de Apps Script aparte del de entrada, y existe por una sola
 * razón: un correo de Apps Script sale de la cuenta con la que corre el
 * script. El formulario corre con la cuenta de quien lo publicó, así que desde
 * ahí nunca saldría un correo de codificación.
 *
 * Acá se resuelve con el alias (ver REMITENTE_ALIAS): lo instala cualquiera
 * que tenga esa dirección agregada en "Enviar como", y el correo sale con la
 * dirección de codificación aunque lo mande su cuenta. Eso importa porque a la
 * casilla corporativa no siempre se puede entrar, y porque mover el estado
 * desde ella borraría de la bitácora quién lo movió.
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
  DETALLE: 'Registro Detalle',
  /** Una fila por cambio de estado: de acá sale quién lo movió. */
  ESTADOS: 'Registro Estados'
};

/** Las columnas se buscan por su rótulo, no por su posición. */
const COL = {
  NUMERO: 'N° Solicitud',
  ESTADO: 'Estado',
  USUARIO: 'Usuario',
  /** En `Registro Estados`: cuándo se movió. */
  FECHA: 'Fecha',
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

/**
 * La dirección desde la que tiene que verse salido el correo.
 *
 * Un correo de Apps Script sale de la cuenta que corre el script, y por eso
 * este proyecto nació para que lo instalara codificación. Pero a una casilla
 * corporativa no siempre se puede entrar, y aunque se pudiera, mover el estado
 * desde ella borraría de la bitácora quién lo movió de verdad.
 *
 * La salida es el ALIAS. Si en Gmail —Configuración › Cuentas › "Enviar como"—
 * esta dirección está agregada y verificada en la cuenta que instala el
 * disparador, el correo puede salir CON ESA DIRECCIÓN aunque lo mande otra
 * cuenta. Así el estado lo mueve cada quien con su propio correo —que es lo que
 * queda anotado en `Registro Estados`— y el aviso igual se ve salido de
 * codificación.
 *
 * Vacío, o no configurado como alias: el correo sale igual, desde la cuenta que
 * corre el disparador, y `probarCorreo` lo dice en voz alta en vez de callarlo.
 */
const REMITENTE_ALIAS = 'codificacion.corporativa@masisa.com';

/** Quién firma los correos que salen de acá. */
const REMITENTE = 'Codificación · Maderas';

function normalizar_(texto) {
  return String(texto == null ? '' : texto)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ').trim().toLowerCase();
}
