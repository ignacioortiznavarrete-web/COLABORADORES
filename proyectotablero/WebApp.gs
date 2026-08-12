/**
 * Publicación web. Hay dos formas de montarlo (ver README):
 *
 * A) Un enlace por formulario  (ETAPA_FIJA definida en Config.gs)
 *    Cada despliegue atiende una sola etapa y la impone en el servidor:
 *    .../exec  -> siempre el formulario de esa etapa, se escriba lo que se escriba en la URL.
 *
 * B) Un solo despliegue para los tres (ETAPA_FIJA = '')
 *    .../exec?form=costos | ?form=td | ?form=produccion
 *    Sin parámetro muestra el selector.
 */

function doGet(e) {
  var params = (e && e.parameter) || {};

  if (ETAPA_FIJA) return renderFormulario(ETAPA_FIJA);

  var etapaId = String(params.form || params.etapa || '').trim().toLowerCase();
  if (etapaId && indiceEtapa_(etapaId) !== -1) return renderFormulario(etapaId);

  var inicio = HtmlService.createTemplateFromFile('Inicio');
  inicio.etapas = ETAPAS.map(function (x) {
    return {
      id: x.id,
      titulo: x.titulo,
      descripcion: x.descripcion,
      hoja: x.hoja,
      url: (URLS_FORMULARIOS && URLS_FORMULARIOS[x.id]) || ('?form=' + x.id)
    };
  });
  return inicio.evaluate()
    .setTitle('Solicitudes · Flujo Costos → T&D → Producción')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Entrega el formulario de una etapa. Es pública para que los proyectos
 * lanzadores (un enlace por formulario, opción A del README) puedan llamarla
 * cuando este proyecto se usa como biblioteca.
 */
function renderFormulario(etapaId) {
  var etapa = etapaPorId_(etapaEfectiva_(etapaId));
  var t = HtmlService.createTemplateFromFile('Formulario');
  t.etapaId = etapa.id;
  t.etapaTitulo = etapa.titulo;
  return t.evaluate()
    .setTitle('Solicitud · ' + etapa.titulo)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include(nombre) {
  return HtmlService.createHtmlOutputFromFile(nombre).getContent();
}
