// ID de la hoja de cálculo
const SPREADSHEET_ID = '1s0r_lbPLVH4peQfn_2L7LqrD1Pvmk0tDw4GQR5CsfvI';
const SHEET_NAME = 'Cambios';
const BD_SHEET_NAME = 'BD';

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

    return true;
  } catch (error) {
    Logger.log('Error al guardar la solicitud: ' + error);
    return false;
  }
}
