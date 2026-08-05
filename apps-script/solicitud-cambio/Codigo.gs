// ID de la hoja de cálculo
const SPREADSHEET_ID = '1s0r_lbPLVH4peQfn_2L7LqrD1Pvmk0tDw4GQR5CsfvI';
const SHEET_NAME = 'Cambios';
const BD_SHEET_NAME = 'BD';

/**
 * Notificaciones por correo.
 *
 * Se envía UN solo correo por solicitud:
 *   - Dentro de plazo -> sólo a PERSONA_1.
 *   - Fuera de plazo  -> a PERSONA_1 y PERSONA_2, avisando que llegó fuera de plazo.
 *
 * El correo sale desde la cuenta que ejecuta el script (según cómo esté
 * desplegada la app web: "Ejecutar como" el propietario o el usuario que accede).
 */
const NOTIFICACIONES = {
  PERSONA_1: 'persona1@masisa.com',   // <-- reemplazar por el correo real
  PERSONA_2: 'persona2@masisa.com',   // <-- reemplazar por el correo real
  MAX_FILAS_DETALLE: 200              // materiales listados en el cuerpo del correo
};

/**
 * Ventana de plazo (días del mes, todos los meses).
 *
 * VENTANA_ES_FUERA_DE_PLAZO = true  -> los días 10 a 28 son FUERA de plazo.
 * VENTANA_ES_FUERA_DE_PLAZO = false -> los días 10 a 28 son DENTRO de plazo.
 */
const PLAZO = {
  DIA_INICIO: 10,
  DIA_FIN: 28,
  VENTANA_ES_FUERA_DE_PLAZO: true
};

// Función para abrir la página web
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Solicitud')
    .setTitle('Solicitud de Cambio de Estado')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// Función para obtener el Estado SAP desde la hoja BD
function obtenerEstadoSAP(materiales) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const bdSheet = ss.getSheetByName(BD_SHEET_NAME);

  // Obtener todos los datos de la hoja BD
  const bdData = bdSheet.getDataRange().getValues();

  // Mapear Material a Estado SAP
  const estadoSAPMap = {};
  for (let i = 1; i < bdData.length; i++) {
    const material = bdData[i][0]; // Columna A: Material
    const estadoSAP = bdData[i][4]; // Columna E: Stock_Pedido (Estado SAP)
    estadoSAPMap[material] = estadoSAP;
  }

  // Obtener los estados para los materiales solicitados
  return materiales.map(material => estadoSAPMap[material] || 'No encontrado');
}

// Función para guardar las solicitudes de cambio de estado
function guardarCambioEstado(solicitante, materiales, estado) {
  try {
    if (!solicitante || !estado || !materiales || !materiales.length) {
      return { ok: false, error: 'Faltan datos de la solicitud.' };
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);

    const ahora = new Date();
    const fechaFormateada = Utilities.formatDate(ahora, Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");

    // Obtener el Estado SAP actual de los materiales
    const estadosSAP = obtenerEstadoSAP(materiales);

    // Guardar cada material con su Estado Antiguo
    for (let i = 0; i < materiales.length; i++) {
      const rowData = [
        solicitante,        // Columna A: Solicitante
        materiales[i],      // Columna B: Material
        estado,             // Columna C: Nuevo Estado
        fechaFormateada,    // Columna D: Fecha Solicitud
        "Procesando",     // Columna E: Requerimiento (valor fijo)
        estadosSAP[i]       // Columna F: Estado Antiguo (Estado SAP)
      ];

      sheet.appendRow(rowData);
    }

    // Notificar por correo. Si el envío falla, la solicitud igual quedó guardada.
    const detalle = materiales.map((material, i) => ({
      material: material,
      estadoAnterior: estadosSAP[i],
      estadoNuevo: estado
    }));

    let correo;
    try {
      correo = notificarSolicitud_(solicitante, detalle, ahora, fechaFormateada);
    } catch (errorCorreo) {
      Logger.log('Error al enviar el correo: ' + errorCorreo);
      correo = { enviado: false, error: String(errorCorreo) };
    }

    return { ok: true, guardados: materiales.length, correo: correo };
  } catch (error) {
    Logger.log('Error al guardar la solicitud: ' + error);
    return { ok: false, error: String(error) };
  }
}

/* ------------------------------------------------------------------ */
/* Notificaciones                                                       */
/* ------------------------------------------------------------------ */

/**
 * Indica si la fecha cae fuera de plazo según la ventana configurada.
 * Se usa el día del mes en la zona horaria del script.
 */
function estaFueraDePlazo_(fecha) {
  const dia = Number(Utilities.formatDate(fecha, Session.getScriptTimeZone(), 'd'));
  const dentroVentana = dia >= PLAZO.DIA_INICIO && dia <= PLAZO.DIA_FIN;
  return PLAZO.VENTANA_ES_FUERA_DE_PLAZO ? dentroVentana : !dentroVentana;
}

/**
 * Envía UNO de los dos correos (nunca los dos) según el plazo y devuelve
 * el resultado para mostrarlo en la interfaz.
 */
function notificarSolicitud_(solicitante, detalle, fecha, fechaFormateada) {
  const fueraDePlazo = estaFueraDePlazo_(fecha);

  const destinatarios = fueraDePlazo
    ? [NOTIFICACIONES.PERSONA_1, NOTIFICACIONES.PERSONA_2]
    : [NOTIFICACIONES.PERSONA_1];

  const para = destinatarios.filter(function (d) { return d && d.indexOf('@') > 0; }).join(',');
  if (!para) {
    return { enviado: false, fueraDePlazo: fueraDePlazo, error: 'No hay destinatarios configurados.' };
  }

  const estados = resumenEstados_(detalle);
  const asunto = (fueraDePlazo ? 'FUERA DE PLAZO · ' : '') +
    'Solicitud de cambio de estado — ' + solicitante +
    ' (' + detalle.length + ' material' + (detalle.length === 1 ? '' : 'es') + ')';

  const encabezado = fueraDePlazo
    ? solicitante + ' solicitó un cambio de estado ' + estados + ', <strong>fuera de plazo</strong>.'
    : solicitante + ' solicitó un cambio de estado ' + estados + '.';

  MailApp.sendEmail({
    to: para,
    subject: asunto,
    htmlBody: cuerpoCorreo_(encabezado, detalle, fechaFormateada, fueraDePlazo),
    name: 'Solicitudes de Cambio de Estado'
  });

  return { enviado: true, fueraDePlazo: fueraDePlazo, destinatarios: destinatarios };
}

/** "de Pedido a Stock" o "a Stock" si venían de varios estados distintos. */
function resumenEstados_(detalle) {
  const anteriores = {};
  detalle.forEach(function (d) { anteriores[d.estadoAnterior] = true; });
  const nombres = Object.keys(anteriores);
  const destino = detalle.length ? detalle[0].estadoNuevo : '';
  return nombres.length === 1
    ? 'de ' + nombres[0] + ' a ' + destino
    : 'a ' + destino + ' (desde ' + nombres.join(', ') + ')';
}

function cuerpoCorreo_(encabezado, detalle, fechaFormateada, fueraDePlazo) {
  const filas = detalle.slice(0, NOTIFICACIONES.MAX_FILAS_DETALLE).map(function (d) {
    return '<tr>' +
      '<td style="padding:6px 10px;border-bottom:1px solid #eee">' + escapar_(d.material) + '</td>' +
      '<td style="padding:6px 10px;border-bottom:1px solid #eee">' + escapar_(d.estadoAnterior) + '</td>' +
      '<td style="padding:6px 10px;border-bottom:1px solid #eee">' + escapar_(d.estadoNuevo) + '</td>' +
      '</tr>';
  }).join('');

  const restantes = detalle.length - Math.min(detalle.length, NOTIFICACIONES.MAX_FILAS_DETALLE);
  const nota = restantes > 0
    ? '<p style="color:#666">…y ' + restantes + ' material(es) más. El detalle completo está en la hoja "' + SHEET_NAME + '".</p>'
    : '';

  const aviso = fueraDePlazo
    ? '<p style="background:#fff3cd;border-left:4px solid #c79100;padding:10px;margin:0 0 16px">' +
      'Esta solicitud se ingresó <strong>fuera de plazo</strong> (días ' +
      PLAZO.DIA_INICIO + ' a ' + PLAZO.DIA_FIN + ' del mes).</p>'
    : '';

  return '' +
    '<div style="font-family:Arial,sans-serif;color:#222;max-width:640px">' +
    '<h2 style="color:#0a6631;margin:0 0 16px">Solicitud de cambio de estado</h2>' +
    aviso +
    '<p>' + encabezado + '</p>' +
    '<table style="border-collapse:collapse;width:100%;font-size:14px">' +
    '<thead><tr style="background:#0a6631;color:#fff">' +
    '<th style="padding:8px 10px;text-align:left">Material</th>' +
    '<th style="padding:8px 10px;text-align:left">Estado actual</th>' +
    '<th style="padding:8px 10px;text-align:left">Cambio solicitado</th>' +
    '</tr></thead><tbody>' + filas + '</tbody></table>' +
    nota +
    '<p style="color:#666;font-size:12px;margin-top:20px">Ingresada el ' + fechaFormateada + '.</p>' +
    '</div>';
}

function escapar_(valor) {
  return String(valor === null || valor === undefined ? '' : valor)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
