/**
 * Pruebas de las alertas de codificación. Usan el mismo simulador de Apps
 * Script que el formulario de entrada: son proyectos distintos, pero el mismo
 * spreadsheet.
 */
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const { SS } = require('../../pruebas/mock');

const FUENTES = ['Config.gs', 'Alertas.gs'].map(f => path.join(__dirname, '..', 'fuente', f));
console.log('Probando: ' + FUENTES.map(f => path.basename(f)).join(', '));
FUENTES.forEach(f => vm.runInThisContext(fs.readFileSync(f, 'utf8'), { filename: path.basename(f) }));

let fallos = 0;
function ok(cond, msg) {
  console.log((cond ? '  ✓ ' : '  ✗ ') + msg);
  if (!cond) fallos++;
}
function seccion(t) { console.log('\n' + t); }

/* ------------------------------------------- las bitácoras, como quedan hoy */

const REG = ['N° Solicitud', 'Fecha', 'Usuario', 'Tipo Solicitud', 'Estado',
  'Fecha de creación', 'SKU', 'Observación', 'Observación codificación'];
const DET = ['N° Solicitud', 'Fecha', 'Solicitante', 'Correo', 'Clase Requerimiento',
  'País', 'Tipo Requerimiento', 'Origen', 'Centro', 'Tipo Material', 'Agrupación',
  'Descripción Agrupación', 'Código', 'Descripción Material', 'Grupo Artículo',
  'Espesor', 'Ancho', 'Largo', 'Piezas', 'UMB', 'Stock/Pedido',
  'Aserradero', 'Secado', 'Cepillado', 'Hoja Destino', 'Fila Destino'];

function escribir(nombre, encabezados, filas) {
  const hoja = SS.getSheetByName(nombre) || SS.insertSheet(nombre);
  hoja.getRange(1, 1, 1, encabezados.length).setValues([encabezados]);
  filas.forEach((f, i) => hoja.getRange(2 + i, 1, 1, encabezados.length)
    .setValues([encabezados.map(h => (h in f ? f[h] : ''))]));
  return hoja;
}

const registro = escribir('Registro', REG, [
  { 'N° Solicitud': 'SOL-00001', 'Fecha': '24.09.2026', 'Usuario': 'Barbara Soto',
    'Tipo Solicitud': 'PT', 'Estado': 'Creando' },
  { 'N° Solicitud': 'SOL-00002', 'Fecha': '24.09.2026', 'Usuario': 'Jorge Ruiz',
    'Tipo Solicitud': 'PP', 'Estado': 'Pendiente' },
  // Una sin detalle: no hay a quién escribirle.
  { 'N° Solicitud': 'SOL-00003', 'Fecha': '24.09.2026', 'Usuario': 'Ana Vera',
    'Tipo Solicitud': 'PE', 'Estado': 'Creando' }
]);

// Como queda la hoja de verdad: el proyecto de entrada deja Espesor, Ancho y
// Largo en formato texto, porque un espesor es '032' y no 32.
const detalle = SS.insertSheet('Registro Detalle');
['Espesor', 'Ancho', 'Largo'].forEach(r =>
  detalle.getRange(2, DET.indexOf(r) + 1, 50, 1).setNumberFormat('@'));

escribir('Registro Detalle', DET, [
  { 'N° Solicitud': 'SOL-00001', 'Correo': 'barbara@masisa.com', 'Código': 'RVMH032X180X3800',
    'Descripción Material': 'Rús. Verde Médula 032X180X3800', 'Espesor': '032',
    'Ancho': '180', 'Largo': '3800', 'Piezas': '248', 'UMB': 'PZA' },
  { 'N° Solicitud': 'SOL-00001', 'Correo': 'barbara@masisa.com', 'Código': 'RVMH032X180X3850',
    'Descripción Material': 'Rús. Verde Médula 032X180X3850', 'Espesor': '032',
    'Ancho': '180', 'Largo': '3850', 'UMB': 'PZA' },
  { 'N° Solicitud': 'SOL-00002', 'Correo': 'jorge@masisa.com', 'Código': 'RVM 032X180',
    'Descripción Material': 'Rústico Verde Médula 032X180', 'Espesor': '032',
    'Ancho': '180', 'UMB': 'M3' }
]);

escribir('Registro Estados', ['N° Solicitud', 'Estado', 'Fecha', 'Usuario'], [
  { 'N° Solicitud': 'SOL-00001', 'Estado': 'Solicitando',
    'Fecha': '24.09.2026 09:12', 'Usuario': 'Barbara Soto' },
  { 'N° Solicitud': 'SOL-00001', 'Estado': 'Finalizado',
    'Fecha': '25.09.2026 17:48', 'Usuario': 'Jose Ortiz' }
]);

/** Simula mover el combo de Estado en la hoja, como lo ve el disparador. */
const COLUMNA_ESTADO = REG.indexOf('Estado') + 1;
function mover(fila, estado) {
  registro.getRange(fila, COLUMNA_ESTADO).setValue(estado);
  alEditarRegistro({ range: registro.getRange(fila, COLUMNA_ESTADO), value: estado });
}

/* ------------------------------------------------------------- las pruebas */

seccion('Solo se avisa en los estados configurados');
{
  ok(AVISOS.length >= 1 && avisoDe_('Finalizado'), 'Finalizado manda un correo');
  ok(!avisoDe_('Creando'), 'Creando no: ese lo manda el proyecto de entrada');
  ok(!avisoDe_('Solicitando') && !avisoDe_('Pendiente'),
    'y los demás pasos tampoco mandan nada');
  ok(!!avisoDe_('finalizado') && !!avisoDe_('FINALIZADO'),
    'el estado se compara sin importar mayúsculas');
  ok(!!avisoDe_('Validando informacion') === !!avisoDe_('Validando información'),
    'ni tildes');
}

seccion('Al finalizar sale el correo, de la cuenta que lo instaló');
{
  global.__CORREOS = [];
  mover(2, 'Finalizado');

  ok(global.__CORREOS.length === 1, 'sale un correo');
  ok(global.__CORREOS[0].para === 'barbara@masisa.com', 'a quien pidió, que sale del detalle');
  ok(global.__CORREOS[0].asunto.indexOf('costo plan liberado') !== -1,
    'con el asunto de código registrado y costo plan liberado');
  ok(global.__CORREOS[0].asunto.indexOf('SOL-00001') !== -1, 'y el número de su solicitud');

  const cuerpo = global.__CORREOS[0].cuerpo;
  ok(cuerpo.indexOf('SOL-00001 quedó finalizada') !== -1, 'el texto la nombra');
  ok(cuerpo.indexOf('RVMH032X180X3800') !== -1 && cuerpo.indexOf('RVMH032X180X3850') !== -1,
    'y van sus dos códigos, no solo el primero');
  ok(cuerpo.indexOf('032 x 180 x 3800') !== -1, 'con su medida, con los ceros');
  ok(cuerpo.indexOf('248 PZA') !== -1, 'y las piezas cuando las tiene');
  ok(cuerpo.indexOf('Monitor: ') !== -1, 'más el enlace al monitor');
  ok(global.__CORREOS[0].opciones.name === REMITENTE, 'firmado como codificación');
}

// Un correo de Apps Script sale de la cuenta que corre el script. A la casilla
// de codificación no siempre se puede entrar, y mover el estado desde ella
// borraría de la bitácora quién lo movió. El alias resuelve las dos cosas.
seccion('El alias: sale de codificación aunque lo mande otra cuenta');
{
  global.__CORREOS = [];
  global.__ALIAS = ['codificacion.corporativa@masisa.com'];
  const r = mandarAviso_(avisoDe_('Finalizado'), 'SOL-00001');

  ok(r.ok && r.alias === true, 'con el alias puesto, sale por él');
  ok(global.__CORREOS[0].desde === 'codificacion.corporativa@masisa.com',
    'y el remitente es la dirección de codificación: ' + global.__CORREOS[0].desde);
  ok(r.mensaje.indexOf('codificacion.corporativa@masisa.com') !== -1,
    'el resultado lo dice, no hay que adivinarlo');

  // Sin alias el correo SALE IGUAL: uno que no llega es peor que uno que llega
  // del remitente equivocado. Pero queda dicho de dónde salió.
  global.__CORREOS = [];
  global.__ALIAS = [];
  const sin = mandarAviso_(avisoDe_('Finalizado'), 'SOL-00001');
  ok(sin.ok && sin.alias === false, 'sin alias se manda igual, pero se sabe');
  ok(global.__CORREOS.length === 1 && !global.__CORREOS[0].desde,
    'y sale desde la cuenta que corre el disparador');
  ok(sin.mensaje.indexOf('Enviar como') !== -1 || sin.mensaje.indexOf('no está en') !== -1,
    'el resultado explica por qué: ' + sin.mensaje);

  // Un alias de otra dirección no sirve.
  global.__ALIAS = ['otra.cosa@masisa.com'];
  ok(!puedeUsarElAlias_(), 'un alias que no es el de codificación no cuenta');

  global.__ALIAS = ['codificacion.corporativa@masisa.com'];
}

// El correo sale con la dirección de codificación, así que sin esto no
// quedaría dicho en ninguna parte quién cerró la solicitud de verdad.
seccion('Quién la movió va en el correo');
{
  global.__CORREOS = [];
  mandarAviso_(avisoDe_('Finalizado'), 'SOL-00001');
  const cuerpo = global.__CORREOS[0].cuerpo;

  ok(cuerpo.indexOf('Finalizado por: Jose Ortiz') !== -1,
    'dice quién la finalizó: ' + (cuerpo.match(/Finalizado por:[^\n]*/) || [''])[0]);
  ok(cuerpo.indexOf('25.09.2026 17:48') !== -1, 'y cuándo');
  ok(quienMovio_('SOL-00001', 'Solicitando').usuario === 'Barbara Soto',
    'cada estado trae al suyo, no siempre el último de la hoja');
  ok(quienMovio_('SOL-00002', 'Finalizado') === null,
    'una sin recorrido anotado no inventa un nombre');

  // Sin la hoja de estados el correo sale igual, solo que sin esa línea.
  const hoja = SS.getSheetByName('Registro Estados');
  SS.deleteSheet(hoja);
  global.__CORREOS = [];
  const r = mandarAviso_(avisoDe_('Finalizado'), 'SOL-00001');
  ok(r.ok && global.__CORREOS[0].cuerpo.indexOf('Finalizado por:') === -1,
    'sin la hoja de estados el aviso sale igual, sin esa línea');
  escribir('Registro Estados', ['N° Solicitud', 'Estado', 'Fecha', 'Usuario'], [
    { 'N° Solicitud': 'SOL-00001', 'Estado': 'Solicitando',
      'Fecha': '24.09.2026 09:12', 'Usuario': 'Barbara Soto' },
    { 'N° Solicitud': 'SOL-00001', 'Estado': 'Finalizado',
      'Fecha': '25.09.2026 17:48', 'Usuario': 'Jose Ortiz' }
  ]);
}

seccion('Lo que no es la columna Estado de Registro no lo despierta');
{
  global.__CORREOS = [];

  // Otra columna de la misma hoja.
  const cObs = REG.indexOf('Observación codificación') + 1;
  alEditarRegistro({ range: registro.getRange(2, cObs), value: 'Finalizado' });
  ok(global.__CORREOS.length === 0, 'editar otra columna no manda nada');

  // La misma palabra, pero en otra hoja: el estado se maneja en Registro y en
  // ninguna otra parte.
  const otra = escribir('Registro Detalle Copia', REG, [{ 'Estado': 'Finalizado' }]);
  alEditarRegistro({ range: otra.getRange(2, COLUMNA_ESTADO), value: 'Finalizado' });
  ok(global.__CORREOS.length === 0, 'ni poner Finalizado en otra hoja');

  // Vaciar la celda tampoco es pasar a un estado.
  alEditarRegistro({ range: registro.getRange(2, COLUMNA_ESTADO), value: '' });
  ok(global.__CORREOS.length === 0, 'ni borrar la celda');

  // Un estado que no manda correo.
  mover(3, 'Pendiente');
  ok(global.__CORREOS.length === 0, 'ni un estado que no tiene aviso configurado');
}

seccion('Cuando no hay a quién escribirle, se dice');
{
  global.__CORREOS = [];
  const r = mandarAviso_(avisoDe_('Finalizado'), 'SOL-00003');
  ok(!r.ok && r.mensaje.indexOf('Registro Detalle') !== -1,
    'una solicitud sin detalle no manda nada, y dice por qué: ' + r.mensaje);
  ok(global.__CORREOS.length === 0, 'y no sale ningún correo');

  const inexistente = mandarAviso_(avisoDe_('Finalizado'), 'SOL-99999');
  ok(!inexistente.ok, 'una que no existe, lo mismo');
}

seccion('Un correo que no sale no tumba nada');
{
  global.__CORREOS = [];
  global.__FALLA_CORREO = 'el servidor de correo dijo que no';
  const r = mandarAviso_(avisoDe_('Finalizado'), 'SOL-00001');
  delete global.__FALLA_CORREO;
  ok(!r.ok && r.mensaje.indexOf('dijo que no') !== -1,
    'el error de Google vuelve tal cual, no se pierde');

  // Y el disparador entero tampoco revienta.
  global.__FALLA_CORREO = true;
  let reventó = false;
  try { mover(2, 'Finalizado'); } catch (err) { reventó = true; }
  delete global.__FALLA_CORREO;
  ok(!reventó, 'y el disparador termina sin reventar');
}

// Este proyecto manda correos. No cambia una sola celda, y los permisos que
// pide lo dejan por escrito.
seccion('Las alertas no escriben nada');
{
  const antes = registro.getLastRow();
  mover(2, 'Finalizado');
  ok(registro.getLastRow() === antes, 'no agrega filas');

  const fuente = fs.readFileSync(path.join(__dirname, '..', 'fuente', 'Alertas.gs'), 'utf8');
  ok(fuente.indexOf('appendRow') === -1, 'no tiene con qué: ningún appendRow');
  ok(!/\.setValues?\(/.test(fuente), 'ni setValue');

  const permisos = JSON.parse(fs.readFileSync(
    path.join(__dirname, '..', 'fuente', 'appsscript.json'), 'utf8')).oauthScopes;
  ok(permisos.indexOf('https://www.googleapis.com/auth/spreadsheets.readonly') !== -1,
    'y pide el spreadsheet de solo lectura');
  ok(permisos.indexOf('https://www.googleapis.com/auth/spreadsheets') === -1,
    'no de escritura');
  ok(permisos.indexOf('https://www.googleapis.com/auth/script.send_mail') !== -1,
    'más el permiso de mandar correo, que es a lo que viene');
}

// El de entrada y este no pueden mandar lo mismo: serían dos correos iguales.
seccion('No se pisa con el proyecto de entrada');
{
  const entrada = fs.readFileSync(
    path.join(__dirname, '..', '..', 'fuente', 'Avisos.gs'), 'utf8');
  ok(entrada.indexOf('avisarFinalizado_') === -1,
    'el de entrada ya no manda el aviso de finalizado');
  ok(entrada.indexOf('avisarCreado_') !== -1,
    'manda el de material creado, que es el que sale de nosotros');
  ok(!avisoDe_('Creando'),
    'y este no manda el de creado: cada correo sale de una sola parte');
}

// Todos los archivos de un proyecto de Apps Script comparten un solo espacio
// de nombres. Si dos declaran lo mismo, el proyecto no carga —"Identifier 'X'
// has already been declared"— y no anda nada. Es un error que ocurre ANTES de
// que exista comportamiento, así que ninguna otra prueba lo vería.
seccion('Ningún nombre declarado dos veces');
{
  const { nombresRepetidos, cuantosNombres } = require('../../pruebas/choques');
  const carpeta = path.join(__dirname, '../fuente');
  const choques = nombresRepetidos(carpeta);
  ok(choques.length === 0, choques.length
    ? 'hay nombres repetidos en fuente: ' + choques.join(' · ')
    : 'los archivos de fuente no se pisan entre ellos');
  ok(cuantosNombres(carpeta) > 15,
    'y se revisaron de verdad: ' + cuantosNombres(carpeta) + ' nombres');
}

console.log('\n' + (fallos ? fallos + ' prueba(s) con problemas' : 'Todas las pruebas pasaron'));
process.exit(fallos ? 1 : 0);
