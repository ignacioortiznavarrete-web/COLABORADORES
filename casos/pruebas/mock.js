/* Simulador mínimo de Apps Script para probar las columnas de casos. */

class Sheet {
  constructor(nombre, filas) {
    this.nombre = nombre;
    this.data = (filas || []).map(f => f.slice());
    this.maxColumns = Math.max(1, ...this.data.map(f => f.length));
    this.formatos = {};   // 'fila,col' -> formato de número
    this.formulas = {};   // 'fila,col' -> fórmula en R1C1
    this.data.forEach(f => { while (f.length < this.maxColumns) f.push(''); });
  }

  _fila(r) {
    while (this.data.length < r) this.data.push(new Array(this.maxColumns).fill(''));
    const fila = this.data[r - 1];
    while (fila.length < this.maxColumns) fila.push('');
    return fila;
  }

  getName() { return this.nombre; }
  getMaxColumns() { return this.maxColumns; }

  getLastRow() {
    let ultima = 0;
    this.data.forEach((f, i) => { if (f.some(v => v !== '' && v != null)) ultima = i + 1; });
    return ultima;
  }

  // Las columnas insertadas se llenan vacías, igual que en Sheets. Los formatos
  // no se mueven de sitio: en las pruebas siempre se aplican después de insertar.
  insertColumnsBefore(col, n) {
    if (col < 1 || col > this.maxColumns) throw new Error('insertColumnsBefore fuera de rango: ' + col);
    this.data.forEach(f => f.splice(col - 1, 0, ...new Array(n).fill('')));
    this.maxColumns += n;
    return this;
  }

  insertColumnsAfter(col, n) {
    if (col < 1 || col > this.maxColumns) throw new Error('insertColumnsAfter fuera de rango: ' + col);
    this.data.forEach(f => f.splice(col, 0, ...new Array(n).fill('')));
    this.maxColumns += n;
    return this;
  }

  getRange(r, c, nf, nc) { return new Range(this, r, c, nf || 1, nc || 1); }
}

class Range {
  constructor(hoja, r, c, nf, nc) {
    if (r < 1 || c < 1) throw new Error('getRange fuera de rango: ' + r + ',' + c);
    if (c + nc - 1 > hoja.getMaxColumns()) {
      throw new Error('getRange se pasa del ancho de la hoja: columna ' + (c + nc - 1));
    }
    Object.assign(this, { hoja, r, c, nf, nc });
  }

  getValue() { return this.hoja._fila(this.r)[this.c - 1]; }

  getValues() {
    const salida = [];
    for (let i = 0; i < this.nf; i++) {
      const fila = this.hoja._fila(this.r + i);
      salida.push(fila.slice(this.c - 1, this.c - 1 + this.nc));
    }
    return salida;
  }

  setValues(valores) {
    if (valores.length !== this.nf) throw new Error('setValues: filas no calzan');
    valores.forEach((fila, i) => {
      if (fila.length !== this.nc) throw new Error('setValues: columnas no calzan');
      const destino = this.hoja._fila(this.r + i);
      fila.forEach((v, j) => { destino[this.c - 1 + j] = v; });
    });
    return this;
  }

  setFormulaR1C1(formula) {
    for (let i = 0; i < this.nf; i++) {
      for (let j = 0; j < this.nc; j++) {
        this.hoja._fila(this.r + i)[this.c - 1 + j] = formula;
        this.hoja.formulas[(this.r + i) + ',' + (this.c + j)] = formula;
      }
    }
    return this;
  }

  clearContent() {
    for (let i = 0; i < this.nf; i++) {
      for (let j = 0; j < this.nc; j++) {
        this.hoja._fila(this.r + i)[this.c - 1 + j] = '';
        delete this.hoja.formulas[(this.r + i) + ',' + (this.c + j)];
      }
    }
    return this;
  }

  setNumberFormat(formato) {
    for (let i = 0; i < this.nf; i++) {
      for (let j = 0; j < this.nc; j++) {
        this.hoja.formatos[(this.r + i) + ',' + (this.c + j)] = formato;
      }
    }
    return this;
  }
}

class Spreadsheet {
  constructor() { this.hojas = []; this.avisos = []; }
  insertSheet(nombre, filas) {
    const hoja = new Sheet(nombre, filas);
    this.hojas.push(hoja);
    return hoja;
  }
  getSheets() { return this.hojas.slice(); }
  getSheetByName(nombre) { return this.hojas.filter(h => h.getName() === nombre)[0] || null; }
  getSpreadsheetTimeZone() { return 'America/Santiago'; }
  toast(mensaje) { this.avisos.push(mensaje); return this; }
}

/** Instala los globales que usa Codigo.gs y devuelve una planilla vacía. */
function nuevaPlanilla() {
  const ss = new Spreadsheet();
  const menu = { items: [], addItem(t, f) { this.items.push([t, f]); return this; }, addToUi() { return this; } };

  global.SpreadsheetApp = {
    getActiveSpreadsheet: () => ss,
    getUi: () => ({ createMenu: () => menu })
  };
  global.Utilities = {
    formatDate(fecha, zona, formato) {
      if (formato !== 'yyyy-MM-dd') throw new Error('formato no simulado: ' + formato);
      const dos = n => String(n).padStart(2, '0');
      return fecha.getFullYear() + '-' + dos(fecha.getMonth() + 1) + '-' + dos(fecha.getDate());
    }
  };
  global.__menu = menu;
  return ss;
}

module.exports = { nuevaPlanilla };
