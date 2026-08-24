const fs = require('fs');
const vm = require('vm');
const path = require('path');
const { SS, limpiarCache } = require('./mock');

// Con ARCHIVO_UNICO=1 se prueba el Codigo.gs generado en vez de los fuentes,
// para confirmar que ambos se comportan igual.
const FUENTES = process.env.ARCHIVO_UNICO === '1'
  ? [path.join(__dirname, '..', 'Codigo.gs')]
  : ['Config.gs', 'Registro.gs', 'Setup.gs'].map(f => path.join(__dirname, '..', 'fuente', f));

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

/** Corre algo que debe fallar y devuelve el mensaje de error. */
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

const FILA2 = ['País', 'Centro', 'Clase Requerimiento', 'Tipo Requerimiento',
  'Llegada requerimiento', 'Usuario Solicitante', 'Aserradero(Template)', 'Tamaño Dimensión',
  'EE', 'AA', 'Secado(Template)', 'Tamaño dimensión', 'EE', 'AA', 'Cepillado(Template)',
  'Tamaño dimensión', 'EE', 'AA', 'Empaquetado', 'Tamaño dimensión', 'Espesor', 'Ancho',
  'Largo', 'PAK', 'UMB PZA ó M3', 'Stock/Pedido toda la posicion del ID en consulta',
  'Descripcion Especial EN', 'Descripcion Especial ES'];

const MATERIALES = [
  // El código NO trae la medida; la descripción sí (019X150X4000).
  ['C23H001X006X0013', 'X11000', 'TTAS', 'Cep. 2(C) Seco GR3 Terceros 019X150X4000', 'X'],
  ['C2JR019X075X3960', 'X9000', 'TTAS', 'Cep. 2(C) COL B Radiata 019X075X3960', 'X'],
  // Descripción con sufijo después de la medida.
  ['C2JR019X105X2400', 'X9000', 'TTAS', 'Cep. 2(C) COL B Radiata 019X105X2400 PB', 'X'],
  // Código de 11 caracteres y descripción con la x en minúscula.
  ['C2C 019X075', 'X11000', 'TPAS', 'Cepillado 2(C) Clear 019x075', 'X'],
  ['C24H033X150X3965', 'X11000', 'TTAS', 'Cep. 2(C) GR4 Radiata Ter. 033X150X3965', ''],
  // En la base hay 15 códigos con un espacio duro pegado al final. El señuelo
  // va antes a propósito: contiene al código, pero no es el código.
  ['XRSFR037X130X3600', 'X9000', 'TTAS', 'Señuelo que contiene al código 037X130X3600', 'X'],
  ['RSFR037X130X3600\u00a0', 'X9000', 'TTAS', 'Cep. 2(C) COL B Radiata 037X130X3600', 'X']
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

/** Valor de una columna (por su rótulo de la fila 2) en una fila de PT/PCP/PP. */
function celda(nombreHoja, fila, encabezado) {
  const hoja = SS.getSheetByName(nombreHoja);
  const enc = hoja.getRange(2, 1, 1, hoja.getLastColumn()).getValues()[0];
  const col = enc.findIndex(h => normalizar_(h) === normalizar_(encabezado)) + 1;
  if (!col) throw new Error('No existe la columna ' + encabezado);
  return hoja.getRange(fila, col).getValue();
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
  codigo: 'C2JR019X075X3960', piezas: 120
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
  ok(ctx.clases[1].hoja === 'PCP' && ctx.clases[2].hoja === 'PP', 'cada clase apunta a su hoja');
  ok(ctx.origenes[0].centros.join() === 'TCP1,TCD2', 'Trading elige entre TCP1 y TCD2');
  ok(ctx.origenes[1].centros.join() === 'TCP1', 'Planta tiene un solo centro: TCP1');
  ok(ctx.tiposMaterial.join() === 'TTAS,TPAS', 'tipos de material TTAS y TPAS');
  ok(ctx.largoCodigo === 16, 'el código se valida a 16 caracteres');
  ok(!ctx.hojasFaltantes.length, 'no falta ninguna hoja');
  ok(ctx.porDefecto.PAIS === 'CL' && ctx.porDefecto.TIPO_REQUERIMIENTO === 'No',
    'País CL y Tipo Requerimiento No vienen por defecto');
}

/* --------------------------------------------------------- buscar el código */

seccion('Búsqueda del código en BD_Maderas');
{
  const r = apiBuscarCodigo('c2jr019x075x3960', 'TTAS');
  ok(r.ok && r.encontrado, 'encuentra el código escrito en minúsculas');
  ok(r.codigo === 'C2JR019X075X3960', 'devuelve el código como está en la base');
  ok(r.material.descripcion === 'Cep. 2(C) COL B Radiata 019X075X3960', 'asocia la descripción');
  ok(r.material.grupo === 'X9000', 'asocia el grupo de artículo');
  ok(r.material.espesor === 19 && r.material.ancho === 75 && r.material.largo === 3960,
    'saca espesor, ancho y largo de la medida');
  ok(!r.aviso, 'sin aviso cuando el TpMt coincide');
}
{
  const r = apiBuscarCodigo('C23H001X006X0013', 'TTAS');
  ok(r.material.espesor === 19 && r.material.ancho === 150 && r.material.largo === 4000,
    'la medida sale de la descripción, no de los números del código');
}
{
  const r = apiBuscarCodigo('C2JR019X105X2400', 'TTAS');
  ok(r.material.largo === 2400, 'lee la medida aunque la descripción siga con texto (PB)');
}
{
  const r = apiBuscarCodigo('C24H033X150X3965', 'TPAS');
  ok(r.ok && !!r.aviso, 'avisa (sin bloquear) si el TpMt de la base no es el elegido');
}
{
  const r = apiBuscarCodigo('RSFR037X130X3600', 'TTAS');
  ok(r.encontrado, 'encuentra el código aunque en la base tenga un espacio duro al final');
  ok(r.codigo === 'RSFR037X130X3600', 'y lo devuelve limpio, sin el espacio');
  ok(r.material.largo === 3600, 'con su medida bien leída');
}
{
  const r = apiBuscarCodigo('ZZZZ032X180X3960', 'TTAS');
  ok(!r.encontrado && !r.ok, 'un código que no está en la base no deja seguir');
  ok(r.mensaje.indexOf('BD_Maderas') !== -1, 'el mensaje dice dónde se buscó');
}
{
  const corto = apiBuscarCodigo('C2C 019X075', 'TPAS');
  ok(!corto.ok && corto.mensaje.indexOf('faltan 5') !== -1,
    'con 11 caracteres avisa que faltan 5');
  const largo = apiBuscarCodigo('C2JR019X075X39600', 'TTAS');
  ok(!largo.ok && largo.mensaje.indexOf('sobra 1') !== -1,
    'con 17 caracteres avisa que sobra 1');
  const vacio = apiBuscarCodigo('  ', 'TTAS');
  ok(!vacio.ok, 'un código vacío no pasa');
}
{
  const primera = apiBuscarCodigo('C2JR019X075X3960', 'TTAS');
  const segunda = apiBuscarCodigo('C2JR019X075X3960', 'TTAS');
  ok(segunda.encontrado && segunda.material.grupo === primera.material.grupo,
    'la segunda búsqueda (desde la caché) responde igual que la primera');
}

/* -------------------------------------------------------------- el guardado */

seccion('Guardar en la hoja de la clase');
{
  const r = apiGuardar(SOLICITUD);
  ok(r.ok && r.hoja === 'PT', 'la solicitud PT se guarda en la hoja PT');
  ok(r.fila === 3, 'entra en la fila 3, debajo de los dos encabezados');

  ok(celda('PT', 3, 'País') === 'CL', 'País queda en CL');
  ok(celda('PT', 3, 'Centro') === 'TCD2', 'Centro queda en el elegido (TCD2)');
  ok(celda('PT', 3, 'Clase Requerimiento') === 'PT', 'Clase Requerimiento queda en PT');
  ok(celda('PT', 3, 'Tipo Requerimiento') === 'No', 'Tipo Requerimiento queda en No');
  ok(celda('PT', 3, 'Llegada requerimiento') instanceof Date, 'anota la fecha y hora del ingreso');
  ok(celda('PT', 3, 'Usuario Solicitante') === 'test@masisa.com', 'anota el correo de quien registra');
  ok(celda('PT', 3, 'Espesor') === 19, 'Espesor sale del material');
  ok(celda('PT', 3, 'Ancho') === 75, 'Ancho sale del material');
  ok(celda('PT', 3, 'Largo') === 3960, 'Largo sale del material');
  ok(celda('PT', 3, 'PAK') === 120, 'la cantidad de piezas queda en PAK');
  ok(celda('PT', 3, 'UMB PZA ó M3') === 'PZA', 'la unidad queda en PZA');

  const desglose = ['Aserradero(Template)', 'Secado(Template)', 'Cepillado(Template)', 'Empaquetado'];
  ok(desglose.every(c => celda('PT', 3, c) === ''),
    'las columnas del desglose quedan intactas para completarlas después');
}

seccion('Guardar en la hoja Registro');
{
  ok(registro(1, 'Fecha') === 'Fecha', 'la hoja Registro estrena sus encabezados');
  ok(registro(2, 'Solicitante') === 'test@masisa.com', 'guarda el correo del solicitante');
  ok(registro(2, 'Fecha') instanceof Date, 'guarda la fecha de ingreso');
  ok(registro(2, 'País') === 'CL', 'guarda País CL');
  ok(registro(2, 'Clase Requerimiento') === 'PT', 'guarda la clase elegida');
  ok(registro(2, 'Tipo Requerimiento') === 'No', 'guarda Tipo Requerimiento No');
  ok(registro(2, 'Origen') === 'Trading' && registro(2, 'Centro') === 'TCD2', 'guarda origen y centro');
  ok(registro(2, 'Tipo Material') === 'TTAS', 'guarda el tipo de material');
  ok(registro(2, 'Código') === 'C2JR019X075X3960', 'guarda el código');
  ok(registro(2, 'Descripción Material').indexOf('COL B Radiata') !== -1, 'guarda la descripción asociada');
  ok(registro(2, 'Piezas') === 120, 'guarda la cantidad de piezas');
  ok(registro(2, 'Hoja Destino') === 'PT' && registro(2, 'Fila Destino') === 3,
    'deja la pista de dónde quedó la fila en PT');
}

seccion('Varias solicitudes seguidas');
{
  const r = apiGuardar(con({ codigo: 'C23H001X006X0013', piezas: 5 }));
  ok(r.fila === 4, 'la segunda solicitud PT entra en la fila 4');
  ok(r.filaRegistro === 3, 'y en la fila 3 de Registro');
  ok(celda('PT', 4, 'Largo') === 4000, 'con la medida de su propia descripción');

  const pcp = apiGuardar(con({ clase: 'PCP' }));
  ok(pcp.hoja === 'PCP' && pcp.fila === 3, 'una solicitud PCP se va a la hoja PCP');
  const pp = apiGuardar(con({ clase: 'PP' }));
  ok(pp.hoja === 'PP' && pp.fila === 3, 'una solicitud PP se va a la hoja PP');
  ok(celda('PP', 3, 'Clase Requerimiento') === 'PP', 'y la clase queda escrita en su fila');
}

seccion('Trading elige centro, Planta no');
{
  const r = apiGuardar(con({ origen: 'Planta', centro: 'TCD2' }));
  ok(celda('PT', r.fila, 'Centro') === 'TCP1', 'Planta entra como TCP1 aunque pidan otro centro');

  ok(error(() => apiGuardar(con({ centro: '' }))).indexOf('no corresponde a Trading') !== -1,
    'Trading sin centro no guarda');
  ok(error(() => apiGuardar(con({ centro: 'TCP9' }))).indexOf('no corresponde a Trading') !== -1,
    'Trading con un centro que no existe no guarda');
}

seccion('Lo que no se puede guardar');
{
  ok(error(() => apiGuardar(con({ piezas: 0 }))).indexOf('mayor que cero') !== -1, 'piezas en 0');
  ok(error(() => apiGuardar(con({ piezas: -3 }))).indexOf('mayor que cero') !== -1, 'piezas negativas');
  ok(error(() => apiGuardar(con({ piezas: 2.5 }))).indexOf('entero') !== -1, 'piezas con decimales');
  ok(error(() => apiGuardar(con({ piezas: 'muchas' }))).indexOf('entero') !== -1, 'piezas que no son número');
  ok(error(() => apiGuardar(con({ codigo: 'C2JR019X075' }))).indexOf('faltan 5') !== -1,
    'código de menos de 16 caracteres');
  ok(error(() => apiGuardar(con({ codigo: 'ZZZZ032X180X3960' }))).indexOf('no está en la hoja') !== -1,
    'código que no existe en la base');
  ok(error(() => apiGuardar(con({ clase: 'XX' }))).indexOf('Clase de requerimiento desconocida') !== -1,
    'clase inventada');
  ok(error(() => apiGuardar(con({ origen: 'Bodega' }))).indexOf('Origen desconocido') !== -1,
    'origen inventado');
  ok(error(() => apiGuardar(con({ tipoMaterial: 'TXXX' }))).indexOf('Tipo de material desconocido') !== -1,
    'tipo de material inventado');

  const filasAntes = SS.getSheetByName('PT').getLastRow();
  error(() => apiGuardar(con({ piezas: 0 })));
  ok(SS.getSheetByName('PT').getLastRow() === filasAntes, 'un intento fallido no deja filas a medias');
}

seccion('Sin identidad no hay registro');
{
  global.__USUARIO = '';
  ok(error(() => apiGuardar(SOLICITUD)).indexOf('identificar tu cuenta') !== -1,
    'si Google no entrega el correo, la solicitud no se guarda');
  const ctx = apiContexto();
  ok(!ctx.identificado && ctx.exigeIdentidad, 'y el formulario lo sabe de entrada');
  delete global.__USUARIO;
  ok(apiGuardar(SOLICITUD).ok, 'con el correo de vuelta, se puede guardar otra vez');
}

console.log('\n' + (fallos ? fallos + ' prueba(s) con problemas' : 'Todas las pruebas pasaron'));
process.exit(fallos ? 1 : 0);
