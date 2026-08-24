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

const MATERIALES = [
  ['RVMH032X180X3200', 'X9000', 'TTAS', 'Rús. Verde Médula Radiata 032X180X3200', 'X'],
  ['RVMH032X180X3960', 'X9000', 'TTAS', 'Rús. Verde Médula Radiata 032X180X3960', 'X'],
  ['RVMH032X180X4000', 'X9000', 'TTAS', 'Rús. Verde Médula Radiata 032X180X4000', 'X'],
  ['C4JH019X100X2440', 'X11000', 'TTAS', 'Cep.4(C) Seco COL B Radiata 019X100X2440', 'X'],
  // Producto en proceso: el 4º carácter es un espacio y no lleva largo.
  ['CSF 019X075', 'X11000', 'TPAS', 'Cepillado Seco COL MIX 019x075', 'X'],
  // Señuelo antes del bueno: contiene al código pero no es el código.
  ['XRSFR037X130X3600', 'X9000', 'TTAS', 'Señuelo 037X130X3600', 'X'],
  // En la base hay 15 códigos con un espacio duro pegado al final.
  ['RSFR037X130X3600 ', 'X9000', 'TTAS', 'Rús. Seco COL MIX Radiata 037X130X3600', 'X']
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
  desglose: { aserradero: { plantilla: 'RVM', espesor: '32', ancho: '180' } },
  piezas: 248, umb: 'PZA', stockPedido: 'P'
};

function con(cambios) {
  return Object.assign({}, SOLICITUD, cambios);
}

crearHojasReales();

/* -------------------------------------------------------------- el contexto */

seccion('Contexto que recibe el formulario');
{
  const ctx = apiContexto();
  ok(ctx.clases.length === 3 && ctx.clases[0].id === 'PT', 'ofrece PT, PCP y PP');
  ok(ctx.origenes[0].centros.join() === 'TCP1,TCD2', 'Trading elige entre TCP1 y TCD2');
  ok(ctx.origenes[1].centros.join() === 'TCP1', 'Planta tiene un solo centro: TCP1');
  ok(ctx.etapas.map(e => e.id).join() === 'aserradero,secado,cepillado', 'las tres etapas del proceso');
  ok(ctx.catalogoEtapas.aserradero.length === 5, 'el catálogo trae las 5 plantillas de aserradero');
  ok(ctx.catalogoEtapas.cepillado.length === 6, 'y las 6 de cepillado');
  ok(ctx.porDefecto.TIPO_REQUERIMIENTO === 'NO', 'Tipo Requerimiento va en NO, como el ejemplo');
  ok(!ctx.hojasFaltantes.length, 'no falta ninguna hoja');
}

/* ------------------------------------ la condicional: centro + tipo material */

seccion('Qué agrupaciones habilita cada centro y tipo de material');
{
  const codigos = (c, t) => apiAgrupaciones(c, t).agrupaciones.map(a => a.codigo);

  const tcd2 = codigos('TCD2', 'TTAS');
  ok(tcd2.length === 9, 'TCD2 + TTAS habilita 9 agrupaciones');
  ok(tcd2.indexOf('RVMH') !== -1, 'entre ellas RVMH');
  ok(tcd2.indexOf('CSF') === -1, 'y no las de proceso como CSF');

  const tpas = codigos('TCP1', 'TPAS');
  ok(tpas.length === 16, 'TCP1 + TPAS habilita 16');
  ok(tpas.indexOf('CSF') !== -1 && tpas.indexOf('RVM') !== -1, 'las de proceso, de tres letras');
  ok(tpas.indexOf('RVMH') === -1, 'y no las de terceros');

  const ttas = codigos('TCP1', 'TTAS');
  ok(ttas.length === 8 && ttas.indexOf('RSFR') !== -1, 'TCP1 + TTAS habilita 8, con RSFR');

  ok(codigos('TCD2', 'TPAS').length === 0, 'TCD2 + TPAS no habilita ninguna');
}

seccion('Qué etapas tiene cada producto, leídas del prefijo');
{
  const etapas = c => etapasAplicables_(c);
  ok(etapas('RVMH').aserradero && !etapas('RVMH').secado && !etapas('RVMH').cepillado,
    'RVMH es verde y rústico: solo aserradero');
  ok(etapas('RSFR').secado && !etapas('RSFR').cepillado,
    'RSFR es seco y rústico: aserradero y secado');
  ok(etapas('C4JH').cepillado && etapas('C4JH').secado,
    'C4JH es cepillado: pasa por las tres');
  ok(etapas('CSF').cepillado && etapas('CSF').secado, 'CSF también pasa por las tres');
}

seccion('Cómo se arma el código');
{
  ok(armarCodigo_('RVMH', '032', '180', '3960') === 'RVMH032X180X3960',
    'prefijo de cuatro + medidas = 16 caracteres');
  ok(armarCodigo_('CSF', '019', '075', '') === 'CSF 019X075',
    'prefijo de tres: el 4º lugar es un espacio y sin largo quedan 11');
  ok(rellenar_('32', 3, 'espesor') === '032', 'el espesor se rellena con ceros a la izquierda');
  ok(rellenar_('3960', 4, 'largo') === '3960', 'el largo va con sus cuatro dígitos');
  ok(rellenar_('', 3, 'largo') === '', 'sin valor no se inventa nada');
  ok(error(() => rellenar_('12345', 4, 'largo')).indexOf('más de 4') !== -1,
    'más dígitos de los que caben no pasa');
  ok(error(() => rellenar_('32,5', 3, 'espesor')).indexOf('número entero') !== -1,
    'con coma decimal tampoco');
  const partes = descomponerPrefijo_('RVMH');
  ok(partes[0].significado === 'Rústico' && partes[1].significado === 'Verde' &&
     partes[2].significado === 'Médula' && partes[3].significado === 'Radiata Terceros',
    'cada carácter del prefijo se explica solo');
  ok(descomponerPrefijo_('CSF')[3].significado === 'Producto en proceso',
    'el espacio del 4º lugar significa producto en proceso');
}

/* ------------------------------------------------------ medidas y búsqueda */

seccion('Medidas: arma el código y lo busca en la base');
{
  const r = apiMedidas({ agrupacion: 'RVMH', espesor: '32', ancho: '180', largo: '3960' });
  ok(r.ok && r.encontrado, 'encuentra RVMH032X180X3960');
  ok(r.codigo === 'RVMH032X180X3960', 'arma el código con los ceros puestos');
  ok(r.material.grupo === 'X9000', 'asocia el grupo de artículo');
  ok(r.largos.join() === '3200,3960,4000', 'ofrece los tres largos que existen para esa escuadría');
}
{
  const r = apiMedidas({ agrupacion: 'CSF', espesor: '19', ancho: '75', largo: '' });
  ok(r.encontrado && r.codigo === 'CSF 019X075', 'un producto en proceso se busca sin largo');
  ok(r.largos.length === 0, 'y no ofrece largos porque no tiene');
}
{
  const r = apiMedidas({ agrupacion: 'RSFR', espesor: '37', ancho: '130', largo: '3600' });
  ok(r.encontrado, 'encuentra el código aunque en la base tenga un espacio duro al final');
  ok(r.codigo === 'RSFR037X130X3600', 'y lo deja limpio');
}
{
  const r = apiMedidas({ agrupacion: 'RVMH', espesor: '99', ancho: '999', largo: '9999' });
  ok(!r.ok && !r.encontrado, 'una medida que no existe no deja seguir');
  ok(r.mensaje.indexOf('BD_Maderas') !== -1, 'y el mensaje dice dónde se buscó');
}
{
  ok(apiMedidas({ agrupacion: '', espesor: '32' }).mensaje.indexOf('agrupación') !== -1,
    'sin agrupación no hay nada que armar');
  ok(apiMedidas({ agrupacion: 'RVMH', espesor: 'ab' }).mensaje.indexOf('número entero') !== -1,
    'una medida con letras avisa en vez de romperse');
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
  ok(/^\d{2}\.\d{2}\.\d{4}$/.test(celda('PT', 3, 5)), 'E Llegada requerimiento como texto dd.mm.aaaa');
  ok(celda('PT', 3, 6) === 'test@masisa.com', 'F Usuario Solicitante = el correo');

  ok(celda('PT', 3, 7) === 'RVM', 'G Aserradero(Template)');
  ok(celda('PT', 3, 8) === '032X180', 'H Tamaño Dimensión del aserradero');
  ok(celda('PT', 3, 9) === '032' && celda('PT', 3, 10) === '180', 'I y J: EE y AA del aserradero');

  ok(celda('PT', 3, 11) === '' && celda('PT', 3, 12) === '',
    'K y L vacías: RVMH es verde, no pasa por secado');
  ok(celda('PT', 3, 15) === '' && celda('PT', 3, 16) === '',
    'O y P vacías: es rústico, no pasa por cepillado');

  ok(celda('PT', 3, 19) === 'RVMH', 'S Empaquetado = la agrupación');
  ok(celda('PT', 3, 20) === '032X180X3960', 'T Tamaño dimensión completa');
  ok(celda('PT', 3, 21) === '032', 'U Espesor');
  ok(celda('PT', 3, 22) === '180', 'V Ancho');
  ok(celda('PT', 3, 23) === '3960', 'W Largo');
  ok(celda('PT', 3, 24) === 248, 'X PAK = las piezas');
  ok(celda('PT', 3, 25) === 'PZA', 'Y UMB');
  ok(celda('PT', 3, 26) === 'P', 'Z Stock/Pedido');
  ok(celda('PT', 3, 27) === '' && celda('PT', 3, 28) === '',
    'las descripciones especiales quedan intactas');
}

seccion('Un producto cepillado sí llena las tres etapas');
{
  const r = apiGuardar(con({
    centro: 'TCD2', agrupacion: 'C4JH', espesor: '19', ancho: '100', largo: '2440',
    desglose: {
      aserradero: { plantilla: 'RVF', espesor: '21', ancho: '105' },
      secado: { plantilla: 'RSF', espesor: '20', ancho: '102' },
      cepillado: { plantilla: 'CSF', espesor: '19', ancho: '100' }
    }
  }));
  ok(celda('PT', r.fila, 7) === 'RVF' && celda('PT', r.fila, 8) === '021X105', 'aserradero sobredimensionado');
  ok(celda('PT', r.fila, 11) === 'RSF' && celda('PT', r.fila, 12) === '020X102', 'secado con su medida');
  ok(celda('PT', r.fila, 15) === 'CSF' && celda('PT', r.fila, 16) === '019X100', 'cepillado con la final');
  ok(celda('PT', r.fila, 19) === 'C4JH', 'y el empaquetado es la agrupación pedida');
}

seccion('La bitácora Registro');
{
  ok(registro(1, 'Fecha') === 'Fecha', 'estrena sus encabezados');
  ok(registro(2, 'Solicitante') === 'test@masisa.com', 'guarda el correo');
  ok(registro(2, 'Agrupación') === 'RVMH', 'guarda la agrupación');
  ok(registro(2, 'Descripción Agrupación').indexOf('Médula') !== -1, 'con su texto de SAP');
  ok(registro(2, 'Código') === 'RVMH032X180X3960', 'guarda el código armado');
  ok(registro(2, 'Piezas') === 248, 'guarda las piezas');
  ok(registro(2, 'Aserradero') === 'RVM' && registro(2, 'Secado') === '', 'guarda el desglose');
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

seccion('Trading elige centro, Planta no');
{
  const r = apiGuardar(con({
    origen: 'Planta', centro: 'TCD2', agrupacion: 'RSFR',
    espesor: '37', ancho: '130', largo: '3600',
    desglose: {
      aserradero: { plantilla: 'RVF', espesor: '37', ancho: '130' },
      secado: { plantilla: 'RSF', espesor: '37', ancho: '130' }
    }
  }));
  ok(celda('PT', r.fila, 2) === 'TCP1', 'Planta entra como TCP1 aunque pidan otro centro');
  ok(error(() => apiGuardar(con({ centro: 'TCP9' }))).indexOf('no corresponde a Trading') !== -1,
    'Trading con un centro que no existe no guarda');
}

seccion('Lo que no se puede guardar');
{
  ok(error(() => apiGuardar(con({ centro: 'TCP1' }))).indexOf('no está habilitada') !== -1,
    'RVMH no se puede pedir en TCP1: la hoja SAP no lo permite');
  ok(error(() => apiGuardar(con({ tipoMaterial: 'TPAS' }))).indexOf('no está habilitada') !== -1,
    'ni con el tipo de material cambiado');
  ok(error(() => apiGuardar(con({ agrupacion: 'XXXX' }))).indexOf('no está habilitada') !== -1,
    'una agrupación inventada tampoco');
  ok(error(() => apiGuardar(con({
    desglose: { aserradero: { plantilla: 'ZZZ', espesor: '32', ancho: '180' } }
  }))).indexOf('no está en el catálogo') !== -1, 'una plantilla fuera del catálogo de Agrupamiento');
  ok(error(() => apiGuardar(con({ piezas: 0 }))).indexOf('mayor que cero') !== -1, 'piezas en 0');
  ok(error(() => apiGuardar(con({ piezas: 2.5 }))).indexOf('entero') !== -1, 'piezas con decimales');
  ok(error(() => apiGuardar(con({ largo: '9999' }))).indexOf('no está en la hoja') !== -1,
    'un largo que la base no tiene');
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
  const agr = SS.getSheetByName('Agrupamiento');
  ok(!!sap && sap.getLastRow() === 34, 'crea SAP con sus 33 filas de agrupaciones');
  ok(sap.getRange(1, 4).getValue() === 'AgrupMad', 'con AgrupMad en la columna D, como el archivo original');
  ok(!!agr && agr.getLastRow() === 18, 'y Agrupamiento con las plantillas de cada etapa');
  ok(apiAgrupaciones('TCD2', 'TTAS').agrupaciones.length === 9,
    'y desde ahí en adelante las agrupaciones salen de la hoja');
}

console.log('\n' + (fallos ? fallos + ' prueba(s) con problemas' : 'Todas las pruebas pasaron'));
process.exit(fallos ? 1 : 0);
