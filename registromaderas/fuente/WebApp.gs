/**
 * Publicación web: un solo enlace, un solo formulario.
 *
 * Se puede llegar con la clase ya elegida:
 *   .../exec?clase=PT | ?clase=PCP | ?clase=PP
 */

function doGet(e) {
  var params = (e && e.parameter) || {};
  var clase = '';
  try {
    if (params.clase) clase = clasePorId_(params.clase).id;
  } catch (err) {
    clase = '';  // ?clase= con algo raro: se ignora y se pregunta igual
  }

  var t = HtmlService.createTemplateFromFile('Formulario');
  t.clasePrevia = clase;
  return t.evaluate()
    .setTitle('Registro de requerimientos · Maderas')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include(nombre) {
  return HtmlService.createHtmlOutputFromFile(nombre).getContent();
}

/** URL de la aplicación publicada (la usa el menú del spreadsheet). */
function urlFormulario_() {
  try {
    return ScriptApp.getService().getUrl() || '';
  } catch (err) {
    return '';
  }
}
