/**
 * LANZADOR — Formulario de COSTOS
 *
 * Proyecto independiente, con su propia URL y su propio "quién tiene acceso".
 * Todo el código vive en el proyecto principal, agregado aquí como biblioteca.
 *
 * Montaje (una sola vez):
 *  1. script.google.com › Nuevo proyecto › nómbralo "Solicitudes · Costos".
 *  2. Bibliotecas (+) › pega el ID del proyecto principal › versión: la última
 *     › identificador: exactamente `Solicitudes`.
 *  3. Pega este archivo como Código.gs.
 *  4. Implementar › Nueva implementación › Aplicación web
 *       Ejecutar como: Yo
 *       Quién tiene acceso: el grupo que corresponda a Costos.
 *  5. La URL que entrega es el enlace del equipo de Costos.
 *
 * Al cambiar el proyecto principal hay que publicar una versión nueva y
 * apuntar la biblioteca a esa versión en los tres lanzadores.
 */

const ETAPA = 'costos';

function doGet() {
  return Solicitudes.renderFormulario(ETAPA);
}

/* Puentes para google.script.run: la etapa se impone aquí, el cliente no la elige. */

function apiContexto() {
  return Solicitudes.apiContexto(ETAPA);
}

function apiBandeja() {
  return Solicitudes.apiBandeja(ETAPA);
}

function apiObtener(etapaIgnorada, numero) {
  return Solicitudes.apiObtener(ETAPA, numero);
}

function apiGuardar(payload) {
  payload = payload || {};
  payload.etapaId = ETAPA;
  return Solicitudes.apiGuardar(payload);
}
