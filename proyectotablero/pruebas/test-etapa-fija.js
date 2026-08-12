/**
 * Verifica el modo "un enlace por formulario": cuando ETAPA_FIJA está definida,
 * el despliegue solo atiende esa etapa y la impone en el servidor, aunque el
 * cliente pida otra.
 */
const fs = require('fs');
const vm = require('vm');
const path = require('path');
require('./mock');

const DIR = path.join(__dirname, '..');

function cargarCon(etapaFija) {
  const sandbox = Object.create(global);
  sandbox.global = sandbox;
  vm.createContext(sandbox);
  ['Config.gs', 'Setup.gs', 'Solicitudes.gs'].forEach(f => {
    let src = fs.readFileSync(path.join(DIR, f), 'utf8');
    if (f === 'Config.gs') {
      if (src.indexOf("const ETAPA_FIJA = '';") === -1) {
        throw new Error('No se encontró la declaración de ETAPA_FIJA en Config.gs');
      }
      src = src.replace("const ETAPA_FIJA = '';", "const ETAPA_FIJA = '" + etapaFija + "';");
    }
    vm.runInContext(src, sandbox, { filename: f });
  });
  return sandbox;
}

let fallos = 0;
function ok(cond, msg) {
  console.log((cond ? '  ✓ ' : '  ✗ ') + msg);
  if (!cond) fallos++;
}

console.log('\nDespliegue con ETAPA_FIJA');

const libre = cargarCon('');
ok(libre.etapaEfectiva_('td') === 'td', 'sin ETAPA_FIJA respeta la etapa pedida');
ok(libre.etapaEfectiva_('costos') === 'costos', 'sin ETAPA_FIJA acepta cualquiera de las 3');
try {
  libre.etapaEfectiva_('inventada');
  ok(false, 'sin ETAPA_FIJA rechaza etapas inexistentes');
} catch (e) { ok(/Etapa desconocida/.test(e.message), 'sin ETAPA_FIJA rechaza etapas inexistentes'); }

const soloTd = cargarCon('td');
ok(soloTd.etapaEfectiva_('costos') === 'td', 'con ETAPA_FIJA="td" ignora la etapa que pide el cliente');
ok(soloTd.etapaEfectiva_('') === 'td', 'con ETAPA_FIJA="td" funciona sin parámetro');
ok(soloTd.etapaEfectiva_(undefined) === 'td', 'con ETAPA_FIJA="td" tolera un payload sin etapaId');

const mala = cargarCon('bodega');
try {
  mala.etapaEfectiva_('costos');
  ok(false, 'avisa si ETAPA_FIJA está mal escrita');
} catch (e) { ok(/ETAPA_FIJA inválida/.test(e.message), 'avisa si ETAPA_FIJA está mal escrita'); }

console.log('\n' + (fallos ? '✗ ' + fallos + ' fallo(s)' : '✓ Todas las pruebas pasaron'));
process.exit(fallos ? 1 : 0);
