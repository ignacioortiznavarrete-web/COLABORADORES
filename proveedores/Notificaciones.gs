/***********************************************************************
 NOTIFICACIONES DE PROVEEDORES
 ---------------------------------------------------------------------
 Archivo independiente. No modifica ni depende de Code.gs.

 Contiene dos disparadores:

   1) enviarResumenSolicitandoVB()   → disparador por tiempo, 09:30 diario
      Envía a NOTIF_DESTINO_VB el listado de proveedores en estado
      "SOLICITANDO V°B" (cantidad + Razón Social + N° Identificación Fiscal).

   2) alCambiarEstadoRegistro(e)     → disparador instalable onEdit
      Cuando el Estado de una fila pasa a "Pendiente Licitaciones",
      envía a NOTIF_DESTINO_LICITACIONES la ficha del proveedor con el
      Documento Bancario adjunto.

 INSTALACIÓN
   Ejecutar UNA sola vez la función  instalarDisparadoresNotificaciones()
   y aceptar los permisos que pida Google.
   Para desinstalar: desinstalarDisparadoresNotificaciones()

 IMPORTANTE
   El disparador onEdit debe ser INSTALABLE (creado por script), no el
   onEdit simple de Code.gs: los disparadores simples no tienen permiso
   para enviar correos ni leer Drive.
***********************************************************************/


/*************************
 CONFIGURACIÓN
**************************/
const NOTIF_HOJA_REGISTRO = "Registro";

const NOTIF_DESTINO_VB            = "juan.jara@masisa.com";
const NOTIF_DESTINO_LICITACIONES  = "sebastian.contesse@masisa.com";

// Copia opcional. Dejar "" para no enviar copia.
const NOTIF_CC_VB           = "";
const NOTIF_CC_LICITACIONES = "";

// Estados que disparan cada notificación (se comparan ignorando
// mayúsculas, tildes, espacios y el símbolo ° / º).
const NOTIF_ESTADO_VB            = "SOLICITANDO V°B";
const NOTIF_ESTADO_LICITACIONES  = "Pendiente Licitaciones";

// Si es true, el correo diario se envía igual cuando no hay pendientes.
const NOTIF_ENVIAR_SI_NO_HAY_PENDIENTES = true;

// Respaldo por si el encabezado de la columna está vacío o mal escrito.
// Registro!H = "Nombre o Razon Social 1"  (columna 8)
const NOTIF_COL_RAZON_SOCIAL_FALLBACK = 8;

// Límite de seguridad para el adjunto (MailApp admite ~25 MB en total).
const NOTIF_MAX_ADJUNTO_BYTES = 20 * 1024 * 1024;

// Paleta del correo
const NOTIF_COLOR = {
  verde:       "#2E7D32",
  verdeOscuro: "#256029",
  verdeClaro:  "#E8F3E9",
  verdeBorde:  "#C9E2CB",
  verdePalido: "#F4F9F4",
  fondo:       "#F1F6F1",
  linea:       "#DFE9E0",
  texto:       "#24352B",
  suave:       "#6B7A70",
  blanco:      "#FFFFFF"
};


/*************************
 INSTALAR / DESINSTALAR
**************************/
function instalarDisparadoresNotificaciones() {
  const ss = SpreadsheetApp.getActive();

  desinstalarDisparadoresNotificaciones();

  ScriptApp.newTrigger("enviarResumenSolicitandoVB")
    .timeBased()
    .atHour(9)
    .nearMinute(30)
    .everyDays(1)
    .create();

  ScriptApp.newTrigger("alCambiarEstadoRegistro")
    .forSpreadsheet(ss)
    .onEdit()
    .create();

  const tz = ss.getSpreadsheetTimeZone();
  let msg = "Disparadores instalados.\n\n" +
            "1) Resumen diario 09:30 → " + NOTIF_DESTINO_VB + "\n" +
            "2) Cambio a '" + NOTIF_ESTADO_LICITACIONES + "' → " + NOTIF_DESTINO_LICITACIONES + "\n\n" +
            "Zona horaria de la planilla: " + tz;

  if (tz !== "America/Santiago") {
    msg += "\n\n⚠ La zona horaria NO es America/Santiago. El correo de las 09:30 " +
           "saldrá en el horario de '" + tz + "'. Cámbiala en Archivo → Configuración.";
  }

  Logger.log(msg);
  return msg;
}

function desinstalarDisparadoresNotificaciones() {
  const objetivo = ["enviarResumenSolicitandoVB", "alCambiarEstadoRegistro"];
  let borrados = 0;

  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (objetivo.indexOf(t.getHandlerFunction()) !== -1) {
      ScriptApp.deleteTrigger(t);
      borrados++;
    }
  });

  Logger.log("Disparadores eliminados: " + borrados);
  return borrados;
}


/*************************
 1) RESUMEN DIARIO — SOLICITANDO V°B
**************************/
function enviarResumenSolicitandoVB() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(NOTIF_HOJA_REGISTRO);

  if (!sh) {
    Logger.log("No existe la hoja '" + NOTIF_HOJA_REGISTRO + "'.");
    return;
  }

  const cols = notifResolverColumnasRegistro_(sh);
  if (cols.estado === -1) {
    Logger.log("No se encontró la columna 'Estado' en " + NOTIF_HOJA_REGISTRO + ".");
    return;
  }

  const pendientes = [];
  const ultimaFila = sh.getLastRow();

  if (ultimaFila > 1) {
    const datos = sh.getRange(2, 1, ultimaFila - 1, sh.getLastColumn()).getDisplayValues();
    const clave = notifClaveEstado_(NOTIF_ESTADO_VB);

    datos.forEach(function (fila) {
      if (notifClaveEstado_(fila[cols.estado - 1]) !== clave) return;

      pendientes.push({
        razonSocial: cols.razonSocial !== -1 ? String(fila[cols.razonSocial - 1] || "").trim() : "",
        rut:         cols.nif !== -1 ? String(fila[cols.nif - 1] || "").trim() : ""
      });
    });
  }

  if (pendientes.length === 0 && !NOTIF_ENVIAR_SI_NO_HAY_PENDIENTES) {
    Logger.log("Sin proveedores en '" + NOTIF_ESTADO_VB + "'. No se envía correo.");
    return;
  }

  const fecha = Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), "dd/MM/yyyy");

  const asunto = pendientes.length === 0
    ? "Proveedores solicitando V°B — sin pendientes (" + fecha + ")"
    : "Proveedores solicitando V°B — " + pendientes.length +
      (pendientes.length === 1 ? " pendiente" : " pendientes") + " (" + fecha + ")";

  const opciones = {
    htmlBody: notifHtmlResumenVB_(pendientes, fecha, ss.getUrl()),
    name: "Solicitudes de Proveedores"
  };
  if (NOTIF_CC_VB) opciones.cc = NOTIF_CC_VB;

  MailApp.sendEmail(
    NOTIF_DESTINO_VB,
    asunto,
    notifTextoResumenVB_(pendientes, fecha),
    opciones
  );

  Logger.log("Resumen V°B enviado a " + NOTIF_DESTINO_VB + " (" + pendientes.length + " pendientes).");
}


/*************************
 2) CAMBIO DE ESTADO → PENDIENTE LICITACIONES
    Disparador instalable onEdit.
**************************/
function alCambiarEstadoRegistro(e) {
  try {
    if (!e || !e.range) return;

    const sh = e.range.getSheet();
    if (sh.getName() !== NOTIF_HOJA_REGISTRO) return;

    const cols = notifResolverColumnasRegistro_(sh);
    if (cols.estado === -1) return;

    // ¿La edición toca la columna Estado?
    const colIni = e.range.getColumn();
    const colFin = colIni + e.range.getNumColumns() - 1;
    if (cols.estado < colIni || cols.estado > colFin) return;

    const filaIni = e.range.getRow();
    const numFilas = e.range.getNumRows();
    const lastCol = sh.getLastColumn();
    const claveObjetivo = notifClaveEstado_(NOTIF_ESTADO_LICITACIONES);
    const props = PropertiesService.getDocumentProperties();

    for (let i = 0; i < numFilas; i++) {
      const fila = filaIni + i;
      if (fila <= 1) continue;

      const datos = sh.getRange(fila, 1, 1, lastCol).getDisplayValues()[0];
      const estadoActual = notifClaveEstado_(datos[cols.estado - 1]);

      const rut = cols.nif !== -1 ? String(datos[cols.nif - 1] || "").trim() : "";
      const marca = "NOTIF_LICIT_" + (notifClaveEstado_(rut) || ("FILA" + fila));

      if (estadoActual !== claveObjetivo) {
        // Salió del estado: se limpia la marca para permitir un futuro reenvío.
        props.deleteProperty(marca);
        continue;
      }

      // Evita reenviar si ya se notificó y nadie cambió el estado en el medio.
      if (props.getProperty(marca)) continue;

      notifEnviarCorreoLicitaciones_(sh, datos, cols);
      props.setProperty(marca, new Date().toISOString());
    }

  } catch (error) {
    Logger.log("Error en alCambiarEstadoRegistro: " + error + " | " + (error.stack || ""));
  }
}


/*************************
 ARMADO Y ENVÍO DEL CORREO DE LICITACIONES
**************************/
function notifEnviarCorreoLicitaciones_(sh, datos, cols) {
  const ss = sh.getParent();
  const valor = function (col) {
    return col !== -1 ? String(datos[col - 1] || "").trim() : "";
  };

  const ficha = {
    solicitante: valor(cols.solicitante),
    razonSocial: valor(cols.razonSocial),
    rut:         valor(cols.nif),
    pregunta1:   valor(cols.pregunta1),
    pregunta2:   valor(cols.pregunta2),
    pregunta3:   valor(cols.pregunta3),
    urlDocumento: valor(cols.documentoBancario)
  };

  // Documento bancario: se intenta adjuntar; si no se puede, queda el enlace.
  const adjuntos = [];
  let nombreAdjunto = "";
  let notaAdjunto = "";

  if (ficha.urlDocumento) {
    const idArchivo = notifExtraerIdDrive_(ficha.urlDocumento);
    if (!idArchivo) {
      notaAdjunto = "No se pudo interpretar el enlace del documento. Ábrelo con el botón de abajo.";
    } else {
      try {
        const archivo = DriveApp.getFileById(idArchivo);
        if (archivo.getSize() > NOTIF_MAX_ADJUNTO_BYTES) {
          notaAdjunto = "El archivo supera el límite de adjunto. Ábrelo con el botón de abajo.";
        } else {
          adjuntos.push(archivo.getBlob());
          nombreAdjunto = archivo.getName();
        }
      } catch (err) {
        notaAdjunto = "No fue posible adjuntar el archivo (sin acceso o eliminado). Ábrelo con el botón de abajo.";
        Logger.log("Adjunto no disponible (" + idArchivo + "): " + err);
      }
    }
  } else {
    notaAdjunto = "La solicitud no tiene documento bancario cargado.";
  }

  const fecha = Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), "dd/MM/yyyy HH:mm");

  const asunto = "Proveedor pendiente de licitaciones — " +
                 (ficha.razonSocial || "Sin razón social") +
                 (ficha.rut ? " (" + ficha.rut + ")" : "");

  const opciones = {
    htmlBody: notifHtmlLicitaciones_(ficha, nombreAdjunto, notaAdjunto, fecha, ss.getUrl()),
    name: "Solicitudes de Proveedores"
  };
  if (adjuntos.length) opciones.attachments = adjuntos;
  if (NOTIF_CC_LICITACIONES) opciones.cc = NOTIF_CC_LICITACIONES;

  MailApp.sendEmail(
    NOTIF_DESTINO_LICITACIONES,
    asunto,
    notifTextoLicitaciones_(ficha, fecha),
    opciones
  );

  Logger.log("Correo de licitaciones enviado a " + NOTIF_DESTINO_LICITACIONES +
             " por " + (ficha.rut || ficha.razonSocial));
}


/*************************
 PLANTILLA HTML — RESUMEN DIARIO V°B
**************************/
function notifHtmlResumenVB_(pendientes, fecha, urlPlanilla) {
  const C = NOTIF_COLOR;
  let cuerpo = "";

  if (pendientes.length === 0) {
    cuerpo =
      '<tr><td style="padding:28px 24px;text-align:center;">' +
        '<div style="display:inline-block;padding:16px 22px;background:' + C.verdeClaro +
        ';border:1px solid ' + C.verdeBorde + ';border-radius:10px;color:' + C.verdeOscuro +
        ';font-size:15px;font-weight:bold;">' +
          'No hay proveedores esperando visto bueno.' +
        '</div>' +
        '<div style="margin-top:12px;color:' + C.suave + ';font-size:13px;">' +
          'Todas las solicitudes están al día.' +
        '</div>' +
      '</td></tr>';
  } else {
    let filas = "";
    pendientes.forEach(function (p, i) {
      const fondo = (i % 2 === 0) ? C.blanco : C.verdePalido;
      filas +=
        '<tr>' +
          '<td style="padding:11px 12px;background:' + fondo + ';border-bottom:1px solid ' + C.linea +
            ';color:' + C.suave + ';font-size:12px;text-align:center;width:34px;">' + (i + 1) + '</td>' +
          '<td style="padding:11px 12px;background:' + fondo + ';border-bottom:1px solid ' + C.linea +
            ';color:' + C.texto + ';font-size:13px;font-weight:bold;">' +
            notifEscapar_(p.razonSocial || "—") + '</td>' +
          '<td style="padding:11px 12px;background:' + fondo + ';border-bottom:1px solid ' + C.linea +
            ';color:' + C.texto + ';font-size:13px;white-space:nowrap;' +
            'font-family:Consolas,Menlo,monospace;">' +
            notifEscapar_(p.rut || "—") + '</td>' +
        '</tr>';
    });

    cuerpo =
      '<tr><td style="padding:24px 24px 8px;">' +
        '<table role="presentation" cellpadding="0" cellspacing="0" border="0" ' +
          'style="background:' + C.verdeClaro + ';border:1px solid ' + C.verdeBorde + ';border-radius:10px;">' +
          '<tr>' +
            '<td style="padding:14px 8px 14px 20px;font-size:34px;line-height:1;font-weight:bold;color:' +
              C.verde + ';font-family:Arial,Helvetica,sans-serif;">' + pendientes.length + '</td>' +
            '<td style="padding:14px 20px 14px 10px;font-size:13px;line-height:1.35;color:' + C.verdeOscuro + ';">' +
              (pendientes.length === 1 ? 'proveedor esperando<br>visto bueno' : 'proveedores esperando<br>visto bueno') +
            '</td>' +
          '</tr>' +
        '</table>' +
      '</td></tr>' +
      '<tr><td style="padding:12px 24px 24px;">' +
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ' +
          'style="border-collapse:collapse;border:1px solid ' + C.linea + ';border-radius:8px;overflow:hidden;">' +
          '<tr>' +
            '<th style="padding:10px 12px;background:' + C.verdePalido + ';border-bottom:2px solid ' + C.verde +
              ';color:' + C.verde + ';font-size:10px;letter-spacing:.08em;text-transform:uppercase;' +
              'text-align:center;width:34px;">#</th>' +
            '<th style="padding:10px 12px;background:' + C.verdePalido + ';border-bottom:2px solid ' + C.verde +
              ';color:' + C.verde + ';font-size:10px;letter-spacing:.08em;text-transform:uppercase;' +
              'text-align:left;">Nombre o Razón Social</th>' +
            '<th style="padding:10px 12px;background:' + C.verdePalido + ';border-bottom:2px solid ' + C.verde +
              ';color:' + C.verde + ';font-size:10px;letter-spacing:.08em;text-transform:uppercase;' +
              'text-align:left;white-space:nowrap;">N° Ident. Fiscal</th>' +
          '</tr>' +
          filas +
        '</table>' +
      '</td></tr>';
  }

  return notifEnvoltorio_(
    "Proveedores solicitando V°B",
    "Reporte diario &middot; " + fecha,
    cuerpo,
    urlPlanilla,
    "Abrir planilla de proveedores"
  );
}


/*************************
 PLANTILLA HTML — PENDIENTE LICITACIONES
**************************/
function notifHtmlLicitaciones_(ficha, nombreAdjunto, notaAdjunto, fecha, urlPlanilla) {
  const C = NOTIF_COLOR;

  const dato = function (etiqueta, valor, mono) {
    return '<tr>' +
      '<td style="padding:10px 14px 10px 0;color:' + C.suave + ';font-size:10px;letter-spacing:.08em;' +
        'text-transform:uppercase;vertical-align:top;white-space:nowrap;border-bottom:1px solid ' + C.linea + ';">' +
        etiqueta + '</td>' +
      '<td style="padding:10px 0;color:' + C.texto + ';font-size:14px;font-weight:bold;vertical-align:top;' +
        'border-bottom:1px solid ' + C.linea + ';' +
        (mono ? 'font-family:Consolas,Menlo,monospace;' : '') + '">' +
        notifEscapar_(valor || "—") + '</td>' +
    '</tr>';
  };

  const pregunta = function (titulo, texto) {
    return '<div style="margin-bottom:12px;padding:14px 16px;background:' + C.verdePalido +
      ';border-left:4px solid ' + C.verde + ';border-radius:0 8px 8px 0;">' +
      '<div style="color:' + C.verde + ';font-size:10px;letter-spacing:.08em;text-transform:uppercase;' +
        'font-weight:bold;margin-bottom:6px;">' + titulo + '</div>' +
      '<div style="color:' + C.texto + ';font-size:13px;line-height:1.5;">' +
        (texto ? notifEscapar_(texto).replace(/\n/g, "<br>") : "—") + '</div>' +
    '</div>';
  };

  let bloqueDocumento =
    '<div style="padding:16px;background:' + C.verdeClaro + ';border:1px solid ' + C.verdeBorde +
      ';border-radius:10px;">' +
      '<div style="color:' + C.verde + ';font-size:10px;letter-spacing:.08em;text-transform:uppercase;' +
        'font-weight:bold;margin-bottom:8px;">Documento bancario</div>';

  if (nombreAdjunto) {
    bloqueDocumento +=
      '<div style="color:' + C.texto + ';font-size:13px;margin-bottom:12px;">' +
        'Adjunto en este correo: <b>' + notifEscapar_(nombreAdjunto) + '</b>' +
      '</div>';
  } else {
    bloqueDocumento +=
      '<div style="color:' + C.texto + ';font-size:13px;margin-bottom:12px;">' +
        notifEscapar_(notaAdjunto || "Sin documento disponible.") +
      '</div>';
  }

  if (ficha.urlDocumento) {
    bloqueDocumento +=
      '<a href="' + notifEscapar_(ficha.urlDocumento) + '" target="_blank" ' +
        'style="display:inline-block;padding:9px 18px;background:' + C.verde + ';color:#FFFFFF;' +
        'text-decoration:none;border-radius:8px;font-size:13px;font-weight:bold;">' +
        'Ver documento en Drive</a>';
  }

  bloqueDocumento += '</div>';

  const cuerpo =
    '<tr><td style="padding:24px 24px 4px;">' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ' +
        'style="border-collapse:collapse;">' +
        dato("Solicitante", ficha.solicitante, false) +
        dato("Razón Social", ficha.razonSocial, false) +
        dato("N° Ident. Fiscal", ficha.rut, true) +
      '</table>' +
    '</td></tr>' +
    '<tr><td style="padding:22px 24px 4px;">' +
      '<div style="color:' + C.verdeOscuro + ';font-size:13px;font-weight:bold;margin-bottom:12px;' +
        'padding-bottom:8px;border-bottom:1px solid ' + C.linea + ';">Antecedentes de la solicitud</div>' +
      pregunta("1. Área usuaria del servicio o solicitante del suministro", ficha.pregunta1) +
      pregunta("2. Tipo de servicio/suministro y plazos asociados", ficha.pregunta2) +
      pregunta("3. Valor de referencia del servicio/suministro", ficha.pregunta3) +
    '</td></tr>' +
    '<tr><td style="padding:8px 24px 24px;">' + bloqueDocumento + '</td></tr>';

  return notifEnvoltorio_(
    "Proveedor pendiente de licitaciones",
    "Cambio de estado &middot; " + fecha,
    cuerpo,
    urlPlanilla,
    "Abrir planilla de proveedores"
  );
}


/*************************
 ENVOLTORIO COMÚN DEL CORREO
**************************/
function notifEnvoltorio_(titulo, subtitulo, cuerpo, urlPlanilla, textoEnlace) {
  const C = NOTIF_COLOR;

  return '' +
  '<div style="margin:0;padding:24px 12px;background:' + C.fondo + ';' +
    'font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">' +
      '<tr><td align="center">' +
        '<table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" ' +
          'style="max-width:640px;width:100%;background:' + C.blanco + ';border:1px solid ' + C.linea +
          ';border-radius:14px;overflow:hidden;">' +

          '<tr><td style="padding:22px 24px;background:' + C.verde + ';">' +
            '<div style="color:#FFFFFF;font-size:18px;font-weight:bold;line-height:1.25;">' +
              titulo + '</div>' +
            '<div style="color:#D2E9D3;font-size:12px;margin-top:5px;">' + subtitulo + '</div>' +
          '</td></tr>' +

          cuerpo +

          '<tr><td style="padding:18px 24px 22px;background:' + C.verdePalido +
            ';border-top:1px solid ' + C.linea + ';">' +
            (urlPlanilla
              ? '<a href="' + urlPlanilla + '" target="_blank" style="color:' + C.verde +
                ';font-size:12px;font-weight:bold;text-decoration:none;">' + textoEnlace + ' &rsaquo;</a>'
              : '') +
            '<div style="color:' + C.suave + ';font-size:11px;margin-top:8px;line-height:1.5;">' +
              'Correo automático generado desde la planilla de solicitudes de proveedores. ' +
              'No responder a este mensaje.' +
            '</div>' +
          '</td></tr>' +

        '</table>' +
      '</td></tr>' +
    '</table>' +
  '</div>';
}


/*************************
 VERSIONES EN TEXTO PLANO
**************************/
function notifTextoResumenVB_(pendientes, fecha) {
  if (pendientes.length === 0) {
    return "PROVEEDORES SOLICITANDO V°B - " + fecha + "\n\n" +
           "No hay proveedores esperando visto bueno.";
  }

  let t = "PROVEEDORES SOLICITANDO V°B - " + fecha + "\n\n" +
          "Total pendientes: " + pendientes.length + "\n\n";

  pendientes.forEach(function (p, i) {
    t += (i + 1) + ". " + (p.razonSocial || "—") + "  |  " + (p.rut || "—") + "\n";
  });

  return t;
}

function notifTextoLicitaciones_(ficha, fecha) {
  return "PROVEEDOR PENDIENTE DE LICITACIONES - " + fecha + "\n\n" +
    "Solicitante: "      + (ficha.solicitante || "—") + "\n" +
    "Razón Social: "     + (ficha.razonSocial || "—") + "\n" +
    "N° Ident. Fiscal: " + (ficha.rut || "—") + "\n\n" +
    "1. Área usuaria: "        + (ficha.pregunta1 || "—") + "\n" +
    "2. Servicio y plazos: "   + (ficha.pregunta2 || "—") + "\n" +
    "3. Valor de referencia: " + (ficha.pregunta3 || "—") + "\n\n" +
    "Documento bancario: " + (ficha.urlDocumento || "sin documento");
}


/*************************
 RESOLUCIÓN DE COLUMNAS
**************************/
function notifResolverColumnasRegistro_(sh) {
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0];

  const razonSocial = notifBuscarColumna_(headers, [
    "Nombre o Razon Social 1", "Nombre o Razón Social 1",
    "Nombre o Razon Social", "Razon Social", "Razón Social"
  ]);

  return {
    estado:      notifBuscarColumna_(headers, ["Estado"]),
    solicitante: notifBuscarColumna_(headers, ["Solicitante"]),

    // Si el encabezado está vacío o mal escrito, se usa la columna de respaldo.
    razonSocial: razonSocial !== -1
      ? razonSocial
      : (headers.length >= NOTIF_COL_RAZON_SOCIAL_FALLBACK ? NOTIF_COL_RAZON_SOCIAL_FALLBACK : -1),

    nif: notifBuscarColumna_(headers, [
      "N° Identificacion Fiscal", "Nº Identificacion Fiscal",
      "N° Identificación Fiscal", "Nº Identificación Fiscal",
      "Numero Identificacion Fiscal", "Número Identificación Fiscal",
      "N° ID Fiscal", "Rut", "RUT"
    ]),

    documentoBancario: notifBuscarColumna_(headers, ["Documento Bancario", "Documento bancario"]),
    pregunta1: notifBuscarColumna_(headers, ["Pregunta1", "Pregunta 1"]),
    pregunta2: notifBuscarColumna_(headers, ["Pregunta2", "Pregunta 2"]),
    pregunta3: notifBuscarColumna_(headers, ["Pregunta3", "Pregunta 3"])
  };
}

// Busca un encabezado ignorando mayúsculas, tildes, ° / º y espacios repetidos.
function notifBuscarColumna_(headers, nombresPosibles) {
  const normalizados = headers.map(notifNormalizarTexto_);

  for (let i = 0; i < nombresPosibles.length; i++) {
    const objetivo = notifNormalizarTexto_(nombresPosibles[i]);
    if (!objetivo) continue;
    const idx = normalizados.indexOf(objetivo);
    if (idx !== -1) return idx + 1;
  }

  return -1;
}

function notifNormalizarTexto_(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[°º]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

// Clave dura para comparar estados: solo letras y números en mayúscula.
// "SOLICITANDO V°B" / "Solicitando VºB" / "solicitando v b" → SOLICITANDOVB
function notifClaveEstado_(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}


/*************************
 UTILIDADES
**************************/
// Extrae el ID de archivo desde cualquier formato de URL de Drive.
function notifExtraerIdDrive_(url) {
  const u = String(url || "").trim();
  if (!u) return "";

  const patrones = [
    /\/file\/d\/([a-zA-Z0-9_-]{20,})/,
    /[?&]id=([a-zA-Z0-9_-]{20,})/,
    /\/d\/([a-zA-Z0-9_-]{20,})/,
    /^([a-zA-Z0-9_-]{20,})$/
  ];

  for (let i = 0; i < patrones.length; i++) {
    const m = u.match(patrones[i]);
    if (m) return m[1];
  }

  return "";
}

function notifEscapar_(texto) {
  return String(texto === null || texto === undefined ? "" : texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}


/*************************
 PRUEBAS MANUALES
**************************/
// Envía el resumen diario en el momento, sin esperar a las 09:30.
function probarResumenSolicitandoVB() {
  enviarResumenSolicitandoVB();
}

// Envía el correo de licitaciones usando los datos de una fila concreta
// de Registro. Ej: probarCorreoLicitaciones(5)
function probarCorreoLicitaciones(numeroFila) {
  const sh = SpreadsheetApp.getActive().getSheetByName(NOTIF_HOJA_REGISTRO);
  if (!sh) throw new Error("No existe la hoja '" + NOTIF_HOJA_REGISTRO + "'.");

  const fila = numeroFila || 2;
  const cols = notifResolverColumnasRegistro_(sh);
  const datos = sh.getRange(fila, 1, 1, sh.getLastColumn()).getDisplayValues()[0];

  notifEnviarCorreoLicitaciones_(sh, datos, cols);
}

// Muestra en el registro de ejecución qué columna detectó cada campo.
// Útil si algún dato llega vacío en los correos.
function diagnosticarColumnasRegistro() {
  const sh = SpreadsheetApp.getActive().getSheetByName(NOTIF_HOJA_REGISTRO);
  if (!sh) throw new Error("No existe la hoja '" + NOTIF_HOJA_REGISTRO + "'.");

  const cols = notifResolverColumnasRegistro_(sh);
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0];
  const letra = function (n) {
    return n === -1 ? "NO ENCONTRADA" : sh.getRange(1, n).getA1Notation().replace(/\d+/g, "");
  };

  let salida = "COLUMNAS DETECTADAS EN '" + NOTIF_HOJA_REGISTRO + "'\n\n";
  Object.keys(cols).forEach(function (k) {
    salida += k + ": " + letra(cols[k]) +
      (cols[k] !== -1 ? "  (encabezado: \"" + headers[cols[k] - 1] + "\")" : "") + "\n";
  });

  const razonHeader = cols.razonSocial !== -1 ? String(headers[cols.razonSocial - 1] || "").trim() : "";
  if (cols.razonSocial === NOTIF_COL_RAZON_SOCIAL_FALLBACK && !razonHeader) {
    salida += "\n⚠ El encabezado de la columna de Razón Social está vacío. " +
              "Se está usando la columna de respaldo. Corrige la celda " +
              letra(NOTIF_COL_RAZON_SOCIAL_FALLBACK) + "1 escribiendo " +
              "\"Nombre o Razon Social 1\".";
  }

  Logger.log(salida);
  return salida;
}
