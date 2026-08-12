/**
 * Verifica el control de acceso por formulario dentro de UN SOLO proyecto:
 * con ACCESOS configurado, cada persona solo puede usar su etapa, aunque
 * escriba ?form= de otra en la URL.
 */
const fs = require('fs');
const vm = require('vm');
const path = require('path');
require('./mock');

const DIR = path.join(__dirname, '..', 'fuente');

const ACCESOS_DEMO = `const ACCESOS = {
  costos: ['ana.costos@masisa.com'],
  td: ['beto.td@masisa.com'],
  produccion: ['caro.prod@masisa.com']
};`;

function cargar() {
  const sandbox = Object.create(global);
  sandbox.global = sandbox;
  vm.createContext(sandbox);
  ['Config.gs', 'Setup.gs', 'Solicitudes.gs', 'WebApp.gs'].forEach(f => {
    let src = fs.readFileSync(path.join(DIR, f), 'utf8');
    if (f === 'Config.gs') {
      const re = /const ACCESOS = \{[\s\S]*?\n\};/;
      if (!re.test(src)) throw new Error('No se encontró la declaración de ACCESOS en Config.gs');
      src = src.replace(re, ACCESOS_DEMO);
    }
    vm.runInContext(src, sandbox, { filename: f });
  });
  return sandbox;
}

const S = cargar();

let fallos = 0;
function ok(cond, msg) {
  console.log((cond ? '  ✓ ' : '  ✗ ') + msg);
  if (!cond) fallos++;
}
function como(email) { global.__USUARIO = email; }

console.log('\nControl de acceso por formulario (un solo proyecto)');

como('ana.costos@masisa.com');
ok(S.puedeAcceder_('costos'), 'Ana entra a Costos');
ok(!S.puedeAcceder_('td') && !S.puedeAcceder_('produccion'), 'Ana no entra a T&D ni Producción');
ok(S.etapasAccesibles_().length === 1 && S.etapasAccesibles_()[0].id === 'costos',
   'para Ana solo hay un formulario disponible → el enlace la lleva directo a Costos');

como('beto.td@masisa.com');
ok(S.puedeAcceder_('td') && !S.puedeAcceder_('costos'), 'Beto solo entra a T&D');

como('caro.prod@masisa.com');
ok(S.puedeAcceder_('produccion') && !S.puedeAcceder_('costos'), 'Caro solo entra a Producción');

como('ajeno@otraempresa.com');
ok(S.etapasAccesibles_().length === 0, 'una cuenta ajena no ve ningún formulario');

// El servidor corta aunque el cliente insista con otra etapa.
como('beto.td@masisa.com');
try {
  S.apiContexto('costos');
  ok(false, 'el servidor rechaza abrir un formulario ajeno');
} catch (e) { ok(/no tiene acceso al formulario Costos/.test(e.message), 'el servidor rechaza abrir un formulario ajeno'); }

try {
  S.apiGuardar({ etapaId: 'costos', datos: {}, estado: 'Aprobado' });
  ok(false, 'el servidor rechaza guardar en una etapa ajena');
} catch (e) { ok(/no tiene acceso al formulario Costos/.test(e.message), 'el servidor rechaza guardar en una etapa ajena'); }

// Sin ACCESOS (configuración por defecto) todos pueden usar los tres.
const abierto = (() => {
  const sandbox = Object.create(global);
  sandbox.global = sandbox;
  vm.createContext(sandbox);
  ['Config.gs', 'Setup.gs', 'Solicitudes.gs', 'WebApp.gs'].forEach(f => {
    vm.runInContext(fs.readFileSync(path.join(DIR, f), 'utf8'), sandbox, { filename: f });
  });
  return sandbox;
})();
como('cualquiera@masisa.com');
ok(abierto.etapasAccesibles_().length === 3, 'con ACCESOS vacío (por defecto) se ven los tres formularios');

delete global.__USUARIO;
console.log('\n' + (fallos ? '✗ ' + fallos + ' fallo(s)' : '✓ Todas las pruebas pasaron'));
process.exit(fallos ? 1 : 0);
