/**
 * Publicación web. Un mismo despliegue entrega los 3 formularios:
 *
 *   .../exec?form=costos      -> equipo de Costos
 *   .../exec?form=td          -> equipo de T&D
 *   .../exec?form=produccion  -> equipo de Producción
 *
 * Sin parámetro muestra el selector. El acceso por etapa se controla en
 * ACCESOS (Config.gs).
 */

function doGet(e) {
  var params = (e && e.parameter) || {};
  var etapaId = String(params.form || params.etapa || '').trim().toLowerCase();

  if (etapaId && indiceEtapa_(etapaId) === -1) etapaId = '';

  if (!etapaId) {
    var inicio = HtmlService.createTemplateFromFile('Inicio');
    inicio.etapas = ETAPAS.map(function (x) {
      return { id: x.id, titulo: x.titulo, descripcion: x.descripcion, hoja: x.hoja };
    });
    return inicio.evaluate()
      .setTitle('Solicitudes · Flujo Costos → T&D → Producción')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  var etapa = etapaPorId_(etapaId);
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
