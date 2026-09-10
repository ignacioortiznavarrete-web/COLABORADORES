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
  getMaxColumns() { return 30; }
  getActiveRangeList() {
    return this.__seleccion ? { getRanges: () => this.__seleccion } : null;
  }
  getActiveRange() { return this.__seleccion ? this.__seleccion[0] : null; }
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
      getNumRows() { return nr; },
      getNumColumns() { return nc; },
      getValue() { return sheet._cell(r, c)[c - 1]; },
      getDisplayValue() { const v = sheet._cell(r, c)[c - 1]; return v == null ? '' : String(v); },
      setValue(v) { sheet._cell(r, c)[c - 1] = v; return this; },
      getValues() {
        const out = [];
        for (let i = 0; i < nr; i++) {
          const row = sheet._cell(r + i, c + nc - 1);
          const tramo = [];
          for (let j = 0; j < nc; j++) {
            const v = row[c - 1 + j];
            tramo.push(v === undefined ? '' : v);
          }
          out.push(tramo);
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
    rango.setNumberFormats = m => {
      m.forEach((f, i) => f.forEach((fmt, j) => { sheet.formatos[(r + i) + ',' + (c + j)] = fmt; }));
      return rango;
    };
    // Como Sheets: en una celda que no es texto, '032' se guarda como 32 y se
    // muestra "32". Así las pruebas notan si se pierden los ceros.
    rango.getDisplayValues = () => rango.getValues().map((f, i) => f.map((v, j) => {
      if (sheet.formatos[(r + i) + ',' + (c + j)] === '@') return String(v == null ? '' : v);
      if (typeof v === 'string' && v !== '' && !isNaN(Number(v))) return String(Number(v));
      return String(v == null ? '' : v);
    }));
    return rango;
  }
}

class Spreadsheet {
  constructor() { this.sheets = {}; }
  getSheetByName(n) { return this.sheets[n] || null; }
  /** La selección del usuario, para probar la bajada desde el menú. */
  __seleccionar(nombre, tramos) {
    this.__activa = this.sheets[nombre];
    this.__activa.__seleccion = tramos.map(([fila, filas]) =>
      this.__activa.getRange(fila, 1, filas, 1));
  }
  getActiveSheet() { return this.__activa; }
  insertSheet(n) { this.sheets[n] = new Sheet(n); return this.sheets[n]; }
  getSpreadsheetTimeZone() { return 'America/Santiago'; }
}

const SS = new Spreadsheet();
const cache = {};

global.SpreadsheetApp = {
  openById: () => SS,
  getActiveSheet: () => SS.getActiveSheet(),
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
/* --- ZIP mínimo, sin comprimir: alcanza para revisar que el xlsx abra. --- */
const TABLA_CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = TABLA_CRC[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function comprimir(partes) {
  const locales = [];
  const central = [];
  let desplazamiento = 0;
  partes.forEach(p => {
    const nombre = Buffer.from(p.name, 'utf8');
    const datos = Buffer.from(p.bytes);
    const crc = crc32(datos);

    const local = Buffer.alloc(30 + nombre.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(datos.length, 18);
    local.writeUInt32LE(datos.length, 22);
    local.writeUInt16LE(nombre.length, 26);
    nombre.copy(local, 30);
    locales.push(local, datos);

    const dir = Buffer.alloc(46 + nombre.length);
    dir.writeUInt32LE(0x02014b50, 0);
    dir.writeUInt16LE(20, 4);
    dir.writeUInt16LE(20, 6);
    dir.writeUInt32LE(crc, 16);
    dir.writeUInt32LE(datos.length, 20);
    dir.writeUInt32LE(datos.length, 24);
    dir.writeUInt16LE(nombre.length, 28);
    dir.writeUInt32LE(desplazamiento, 42);
    nombre.copy(dir, 46);
    central.push(dir);

    desplazamiento += local.length + datos.length;
  });

  const cuerpo = Buffer.concat(locales);
  const directorio = Buffer.concat(central);
  const fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054b50, 0);
  fin.writeUInt16LE(partes.length, 8);
  fin.writeUInt16LE(partes.length, 10);
  fin.writeUInt32LE(directorio.length, 12);
  fin.writeUInt32LE(cuerpo.length, 16);
  return Buffer.concat([cuerpo, directorio, fin]);
}

global.Utilities = {
  newBlob: (contenido, tipo, nombre) => ({
    __blob: true,
    name: nombre,
    type: tipo,
    // Como el de verdad: acepta texto o una lista de bytes con signo.
    bytes: Array.isArray(contenido)
      ? Buffer.from(contenido.map(b => b < 0 ? b + 256 : b))
      : Buffer.from(String(contenido), 'utf8'),
    getName: function () { return this.name; },
    // Como el de verdad: una lista de bytes CON SIGNO, no un Buffer. La
    // diferencia importa: sobre un Buffer, concat no expande.
    getBytes: function () {
      return Array.from(this.bytes).map(b => (b > 127 ? b - 256 : b));
    },
    getDataAsString: function () { return this.bytes.toString('utf8'); }
  }),
  zip: partes => {
    const bytes = comprimir(partes);
    return {
      __zip: true,
      __partes: partes,
      getBytes: () => bytes,
      setName: function () { return this; },
      getName: () => 'archivo.zip'
    };
  },
  base64Encode: bytes => Buffer.from(bytes).toString('base64'),
  formatDate: (d, tz, fmt) => {
    const p = n => String(n).padStart(2, '0');
    const utc = String(tz).toUpperCase() === 'UTC';
    const partes = {
      yyyy: utc ? d.getUTCFullYear() : d.getFullYear(),
      MM: p((utc ? d.getUTCMonth() : d.getMonth()) + 1),
      dd: p(utc ? d.getUTCDate() : d.getDate()),
      HH: p(utc ? d.getUTCHours() : d.getHours()),
      mm: p(utc ? d.getUTCMinutes() : d.getMinutes()),
      ss: p(utc ? d.getUTCSeconds() : d.getSeconds())
    };
    // Como SimpleDateFormat: lo que va entre comillas simples es literal.
    return fmt.replace(/'([^']*)'|yyyy|MM|dd|HH|mm|ss/g,
      (m, literal) => (literal !== undefined ? literal : partes[m]));
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
