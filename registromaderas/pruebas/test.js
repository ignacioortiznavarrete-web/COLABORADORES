const fs = require('fs');
const vm = require('vm');
const path = require('path');
const { SS } = require('./mock');

// Los mismos archivos que se pegan en el editor de Apps Script.
const FUENTES = ['Config.gs', 'Catalogos.gs', 'Registro.gs', 'Setup.gs']
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
  const codigos = (c, t, o) => apiAgrupaciones(c, t, o).agrupaciones.map(a => a.codigo);

  const tcd2 = codigos('TCD2', 'TTAS');
  ok(tcd2.length === 9 && tcd2.indexOf('RVMH') !== -1, 'TCD2 + TTAS habilita 9, entre ellas RVMH');
  ok(codigos('TCP1', 'TPAS').length === 16, 'TCP1 + TPAS habilita 16, las de proceso');
  ok(codigos('TCP1', 'TTAS').length === 8, 'TCP1 + TTAS habilita 8');
  ok(codigos('TCD2', 'TPAS').length === 0, 'TCD2 + TPAS no habilita ninguna');
}

seccion('En Trading el código tiene que llevar especie H');
{
  const codigos = (c, t, o) => apiAgrupaciones(c, t, o).agrupaciones.map(a => a.codigo);
  const trading = codigos('TCD2', 'TTAS', 'Trading');
  ok(trading.length === 9, 'las 9 de TCD2 + TTAS sirven para Trading');
  ok(trading.every(c => c.charAt(3) === 'H'), 'porque todas terminan en H');
  ok(codigos('TCP1', 'TTAS', 'Trading').length === 0,
    'en TCP1 no queda ninguna: sus agrupaciones terminan en R, no en H');
  ok(codigos('TCP1', 'TTAS', 'Planta').length === 8, 'pero desde Planta sí se pueden pedir');
  ok(apiAgrupaciones('TCD2', 'TTAS', 'Trading').filtradoPorTrading === true,
    'el formulario sabe que la lista viene filtrada');
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

seccion('El código que se pide tiene que ser nuevo');
{
  const nuevo = apiMedidas({ agrupacion: 'RVMH', espesor: '32', ancho: '180', largo: '3960' });
  ok(nuevo.ok && !nuevo.existe, 'RVMH032X180X3960 no está en la base: se puede crear');
  ok(nuevo.codigo === 'RVMH032X180X3960', 'lo arma con los ceros puestos');

  const repetido = apiMedidas({ agrupacion: 'RVMH', espesor: '32', ancho: '180', largo: '4000' });
  ok(!repetido.ok && repetido.existe, 'RVMH032X180X4000 ya existe: no se puede volver a crear');
  ok(repetido.mensaje.indexOf('ya existe') !== -1 &&
     repetido.mensaje.indexOf('Verde Médula') !== -1,
    'y el mensaje dice cuál es el material que ya está');

  ok(nuevo.largos.join() === '4000',
    'muestra los largos ya creados de esa escuadría, para no chocar con ellos');
  ok(nuevo.rutas.map(r => r.codigo).join() === 'RSFD032X180,RVFD032X180,RVM 032X180',
    'y de paso trae las hojas de ruta de la escuadría');
}
{
  const tolerante = apiMedidas({ agrupacion: 'RSFR', espesor: '37', ancho: '130', largo: '3600' });
  ok(tolerante.existe,
    'detecta como existente el código que en la base trae un espacio duro al final');
  ok(apiMedidas({ agrupacion: '', espesor: '32' }).mensaje.indexOf('agrupación') !== -1,
    'sin agrupación no hay nada que armar');
  ok(apiMedidas({ agrupacion: 'RVMH', espesor: 'ab' }).mensaje.indexOf('número entero') !== -1,
    'una medida con letras avisa en vez de romperse');
}

/* ---------------------------------------------------------- hojas de ruta */

seccion('Las hojas de ruta salen de lo que existe en la base');
{
  const r = apiRutas('32', '180');
  ok(r.ok && r.escuadria === '032X180', 'se piden por escuadría');
  ok(r.rutas.length === 3, 'para 032X180 la base tiene tres');
  ok(r.rutas.map(x => x.etapa).join() === 'secado,aserradero,aserradero',
    'y cada una sabe a qué etapa pertenece');
  ok(familiaDeRuta_('RVFD032X180') === 'aserradero', 'RV es aserradero');
  ok(familiaDeRuta_('RSFD032X180') === 'secado', 'RS es secado');
  ok(familiaDeRuta_('CSF 019X100') === 'cepillado', 'C es cepillado');
  ok(escuadriaDeRuta_('RVM 032X180') === '032X180', 'la escuadría son los siete del final');
  ok(escuadriaDeRuta_('RVMH032X180X3960') === '', 'un producto con largo no es una ruta');
  ok(apiRutas('99', '999').rutas.length === 0, 'una escuadría sin rutas devuelve la lista vacía');
}

/* -------------------------------------------------------------- el guardado */

seccion('La fila de batch input en la hoja de la clase');
{
  const r = apiGuardar(SOLICITUD);
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
  const r = apiGuardar(CEPILLADO);
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
  const pcp = apiGuardar(con({ clase: 'PCP' }));
  ok(pcp.hoja === 'PCP' && pcp.fila === 3, 'PCP se va a la hoja PCP');
  const pp = apiGuardar(con({ clase: 'PP' }));
  ok(pp.hoja === 'PP' && pp.fila === 3, 'PP se va a la hoja PP');
  ok(celda('PP', 3, 3) === 'PP', 'y la clase queda escrita en su fila');
}

seccion('En PT la ruta se avisa; en PP y PCP tiene que existir');
{
  const inventada = { aserradero: { ruta: 'RVM 999X999' } };
  const pt = apiGuardar(con({ desglose: inventada }));
  ok(pt.ok, 'en PT se puede indicar una ruta que todavía no está en la base');
  ok(celda('PT', pt.fila, 7) === 'RVM' && celda('PT', pt.fila, 8) === '999X999',
    'y se escribe igual');

  ok(error(() => apiGuardar(con({ clase: 'PP', desglose: inventada })))
    .indexOf('no existe en BD_Maderas') !== -1, 'en PP no: la ruta tiene que existir');
  ok(error(() => apiGuardar(con({ clase: 'PCP', desglose: inventada })))
    .indexOf('no existe en BD_Maderas') !== -1, 'en PCP tampoco');
}

seccion('Pegar y armar paso a paso terminan en la misma fila');
{
  const pegado = apiPegarCodigo('RVMH032X180X3960');
  const r = apiGuardar({
    clase: 'PT', origen: pegado.origen, centro: pegado.centro, tipoMaterial: pegado.tipoMaterial,
    agrupacion: pegado.agrupacion.codigo,
    espesor: pegado.espesor, ancho: pegado.ancho, largo: pegado.largo,
    desglose: { aserradero: { ruta: 'RVM 032X180' } },
    piezas: 248, umb: 'PZA', stockPedido: 'P'
  });
  const armado = apiGuardar(SOLICITUD);
  const fila = f => SS.getSheetByName('PT').getRange(f, 1, 1, 26).getValues()[0]
    .map((v, i) => (i === 4 ? 'fecha' : v)).join('|');
  ok(fila(r.fila) === fila(armado.fila),
    'la fila del código pegado es idéntica a la del código armado a mano');
}

seccion('Pegar un código ya armado');
{
  const r = apiPegarCodigo('RVMH032X180X3960');
  ok(r.ok && !r.existe, 'el código pegado todavía no existe: se puede crear');
  ok(r.centro === 'TCD2' && r.tipoMaterial === 'TTAS',
    'el prefijo trae el centro y el tipo de material desde la hoja SAP');
  ok(r.origen === 'Trading', 'y el origen, porque la especie H es madera de terceros');
  ok(r.agrupacion.etapas.aserradero && !r.agrupacion.etapas.secado, 'con sus etapas');
  ok(r.rutas.length === 3, 'y las rutas de la escuadría, listas para el desglose');

  const repetido = apiPegarCodigo('RVMH032X180X4000');
  ok(!repetido.ok && repetido.existe, 'si el código ya existe, lo dice y no deja seguir');

  ok(apiPegarCodigo('C23H001X006X0013').mensaje.indexOf('no está en la hoja SAP') !== -1,
    'un prefijo que no está en SAP dice exactamente eso');
  ok(apiPegarCodigo('ABC').mensaje.indexOf('No reconozco la forma') !== -1,
    'con algo que no es un código, explica cómo se arma uno');
}

seccion('Trading elige centro, Planta no');
{
  const r = apiGuardar(con({
    origen: 'Planta', centro: 'TCD2', agrupacion: 'RSFR',
    espesor: '37', ancho: '130', largo: '3200',
    desglose: {
      aserradero: { ruta: 'RVFD032X180' },
      secado: { ruta: 'RSFD032X180' }
    }
  }));
  ok(celda('PT', r.fila, 2) === 'TCP1', 'Planta entra como TCP1 aunque pidan otro centro');
  ok(error(() => apiGuardar(con({ centro: 'TCP9' }))).indexOf('no corresponde a Trading') !== -1,
    'Trading con un centro que no existe no guarda');
}

seccion('Lo que no se puede guardar');
{
  ok(error(() => apiGuardar(con({ largo: '4000' }))).indexOf('ya existe') !== -1,
    'un código que ya está creado');
  ok(error(() => apiGuardar(con({
    origen: 'Trading', centro: 'TCP1', tipoMaterial: 'TTAS', agrupacion: 'RSFR',
    espesor: '37', ancho: '130', largo: '3200',
    desglose: { aserradero: { ruta: 'RVFD032X180' }, secado: { ruta: 'RSFD032X180' } }
  }))).indexOf('la especie del código tiene que ser H') !== -1,
    'una agrupación sin H pedida desde Trading');
  ok(error(() => apiGuardar(con({ centro: 'TCP1' }))).indexOf('no está habilitada') !== -1,
    'RVMH no se puede pedir en TCP1: la hoja SAP no lo permite');
  ok(error(() => apiGuardar(con({ agrupacion: 'XXXX' }))).indexOf('no está habilitada') !== -1,
    'una agrupación inventada');
  ok(error(() => apiGuardar(con({ desglose: {} }))).indexOf('Falta la hoja de ruta') !== -1,
    'sin hoja de ruta');
  ok(error(() => apiGuardar(con({ desglose: { aserradero: { ruta: 'RSFD032X180' } } })))
    .indexOf('es de secado, no de Aserradero') !== -1,
    'una ruta de secado puesta en el aserradero');
  ok(error(() => apiGuardar(con({ desglose: { aserradero: { ruta: 'RVM' } } })))
    .indexOf('no tiene la forma de una ruta') !== -1, 'una ruta sin escuadría');
  ok(error(() => apiGuardar(con({ piezas: 0 }))).indexOf('mayor que cero') !== -1, 'piezas en 0');
  ok(error(() => apiGuardar(con({ piezas: 2.5 }))).indexOf('entero') !== -1, 'piezas con decimales');
  ok(error(() => apiGuardar(con({ espesor: '' }))).indexOf('Faltan el espesor') !== -1,
    'sin espesor no hay código');
  ok(error(() => apiGuardar(con({ clase: 'XX' }))).indexOf('Clase de requerimiento desconocida') !== -1,
    'clase inventada');

  const antes = SS.getSheetByName('PT').getLastRow();
  error(() => apiGuardar(con({ piezas: 0 })));
  ok(SS.getSheetByName('PT').getLastRow() === antes, 'un intento fallido no deja filas a medias');
}

seccion('Sin identidad no hay registro');
{
  global.__USUARIO = '';
  ok(error(() => apiGuardar(SOLICITUD)).indexOf('identificar tu cuenta') !== -1,
    'si Google no entrega el correo, la solicitud no se guarda');
  delete global.__USUARIO;
  ok(apiGuardar(SOLICITUD).ok, 'con el correo de vuelta, se puede guardar otra vez');
}

seccion('instalarRegistro deja los catálogos en el spreadsheet');
{
  ok(!SS.getSheetByName('SAP'), 'antes de instalar no existe la hoja SAP');
  instalarRegistro();
  const sap = SS.getSheetByName('SAP');
  ok(!!sap && sap.getLastRow() === 34, 'crea SAP con sus 33 filas de agrupaciones');
  ok(sap.getRange(1, 4).getValue() === 'AgrupMad', 'con AgrupMad en la columna D');
  ok(SS.getSheetByName('Agrupamiento').getLastRow() === 18, 'y Agrupamiento con las plantillas');
  ok(apiAgrupaciones('TCD2', 'TTAS').agrupaciones.length === 9,
    'y desde ahí en adelante las agrupaciones salen de la hoja');
}

console.log('\n' + (fallos ? fallos + ' prueba(s) con problemas' : 'Todas las pruebas pasaron'));
process.exit(fallos ? 1 : 0);
