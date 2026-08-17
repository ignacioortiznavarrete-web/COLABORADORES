/**
 * Simulador mínimo de Apps Script para probar la mesa fuera de Google.
 *
 * Solo implementa lo que el proyecto usa de verdad. Guarda valores, fondos y
 * notas por celda para poder afirmar en las pruebas que se escribió donde
 * correspondía y que no se pisó nada.
 */
const MAX_FILAS = 400;

/** Cadena de métodos de formato que no cambian datos: devuelven el rango. */
const SOLO_FORMATO = [
  'setFontWeight', 'setFontColor', 'setVerticalAlignment', 'setHorizontalAlignment',
  'setWrap', 'setNumberFormat', 'setDataValidation', 'setBorder', 'setFontSize',
  'setFontStyle', 'clearDataValidations', 'setHorizontalAlignments'
];

class Sheet {
  constructor(nombre) {
    this.nombre = nombre;
    this.datos = [];
    this.fondos = {};
    this.notas = {};
    this.maxColumnas = 30;
  }

  _fila(r) {
    while (this.datos.length < r) this.datos.push([]);
    return this.datos[r - 1];
  }

  _leer(r, c) {
    const fila = this.datos[r - 1];
    if (!fila) return '';
    const v = fila[c - 1];
    return v === undefined ? '' : v;
  }

  _escribir(r, c, v) {
    const fila = this._fila(r);
    while (fila.length < c) fila.push('');
    fila[c - 1] = v;
    if (c > this.maxColumnas) this.maxColumnas = c;
  }

  getName() { return this.nombre; }
  setName(n) { this.nombre = n; return this; }
  getMaxRows() { return Math.max(MAX_FILAS, this.datos.length); }
  getMaxColumns() { return this.maxColumnas; }
  insertColumnsAfter(despues, cuantas) { this.maxColumnas = Math.max(this.maxColumnas, despues + cuantas); return this; }
  insertRowsAfter() { return this; }
  setFrozenRows() { return this; }
  setColumnWidth() { return this; }
  autoResizeColumn() { return this; }
  getFilter() { return null; }

  getLastRow() {
    let ultima = 0;
    this.datos.forEach((fila, i) => {
      if (fila.some(v => v !== '' && v !== null && v !== undefined)) ultima = i + 1;
    });
    return ultima;
  }

  getLastColumn() {
    let ultima = 0;
    this.datos.forEach(fila => {
      for (let i = fila.length - 1; i >= 0; i--) {
        if (fila[i] !== '' && fila[i] !== null && fila[i] !== undefined) {
          ultima = Math.max(ultima, i + 1);
          break;
        }
      }
    });
    return ultima;
  }

  appendRow(valores) {
    const r = this.getLastRow() + 1;
    valores.forEach((v, i) => this._escribir(r, i + 1, v));
    return this;
  }

  /** Acepta getRange(f, c[, nf, nc]) y la forma "A:A" (que solo se usa para formatos). */
  getRange(a, b, nf, nc) {
    if (typeof a === 'string') return this._rango(1, 1, 1, 1);
    return this._rango(a, b, nf || 1, nc || 1);
  }

  _rango(r, c, nf, nc) {
    const hoja = this;
    const rango = {
      getRow: () => r,
      getColumn: () => c,
      getNumRows: () => nf,
      getNumColumns: () => nc,

      getValue: () => hoja._leer(r, c),
      setValue(v) { hoja._escribir(r, c, v); return this; },

      getValues() {
        const salida = [];
        for (let i = 0; i < nf; i++) {
          const fila = [];
          for (let j = 0; j < nc; j++) fila.push(hoja._leer(r + i, c + j));
          salida.push(fila);
        }
        return salida;
      },
      setValues(vals) {
        if (vals.length !== nf) throw new Error(`setValues: esperaba ${nf} filas, llegaron ${vals.length}`);
        vals.forEach((fila, i) => {
          if (fila.length !== nc) throw new Error(`setValues: esperaba ${nc} columnas, llegaron ${fila.length}`);
          fila.forEach((v, j) => hoja._escribir(r + i, c + j, v));
        });
        return this;
      },

      setNote(t) { hoja.notas[`${r},${c}`] = t; return this; },
      getNote() { return hoja.notas[`${r},${c}`] || ''; },
      setNotes(vals) {
        if (vals.length !== nf) throw new Error(`setNotes: esperaba ${nf} filas, llegaron ${vals.length}`);
        vals.forEach((fila, i) => {
          if (fila.length !== nc) throw new Error(`setNotes: esperaba ${nc} columnas, llegaron ${fila.length}`);
          fila.forEach((v, j) => { hoja.notas[`${r + i},${c + j}`] = v; });
        });
        return this;
      },
      clearNote() { delete hoja.notas[`${r},${c}`]; return this; },

      setBackground(color) {
        for (let i = 0; i < nf; i++) {
          for (let j = 0; j < nc; j++) hoja.fondos[`${r + i},${c + j}`] = color;
        }
        return this;
      },
      getBackground() { return hoja.fondos[`${r},${c}`] || '#ffffff'; },
      getBackgrounds() {
        const salida = [];
        for (let i = 0; i < nf; i++) {
          const fila = [];
          for (let j = 0; j < nc; j++) fila.push(hoja.fondos[`${r + i},${c + j}`] || '#ffffff');
          salida.push(fila);
        }
        return salida;
      },
      setBackgrounds(vals) {
        if (vals.length !== nf) throw new Error(`setBackgrounds: esperaba ${nf} filas, llegaron ${vals.length}`);
        vals.forEach((fila, i) => {
          if (fila.length !== nc) throw new Error(`setBackgrounds: esperaba ${nc} columnas, llegaron ${fila.length}`);
          fila.forEach((v, j) => { hoja.fondos[`${r + i},${c + j}`] = v; });
        });
        return this;
      },

      createFilter: () => ({ remove() {} })
    };

    SOLO_FORMATO.forEach(m => { rango[m] = () => rango; });
    return rango;
  }
}

class Spreadsheet {
  constructor(nombre) { this.nombre = nombre; this.hojas = []; this.activa = null; this.rangoActivo = null; }
  getName() { return this.nombre; }
  getSheets() { return this.hojas.slice(); }
  getSheetByName(n) { return this.hojas.filter(h => h.getName() === n)[0] || null; }
  insertSheet(n) { const h = new Sheet(n); this.hojas.push(h); return h; }
  getSpreadsheetTimeZone() { return 'America/Santiago'; }
  getActiveSheet() { return this.activa; }
  getActiveRange() { return this.rangoActivo; }
  setActiveSheet(h) { this.activa = h; return h; }
}

const LIBRO = new Spreadsheet('Seguimiento Trading');

const validacion = () => {
  const b = {};
  ['requireValueInList', 'requireValueInRange', 'setAllowInvalid', 'setHelpText'].forEach(m => { b[m] = () => b; });
  b.build = () => ({});
  return b;
};

global.SpreadsheetApp = {
  openById: () => LIBRO,
  getActiveSpreadsheet: () => LIBRO,
  getActiveSheet: () => LIBRO.getActiveSheet(),
  getActiveRange: () => LIBRO.getActiveRange(),
  setActiveSheet: h => LIBRO.setActiveSheet(h),
  newDataValidation: validacion,
  flush: () => {},
  getUi: () => { throw new Error('no hay interfaz en las pruebas'); }
};

global.LockService = {
  getDocumentLock: () => ({ tryLock: () => true, releaseLock: () => {} }),
  getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} })
};

global.CacheService = {
  getDocumentCache: () => ({ get: () => null, put: () => {}, remove: () => {} })
};

global.Session = {
  getActiveUser: () => ({ getEmail: () => (global.__USUARIO === undefined ? 'ana@masisa.com' : global.__USUARIO) }),
  getScriptTimeZone: () => 'America/Santiago'
};

global.Utilities = {
  formatDate(fecha, tz, formato) {
    const p = n => String(n).padStart(2, '0');
    return formato
      .replace('yyyy', fecha.getFullYear())
      .replace('MM', p(fecha.getMonth() + 1))
      .replace('dd', p(fecha.getDate()))
      .replace('HH', p(fecha.getHours()))
      .replace('mm', p(fecha.getMinutes()))
      .replace('ss', p(fecha.getSeconds()));
  },
  formatString: (f, ...args) => {
    let i = 0;
    return f.replace(/%\.?\d*[a-z]/g, () => String(args[i++]));
  }
};

global.ScriptApp = {
  getProjectTriggers: () => [],
  deleteTrigger: () => {},
  newTrigger: () => ({
    timeBased: () => ({ everyHours: () => ({ create: () => ({}) }) })
  }),
  getService: () => ({ getUrl: () => 'https://script.google.com/macros/s/x/exec' })
};

global.HtmlService = {
  createTemplateFromFile: () => ({ evaluate: () => ({}) }),
  createHtmlOutputFromFile: () => ({ getContent: () => '' }),
  XFrameOptionsMode: { ALLOWALL: 'ALLOWALL' }
};

/**
 * Carga los fuentes .gs en este proceso como si fueran un mismo proyecto:
 * runInThisContext deja las funciones y las constantes en el ámbito global,
 * que es justo como se ven entre sí los archivos en Apps Script.
 *
 * Con ARCHIVO_UNICO=1 se prueba el Codigo.gs generado en vez de los fuentes,
 * para confirmar que los dos se comportan igual.
 */
function cargarProyecto(archivos) {
  const fs = require('fs');
  const path = require('path');
  const vm = require('vm');
  const base = path.join(__dirname, '..');

  const rutas = process.env.ARCHIVO_UNICO === '1'
    ? [path.join(base, 'Codigo.gs')]
    : archivos.map(a => path.join(base, 'fuente', a));

  rutas.forEach(ruta => {
    vm.runInThisContext(fs.readFileSync(ruta, 'utf8'), { filename: path.basename(ruta) });
  });

  return rutas.map(r => path.basename(r));
}

module.exports = { LIBRO, Sheet, cargarProyecto };
