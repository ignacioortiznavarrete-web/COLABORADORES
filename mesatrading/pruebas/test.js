/**
 * Pruebas de la mesa contra una planilla que imita a la real:
 * los mismos encabezados desprolijos, los mismos formatos de fecha mezclados
 * y los mismos comentarios escritos a mano.
 *
 *   node pruebas/test.js                  (fuentes de fuente/)
 *   ARCHIVO_UNICO=1 node pruebas/test.js  (el Codigo.gs generado)
 */
const { LIBRO, cargarProyecto } = require('./mock');

const cargados = cargarProyecto(['Config.gs', 'Esquema.gs', 'Datos.gs', 'Acciones.gs', 'WebApp.gs']);
console.log('Probando: ' + cargados.join(', ') + '\n');

let fallos = 0;
function ok(cond, msg, detalle) {
  console.log((cond ? '  ✓ ' : '  ✗ ') + msg + (!cond && detalle ? '  →  ' + detalle : ''));
  if (!cond) fallos++;
}
function seccion(t) { console.log('\n' + t); }
function igual(a, b, msg) { ok(a === b, msg, 'esperaba ' + JSON.stringify(b) + ', llegó ' + JSON.stringify(a)); }

/** Fecha relativa a hoy, para que las pruebas de urgencia no caduquen. */
function enDias(dias) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  const p = n => String(n).padStart(2, '0');
  return p(d.getDate()) + '-' + p(d.getMonth() + 1) + '-' + d.getFullYear();
}

// ===========================================================================
// La planilla de prueba
// ===========================================================================

const CAB_BD = [
  'Nombre Solicitante', 'Incoterms2', 'Puerto Destino', 'País Destino', 'Tipo de material',
  'Denominación tipo de mat.', 'Documento de ventas', 'Posición Ped.Venta', 'P.O.',
  'Posición P/InterCompañia', 'Fecha Crea.Ped.Venta', 'Fecha Embarque Comprometida', 'Origen',
  'Material', 'Texto Comercial', 'Ctd.Ped.(m3)', 'Cant-confirm (PAK)', 'Cant-confirm (M3)',
  'Embarcado (PAK)', 'Vol. Embarcado (M3)', 'Por Embarcar (PAK)', 'P.Emb(M3)',
  'Asignado Doc.de venta (PAK)', 'Asignado Doc.de venta (M3)', 'Asignado Centro/Almacen (PAK)',
  'Asignado Centro/Almacen (M3)', 'Centro Stock Asignado', 'Almacen Asig.', 'En Transito (PAK)',
  'Vol. Transito (M3)', 'Por producir (PAK)', 'Vol. Producir (M3)', 'Fecha O.Fabr.', 'O.Fabr',
  'Cen. O.Fabr', 'Fecha O.Prev', 'Orden previsional', 'Centro O.Previsional', 'Estado Pos',
  'Desc. SubFamilia', 'Espesor (mm)', 'Peso Total por Paquete', 'Sobre Asignado', 'Proveedor',
  'Nombre Destinatario de Mercancía', 'Pedido de Traslado', 'Fecha Pedido Tras', '1°Fecha Pos.'
];

/** Una fila de Bd. Los volúmenes van como texto en formato chileno, igual que llegan. */
function filaBd(o) {
  const f = new Array(CAB_BD.length).fill('');
  f[0] = o.cliente || '';
  f[2] = o.puerto || '';
  f[3] = o.pais || '';
  f[6] = o.doc;
  f[7] = o.posicion || 10;
  f[11] = o.embarque || '';
  f[12] = o.origen === undefined ? 'Trading' : o.origen;
  f[13] = o.material;
  f[14] = o.texto || '';
  f[15] = o.pedido || '0';
  f[19] = o.embarcado || '0';
  f[21] = o.porEmbarcar || '0';
  f[29] = o.transito || '0';
  f[31] = o.porProducir || '0';
  f[38] = 'PEND';
  f[44] = o.cliente || '';
  return f;
}

const BD = [
  // Un pedido con dos posiciones: los volúmenes se suman.
  filaBd({ doc: '1100168853', material: 'RSNH022X095X3200', texto: 'Rús. Seco Mill Run Rad. 022X095X3200',
           cliente: 'DONGNAN (CAMBODIA) WOOD CO.', puerto: 'Sihanoukville', pais: 'CAMBOYA',
           embarque: '30-06-2026', pedido: '249,207', embarcado: '100,000', porEmbarcar: '149,207',
           porProducir: '120,000', posicion: 10 }),
  filaBd({ doc: '1100168853', material: 'RSNH022X095X3200', texto: 'Rús. Seco Mill Run Rad. 022X095X3200',
           cliente: 'DONGNAN (CAMBODIA) WOOD CO.', puerto: 'Sihanoukville', pais: 'CAMBOYA',
           embarque: '30-06-2026', pedido: '50,793', embarcado: '0', porEmbarcar: '50,793',
           porProducir: '30,000', posicion: 20 }),

  // Fecha escrita con slash y día de un dígito: la columna del pivot dice "5/08/2026".
  filaBd({ doc: '1100169393', material: 'C4KH019X230X3200', texto: 'Cep.4(C) Seco Mueble Rad 019X230X3200',
           cliente: 'BS WOOD', puerto: 'BUSAN, KOREA', pais: 'KOREA DEL SUR',
           embarque: '5/08/2026', pedido: '37,813', porEmbarcar: '37,813', porProducir: '37,813' }),

  // Embarque encima y sin proveedor.
  filaBd({ doc: '1100170001', material: 'RSZH018X125X3250', texto: 'Rús. Seco MR BS Radiata 018X125X3250',
           cliente: 'CLIENTE URGENTE', puerto: 'CALLAO, PERU', pais: 'PERU',
           embarque: enDias(3), pedido: '80,000', porEmbarcar: '80,000', porProducir: '80,000' }),

  // Cerrado: ya se embarcó todo.
  filaBd({ doc: '1100170002', material: 'C4KH033X230X3960', texto: 'Cep.4(C) Seco Mueble Rad 033X230X3960',
           cliente: 'CLIENTE LISTO', puerto: 'ACAJUTLA', pais: 'EL SALVADOR',
           embarque: enDias(40), pedido: '17,681', embarcado: '17,681', porEmbarcar: '0' }),

  // Fila que NO es de trading: debe quedar fuera.
  filaBd({ doc: '9900000001', material: 'OTRO001', texto: 'Material de otro negocio',
           cliente: 'INTERNO', embarque: enDias(10), pedido: '999,000', porEmbarcar: '999,000',
           origen: 'Nacional' }),

  // Está en Bd pero todavía no en la Hoja Unica.
  filaBd({ doc: '1100170003', material: 'NUEVO001', texto: 'Material recién vendido',
           cliente: 'CLIENTE NUEVO', puerto: 'VALPARAISO', pais: 'CHILE',
           embarque: enDias(60), pedido: '25,500', porEmbarcar: '25,500', porProducir: '25,500' })
];

/** Hoja Unica con los encabezados tal cual están hoy, con "Puerto Destino" repetido. */
const CAB_MESA = ['Hoja', 'PV', 'MAterial', 'Descripcion Material', 'Proveedor',
                  'Comentarios', 'Puerto Destino', 'Puerto Destino'];

const FILAS_MESA = [
  ['Bd', '1100168853', 'RSNH022X095X3200', 'Rús. Seco Mill Run Rad. 022X095X3200',
   'Asermain', 'FIN AGOSTO', 'Sihanoukville', 'Sihanoukville'],
  ['Bd', '1100169393', 'C4KH019X230X3200', 'Cep.4(C) Seco Mueble Rad 019X230X3200',
   'Guivar', '20 julio', 'BUSAN, KOREA', 'BUSAN, KOREA'],
  ['Bd', '1100170001', 'RSZH018X125X3250', 'Rús. Seco MR BS Radiata 018X125X3250',
   '', '', 'CALLAO, PERU', 'CALLAO, PERU'],
  ['Bd', '1100170002', 'C4KH033X230X3960', 'Cep.4(C) Seco Mueble Rad 033X230X3960',
   'Comabio', 'Completa', 'ACAJUTLA', 'ACAJUTLA']
];

function montarPlanilla() {
  const bd = LIBRO.insertSheet('Bd');
  bd.getRange(1, 1, 1, CAB_BD.length).setValues([CAB_BD]);
  bd.getRange(2, 1, BD.length, CAB_BD.length).setValues(BD);

  const mesa = LIBRO.insertSheet('Hoja Unica');
  mesa.getRange(1, 1, 1, CAB_MESA.length).setValues([CAB_MESA]);
  mesa.getRange(2, 1, FILAS_MESA.length, CAB_MESA.length).setValues(FILAS_MESA);

  const prov = LIBRO.insertSheet('Proveedores');
  prov.getRange(1, 1, 1, 4).setValues([['Proveedor', 'Color', 'Estado', 'Nota']]);
  prov.getRange(2, 1, 4, 4).setValues([
    ['Guivar', 'Verde', 'Activo', ''],
    ['Asermain', 'Azul', 'Activo', 'Contacto: Juan'],
    ['Comabio', 'rojoFuerte', 'Activo', ''],
    ['Maderas JC', 'celeste', 'Inactivo', '']
  ]);

  // Tabla dinámica igual que la real: título arriba, fechas en la fila 2.
  const seg = LIBRO.insertSheet('Tabla Seguimiento');
  seg.getRange(1, 1, 1, 3).setValues([['SUM de Vol. Producir (M3)', '', 'Fecha Embarque Comprometida']]);
  seg.getRange(2, 1, 1, 6).setValues([
    ['Material', 'Texto Comercial', '30-06-2026', '5/08/2026', 'Suma total', 'Proveedores']
  ]);
  seg.getRange(3, 1, 2, 5).setValues([
    ['RSNH022X095X3200', 'Rús. Seco Mill Run Rad. 022X095X3200', '150,000', '', '150,000'],
    ['C4KH019X230X3200', 'Cep.4(C) Seco Mueble Rad 019X230X3200', '', '37,813', '37,813']
  ]);
}

montarPlanilla();

// ===========================================================================

seccion('Lectura de números y fechas');
igual(numero_('249,207'), 249.207, 'formato chileno con coma decimal');
igual(numero_('1.983,26'), 1983.26, 'punto de miles y coma decimal');
igual(numero_('1.436'), 1436, 'punto de miles sin decimales');
igual(numero_(''), 0, 'celda vacía vale 0');
igual(formatearNumero_(1436.723), '1.436,72', 'se muestra en formato chileno');

const ref = new Date(2026, 5, 30);
igual(formatearFecha_(interpretarFecha_('5/08/2026').fecha), '05-08-2026', 'día de un dígito con slash');
igual(formatearFecha_(interpretarFecha_('30-06-2026').fecha), '30-06-2026', 'día y mes con guion');
igual(formatearFecha_(interpretarFecha_('2026-06-30').fecha), '30-06-2026', 'formato año primero');
igual(formatearFecha_(interpretarFecha_('20 julio', ref).fecha), '20-07-2026', 'mes escrito en palabras');
igual(formatearFecha_(interpretarFecha_('FIN AGOSTO', ref).fecha), '31-08-2026', '"FIN AGOSTO" es el último día');
igual(interpretarFecha_('FIN AGOSTO', ref).confianza, 'aproximada', '"FIN AGOSTO" queda marcada como aproximada');
igual(formatearFecha_(interpretarFecha_('Negociación ASERMAIN 21 AGOSTO', ref).fecha), '21-08-2026',
  'saca la fecha de un comentario largo');
igual(interpretarFecha_('Completa').fecha, null, '"Completa" no es una fecha');
igual(interpretarFecha_('sin fecha').fecha, null, '"sin fecha" no inventa una fecha');
igual(interpretarFecha_('aserradero').fecha, null, 'un texto cualquiera no es fecha');

// ===========================================================================

seccion('La mesa se arma sin romper la Hoja Unica');
const mesa = datosMesa_();
const hojaMesa = LIBRO.getSheetByName('Hoja Unica');
const cabecerasFinales = hojaMesa.getRange(1, 1, 1, hojaMesa.getLastColumn()).getValues()[0];

igual(cabecerasFinales.length, 12, 'se agregaron las 4 columnas que faltaban');
ok(cabecerasFinales.indexOf('Estado') === 8, 'la columna Estado se agregó al final');
ok(cabecerasFinales.indexOf('Comentarios Compra') === 10, 'Comentarios Compra se agregó como columna nueva');
igual(hojaMesa.getRange(2, 7).getValue(), 'Sihanoukville',
  'la columna 7 conserva su puerto (antes se pisaba con el comentario de compras)');
igual(hojaMesa.getRange(2, 6).getValue(), 'FIN AGOSTO', 'el comentario original queda intacto');

igual(mesa.pedidos.length, 4, 'hay 4 pedidos en la mesa');
ok(!mesa.pedidos.some(p => p.docVenta === '9900000001'), 'la fila que no es de trading queda fuera');
ok(mesa.avisos.some(a => a.tipo === 'nuevos'), 'avisa que hay un pedido de Bd sin bajar');

// ===========================================================================

seccion('Volúmenes y fechas de cada pedido');
const porDoc = {};
mesa.pedidos.forEach(p => { porDoc[p.docVenta] = p; });

const dongnan = porDoc['1100168853'];
igual(Math.round(dongnan.pedidoM3 * 1000) / 1000, 300, 'suma las dos posiciones del pedido');
igual(Math.round(dongnan.porEmbarcarM3 * 1000) / 1000, 200, 'suma lo que falta por embarcar');
igual(dongnan.posiciones, 2, 'cuenta las posiciones de Bd');
igual(dongnan.cliente, 'DONGNAN (CAMBODIA) WOOD CO.',
  'toma el cliente de "Nombre Solicitante" (antes salía vacío)');
igual(dongnan.fechaEmbarque, '30-06-2026', 'toma la fecha de embarque comprometida');

seccion('El comentario en texto se convierte en fecha de compromiso');
igual(dongnan.fechaProveedor, '31-08-2026', '"FIN AGOSTO" se leyó como 31-08-2026');
igual(dongnan.fechaProveedorDesdeComentario, true, 'marca que la fecha vino del comentario');
igual(dongnan.fechaProveedorConfianza, 'aproximada', 'y que es aproximada');
igual(dongnan.desfase, 62, 'el proveedor entrega 62 días después del embarque');
ok(dongnan.alerta && dongnan.alerta.clave === 'desfase', 'se marca como alerta de desfase');

const busan = porDoc['1100169393'];
igual(busan.fechaProveedor, '20-07-2026', '"20 julio" se leyó como 20-07-2026');
igual(busan.fechaEmbarque, '05-08-2026', 'la fecha "5/08/2026" se normalizó');
igual(busan.desfase, -16, 'el proveedor llega 16 días antes del embarque');
ok(!busan.alerta || busan.alerta.clave !== 'desfase',
  'un desfase negativo no se reporta como proveedor atrasado');

seccion('Estados');
igual(dongnan.estado, 'Confirmado', 'con proveedor y fecha queda Confirmado');
igual(porDoc['1100170001'].estado, 'Pendiente', 'sin proveedor queda Pendiente');
igual(porDoc['1100170002'].estado, 'Cerrado', '"Completa" se entiende como Cerrado');
ok(porDoc['1100170001'].alerta && porDoc['1100170001'].alerta.clave === 'sin-proveedor',
  'embarque en 3 días y sin proveedor: pide decisión');
igual(porDoc['1100170002'].alerta, null, 'lo cerrado no aparece en alertas');

seccion('Indicadores y pauta de la reunión');
igual(mesa.kpis.total, 4, 'cuenta los pedidos');
igual(mesa.kpis.enRiesgo, 3, 'tres pedidos requieren decisión');
igual(mesa.kpis.sinProveedor, 1, 'uno está sin proveedor');
ok(mesa.agenda.length >= 2, 'la pauta trae al menos dos grupos');
ok(mesa.agenda.some(g => g.clave === 'desfase'), 'incluye el grupo de proveedor atrasado');
ok(mesa.agenda.some(g => g.clave === 'sin-proveedor'), 'y el de los que hay que asignar');
// Cada pedido con alerta aparece en un solo grupo: la pauta no repite.
const enPauta = mesa.agenda.reduce((n, g) => n + g.pedidos.length, 0);
igual(enPauta, mesa.kpis.enRiesgo, 'cada pedido con alerta aparece una sola vez en la pauta');
ok(mesa.porProveedor.length >= 2, 'el resumen por proveedor tiene filas');

// ===========================================================================

seccion('Guardar un pedido');
const tras = guardarPedido({
  fila: porDoc['1100170001'].fila,
  docVenta: '1100170001',
  material: 'RSZH018X125X3250',
  proveedor: 'Guivar',
  estado: 'Negociación',
  fechaProveedor: 'mediados de septiembre',
  mensaje: 'Guivar cotiza 80 m3, falta confirmar precio.',
  area: 'Compras'
});

const guardado = tras.pedidos.filter(p => p.docVenta === '1100170001')[0];
igual(guardado.proveedor, 'Guivar', 'quedó el proveedor elegido');
igual(guardado.estado, 'Negociación', 'quedó el estado elegido');
igual(guardado.fechaProveedor, '15-09-2026', '"mediados de septiembre" se guardó como 15-09-2026');
igual(guardado.comentarioCompra, 'Guivar cotiza 80 m3, falta confirmar precio.',
  'el mensaje de compras fue a su propia columna');
igual(guardado.comentario, '', 'no tocó el comentario de ventas');
igual(hojaMesa.getRange(porDoc['1100170001'].fila, 7).getValue(), 'CALLAO, PERU',
  'y el puerto de la columna 7 sigue intacto');

const bitacora = LIBRO.getSheetByName('Bitacora');
igual(bitacora.getLastRow(), 2, 'la bitácora tiene una entrada');
igual(bitacora.getRange(2, 5).getValue(), 'Compras', 'guarda el área que habló');
igual(bitacora.getRange(2, 6).getValue(), 'ana@masisa.com', 'guarda quién lo escribió');
igual(guardado.totalMensajes, 1, 'el pedido muestra un mensaje en su hilo');

seccion('Un segundo mensaje se suma, no reemplaza');
guardarPedido({
  fila: guardado.fila, docVenta: '1100170001', material: 'RSZH018X125X3250',
  proveedor: 'Guivar', estado: 'Asignado', fechaProveedor: '15-09-2026',
  mensaje: 'Cliente acepta la fecha.', area: 'Ventas'
});
const conDos = datosMesa_().pedidos.filter(p => p.docVenta === '1100170001')[0];
igual(conDos.totalMensajes, 2, 'ahora hay dos mensajes');
igual(conDos.mensajes[0].mensaje, 'Guivar cotiza 80 m3, falta confirmar precio.',
  'el primero sigue ahí');
igual(conDos.estado, 'Asignado', 'el estado se actualizó');

seccion('Proveedor desconocido');
let error = '';
try {
  guardarPedido({ fila: conDos.fila, docVenta: '1100170001', material: 'RSZH018X125X3250',
                  proveedor: 'Proveedor Fantasma', estado: 'Asignado' });
} catch (e) { error = e.message; }
ok(error.indexOf('no está en la hoja Proveedores') !== -1,
   'no deja asignar un proveedor que no existe');

// ===========================================================================

seccion('Traer pedidos nuevos desde Bd');
const traidos = traerPedidosNuevos();
igual(traidos.nuevos, 1, 'baja el pedido que faltaba');
const trasTraer = datosMesa_();
igual(trasTraer.pedidos.length, 5, 'ahora la mesa tiene 5 pedidos');
const nuevo = trasTraer.pedidos.filter(p => p.docVenta === '1100170003')[0];
igual(nuevo.material, 'NUEVO001', 'con su material');
igual(nuevo.estado, 'Pendiente', 'y nace Pendiente');
igual(traerPedidosNuevos().nuevos, 0, 'llamarlo otra vez no duplica nada');

// ===========================================================================

seccion('Pintado de la tabla de seguimiento');
const seguimiento = sincronizarSeguimiento();
ok(seguimiento.ok, 'la sincronización corre');
igual(seguimiento.celdas, 2, 'pinta las dos celdas que tienen volumen y pedido');

const hojaSeg = LIBRO.getSheetByName('Tabla Seguimiento');
ok(hojaSeg.getRange(3, 3).getBackground() !== '#ffffff',
  'la celda de 30-06-2026 quedó con el color del proveedor');
ok(hojaSeg.getRange(4, 4).getBackground() !== '#ffffff',
  'la columna "5/08/2026" ahora sí calza con la fecha de Bd');
ok(hojaSeg.getRange(3, 3).getNote().indexOf('Asermain') !== -1,
  'la nota dice qué proveedor es');
ok(hojaSeg.getRange(3, 3).getNote().indexOf('62 días tarde') !== -1,
  'y avisa del atraso del proveedor');
igual(hojaSeg.getRange(3, 6).getValue(), 'Asermain', 'la columna Proveedores queda escrita');

// ===========================================================================

seccion('Historial de volumen');
const h1 = registrarHistorial();
ok(h1.registrados > 0, 'la primera vez registra el volumen de cada pedido');
igual(registrarHistorial().registrados, 0, 'si nada cambió, no vuelve a escribir');

// ===========================================================================

seccion('Si ninguna fila dice Trading, la mesa no se queda vacía');
const bd = LIBRO.getSheetByName('Bd');
for (let f = 2; f <= BD.length + 1; f++) bd.getRange(f, 13).setValue('');
const sinOrigen = datosMesa_();
ok(sinOrigen.pedidos.length >= 5, 'sigue mostrando los pedidos');
ok(sinOrigen.avisos.some(a => a.tipo === 'origen'), 'y explica en pantalla por qué');

// ===========================================================================

console.log('\n' + (fallos ? fallos + ' prueba(s) fallaron' : 'Todas las pruebas pasaron'));
process.exit(fallos ? 1 : 0);
