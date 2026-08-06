/***********************************************************************
 ASIGNACIÓN DE VALOR UNITARIO A HOJA 1  (cruce por código)
 ---------------------------------------------------------------------
 Archivo independiente. NO modifica ni depende de Code.gs.

 Cruza cada fila de "Hoja 1" contra la hoja de valores usando la clave:

       RUT  +  Rol  +  Diametro  +  Largo

 y escribe en "Hoja 1" el "Valor Unitario USD" que corresponde, más un
 "Valor Total USD" = valor unitario × Cubicación (m³).

 PUNTOS QUE RESUELVE EL CÓDIGO
   1) El Largo viene con distinto formato en cada hoja:
        - Hoja de valores: "3.20", "4.00"  (punto, dos decimales)
        - Hoja 1:          "3,2",  "4"      (coma, sin ceros)
      Un reemplazo de separadores NO basta ("3,2" ≠ "3.20"). Por eso el
      Largo (y el Diámetro) se comparan como NÚMERO, no como texto.

   2) El Valor Unitario usa coma decimal chilena ("52,5"); se interpreta
      con coma = decimal y punto = miles.

   3) Si la hoja de valores tiene la MISMA clave con valores DISTINTOS,
      se aplica la política VAL_CONFLICTO (por defecto "ultimo" gana) y
      se informa la cantidad y ejemplos en el registro y en el resumen.

 CÓMO USAR
   - Ejecuta  previsualizarValores()  para ver un informe SIN escribir.
   - Ejecuta  asignarValoresHoja1()   para escribir los valores en Hoja 1.
   El dashboard (Code.gs) ya define onOpen, por eso este archivo no crea
   menú. Si quieres un botón de menú, ve la nota al final del archivo.
***********************************************************************/


/*************************
 CONFIGURACIÓN
**************************/
const VAL_CONFIG = {
  // Si queda "", usa la planilla activa. Si la corres desde el editor del
  // dashboard, ya es la correcta. El ID es el mismo que usa Code.gs.
  SPREADSHEET_ID: '1q_6ojGWI0OPjopobAIMtIdlRaLOHAMNyUhSKJzlSvgg',

  MAIN_SHEET: 'Hoja 1',

  // Nombre de la hoja de valores. Si queda "", se detecta sola por sus
  // encabezados (la que tenga "Valor Unitario USD").
  VALUES_SHEET: '',

  // Columnas de salida en Hoja 1 (se crean al final si no existen).
  OUT_UNIT_HEADER:  'Valor Unitario USD',
  OUT_TOTAL_HEADER: 'Valor Total USD',
  ESCRIBIR_TOTAL: true,

  // Qué hacer si la hoja de valores repite la misma clave con distinto
  // valor: "ultimo" (gana la fila más abajo) o "primero".
  VAL_CONFLICTO: 'ultimo'
};


/*************************
 FUNCIÓN PRINCIPAL — ESCRIBE EN HOJA 1
**************************/
function asignarValoresHoja1() {
  const ss = valAbrirPlanilla_();
  const shMain = ss.getSheetByName(VAL_CONFIG.MAIN_SHEET);
  if (!shMain) throw new Error("No existe la hoja '" + VAL_CONFIG.MAIN_SHEET + "'.");

  const lookup = valConstruirLookup_(ss);
  const cols = valColumnasMain_(shMain);

  const ultimaFila = shMain.getLastRow();
  if (ultimaFila < 2) {
    valMostrar_('No hay filas de datos en ' + VAL_CONFIG.MAIN_SHEET + '.');
    return;
  }

  const nFilas = ultimaFila - 1;
  const datos = shMain.getRange(2, 1, nFilas, shMain.getLastColumn()).getDisplayValues();

  const salidaUnit = new Array(nFilas);
  const salidaTotal = new Array(nFilas);

  let coincidencias = 0;
  let sinValor = 0;
  let sinClave = 0;
  const ejemplosSinValor = [];

  for (let i = 0; i < nFilas; i++) {
    const fila = datos[i];

    const rut = cols.rut !== -1 ? fila[cols.rut - 1] : '';
    const rol = cols.rol !== -1 ? fila[cols.rol - 1] : '';
    const diam = cols.diametro !== -1 ? fila[cols.diametro - 1] : '';
    const largo = cols.largo !== -1 ? fila[cols.largo - 1] : '';

    const clave = valClave_(rut, rol, diam, largo);

    // Fila sin datos suficientes para armar la clave (ej. Rol "-").
    if (!clave) {
      salidaUnit[i] = [''];
      salidaTotal[i] = [''];
      sinClave++;
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(lookup.map, clave)) {
      const valor = lookup.map[clave];
      salidaUnit[i] = [valor];

      if (VAL_CONFIG.ESCRIBIR_TOTAL) {
        const cub = cols.cubicacion !== -1 ? valNumero_(fila[cols.cubicacion - 1]) : NaN;
        salidaTotal[i] = [isNaN(cub) ? '' : Math.round(valor * cub * 100) / 100];
      }
      coincidencias++;
    } else {
      salidaUnit[i] = [''];
      salidaTotal[i] = [''];
      sinValor++;
      if (ejemplosSinValor.length < 8) {
        ejemplosSinValor.push(valClaveLegible_(rut, rol, diam, largo));
      }
    }
  }

  // Escribir columnas de salida (creándolas al final si no existen).
  const colUnit = valObtenerOCrearColumna_(shMain, VAL_CONFIG.OUT_UNIT_HEADER);
  shMain.getRange(2, colUnit, nFilas, 1).setValues(salidaUnit);

  if (VAL_CONFIG.ESCRIBIR_TOTAL) {
    const colTotal = valObtenerOCrearColumna_(shMain, VAL_CONFIG.OUT_TOTAL_HEADER);
    shMain.getRange(2, colTotal, nFilas, 1).setValues(salidaTotal);
  }

  const resumen = valArmarResumen_(
    { coincidencias, sinValor, sinClave, nFilas, ejemplosSinValor },
    lookup, true
  );
  Logger.log(resumen);
  valMostrar_(resumen);
  return resumen;
}


/*************************
 PREVISUALIZACIÓN — NO ESCRIBE
**************************/
function previsualizarValores() {
  const ss = valAbrirPlanilla_();
  const shMain = ss.getSheetByName(VAL_CONFIG.MAIN_SHEET);
  if (!shMain) throw new Error("No existe la hoja '" + VAL_CONFIG.MAIN_SHEET + "'.");

  const lookup = valConstruirLookup_(ss);
  const cols = valColumnasMain_(shMain);

  const ultimaFila = shMain.getLastRow();
  const nFilas = Math.max(0, ultimaFila - 1);
  let coincidencias = 0, sinValor = 0, sinClave = 0;
  const ejemplosSinValor = [];

  if (nFilas > 0) {
    const datos = shMain.getRange(2, 1, nFilas, shMain.getLastColumn()).getDisplayValues();
    datos.forEach(function (fila) {
      const rut = cols.rut !== -1 ? fila[cols.rut - 1] : '';
      const rol = cols.rol !== -1 ? fila[cols.rol - 1] : '';
      const diam = cols.diametro !== -1 ? fila[cols.diametro - 1] : '';
      const largo = cols.largo !== -1 ? fila[cols.largo - 1] : '';
      const clave = valClave_(rut, rol, diam, largo);
      if (!clave) { sinClave++; return; }
      if (Object.prototype.hasOwnProperty.call(lookup.map, clave)) {
        coincidencias++;
      } else {
        sinValor++;
        if (ejemplosSinValor.length < 8) ejemplosSinValor.push(valClaveLegible_(rut, rol, diam, largo));
      }
    });
  }

  const resumen = valArmarResumen_(
    { coincidencias, sinValor, sinClave, nFilas, ejemplosSinValor },
    lookup, false
  );
  Logger.log(resumen);
  valMostrar_(resumen);
  return resumen;
}


/*************************
 CONSTRUCCIÓN DEL DICCIONARIO DE VALORES
 Clave  →  valor unitario (número).
**************************/
function valConstruirLookup_(ss) {
  const sh = valHojaValores_(ss);
  if (!sh) {
    throw new Error(
      "No se encontró la hoja de valores. Indica su nombre en " +
      "VAL_CONFIG.VALUES_SHEET, o revisa que tenga la columna 'Valor Unitario USD'."
    );
  }

  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0];
  const c = {
    rol:   valBuscarColumna_(headers, ['rol predio', 'rol', 'predio']),
    diametro: valBuscarColumna_(headers, ['diametro']),
    largo: valBuscarColumna_(headers, ['largo']),
    valor: valBuscarColumna_(headers, ['valor unitario usd', 'valor unitario', 'valor']),
    rut:   valBuscarColumna_(headers, ['rut', 'rut proveedor', 'n identificacion fiscal'])
  };

  const faltan = [];
  ['rol', 'diametro', 'largo', 'valor', 'rut'].forEach(function (k) {
    if (c[k] === -1) faltan.push(k);
  });
  if (faltan.length) {
    throw new Error(
      "En la hoja de valores '" + sh.getName() + "' faltan columnas: " + faltan.join(', ') +
      ". Encabezados encontrados: " + headers.join(' | ')
    );
  }

  const map = {};
  const conflictos = [];
  let filasValidas = 0, filasIgnoradas = 0;

  const ultima = sh.getLastRow();
  if (ultima > 1) {
    const datos = sh.getRange(2, 1, ultima - 1, sh.getLastColumn()).getDisplayValues();

    datos.forEach(function (fila) {
      const rut = fila[c.rut - 1];
      const rol = fila[c.rol - 1];
      const diam = fila[c.diametro - 1];
      const largo = fila[c.largo - 1];
      const valor = valParseValorCLP_(fila[c.valor - 1]);

      const clave = valClave_(rut, rol, diam, largo);
      if (!clave || isNaN(valor)) { filasIgnoradas++; return; }
      filasValidas++;

      if (Object.prototype.hasOwnProperty.call(map, clave)) {
        const previo = map[clave];
        if (Math.abs(previo - valor) > 1e-9) {
          if (conflictos.length < 10) {
            conflictos.push({
              clave: valClaveLegible_(rut, rol, diam, largo),
              previo: previo,
              nuevo: valor
            });
          }
          if (VAL_CONFIG.VAL_CONFLICTO === 'ultimo') map[clave] = valor;
          // si es 'primero', se conserva el previo
        }
      } else {
        map[clave] = valor;
      }
    });
  }

  return {
    map: map,
    hojaValores: sh.getName(),
    filasValidas: filasValidas,
    filasIgnoradas: filasIgnoradas,
    clavesUnicas: Object.keys(map).length,
    conflictos: conflictos
  };
}


/*************************
 CLAVE DE CRUCE
 RUT + Rol + Diámetro(num) + Largo(num). Devuelve '' si falta algo.
**************************/
function valClave_(rut, rol, diam, largo) {
  const r = valNormRut_(rut);
  const ro = valNormRol_(rol);
  const d = valNumKey_(diam);
  const l = valNumKey_(largo);
  // Un Rol/RUT sin caracteres alfanuméricos (ej. "-") se trata como vacío.
  if (!r || !ro || !/[0-9A-Z]/.test(ro) || d === '' || l === '') return '';
  return r + '¦' + ro + '¦' + d + '¦' + l;
}

function valClaveLegible_(rut, rol, diam, largo) {
  return valNormRut_(rut) + ' · ' + valNormRol_(rol) + ' · Ø' + valNumKey_(diam) + ' · L' + valNumKey_(largo);
}


/*************************
 NORMALIZACIÓN
**************************/
// Número canónico para la clave: acepta coma o punto como decimal.
// "3,2"→"3.2"  "3.20"→"3.2"  "4"→"4"  "24"→"24"
function valNumKey_(x) {
  const n = valNumero_(x);
  if (isNaN(n)) return '';
  return String(Math.round(n * 1000) / 1000);
}

// Parseo de largo/diámetro/cubicación: coma o punto = decimal.
function valNumero_(x) {
  let s = String(x === null || x === undefined ? '' : x).trim();
  if (!s) return NaN;
  s = s.replace(/\s+/g, '').replace(',', '.').replace(/[^0-9.\-]/g, '');
  if (s === '' || s === '-' || s === '.') return NaN;
  const n = parseFloat(s);
  return isNaN(n) ? NaN : n;
}

// Parseo del valor con formato chileno: punto = miles, coma = decimal.
// "52,5"→52.5  "1.234,56"→1234.56  "70"→70
function valParseValorCLP_(x) {
  let s = String(x === null || x === undefined ? '' : x).trim();
  if (!s) return NaN;
  s = s.replace(/\s+/g, '').replace(/[^0-9.,\-]/g, '');
  if (s.indexOf(',') !== -1) {
    s = s.replace(/\./g, '').replace(',', '.');   // quita miles, coma→punto
  }
  // si no hay coma, se deja el punto tal cual (entero o decimal con punto)
  const n = parseFloat(s);
  return isNaN(n) ? NaN : n;
}

function valNormRut_(rut) {
  return String(rut || '').toUpperCase().replace(/[.\-\s]/g, '').replace(/[^0-9K]/g, '');
}

function valNormRol_(rol) {
  return String(rol || '')
    .trim().toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}


/*************************
 DETECCIÓN DE HOJAS / COLUMNAS
**************************/
function valHojaValores_(ss) {
  if (VAL_CONFIG.VALUES_SHEET) {
    return ss.getSheetByName(VAL_CONFIG.VALUES_SHEET);
  }

  // Auto-detección: la hoja que tenga "valor unitario" + "rut" + "largo".
  const hojas = ss.getSheets();
  for (let i = 0; i < hojas.length; i++) {
    const sh = hojas[i];
    if (sh.getName() === VAL_CONFIG.MAIN_SHEET) continue;
    if (sh.getLastColumn() < 3 || sh.getLastRow() < 2) continue;

    const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0];
    const tieneValor = valBuscarColumna_(headers, ['valor unitario usd', 'valor unitario']) !== -1;
    const tieneRut   = valBuscarColumna_(headers, ['rut', 'rut proveedor']) !== -1;
    const tieneLargo = valBuscarColumna_(headers, ['largo']) !== -1;
    if (tieneValor && tieneRut && tieneLargo) return sh;
  }
  return null;
}

function valColumnasMain_(sh) {
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0];
  return {
    rol:   valBuscarColumna_(headers, ['rol']),
    diametro: valBuscarColumna_(headers, ['diametro']),
    largo: valBuscarColumna_(headers, ['largo']),
    rut:   valBuscarColumna_(headers, ['rut proveedor', 'rut']),
    cubicacion: valBuscarColumna_(headers, ['cubicacion'])
  };
}

function valBuscarColumna_(headers, aliases) {
  const norm = headers.map(valNormTexto_);
  for (let i = 0; i < aliases.length; i++) {
    const objetivo = valNormTexto_(aliases[i]);
    const idx = norm.indexOf(objetivo);
    if (idx !== -1) return idx + 1;
  }
  return -1;
}

function valNormTexto_(t) {
  return String(t || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[°º]/g, '')
    .replace(/[.\-_/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim().toLowerCase();
}

function valObtenerOCrearColumna_(sh, nombre) {
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0];
  const idx = valBuscarColumna_(headers, [nombre]);
  if (idx !== -1) return idx;
  const col = sh.getLastColumn() + 1;
  sh.getRange(1, col).setValue(nombre);
  return col;
}


/*************************
 UTILIDADES DE PLANILLA / SALIDA
**************************/
function valAbrirPlanilla_() {
  const activa = SpreadsheetApp.getActiveSpreadsheet();
  if (activa) return activa;
  if (VAL_CONFIG.SPREADSHEET_ID) return SpreadsheetApp.openById(VAL_CONFIG.SPREADSHEET_ID);
  throw new Error('No hay planilla activa y VAL_CONFIG.SPREADSHEET_ID está vacío.');
}

function valMostrar_(texto) {
  try {
    SpreadsheetApp.getActiveSpreadsheet().toast(
      texto.split('\n').slice(0, 3).join('  '), 'Valores', 8
    );
  } catch (e) { /* sin UI (ejecución por trigger): solo queda en el log */ }
}

function valArmarResumen_(stats, lookup, escribio) {
  let s = escribio ? 'VALORES ASIGNADOS A ' + VAL_CONFIG.MAIN_SHEET + '\n' : 'PREVISUALIZACIÓN (no se escribió nada)\n';
  s += '===========================================\n';
  s += 'Hoja de valores: ' + lookup.hojaValores + '\n';
  s += 'Claves únicas en valores: ' + lookup.clavesUnicas +
       '  (filas válidas ' + lookup.filasValidas + ', ignoradas ' + lookup.filasIgnoradas + ')\n\n';

  s += 'Filas de ' + VAL_CONFIG.MAIN_SHEET + ': ' + stats.nFilas + '\n';
  s += '  ✓ Con valor asignado : ' + stats.coincidencias + '\n';
  s += '  ✗ Sin valor en tabla : ' + stats.sinValor + '\n';
  s += '  – Sin clave (Rol/RUT vacío o "-") : ' + stats.sinClave + '\n';

  if (stats.ejemplosSinValor && stats.ejemplosSinValor.length) {
    s += '\nEjemplos sin coincidencia:\n';
    stats.ejemplosSinValor.forEach(function (e) { s += '   · ' + e + '\n'; });
  }

  if (lookup.conflictos && lookup.conflictos.length) {
    s += '\n⚠ Claves repetidas con valor distinto en la hoja de valores ' +
         '(política: gana el ' + VAL_CONFIG.VAL_CONFLICTO + '):\n';
    lookup.conflictos.forEach(function (cf) {
      s += '   · ' + cf.clave + '  →  ' + cf.previo + '  vs  ' + cf.nuevo + '\n';
    });
    s += '   Revisa esas filas en la hoja de valores si el precio no es el esperado.\n';
  }

  return s;
}


/***********************************************************************
 NOTA — CÓMO AGREGAR UN BOTÓN DE MENÚ (opcional)
 El dashboard (Code.gs) ya tiene su propio onOpen, y solo puede existir
 uno por proyecto. Si quieres un acceso desde el menú, agrega ESTA línea
 dentro del onOpen que ya existe en Code.gs, junto a los demás addItem:

     .addItem('Asignar valores a Hoja 1', 'asignarValoresHoja1')

 Si prefieres no tocar Code.gs, simplemente ejecuta asignarValoresHoja1
 desde el editor de Apps Script cuando necesites recalcular.
***********************************************************************/
