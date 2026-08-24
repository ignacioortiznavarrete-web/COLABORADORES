/**
 * Los dos catálogos que mandan en el formulario, tal como vienen del archivo
 * de Jorge: SAP y Agrupamiento.
 *
 * Se leen SIEMPRE de las hojas del spreadsheet, para que mantenerlos sea
 * pegar filas en Sheets y no tocar código. Las semillas de acá abajo solo se
 * usan una vez, cuando `instalarRegistro` crea las hojas porque no existían.
 */

/**
 * SAP: qué agrupación se puede pedir en cada centro y tipo de material.
 * Columnas: Ce. | TpMt | (vacía) | AgrupMad | Texto Largo ES | Abreviado ES | Abreviado EN.
 * La columna C va vacía porque así viene el archivo original.
 */
const SAP_ENCABEZADOS = ['Ce.', 'TpMt', '', 'AgrupMad', 'Texto Largo Español',
  'Texto Abreviado ES', 'Texto Abreviado EN'];

const SAP_SEMILLA = [
  ['TCD2', 'TTAS', '', 'C4JH', 'Cepillado Seco 4 Caras Col B Radiata Ter', 'Cep.4(C) Seco COL B Radia', 'PINE LUMBER S4S KD COLB'],
  ['TCD2', 'TTAS', '', 'C4KH', 'Cepillado Seco 4 Caras Radiata Terceros', 'Cep.4(C) Seco Mueble Rad', 'PINE LUMBER S4S KD COL'],
  ['TCD2', 'TTAS', '', 'RSKH', 'Rústico Seco Primera Radiata Terceros', 'Rús. Seco Mueble Radiata', 'PINE LUMBER ROUGH KD COL'],
  ['TCD2', 'TTAS', '', 'RSMH', 'Rústico Seco Médula Radiata Terceros', 'Rús. Seco Médula Radiata', 'PINE LUMBER ROUGH KD PITH'],
  ['TCD2', 'TTAS', '', 'RSNH', 'Rústico Seco Mill Run Radiata Terceros', 'Rús. Seco Mill Run Radiat', 'PINE LUMBER RGH KD MILL R'],
  ['TCD2', 'TTAS', '', 'RSWH', 'Rústico Seco Excedente Radiata Terceros', 'Rús. Seco Industrial Radi', 'PINE LUMBER ROUGH KD IND'],
  ['TCD2', 'TTAS', '', 'RSYH', 'Rústico Seco ST Mueble Radiata Terceros', 'Rús. Seco ST Mueble Rad.', 'PINE LUMBER ROUGH KD COL'],
  ['TCD2', 'TTAS', '', 'RVBH', 'Rústico Verde Blue Stain Radiata Tercero', 'Rús. Verde Méd. BS Radiat', 'PINE LUMBER RGH GREEN PI'],
  ['TCD2', 'TTAS', '', 'RVMH', 'Rústico Verde Médula Radiata Terceros', 'Rús. Verde Médula Radiata', 'PINE LUMBER RGH GREEN PIT'],
  ['TCP1', 'TPAS', '', 'CSF', 'Cepillado Seco COL MIX', 'Cepillado Seco COL MIX', ''],
  ['TCP1', 'TPAS', '', 'CSJ', 'Cepillado Seco COL B', 'Cepillado Seco COL B', ''],
  ['TCP1', 'TPAS', '', 'CSK', 'Cepillado Seco Muebles', 'Cepillado Seco Muebles', ''],
  ['TCP1', 'TPAS', '', 'CSM', 'Cepillado Seco Médula', 'Cepillado Seco Médula', ''],
  ['TCP1', 'TPAS', '', 'CSO', 'Cepillado Seco Otros', 'Cepillado Seco Otros', ''],
  ['TCP1', 'TPAS', '', 'CSR', 'Cepillado Seco Rechazo', 'Cepillado Seco Rechazo', ''],
  ['TCP1', 'TPAS', '', 'RSF', 'Rústico Seco COL MIX', 'Rús. Seco COL MIX', ''],
  ['TCP1', 'TPAS', '', 'RSK', 'Rústico Seco Muebles', 'Rústico Seco Muebles', ''],
  ['TCP1', 'TPAS', '', 'RSM', 'Rústico Seco Médula', 'Rústico Seco Médula', ''],
  ['TCP1', 'TPAS', '', 'RSO', 'Rústico Seco Otros', 'Rústico Seco Otros', ''],
  ['TCP1', 'TPAS', '', 'RSZ', 'Rústico Seco Mancha', 'Rústico Seco Mancha', ''],
  ['TCP1', 'TPAS', '', 'RVF', 'Rústico Verde COL MIX', 'Rús. Verde COL MIX', ''],
  ['TCP1', 'TPAS', '', 'RVK', 'Rústico Verde Muebles', 'Rústico Verde Muebles', ''],
  ['TCP1', 'TPAS', '', 'RVM', 'Rústico Verde Médula', 'Rústico Verde Médula', ''],
  ['TCP1', 'TPAS', '', 'RVO', 'Rústico Verde Otros', 'Rústico Verde Otros', ''],
  ['TCP1', 'TPAS', '', 'RVZ', 'Rústico Verde Mancha', 'Rústico Verde Mancha', ''],
  ['TCP1', 'TTAS', '', 'C4JR', 'Cepillado Seco 4 Caras Col B Radiata', 'Cep.4(C) Seco COL B Radia', 'PINE LUMBER S4S KD COL'],
  ['TCP1', 'TTAS', '', 'C4KR', 'Cepillado Seco 4 Caras Muebles Radiata', 'Cep.4(C) Seco Mueble Rad', 'PINE LUMBER S4S KD COL'],
  ['TCP1', 'TTAS', '', 'RSFR', 'Rústico Seco COL MIX Radiata', 'Rús. Seco COL MIX Radiata', 'PINE LUMBER RGH KD COL MI'],
  ['TCP1', 'TTAS', '', 'RSJR', 'Rústico Seco COL B Radiata', 'Rús. Seco COL B Radiata', 'PINE LUMBER ROUGH KD COLB'],
  ['TCP1', 'TTAS', '', 'RSKR', 'Rústico Seco Mueble Radiata', 'Rús. Seco Mueble Radiata', 'PINE LUMBER ROUGH KD COL'],
  ['TCP1', 'TTAS', '', 'RSMR', 'Rústico Seco Médula Radiata', 'Rús. Seco Médula Radiata', 'PINE LUMBER ROUGH KD PITH'],
  ['TCP1', 'TTAS', '', 'RSOR', 'Rústico Seco Otros Radiata', 'Rústico Seco Otro Radiata', 'PINE LUMBER ROUGH KD'],
  ['TCP1', 'TTAS', '', 'RSZR', 'Rústico Seco Mill Run BS Radiata', 'Rús. Seco MR BS Radiata', 'PINE LUMBER RGH KD MILLR']
];

const SAP = { CENTRO: 1, TIPO_MATERIAL: 2, AGRUPACION: 4, TEXTO_LARGO: 5, TEXTO_ES: 6, TEXTO_EN: 7 };

/** Agrupamiento: las plantillas válidas de cada etapa del proceso. */
const AGRUPAMIENTO_ENCABEZADOS = ['Aserradero(Template)', 'Descripción', 'Secado(Template)',
  'Descripción', 'Cepillado(Template)', 'Descripción', 'Empaquetado', 'Descripción'];

const AGRUPAMIENTO_SEMILLA = [
  ['RVF', 'Rústico Verde COL MIX', 'RSF', 'Rústico Seco COL MIX', 'CSF', 'Cepillado Seco COL MIX', 'C4JH', 'Cepillado Seco 4 Caras Col B Radiata Terceros'],
  ['RVK', 'Rústico Verde Muebles', 'RSK', 'Rústico Seco Muebles', 'CSK', 'Cepillado Seco Muebles', 'C4KH', 'Cepillado Seco 4 Caras Radiata Terceros'],
  ['RVM', 'Rústico Verde Médula', 'RSM', 'Rústico Seco Médula', 'CSM', 'Cepillado Seco Médula', 'RSKH', 'Rústico Seco Primera Radiata Terceros'],
  ['RVO', 'Rústico Verde Otros', 'RSO', 'Rústico Seco Otros', 'CSO', 'Cepillado Seco Otros', 'RSMH', 'Rústico Seco Médula Radiata Terceros'],
  ['RVZ', 'Rústico Verde Mancha', 'RSZ', 'Rústico Seco Mancha', 'CSJ', 'Cepillado Seco COL B', 'RSNH', 'Rústico Seco Mill Run Radiata Terceros'],
  ['', '', '', '', 'CSR', 'Cepillado Seco Rechazo', 'RSWH', 'Rústico Seco Excedente Radiata Terceros'],
  ['', '', '', '', '', '', 'RSYH', 'Rústico Seco ST Mueble Radiata Terceros'],
  ['', '', '', '', '', '', 'RVBH', 'Rústico Verde Blue Stain Radiata Tercero'],
  ['', '', '', '', '', '', 'RVMH', 'Rústico Verde Médula Radiata Terceros'],
  ['', '', '', '', '', '', 'C4JR', 'Cepillado Seco 4 Caras Col B Radiata'],
  ['', '', '', '', '', '', 'C4KR', 'Cepillado Seco 4 Caras Muebles Radiata'],
  ['', '', '', '', '', '', 'RSFR', 'Rústico Seco COL MIX Radiata'],
  ['', '', '', '', '', '', 'RSJR', 'Rústico Seco COL B Radiata'],
  ['', '', '', '', '', '', 'RSKR', 'Rústico Seco Mueble Radiata'],
  ['', '', '', '', '', '', 'RSMR', 'Rústico Seco Médula Radiata'],
  ['', '', '', '', '', '', 'RSOR', 'Rústico Seco Otros Radiata'],
  ['', '', '', '', '', '', 'RSZR', 'Rústico Seco Mill Run BS Radiata']
];

/** Par de columnas (código, descripción) de cada etapa en Agrupamiento. */
const ETAPAS = [
  { id: 'aserradero', titulo: 'Aserradero', columna: 1 },
  { id: 'secado', titulo: 'Secado', columna: 3 },
  { id: 'cepillado', titulo: 'Cepillado', columna: 5 }
];

/* ------------------------------------------------------------------ lectura */

/** Filas de SAP: [{ centro, tipoMaterial, agrupacion, textoLargo, textoEs, textoEn }]. */
function catalogoSAP_() {
  return enCache_('sap', function () {
    return filasDe_(CFG.HOJA_SAP, SAP_SEMILLA).map(function (f) {
      return {
        centro: texto_(f[SAP.CENTRO - 1]),
        tipoMaterial: texto_(f[SAP.TIPO_MATERIAL - 1]),
        agrupacion: texto_(f[SAP.AGRUPACION - 1]),
        textoLargo: texto_(f[SAP.TEXTO_LARGO - 1]),
        textoEs: texto_(f[SAP.TEXTO_ES - 1]),
        textoEn: texto_(f[SAP.TEXTO_EN - 1])
      };
    }).filter(function (f) { return f.agrupacion; });
  });
}

/** Plantillas por etapa: { aserradero: [{codigo, descripcion}], secado: [...], ... }. */
function catalogoEtapas_() {
  return enCache_('etapas', function () {
    var filas = filasDe_(CFG.HOJA_AGRUPAMIENTO, AGRUPAMIENTO_SEMILLA);
    var salida = {};
    ETAPAS.forEach(function (etapa) {
      var vistos = {};
      salida[etapa.id] = filas.map(function (f) {
        return { codigo: texto_(f[etapa.columna - 1]), descripcion: texto_(f[etapa.columna]) };
      }).filter(function (o) {
        if (!o.codigo || vistos[o.codigo]) return false;
        vistos[o.codigo] = true;
        return true;
      });
    });
    return salida;
  });
}

/** Agrupaciones que ese centro y ese tipo de material permiten pedir. */
function agrupacionesDe_(centro, tipoMaterial) {
  var c = normalizar_(centro);
  var t = normalizar_(tipoMaterial);
  return catalogoSAP_().filter(function (f) {
    return normalizar_(f.centro) === c && normalizar_(f.tipoMaterial) === t;
  });
}

function agrupacionPorCodigo_(centro, tipoMaterial, codigo) {
  var buscado = normalizar_(codigo);
  var lista = agrupacionesDe_(centro, tipoMaterial);
  for (var i = 0; i < lista.length; i++) {
    if (normalizar_(lista[i].agrupacion) === buscado) return lista[i];
  }
  return null;
}

/* ----------------------------------------------------------------- soporte */

function texto_(v) {
  return String(v == null ? '' : v).trim();
}

/** Lee una hoja de catálogo saltando el encabezado; si no existe, usa la semilla. */
function filasDe_(nombreHoja, semilla) {
  var hoja = ss_().getSheetByName(nombreHoja);
  if (!hoja) return semilla;
  var filas = hoja.getLastRow();
  var columnas = hoja.getLastColumn();
  if (filas < 2 || columnas < 1) return semilla;
  return hoja.getRange(2, 1, filas - 1, columnas).getValues();
}

function enCache_(llave, calcular) {
  var cache = cache_();
  if (cache) {
    var guardado = cache.get('cat:' + llave);
    if (guardado) return JSON.parse(guardado);
  }
  var valor = calcular();
  if (cache) cache.put('cat:' + llave, JSON.stringify(valor), CFG.SEGUNDOS_CACHE);
  return valor;
}

/** Se llama al reinstalar: los catálogos cambiaron y hay que releerlos. */
function olvidarCatalogos_() {
  var cache = cache_();
  if (!cache) return;
  cache.remove('cat:sap');
  cache.remove('cat:etapas');
}
