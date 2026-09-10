/**
 * Publicación web. Dos pantallas sobre el mismo motor:
 *
 *   .../exec                 carga masiva: se pegan códigos y salen sus filas
 *   .../exec?modo=paso       el asistente, una solicitud a la vez
 *   .../exec?modo=paso&clase=PT   además, con la clase ya elegida
 */

function doGet(e) {
  var params = (e && e.parameter) || {};
  var modo = String(params.modo || '').trim().toLowerCase();

  if (modo === 'paso' || modo === 'asistente') {
    var clase = '';
    try {
      if (params.clase) clase = clasePorId_(params.clase).id;
    } catch (err) {
      clase = '';  // ?clase= con algo raro: se ignora y se pregunta igual
    }
    var t = HtmlService.createTemplateFromFile('Formulario');
    t.clasePrevia = clase;
    return t.evaluate()
      .setTitle('Registro paso a paso · Maderas')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  return HtmlService.createTemplateFromFile('Masivo').evaluate()
    .setTitle('Batch input de maderas')
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
