/**
 * Publicación web. Hay dos formas de montarlo (ver README):
 *
 * A) Un solo despliegue (lo normal)
 *    Un único enlace para todos. Con ACCESOS configurado en Config.gs, cada
 *    persona aterriza directo en el formulario que le toca y no puede abrir los
 *    otros aunque escriba ?form= a mano.
 *    También sirven los enlaces directos:
 *      .../exec?form=costos | ?form=td | ?form=produccion
 *
 * B) Un despliegue por formulario  (ETAPA_FIJA definida en Config.gs)
 *    Cada despliegue atiende una sola etapa y además Google filtra en la puerta,
 *    porque cada URL tiene su propio "Quién tiene acceso".
 */

function doGet(e) {
  var params = (e && e.parameter) || {};

  if (ETAPA_FIJA) return renderFormulario(ETAPA_FIJA);

  var etapaId = String(params.form || params.etapa || '').trim().toLowerCase();
  if (etapaId && indiceEtapa_(etapaId) !== -1) return renderFormulario(etapaId);

  var accesibles = etapasAccesibles_();

  // Si la persona solo puede usar un formulario, la llevamos directo a él:
  // así el mismo enlace sirve para todos y cada uno parte en su página.
  if (accesibles.length === 1) return renderFormulario(accesibles[0].id);
  if (!accesibles.length) {
    return paginaSinAcceso_(
      'Tu cuenta no tiene acceso a ninguno de los formularios.',
      'Pide que te agreguen en ACCESOS (Config.gs) para la etapa que te corresponda.');
  }

  var inicio = HtmlService.createTemplateFromFile('Inicio');
  inicio.etapas = accesibles.map(function (x) {
    return {
      id: x.id,
      titulo: x.titulo,
      descripcion: x.descripcion,
      hoja: x.hoja,
      url: urlDeEtapa_(x.id)
    };
  });
  return inicio.evaluate()
    .setTitle('Solicitudes · Flujo Costos → T&D → Producción')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Entrega el formulario de una etapa, siempre que la cuenta tenga acceso.
 * Es pública para que los proyectos lanzadores (opción B del README) puedan
 * llamarla cuando este proyecto se usa como biblioteca.
 */
function renderFormulario(etapaId) {
  var etapa = etapaPorId_(etapaEfectiva_(etapaId));

  if (!puedeAcceder_(etapa.id)) {
    return paginaSinAcceso_(
      'Tu cuenta no está autorizada para el formulario ' + etapa.titulo + '.',
      'El acceso a cada formulario se define en ACCESOS (Config.gs).',
      etapa);
  }

  var t = HtmlService.createTemplateFromFile('Formulario');
  t.etapaId = etapa.id;
  t.etapaTitulo = etapa.titulo;
  return t.evaluate()
    .setTitle('Solicitud · ' + etapa.titulo)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** Etapas que la cuenta actual puede usar. */
function etapasAccesibles_() {
  return ETAPAS.filter(function (e) { return puedeAcceder_(e.id); });
}

function urlDeEtapa_(etapaId) {
  return (URLS_FORMULARIOS && URLS_FORMULARIOS[etapaId]) || ('?form=' + etapaId);
}

function paginaSinAcceso_(titulo, detalle, etapa) {
  var t = HtmlService.createTemplateFromFile('SinAcceso');
  t.titulo = titulo;
  t.detalle = detalle || '';
  t.usuario = usuario_();
  t.mensaje = etapa ? 'Formulario ' + etapa.titulo : 'Flujo de solicitudes';
  t.disponibles = etapasAccesibles_()
    .filter(function (e) { return !etapa || e.id !== etapa.id; })
    .map(function (e) {
      return { titulo: e.titulo, descripcion: e.descripcion, url: urlDeEtapa_(e.id) };
    });
  return t.evaluate()
    .setTitle('Sin acceso')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include(nombre) {
  return HtmlService.createHtmlOutputFromFile(nombre).getContent();
}
