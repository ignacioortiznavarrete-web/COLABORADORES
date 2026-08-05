/**
 * Proyecto de configuración (ligado a la planilla de solicitudes de cambio).
 *
 * Reemplaza el botón "Actualizar estados SAP" por un trigger instalable:
 * cuando en la hoja "Cambios" la columna Requerimiento pasa de "Procesando"
 * a "Actualizado", se actualiza la hoja BD sólo para el código de material
 * de esa fila (en todos sus centros), no para toda la hoja.
 *
 * Layout real de la planilla:
 *   BD         A Material | B Texto breve | C Tipo material | D Tipo familia | E Stock_Pedido | F Centro
 *              -> una fila por material x centro
 *   Cambios    A Solicitante | B Material | C Cambio Solicitado | D Fecha Solicitud |
 *              E Requerimiento | F Estado Actual (estado anterior, NO se modifica)
 *   USolicitud A Material | B Estado (hoja derivada, sólo lectura)
 */

const CFG = {
  HOJA_BD: 'BD',
  HOJA_CAMBIOS: 'Cambios',

  ESTADO_PENDIENTE: 'Procesando',
  ESTADO_APLICADO: 'Actualizado',

  BD_COL_MATERIAL: 1,   // A
  BD_COL_ESTADO: 5,     // E (Stock_Pedido)

  CAMBIOS_COL_MATERIAL: 2,      // B
  CAMBIOS_COL_NUEVO_ESTADO: 3,  // C (Cambio Solicitado)
  CAMBIOS_COL_REQUERIMIENTO: 5, // E (Procesando / Actualizado)

  // Columna donde dejar la fecha de aplicación en "Cambios".
  // 0 = no escribir fecha (por defecto: F es "Estado Actual" y no debe pisarse).
  // Si agregas un encabezado "Fecha Actualización" en G, pon 7 aquí.
  CAMBIOS_COL_FECHA: 0
};

/* ------------------------------------------------------------------ */
/* Instalación del trigger (ejecutar una sola vez desde el editor)      */
/* ------------------------------------------------------------------ */

/**
 * Crea el trigger instalable onEdit. Ejecutar manualmente una vez y autorizar.
 * Es idempotente: borra el trigger anterior antes de crear el nuevo.
 */
function instalarTriggerEstados() {
  const ss = SpreadsheetApp.getActive();
  eliminarTriggerEstados();
  ScriptApp.newTrigger('alEditarRequerimiento')
    .forSpreadsheet(ss)
    .onEdit()
    .create();
  ss.toast('Trigger instalado. Cambia "Procesando" por "Actualizado" en ' +
           CFG.HOJA_CAMBIOS + '!E para actualizar BD.', 'Estados SAP', 8);
}

/** Elimina el trigger instalable (para desactivar la automatización). */
function eliminarTriggerEstados() {
  ScriptApp.getProjectTriggers()
    .filter(function (t) { return t.getHandlerFunction() === 'alEditarRequerimiento'; })
    .forEach(function (t) { ScriptApp.deleteTrigger(t); });
}

/* ------------------------------------------------------------------ */
/* Trigger: Procesando -> Actualizado                                   */
/* ------------------------------------------------------------------ */

/**
 * Handler del trigger onEdit instalable.
 * Sólo reacciona a la columna Requerimiento de la hoja "Cambios".
 */
function alEditarRequerimiento(e) {
  try {
    if (!e || !e.range) return;

    const hoja = e.range.getSheet();
    if (hoja.getName() !== CFG.HOJA_CAMBIOS) return;

    // ¿La edición toca la columna Requerimiento?
    if (e.range.getColumn() > CFG.CAMBIOS_COL_REQUERIMIENTO ||
        e.range.getLastColumn() < CFG.CAMBIOS_COL_REQUERIMIENTO) return;

    const filaIni = Math.max(2, e.range.getRow());
    const filaFin = e.range.getLastRow();
    if (filaFin < filaIni) return;

    // Edición de una sola celda: exigir la transición Procesando -> Actualizado.
    // (En pegados de varias celdas e.value/e.oldValue vienen indefinidos.)
    const celdaUnica = e.range.getNumRows() === 1 && e.range.getNumColumns() === 1;
    if (celdaUnica) {
      if (!esAplicado_(e.value)) return;
      if (e.oldValue !== undefined && !esPendiente_(e.oldValue)) return;
    }

    const solicitudes = leerSolicitudesDeFilas_(hoja, filaIni, filaFin);
    if (!solicitudes.length) return;

    const resumen = aplicarSolicitudes_(hoja.getParent(), solicitudes);

    hoja.getParent().toast(
      resumen.materiales + ' material(es) · ' + resumen.filasBD + ' fila(s) de BD actualizada(s)',
      'Estados SAP', 6);
  } catch (err) {
    Logger.log('alEditarRequerimiento: ' + ((err && err.stack) || err));
    try {
      SpreadsheetApp.getActive().toast('Error al actualizar BD: ' + err, 'Estados SAP', 10);
    } catch (ignorado) { /* el toast no está disponible en todos los contextos */ }
  }
}

/**
 * Lee las filas indicadas de "Cambios" y devuelve las que quedaron en
 * "Actualizado" con material y estado solicitado válidos.
 */
function leerSolicitudesDeFilas_(hoja, filaIni, filaFin) {
  const ancho = Math.max(CFG.CAMBIOS_COL_MATERIAL,
                         CFG.CAMBIOS_COL_NUEVO_ESTADO,
                         CFG.CAMBIOS_COL_REQUERIMIENTO);
  const valores = hoja.getRange(filaIni, 1, filaFin - filaIni + 1, ancho).getValues();

  const solicitudes = [];
  valores.forEach(function (fila, i) {
    if (!esAplicado_(fila[CFG.CAMBIOS_COL_REQUERIMIENTO - 1])) return;
    const material = clave_(fila[CFG.CAMBIOS_COL_MATERIAL - 1]);
    const estado = String(fila[CFG.CAMBIOS_COL_NUEVO_ESTADO - 1] || '').trim();
    if (!material || !estado) return;
    solicitudes.push({ fila: filaIni + i, material: material, estado: estado });
  });
  return solicitudes;
}

/**
 * Aplica las solicitudes a BD (todos los centros de cada material) y deja la
 * fecha en "Cambios" si CFG.CAMBIOS_COL_FECHA está configurada.
 */
function aplicarSolicitudes_(ss, solicitudes) {
  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(30000)) throw new Error('Otra actualización está en curso, reintenta en unos segundos.');

  try {
    // material -> estado solicitado (si se repite el material, gana la última fila)
    const mapa = {};
    solicitudes.forEach(function (s) { mapa[s.material] = s.estado; });

    const filasBD = actualizarBD_(ss, mapa);

    if (CFG.CAMBIOS_COL_FECHA) {
      const hoja = ss.getSheetByName(CFG.HOJA_CAMBIOS);
      const ahora = new Date();
      solicitudes.forEach(function (s) {
        hoja.getRange(s.fila, CFG.CAMBIOS_COL_FECHA).setValue(ahora);
      });
    }

    return { materiales: Object.keys(mapa).length, filasBD: filasBD };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Actualiza BD!E para todas las filas cuyo material esté en el mapa.
 * Un solo getValues + un solo setValues sobre la columna de estado.
 * Devuelve la cantidad de filas efectivamente modificadas.
 */
function actualizarBD_(ss, mapa) {
  const hojaBD = ss.getSheetByName(CFG.HOJA_BD);
  if (!hojaBD) throw new Error('No existe la hoja ' + CFG.HOJA_BD);

  const ultimaFila = hojaBD.getLastRow();
  if (ultimaFila < 2) return 0;

  const n = ultimaFila - 1;
  const materiales = hojaBD.getRange(2, CFG.BD_COL_MATERIAL, n, 1).getValues();
  const rangoEstados = hojaBD.getRange(2, CFG.BD_COL_ESTADO, n, 1);
  const estados = rangoEstados.getValues();

  let cambios = 0;
  for (let i = 0; i < n; i++) {
    const nuevo = mapa[clave_(materiales[i][0])];
    if (nuevo === undefined) continue;
    if (String(estados[i][0]).trim() === nuevo) continue;
    estados[i][0] = nuevo;
    cambios++;
  }

  if (cambios) rangoEstados.setValues(estados);
  return cambios;
}

/* ------------------------------------------------------------------ */
/* Respaldo manual: procesar todo lo que quedó en "Procesando"          */
/* ------------------------------------------------------------------ */

/**
 * Recorre "Cambios", aplica a BD todas las filas en "Procesando" y las marca
 * como "Actualizado". Sirve como recuperación si el trigger estuvo caído o
 * para cargas masivas hechas por script (los triggers onEdit no se disparan
 * con escrituras hechas por código).
 */
function procesarPendientes() {
  const ss = SpreadsheetApp.getActive();
  const hoja = ss.getSheetByName(CFG.HOJA_CAMBIOS);
  if (!hoja) throw new Error('No existe la hoja ' + CFG.HOJA_CAMBIOS);

  const ultimaFila = hoja.getLastRow();
  if (ultimaFila < 2) return { materiales: 0, filasBD: 0, filasCambios: 0 };

  const ancho = Math.max(CFG.CAMBIOS_COL_MATERIAL,
                         CFG.CAMBIOS_COL_NUEVO_ESTADO,
                         CFG.CAMBIOS_COL_REQUERIMIENTO);
  const valores = hoja.getRange(2, 1, ultimaFila - 1, ancho).getValues();
  const rangoReq = hoja.getRange(2, CFG.CAMBIOS_COL_REQUERIMIENTO, ultimaFila - 1, 1);
  const requerimientos = rangoReq.getValues();

  const mapa = {};
  const filasMarcadas = [];
  for (let i = 0; i < valores.length; i++) {
    if (!esPendiente_(requerimientos[i][0])) continue;
    const material = clave_(valores[i][CFG.CAMBIOS_COL_MATERIAL - 1]);
    const estado = String(valores[i][CFG.CAMBIOS_COL_NUEVO_ESTADO - 1] || '').trim();
    if (!material || !estado) continue;
    mapa[material] = estado;
    requerimientos[i][0] = CFG.ESTADO_APLICADO;
    filasMarcadas.push(i + 2);
  }

  if (!filasMarcadas.length) {
    ss.toast('No hay solicitudes en "' + CFG.ESTADO_PENDIENTE + '".', 'Estados SAP', 5);
    return { materiales: 0, filasBD: 0, filasCambios: 0 };
  }

  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(30000)) throw new Error('Otra actualización está en curso, reintenta en unos segundos.');

  let filasBD;
  try {
    filasBD = actualizarBD_(ss, mapa);
    rangoReq.setValues(requerimientos);
    if (CFG.CAMBIOS_COL_FECHA) {
      const ahora = new Date();
      filasMarcadas.forEach(function (f) {
        hoja.getRange(f, CFG.CAMBIOS_COL_FECHA).setValue(ahora);
      });
    }
  } finally {
    lock.releaseLock();
  }

  const resumen = {
    materiales: Object.keys(mapa).length,
    filasBD: filasBD,
    filasCambios: filasMarcadas.length
  };
  ss.toast(resumen.materiales + ' material(es) · ' + resumen.filasBD +
           ' fila(s) de BD · ' + resumen.filasCambios + ' solicitud(es) marcada(s)',
           'Estados SAP', 8);
  return resumen;
}

/**
 * Alias del botón antiguo, para que un botón todavía asignado no falle
 * mientras se retira de la planilla. Ya no usa SpreadsheetApp.getUi().alert(),
 * que revienta cuando se ejecuta fuera de la interfaz.
 */
function actualizarEstadosSAP() {
  return procesarPendientes();
}

/* ------------------------------------------------------------------ */
/* Utilidades                                                           */
/* ------------------------------------------------------------------ */

/** Normaliza un código de material para comparar (texto vs número). */
function clave_(valor) {
  return String(valor === null || valor === undefined ? '' : valor).trim().toUpperCase();
}

function esPendiente_(valor) {
  return String(valor || '').trim().toLowerCase() === CFG.ESTADO_PENDIENTE.toLowerCase();
}

function esAplicado_(valor) {
  return String(valor || '').trim().toLowerCase() === CFG.ESTADO_APLICADO.toLowerCase();
}

/* ------------------------------------------------------------------ */
/* Web app de búsqueda de materiales (sin cambios)                      */
/* ------------------------------------------------------------------ */

// Función principal para procesar el HTML
function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Búsqueda Detallada de Materiales')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// Función para obtener los datos desde la hoja activa
function getData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet();
  var data = sheet.getDataRange().getValues();

  var headers = data.shift();
  var groupedData = {};

  // Recolectar valores únicos para los filtros
  var filters = {
    tipoMaterial: new Set(),
    familia: new Set(),
    estadoSAP: new Set()
  };

  data.forEach(row => {
    var material = row[0];

    // Agregar valores a los filtros
    filters.tipoMaterial.add(row[2]);
    filters.familia.add(row[3]);
    filters.estadoSAP.add(row[4]);

    if (!groupedData[material]) {
      groupedData[material] = {
        material: row[0],
        textoBreve: row[1],
        tipoMaterial: row[2],
        familia: row[3],
        estadoSAP: row[4],
        centros: new Set([row[5]])
      };
    } else {
      // Asegurarse de conservar el primer estado SAP encontrado
      groupedData[material].centros.add(row[5]);
    }
  });

  return {
    data: Object.values(groupedData).map(item => ({
      ...item,
      centros: Array.from(item.centros).join(' - ')
    })),
    filters: {
      tipoMaterial: Array.from(filters.tipoMaterial).sort(),
      familia: Array.from(filters.familia).sort(),
      estadoSAP: Array.from(filters.estadoSAP).sort()
    }
  };
}

// Función para obtener datos filtrados
function getFilteredData(searchText, tipoMaterial, familia, estadoSAP) {
  // Si los parámetros no se proporcionan, usar valores predeterminados (sin filtros)
  searchText = searchText || "";

  // Obtener todos los datos
  var allData = getData().data;

  // Filtrar los datos según los criterios
  var filteredData = allData.filter(function(row) {
    // Verificar si coincide con la búsqueda de texto
    var matchesSearch = searchText === "" ||
      Object.values(row).some(function(value) {
        return value.toString().toLowerCase().includes(searchText.toLowerCase());
      });

    // Verificar si coincide con los filtros de selección
    var matchesTipo = !tipoMaterial || row.tipoMaterial === tipoMaterial;
    var matchesFamilia = !familia || row.familia === familia;
    var matchesEstado = !estadoSAP || row.estadoSAP === estadoSAP;

    return matchesSearch && matchesTipo && matchesFamilia && matchesEstado;
  });

  // Ordenar por Estado SAP con prioridad personalizada
  filteredData.sort(function(a, b) {
    var prioridadA = getEstadoSAPPriority(a.estadoSAP || '');
    var prioridadB = getEstadoSAPPriority(b.estadoSAP || '');
    return prioridadA - prioridadB;
  });

  return filteredData;
}

// Función auxiliar para determinar la prioridad del estado SAP
function getEstadoSAPPriority(estado) {
  switch(estado.toLowerCase()) {
    case 'stock': return 1;
    case 'pedido': return 2;
    case 'descontinuado': return 3;
    default: return 4;
  }
}

// Función para descargar los datos como Excel con los filtros aplicados
function downloadTableAsExcel(searchText, tipoMaterial, familia, estadoSAP) {
  // Obtener datos filtrados usando la misma lógica de la interfaz web
  var filteredData = getFilteredData(searchText, tipoMaterial, familia, estadoSAP);

  // Crear un nuevo spreadsheet
  var newSpreadsheet = SpreadsheetApp.create('Inventario de Materiales - ' + new Date().toLocaleDateString());
  var newSheet = newSpreadsheet.getActiveSheet();

  // Establecer encabezados
  var headers = ["Material", "Texto Breve de Material", "Tipo Material", "Familia", "Estado SAP", "Centros"];
  newSheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  // Preparar los datos filtrados para escribir en el sheet
  var rowsToWrite = filteredData.map(function(item) {
    return [
      item.material,
      item.textoBreve,
      item.tipoMaterial,
      item.familia,
      item.estadoSAP,
      item.centros
    ];
  });

  // Escribir datos al nuevo spreadsheet
  if (rowsToWrite.length > 0) {
    newSheet.getRange(2, 1, rowsToWrite.length, headers.length).setValues(rowsToWrite);
  }

  // Añadir filtros automáticamente al spreadsheet
  newSheet.getRange(1, 1, rowsToWrite.length + 1, headers.length).createFilter();

  // Hacer el spreadsheet público (accesible para cualquiera con el enlace)
  // Obtener el ID del archivo
  var fileId = newSpreadsheet.getId();
  var file = DriveApp.getFileById(fileId);

  // Configurar el archivo como público (cualquiera con el enlace puede ver)
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  // Retornar la URL del nuevo spreadsheet
  return newSpreadsheet.getUrl();
}
