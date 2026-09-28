/**
 * Pruebas del monitor. Se apoyan en el mismo simulador de Apps Script que el
 * formulario de entrada: son proyectos distintos pero el mismo spreadsheet.
 */
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const { SS } = require('../../pruebas/mock');

const FUENTES = ['Config.gs', 'Monitor.gs']
  .map(f => path.join(__dirname, '..', 'fuente', f));
console.log('Probando: ' + FUENTES.map(f => path.basename(f)).join(', ') + ', Tiempo.html');
FUENTES.forEach(f => vm.runInThisContext(fs.readFileSync(f, 'utf8'), { filename: path.basename(f) }));

/*
  Las cuentas del gráfico corren en el navegador, pero son puras: entra una
  lista, sale otra. Se sacaron a Tiempo.html justamente para poder correrlas
  acá, donde se puede revisar el cambio de mes o una semana sin solicitudes sin
  tener que abrir un navegador.
*/
const TIEMPO = path.join(__dirname, '..', 'fuente', 'Tiempo.html');
vm.runInThisContext(
  fs.readFileSync(TIEMPO, 'utf8').replace(/^[\s\S]*?<script>/, '').replace(/<\/script>[\s\S]*$/, ''),
  { filename: 'Tiempo.html' });

let fallos = 0;
function ok(cond, msg) {
  console.log((cond ? '  ✓ ' : '  ✗ ') + msg);
  if (!cond) fallos++;
}
function seccion(t) { console.log('\n' + t); }
function error(fn) {
  try { fn(); } catch (err) { return err.message; }
  return '';
}

/* ------------------------------------------- las bitácoras, como quedan hoy */

const REG = ['N° Solicitud', 'Fecha', 'Usuario', 'Tipo Solicitud', 'Estado',
  'Fecha de creación', 'SKU', 'Observación', 'Observación codificación'];
const DET = ['N° Solicitud', 'Fecha', 'Solicitante', 'Clase Requerimiento',
  'País', 'Tipo Requerimiento', 'Origen', 'Centro', 'Tipo Material',
  'Agrupación', 'Descripción Agrupación', 'Código', 'Descripción Material',
  'Grupo Artículo', 'Espesor', 'Ancho', 'Largo', 'Piezas', 'UMB', 'Stock/Pedido',
  'Aserradero', 'Secado', 'Cepillado', 'Hoja Destino', 'Fila Destino'];

function escribir(nombre, encabezados, filas) {
  const hoja = SS.insertSheet(nombre);
  hoja.getRange(1, 1, 1, encabezados.length).setValues([encabezados]);
  filas.forEach((f, i) => {
    const completa = encabezados.map(h => (h in f ? f[h] : ''));
    hoja.getRange(2 + i, 1, 1, encabezados.length).setValues([completa]);
  });
  return hoja;
}

function unCodigo(numero, codigo, extra) {
  return Object.assign({
    'N° Solicitud': numero, 'Fecha': '24.09.2026', 'Solicitante': 'barbara@masisa.com',
    'Clase Requerimiento': 'PT', 'País': 'CL', 'Código': codigo,
    'Descripción Material': 'Rús. Verde Médula ' + codigo,
    'Espesor': '032', 'Ancho': '180', 'Largo': '3800', 'UMB': 'PZA',
    'Aserradero': 'RVM 032X180', 'Hoja Destino': 'PT', 'Fila Destino': 3
  }, extra || {});
}

escribir('Registro', REG, [
  { 'N° Solicitud': 'SOL-00001', 'Fecha': '24.09.2026', 'Usuario': 'barbara@masisa.com',
    'Tipo Solicitud': 'PT', 'Estado': 'Solicitando',
    'SKU': 'RVMH032X180X3800, RVMH032X180X3850, RVMH032X180X3900',
    'Observación': 'Urgente para Osorno' },
  { 'N° Solicitud': 'SOL-00002', 'Fecha': '24.09.2026', 'Usuario': 'jorge@masisa.com',
    'Tipo Solicitud': 'PP', 'Estado': 'Finalizado', 'Fecha de creación': '25.09.2026',
    'SKU': 'RVM 032X180', 'Observación codificación': 'Creado en SAP' },
  // Una vieja, sin detalle guardado: solo tiene su columna SKU.
  { 'N° Solicitud': 'SOL-00003', 'Fecha': '20.09.2026', 'Usuario': 'ana@masisa.com',
    'Tipo Solicitud': 'PE', 'Estado': '', 'SKU': 'RSFR037X130X3200; RSFR037X130X3600' }
]);

const EST = ['N° Solicitud', 'Estado', 'Fecha', 'Usuario'];

// SOL-00001 recién nace. SOL-00002 ya recorrió todo, y volvió atrás una vez:
// de Creando a Pendiente y de vuelta, que es justo lo que una columna por
// estado no podría guardar. SOL-00003 es vieja y no tiene recorrido.
escribir('Registro Estados', EST, [
  { 'N° Solicitud': 'SOL-00001', 'Estado': 'Solicitando',
    'Fecha': '24.09.2026 09:12', 'Usuario': 'Barbara' },
  { 'N° Solicitud': 'SOL-00002', 'Estado': 'Solicitando',
    'Fecha': '24.09.2026 10:03', 'Usuario': 'Jorge' },
  { 'N° Solicitud': 'SOL-00002', 'Estado': 'Validando información',
    'Fecha': '24.09.2026 11:40', 'Usuario': 'Codificacion' },
  { 'N° Solicitud': 'SOL-00002', 'Estado': 'Creando',
    'Fecha': '25.09.2026 08:15', 'Usuario': 'Codificacion' },
  { 'N° Solicitud': 'SOL-00002', 'Estado': 'Pendiente',
    'Fecha': '25.09.2026 09:00', 'Usuario': 'Codificacion' },
  { 'N° Solicitud': 'SOL-00002', 'Estado': 'Creando',
    'Fecha': '25.09.2026 15:22', 'Usuario': 'Codificacion' },
  { 'N° Solicitud': 'SOL-00002', 'Estado': 'Finalizado',
    'Fecha': '25.09.2026 17:48', 'Usuario': 'Codificacion' }
]);

escribir('Registro Detalle', DET, [
  unCodigo('SOL-00001', 'RVMH032X180X3800', { 'Fila Destino': 3, 'Piezas': 248 }),
  unCodigo('SOL-00001', 'RVMH032X180X3850', { 'Fila Destino': 4 }),
  unCodigo('SOL-00001', 'RVMH032X180X3900', { 'Fila Destino': 5 }),
  unCodigo('SOL-00002', 'RVM 032X180',
    { 'Clase Requerimiento': 'PP', 'UMB': 'M3', 'Largo': '', 'Hoja Destino': 'PP', 'Fila Destino': 3 })
]);

/* ------------------------------------------------------------- las pruebas */

seccion('Leer una hoja por sus rótulos');
{
  const h = leerHoja_('Registro');
  ok(h.filas.length === 3, 'trae las tres solicitudes y no la fila de rótulos');
  ok(h.filas[0]['N° Solicitud'] === 'SOL-00001', 'cada fila se lee por el nombre de su columna');
  ok(h.filas[0].fila === 2, 'y dice en qué fila del spreadsheet está');
  ok(leerHoja_('No existe').falta === 'No existe', 'una hoja que no está se avisa, no revienta');
}

seccion('Las solicitudes, con sus códigos adentro');
{
  const r = apiSolicitudes();
  ok(r.ok, 'responde');
  ok(r.total === 3, 'cuenta las tres');

  // De la más nueva hacia atrás: lo recién pedido es lo que se mira.
  ok(r.solicitudes[0].numero === 'SOL-00003', 'la más nueva va primero');
  ok(r.solicitudes[2].numero === 'SOL-00001', 'y la más vieja al final');

  const uno = r.solicitudes.filter(s => s.numero === 'SOL-00001')[0];
  ok(uno.usuario === 'barbara@masisa.com' && uno.tipo === 'PT' && uno.estado === 'Solicitando',
    'la cabecera trae lo que Registro guarda');
  ok(uno.observacion === 'Urgente para Osorno', 'con su observación');
  ok(uno.fechaCreacion === '', 'y la fecha de creación vacía mientras no la llenen');

  // Lo que se preguntó: en el monitor van los CÓDIGOS, no los números de fila.
  ok(uno.cuantos === 3, 'la solicitud junta sus tres códigos');
  ok(uno.codigos.map(c => c['Código']).join() ===
     'RVMH032X180X3800,RVMH032X180X3850,RVMH032X180X3900',
    'y son los códigos del batch input, no las filas donde quedaron');
  ok(uno.codigos[0]['Fila Destino'] === '3' && uno.deDetalle,
    'la fila del batch input está, pero como un dato más del código');

  ok(r.estados.join(' > ') ===
     'Solicitando > Validando información > Pendiente > Creando > Finalizado',
    'y llegan los estados por los que pasa, en orden');

  const dos = r.solicitudes.filter(s => s.numero === 'SOL-00002')[0];
  ok(dos.cuantos === 1 && dos.codigos[0]['UMB'] === 'M3',
    'una de proceso trae su código con su unidad');
  ok(dos.observacionCodificacion === 'Creado en SAP', 'y lo que escribió codificación');
}

seccion('El recorrido: por dónde pasó cada solicitud, y cuándo');
{
  const r = apiSolicitudes();
  const porNumero = n => r.solicitudes.filter(s => s.numero === n)[0];

  const uno = porNumero('SOL-00001');
  ok(uno.recorrido.length === 1 && uno.recorrido[0].estado === 'Solicitando',
    'una recién pedida ya trae su primer paso');
  ok(uno.recorrido[0].fecha === '24.09.2026 09:12', 'con fecha y hora');
  ok(uno.recorrido[0].usuario === 'Barbara', 'y con quién la movió');

  // Lo que una columna por estado no podría guardar: pasó dos veces por
  // Creando, y las dos quedan.
  const dos = porNumero('SOL-00002');
  ok(dos.recorrido.map(p => p.estado).join(' > ') ===
     'Solicitando > Validando información > Creando > Pendiente > Creando > Finalizado',
    'y una que fue y volvió guarda las dos pasadas, en orden');
  ok(dos.recorrido[dos.recorrido.length - 1].estado === dos.estado,
    'el último paso es el estado que muestra la tabla');
  ok(dos.recorrido[dos.recorrido.length - 1].fecha === '25.09.2026 17:48',
    'así se sabe desde cuándo está ahí');

  // Una solicitud anterior a que se empezara a anotar no tiene recorrido, y
  // eso no puede dejarla fuera del monitor.
  ok(porNumero('SOL-00003').recorrido.length === 0, 'una vieja simplemente no trae ninguno');
  ok(r.solicitudes.length === 3, 'y se sigue mostrando igual');
}

// Sin la hoja de estados el monitor tiene que andar lo mismo: no todos los
// spreadsheets la van a tener el primer día.
seccion('Sin la hoja de estados, el monitor sigue andando');
{
  const guardada = SS.getSheetByName('Registro Estados');
  SS.deleteSheet(guardada);

  const r = apiSolicitudes();
  ok(r.ok && r.solicitudes.length === 3, 'responde igual, con sus tres solicitudes');
  ok(r.solicitudes.every(s => s.recorrido.length === 0), 'solo que ninguna trae recorrido');

  SS.insertSheet('Registro Estados');
  escribir('Registro Estados', EST, [
    { 'N° Solicitud': 'SOL-00001', 'Estado': 'Solicitando',
      'Fecha': '24.09.2026 09:12', 'Usuario': 'Barbara' },
    { 'N° Solicitud': 'SOL-00002', 'Estado': 'Solicitando',
      'Fecha': '24.09.2026 10:03', 'Usuario': 'Jorge' },
    { 'N° Solicitud': 'SOL-00002', 'Estado': 'Validando información',
      'Fecha': '24.09.2026 11:40', 'Usuario': 'Codificacion' },
    { 'N° Solicitud': 'SOL-00002', 'Estado': 'Creando',
      'Fecha': '25.09.2026 08:15', 'Usuario': 'Codificacion' },
    { 'N° Solicitud': 'SOL-00002', 'Estado': 'Pendiente',
      'Fecha': '25.09.2026 09:00', 'Usuario': 'Codificacion' },
    { 'N° Solicitud': 'SOL-00002', 'Estado': 'Creando',
      'Fecha': '25.09.2026 15:22', 'Usuario': 'Codificacion' },
    { 'N° Solicitud': 'SOL-00002', 'Estado': 'Finalizado',
      'Fecha': '25.09.2026 17:48', 'Usuario': 'Codificacion' }
  ]);
}

seccion('Una solicitud sin detalle se apaña con su SKU');
{
  const vieja = apiSolicitudes().solicitudes.filter(s => s.numero === 'SOL-00003')[0];
  ok(!vieja.deDetalle, 'se nota que no viene del detalle');
  ok(vieja.cuantos === 2, 'igual muestra sus dos códigos');
  ok(vieja.codigos.map(c => c['Código']).join() === 'RSFR037X130X3200,RSFR037X130X3600',
    'partiendo la columna SKU por sus separadores');
}

// El gráfico reparte las solicitudes en columnas de tiempo. Lo que se prueba
// acá es el reparto: las fechas son donde se esconden los errores.
seccion('Las fechas del gráfico');
{
  ok(aFecha('24.09.2026').getFullYear() === 2026, 'lee dd.mm.aaaa');
  ok(aFecha('24.09.2026').getMonth() === 8 && aFecha('24.09.2026').getDate() === 24,
    'con el día y el mes en su lugar, no al revés');
  const conHora = aFecha('25.09.2026 17:48');
  ok(conHora.getHours() === 17 && conHora.getMinutes() === 48, 'y la hora cuando viene');
  ok(aFecha('') === null && aFecha('cualquier cosa') === null && aFecha(null) === null,
    'lo que no tiene esa forma da null, no una fecha inventada');

  // El 24.09.2026 es jueves: su semana empieza el lunes 21.
  ok(inicioDe(aFecha('24.09.2026'), 'semana').getDate() === 21,
    'la semana empieza el lunes, no el domingo');
  ok(inicioDe(aFecha('21.09.2026'), 'semana').getDate() === 21,
    'y un lunes es el comienzo de la suya');
  // El 27.09.2026 es domingo: cierra la semana del 21, no abre una nueva.
  ok(inicioDe(aFecha('27.09.2026'), 'semana').getDate() === 21,
    'el domingo cierra su semana, no abre otra');
  ok(inicioDe(aFecha('24.09.2026'), 'mes').getDate() === 1, 'el mes empieza el 1');
  ok(inicioDe(aFecha('24.09.2026'), 'dia').getHours() === 0,
    'y el día se queda sin hora, para que dos horas del mismo día caigan juntas');

  // Cruzar el fin de mes no puede partir la semana en dos.
  const finDeMes = inicioDe(aFecha('01.10.2026'), 'semana');   // jueves
  ok(finDeMes.getMonth() === 8 && finDeMes.getDate() === 28,
    'una semana a caballo entre dos meses empieza en el mes anterior');
}

seccion('Las columnas del gráfico');
{
  const solicitud = (fecha, estado) => ({ fecha: fecha, estado: estado || 'Solicitando' });

  const r = porPeriodo([
    solicitud('21.09.2026'), solicitud('21.09.2026', 'Creando'), solicitud('23.09.2026')
  ], 'dia');
  ok(r.columnas.length === 3, 'del primer día al último, sin saltarse ninguno');
  ok(r.columnas[1].solicitudes.length === 0,
    'un día sin solicitudes sale igual, vacío: es un hueco, no una columna que no existió');
  ok(r.columnas[0].solicitudes.length === 2 && r.columnas[2].solicitudes.length === 1,
    'y cada una cae en la suya');

  const semana = porPeriodo([solicitud('21.09.2026'), solicitud('27.09.2026')], 'semana');
  ok(semana.columnas.length === 1, 'lunes y domingo de la misma semana van en una columna');

  const mes = porPeriodo([solicitud('01.08.2026'), solicitud('30.09.2026')], 'mes');
  ok(mes.columnas.length === 2, 'agosto y septiembre son dos columnas');

  // Una solicitud sin fecha no se inventa un lugar en el tiempo.
  const sinFecha = porPeriodo([solicitud('21.09.2026'), solicitud('')], 'dia');
  ok(sinFecha.sinFecha === 1 && sinFecha.columnas.length === 1,
    'la que no tiene fecha queda fuera, y se dice cuántas son');
  ok(porPeriodo([], 'dia').columnas.length === 0, 'sin nada, no hay columnas');

  // Demasiados días no caben: se muestran los últimos y se dice cuántos faltan.
  const muchas = [];
  for (let d = 1; d <= 200; d++) {
    const f = new Date(2026, 0, d);
    muchas.push(solicitud(('0' + f.getDate()).slice(-2) + '.' +
      ('0' + (f.getMonth() + 1)).slice(-2) + '.' + f.getFullYear()));
  }
  const cortada = porPeriodo(muchas, 'dia');
  ok(cortada.columnas.length === TOPE_COLUMNAS && cortada.recortadas === 200 - TOPE_COLUMNAS,
    'con más columnas de las que caben se muestran las últimas, y se dice cuántas quedaron');
  ok(cortada.columnas[cortada.columnas.length - 1].solicitudes.length === 1,
    'las últimas, no las primeras: lo reciente es lo que se mira');

  // La escala se sugiere sola según cuánto abarca.
  ok(escalaSugerida([solicitud('21.09.2026'), solicitud('30.09.2026')]) === 'dia',
    'diez días se ven por día');
  ok(escalaSugerida([solicitud('01.01.2026'), solicitud('30.09.2026')]) === 'semana',
    'nueve meses, por semana');
  ok(escalaSugerida([solicitud('01.01.2023'), solicitud('30.09.2026')]) === 'mes',
    'y casi cuatro años, por mes');
}

seccion('El eje y la demora');
{
  ok(escalaY(3).tope === 3 && escalaY(3).paso === 1, 'tres llega justo a 3, de uno en uno');
  ok(escalaY(6).tope === 6 && escalaY(6).paso === 2, 'seis, de dos en dos');
  ok(escalaY(23).tope === 30 && escalaY(23).paso === 10, 'veintitrés sube a 30, de diez en diez');
  ok(escalaY(230).tope === 300 && escalaY(230).paso === 100, 'y doscientos treinta, a 300');
  ok(escalaY(0).tope === 1, 'sin datos el eje no se queda en cero');

  // Entre dos y cinco líneas: menos no dice nada y más es una reja.
  ok([1, 2, 3, 4, 5, 7, 12, 40, 90, 500].every(function (n) {
    var e = escalaY(n);
    var lineas = e.tope / e.paso + 1;
    return e.tope >= n && lineas >= 2 && lineas <= 5;
  }), 'el tope siempre alcanza al máximo, y la grilla nunca pasa de cinco líneas');

  const paso = (estado, fecha) => ({ estado: estado, fecha: fecha, usuario: 'x' });
  ok(diasHastaFinalizar({ recorrido: [
    paso('Solicitando', '21.09.2026 09:00'),
    paso('Creando', '22.09.2026 09:00'),
    paso('Finalizado', '24.09.2026 09:00')
  ] }) === 3, 'del primer paso a Finalizado son tres días');

  ok(diasHastaFinalizar({ recorrido: [paso('Solicitando', '21.09.2026 09:00')] }) === null,
    'una que no ha terminado no tiene demora, no tiene cero');
  ok(diasHastaFinalizar({ recorrido: [] }) === null, 'y una sin recorrido tampoco');

  // Si fue y volvió, cuenta la última vez que se finalizó.
  ok(diasHastaFinalizar({ recorrido: [
    paso('Solicitando', '21.09.2026 09:00'),
    paso('Finalizado', '22.09.2026 09:00'),
    paso('Pendiente', '23.09.2026 09:00'),
    paso('Finalizado', '25.09.2026 09:00')
  ] }) === 4, 'y si se reabrió, vale la última vez que se cerró');

  ok(mediana([1, 2, 3]) === 2, 'la mediana de tres');
  ok(mediana([1, 2, 3, 4]) === 2.5, 'y de cuatro, el promedio de las dos del medio');
  ok(mediana([]) === null, 'sin números no hay mediana');
}

// Nadie edita nada desde el monitor, ni el estado: se reparte a quien deba
// mirar, y ninguno de ellos deberia poder cambiar una solicitud.
seccion('El monitor no escribe nada');
{
  const filas = SS.getSheetByName('Registro').getLastRow();
  const detalle = SS.getSheetByName('Registro Detalle').getLastRow();
  const estados = SS.getSheetByName('Registro Estados').getLastRow();
  const antes = apiSolicitudes().solicitudes.map(s => s.numero + ':' + s.estado).join(' ');

  apiSolicitudes();
  apiSolicitudes();

  ok(SS.getSheetByName('Registro').getLastRow() === filas, 'no agrega ni quita solicitudes');
  ok(SS.getSheetByName('Registro Detalle').getLastRow() === detalle, 'ni toca el detalle');
  ok(SS.getSheetByName('Registro Estados').getLastRow() === estados,
    'ni la bitácora de estados: leer no es anotar');
  ok(apiSolicitudes().solicitudes.map(s => s.numero + ':' + s.estado).join(' ') === antes,
    'y los estados quedan como estaban');

  const fuente = fs.readFileSync(path.join(__dirname, '..', 'fuente', 'Monitor.gs'), 'utf8');
  ok(fuente.indexOf('setValue') === -1, 'no tiene con qué: ningún setValue');
  ok(fuente.indexOf('appendRow') === -1, 'ni appendRow');
  ok(typeof apiCambiarEstado === 'undefined', 'ni una función para cambiar el estado');

  const permisos = JSON.parse(fs.readFileSync(
    path.join(__dirname, '..', 'fuente', 'appsscript.json'), 'utf8')).oauthScopes;
  ok(permisos.indexOf('https://www.googleapis.com/auth/spreadsheets.readonly') !== -1,
    'y pide permiso de solo lectura');
  ok(permisos.indexOf('https://www.googleapis.com/auth/spreadsheets') === -1,
    'no de escritura');

  const index = fs.readFileSync(path.join(__dirname, '..', 'fuente', 'Index.html'), 'utf8');
  ok(index.indexOf('<select class="estado') === -1 && index.indexOf('pastilla') !== -1,
    'la pantalla muestra el estado, no lo ofrece para cambiar');

  // El gráfico se dibuja sobre lo que dejaron pasar los filtros, igual que la
  // tabla: si mostrara otra cosa, los números de arriba y los de abajo se
  // contradirían.
  ok(/dibujarGrafico\(lista\)/.test(index) && /dibujarTarjetas\(lista\)/.test(index),
    'el gráfico y las tarjetas se dibujan sobre la misma lista que la tabla');

  // Los cinco estados son un orden, no cinco cosas sueltas: una sola tinta que
  // se oscurece. Los pasos están medidos contra el fondo, no elegidos a ojo.
  const estilos = fs.readFileSync(path.join(__dirname, '..', 'fuente', 'Estilos.html'), 'utf8');
  const pasos = (estilos.match(/--paso-\d: oklch\(([\d.]+) ([\d.]+) (\d+)\)/g) || [])
    .map(t => t.match(/oklch\(([\d.]+) ([\d.]+) (\d+)\)/).slice(1).map(Number));
  ok(pasos.length === 5, 'hay un paso por estado');
  ok(pasos.every((p, i) => i === 0 || p[0] < pasos[i - 1][0]),
    'y van siempre de más claro a más oscuro, como el avance');
  ok(pasos.every((p, i) => i === 0 || pasos[i - 1][0] - p[0] >= 0.06),
    'con un salto que se note entre uno y el siguiente');
  ok(pasos.every(p => p[2] === pasos[0][2]), 'todos del mismo tono: es una rampa, no cinco colores');
}

console.log('\n' + (fallos ? fallos + ' prueba(s) con problemas' : 'Todas las pruebas pasaron'));
process.exit(fallos ? 1 : 0);
