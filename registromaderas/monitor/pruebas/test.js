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
// La demora se mide en HORAS DE TRABAJO, no en días de calendario. Una
// solicitud que entra un viernes a las 14:00 y se mira el lunes a las 9:00 no
// esperó tres días: esperó una hora y media. Lo otro diría que codificación se
// demoró, cuando lo que pasó es que la oficina estaba cerrada.
seccion('La jornada: de 8 a 17:30, y los viernes hasta las 14:30');
{
  // Todo entra por acá: si la fecha se lee mal, lo demás no tiene sentido.
  ok(aFecha('24.09.2026').getMonth() === 8 && aFecha('24.09.2026').getDate() === 24,
    'lee dd.mm.aaaa con el día y el mes en su lugar, no al revés');
  const conHora = aFecha('25.09.2026 17:48');
  ok(conHora.getHours() === 17 && conHora.getMinutes() === 48, 'y la hora cuando viene');
  ok(aFecha('') === null && aFecha('cualquier cosa') === null && aFecha(null) === null,
    'lo que no tiene esa forma da null, no una fecha inventada');

  const h = (a, b) => horasHabiles(aFecha(a), aFecha(b));

  // 2026: el 21 de septiembre es lunes.
  ok(h('21.09.2026 08:00', '21.09.2026 17:30') === 9.5, 'un lunes entero son 9,5 horas');
  ok(h('25.09.2026 08:00', '25.09.2026 14:30') === 6.5, 'un viernes entero, 6,5');
  ok(h('21.09.2026 09:00', '21.09.2026 11:30') === 2.5, 'dentro del día, lo que marca el reloj');

  // Lo de afuera no cuenta.
  ok(h('21.09.2026 06:00', '21.09.2026 08:00') === 0, 'antes de abrir no se espera');
  ok(h('21.09.2026 17:30', '21.09.2026 23:00') === 0, 'después de cerrar tampoco');
  ok(h('21.09.2026 16:30', '22.09.2026 09:00') === 2,
    'de la tarde a la mañana siguiente se saltan la noche');

  // El fin de semana, que es el caso que importa.
  ok(h('26.09.2026 10:00', '27.09.2026 18:00') === 0, 'el sábado y el domingo no cuentan');
  ok(h('25.09.2026 14:00', '28.09.2026 09:00') === 1.5,
    'viernes 14:00 a lunes 9:00 son hora y media, no tres días');
  ok(h('25.09.2026 14:00', '25.09.2026 18:00') === 0.5,
    'y el viernes se cierra a las 14:30, no a las 17:30');

  // Una semana entera: cuatro días de 9,5 más uno de 6,5.
  ok(h('21.09.2026 08:00', '25.09.2026 14:30') === 44.5, 'la semana completa son 44,5 horas');
  ok(h('21.09.2026 08:00', '28.09.2026 08:00') === 44.5,
    'y el lunes siguiente a las 8:00 todavía no suma nada');

  ok(h('22.09.2026 10:00', '21.09.2026 10:00') === null, 'al revés no se mide');
  ok(horasHabiles(null, aFecha('21.09.2026 10:00')) === null, 'ni con una fecha que falta');

  // Una fecha disparatada no puede colgar la página.
  ok(horasHabiles(aFecha('01.01.1970 08:00'), aFecha('21.09.2026 10:00')) === null,
    'un tramo de décadas se corta en vez de recorrerlo entero');
}

seccion('La espera de cada etapa');
{
  const paso = (estado, fecha) => ({ estado: estado, fecha: fecha, usuario: 'x' });
  const con = (...pasos) => ({ recorrido: pasos });

  // Lunes 21 a jueves 24, todo dentro de la jornada.
  const completa = con(
    paso('Solicitando', '21.09.2026 09:00'),
    paso('Validando información', '21.09.2026 14:00'),
    paso('Creando', '22.09.2026 10:00'),
    paso('Finalizado', '23.09.2026 12:00'));

  ok(horasEntre(completa, 'Solicitando', 'Validando información') === 5,
    'de Solicitando a Validando, cinco horas');
  ok(horasEntre(completa, 'Validando información', 'Creando') === 5.5,
    'de Validando a Creando, cinco y media: se salta la noche');
  ok(horasEntre(completa, 'Creando', 'Finalizado') === 11.5,
    'de Creando a Finalizado, once y media');

  ok(horasEntre(con(paso('Solicitando', '21.09.2026 09:00')),
    'Solicitando', 'Validando información') === null,
    'una que no llegó al final del tramo no cuenta');
  ok(horasEntre({ recorrido: [] }, 'Solicitando', 'Finalizado') === null,
    'y una sin recorrido tampoco');
  ok(horasEntre(completa, 'Pendiente', 'Finalizado') === null,
    'si nunca pasó por el estado de partida, no hay tramo que medir');

  // Si fue y volvió, la vuelta cuenta: quien pidió la esperó igual.
  const conVuelta = con(
    paso('Creando', '21.09.2026 09:00'),
    paso('Pendiente', '21.09.2026 11:00'),
    paso('Creando', '22.09.2026 09:00'),
    paso('Finalizado', '22.09.2026 11:00'));
  ok(horasEntre(conVuelta, 'Creando', 'Finalizado') === 11.5,
    'de la PRIMERA vez que entró a Creando, no de la última');

  ok(promedio([1, 2, 3]) === 2, 'el promedio de tres');
  ok(promedio([]) === null, 'sin números no hay promedio');

  ok(enHoras(null) === '—', 'sin dato, un guion');
  ok(enHoras(0.75) === '45 min', 'menos de una hora se dice en minutos');
  ok(enHoras(12.34) === '12,3 h', 'y lo demás en horas, con coma');
  ok(enHoras(44.5) === '44,5 h', 'la semana entera');
}

// Las dos fases que se piden: de Solicitando a Validando, y de Creando a
// Finalizado. El círculo reparte la suma de las dos entre ellas.
seccion('El tiempo promedio de cada fase');
{
  const paso = (estado, fecha) => ({ estado: estado, fecha: fecha, usuario: 'x' });
  const camino = (a, b, c, d) => ({ recorrido: [
    paso('Solicitando', a), paso('Validando información', b),
    paso('Creando', c), paso('Finalizado', d)] });

  ok(FASES.length === 2, 'son las dos fases que se pidieron');
  ok(FASES[0].desde === 'Solicitando' && FASES[0].hasta === 'Validando información',
    'la primera: de Solicitando a Validando');
  ok(FASES[1].desde === 'Creando' && FASES[1].hasta === 'Finalizado',
    'la segunda: de Creando a Finalizado');
  ok(FASES[0].paso === 1 && FASES[1].paso === 5,
    'y cada una con el tono del estado en que empieza o termina');

  const r = promediosPorFase([
    camino('21.09.2026 09:00', '21.09.2026 14:00', '22.09.2026 10:00', '23.09.2026 12:00'),
    camino('21.09.2026 08:00', '21.09.2026 10:00', '21.09.2026 12:00', '21.09.2026 16:00')
  ]);

  ok(r.sobre === 2, 'promedia sobre las dos que recorrieron las dos fases');
  ok(r.fases.map(f => f.horas).join() === '3.5,7.75',
    'cada fase su promedio: ' + r.fases.map(f => f.horas).join(', '));
  ok(Math.abs(r.total - 11.25) < 1e-9, 'y el total es la suma de las dos: ' + r.total);
  ok(Math.abs(r.fases.reduce((s, f) => s + f.horas, 0) - r.total) < 1e-9,
    'siempre: el total ES la suma, no otra cuenta');

  // Una que completó una fase y no la otra no entra en ninguna: si entrara en
  // una sola, los dos números serían de grupos distintos y no se podrían
  // comparar en el mismo círculo.
  const conMedias = promediosPorFase([
    camino('21.09.2026 08:00', '21.09.2026 10:00', '21.09.2026 12:00', '21.09.2026 16:00'),
    { recorrido: [paso('Solicitando', '21.09.2026 08:00'),
                  paso('Validando información', '21.09.2026 09:00')] }
  ]);
  ok(conMedias.sobre === 1, 'la que solo completó una fase queda fuera');
  ok(conMedias.fases[0].horas === 2, 'y no arrastra el promedio de la que sí completó');

  // Un círculo que dice 101% se lee como un error aunque el dibujo esté bien.
  ok(porcentajes([1, 1, 1]).join() === '34,33,33', 'tres tercios suman 100, no 99');
  ok(porcentajes([1, 1, 1]).reduce((a, c) => a + c, 0) === 100, 'siempre 100');
  ok(porcentajes([2, 1]).join() === '67,33', 'dos tercios y un tercio');
  ok(porcentajes([1, 0, 0]).join() === '100,0,0', 'uno solo se lleva todo');
  ok(porcentajes([0, 0, 0]).join() === '0,0,0', 'y sin nada, cero');
  ok([[3.5, 3.75, 7.75], [1, 2, 3], [0.1, 0.1, 99.8], [5, 5, 5, 5, 5, 5, 5]]
    .every(v => porcentajes(v).reduce((a, c) => a + c, 0) === 100),
    'sume lo que sume el reparto, los porcentajes dan 100');

  const vacio = promediosPorFase([]);
  ok(vacio.sobre === 0 && vacio.total === null, 'sin ninguna completa no hay promedio');
  ok(vacio.fases.length === 2 && vacio.fases.every(f => f.horas === null),
    'pero las fases siguen estando, en blanco');
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
  ok(/dibujarDona\(lista\)/.test(index) && /dibujarTarjetas\(lista\)/.test(index),
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
  ok(cuantosNombres(carpeta) > 40,
    'y se revisaron de verdad: ' + cuantosNombres(carpeta) + ' nombres');
}

console.log('\n' + (fallos ? fallos + ' prueba(s) con problemas' : 'Todas las pruebas pasaron'));
process.exit(fallos ? 1 : 0);
