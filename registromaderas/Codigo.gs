/**
 * REGISTRO DE MADERAS · formulario de requerimientos — ARCHIVO ÚNICO
 *
 * Generado por fuente/construir.js. No lo edites a mano: edita los archivos
 * de registromaderas/fuente y vuelve a generarlo.
 *
 * Pega este archivo como único Código.gs del proyecto de Apps Script.
 * No necesitas crear los .html: van incrustados más abajo.
 *
 * Después de pegarlo, ejecuta la función `instalarRegistro` una vez.
 */

// ======================================================================
// HTML incrustado (equivalen a los archivos .html)
// ======================================================================

const HTML_ESTILOS = `<style>
  :root {
    --azul: #1f3864;
    --azul-claro: #2d5296;
    --borde: #d8dee9;
    --fondo: #f4f6fa;
    --texto: #1c2430;
    --suave: #5c6b7f;
    --verde: #1e7b45;
    --rojo: #b3261e;
    --ambar: #a56100;
    --radio: 10px;
  }

  * { box-sizing: border-box; }

  body {
    margin: 0;
    padding: 24px 16px 64px;
    background: var(--fondo);
    color: var(--texto);
    font: 15px/1.5 "Segoe UI", Roboto, Arial, sans-serif;
  }

  .wrap { max-width: 780px; margin: 0 auto; }

  header.app {
    background: var(--azul);
    color: #fff;
    border-radius: var(--radio) var(--radio) 0 0;
    padding: 20px 24px;
  }
  header.app h1 { margin: 0; font-size: 20px; font-weight: 600; }
  header.app p { margin: 6px 0 0; font-size: 13px; opacity: .85; }

  .ruta { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 14px; }
  .ruta span {
    font-size: 12px; padding: 4px 10px; border-radius: 999px;
    background: rgba(255,255,255,.15); color: #fff;
  }
  .ruta span.on { background: #fff; color: var(--azul); font-weight: 600; }
  .ruta span.hecho { background: rgba(255,255,255,.35); cursor: pointer; }

  .panel {
    background: #fff;
    border: 1px solid var(--borde);
    border-top: none;
    border-radius: 0 0 var(--radio) var(--radio);
    padding: 22px 24px 26px;
  }

  .paso > h2 {
    margin: 0 0 4px; font-size: 17px; font-weight: 600;
  }
  .paso > p.ayuda { margin: 0 0 18px; font-size: 13px; color: var(--suave); }

  label.campo { display: block; margin-bottom: 14px; }
  label.campo > span.tit { display: block; font-size: 13px; font-weight: 600; margin-bottom: 5px; }

  input[type=text], input[type=number], select {
    width: 100%; padding: 10px 12px; font: inherit; color: inherit;
    border: 1px solid var(--borde); border-radius: 8px; background: #fff;
  }
  input:focus, select:focus {
    outline: none; border-color: var(--azul-claro); box-shadow: 0 0 0 3px rgba(45,82,150,.12);
  }
  input:disabled, select:disabled { background: #eef1f6; color: var(--suave); }

  input#codigo {
    font-family: "Consolas", "Courier New", monospace;
    font-size: 18px; letter-spacing: .09em; text-transform: uppercase;
  }

  /* Opciones grandes (clase, origen, centro, tipo de material). */
  .opciones { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); }
  .opcion {
    display: block; text-align: left; width: 100%; cursor: pointer;
    background: #fff; border: 1px solid var(--borde); border-radius: var(--radio);
    padding: 16px 18px; font: inherit; color: inherit;
  }
  .opcion:hover { border-color: var(--azul-claro); box-shadow: 0 2px 10px rgba(31,56,100,.08); }
  .opcion.sel { border-color: var(--azul); background: #eaf0fa; box-shadow: inset 0 0 0 1px var(--azul); }
  .opcion b { display: block; font-size: 16px; color: var(--azul); }
  .opcion small { display: block; margin-top: 4px; font-size: 12.5px; color: var(--suave); }
  .opciones.chicas .opcion { padding: 12px 14px; }
  .opciones.chicas .opcion b { font-size: 15px; }

  .contador { font-size: 12.5px; color: var(--suave); margin-top: 6px; }
  .contador.listo { color: var(--verde); font-weight: 600; }
  .contador.falta { color: var(--ambar); font-weight: 600; }

  .ficha {
    border: 1px solid var(--borde); border-radius: var(--radio);
    background: #fbfcfe; padding: 14px 16px; margin-top: 14px;
  }
  .ficha h3 { margin: 0 0 10px; font-size: 13px; text-transform: uppercase;
    letter-spacing: .06em; color: var(--suave); }
  .ficha dl { margin: 0; display: grid; grid-template-columns: 170px 1fr; gap: 6px 14px; font-size: 13.5px; }
  .ficha dt { color: var(--suave); }
  .ficha dd { margin: 0; font-weight: 600; }
  @media (max-width: 560px) { .ficha dl { grid-template-columns: 1fr; gap: 2px; } .ficha dd { margin-bottom: 8px; } }

  .aviso { padding: 12px 14px; border-radius: 8px; font-size: 14px; margin-bottom: 16px; }
  .aviso.info { background: #eaf0fa; border: 1px solid #cddbf2; color: var(--azul); }
  .aviso.ok { background: #edf7f1; border: 1px solid #b9e0c9; color: var(--verde); }
  .aviso.error { background: #fdeeed; border: 1px solid #f0c4c1; color: var(--rojo); }
  .aviso.alerta { background: #fdf4e6; border: 1px solid #f0dcb4; color: var(--ambar); }
  .aviso b { display: block; margin-bottom: 2px; }

  button {
    font: inherit; font-weight: 600; border-radius: 8px; padding: 11px 22px;
    border: 1px solid transparent; cursor: pointer;
  }
  button.primario { background: var(--azul); color: #fff; }
  button.primario:hover { background: var(--azul-claro); }
  button.secundario { background: #fff; border-color: var(--borde); color: var(--texto); }
  button:disabled { opacity: .55; cursor: default; }

  .acciones {
    display: flex; gap: 10px; align-items: center; flex-wrap: wrap;
    margin-top: 22px; padding-top: 18px; border-top: 1px solid var(--borde);
  }
  .acciones .derecha { margin-left: auto; }

  .pie { margin-top: 14px; font-size: 12px; color: var(--suave); text-align: right; }
  .cargando { text-align: center; padding: 40px 0; color: var(--suave); }
</style>
`;

const HTML_FORMULARIO = `<!--
  Formulario de registro, paso a paso:
  clase -> origen/centro -> tipo de material -> código -> piezas -> guardar.
-->
<?!= include('Estilos') ?>

<div class="wrap">
  <header class="app">
    <h1>Registro de requerimientos</h1>
    <p id="subtitulo">Cargando…</p>
    <div class="ruta" id="ruta"></div>
  </header>

  <div class="panel">
    <div id="cargando" class="cargando">Cargando formulario…</div>

    <div id="app" style="display:none">
      <div id="mensaje"></div>

      <!-- 1. Clase de requerimiento -->
      <div class="paso" id="paso1" style="display:none">
        <h2>¿Qué vas a registrar?</h2>
        <p class="ayuda">Define en qué hoja queda guardada la solicitud.</p>
        <div class="opciones" id="opcClase"></div>
      </div>

      <!-- 2. Origen y centro -->
      <div class="paso" id="paso2" style="display:none">
        <h2>¿Trading o Planta?</h2>
        <p class="ayuda">Trading elige el centro; Planta queda fijo.</p>
        <div class="opciones" id="opcOrigen"></div>
        <div id="cajaCentro" style="display:none;margin-top:20px">
          <h2 style="font-size:15px;margin:0 0 4px">Centro</h2>
          <p class="ayuda" id="ayudaCentro"></p>
          <div class="opciones chicas" id="opcCentro"></div>
        </div>
      </div>

      <!-- 3. Tipo de material -->
      <div class="paso" id="paso3" style="display:none">
        <h2>Tipo de material</h2>
        <p class="ayuda">Es el TpMt con el que el código figura en la base.</p>
        <div class="opciones chicas" id="opcTipo"></div>
      </div>

      <!-- 4. Código -->
      <div class="paso" id="paso4" style="display:none">
        <h2>Código del material</h2>
        <p class="ayuda" id="ayudaCodigo"></p>
        <label class="campo">
          <span class="tit">Código</span>
          <input type="text" id="codigo" autocomplete="off" spellcheck="false"
                 placeholder="RVMH032X180X3960">
        </label>
        <div class="contador" id="contador"></div>
        <div id="resultadoCodigo"></div>
      </div>

      <!-- 5. Piezas y resumen -->
      <div class="paso" id="paso5" style="display:none">
        <h2>Cantidad de piezas</h2>
        <p class="ayuda">Último dato: revisa el resumen antes de guardar.</p>
        <label class="campo" style="max-width:220px">
          <span class="tit">Piezas</span>
          <input type="number" id="piezas" min="1" step="1" placeholder="0">
        </label>
        <div class="ficha" id="resumen"></div>
      </div>

      <div class="acciones" id="acciones">
        <button type="button" class="secundario" id="btnAtras">Atrás</button>
        <span class="derecha"></span>
        <button type="button" class="primario" id="btnSiguiente">Siguiente</button>
        <button type="button" class="primario" id="btnGuardar" style="display:none">Guardar solicitud</button>
        <span id="guardando" style="display:none;font-size:13px;color:#5c6b7f">Guardando…</span>
      </div>

      <!-- Pantalla de confirmación -->
      <div id="listo" style="display:none"></div>

      <p class="pie" id="pie"></p>
    </div>
  </div>
</div>

<script>
  var CLASE_PREVIA = '<?= clasePrevia ?>';
  var CTX = null;
  var PASO = 1;
  var TOTAL_PASOS = 5;
  var TIMER = null;

  var S = {
    clase: '', origen: '', centro: '', tipoMaterial: '',
    codigo: '', material: null, buscado: false, piezas: ''
  };

  function $(id) { return document.getElementById(id); }

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function aviso(caja, tipo, titulo, texto) {
    if (!titulo && !texto) { caja.innerHTML = ''; return; }
    caja.innerHTML = '<div class="aviso ' + tipo + '">' +
      (titulo ? '<b>' + esc(titulo) + '</b>' : '') + esc(texto || '') + '</div>';
  }

  /* ---------------------------------------------------------- carga inicial */

  function iniciar() {
    google.script.run
      .withSuccessHandler(alCargar)
      .withFailureHandler(errorFatal)
      .apiContexto();
  }

  function errorFatal(err) {
    $('cargando').innerHTML = '<div class="aviso error"><b>No se pudo cargar el formulario</b>' +
      esc(err && err.message ? err.message : err) + '</div>';
  }

  function alCargar(ctx) {
    CTX = ctx;
    $('subtitulo').textContent = 'Se guarda en la hoja de la clase y en ' + ctx.hojaRegistro + '.';
    $('pie').textContent = ctx.usuario ? 'Registrando como ' + ctx.usuario : '';
    $('ayudaCodigo').textContent = (ctx.largoCodigo
      ? 'Son ' + ctx.largoCodigo + ' caracteres. '
      : '') + 'Lo buscamos en la hoja ' + ctx.hojaBD + ' para asociar su descripción.';

    dibujarOpciones();
    $('cargando').style.display = 'none';
    $('app').style.display = '';

    if (ctx.hojasFaltantes && ctx.hojasFaltantes.length) {
      aviso($('mensaje'), 'error', 'Faltan hojas en el spreadsheet: ',
        ctx.hojasFaltantes.join(', ') + '. Avisa a quien administra la planilla.');
      habilitar(false);
      return;
    }
    if (!ctx.identificado && ctx.exigeIdentidad) {
      aviso($('mensaje'), 'error', 'No se pudo identificar tu cuenta. ',
        'No podrás guardar hasta entrar con tu correo corporativo, porque cada solicitud ' +
        'queda registrada a nombre de quien la ingresa.');
      habilitar(false);
      return;
    }
    if (!ctx.autorizado) {
      aviso($('mensaje'), 'error', 'Tu cuenta no está autorizada. ',
        'Pide que te agreguen en ACCESOS (Config.gs).');
      habilitar(false);
      return;
    }

    if (CLASE_PREVIA) {
      elegirClase(CLASE_PREVIA, true);
    } else {
      irA(1);
    }
  }

  function habilitar(activo) {
    $('acciones').style.display = activo ? '' : 'none';
    ['paso1', 'paso2', 'paso3', 'paso4', 'paso5'].forEach(function (id) {
      $(id).style.display = 'none';
    });
  }

  /* -------------------------------------------------------------- opciones */

  function tarjeta(valor, titulo, detalle, seleccionado) {
    return '<button type="button" class="opcion' + (seleccionado ? ' sel' : '') +
      '" data-valor="' + esc(valor) + '"><b>' + esc(titulo) + '</b>' +
      (detalle ? '<small>' + esc(detalle) + '</small>' : '') + '</button>';
  }

  function alClic(contenedor, accion) {
    contenedor.addEventListener('click', function (ev) {
      var boton = ev.target;
      while (boton && boton !== contenedor && !boton.getAttribute('data-valor')) {
        boton = boton.parentNode;
      }
      if (boton && boton !== contenedor) accion(boton.getAttribute('data-valor'));
    });
  }

  function dibujarOpciones() {
    $('opcClase').innerHTML = CTX.clases.map(function (c) {
      return tarjeta(c.id, c.id + ' · ' + c.titulo, c.descripcion + ' Hoja ' + c.hoja + '.', false);
    }).join('');
    alClic($('opcClase'), function (v) { elegirClase(v, false); });

    $('opcOrigen').innerHTML = CTX.origenes.map(function (o) {
      return tarjeta(o.id, o.titulo, o.descripcion, false);
    }).join('');
    alClic($('opcOrigen'), elegirOrigen);

    alClic($('opcCentro'), elegirCentro);

    $('opcTipo').innerHTML = CTX.tiposMaterial.map(function (t) {
      return tarjeta(t, t, '', false);
    }).join('');
    alClic($('opcTipo'), elegirTipo);
  }

  function marcar(contenedor, valor) {
    var botones = contenedor.getElementsByClassName('opcion');
    for (var i = 0; i < botones.length; i++) {
      var esta = botones[i].getAttribute('data-valor') === valor;
      botones[i].className = 'opcion' + (esta ? ' sel' : '');
    }
  }

  function origenPorId(id) {
    for (var i = 0; i < CTX.origenes.length; i++) {
      if (CTX.origenes[i].id === id) return CTX.origenes[i];
    }
    return null;
  }

  function elegirClase(valor, silencioso) {
    S.clase = valor;
    marcar($('opcClase'), valor);
    irA(2);
    if (silencioso) return;
  }

  function elegirOrigen(valor) {
    var origen = origenPorId(valor);
    if (!origen) return;
    S.origen = valor;
    marcar($('opcOrigen'), valor);

    if (origen.centros.length === 1) {
      // Un solo centro posible: se deja puesto y no se pregunta.
      S.centro = origen.centros[0];
      $('cajaCentro').style.display = '';
      $('ayudaCentro').textContent = origen.titulo + ' va siempre a ' + S.centro + '.';
      $('opcCentro').innerHTML = tarjeta(S.centro, S.centro, 'Fijo para ' + origen.titulo, true);
      irA(3);
      return;
    }

    S.centro = '';
    $('cajaCentro').style.display = '';
    $('ayudaCentro').textContent = 'Elige el centro de ' + origen.titulo + '.';
    $('opcCentro').innerHTML = origen.centros.map(function (c) {
      return tarjeta(c, c, '', false);
    }).join('');
    refrescar();
  }

  function elegirCentro(valor) {
    var origen = origenPorId(S.origen);
    if (!origen || origen.centros.indexOf(valor) === -1) return;
    S.centro = valor;
    marcar($('opcCentro'), valor);
    irA(3);
  }

  function elegirTipo(valor) {
    S.tipoMaterial = valor;
    marcar($('opcTipo'), valor);
    irA(4);
    $('codigo').focus();
    if (S.codigo) buscarCodigo();
  }

  /* ---------------------------------------------------------------- código */

  function alEscribirCodigo() {
    var campo = $('codigo');
    var limpio = campo.value.toUpperCase();
    if (limpio !== campo.value) {
      var pos = campo.selectionStart;
      campo.value = limpio;
      try { campo.setSelectionRange(pos, pos); } catch (err) { /* navegador viejo */ }
    }
    S.codigo = limpio.trim();
    S.material = null;
    S.buscado = false;
    $('resultadoCodigo').innerHTML = '';
    dibujarContador();
    refrescar();

    if (TIMER) clearTimeout(TIMER);
    if (!CTX.largoCodigo || S.codigo.length === CTX.largoCodigo) {
      TIMER = setTimeout(buscarCodigo, 250);
    }
  }

  function dibujarContador() {
    if (!CTX.largoCodigo) { $('contador').textContent = ''; return; }
    var n = S.codigo.length;
    var caja = $('contador');
    caja.textContent = n + ' / ' + CTX.largoCodigo + ' caracteres';
    caja.className = 'contador' + (n === CTX.largoCodigo ? ' listo' : (n ? ' falta' : ''));
  }

  function buscarCodigo() {
    if (!S.codigo) return;
    if (CTX.largoCodigo && S.codigo.length !== CTX.largoCodigo) return;
    $('resultadoCodigo').innerHTML = '<div class="aviso info">Buscando en ' +
      esc(CTX.hojaBD) + '…</div>';
    google.script.run
      .withSuccessHandler(alBuscar)
      .withFailureHandler(function (err) {
        aviso($('resultadoCodigo'), 'error', 'No se pudo buscar el código. ',
          err && err.message ? err.message : err);
      })
      .apiBuscarCodigo(S.codigo, S.tipoMaterial);
  }

  function alBuscar(r) {
    // Si llegó tarde y el código ya cambió, esta respuesta ya no sirve.
    if (String(r.codigo).toUpperCase() !== S.codigo.toUpperCase()) return;
    S.buscado = true;

    if (!r.encontrado) {
      S.material = null;
      aviso($('resultadoCodigo'), CTX.exigeCodigoEnBD ? 'error' : 'alerta',
        r.mensaje, CTX.exigeCodigoEnBD
          ? 'Revisa el código: solo se pueden registrar códigos que existan en la base.'
          : 'Puedes seguir, pero la solicitud quedará sin descripción asociada.');
      refrescar();
      return;
    }

    S.material = r.material;
    S.codigo = r.codigo;
    $('codigo').value = r.codigo;
    dibujarContador();

    var m = r.material;
    var medida = [m.espesor, m.ancho, m.largo].filter(function (x) { return x !== '' && x != null; });
    $('resultadoCodigo').innerHTML =
      (r.aviso ? '<div class="aviso alerta">' + esc(r.aviso) + '</div>' : '') +
      '<div class="ficha"><h3>Material encontrado</h3><dl>' +
      '<dt>Descripción</dt><dd>' + esc(m.descripcion || '—') + '</dd>' +
      '<dt>Grupo artículo</dt><dd>' + esc(m.grupo || '—') + '</dd>' +
      '<dt>TpMt en la base</dt><dd>' + esc(m.tipoMaterial || '—') + '</dd>' +
      '<dt>Ce</dt><dd>' + esc(m.ce || '—') + '</dd>' +
      '<dt>Espesor · Ancho · Largo</dt><dd>' + esc(medida.length ? medida.join(' · ') : '—') + '</dd>' +
      '</dl></div>';
    refrescar();
  }

  /* --------------------------------------------------------------- resumen */

  function fila(rotulo, valor) {
    return '<dt>' + esc(rotulo) + '</dt><dd>' + esc(valor == null || valor === '' ? '—' : valor) + '</dd>';
  }

  function dibujarResumen() {
    var m = S.material || {};
    var medida = [m.espesor, m.ancho, m.largo].filter(function (x) { return x !== '' && x != null; });
    var clase = null;
    for (var i = 0; i < CTX.clases.length; i++) {
      if (CTX.clases[i].id === S.clase) clase = CTX.clases[i];
    }
    $('resumen').innerHTML = '<h3>Resumen</h3><dl>' +
      fila('Clase requerimiento', S.clase + (clase ? ' · ' + clase.titulo : '')) +
      fila('Hoja de destino', clase ? clase.hoja : '') +
      fila('Origen', S.origen) +
      fila('Centro', S.centro) +
      fila('Tipo de material', S.tipoMaterial) +
      fila('Código', S.codigo) +
      fila('Descripción', m.descripcion) +
      fila('Grupo artículo', m.grupo) +
      fila('Espesor · Ancho · Largo', medida.join(' · ')) +
      fila('Piezas', S.piezas) +
      '</dl><h3 style="margin-top:14px">Se completa solo</h3><dl>' +
      fila('País', CTX.porDefecto.PAIS) +
      fila('Tipo requerimiento', CTX.porDefecto.TIPO_REQUERIMIENTO) +
      fila('Llegada requerimiento', 'fecha y hora al guardar') +
      fila('Usuario solicitante', CTX.usuario || 'tu correo') +
      '</dl>';
  }

  /* ------------------------------------------------------------- navegación */

  function pasoCompleto(n) {
    if (n === 1) return !!S.clase;
    if (n === 2) return !!S.origen && !!S.centro;
    if (n === 3) return !!S.tipoMaterial;
    if (n === 4) {
      if (!S.codigo) return false;
      if (CTX.largoCodigo && S.codigo.length !== CTX.largoCodigo) return false;
      if (!S.buscado) return false;
      return CTX.exigeCodigoEnBD ? !!S.material : true;
    }
    if (n === 5) return Number(S.piezas) > 0;
    return false;
  }

  function irA(n) {
    if (n > 1 && !pasoCompleto(n - 1)) return;
    PASO = Math.min(Math.max(n, 1), TOTAL_PASOS);
    for (var i = 1; i <= TOTAL_PASOS; i++) {
      $('paso' + i).style.display = (i === PASO) ? '' : 'none';
    }
    if (PASO === 5) dibujarResumen();
    refrescar();
    if (PASO === 4) $('codigo').focus();
    if (PASO === 5) $('piezas').focus();
  }

  function dibujarRuta() {
    var nombres = ['Clase', 'Origen', 'Material', 'Código', 'Piezas'];
    $('ruta').innerHTML = nombres.map(function (nombre, i) {
      var n = i + 1;
      var cls = (n === PASO) ? 'on' : (n < PASO ? 'hecho' : '');
      return '<span class="' + cls + '" data-paso="' + n + '">' + n + '. ' + esc(nombre) + '</span>';
    }).join('');
  }

  function refrescar() {
    dibujarRuta();
    $('btnAtras').style.display = PASO > 1 ? '' : 'none';
    $('btnSiguiente').style.display = PASO < TOTAL_PASOS ? '' : 'none';
    $('btnGuardar').style.display = PASO === TOTAL_PASOS ? '' : 'none';
    $('btnSiguiente').disabled = !pasoCompleto(PASO);
    $('btnGuardar').disabled = !pasoCompleto(TOTAL_PASOS);
  }

  /* --------------------------------------------------------------- guardar */

  function guardar() {
    if (!pasoCompleto(5)) return;
    $('btnGuardar').disabled = true;
    $('btnAtras').disabled = true;
    $('guardando').style.display = '';
    aviso($('mensaje'), '', '', '');

    google.script.run
      .withSuccessHandler(alGuardar)
      .withFailureHandler(function (err) {
        $('guardando').style.display = 'none';
        $('btnAtras').disabled = false;
        refrescar();
        aviso($('mensaje'), 'error', 'No se pudo guardar. ',
          err && err.message ? err.message : err);
        window.scrollTo(0, 0);
      })
      .apiGuardar({
        clase: S.clase,
        origen: S.origen,
        centro: S.centro,
        tipoMaterial: S.tipoMaterial,
        codigo: S.codigo,
        piezas: Number(S.piezas)
      });
  }

  function alGuardar(r) {
    $('guardando').style.display = 'none';
    $('btnAtras').disabled = false;
    $('acciones').style.display = 'none';
    $('paso5').style.display = 'none';
    aviso($('mensaje'), '', '', '');

    $('listo').style.display = '';
    $('listo').innerHTML =
      '<div class="aviso ok"><b>Solicitud registrada</b>' +
      esc(r.codigo) + ' · ' + esc(r.piezas) + ' piezas · ' + esc(r.fecha) + '</div>' +
      '<div class="ficha"><h3>Dónde quedó</h3><dl>' +
      fila('Hoja ' + r.hoja, 'fila ' + r.fila) +
      fila('Hoja ' + r.hojaRegistro, 'fila ' + r.filaRegistro) +
      fila('Solicitante', r.solicitante) +
      '</dl></div>' +
      '<div class="acciones">' +
      '<button type="button" class="primario" id="btnOtro">Registrar otro código</button>' +
      '<button type="button" class="secundario" id="btnNuevo">Empezar de nuevo</button>' +
      '</div>';

    $('btnOtro').addEventListener('click', function () { reiniciar(true); });
    $('btnNuevo').addEventListener('click', function () { reiniciar(false); });
    window.scrollTo(0, 0);
  }

  /** Deja el formulario listo para otra solicitud. */
  function reiniciar(conservarCabecera) {
    S.codigo = '';
    S.material = null;
    S.buscado = false;
    S.piezas = '';
    $('codigo').value = '';
    $('piezas').value = '';
    $('resultadoCodigo').innerHTML = '';
    dibujarContador();

    $('listo').style.display = 'none';
    $('listo').innerHTML = '';
    $('acciones').style.display = '';

    if (!conservarCabecera) {
      S.clase = '';
      S.origen = '';
      S.centro = '';
      S.tipoMaterial = '';
      marcar($('opcClase'), '');
      marcar($('opcOrigen'), '');
      marcar($('opcTipo'), '');
      $('cajaCentro').style.display = 'none';
      irA(1);
      return;
    }
    irA(4);
  }

  /* ----------------------------------------------------------------- eventos */

  $('btnAtras').addEventListener('click', function () { irA(PASO - 1); });
  $('btnSiguiente').addEventListener('click', function () { irA(PASO + 1); });
  $('btnGuardar').addEventListener('click', guardar);
  $('codigo').addEventListener('input', alEscribirCodigo);
  $('codigo').addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter' && pasoCompleto(4)) irA(5);
  });
  $('piezas').addEventListener('input', function () {
    S.piezas = $('piezas').value;
    dibujarResumen();
    refrescar();
  });
  $('ruta').addEventListener('click', function (ev) {
    var n = Number(ev.target.getAttribute('data-paso'));
    if (n && n < PASO) irA(n);
  });

  iniciar();
</script>
`;

const HTML_PARCIALES = {
  Estilos: HTML_ESTILOS,
  Formulario: HTML_FORMULARIO
};

// ======================================================================
// Config.gs
// ======================================================================

/**
 * REGISTRO DE MADERAS — formulario de ingreso de requerimientos.
 * Spreadsheet: Maderas (15THGajqCDH0YuBaoEUt9uLM8s-6iKsUf9_-vY8bABmE).
 *
 * El formulario pregunta en este orden:
 *
 *   1. Clase de requerimiento : PT | PCP | PP   -> define la hoja de destino.
 *   2. Origen                 : Trading | Planta
 *                               Trading elige centro (TCP1 o TCD2);
 *                               Planta queda fijo en TCP1.
 *   3. Tipo de material       : TTAS | TPAS
 *   4. Código de material     : 16 caracteres, se busca en BD_Maderas y se
 *                               asocian descripción, grupo y dimensiones.
 *   5. Cantidad de piezas.
 *
 * Al guardar se escriben DOS filas:
 *   - una en la hoja de la clase (PT, PCP o PP), respetando sus columnas;
 *   - una en la hoja Registro, que es la bitácora de quién pidió qué y cuándo.
 *
 * Lo que se completa solo, sin preguntarlo:
 *   País = CL · Tipo Requerimiento = No · Clase Requerimiento = la elegida ·
 *   Llegada requerimiento = fecha y hora del ingreso · Usuario Solicitante =
 *   correo de quien está usando el formulario.
 */

const CFG = {
  SPREADSHEET_ID: '15THGajqCDH0YuBaoEUt9uLM8s-6iKsUf9_-vY8bABmE',

  HOJA_BD: 'BD_Maderas',
  HOJA_REGISTRO: 'Registro',

  /** En PT/PCP/PP la fila 1 es la numeración y la fila 2 son los rótulos. */
  FILA_ENCABEZADOS: 2,
  PRIMERA_FILA_DATOS: 3,

  SEGUNDOS_LOCK: 30,
  /** Cuánto se recuerda una búsqueda en BD_Maderas (son ~42.000 filas). */
  SEGUNDOS_CACHE: 21600
};

/** Las tres clases de requerimiento y la hoja donde cae cada una. */
const CLASES = [
  {
    id: 'PT',
    hoja: 'PT',
    titulo: 'Producto Terminado',
    descripcion: 'Producto listo para despacho.'
  },
  {
    id: 'PCP',
    hoja: 'PCP',
    titulo: 'Producto Cepillado Proceso',
    descripcion: 'Cepillado que sigue en proceso.'
  },
  {
    id: 'PP',
    hoja: 'PP',
    titulo: 'Producto de Proceso',
    descripcion: 'Material en proceso.'
  }
];

/**
 * Origen del requerimiento y centros habilitados en cada uno.
 * Si un origen tiene un solo centro, el formulario lo deja fijo y no pregunta:
 * por eso Planta entra siempre como TCP1.
 */
const ORIGENES = [
  { id: 'Trading', titulo: 'Trading', descripcion: 'Elige el centro.', centros: ['TCP1', 'TCD2'] },
  { id: 'Planta', titulo: 'Planta', descripcion: 'Centro fijo TCP1.', centros: ['TCP1'] }
];

const TIPOS_MATERIAL = ['TTAS', 'TPAS'];

const CODIGO = {
  /** Largo exacto exigido al código. Pon 0 para no validar el largo. */
  LARGO: 16,
  /** El código debe existir en BD_Maderas para poder guardar. */
  EXIGIR_EN_BD: true,
  /**
   * Si el TpMt del código en BD no coincide con el tipo de material elegido:
   * true bloquea el guardado, false solo avisa.
   */
  EXIGIR_TIPO_MATERIAL: false
};

/** Valores que se escriben siempre igual, sin preguntarlos. */
const POR_DEFECTO = {
  PAIS: 'CL',
  TIPO_REQUERIMIENTO: 'No',
  UMB: 'PZA'
};

/** Columnas de BD_Maderas (Material | Grupo art. | TpMt | Texto breve | Ce). */
const BD = {
  MATERIAL: 1,
  GRUPO: 2,
  TIPO_MATERIAL: 3,
  DESCRIPCION: 4,
  CE: 5,
  COLUMNAS: 5
};

/**
 * Qué dato del formulario va en cada columna de PT/PCP/PP.
 *
 *   clave  = encabezado EXACTO de la fila 2 de la hoja (se compara sin
 *            distinguir mayúsculas ni acentos).
 *   valor  = dato calculado en `datosParaHoja_` (Registro.gs).
 *
 * Las columnas que no aparecen aquí NO se tocan: quedan vacías para que las
 * complete el desglose. Cuando definas las asociaciones del código (aserradero,
 * secado, cepillado, empaquetado), agrégalas como líneas nuevas en este mapa.
 *
 * Nota: `PAK` recibe la cantidad de piezas por ser la única columna de conteo
 * de la hoja. Si en tu operación PAK significa otra cosa, borra esa línea: la
 * cantidad igual queda guardada en la hoja Registro.
 */
const MAPEO_DESTINO = {
  'País': 'pais',
  'Centro': 'centro',
  'Clase Requerimiento': 'clase',
  'Tipo Requerimiento': 'tipoRequerimiento',
  'Llegada requerimiento': 'fecha',
  'Usuario Solicitante': 'solicitante',
  'Espesor': 'espesor',
  'Ancho': 'ancho',
  'Largo': 'largo',
  'PAK': 'piezas',
  'UMB PZA ó M3': 'umb'
};

/** Columna de la hoja de destino que lleva la fecha (para darle formato). */
const COL_FECHA_DESTINO = 'Llegada requerimiento';

/** Encabezados de la hoja Registro. Se crean solos la primera vez. */
const COL_REGISTRO = [
  'Fecha', 'Solicitante', 'País', 'Clase Requerimiento', 'Tipo Requerimiento',
  'Origen', 'Centro', 'Tipo Material', 'Código', 'Descripción Material',
  'Grupo Artículo', 'Piezas', 'UMB', 'Espesor', 'Ancho', 'Largo',
  'Hoja Destino', 'Fila Destino'
];

/**
 * Registro de quién ingresa cada solicitud.
 *
 * El correo sale de Session.getActiveUser(): con la aplicación web publicada
 * como "Ejecutar como: Yo" y acceso limitado a tu dominio, Google entrega el
 * correo real de quien está usando el formulario.
 *
 * EXIGIR_IDENTIDAD: si Google no logra identificar la cuenta, el guardado se
 *   bloquea en vez de anotar una solicitud sin solicitante.
 */
const AUDITORIA = {
  EXIGIR_IDENTIDAD: true
};

/** Correos autorizados. Arreglo vacío = cualquiera con el enlace. */
const ACCESOS = [];

/* --------------------------------------------------------------- utilidades */

/** Compara encabezados sin distinguir mayúsculas, acentos ni espacios de más. */
function normalizar_(texto) {
  return String(texto == null ? '' : texto)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[áàä]/g, 'a').replace(/[éèë]/g, 'e').replace(/[íìï]/g, 'i')
    .replace(/[óòö]/g, 'o').replace(/[úùü]/g, 'u').replace(/ñ/g, 'n');
}

function clasePorId_(id) {
  var buscado = normalizar_(id);
  for (var i = 0; i < CLASES.length; i++) {
    if (normalizar_(CLASES[i].id) === buscado) return CLASES[i];
  }
  throw new Error('Clase de requerimiento desconocida: ' + id);
}

function origenPorId_(id) {
  var buscado = normalizar_(id);
  for (var i = 0; i < ORIGENES.length; i++) {
    if (normalizar_(ORIGENES[i].id) === buscado) return ORIGENES[i];
  }
  throw new Error('Origen desconocido: ' + id);
}

/** Centro válido para el origen. Si el origen tiene uno solo, ese manda. */
function centroEfectivo_(origen, centroPedido) {
  if (origen.centros.length === 1) return origen.centros[0];
  var buscado = normalizar_(centroPedido);
  for (var i = 0; i < origen.centros.length; i++) {
    if (normalizar_(origen.centros[i]) === buscado) return origen.centros[i];
  }
  throw new Error('El centro "' + (centroPedido || '') + '" no corresponde a ' + origen.titulo +
    '. Opciones: ' + origen.centros.join(', ') + '.');
}

function tipoMaterialEfectivo_(pedido) {
  var buscado = normalizar_(pedido);
  for (var i = 0; i < TIPOS_MATERIAL.length; i++) {
    if (normalizar_(TIPOS_MATERIAL[i]) === buscado) return TIPOS_MATERIAL[i];
  }
  throw new Error('Tipo de material desconocido: ' + pedido + '. Opciones: ' + TIPOS_MATERIAL.join(', ') + '.');
}

// ======================================================================
// Registro.gs
// ======================================================================

/**
 * Lógica del registro: buscar el código en BD_Maderas, validar lo que llega
 * del formulario y escribir en la hoja de la clase (PT/PCP/PP) + Registro.
 *
 * Todo lo que el formulario manda se vuelve a validar aquí: el navegador
 * ayuda, pero no decide.
 */

/* ------------------------------------------------------------------ hojas */

function ss_() {
  return SpreadsheetApp.openById(CFG.SPREADSHEET_ID);
}

function hoja_(nombre) {
  var hoja = ss_().getSheetByName(nombre);
  if (!hoja) throw new Error('Falta la hoja "' + nombre + '" en el spreadsheet.');
  return hoja;
}

/** La hoja Registro se crea sola si no existe: es la bitácora del formulario. */
function hojaRegistro_() {
  var libro = ss_();
  var hoja = libro.getSheetByName(CFG.HOJA_REGISTRO);
  if (!hoja) hoja = libro.insertSheet(CFG.HOJA_REGISTRO);
  return hoja;
}

/** Encabezados de una hoja de clase: están en la fila 2, no en la 1. */
function encabezadosDestino_(hoja) {
  var ancho = Math.max(hoja.getLastColumn(), 1);
  return hoja.getRange(CFG.FILA_ENCABEZADOS, 1, 1, ancho).getValues()[0];
}

/** { encabezado normalizado -> número de columna } de una hoja de clase. */
function indicePorEncabezado_(hoja) {
  var indices = {};
  encabezadosDestino_(hoja).forEach(function (titulo, i) {
    var clave = normalizar_(titulo);
    if (clave && !indices[clave]) indices[clave] = i + 1;
  });
  return indices;
}

/* --------------------------------------------------------------- identidad */

function usuario_() {
  try {
    return String(Session.getActiveUser().getEmail() || '').trim();
  } catch (err) {
    return '';
  }
}

function puedeAcceder_(correo) {
  if (!ACCESOS.length) return true;
  var buscado = normalizar_(correo);
  if (!buscado) return false;
  for (var i = 0; i < ACCESOS.length; i++) {
    if (normalizar_(ACCESOS[i]) === buscado) return true;
  }
  return false;
}

/* ----------------------------------------------------------------- código */

function normalizarCodigo_(codigo) {
  return String(codigo == null ? '' : codigo).trim().toUpperCase();
}

/** Devuelve el problema de largo, o '' si el código mide lo que debe. */
function problemaDeLargo_(codigo) {
  if (!codigo) return 'Escribe el código del material.';
  if (!CODIGO.LARGO) return '';
  var faltan = CODIGO.LARGO - codigo.length;
  if (faltan > 0) {
    return 'El código debe tener ' + CODIGO.LARGO + ' caracteres: te ' +
      (faltan === 1 ? 'falta 1' : 'faltan ' + faltan) + '.';
  }
  if (faltan < 0) {
    var sobran = -faltan;
    return 'El código debe tener ' + CODIGO.LARGO + ' caracteres: te ' +
      (sobran === 1 ? 'sobra 1' : 'sobran ' + sobran) + '.';
  }
  return '';
}

/**
 * Espesor, ancho y largo escritos dentro de un texto (032X180X3960).
 * Devuelve null si no hay ninguna medida reconocible.
 */
function dimensiones_(texto) {
  var s = String(texto == null ? '' : texto).toUpperCase();
  var m, ultimo = null;

  var tres = /(\d{2,4})\s*X\s*(\d{2,4})\s*X\s*(\d{3,5})/g;
  while ((m = tres.exec(s)) !== null) ultimo = m;
  if (ultimo) {
    return { espesor: Number(ultimo[1]), ancho: Number(ultimo[2]), largo: Number(ultimo[3]) };
  }

  var dos = /(\d{2,4})\s*X\s*(\d{2,4})/g;
  while ((m = dos.exec(s)) !== null) ultimo = m;
  if (ultimo) {
    return { espesor: Number(ultimo[1]), ancho: Number(ultimo[2]), largo: '' };
  }
  return null;
}

/**
 * La descripción de BD manda sobre el código: en códigos como
 * C23H001X006X0013 los números NO son la medida, y la descripción sí la trae.
 */
function dimensionesDe_(descripcion, codigo) {
  var deTexto = dimensiones_(descripcion);
  if (deTexto && deTexto.largo !== '') return deTexto;
  var deCodigo = dimensiones_(codigo);
  if (deCodigo && deCodigo.largo !== '') return deCodigo;
  return deTexto || deCodigo || { espesor: '', ancho: '', largo: '' };
}

/**
 * Busca el código en la columna Material de BD_Maderas.
 *
 * Son ~42.000 filas: se usa createTextFinder (busca en el servidor, sin traer
 * la planilla completa) y se recuerda el resultado un rato en caché.
 */
function buscarEnBD_(codigo) {
  var cache = cache_();
  var llave = 'bd:' + codigo;
  if (cache) {
    var guardado = cache.get(llave);
    if (guardado) {
      var previo = JSON.parse(guardado);
      return previo.vacio ? null : previo;
    }
  }

  var ficha = leerDeBD_(codigo);
  if (cache) {
    cache.put(llave, JSON.stringify(ficha || { vacio: true }), CFG.SEGUNDOS_CACHE);
  }
  return ficha;
}

function leerDeBD_(codigo) {
  var hoja = hoja_(CFG.HOJA_BD);
  var ultima = hoja.getLastRow();
  if (ultima < 2) return null;

  var rango = hoja.getRange(2, BD.MATERIAL, ultima - 1, 1);
  var celda = rango.createTextFinder(codigo).matchEntireCell(true).findNext();
  if (!celda) celda = buscarConEspacios_(rango, codigo);
  if (!celda) return null;

  var fila = celda.getRow();
  var valores = hoja.getRange(fila, 1, 1, BD.COLUMNAS).getValues()[0];
  var descripcion = String(valores[BD.DESCRIPCION - 1] || '').trim();
  var material = String(valores[BD.MATERIAL - 1] || '').trim();
  var medidas = dimensionesDe_(descripcion, material);

  return {
    fila: fila,
    codigo: material,
    grupo: String(valores[BD.GRUPO - 1] || '').trim(),
    tipoMaterial: String(valores[BD.TIPO_MATERIAL - 1] || '').trim(),
    descripcion: descripcion,
    ce: String(valores[BD.CE - 1] || '').trim(),
    espesor: medidas.espesor,
    ancho: medidas.ancho,
    largo: medidas.largo
  };
}

/**
 * Rescate para los códigos que en la base traen espacios pegados: hay varios
 * con un espacio duro al final (RSFR037X130X3600 + \u00a0), y la búsqueda de
 * celda exacta no los ve. Se busca por contenido y se confirma que, sin
 * espacios, sea exactamente el mismo código.
 */
function buscarConEspacios_(rango, codigo) {
  var finder = rango.createTextFinder(codigo).matchEntireCell(false);
  var primera = 0;
  for (var i = 0; i < 20; i++) {
    var celda = finder.findNext();
    if (!celda) return null;
    var fila = celda.getRow();
    if (primera && fila === primera) return null;  // dio la vuelta entera
    if (!primera) primera = fila;
    if (normalizarCodigo_(celda.getValue()) === codigo) return celda;
  }
  return null;
}

function cache_() {
  try {
    return CacheService.getScriptCache();
  } catch (err) {
    return null;
  }
}

/* -------------------------------------------------------------- validación */

/** Deja la solicitud lista para escribir, o lanza el error que corresponda. */
function validar_(datos) {
  datos = datos || {};

  var correo = usuario_();
  if (AUDITORIA.EXIGIR_IDENTIDAD && !correo) {
    throw new Error('No se pudo identificar tu cuenta, así que la solicitud quedaría sin ' +
      'solicitante. Entra con tu correo corporativo y vuelve a intentarlo.');
  }
  if (!puedeAcceder_(correo)) {
    throw new Error('Tu cuenta no está autorizada para registrar solicitudes.');
  }

  var clase = clasePorId_(datos.clase);
  var origen = origenPorId_(datos.origen);
  var centro = centroEfectivo_(origen, datos.centro);
  var tipoMaterial = tipoMaterialEfectivo_(datos.tipoMaterial);

  var codigo = normalizarCodigo_(datos.codigo);
  var problema = problemaDeLargo_(codigo);
  if (problema) throw new Error(problema);

  var ficha = buscarEnBD_(codigo);
  if (!ficha && CODIGO.EXIGIR_EN_BD) {
    throw new Error('El código ' + codigo + ' no está en la hoja ' + CFG.HOJA_BD + '.');
  }
  if (ficha && CODIGO.EXIGIR_TIPO_MATERIAL && ficha.tipoMaterial &&
      normalizar_(ficha.tipoMaterial) !== normalizar_(tipoMaterial)) {
    throw new Error('El código ' + codigo + ' es ' + ficha.tipoMaterial + ' en ' + CFG.HOJA_BD +
      ', pero elegiste ' + tipoMaterial + '.');
  }

  var piezas = Number(datos.piezas);
  if (!isFinite(piezas) || piezas <= 0 || Math.floor(piezas) !== piezas) {
    throw new Error('La cantidad de piezas debe ser un número entero mayor que cero.');
  }

  var medidas = ficha
    ? { espesor: ficha.espesor, ancho: ficha.ancho, largo: ficha.largo }
    : dimensionesDe_('', codigo);

  return {
    clase: clase.id,
    claseTitulo: clase.titulo,
    hojaDestino: clase.hoja,
    origen: origen.id,
    centro: centro,
    tipoMaterial: tipoMaterial,
    codigo: ficha ? ficha.codigo : codigo,
    descripcion: ficha ? ficha.descripcion : '',
    grupo: ficha ? ficha.grupo : '',
    ce: ficha ? ficha.ce : '',
    piezas: piezas,
    espesor: medidas.espesor,
    ancho: medidas.ancho,
    largo: medidas.largo,
    pais: POR_DEFECTO.PAIS,
    tipoRequerimiento: POR_DEFECTO.TIPO_REQUERIMIENTO,
    umb: POR_DEFECTO.UMB,
    fecha: new Date(),
    solicitante: correo
  };
}

/* --------------------------------------------------------------- escritura */

/** Los datos que MAPEO_DESTINO puede pedir por nombre. */
function datosParaHoja_(v) {
  return {
    pais: v.pais,
    centro: v.centro,
    clase: v.clase,
    tipoRequerimiento: v.tipoRequerimiento,
    fecha: v.fecha,
    solicitante: v.solicitante,
    origen: v.origen,
    tipoMaterial: v.tipoMaterial,
    codigo: v.codigo,
    descripcion: v.descripcion,
    grupo: v.grupo,
    piezas: v.piezas,
    umb: v.umb,
    espesor: v.espesor,
    ancho: v.ancho,
    largo: v.largo
  };
}

/**
 * Escribe solo las columnas mapeadas, agrupando las contiguas en un rango.
 * Así no se pisa nada de las columnas del desglose que quedan en blanco.
 */
function escribirEnBloques_(hoja, fila, valoresPorColumna) {
  var columnas = Object.keys(valoresPorColumna)
    .map(Number)
    .sort(function (a, b) { return a - b; });

  var i = 0;
  while (i < columnas.length) {
    var j = i;
    while (j + 1 < columnas.length && columnas[j + 1] === columnas[j] + 1) j++;
    var bloque = [];
    for (var c = columnas[i]; c <= columnas[j]; c++) bloque.push(valoresPorColumna[c]);
    hoja.getRange(fila, columnas[i], 1, bloque.length).setValues([bloque]);
    i = j + 1;
  }
}

function guardarEnClase_(v) {
  var hoja = hoja_(v.hojaDestino);
  var indices = indicePorEncabezado_(hoja);
  var datos = datosParaHoja_(v);

  var valores = {};
  Object.keys(MAPEO_DESTINO).forEach(function (encabezado) {
    var col = indices[normalizar_(encabezado)];
    if (!col) return;  // la hoja no tiene esa columna: se ignora sin romper
    var dato = datos[MAPEO_DESTINO[encabezado]];
    valores[col] = (dato === undefined || dato === null) ? '' : dato;
  });

  if (!Object.keys(valores).length) {
    throw new Error('La hoja ' + hoja.getName() + ' no tiene ninguna de las columnas de ' +
      'MAPEO_DESTINO en la fila ' + CFG.FILA_ENCABEZADOS + '.');
  }

  var fila = Math.max(hoja.getLastRow() + 1, CFG.PRIMERA_FILA_DATOS);
  escribirEnBloques_(hoja, fila, valores);

  var colFecha = indices[normalizar_(COL_FECHA_DESTINO)];
  if (colFecha) hoja.getRange(fila, colFecha).setNumberFormat('dd-mm-yyyy hh:mm');

  return { hoja: hoja.getName(), fila: fila };
}

function asegurarEncabezadosRegistro_(hoja) {
  if (hoja.getLastRow() > 0) return;
  hoja.getRange(1, 1, 1, COL_REGISTRO.length)
    .setValues([COL_REGISTRO])
    .setFontWeight('bold')
    .setBackground('#1f3864')
    .setFontColor('#ffffff');
  hoja.setFrozenRows(1);
}

function guardarEnRegistro_(v, destino) {
  var hoja = hojaRegistro_();
  asegurarEncabezadosRegistro_(hoja);
  hoja.appendRow([
    v.fecha, v.solicitante, v.pais, v.clase, v.tipoRequerimiento,
    v.origen, v.centro, v.tipoMaterial, v.codigo, v.descripcion,
    v.grupo, v.piezas, v.umb, v.espesor, v.ancho, v.largo,
    destino.hoja, destino.fila
  ]);
  var fila = hoja.getLastRow();
  hoja.getRange(fila, 1).setNumberFormat('dd-mm-yyyy hh:mm');
  return fila;
}

/* --------------------------------------------------------------------- API */

/** Todo lo que el formulario necesita para dibujarse. */
function apiContexto() {
  var correo = usuario_();
  var faltantes = [];
  var libro = ss_();
  [CFG.HOJA_BD].concat(CLASES.map(function (c) { return c.hoja; })).forEach(function (nombre) {
    if (!libro.getSheetByName(nombre)) faltantes.push(nombre);
  });

  return {
    clases: CLASES.map(function (c) {
      return { id: c.id, hoja: c.hoja, titulo: c.titulo, descripcion: c.descripcion };
    }),
    origenes: ORIGENES.map(function (o) {
      return { id: o.id, titulo: o.titulo, descripcion: o.descripcion, centros: o.centros.slice() };
    }),
    tiposMaterial: TIPOS_MATERIAL.slice(),
    largoCodigo: CODIGO.LARGO,
    exigeCodigoEnBD: CODIGO.EXIGIR_EN_BD,
    porDefecto: POR_DEFECTO,
    hojaBD: CFG.HOJA_BD,
    hojaRegistro: CFG.HOJA_REGISTRO,
    usuario: correo,
    identificado: !!correo,
    exigeIdentidad: AUDITORIA.EXIGIR_IDENTIDAD,
    autorizado: puedeAcceder_(correo),
    hojasFaltantes: faltantes
  };
}

/** Busca el código mientras la persona escribe. Nunca lanza: siempre responde. */
function apiBuscarCodigo(codigo, tipoMaterial) {
  var limpio = normalizarCodigo_(codigo);
  var problema = problemaDeLargo_(limpio);
  if (problema) {
    return { ok: false, encontrado: false, codigo: limpio, mensaje: problema };
  }

  var ficha;
  try {
    ficha = buscarEnBD_(limpio);
  } catch (err) {
    return { ok: false, encontrado: false, codigo: limpio, mensaje: err.message };
  }

  if (!ficha) {
    return {
      ok: !CODIGO.EXIGIR_EN_BD,
      encontrado: false,
      codigo: limpio,
      mensaje: 'El código ' + limpio + ' no está en la hoja ' + CFG.HOJA_BD + '.'
    };
  }

  var aviso = '';
  if (tipoMaterial && ficha.tipoMaterial &&
      normalizar_(ficha.tipoMaterial) !== normalizar_(tipoMaterial)) {
    aviso = 'En ' + CFG.HOJA_BD + ' este código figura como ' + ficha.tipoMaterial +
      ' y elegiste ' + tipoMaterial + '.';
    if (CODIGO.EXIGIR_TIPO_MATERIAL) {
      return { ok: false, encontrado: true, codigo: ficha.codigo, material: ficha, mensaje: aviso };
    }
  }

  return { ok: true, encontrado: true, codigo: ficha.codigo, material: ficha, aviso: aviso };
}

/** Guarda la solicitud en la hoja de la clase y en la hoja Registro. */
function apiGuardar(datos) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(CFG.SEGUNDOS_LOCK * 1000)) {
    throw new Error('Hay otro registro guardándose en este momento. Inténtalo de nuevo.');
  }
  try {
    var v = validar_(datos);
    var destino = guardarEnClase_(v);
    var filaRegistro = guardarEnRegistro_(v, destino);
    SpreadsheetApp.flush();
    return {
      ok: true,
      hoja: destino.hoja,
      fila: destino.fila,
      hojaRegistro: CFG.HOJA_REGISTRO,
      filaRegistro: filaRegistro,
      codigo: v.codigo,
      descripcion: v.descripcion,
      piezas: v.piezas,
      fecha: Utilities.formatDate(v.fecha, Session.getScriptTimeZone(), 'dd-MM-yyyy HH:mm'),
      solicitante: v.solicitante
    };
  } finally {
    lock.releaseLock();
  }
}

// ======================================================================
// Setup.gs
// ======================================================================

/**
 * Preparación del spreadsheet y menú.
 *
 * `instalarRegistro` se ejecuta UNA vez desde el editor de Apps Script:
 * revisa que estén las hojas que el formulario necesita y crea la hoja
 * Registro con sus encabezados.
 */

function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('Registro Maderas')
      .addItem('Preparar hojas', 'instalarRegistro')
      .addItem('Ver enlace del formulario', 'mostrarEnlace')
      .addToUi();
  } catch (err) {
    // Sin interfaz (ejecución por trigger o desde el editor): no hay menú que crear.
  }
}

function instalarRegistro() {
  var libro = ss_();
  var problemas = [];

  if (!libro.getSheetByName(CFG.HOJA_BD)) {
    problemas.push('Falta la hoja "' + CFG.HOJA_BD + '" (la base de códigos).');
  }
  CLASES.forEach(function (clase) {
    var hoja = libro.getSheetByName(clase.hoja);
    if (!hoja) {
      problemas.push('Falta la hoja "' + clase.hoja + '" (' + clase.titulo + ').');
      return;
    }
    var indices = indicePorEncabezado_(hoja);
    var sinColumna = Object.keys(MAPEO_DESTINO).filter(function (encabezado) {
      return !indices[normalizar_(encabezado)];
    });
    if (sinColumna.length === Object.keys(MAPEO_DESTINO).length) {
      problemas.push('La hoja "' + clase.hoja + '" no tiene los encabezados en la fila ' +
        CFG.FILA_ENCABEZADOS + '.');
    } else if (sinColumna.length) {
      problemas.push('En "' + clase.hoja + '" no se encontraron estas columnas y quedarán ' +
        'sin escribir: ' + sinColumna.join(', ') + '.');
    }
  });

  var registro = hojaRegistro_();
  asegurarEncabezadosRegistro_(registro);

  var resumen = problemas.length
    ? 'Listo, pero revisa esto:\n\n· ' + problemas.join('\n· ')
    : 'Listo. Las hojas ' + CLASES.map(function (c) { return c.hoja; }).join(', ') +
      ', ' + CFG.HOJA_BD + ' y ' + CFG.HOJA_REGISTRO + ' están en orden.';

  avisar_('Preparar hojas', resumen);
  return resumen;
}

function mostrarEnlace() {
  var url = urlFormulario_();
  avisar_('Enlace del formulario', url
    ? url + '\n\nPara entrar con la clase ya elegida:\n' +
      CLASES.map(function (c) { return '· ' + c.titulo + ': ' + url + '?clase=' + c.id; }).join('\n')
    : 'Todavía no hay una implementación web publicada. Usa Implementar › Nueva implementación › Aplicación web.');
}

function avisar_(titulo, mensaje) {
  try {
    SpreadsheetApp.getUi().alert(titulo, mensaje, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (err) {
    Logger.log(titulo + ': ' + mensaje);
  }
}

// ======================================================================
// WebApp.gs
// ======================================================================

/**
 * Publicación web: un solo enlace, un solo formulario.
 *
 * Se puede llegar con la clase ya elegida:
 *   .../exec?clase=PT | ?clase=PCP | ?clase=PP
 */

function doGet(e) {
  var params = (e && e.parameter) || {};
  var clase = '';
  try {
    if (params.clase) clase = clasePorId_(params.clase).id;
  } catch (err) {
    clase = '';  // ?clase= con algo raro: se ignora y se pregunta igual
  }

  var t = HtmlService.createTemplate(HTML_FORMULARIO);
  t.clasePrevia = clase;
  return t.evaluate()
    .setTitle('Registro de requerimientos · Maderas')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include(nombre) {
  return HTML_PARCIALES[nombre] || '';
}

/** URL de la aplicación publicada (la usa el menú del spreadsheet). */
function urlFormulario_() {
  try {
    return ScriptApp.getService().getUrl() || '';
  } catch (err) {
    return '';
  }
}
