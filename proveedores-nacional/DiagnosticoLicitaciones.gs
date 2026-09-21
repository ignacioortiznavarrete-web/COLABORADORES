/***********************************************************************
 PENDIENTE LICITACIONES — QUIÉN ENVÍA Y POR QUÉ NO SALIÓ
 ---------------------------------------------------------------------
 Archivo independiente. No modifica el código existente: se apoya en las
 funciones del archivo de notificaciones (notifEnviarCorreoLicitaciones_,
 notifResolverColumnasRegistro_, notifClaveEstado_) y en las mismas
 marcas "NOTIF_LICIT_<rut>", así que nunca manda dos veces el mismo aviso.

 EL CORREO SIGUE SALIENDO SOLO CUANDO SE EDITA EL ESTADO.
 Acá no hay ningún disparador por tiempo. Lo único automático sigue
 siendo alCambiarEstadoRegistro, igual que hasta ahora.

 DE QUÉ CUENTA SALEN LOS CORREOS
   Un disparador instalable corre SIEMPRE con la cuenta de quien lo
   instaló, no con la de quien edita. Si lo instalas tú, Juan cambia el
   estado y el correo sale igual desde tu casilla y contra tu cuota.

   El problema es el reverso: si dos personas ejecutaron alguna vez
   instalarDisparadoresNotificaciones(), quedan DOS disparadores y sale
   UN CORREO POR CADA UNO. Dos avisos a licitaciones por cada cambio y
   dos resúmenes diarios.

   ScriptApp.getProjectTriggers() solo devuelve los disparadores de la
   cuenta que ejecuta, así que desde tu cuenta no puedes ver los de otra
   persona. Cada uno tiene que revisar los suyos.

 QUÉ EJECUTAR
   1) quienEnviaLosCorreos()
      Solo lee. Dice con qué cuenta saldrían los correos y qué
      disparadores tiene esta cuenta.

   2) diagnosticarLicitaciones()
      Solo lee. Dice por qué no salió el correo.

   3) reenviarLicitacionesPendientes()
      ENVÍA CORREO de verdad, una sola vez, por los proveedores que
      quedaron en "Pendiente Licitaciones" sin aviso. Sale desde la
      cuenta de quien ejecuta la función.

 PARA DEJAR UNA SOLA CUENTA ENVIANDO
   a) Cada persona que alguna vez instaló los disparadores entra al
      proyecto y ejecuta, DESDE SU CUENTA:
         desinstalarDisparadoresNotificaciones()
   b) Después, y solo tú, ejecutas:
         instalarDisparadoresNotificaciones()
   c) Confirmas con quienEnviaLosCorreos().
***********************************************************************/


/*************************
 CONFIGURACIÓN
**************************/
// ID de la planilla donde DEBE correr esto (ProvChileSantiago).
// Sirve para detectar el caso en que el código quedó pegado en el
// proyecto equivocado, que es un error que no da ningún mensaje.
const LIC_SPREADSHEET_ESPERADO = "1QH4y2H5b0wZ-03Jn7GuSionNKFJI-83D_DSSnj95SlU";


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
 1) ¿DE QUÉ CUENTA SALEN LOS CORREOS?
 Solo lee. No envía nada.
**************************/
function quienEnviaLosCorreos() {
  const cuenta = Session.getEffectiveUser().getEmail();
  const triggers = ScriptApp.getProjectTriggers();

  const mios = {
    edicion: triggers.filter(function (t) { return t.getHandlerFunction() === "alCambiarEstadoRegistro"; }),
    resumen: triggers.filter(function (t) { return t.getHandlerFunction() === "enviarResumenSolicitandoVB"; }),
    respaldo: triggers.filter(function (t) { return t.getHandlerFunction() === "verificarEnvioDiario"; })
  };

  let out = "¿DE QUÉ CUENTA SALEN LOS CORREOS?\n";
  out += "======================================================\n\n";
  out += "Cuenta que ejecuta esta función : " + cuenta + "\n\n";

  out += "DISPARADORES DE ESTA CUENTA\n";
  if (triggers.length === 0) {
    out += "  Ninguno.\n";
  } else {
    triggers.forEach(function (t) {
      let origen = "";
      try { origen = " · origen " + t.getTriggerSourceId(); } catch (e) { origen = ""; }
      out += "  - " + t.getHandlerFunction() + " [" + t.getEventType() + "]" + origen + "\n";
    });
  }
  out += "\n";

  out += "AVISO A LICITACIONES (cambio de estado)\n";
  if (mios.edicion.length === 0) {
    out += "  Esta cuenta NO tiene el disparador.\n";
    out += "  Los correos NO salen desde " + cuenta + ".\n";
    out += "  O los envía otra persona, o no los envía nadie.\n";
    out += "  → Para que salgan desde tu cuenta, ejecuta tú\n";
    out += "    instalarDisparadoresNotificaciones().\n";
  } else if (mios.edicion.length === 1) {
    out += "  Esta cuenta tiene 1 disparador: los correos que dispare\n";
    out += "  este proyecto salen desde " + cuenta + ",\n";
    out += "  sin importar quién edite la planilla.\n";
  } else {
    out += "  ⚠ Esta cuenta tiene " + mios.edicion.length + " disparadores iguales.\n";
    out += "  Cada cambio de estado manda " + mios.edicion.length + " correos.\n";
    out += "  → Ejecuta desinstalarDisparadoresNotificaciones() y después\n";
    out += "    instalarDisparadoresNotificaciones() una sola vez.\n";
  }
  out += "\n";

  out += "RESUMEN DIARIO V°B\n";
  out += "  Disparadores de envío en esta cuenta  : " + mios.resumen.length + "\n";
  out += "  Disparadores de respaldo en esta cuenta: " + mios.respaldo.length + "\n";
  if (mios.resumen.length > 1) {
    out += "  ⚠ Hay más de uno: se manda el resumen repetido.\n";
  }
  out += "\n";

  out += "CUOTA DE CORREO DE ESTA CUENTA\n";
  out += "  Correos disponibles hoy : " + MailApp.getRemainingDailyQuota() + "\n\n";

  out += "LO QUE ESTA FUNCIÓN NO PUEDE VER\n";
  out += "  Los disparadores de OTRAS cuentas. Si Juan también instaló los\n";
  out += "  suyos, existen y envían, pero no aparecen en la lista de arriba.\n\n";
  out += "  Prueba práctica: cambia un estado y cuenta los correos que llegan\n";
  out += "  a licitaciones. Si llegan dos, hay dos cuentas con disparador, y\n";
  out += "  el remitente de cada correo dice cuáles son. La persona que sobra\n";
  out += "  entra al proyecto y ejecuta, desde su cuenta,\n";
  out += "  desinstalarDisparadoresNotificaciones().";

  Logger.log(out);
  return out;
}


/*************************
 2) DIAGNÓSTICO
 Solo lee. No envía nada. Lee el resultado en el registro de ejecución.
**************************/
function diagnosticarLicitaciones() {
  const problemas = [];
  const cuenta = Session.getEffectiveUser().getEmail();

  let out = "DIAGNÓSTICO — PENDIENTE LICITACIONES\n";
  out += "======================================================\n\n";
  out += "Cuenta que ejecuta  : " + cuenta + "\n";
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
    out += "CONCLUSIÓN\n";
    out += "  1) El archivo de notificaciones no está en este proyecto.\n" +
           "     → Pega el archivo de notificaciones en ESTE mismo proyecto.\n";
    Logger.log(out);
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

  out += "DISPARADORES (solo se ven los de " + cuenta + ")\n";
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
      "Esta cuenta NO tiene el disparador instalable alCambiarEstadoRegistro.\n" +
      "     Sin él no hay correo: el onEdit simple de Code.gs no tiene\n" +
      "     permiso para enviar correos.\n" +
      "     → Ejecútalo tú para que además salgan desde tu casilla:\n" +
      "       instalarDisparadoresNotificaciones()\n" +
      "     → Los disparadores son POR CUENTA. Si lo instaló otra persona,\n" +
      "       no aparece acá aunque exista, y los correos salen de su casilla.");
  } else if (edicion.length > 1) {
    problemas.push(
      "Esta cuenta tiene " + edicion.length + " disparadores alCambiarEstadoRegistro.\n" +
      "     Cada cambio de estado manda " + edicion.length + " correos.\n" +
      "     → desinstalarDisparadoresNotificaciones() y después\n" +
      "       instalarDisparadoresNotificaciones() una sola vez.");
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
  out += "\nCUOTA DE CORREO DE ESTA CUENTA\n";
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
    out += "  Todo lo que se puede revisar desde esta cuenta está bien.\n\n" +
           "  Si aun así no llegó el correo, quedan dos causas:\n" +
           "   a) El estado no se escribió con una edición manual. El onEdit no\n" +
           "      corre si el valor lo puso un script, una importación o la API.\n" +
           "      En ese caso hay que cambiar el estado a mano en la celda.\n" +
           "   b) El envío falló. Revisa Ejecuciones en el menú izquierdo del\n" +
           "      editor y busca alCambiarEstadoRegistro en rojo.\n\n" +
           "  Para recuperar los avisos que no salieron:\n" +
           "   reenviarLicitacionesPendientes()";
  } else {
    problemas.forEach(function (p, i) {
      out += "  " + (i + 1) + ") " + p + "\n";
    });
  }

  Logger.log(out);
  return out;
}


/*************************
 3) REENVIAR LO QUE QUEDÓ PENDIENTE
 ⚠ ESTO ENVÍA CORREO DE VERDAD a licitaciones, una vez por proveedor.
 Sale desde la cuenta de quien ejecuta la función.
 Se ejecuta a mano cuando hace falta: no queda nada corriendo solo.
**************************/
function reenviarLicitacionesPendientes() {
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
    return "El sistema está ocupado, intenta de nuevo en un momento.";
  }

  try {
    const filas = licFilasEnEstado_(sh, cols);
    const props = licAlmacenEscritura_();
    const enviados = [];
    const errores = [];

    filas.forEach(function (f) {
      try {
        notifEnviarCorreoLicitaciones_(sh, f.datos, cols);
        props.setProperty(f.marca, new Date().toISOString());
        enviados.push((f.razonSocial || "sin razón social") + " (" + (f.rut || "sin RUT") + ")");
      } catch (error) {
        // No se pone la marca: así queda pendiente para un próximo intento.
        errores.push((f.razonSocial || ("fila " + f.fila)) + " → " + error);
        Logger.log("Falló el envío de la fila " + f.fila + ": " + error + " | " + (error.stack || ""));
      }
    });

    const msg =
      "Reenvío de avisos a licitaciones\n" +
      "  Remitente        : " + Session.getEffectiveUser().getEmail() + "\n" +
      "  Destino          : " + (licDestino_() || "(vacío)") + "\n" +
      "  En ese estado    : " + filas.length + "\n" +
      "  Correos enviados : " + enviados.length +
        (enviados.length ? "\n    · " + enviados.join("\n    · ") : "") + "\n" +
      "  Con error        : " + errores.length +
        (errores.length ? "\n    · " + errores.join("\n    · ") : "");

    Logger.log(msg);
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
