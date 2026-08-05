/***********************************************************************
 NOTIFICACIONES DE PROVEEDORES
 ---------------------------------------------------------------------
 Archivo independiente. No modifica ni depende de Code.gs.

 Contiene dos disparadores:

   1) enviarResumenSolicitandoVB()   → disparador por tiempo, 09:00 diario
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

 SI EL CORREO DIARIO NO LLEGA
   Ejecutar  diagnosticarDisparadores()  y leer el registro de ejecución.
   Indica si falta el disparador, si la hora quedó mal por zona horaria,
   o si hay que revisar Ejecuciones por un error.

 IMPORTANTE
   1) El disparador onEdit debe ser INSTALABLE (creado por script), no el
      onEdit simple de Code.gs: los disparadores simples no tienen permiso
      para enviar correos ni leer Drive.

   2) El resumen sale a las 09:00 EN PUNTO. No se usa atHour(), que Google
      aleatoriza ±15 minutos, sino una cadena de disparadores de una sola
      vez: cada envío programa el del día siguiente con at(fechaExacta).
      Un disparador de respaldo reconstruye la cadena si se corta.
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

// ── HORARIO DEL RESUMEN DIARIO ──
// Hora y minuto EN CHILE, exactos.
// Para lograr la hora justa NO se usa atHour(), que Google aleatoriza en
// una ventana de ±15 minutos, sino una cadena de disparadores de una sola
// vez: cada envío programa el del día siguiente con at(fechaExacta).
// Como se trabaja con instantes absolutos, la zona horaria del proyecto
// de Apps Script deja de influir.
const NOTIF_HORA_ENVIO    = 9;
const NOTIF_MINUTO_ENVIO  = 0;
const NOTIF_ZONA_OBJETIVO = "America/Santiago";

// Red de seguridad: si la cadena se corta (una ejecución que falla de
// forma abrupta), este respaldo la reconstruye y manda el correo que faltó.
// Es la cantidad de horas después del envío en que hace la verificación.
const NOTIF_HORAS_RESPALDO = 1;

const NOTIF_PROP_PROXIMO_ENVIO = "NOTIF_PROXIMO_ENVIO";
const NOTIF_PROP_ULTIMO_ENVIO  = "NOTIF_ULTIMO_ENVIO";

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

  // 1) Cadena de una sola vez, a la hora exacta.
  const proximo = notifProgramarProximoEnvio_();

  // 2) Respaldo por si la cadena se corta. Este sí usa atHour(), pero solo
  //    verifica y repara: la hora aproximada no importa.
  ScriptApp.newTrigger("verificarEnvioDiario")
    .timeBased()
    .atHour(notifHoraScriptParaChile_(NOTIF_HORA_ENVIO + NOTIF_HORAS_RESPALDO))
    .nearMinute(0)
    .everyDays(1)
    .create();

  // 3) Cambio de estado a Pendiente Licitaciones.
  ScriptApp.newTrigger("alCambiarEstadoRegistro")
    .forSpreadsheet(ss)
    .onEdit()
    .create();

  const hhmm = notifDosDigitos_(NOTIF_HORA_ENVIO) + ":" + notifDosDigitos_(NOTIF_MINUTO_ENVIO);

  const msg = "Disparadores instalados.\n\n" +
    "1) Resumen diario a las " + hhmm + " en punto (" + NOTIF_ZONA_OBJETIVO + ")\n" +
    "   → " + NOTIF_DESTINO_VB + "\n" +
    "   Próximo envío: " + notifFormatearChile_(proximo) + "\n\n" +
    "2) Respaldo de verificación " + NOTIF_HORAS_RESPALDO + "h después.\n\n" +
    "3) Cambio a '" + NOTIF_ESTADO_LICITACIONES + "'\n" +
    "   → " + NOTIF_DESTINO_LICITACIONES;

  Logger.log(msg);
  return msg;
}


/*************************
 PROGRAMACIÓN A LA HORA EXACTA
 atHour() reparte el disparo en una ventana de ±15 minutos. Para que salga
 a la hora justa se usa at(fecha), que es de una sola vez, y cada ejecución
 deja programada la del día siguiente.
**************************/
function notifProgramarProximoEnvio_() {
  // Los disparadores de una sola vez ya usados no se borran solos y ocupan
  // cupo (máximo 20 por usuario y proyecto), así que se limpian primero.
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "enviarResumenSolicitandoVB") ScriptApp.deleteTrigger(t);
  });

  const proximo = notifProximaFechaEnvio_();

  ScriptApp.newTrigger("enviarResumenSolicitandoVB")
    .timeBased()
    .at(proximo)
    .create();

  PropertiesService.getScriptProperties()
    .setProperty(NOTIF_PROP_PROXIMO_ENVIO, String(proximo.getTime()));

  return proximo;
}

// Próximo instante en que en Chile sean las NOTIF_HORA_ENVIO:NOTIF_MINUTO_ENVIO.
function notifProximaFechaEnvio_() {
  const ahora = new Date();
  let fecha = notifInstanteEnChile_(ahora, NOTIF_HORA_ENVIO, NOTIF_MINUTO_ENVIO);

  // Margen de 2 minutos para no reprogramar el disparo que se está ejecutando.
  if (fecha.getTime() <= ahora.getTime() + 2 * 60000) {
    const manana = new Date(ahora.getTime() + 24 * 3600 * 1000);
    fecha = notifInstanteEnChile_(manana, NOTIF_HORA_ENVIO, NOTIF_MINUTO_ENVIO);
  }

  return fecha;
}

// Devuelve el instante absoluto en que, el mismo día calendario chileno de
// "referencia", el reloj de Chile marca hora:minuto.
function notifInstanteEnChile_(referencia, hora, minuto) {
  const y = Number(Utilities.formatDate(referencia, NOTIF_ZONA_OBJETIVO, "yyyy"));
  const m = Number(Utilities.formatDate(referencia, NOTIF_ZONA_OBJETIVO, "M"));
  const d = Number(Utilities.formatDate(referencia, NOTIF_ZONA_OBJETIVO, "d"));

  const paredUTC = Date.UTC(y, m - 1, d, hora, minuto, 0);

  // Se resta el desfase de Chile y se refina una vez, por si el primer
  // intento cayó al otro lado de un cambio de horario de verano.
  let inst = paredUTC - notifDesfaseChileMs_(new Date(paredUTC));
  inst = paredUTC - notifDesfaseChileMs_(new Date(inst));

  return new Date(inst);
}

// Desfase de Chile respecto de UTC, en milisegundos, para un instante dado.
// Se calcula comparando el mismo instante formateado en ambas zonas, y
// leyendo las dos cadenas como si fueran UTC: así la zona horaria del
// proyecto de Apps Script no interviene en el cálculo.
function notifDesfaseChileMs_(instante) {
  const enChile = notifLeerComoUTC_(Utilities.formatDate(instante, NOTIF_ZONA_OBJETIVO, "yyyy-MM-dd-HH-mm-ss"));
  const enUTC   = notifLeerComoUTC_(Utilities.formatDate(instante, "UTC", "yyyy-MM-dd-HH-mm-ss"));
  return enChile - enUTC;
}

function notifLeerComoUTC_(texto) {
  const p = String(texto).split("-").map(Number);
  return Date.UTC(p[0], p[1] - 1, p[2], p[3], p[4], p[5]);
}

// Traduce una hora de Chile a la hora equivalente en la zona horaria del
// proyecto. Solo se usa para el disparador de respaldo, que sí es atHour().
function notifHoraScriptParaChile_(horaChile) {
  const ahora = new Date();
  const hScript   = Number(Utilities.formatDate(ahora, Session.getScriptTimeZone(), "H"));
  const hSantiago = Number(Utilities.formatDate(ahora, NOTIF_ZONA_OBJETIVO, "H"));

  let desfase = hScript - hSantiago;
  if (desfase >  12) desfase -= 24;
  if (desfase < -12) desfase += 24;

  return ((horaChile + desfase) % 24 + 24) % 24;
}

function notifFormatearChile_(fecha) {
  return Utilities.formatDate(fecha, NOTIF_ZONA_OBJETIVO, "dd/MM/yyyy HH:mm:ss") +
         " (" + NOTIF_ZONA_OBJETIVO + ")";
}

function notifHoyChile_() {
  return Utilities.formatDate(new Date(), NOTIF_ZONA_OBJETIVO, "yyyy-MM-dd");
}

function notifDosDigitos_(n) {
  return (Number(n) < 10 ? "0" : "") + Number(n);
}


/*************************
 RESPALDO DE LA CADENA
 Si por cualquier motivo el envío de las 09:00 no ocurrió, este disparador
 lo detecta una hora después, manda el correo y reconstruye la cadena.
**************************/
function verificarEnvioDiario() {
  const props = PropertiesService.getScriptProperties();
  const hoy = notifHoyChile_();

  if (props.getProperty(NOTIF_PROP_ULTIMO_ENVIO) === hoy) {
    // Ya salió. Solo se verifica que quede programado el de mañana.
    const hayCadena = ScriptApp.getProjectTriggers().some(function (t) {
      return t.getHandlerFunction() === "enviarResumenSolicitandoVB";
    });
    if (!hayCadena) {
      Logger.log("Cadena cortada. Reprogramando: " + notifFormatearChile_(notifProgramarProximoEnvio_()));
    }
    return;
  }

  Logger.log("El resumen de hoy no se envió a la hora prevista. Enviando ahora.");
  enviarResumenSolicitandoVB();
}

function desinstalarDisparadoresNotificaciones() {
  const objetivo = ["enviarResumenSolicitandoVB", "verificarEnvioDiario", "alCambiarEstadoRegistro"];
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
  // El reenganche de la cadena va en finally: aunque el envío falle, el
  // disparador del día siguiente queda programado igual.
  try {
    notifEnviarResumenVB_();
  } finally {
    try {
      Logger.log("Próximo envío: " + notifFormatearChile_(notifProgramarProximoEnvio_()));
    } catch (err) {
      Logger.log("No se pudo programar el próximo envío: " + err);
    }
  }
}

function notifEnviarResumenVB_() {
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

  PropertiesService.getScriptProperties()
    .setProperty(NOTIF_PROP_ULTIMO_ENVIO, notifHoyChile_());

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
 DIAGNÓSTICO DE DISPARADORES
 Ejecutar esta función si el correo diario no está llegando.
 Muestra en el registro de ejecución qué está mal.
**************************/
function diagnosticarDisparadores() {
  const ahora = new Date();
  const tzScript = Session.getScriptTimeZone();
  const tzHoja = SpreadsheetApp.getActive().getSpreadsheetTimeZone();
  const props = PropertiesService.getScriptProperties();

  const fmt = function (tz) {
    return Utilities.formatDate(ahora, tz, "dd/MM/yyyy HH:mm");
  };

  let out = "DIAGNÓSTICO DE DISPARADORES\n";
  out += "===========================================\n\n";

  out += "ZONAS HORARIAS\n";
  out += "  Proyecto Apps Script : " + tzScript + "   → " + fmt(tzScript) + "\n";
  out += "  Planilla             : " + tzHoja + "   → " + fmt(tzHoja) + "\n";
  out += "  Chile                : " + NOTIF_ZONA_OBJETIVO + "   → " + fmt(NOTIF_ZONA_OBJETIVO) + "\n\n";
  out += "  El resumen diario usa instantes absolutos (at), así que la zona del\n";
  out += "  proyecto no lo afecta. Solo influye en el disparador de respaldo.\n\n";

  // ── Disparadores instalados ──
  const triggers = ScriptApp.getProjectTriggers();
  const propios = triggers.filter(function (t) {
    return t.getHandlerFunction() === "enviarResumenSolicitandoVB" ||
           t.getHandlerFunction() === "verificarEnvioDiario" ||
           t.getHandlerFunction() === "alCambiarEstadoRegistro";
  });

  out += "DISPARADORES INSTALADOS (de tu usuario)\n";
  if (triggers.length === 0) {
    out += "  Ninguno.\n";
  } else {
    triggers.forEach(function (t) {
      out += "  - " + t.getHandlerFunction() + "  [" + t.getEventType() + "]\n";
    });
  }
  out += "\n";

  const tieneTiempo = propios.some(function (t) {
    return t.getHandlerFunction() === "enviarResumenSolicitandoVB";
  });
  const tieneRespaldo = propios.some(function (t) {
    return t.getHandlerFunction() === "verificarEnvioDiario";
  });
  const tieneEdicion = propios.some(function (t) {
    return t.getHandlerFunction() === "alCambiarEstadoRegistro";
  });

  // ── Horario programado ──
  const guardado = props.getProperty(NOTIF_PROP_PROXIMO_ENVIO);
  const ultimo = props.getProperty(NOTIF_PROP_ULTIMO_ENVIO);
  const previsto = notifProximaFechaEnvio_();

  out += "HORARIO\n";
  out += "  Objetivo             : " + notifDosDigitos_(NOTIF_HORA_ENVIO) + ":" +
         notifDosDigitos_(NOTIF_MINUTO_ENVIO) + " en punto, hora de Chile\n";
  out += "  Próximo programado   : " +
         (guardado === null ? "sin registro" : notifFormatearChile_(new Date(Number(guardado)))) + "\n";
  out += "  Debería ser          : " + notifFormatearChile_(previsto) + "\n";
  out += "  Último envío         : " + (ultimo || "sin registro") + "\n\n";

  // ── Conclusión ──
  out += "CONCLUSIÓN\n";
  const problemas = [];

  if (!tieneTiempo) {
    problemas.push(
      "NO existe el disparador del resumen diario. El correo nunca se va a enviar solo.\n" +
      "     → Ejecuta instalarDisparadoresNotificaciones().\n" +
      "     → Ojo: los disparadores son POR USUARIO. Si lo instaló otra persona,\n" +
      "       no aparece en esta lista y corre con la cuenta de esa persona.");
  }

  if (!tieneRespaldo) {
    problemas.push(
      "NO existe el disparador de respaldo. Si la cadena se corta, nadie la repara.\n" +
      "     → Ejecuta instalarDisparadoresNotificaciones().");
  }

  if (!tieneEdicion) {
    problemas.push(
      "NO existe el disparador de edición (Pendiente Licitaciones).\n" +
      "     → Ejecuta instalarDisparadoresNotificaciones().");
  }

  if (tieneTiempo && guardado === null) {
    problemas.push(
      "Existe el disparador pero fue creado con una versión anterior del código,\n" +
      "     que usaba atHour() y tenía la ventana de ±15 minutos.\n" +
      "     → Ejecuta instalarDisparadoresNotificaciones() para pasar a hora exacta.");
  }

  if (tieneTiempo && guardado !== null && Number(guardado) < Date.now()) {
    problemas.push(
      "El próximo envío quedó registrado en el pasado: la cadena está cortada.\n" +
      "     → Ejecuta instalarDisparadoresNotificaciones() para reconstruirla.");
  }

  if (problemas.length === 0) {
    out += "  ✓ Todo correcto. El resumen sale a las " +
           notifDosDigitos_(NOTIF_HORA_ENVIO) + ":" + notifDosDigitos_(NOTIF_MINUTO_ENVIO) +
           " en punto de Chile.\n\n" +
           "  Si aun así no llega, revisa Ejecuciones en el menú izquierdo del editor:\n" +
           "  ahí se ve si el disparador corrió y con qué error falló.\n" +
           "  Causas típicas: cuota de correos agotada (100/día en cuentas gratuitas,\n" +
           "  1500/día en Workspace) o autorización revocada.";
  } else {
    problemas.forEach(function (p, i) {
      out += "  " + (i + 1) + ") " + p + "\n";
    });
  }

  Logger.log(out);
  return out;
}


/*************************
 PRUEBAS MANUALES
**************************/
// Envía el resumen diario en el momento, sin esperar a la hora programada.
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
