/* Simulador mínimo de Apps Script para probar el registro de maderas. */
const MAX_ROWS = 5000;

function chainable(obj) {
  ['setFontWeight', 'setBackground', 'setFontColor', 'setVerticalAlignment', 'setHorizontalAlignment',
   'setWrap', 'setNumberFormat', 'setDataValidation'].forEach(m => { obj[m] = () => obj; });
  return obj;
}

class Sheet {
  constructor(name) { this.name = name; this.data = []; this.formatos = {}; }
  _cell(r, c) {
    while (this.data.length < r) this.data.push([]);
    const row = this.data[r - 1];
    while (row.length < c) row.push('');
    return row;
  }
  getName() { return this.name; }
  getMaxRows() { return MAX_ROWS; }
  getLastRow() {
    let last = 0;
    this.data.forEach((row, i) => { if (row.some(v => v !== '' && v != null)) last = i + 1; });
    return last;
  }
  getLastColumn() {
    let last = 0;
    this.data.forEach(row => {
      for (let i = row.length - 1; i >= 0; i--) {
        if (row[i] !== '' && row[i] != null) { last = Math.max(last, i + 1); break; }
      }
    });
    return last;
  }
  setFrozenRows() { return this; }
  setRowHeight() { return this; }
  autoResizeColumn() { return this; }
  appendRow(values) {
    const r = this.getLastRow() + 1;
    values.forEach((v, i) => { this._cell(r, i + 1)[i] = v; });
    return this;
  }
  getRange(r, c, nr, nc) {
    nr = nr || 1; nc = nc || 1;
    const sheet = this;
    const rango = chainable({
      getRow() { return r; },
      getColumn() { return c; },
      getValue() { return sheet._cell(r, c)[c - 1]; },
      getDisplayValue() { const v = sheet._cell(r, c)[c - 1]; return v == null ? '' : String(v); },
      setValue(v) { sheet._cell(r, c)[c - 1] = v; return this; },
      getValues() {
        const out = [];
        for (let i = 0; i < nr; i++) {
          const row = sheet._cell(r + i, c + nc - 1);
          out.push(row.slice(c - 1, c - 1 + nc).map(v => (v === undefined ? '' : v)));
        }
        return out;
      },
      setValues(vals) {
        vals.forEach((row, i) => {
          const target = sheet._cell(r + i, c + nc - 1);
          row.forEach((v, j) => { target[c - 1 + j] = v; });
        });
        return this;
      },
      /**
       * Como el TextFinder real: literal, sin distinguir mayúsculas, y cada
       * findNext() sigue donde quedó el anterior dando la vuelta al final.
       */
      createTextFinder(texto) {
        let entera = false;
        let sensible = false;
        let pos = 0;
        const total = nr * nc;
        const finder = {
          matchEntireCell(v) { entera = v; return finder; },
          matchCase(v) { sensible = v; return finder; },
          findNext() {
            const buscado = sensible ? String(texto) : String(texto).toLowerCase();
            for (let k = 0; k < total; k++) {
              const idx = (pos + k) % total;
              const i = Math.floor(idx / nc);
              const j = idx % nc;
              const bruto = sheet._cell(r + i, c + j)[c + j - 1];
              const valor = sensible ? String(bruto == null ? '' : bruto)
                : String(bruto == null ? '' : bruto).toLowerCase();
              if (valor === '') continue;
              const calza = entera ? valor === buscado : valor.indexOf(buscado) !== -1;
              if (calza) { pos = idx + 1; return sheet.getRange(r + i, c + j); }
            }
            return null;
          }
        };
        return finder;
      }
    });
    // El formato se guarda solo para poder revisarlo en las pruebas.
    rango.setNumberFormat = fmt => { sheet.formatos[r + ',' + c] = fmt; return rango; };
    return rango;
  }
}

class Spreadsheet {
  constructor() { this.sheets = {}; }
  getSheetByName(n) { return this.sheets[n] || null; }
  insertSheet(n) { this.sheets[n] = new Sheet(n); return this.sheets[n]; }
  getSpreadsheetTimeZone() { return 'America/Santiago'; }
}

const SS = new Spreadsheet();
const cache = {};

global.SpreadsheetApp = {
  openById: () => SS,
  flush: () => {},
  getUi: () => { throw new Error('sin UI en pruebas'); }
};
global.CacheService = {
  getScriptCache: () => ({
    get: k => (k in cache ? cache[k] : null),
    put: (k, v) => { cache[k] = String(v); },
    remove: k => { delete cache[k]; }
  })
};
global.LockService = {
  getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} })
};
global.Session = {
  // __USUARIO = '' simula a Google no pudiendo identificar la cuenta.
  getActiveUser: () => ({
    getEmail: () => (global.__USUARIO === undefined ? 'test@masisa.com' : global.__USUARIO)
  }),
  getScriptTimeZone: () => 'America/Santiago'
};
global.Utilities = {
  formatDate: (d, tz, fmt) => {
    const p = n => String(n).padStart(2, '0');
    return fmt
      .replace('yyyy', d.getFullYear())
      .replace('MM', p(d.getMonth() + 1))
      .replace('dd', p(d.getDate()))
      .replace('HH', p(d.getHours()))
      .replace('mm', p(d.getMinutes()))
      .replace('ss', p(d.getSeconds()));
  }
};
global.Logger = { log: () => {} };
global.ScriptApp = { getService: () => ({ getUrl: () => 'https://script.google.com/macros/s/x/exec' }) };
global.HtmlService = {
  createTemplateFromFile: () => ({ evaluate: () => ({ setTitle: () => ({ addMetaTag: () => ({}) }) }) }),
  createTemplate: () => ({ evaluate: () => ({ setTitle: () => ({ addMetaTag: () => ({}) }) }) }),
  createHtmlOutputFromFile: () => ({ getContent: () => '' })
};

function limpiarCache() {
  Object.keys(cache).forEach(k => { delete cache[k]; });
}

module.exports = { SS, Sheet, limpiarCache };
