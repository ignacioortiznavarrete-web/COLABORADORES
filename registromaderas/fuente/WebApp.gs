/**
 * Publicación web: una sola pantalla, la de ingreso masivo.
 *
 * El batch input no tiene interfaz. Vive en el spreadsheet y se baja como
 * Excel con las filas que se elijan.
 */

function doGet() {
  return HtmlService.createTemplateFromFile('Masivo').evaluate()
    .setTitle('Ingreso de maderas')
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
