/***********************************************************************
 PENDIENTE LICITACIONES — DIAGNÓSTICO Y RED DE SEGURIDAD
 ---------------------------------------------------------------------
 Archivo independiente. No modifica el código existente: se apoya en las
 funciones que ya están en el archivo de notificaciones
 (notifEnviarCorreoLicitaciones_, notifResolverColumnasRegistro_,
 notifClaveEstado_) y en las mismas marcas "NOTIF_LICIT_<rut>", así que
 nunca reenvía un correo que el disparador onEdit ya mandó.

 QUÉ HACER, EN ORDEN
   1) diagnosticarLicitaciones()
      Solo lee. Dice por qué no salió el correo.

   2) reenviarLicitacionesPendientes()
      ENVÍA CORREO de verdad a licitaciones por cada proveedor que está
      en "Pendiente Licitaciones" y nunca fue notificado.

   3) instalarRedDeSeguridadLicitaciones()
      Deja un disparador por tiempo que revisa cada 15 minutos. Desde ahí
      el aviso ya no depende de que el onEdit alcance a correr: si alguien
      pega el estado, lo cambia otro script o el onEdit falla, el correo
      igual sale con algunos minutos de atraso.

 POR QUÉ HACE FALTA LA RED DE SEGURIDAD
   El disparador onEdit no se ejecuta cuando el valor lo escribe un script
   ni cuando llega por importación o por la API. Tampoco corre si el
   disparador instalable no existe, si quedó apuntando a otra planilla o
   si al dueño se le revocó la autorización. En todos esos casos el estado
   queda en "Pendiente Licitaciones" y nadie se entera.
***********************************************************************/


/*************************
 CONFIGURACIÓN
**************************/
// ID de la planilla donde DEBE correr esto (ProvChileSantiago).
// Sirve para detectar el caso en que el código quedó pegado en el
// proyecto equivocado, que es un error que no da ningún mensaje.
const LIC_SPREADSHEET_ESPERADO = "1QH4y2H5b0wZ-03Jn7GuSionNKFJI-83D_DSSnj95SlU";

// Cada cuántos minutos revisa la red de seguridad (1, 5, 10, 15 o 30).
const LIC_MINUTOS_RED = 15;


/*************************
 LECTURA DE LA CONFIGURACIÓN EXISTENTE
 Se leen dentro de funciones, no como constantes, para no depender del
 orden en que Apps Script evalúa los archivos del proyecto.
**************************/
function licHoja_() {
  return (typeof NOTIF_HOJA_REGISTRO !== "undefined") ? NOTIF_HOJA_REGISTRO : "Registro";
}

function licEstado_() {
  return (typeof NOTIF_ESTADO_LICITACIONES !== "undefined")
    ? NOTIF_ESTADO_LICITACIONES
    : "Pendiente Licitaciones";
}

function licDestino_() {
  return (typeof NOTIF_DESTINO_LICITACIONES !== "undefined") ? NOTIF_DESTINO_LICITACIONES : "";
}


/*************************
 MARCAS DE "YA NOTIFICADO"
 Misma llave que usa alCambiarEstadoRegistro: NOTIF_LICIT_<rut sin puntos>.
 Se consultan los dos almacenes porque getDocumentProperties() devuelve
 null en un proyecto que no está ligado a una planilla.
**************************/
function licMarca_(rut, fila) {
  const clave = notifClaveEstado_(rut);
  return "NOTIF_LICIT_" + (clave || ("FILA" + fila));
}

function licAlmacenEscritura_() {
  return PropertiesService.getDocumentProperties() || PropertiesService.getScriptProperties();
}

function licYaNotificado_(marca) {
  const doc = PropertiesService.getDocumentProperties();
  if (doc && doc.getProperty(marca)) return true;

  const script = PropertiesService.getScriptProperties();
  if (script && script.getProperty(marca)) return true;

  return false;
}


/*************************
 FILAS QUE ESTÁN EN "PENDIENTE LICITACIONES"
**************************/
function licFilasEnEstado_(sh, cols) {
  const salida = [];
  const ultimaFila = sh.getLastRow();
  if (ultimaFila < 2 || cols.estado === -1) return salida;

  const datos = sh.getRange(2, 1, ultimaFila - 1, sh.getLastColumn()).getDisplayValues();
  const objetivo = notifClaveEstado_(licEstado_());

  datos.forEach(function (fila, i) {
    if (notifClaveEstado_(fila[cols.estado - 1]) !== objetivo) return;

    const numeroFila = i + 2;
    const rut = cols.nif !== -1 ? String(fila[cols.nif - 1] || "").trim() : "";
    const marca = licMarca_(rut, numeroFila);

    salida.push({
      fila: numeroFila,
      rut: rut,
      razonSocial: cols.razonSocial !== -1 ? String(fila[cols.razonSocial - 1] || "").trim() : "",
      marca: marca,
      notificado: licYaNotificado_(marca),
      datos: fila
    });
  });

  return salida;
}


/*************************
 1) DIAGNÓSTICO
 Solo lee. No envía nada. Lee el resultado en el registro de ejecución.
**************************/
function diagnosticarLicitaciones() {
  const problemas = [];
  let out = "DIAGNÓSTICO — PENDIENTE LICITACIONES\n";
  out += "======================================================\n\n";

  out += "Usuario que ejecuta : " + Session.getEffectiveUser().getEmail() + "\n";
  out += "Destino configurado : " + (licDestino_() || "(vacío)") + "\n";
  out += "Estado que dispara  : \"" + licEstado_() + "\"\n\n";

  // ── 1. ¿El código está en el proyecto correcto? ──
  const ss = SpreadsheetApp.getActive();

  out += "PROYECTO\n";
  if (!ss) {
    out += "  Ligado a una planilla : NO (proyecto independiente)\n\n";
    problemas.push(
      "Este código NO está dentro del proyecto de la planilla.\n" +
      "     Un proyecto independiente no recibe onEdit de ningún archivo:\n" +
      "     el correo no puede salir nunca.\n" +
      "     → Abre la planilla, Extensiones › Apps Script, y pega ahí el\n" +
      "       archivo de notificaciones y este.");
  } else {
    const mismaPlanilla = (ss.getId() === LIC_SPREADSHEET_ESPERADO);
    out += "  Planilla activa       : " + ss.getName() + "\n";
    out += "  ID                    : " + ss.getId() + "\n";
    out += "  ¿Es la esperada?      : " + (mismaPlanilla ? "sí" : "NO") + "\n\n";

    if (!mismaPlanilla) {
      problemas.push(
        "El proyecto está ligado a OTRA planilla.\n" +
        "     Esperada : " + LIC_SPREADSHEET_ESPERADO + "\n" +
        "     Actual   : " + ss.getId() + "\n" +
        "     Los cambios de estado en la planilla buena no llegan acá.\n" +
        "     → Suele pasar cuando se duplicó la planilla o se pegó el\n" +
        "       código en el proyecto de otro archivo.");
    }
  }

  // ── 2. ¿Está el archivo de notificaciones en este proyecto? ──
  const faltantes = [];
  if (typeof notifEnviarCorreoLicitaciones_ !== "function") faltantes.push("notifEnviarCorreoLicitaciones_");
  if (typeof notifResolverColumnasRegistro_ !== "function") faltantes.push("notifResolverColumnasRegistro_");
  if (typeof notifClaveEstado_ !== "function")              faltantes.push("notifClaveEstado_");
  if (typeof alCambiarEstadoRegistro !== "function")        faltantes.push("alCambiarEstadoRegistro");

  out += "ARCHIVO DE NOTIFICACIONES\n";
  if (faltantes.length) {
    out += "  Funciones que faltan  : " + faltantes.join(", ") + "\n\n";
    problemas.push(
      "El archivo de notificaciones no está en este proyecto.\n" +
      "     Faltan: " + faltantes.join(", ") + "\n" +
      "     → Pega el archivo de notificaciones en ESTE mismo proyecto.");
    Logger.log(out + "\nCONCLUSIÓN\n  1) " + problemas[problemas.length - 1]);
    return out;
  }
  out += "  Presente              : sí\n\n";

  // ── 3. Hoja y columnas ──
  let sh = null;
  let cols = null;

  if (ss) {
    sh = ss.getSheetByName(licHoja_());

    out += "HOJA \"" + licHoja_() + "\"\n";
    if (!sh) {
      const nombres = ss.getSheets().map(function (s) { return "\"" + s.getName() + "\""; });
      out += "  Existe                : NO\n";
      out += "  Hojas de la planilla  : " + nombres.join(", ") + "\n\n";
      problemas.push(
        "No existe una hoja llamada exactamente \"" + licHoja_() + "\".\n" +
        "     El disparador se corta en la primera línea y no avisa.\n" +
        "     → Revisa mayúsculas y espacios sobrantes en el nombre de la pestaña.");
    } else {
      cols = notifResolverColumnasRegistro_(sh);
      const letra = function (n) {
        return n === -1 ? "NO ENCONTRADA" : sh.getRange(1, n).getA1Notation().replace(/\d+/g, "");
      };

      out += "  Existe                : sí (" + sh.getLastRow() + " filas)\n";
      out += "  Columna Estado        : " + letra(cols.estado) + "\n";
      out += "  Columna RUT           : " + letra(cols.nif) + "\n";
      out += "  Columna Razón Social  : " + letra(cols.razonSocial) + "\n";
      out += "  Columna Solicitante   : " + letra(cols.solicitante) + "\n";
      out += "  Columna Doc. Bancario : " + letra(cols.documentoBancario) + "\n\n";

      if (cols.estado === -1) {
        problemas.push(
          "No se encontró la columna \"Estado\" en " + licHoja_() + ".\n" +
          "     → Revisa el encabezado de la fila 1.");
      }
    }
  }

  // ── 4. Disparadores ──
  const triggers = ScriptApp.getProjectTriggers();
  const edicion = triggers.filter(function (t) {
    return t.getHandlerFunction() === "alCambiarEstadoRegistro";
  });

  out += "DISPARADORES (solo se ven los del usuario que ejecuta)\n";
  if (triggers.length === 0) {
    out += "  Ninguno instalado.\n";
  } else {
    triggers.forEach(function (t) {
      let origen = "";
      try { origen = " · origen " + t.getTriggerSourceId(); } catch (e) { origen = ""; }
      out += "  - " + t.getHandlerFunction() + " [" + t.getEventType() + "]" + origen + "\n";
    });
  }
  out += "\n";

  if (edicion.length === 0) {
    problemas.push(
      "NO existe el disparador instalable alCambiarEstadoRegistro para\n" +
      "     este usuario. Sin él no hay correo: el onEdit simple de Code.gs\n" +
      "     no tiene permiso para enviar correos.\n" +
      "     → Ejecuta instalarDisparadoresNotificaciones().\n" +
      "     → Ojo: los disparadores son POR USUARIO. Si lo instaló otra\n" +
      "       persona, no aparece en esta lista aunque exista y funcione.");
  } else {
    edicion.forEach(function (t) {
      let origen = "";
      try { origen = t.getTriggerSourceId(); } catch (e) { origen = ""; }
      if (origen && origen !== LIC_SPREADSHEET_ESPERADO) {
        problemas.push(
          "El disparador alCambiarEstadoRegistro está escuchando OTRA planilla.\n" +
          "     Escucha  : " + origen + "\n" +
          "     Debería  : " + LIC_SPREADSHEET_ESPERADO + "\n" +
          "     → Bórralo y ejecuta instalarDisparadoresNotificaciones()\n" +
          "       desde el proyecto de la planilla correcta.");
      }
    });
  }

  // ── 5. Almacén de marcas ──
  const doc = PropertiesService.getDocumentProperties();
  out += "MARCAS DE ENVÍO\n";
  out += "  DocumentProperties    : " + (doc ? "disponible" : "NULL") + "\n";
  if (!doc) {
    problemas.push(
      "PropertiesService.getDocumentProperties() devuelve null.\n" +
      "     alCambiarEstadoRegistro lo usa sin comprobarlo, así que revienta\n" +
      "     antes de enviar y el error solo queda en el registro.\n" +
      "     Pasa cuando el proyecto no está ligado a la planilla.");
  }

  // ── 6. Filas pendientes ──
  if (sh && cols && cols.estado !== -1) {
    const filas = licFilasEnEstado_(sh, cols);
    out += "\nPROVEEDORES EN \"" + licEstado_() + "\": " + filas.length + "\n";

    filas.forEach(function (f) {
      out += "  - fila " + f.fila + " · " + (f.razonSocial || "sin razón social") +
             " · " + (f.rut || "sin RUT") +
             " · " + (f.notificado ? "YA NOTIFICADO (marca puesta)" : "SIN NOTIFICAR") + "\n";
    });

    const yaMarcados = filas.filter(function (f) { return f.notificado; });
    if (yaMarcados.length) {
      problemas.push(
        "Hay " + yaMarcados.length + " fila(s) con la marca de envío ya puesta.\n" +
        "     El disparador las salta en silencio aunque el correo nunca haya\n" +
        "     llegado (por ejemplo si se probó antes y el envío falló después).\n" +
        "     → limpiarMarcasLicitaciones() y vuelve a cambiar el estado, o\n" +
        "       usa reenviarLicitacionesPendientes() que ignora la marca.");
    }
  }

  // ── 7. Cuota de correo ──
  const cuota = MailApp.getRemainingDailyQuota();
  out += "\nCUOTA DE CORREO\n";
  out += "  Correos disponibles   : " + cuota + "\n";
  if (cuota <= 0) {
    problemas.push(
      "La cuota diaria de correos está agotada. MailApp falla y el error\n" +
      "     queda solo en el registro.\n" +
      "     → Espera al reinicio de la cuota (24 h).");
  }

  // ── Conclusión ──
  out += "\nCONCLUSIÓN\n";
  if (problemas.length === 0) {
    out += "  Todo lo que se puede revisar desde acá está bien.\n\n" +
           "  Si aun así no llegó el correo, quedan dos causas posibles:\n" +
           "   a) El estado no se escribió con una edición manual. El onEdit no\n" +
           "      corre si el valor lo puso un script, una importación o la API.\n" +
           "   b) El envío falló. Revisa Ejecuciones en el menú izquierdo del\n" +
           "      editor y busca alCambiarEstadoRegistro en rojo.\n\n" +
           "  En los dos casos la solución es la misma:\n" +
           "   instalarRedDeSeguridadLicitaciones()";
  } else {
    problemas.forEach(function (p, i) {
      out += "  " + (i + 1) + ") " + p + "\n";
    });
  }

  Logger.log(out);
  return out;
}


/*************************
 2) REENVIAR LO QUE QUEDÓ PENDIENTE
 ⚠ ESTO ENVÍA CORREO DE VERDAD a licitaciones.
 Ignora la marca: sirve para recuperar los avisos que nunca salieron.
**************************/
function reenviarLicitacionesPendientes() {
  return licProcesarPendientes_(true);
}


/*************************
 3) RED DE SEGURIDAD
 Revisa cada LIC_MINUTOS_RED minutos y envía solo lo que no tiene marca.
**************************/
function revisarLicitacionesPendientes() {
  try {
    licProcesarPendientes_(false);
  } catch (error) {
    Logger.log("Error en revisarLicitacionesPendientes: " + error + " | " + (error.stack || ""));
  }
}

function instalarRedDeSeguridadLicitaciones() {
  desinstalarRedDeSeguridadLicitaciones();

  ScriptApp.newTrigger("revisarLicitacionesPendientes")
    .timeBased()
    .everyMinutes(LIC_MINUTOS_RED)
    .create();

  const msg = "Red de seguridad instalada: revisa cada " + LIC_MINUTOS_RED + " minutos.\n" +
              "Desde ahora el aviso a licitaciones ya no depende solo del onEdit.";
  Logger.log(msg);
  return msg;
}

function desinstalarRedDeSeguridadLicitaciones() {
  let borrados = 0;

  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "revisarLicitacionesPendientes") {
      ScriptApp.deleteTrigger(t);
      borrados++;
    }
  });

  Logger.log("Disparadores de la red de seguridad eliminados: " + borrados);
  return borrados;
}


/*************************
 MOTOR COMÚN
 forzar = true  → envía aunque la marca ya esté puesta (recuperación manual)
 forzar = false → envía solo lo que nunca se notificó (red de seguridad)
**************************/
function licProcesarPendientes_(forzar) {
  const ss = SpreadsheetApp.getActive();
  if (!ss) throw new Error("Este proyecto no está ligado a una planilla. Ejecuta diagnosticarLicitaciones().");

  const sh = ss.getSheetByName(licHoja_());
  if (!sh) throw new Error("No existe la hoja '" + licHoja_() + "'.");

  const cols = notifResolverColumnasRegistro_(sh);
  if (cols.estado === -1) throw new Error("No se encontró la columna 'Estado' en " + licHoja_() + ".");

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (e) {
    Logger.log("Otra ejecución tiene el bloqueo. Se intentará en la próxima pasada.");
    return "ocupado";
  }

  try {
    const filas = licFilasEnEstado_(sh, cols);
    const props = licAlmacenEscritura_();
    const enviados = [];
    const omitidos = [];
    const errores = [];

    filas.forEach(function (f) {
      if (f.notificado && !forzar) {
        omitidos.push(f.razonSocial || f.rut || ("fila " + f.fila));
        return;
      }

      try {
        notifEnviarCorreoLicitaciones_(sh, f.datos, cols);
        props.setProperty(f.marca, new Date().toISOString());
        enviados.push((f.razonSocial || "sin razón social") + " (" + (f.rut || "sin RUT") + ")");
      } catch (error) {
        // No se pone la marca: así la próxima pasada lo vuelve a intentar.
        errores.push((f.razonSocial || ("fila " + f.fila)) + " → " + error);
        Logger.log("Falló el envío de la fila " + f.fila + ": " + error + " | " + (error.stack || ""));
      }
    });

    let msg = "Pendiente Licitaciones — revisión\n" +
              "  En ese estado : " + filas.length + "\n" +
              "  Enviados      : " + enviados.length + (enviados.length ? "\n    · " + enviados.join("\n    · ") : "") + "\n" +
              "  Ya notificados: " + omitidos.length + (omitidos.length ? "\n    · " + omitidos.join("\n    · ") : "") + "\n" +
              "  Con error     : " + errores.length + (errores.length ? "\n    · " + errores.join("\n    · ") : "");

    // Solo deja rastro en el registro cuando hubo algo que contar.
    if (enviados.length || errores.length || forzar) Logger.log(msg);

    return msg;

  } finally {
    lock.releaseLock();
  }
}


/*************************
 LIMPIAR MARCAS
 Deja las filas como si nunca se hubieran notificado, para poder probar
 cambiando el estado a mano otra vez.
**************************/
function limpiarMarcasLicitaciones() {
  let borradas = 0;

  [PropertiesService.getDocumentProperties(), PropertiesService.getScriptProperties()]
    .forEach(function (store) {
      if (!store) return;
      const todas = store.getProperties();
      Object.keys(todas).forEach(function (k) {
        if (k.indexOf("NOTIF_LICIT_") === 0) {
          store.deleteProperty(k);
          borradas++;
        }
      });
    });

  const msg = "Marcas de licitaciones borradas: " + borradas;
  Logger.log(msg);
  return msg;
}
