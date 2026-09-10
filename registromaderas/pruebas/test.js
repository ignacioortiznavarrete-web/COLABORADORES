const fs = require('fs');
const vm = require('vm');
const path = require('path');
const { SS } = require('./mock');

// Los mismos archivos que se pegan en el editor de Apps Script.
const FUENTES = ['Config.gs', 'Registro.gs', 'Xlsx.gs', 'Lote.gs', 'Setup.gs', 'Exportar.gs']
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
  ['RVF 019X100', 'X9000', 'TPAS', 'Rústico Verde COL MIX 019X100', 'X'],
  ['RSF 019X100', 'X9000', 'TPAS', 'Rústico Seco COL MIX 019X100', 'X'],
  ['CSF 019X100', 'X11000', 'TPAS', 'Cepillado Seco COL MIX 019X100', 'X'],
  ['RVF 037X130', 'X9000', 'TPAS', 'Rústico Verde COL MIX 037X130', 'X'],
  ['RSF 037X130', 'X9000', 'TPAS', 'Rústico Seco COL MIX 037X130', 'X'],
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

// Un producto que sí se fabrica acá: RSFR es Radiata EERR, no terceros.
const SOLICITUD = {
  clase: 'PT', origen: 'Planta', centro: 'TCP1', tipoMaterial: 'TTAS',
  agrupacion: 'RSFR', espesor: '37', ancho: '130', largo: '3200',
  desglose: {
    aserradero: { ruta: 'RVF 037X130' },
    secado: { ruta: 'RSF 037X130' }
  },
  piezas: 248, umb: 'PZA', stockPedido: 'P'
};

// Cepillado: pasa por las tres etapas.
const CEPILLADO = {
  clase: 'PT', origen: 'Planta', centro: 'TCP1', tipoMaterial: 'TTAS',
  agrupacion: 'C4JR', espesor: '19', ancho: '100', largo: '2440',
  desglose: {
    aserradero: { ruta: 'RVF 019X100' },
    secado: { ruta: 'RSF 019X100' },
    cepillado: { ruta: 'CSF 019X100' }
  },
  piezas: 60, umb: 'PZA', stockPedido: 'S'
};

// De Trading: se compra hecha, no lleva ninguna hoja de ruta.
const TRADING_LISTA = {
  clase: 'PT', origen: 'Trading', centro: 'TCD2', tipoMaterial: 'TTAS',
  agrupacion: 'RVMH', espesor: '32', ancho: '180', largo: '3960',
  desglose: {}, piezas: 120, umb: 'PZA', stockPedido: 'P'
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
  ok(ctx.hojaBD === 'BD_Maderas', 'y la única hoja que consulta es BD_Maderas');
  ok(ctx.porDefecto.TIPO_REQUERIMIENTO === 'NO', 'Tipo Requerimiento va en NO, como el ejemplo');
  ok(!ctx.hojasFaltantes.length, 'no falta ninguna hoja');
}

/* ------------------------------------ la condicional: centro + tipo material */

seccion('Qué etapas tiene cada producto, leídas del prefijo');
{
  const etapas = c => etapasAplicables_(c);
  ok(!etapas('RVMH').aserradero && !etapas('RVMH').secado && !etapas('RVMH').cepillado,
    'RVMH lleva H y no es cepillado: es Trading, se compra hecha y no lleva ruta');
  ok(etapas('C4JH').aserradero && etapas('C4JH').secado && etapas('C4JH').cepillado,
    'C4JH empieza con C: se cepilló acá, así que pide las tres aunque lleve H');
  ok(etapas('RVM ').aserradero && !etapas('RVM ').secado && !etapas('RVM ').cepillado,
    'RVM es verde y rústico: solo aserradero');
  ok(etapas('RSFR').aserradero && etapas('RSFR').secado && !etapas('RSFR').cepillado,
    'RSFR es seco y rústico: aserradero y secado');
  ok(etapas('CSF').cepillado && etapas('CSF').secado && etapas('CSF').aserradero,
    'CSF es cepillado: pasa por las tres');
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
  ok(celda('PT', 3, 2) === 'TCP1', 'B Centro = el que dice SAP para esa agrupación');
  ok(celda('PT', 3, 3) === 'PT', 'C Clase Requerimiento = PT');
  ok(celda('PT', 3, 4) === 'NO', 'D Tipo Requerimiento = NO');
  ok(/^\d{2}\.\d{2}\.\d{4}$/.test(celda('PT', 3, 5)), 'E Llegada requerimiento, texto dd.mm.aaaa');
  ok(celda('PT', 3, 6) === 'test@masisa.com', 'F Usuario Solicitante = el correo');

  ok(celda('PT', 3, 7) === 'RVF', 'G Aserradero(Template) sale del prefijo de la ruta');
  ok(celda('PT', 3, 8) === '037X130', 'H Tamaño Dimensión sale de la escuadría de la ruta');
  ok(celda('PT', 3, 9) === '037' && celda('PT', 3, 10) === '130', 'I y J: EE y AA del aserradero');

  ok(celda('PT', 3, 11) === 'RSF' && celda('PT', 3, 12) === '037X130', 'K y L: la etapa de secado');
  ok(celda('PT', 3, 15) === '' && celda('PT', 3, 16) === '',
    'O y P vacías: RSFR es rústico, no pasa por cepillado');

  ok(celda('PT', 3, 19) === 'RSFR', 'S Empaquetado = la agrupación');
  ok(celda('PT', 3, 20) === '037X130X3200', 'T Tamaño dimensión completa');
  ok(celda('PT', 3, 21) === '037' && celda('PT', 3, 22) === '130' && celda('PT', 3, 23) === '3200',
    'U, V y W: espesor, ancho y largo');
  ok(celda('PT', 3, 24) === 248 && celda('PT', 3, 25) === 'PZA' && celda('PT', 3, 26) === 'P',
    'X, Y y Z: PAK, UMB y Stock/Pedido');
  ok(celda('PT', 3, 27) === '' && celda('PT', 3, 28) === '',
    'las descripciones especiales quedan intactas');
}

seccion('Un producto cepillado llena las tres etapas');
{
  const r = guardarUna(CEPILLADO);
  ok(celda('PT', r.fila, 7) === 'RVF' && celda('PT', r.fila, 8) === '019X100', 'aserradero');
  ok(celda('PT', r.fila, 11) === 'RSF' && celda('PT', r.fila, 12) === '019X100', 'secado');
  ok(celda('PT', r.fila, 15) === 'CSF' && celda('PT', r.fila, 16) === '019X100', 'cepillado');
  ok(celda('PT', r.fila, 19) === 'C4JR', 'y el empaquetado es la agrupación pedida');
}

seccion('La bitácora Registro');
{
  ok(registro(1, 'Fecha') === 'Fecha', 'estrena sus encabezados');
  ok(registro(2, 'Solicitante') === 'test@masisa.com', 'guarda el correo');
  ok(registro(2, 'Agrupación') === 'RSFR', 'guarda la agrupación');
  ok(registro(2, 'Código') === 'RSFR037X130X3200', 'guarda el código armado');
  ok(registro(2, 'Aserradero') === 'RVF 037X130', 'guarda la ruta completa, no solo el prefijo');
  ok(registro(2, 'Cepillado') === '', 'y deja en blanco la etapa que no aplica');
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
  const inventada = {
    aserradero: { ruta: 'RVF 999X999' },   // no está en la base
    secado: { ruta: 'RSF 037X130' }
  };
  const pt = guardarUna(con({ desglose: inventada }));
  ok(pt.ok, 'en PT se puede indicar una ruta que todavía no está en la base');
  ok(celda('PT', pt.fila, 7) === 'RVF' && celda('PT', pt.fila, 8) === '999X999',
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
      aserradero: { ruta: 'RVFD037X130' },
      secado: { ruta: 'RSFD037X130' }
    }
  }));
  ok(celda('PT', r.fila, 2) === 'TCP1', 'Planta entra como TCP1 aunque pidan otro centro');
  ok(error(() => guardarUna(Object.assign({}, TRADING_LISTA, { centro: 'TCP9' })))
    .indexOf('no corresponde a Trading') !== -1,
    'Trading con un centro que no existe no guarda');
}

seccion('Lo que no se puede guardar');
{
  ok(error(() => guardarUna(con({ largo: '3600' }))).indexOf('ya existe') !== -1,
    'un código que ya está creado');
  ok(error(() => guardarUna(con({
    origen: 'Trading', centro: 'TCP1', tipoMaterial: 'TTAS', agrupacion: 'RSFR',
    espesor: '37', ancho: '130', largo: '3200',
    desglose: { aserradero: { ruta: 'RVFD032X180' }, secado: { ruta: 'RSFD032X180' } }
  }))).indexOf('la especie del código tiene que ser H') !== -1,
    'una agrupación sin H pedida desde Trading');

  ok(error(() => guardarUna(con({ agrupacion: 'X X' }))).indexOf('no tiene la forma') !== -1,
    'una agrupación con una forma imposible');
  ok(error(() => guardarUna(con({ desglose: {} }))).indexOf('Falta la hoja de ruta') !== -1,
    'sin hoja de ruta');
  ok(error(() => guardarUna(con({ desglose: { aserradero: { ruta: 'RSF 037X130' } } })))
    .indexOf('es de secado, no de Aserradero') !== -1,
    'una ruta de secado puesta en el aserradero');
  ok(error(() => guardarUna(con({ desglose: { aserradero: { ruta: 'RVF' } } })))
    .indexOf('no tiene la forma de una ruta') !== -1, 'una ruta sin escuadría');
  ok(error(() => guardarUna(con({ piezas: 0 }))).indexOf('mayor que cero') !== -1, 'piezas en 0');
  ok(error(() => guardarUna(con({ piezas: 2.5 }))).indexOf('entero') !== -1, 'piezas con decimales');
  ok(error(() => guardarUna(con({ espesor: '' }))).indexOf('Faltan el espesor') !== -1,
    'sin espesor no hay código');
  ok(error(() => guardarUna(con({ clase: 'XX' }))).indexOf('Clase de requerimiento desconocida') !== -1,
    'clase inventada');

  ok(guardarUna(TRADING_LISTA).ok,
    'y en cambio uno de Trading se guarda sin ninguna hoja de ruta');

  const antes = SS.getSheetByName('PT').getLastRow();
  error(() => guardarUna(con({ piezas: 0 })));
  ok(SS.getSheetByName('PT').getLastRow() === antes, 'un intento fallido no deja filas a medias');
}

seccion('Del código se deduce todo lo demás');
{
  const bd = leerBD_();
  const deducir = c => deducirDeCodigo_(c, bd);
  const h = deducir('RVMH032X180X3960');
  ok(h.ok && h.origen === 'Trading' && h.centro === 'TCD2',
    'con especie H es Trading y centro TCD2, sin preguntar nada');
  ok(h.clase === 'PT', 'y con largo es producto terminado');
  ok(h.esTerceros === true, 'queda marcado como madera de terceros');

  const proceso = deducir('RVM 032X180');
  ok(proceso.clase === 'PP', 'tres letras y sin largo: producto de proceso');
  ok(proceso.origen === 'Planta' && proceso.centro === 'TCP1', 'y entra por Planta, en TCP1');

  const cepillado = deducir('CSF 019X100');
  ok(cepillado.clase === 'PCP', 'si además es cepillado, va a PCP');

  ok(deducir('RSFR037X130X3600').origen === 'Planta',
    'un código de Radiata EERR no es de terceros: Planta');
  ok(h.familiaConocida && h.agrupacionTexto.indexOf('Médula') !== -1,
    'el texto de la familia sale de la descripción de la propia base');

  const nueva = deducir('RVQR032X180X3960');
  ok(nueva.ok && !nueva.familiaConocida,
    'una familia que todavía no existe se acepta si la nomenclatura la explica');
  ok(nueva.agrupacionTexto === 'Rústico Verde Construcción Radiata EERR',
    'y su texto se arma con el significado de cada carácter');

  const mala = deducir('ZZZZ032X180X3960');
  ok(!mala.ok && mala.mensaje.indexOf('elaboración') !== -1,
    'y una que ni existe ni se explica dice qué carácter no reconoce');
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
  ok(r.filas[0].ok, 'y queda lista sola: lleva H, es de Trading y no pide rutas');

  ok(r.filas[1].clase === 'PP' && r.filas[1].ok === false, 'la segunda es de proceso');
  ok(r.filas[2].problemas[0].indexOf('Ya existe') !== -1, 'la tercera ya existe en la base');
  ok(!r.filas[3].codigo && r.filas[3].problemas[0].indexOf('no existe en BD_Maderas') !== -1,
    'la cuarta no se pudo leer, y dice por qué');
  ok(r.conProblemas === 3 && r.listas === 1, 'el resumen cuenta lo que falta');
}
{
  // Con la ruta pegada al lado, la fila sale lista de una.
  const r = apiLote('RSFR037X130X3200\tRVF 037X130\tRSF 037X130\t248');
  ok(r.filas[0].rutas.aserradero === 'RVF 037X130', 'toma la ruta que viene en la misma línea');
  ok(r.filas[0].rutas.secado === 'RSF 037X130', 'y cada una va a su etapa, sin importar el orden');
  ok(r.filas[0].piezas === '248', 'el número suelto es la cantidad');
  ok(r.filas[0].ok && r.listas === 1, 'la fila queda lista');
}
{
  // Cuando la escuadría tiene una sola ruta por etapa, se pone sola.
  const r = apiLote('C4JR019X100X2440');
  ok(r.filas[0].rutas.cepillado === 'CSF 019X100', 'elige sola la única ruta de cepillado');
  ok(r.filas[0].rutas.aserradero === 'RVF 019X100' && r.filas[0].rutas.secado === 'RSF 019X100',
    'y las de las otras dos etapas');
  ok(r.filas[0].ok, 'así que la fila queda lista sin escribir nada');
}
{
  // Trading no pide ninguna ruta, y la pantalla explica por qué.
  const r = apiLote('RVMH032X180X3960');
  ok(r.filas[0].ok, 'un código de Trading queda listo tal cual');
  ok(r.filas[0].motivos.aserradero.indexOf('Trading') !== -1,
    'y dice que se compra hecha, no que falte algo');
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
  const r = apiLote({ codigos: 'RSJR032X180X3200' });
  ok(r.filas[0].opciones.aserradero.length === 2 && !r.filas[0].rutas.aserradero,
    'con dos rutas posibles no elige ninguna, y la tabla ofrece las dos');
}

seccion('Qué columnas de ruta pide el lote');
{
  const soloTrading = apiLote({ codigos: 'RVMH032X180X3960' });
  ok(!soloTrading.etapasUsadas.aserradero && !soloTrading.etapasUsadas.cepillado,
    'un lote de puro Trading no pide ninguna columna');

  const cepillado = apiLote({ codigos: 'C4JR019X100X2440' });
  ok(cepillado.etapasUsadas.aserradero && cepillado.etapasUsadas.secado &&
     cepillado.etapasUsadas.cepillado, 'uno con un cepillado pide las tres');

  const rustico = apiLote({ codigos: 'RSJR032X180X3200' });
  ok(rustico.etapasUsadas.aserradero && rustico.etapasUsadas.secado &&
     !rustico.etapasUsadas.cepillado, 'y uno rústico y seco pide dos');

  const mezcla = apiLote({ codigos: 'RVMH032X180X3960\nRSJR032X180X3200' });
  ok(mezcla.etapasUsadas.aserradero && !mezcla.etapasUsadas.cepillado,
    'con líneas mezcladas se piden las columnas que necesite alguna');
}

seccion('Revisar el lote después de completar las rutas');
{
  const lote = apiLote('RSJR032X180X3200');
  ok(!lote.filas[0].ok, 'de entrada le falta el aserradero: hay dos rutas posibles');

  lote.filas[0].rutas.aserradero = 'RVM 032X180';
  const revisado = apiRevisarLote(lote.filas);
  ok(revisado.filas[0].ok && revisado.listas === 1, 'con la ruta puesta, la fila queda lista');

  lote.filas[0].rutas.aserradero = 'RSFD032X180';
  ok(apiRevisarLote(lote.filas).filas[0].problemas[0].indexOf('es de secado') !== -1,
    'una ruta de secado en el aserradero se marca');
}

// En el batch input de verdad la escuadría solo baja: RVN 033X250 -> RSN 032X240 ->
// producto 032X240. Nunca al revés: de una tabla de 19 mm no sale una de 32.
seccion('Una ruta no puede ser más chica que el producto');
{
  const lote = apiLote('RSJR032X180X3200');

  lote.filas[0].rutas.aserradero = 'RVM 019X100';
  ok(apiRevisarLote(lote.filas).filas[0].problemas[0].indexOf('más chica que el producto') !== -1,
    'una escuadría por debajo del producto se rechaza');

  lote.filas[0].rutas.aserradero = 'RVM 033X250';
  ok(apiRevisarLote(lote.filas).filas[0].ok, 'y una sobredimensionada pasa sin problema');

  lote.filas[0].rutas.aserradero = 'RVM 032X180';
  ok(apiRevisarLote(lote.filas).filas[0].ok, 'igual que una exacta');

  // El guardado usa el mismo criterio, no solo la revisión.
  ok(error(() => guardarUna(con({ desglose: {
    aserradero: { ruta: 'RVF 019X100' }, secado: { ruta: 'RSF 037X130' }
  } }))).indexOf('más chica que el producto') !== -1,
    'y al guardar tampoco se cuela');
}

// El Excel ya no se baja desde la pantalla: se baja desde el menú del
// spreadsheet, con lo que esté seleccionado en PT, PCP o PP.
seccion('El Excel sale de las filas seleccionadas en la hoja');
{
  const a = guardarUna(con({ largo: '3100' }));
  const b = guardarUna(con({ largo: '3300' }));
  const c = guardarUna(con({ largo: '3500' }));

  SS.__seleccionar('PT', [[a.fila, 1], [c.fila, 1]]);
  const sel = filasSeleccionadas_();
  ok(sel.hoja === 'PT' && sel.filas.length === 2, 'baja solo las filas elegidas, no la de en medio');
  ok(sel.filas[0][22] === '3100' && sel.filas[1][22] === '3500', 'y en el orden de la hoja');
  ok(sel.filas[0].length === 28, 'cada fila llega hasta AB');

  // Los ceros a la izquierda son media nomenclatura: si se pierden, el batch
  // input entra mal a SAP.
  ok(sel.filas[0][8] === '037' && sel.filas[0][9] === '130',
    'los ceros a la izquierda sobreviven a la hoja');
  ok(/^\d{2}\.\d{2}\.\d{4}$/.test(sel.filas[0][4]), 'y la fecha sigue siendo texto dd.mm.aaaa');

  // El formulario escribe hasta Z; AA y AB se llenan a mano y también van.
  SS.getSheetByName('PT').getRange(a.fila, 27, 1, 2)
    .setValues([['Special EN', 'Especial ES']]);
  SS.__seleccionar('PT', [[a.fila, 1]]);
  const conNota = filasSeleccionadas_().filas[0];
  ok(conNota[26] === 'Special EN' && conNota[27] === 'Especial ES',
    'y se lleva las descripciones especiales escritas a mano');

  SS.__seleccionar('PT', [[1, 2]]);
  ok(error(() => filasSeleccionadas_()).indexOf('No hay filas con datos') !== -1,
    'los rótulos de las filas 1 y 2 no se bajan');

  SS.__seleccionar('PT', [[1, 200]]);
  ok(filasSeleccionadas_().filas.length === SS.getSheetByName('PT').getLastRow() - 2,
    'seleccionar la hoja entera baja los datos y nada más');

  SS.__seleccionar('Registro', [[3, 1]]);
  ok(error(() => filasSeleccionadas_()).indexOf('hoja de clase') !== -1,
    'desde una hoja que no es de clase, avisa dónde hay que pararse');

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

  // Excel es mas estricto que los lectores de scripting: pide estilos,
  // propiedades y la dimension declarada, o dice que el formato no es valido.
  const partes = armarXlsx_('X', [['a']], 3).__partes.map(p => p.name);
  ok(partes.slice().sort().join(' ') ===
     '[Content_Types].xml _rels/.rels docProps/app.xml docProps/core.xml ' +
     'xl/_rels/workbook.xml.rels xl/styles.xml xl/workbook.xml xl/worksheets/sheet1.xml',
     'el xlsx lleva las piezas que Excel espera');
  ok(partes[0] === '[Content_Types].xml', 'y [Content_Types].xml va primero en el paquete');

  const uno = p => armarXlsx_('X', [['a', 'b']], 3)
    .__partes.filter(x => x.name === p)[0].bytes.toString('utf8');
  ok(uno('xl/worksheets/sheet1.xml').indexOf('<dimension ref="A3:B3"/>') !== -1,
    'la hoja declara su dimensión');
  ok(uno('xl/worksheets/sheet1.xml').indexOf('<dimension') <
     uno('xl/worksheets/sheet1.xml').indexOf('<sheetData>'),
    'y en el orden que exige el esquema: dimension antes que sheetData');
  ok(uno('xl/styles.xml').indexOf('patternType="gray125"') !== -1,
    'los estilos traen los dos rellenos que Excel da por sentados');
  ok(/<dcterms:created[^>]*>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z</.test(uno('docProps/core.xml')),
    'y las propiedades llevan la fecha en formato W3CDTF');

  const tipos = uno('[Content_Types].xml');
  ok(['/xl/workbook.xml', '/xl/worksheets/sheet1.xml', '/xl/styles.xml',
      '/docProps/core.xml', '/docProps/app.xml']
      .every(n => tipos.indexOf('PartName="' + n + '"') !== -1),
    'cada pieza declara su content-type');

  ok(typeof apiExcelLote === 'undefined',
    'y la pantalla ya no tiene por dónde bajarlo: solo registra');
}

seccion('Guardar el lote completo');
{
  const lote = apiLote([
    'RVMH032X180X3660\t120',
    'RVMH032X180X4270',
    'C4JR019X100X3050\t60'
  ].join('\n'));
  ok(lote.listas === 3, 'las tres líneas quedan listas');

  const r = apiGuardarLote(lote.filas);
  ok(r.guardadas === 3 && r.fallidas === 0, 'se guardan las tres');
  ok(celda('PT', r.resultados[0].fila, 24) === 120, 'la primera lleva su PAK');
  ok(celda('PT', r.resultados[1].fila, 24) === '', 'y la segunda queda sin PAK, que es opcional');
  ok(celda('PT', r.resultados[0].fila, 7) === '' && celda('PT', r.resultados[0].fila, 11) === '',
    'las de Trading van sin ninguna ruta');
  ok(celda('PT', r.resultados[2].fila, 7) === 'RVF' &&
     celda('PT', r.resultados[2].fila, 15) === 'CSF',
    'y la de planta con las suyas, elegidas solas');
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

seccion('instalarRegistro deja la bitácora lista');
{
  const resumen = instalarRegistro();
  ok(resumen.indexOf('Registro') !== -1, 'deja la hoja Registro en orden');
  ok(!SS.getSheetByName('SAP'), 'y no inventa ninguna hoja de catálogo');
}

console.log('\n' + (fallos ? fallos + ' prueba(s) con problemas' : 'Todas las pruebas pasaron'));
process.exit(fallos ? 1 : 0);
