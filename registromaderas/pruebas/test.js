const fs = require('fs');
const vm = require('vm');
const path = require('path');
const { SS } = require('./mock');

// Los mismos archivos que se pegan en el editor de Apps Script.
const FUENTES = ['Config.gs', 'Catalogos.gs', 'Registro.gs', 'Xlsx.gs', 'Lote.gs', 'Setup.gs']
  .map(f => path.join(__dirname, '..', 'fuente', f));

console.log('Probando: ' + FUENTES.map(f => path.basename(f)).join(', '));
FUENTES.forEach(f => {
  vm.runInThisContext(fs.readFileSync(f, 'utf8'), { filename: path.basename(f) });
});

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

/* ------------------------------------------------- el spreadsheet de verdad */

// Fila 1 = numeración, fila 2 = rótulos: igual que PT, PCP y PP hoy.
const FILA1 = ['1', '2', 'condicionante', '4', 'registro automatico de ingreso', 'solicitante',
  '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22',
  '23', '24', '25', '26', '27', '28', 'Rendimiento Secado', 'Rendimiento Cepillado',
  'Rendimiento Empaquetado'];

const FILA2 = ['País', 'Centro', 'Clase Requerimiento ', 'Tipo Requerimiento',
  'Llegada requerimiento', 'Usuario Solicitante', 'Aserradero(Template)', 'Tamaño Dimensión',
  'EE', 'AA', 'Secado(Template)', 'Tamaño dimensión ', 'EE', 'AA', 'Cepillado(Template)',
  'Tamaño dimensión ', 'EE', 'AA', 'Empaquetado', 'Tamaño dimensión ', 'Espesor', 'Ancho ',
  'Largo', 'PAK', 'UMB PZA ó M3', 'Stock/Pedido toda la posicion del ID en consulta',
  'Descripcion Especial EN', 'Descripcion Especial ES'];

// BD_Maderas guarda lo que YA existe. De ahí las dos comprobaciones opuestas:
// las rutas tienen que estar, y el producto que se pide no.
const MATERIALES = [
  // Hojas de ruta: materiales de proceso de 11 caracteres.
  ['RVM 032X180', 'X9000', 'TPAS', 'Rústico Verde Médula 032X180', 'X'],
  ['RVFD032X180', 'X9000', 'TPAS', 'Rústico Verde Col Mix 032X180', 'X'],
  ['RSFD032X180', 'X9000', 'TPAS', 'Rús. Seco COL MIX Radiata 032X180', 'X'],
  ['RVF 021X105', 'X9000', 'TPAS', 'Rústico Verde COL MIX 021X105', 'X'],
  ['RSF 020X102', 'X9000', 'TPAS', 'Rústico Seco COL MIX 020X102', 'X'],
  ['CSF 019X100', 'X11000', 'TPAS', 'Cepillado Seco COL MIX 019X100', 'X'],
  // Un producto que ya está creado: no se puede volver a pedir.
  ['RVMH032X180X4000', 'X9000', 'TTAS', 'Rús. Verde Médula Radiata 032X180X4000', 'X'],
  // Señuelo antes del bueno, y el espacio duro del final.
  ['XRSFR037X130X3600', 'X9000', 'TTAS', 'Señuelo 037X130X3600', 'X'],
  ['RSFR037X130X3600 ', 'X9000', 'TTAS', 'Rús. Seco COL MIX Radiata 037X130X3600', 'X']
];

function crearHojasReales() {
  const bd = SS.insertSheet('BD_Maderas');
  bd.getRange(1, 1, 1, 5).setValues([['Material', 'Grupo art.', 'TpMt', 'Texto breve de material', 'Ce']]);
  bd.getRange(2, 1, MATERIALES.length, 5).setValues(MATERIALES);

  ['PT', 'PCP', 'PP'].forEach(nombre => {
    const hoja = SS.insertSheet(nombre);
    hoja.getRange(1, 1, 1, FILA1.length).setValues([FILA1]);
    hoja.getRange(2, 1, 1, FILA2.length).setValues([FILA2]);
  });

  SS.insertSheet('Registro');  // existe pero vacía, como en el spreadsheet
}

/** Valor de una columna de PT/PCP/PP, por su número (los rótulos se repiten). */
function celda(nombreHoja, fila, columna) {
  return SS.getSheetByName(nombreHoja).getRange(fila, columna).getValue();
}

function registro(fila, encabezado) {
  const hoja = SS.getSheetByName('Registro');
  const enc = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0];
  const col = enc.findIndex(h => normalizar_(h) === normalizar_(encabezado)) + 1;
  if (!col) throw new Error('No existe la columna ' + encabezado + ' en Registro');
  return hoja.getRange(fila, col).getValue();
}

const SOLICITUD = {
  clase: 'PT', origen: 'Trading', centro: 'TCD2', tipoMaterial: 'TTAS',
  agrupacion: 'RVMH', espesor: '32', ancho: '180', largo: '3960',
  desglose: { aserradero: { ruta: 'RVM 032X180', espesor: '032', ancho: '180' } },
  piezas: 248, umb: 'PZA', stockPedido: 'P'
};

const CEPILLADO = {
  clase: 'PT', origen: 'Trading', centro: 'TCD2', tipoMaterial: 'TTAS',
  agrupacion: 'C4JH', espesor: '19', ancho: '100', largo: '2440',
  desglose: {
    aserradero: { ruta: 'RVF 021X105' },
    secado: { ruta: 'RSF 020X102' },
    cepillado: { ruta: 'CSF 019X100' }
  },
  piezas: 60, umb: 'PZA', stockPedido: 'S'
};

function con(cambios) { return Object.assign({}, SOLICITUD, cambios); }

/** Guarda una sola solicitud por el mismo camino que recorre cada fila del lote. */
function guardarUna(datos) {
  const v = validar_(datos);
  const destino = guardarEnClase_(v);
  const filaRegistro = guardarEnRegistro_(v, destino);
  return { ok: true, hoja: destino.hoja, fila: destino.fila, filaRegistro: filaRegistro, codigo: v.codigo };
}

crearHojasReales();

/* -------------------------------------------------------------- el contexto */

seccion('Contexto que recibe el formulario');
{
  const ctx = apiContexto();
  ok(ctx.clases.length === 3 && ctx.clases[0].id === 'PT', 'ofrece PT, PCP y PP');
  ok(ctx.origenes[0].centros.join() === 'TCP1,TCD2', 'Trading elige entre TCP1 y TCD2');
  ok(ctx.origenes[1].centros.join() === 'TCP1', 'Planta tiene un solo centro: TCP1');
  ok(ctx.exigeCodigoNuevo === true, 'el código que se pide tiene que ser nuevo');
  ok(ctx.clasesConRutaEnBD.join() === 'PP,PCP', 'en PP y PCP la ruta tiene que existir');
  ok(ctx.trading.especie === 'H', 'Trading exige especie H');
  ok(ctx.porDefecto.TIPO_REQUERIMIENTO === 'NO', 'Tipo Requerimiento va en NO, como el ejemplo');
  ok(!ctx.hojasFaltantes.length, 'no falta ninguna hoja');
}

/* ------------------------------------ la condicional: centro + tipo material */

seccion('Qué agrupaciones habilita cada centro y tipo de material');
{
  const codigos = (c, t) => agrupacionesDe_(c, t).map(a => a.agrupacion);

  const tcd2 = codigos('TCD2', 'TTAS');
  ok(tcd2.length === 9 && tcd2.indexOf('RVMH') !== -1, 'TCD2 + TTAS habilita 9, entre ellas RVMH');
  ok(codigos('TCP1', 'TPAS').length === 16, 'TCP1 + TPAS habilita 16, las de proceso');
  ok(codigos('TCP1', 'TTAS').length === 8, 'TCP1 + TTAS habilita 8');
  ok(codigos('TCD2', 'TPAS').length === 0, 'TCD2 + TPAS no habilita ninguna');
}

seccion('Qué etapas tiene cada producto, leídas del prefijo');
{
  const etapas = c => etapasAplicables_(c);
  ok(etapas('RVMH').aserradero && !etapas('RVMH').secado && !etapas('RVMH').cepillado,
    'RVMH es verde y rústico: solo aserradero');
  ok(etapas('RSFR').secado && !etapas('RSFR').cepillado,
    'RSFR es seco y rústico: aserradero y secado');
  ok(etapas('C4JH').cepillado && etapas('C4JH').secado, 'C4JH es cepillado: pasa por las tres');
}

seccion('Cómo se arma y se desarma el código');
{
  ok(armarCodigo_('RVMH', '032', '180', '3960') === 'RVMH032X180X3960',
    'prefijo de cuatro + medidas = 16 caracteres');
  ok(armarCodigo_('CSF', '019', '075', '') === 'CSF 019X075',
    'prefijo de tres: el 4º lugar es un espacio y sin largo quedan 11');
  ok(rellenar_('32', 3, 'espesor') === '032', 'el espesor se rellena con ceros a la izquierda');
  ok(error(() => rellenar_('32,5', 3, 'espesor')).indexOf('número entero') !== -1,
    'con coma decimal no pasa');

  const d = descomponerCodigo_('RVMH032X180X3960');
  ok(d.agrupacion === 'RVMH' && d.espesor === '032' && d.largo === '3960',
    'desarma un código de 16 caracteres en sus partes');
  ok(descomponerCodigo_('CSF 019X075').prefijo === 'CSF ', 'y uno de proceso, con su espacio');
  ok(descomponerCodigo_('CSF019X075').agrupacion === 'CSF',
    'si al copiar se perdió ese espacio, igual lo reconoce');
  ok(descomponerCodigo_('rvmh032x180x3960').agrupacion === 'RVMH', 'y en minúsculas también');
  ok(descomponerCodigo_('RVMH032-180-3960') === null, 'una forma que no calza devuelve null');

  const partes = descomponerPrefijo_('RVMH');
  ok(partes[0].significado === 'Rústico' && partes[3].significado === 'Radiata Terceros',
    'cada carácter del prefijo se explica solo');
  ok(descomponerPrefijo_('CSF')[3].significado === 'Producto en proceso',
    'el espacio del 4º lugar significa producto en proceso');
}

/* -------------------------------------- el código se está creando, no existe */

seccion('La fila de batch input en la hoja de la clase');
{
  const r = guardarUna(SOLICITUD);
  ok(r.ok && r.hoja === 'PT' && r.fila === 3, 'la solicitud PT entra en la fila 3');

  ok(celda('PT', 3, 1) === 'CL', 'A País = CL');
  ok(celda('PT', 3, 2) === 'TCD2', 'B Centro = el elegido');
  ok(celda('PT', 3, 3) === 'PT', 'C Clase Requerimiento = PT');
  ok(celda('PT', 3, 4) === 'NO', 'D Tipo Requerimiento = NO');
  ok(/^\d{2}\.\d{2}\.\d{4}$/.test(celda('PT', 3, 5)), 'E Llegada requerimiento, texto dd.mm.aaaa');
  ok(celda('PT', 3, 6) === 'test@masisa.com', 'F Usuario Solicitante = el correo');

  ok(celda('PT', 3, 7) === 'RVM', 'G Aserradero(Template) sale del prefijo de la ruta');
  ok(celda('PT', 3, 8) === '032X180', 'H Tamaño Dimensión sale de la escuadría de la ruta');
  ok(celda('PT', 3, 9) === '032' && celda('PT', 3, 10) === '180', 'I y J: EE y AA del aserradero');

  ok(celda('PT', 3, 11) === '' && celda('PT', 3, 12) === '',
    'K y L vacías: RVMH es verde, no pasa por secado');
  ok(celda('PT', 3, 15) === '' && celda('PT', 3, 16) === '',
    'O y P vacías: es rústico, no pasa por cepillado');

  ok(celda('PT', 3, 19) === 'RVMH', 'S Empaquetado = la agrupación');
  ok(celda('PT', 3, 20) === '032X180X3960', 'T Tamaño dimensión completa');
  ok(celda('PT', 3, 21) === '032' && celda('PT', 3, 22) === '180' && celda('PT', 3, 23) === '3960',
    'U, V y W: espesor, ancho y largo');
  ok(celda('PT', 3, 24) === 248 && celda('PT', 3, 25) === 'PZA' && celda('PT', 3, 26) === 'P',
    'X, Y y Z: PAK, UMB y Stock/Pedido');
  ok(celda('PT', 3, 27) === '' && celda('PT', 3, 28) === '',
    'las descripciones especiales quedan intactas');
}

seccion('Un producto cepillado llena las tres etapas');
{
  const r = guardarUna(CEPILLADO);
  ok(celda('PT', r.fila, 7) === 'RVF' && celda('PT', r.fila, 8) === '021X105',
    'aserradero sobredimensionado, con su propia ruta');
  ok(celda('PT', r.fila, 11) === 'RSF' && celda('PT', r.fila, 12) === '020X102', 'secado');
  ok(celda('PT', r.fila, 15) === 'CSF' && celda('PT', r.fila, 16) === '019X100', 'cepillado');
  ok(celda('PT', r.fila, 19) === 'C4JH', 'y el empaquetado es la agrupación pedida');
}

seccion('La bitácora Registro');
{
  ok(registro(1, 'Fecha') === 'Fecha', 'estrena sus encabezados');
  ok(registro(2, 'Solicitante') === 'test@masisa.com', 'guarda el correo');
  ok(registro(2, 'Agrupación') === 'RVMH', 'guarda la agrupación');
  ok(registro(2, 'Código') === 'RVMH032X180X3960', 'guarda el código armado');
  ok(registro(2, 'Aserradero') === 'RVM 032X180', 'guarda la ruta completa, no solo el prefijo');
  ok(registro(2, 'Secado') === '', 'y deja en blanco la etapa que no aplica');
  ok(registro(2, 'Hoja Destino') === 'PT' && registro(2, 'Fila Destino') === 3,
    'deja la pista de dónde quedó la fila');
}

seccion('Cada clase a su hoja');
{
  const pcp = guardarUna(con({ clase: 'PCP' }));
  ok(pcp.hoja === 'PCP' && pcp.fila === 3, 'PCP se va a la hoja PCP');
  const pp = guardarUna(con({ clase: 'PP' }));
  ok(pp.hoja === 'PP' && pp.fila === 3, 'PP se va a la hoja PP');
  ok(celda('PP', 3, 3) === 'PP', 'y la clase queda escrita en su fila');
}

seccion('En PT la ruta se avisa; en PP y PCP tiene que existir');
{
  const inventada = { aserradero: { ruta: 'RVM 999X999' } };
  const pt = guardarUna(con({ desglose: inventada }));
  ok(pt.ok, 'en PT se puede indicar una ruta que todavía no está en la base');
  ok(celda('PT', pt.fila, 7) === 'RVM' && celda('PT', pt.fila, 8) === '999X999',
    'y se escribe igual');

  ok(error(() => guardarUna(con({ clase: 'PP', desglose: inventada })))
    .indexOf('no existe en BD_Maderas') !== -1, 'en PP no: la ruta tiene que existir');
  ok(error(() => guardarUna(con({ clase: 'PCP', desglose: inventada })))
    .indexOf('no existe en BD_Maderas') !== -1, 'en PCP tampoco');
}

seccion('Trading elige centro, Planta no');
{
  const r = guardarUna(con({
    origen: 'Planta', centro: 'TCD2', agrupacion: 'RSFR',
    espesor: '37', ancho: '130', largo: '3200',
    desglose: {
      aserradero: { ruta: 'RVFD032X180' },
      secado: { ruta: 'RSFD032X180' }
    }
  }));
  ok(celda('PT', r.fila, 2) === 'TCP1', 'Planta entra como TCP1 aunque pidan otro centro');
  ok(error(() => guardarUna(con({ centro: 'TCP9' }))).indexOf('no corresponde a Trading') !== -1,
    'Trading con un centro que no existe no guarda');
}

seccion('Lo que no se puede guardar');
{
  ok(error(() => guardarUna(con({ largo: '4000' }))).indexOf('ya existe') !== -1,
    'un código que ya está creado');
  ok(error(() => guardarUna(con({
    origen: 'Trading', centro: 'TCP1', tipoMaterial: 'TTAS', agrupacion: 'RSFR',
    espesor: '37', ancho: '130', largo: '3200',
    desglose: { aserradero: { ruta: 'RVFD032X180' }, secado: { ruta: 'RSFD032X180' } }
  }))).indexOf('la especie del código tiene que ser H') !== -1,
    'una agrupación sin H pedida desde Trading');
  ok(error(() => guardarUna(con({ centro: 'TCP1' }))).indexOf('no está habilitada') !== -1,
    'RVMH no se puede pedir en TCP1: la hoja SAP no lo permite');
  ok(error(() => guardarUna(con({ agrupacion: 'XXXX' }))).indexOf('no está habilitada') !== -1,
    'una agrupación inventada');
  ok(error(() => guardarUna(con({ desglose: {} }))).indexOf('Falta la hoja de ruta') !== -1,
    'sin hoja de ruta');
  ok(error(() => guardarUna(con({ desglose: { aserradero: { ruta: 'RSFD032X180' } } })))
    .indexOf('es de secado, no de Aserradero') !== -1,
    'una ruta de secado puesta en el aserradero');
  ok(error(() => guardarUna(con({ desglose: { aserradero: { ruta: 'RVM' } } })))
    .indexOf('no tiene la forma de una ruta') !== -1, 'una ruta sin escuadría');
  ok(error(() => guardarUna(con({ piezas: 0 }))).indexOf('mayor que cero') !== -1, 'piezas en 0');
  ok(error(() => guardarUna(con({ piezas: 2.5 }))).indexOf('entero') !== -1, 'piezas con decimales');
  ok(error(() => guardarUna(con({ espesor: '' }))).indexOf('Faltan el espesor') !== -1,
    'sin espesor no hay código');
  ok(error(() => guardarUna(con({ clase: 'XX' }))).indexOf('Clase de requerimiento desconocida') !== -1,
    'clase inventada');

  const antes = SS.getSheetByName('PT').getLastRow();
  error(() => guardarUna(con({ piezas: 0 })));
  ok(SS.getSheetByName('PT').getLastRow() === antes, 'un intento fallido no deja filas a medias');
}

seccion('Del código se deduce todo lo demás');
{
  const h = deducirDeCodigo_('RVMH032X180X3960');
  ok(h.ok && h.origen === 'Trading' && h.centro === 'TCD2',
    'con especie H es Trading y centro TCD2, sin preguntar nada');
  ok(h.clase === 'PT', 'y con largo es producto terminado');
  ok(h.esTerceros === true, 'queda marcado como madera de terceros');

  const proceso = deducirDeCodigo_('RVM 032X180');
  ok(proceso.clase === 'PP', 'tres letras y sin largo: producto de proceso');
  ok(proceso.origen === 'Planta' && proceso.centro === 'TCP1', 'y entra por Planta, en TCP1');

  const cepillado = deducirDeCodigo_('CSF 019X100');
  ok(cepillado.clase === 'PCP', 'si además es cepillado, va a PCP');

  ok(deducirDeCodigo_('RSFR037X130X3600').origen === 'Planta',
    'un código de Radiata EERR no es de terceros: Planta');
  ok(!deducirDeCodigo_('ZZZZ032X180X3960').ok, 'un prefijo desconocido no se deduce');
}

seccion('El lote: se pegan códigos y salen sus filas');
{
  const r = apiLote([
    'RVMH032X180X3960',
    'RVM 032X180',
    'RVMH032X180X4000',
    'ZZZZ032X180X3960',
    ''
  ].join('\n'));

  ok(r.filas.length === 4, 'las líneas en blanco se saltan');
  ok(r.filas[0].codigo === 'RVMH032X180X3960' && r.filas[0].clase === 'PT', 'la primera es PT');
  ok(r.filas[0].opciones.aserradero.length === 2,
    'trae las rutas de aserradero que hay para 032X180');
  ok(!r.filas[0].ok && r.filas[0].problemas[0].indexOf('Falta la hoja de ruta') !== -1,
    'y avisa que falta la ruta, porque hay dos y no puede elegir sola');

  ok(r.filas[1].clase === 'PP' && r.filas[1].ok === false, 'la segunda es de proceso');
  ok(r.filas[2].problemas[0].indexOf('Ya existe') !== -1, 'la tercera ya existe en la base');
  ok(!r.filas[3].codigo && r.filas[3].problemas[0].indexOf('no está en la hoja SAP') !== -1,
    'la cuarta no se pudo leer, y dice por qué');
  ok(r.conProblemas === 4 && r.listas === 0, 'el resumen cuenta lo que falta');
}
{
  // Con la ruta pegada al lado, la fila sale lista de una.
  const r = apiLote('RVMH032X180X3960\tRVM 032X180\t248');
  ok(r.filas[0].rutas.aserradero === 'RVM 032X180', 'toma la ruta que viene en la misma línea');
  ok(r.filas[0].piezas === '248', 'y el número suelto es la cantidad');
  ok(r.filas[0].ok && r.listas === 1, 'la fila queda lista');
}
{
  // Cuando la escuadría tiene una sola ruta por etapa, se pone sola.
  const r = apiLote('C4JH019X100X2440');
  ok(r.filas[0].rutas.cepillado === 'CSF 019X100', 'elige sola la única ruta de cepillado');
  ok(r.filas[0].etapas.secado && r.filas[0].etapas.aserradero, 'y pide las otras dos etapas');
}

seccion('Las columnas van por línea');
{
  const r = apiLote({
    codigos: ['RVMH032X180X3960', '', 'C4JH019X100X2440'].join('\n'),
    rutas: {
      aserradero: ['RVM 032X180', '', 'RVF 021X105'].join('\n'),
      secado: ['', '', 'RSF 020X102'].join('\n'),
      cepillado: ['', '', 'CSF 019X100'].join('\n')
    },
    piezas: ['248', '', '60'].join('\n')
  });

  ok(r.filas.length === 2, 'la línea en blanco no genera fila');
  ok(r.filas[0].n === 1 && r.filas[1].n === 3,
    'pero sí conserva el número: la fila 3 es la línea 3, no la 2');
  ok(r.filas[0].rutas.aserradero === 'RVM 032X180', 'cada ruta viene de su columna');
  ok(r.filas[0].piezas === '248' && r.filas[1].piezas === '60', 'y el PAK también');
  ok(r.filas[1].rutas.secado === 'RSF 020X102' && r.filas[1].rutas.cepillado === 'CSF 019X100',
    'un producto cepillado toma sus tres rutas de sus tres columnas');
  ok(r.listas === 2, 'las dos quedan listas');
}
{
  // Lo escrito en la columna manda sobre lo que venga pegado en la línea.
  const r = apiLote({
    codigos: 'RVMH032X180X3960\tRVFD032X180',
    rutas: { aserradero: 'RVM 032X180' }
  });
  ok(r.filas[0].rutas.aserradero === 'RVM 032X180',
    'la columna gana sobre la ruta pegada en la misma línea del código');
}
{
  const r = apiLote({ codigos: 'RVMH032X180X3960' });
  ok(r.filas[0].opciones.aserradero.length === 2 && !r.filas[0].rutas.aserradero,
    'con dos rutas posibles no elige ninguna, y la tabla dice cuántas faltan');
}

seccion('Revisar el lote después de completar las rutas');
{
  const lote = apiLote('RVMH032X180X3960');
  lote.filas[0].rutas.aserradero = 'RVM 032X180';
  const revisado = apiRevisarLote(lote.filas);
  ok(revisado.filas[0].ok && revisado.listas === 1, 'con la ruta puesta, la fila queda lista');

  lote.filas[0].rutas.aserradero = 'RSFD032X180';
  ok(apiRevisarLote(lote.filas).filas[0].problemas[0].indexOf('es de secado') !== -1,
    'una ruta de secado en el aserradero se marca');
}

seccion('El Excel del batch input');
{
  const lote = apiLote('RVMH032X180X3960\tRVM 032X180\t248');
  const r = apiExcelLote(lote.filas);
  ok(r.ok && r.filas === 1, 'genera el archivo con la fila seleccionada');
  ok(/^batch-input-maderas-\d{8}-\d{4}\.xlsx$/.test(r.nombre), 'con fecha y hora en el nombre');
  ok(r.primeraFila === 3, 'los datos empiezan en la fila 3');
  ok(r.base64.length > 100, 'y viene en base64 para descargarlo');

  const hoja = armarXlsx_('Batch input', [['CL', 'TCD2'], ['CL', 'TCP1']], 3)
    .__partes.filter(p => p.name === 'xl/worksheets/sheet1.xml')[0].bytes.toString('utf8');
  ok(hoja.indexOf('<row r="3">') !== -1, 'la primera fila escrita es la 3');
  ok(hoja.indexOf('<row r="4">') !== -1, 'la segunda es la 4');
  ok(hoja.indexOf('<row r="1">') === -1 && hoja.indexOf('<row r="2">') === -1,
    'la 1 y la 2 quedan en blanco');
  ok(hoja.indexOf('r="A3"') !== -1 && hoja.indexOf('r="B3"') !== -1, 'las celdas van A3, B3…');

  ok(columnaXlsx_(1) === 'A' && columnaXlsx_(26) === 'Z' && columnaXlsx_(28) === 'AB',
    'las columnas llegan hasta AB, que es la última del batch input');
  ok(escaparXml_('Cep. 2(C) & <Radiata>').indexOf('&amp;') !== -1, 'el XML va escapado');

  const partes = armarXlsx_('X', [['a']], 3).__partes.map(p => p.name).sort().join(' ');
  ok(partes === '[Content_Types].xml _rels/.rels xl/_rels/workbook.xml.rels ' +
     'xl/workbook.xml xl/worksheets/sheet1.xml', 'el xlsx lleva sus cinco piezas');
}

seccion('Guardar el lote completo');
{
  const lote = apiLote([
    'RVMH032X180X3660\tRVM 032X180\t120',
    'RVMH032X180X4270\tRVM 032X180'
  ].join('\n'));
  ok(lote.listas === 2, 'las dos líneas quedan listas');

  const r = apiGuardarLote(lote.filas);
  ok(r.guardadas === 2 && r.fallidas === 0, 'se guardan las dos');
  ok(celda('PT', r.resultados[0].fila, 24) === 120, 'la primera lleva su PAK');
  ok(celda('PT', r.resultados[1].fila, 24) === '', 'y la segunda queda sin PAK, que es opcional');
  ok(celda('PT', r.resultados[1].fila, 7) === 'RVM', 'las dos con su ruta de aserradero');
}
{
  const lote = apiLote('RVMH032X180X4000\tRVM 032X180');
  const r = apiGuardarLote(lote.filas);
  ok(r.fallidas === 1 && r.resultados[0].mensaje.indexOf('ya existe') !== -1,
    'una fila que ya existe se rechaza y el lote sigue');
}

seccion('Sin identidad no hay registro');
{
  global.__USUARIO = '';
  ok(error(() => guardarUna(SOLICITUD)).indexOf('identificar tu cuenta') !== -1,
    'si Google no entrega el correo, la solicitud no se guarda');
  delete global.__USUARIO;
  ok(guardarUna(SOLICITUD).ok, 'con el correo de vuelta, se puede guardar otra vez');
}

seccion('instalarRegistro deja los catálogos en el spreadsheet');
{
  ok(!SS.getSheetByName('SAP'), 'antes de instalar no existe la hoja SAP');
  instalarRegistro();
  const sap = SS.getSheetByName('SAP');
  ok(!!sap && sap.getLastRow() === 34, 'crea SAP con sus 33 filas de agrupaciones');
  ok(sap.getRange(1, 4).getValue() === 'AgrupMad', 'con AgrupMad en la columna D');
  ok(agrupacionesDe_('TCD2', 'TTAS').length === 9,
    'y desde ahí en adelante las agrupaciones salen de la hoja');
}

console.log('\n' + (fallos ? fallos + ' prueba(s) con problemas' : 'Todas las pruebas pasaron'));
process.exit(fallos ? 1 : 0);
