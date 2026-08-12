/**
 * SOLICITUDES · Costos → T&D → Producción — ARCHIVO ÚNICO
 *
 * Generado por construir-archivo-unico.js. No lo edites a mano: edita los
 * archivos fuente de apps-script/solicitudes y vuelve a generarlo.
 *
 * Pega este archivo como único Código.gs del proyecto de Apps Script.
 * No necesitas crear los .html: van incrustados más abajo.
 *
 * Después de pegarlo, ejecuta la función `instalarSolicitudes` una vez.
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

  .wrap { max-width: 860px; margin: 0 auto; }

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
  .ruta span.hecho { background: rgba(255,255,255,.35); }

  .panel {
    background: #fff;
    border: 1px solid var(--borde);
    border-top: none;
    border-radius: 0 0 var(--radio) var(--radio);
    padding: 22px 24px 26px;
  }

  .bloque { margin-bottom: 22px; }
  .bloque > h2 {
    margin: 0 0 12px; font-size: 13px; text-transform: uppercase;
    letter-spacing: .06em; color: var(--suave);
  }

  label.campo { display: block; margin-bottom: 14px; }
  label.campo > span.tit { display: block; font-size: 13px; font-weight: 600; margin-bottom: 5px; }
  label.campo > span.tit b { color: var(--rojo); font-weight: 600; }

  input[type=text], input[type=number], input[type=date], input[type=email], select, textarea {
    width: 100%; padding: 9px 11px; font: inherit; color: inherit;
    border: 1px solid var(--borde); border-radius: 8px; background: #fff;
  }
  textarea { min-height: 74px; resize: vertical; }
  input:focus, select:focus, textarea:focus {
    outline: none; border-color: var(--azul-claro); box-shadow: 0 0 0 3px rgba(45,82,150,.12);
  }
  input[readonly], input:disabled, select:disabled, textarea:disabled {
    background: #eef1f6; color: var(--suave);
  }

  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0 18px; }
  .grid2 > .ancho { grid-column: 1 / -1; }
  @media (max-width: 640px) { .grid2 { grid-template-columns: 1fr; } }

  .numero {
    display: inline-block; font-size: 18px; font-weight: 700; letter-spacing: .04em;
    color: var(--azul); background: #eaf0fa; border: 1px solid #cddbf2;
    padding: 6px 14px; border-radius: 8px;
  }

  .estados { display: flex; gap: 10px; flex-wrap: wrap; }
  .estados label {
    flex: 1 1 150px; border: 1px solid var(--borde); border-radius: 8px;
    padding: 10px 12px; cursor: pointer; display: flex; align-items: center; gap: 8px;
    font-weight: 600; background: #fff;
  }
  .estados label:hover { border-color: var(--azul-claro); }
  .estados input { accent-color: var(--azul); }
  .estados label.sel-Aprobado { border-color: var(--verde); background: #edf7f1; color: var(--verde); }
  .estados label.sel-Rechazado { border-color: var(--rojo); background: #fdeeed; color: var(--rojo); }
  .estados label.sel-Modificado { border-color: var(--ambar); background: #fdf4e6; color: var(--ambar); }
  .estados small { display: block; font-weight: 400; font-size: 11px; color: var(--suave); }

  button {
    font: inherit; font-weight: 600; border-radius: 8px; padding: 11px 22px;
    border: 1px solid transparent; cursor: pointer;
  }
  button.primario { background: var(--azul); color: #fff; }
  button.primario:hover { background: var(--azul-claro); }
  button.secundario { background: #fff; border-color: var(--borde); color: var(--texto); }
  button:disabled { opacity: .55; cursor: default; }

  .acciones { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-top: 6px; }

  .aviso { padding: 12px 14px; border-radius: 8px; font-size: 14px; margin-bottom: 16px; }
  .aviso.info { background: #eaf0fa; border: 1px solid #cddbf2; color: var(--azul); }
  .aviso.ok { background: #edf7f1; border: 1px solid #b9e0c9; color: var(--verde); }
  .aviso.error { background: #fdeeed; border: 1px solid #f0c4c1; color: var(--rojo); }
  .aviso.alerta { background: #fdf4e6; border: 1px solid #f0dcb4; color: var(--ambar); }
  .aviso b { display: block; margin-bottom: 2px; }

  details.vermas {
    border: 1px solid var(--borde); border-radius: 8px; background: #fbfcfe;
    padding: 0 14px; margin-bottom: 18px;
  }
  details.vermas > summary {
    cursor: pointer; padding: 12px 0; font-weight: 600; font-size: 14px; color: var(--azul);
    list-style: none; display: flex; justify-content: space-between; align-items: center;
  }
  details.vermas > summary::after { content: 'Ver más ▾'; font-size: 12px; color: var(--suave); font-weight: 600; }
  details.vermas[open] > summary::after { content: 'Ver menos ▴'; }
  details.vermas > div { padding-bottom: 14px; }

  .etapa-avance { border-top: 1px dashed var(--borde); padding: 12px 0 4px; }
  .etapa-avance h3 { margin: 0 0 8px; font-size: 13px; color: var(--azul); }
  .etapa-avance dl { margin: 0; display: grid; grid-template-columns: 190px 1fr; gap: 4px 12px; font-size: 13px; }
  .etapa-avance dt { color: var(--suave); }
  .etapa-avance dd { margin: 0; white-space: pre-wrap; }
  .etapa-avance .vacia { font-size: 13px; color: var(--suave); font-style: italic; }

  table.hist { width: 100%; border-collapse: collapse; font-size: 12.5px; }
  table.hist th, table.hist td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--borde); vertical-align: top; }
  table.hist th { color: var(--suave); font-weight: 600; }

  .pill { display: inline-block; padding: 2px 9px; border-radius: 999px; font-size: 11.5px; font-weight: 600; }
  .pill.Aprobado { background: #edf7f1; color: var(--verde); }
  .pill.Rechazado { background: #fdeeed; color: var(--rojo); }
  .pill.Modificado { background: #fdf4e6; color: var(--ambar); }

  .bandeja { display: flex; gap: 10px; align-items: flex-end; flex-wrap: wrap; }
  .bandeja label.campo { flex: 1 1 320px; margin-bottom: 0; }

  .pie { margin-top: 14px; font-size: 12px; color: var(--suave); text-align: right; }

  .cargando { text-align: center; padding: 40px 0; color: var(--suave); }

  .tarjetas { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
  .tarjeta {
    display: block; text-decoration: none; color: inherit; background: #fff;
    border: 1px solid var(--borde); border-radius: var(--radio); padding: 18px;
  }
  .tarjeta:hover { border-color: var(--azul-claro); box-shadow: 0 2px 10px rgba(31,56,100,.08); }
  .tarjeta h3 { margin: 0 0 6px; font-size: 16px; color: var(--azul); }
  .tarjeta p { margin: 0; font-size: 13px; color: var(--suave); }
</style>
`;

const HTML_FORMULARIO = `<!--
  Formulario único parametrizado por etapa (?form=costos|td|produccion).
  Los campos se dibujan a partir del esquema que entrega apiContexto().
-->
<?!= include('Estilos') ?>

<div class="wrap">
  <header class="app">
    <h1 id="tituloEtapa">Solicitud · <?= etapaTitulo ?></h1>
    <p id="descEtapa">Cargando…</p>
    <div class="ruta" id="ruta"></div>
  </header>

  <div class="panel">
    <div id="cargando" class="cargando">Cargando formulario…</div>

    <div id="app" style="display:none">

      <div id="mensaje"></div>

      <div class="bloque">
        <h2>Solicitud</h2>
        <div class="bandeja">
          <label class="campo">
            <span class="tit" id="rotuloBandeja">Selecciona una solicitud</span>
            <select id="selBandeja"></select>
          </label>
          <button type="button" class="secundario" id="btnRecargar">Actualizar bandeja</button>
        </div>
        <p style="margin:12px 0 0">
          <span class="numero" id="numero">—</span>
          <span style="font-size:12px;color:#5c6b7f;margin-left:8px" id="estadoFlujo"></span>
        </p>
      </div>

      <div id="avisoDevolucion"></div>
      <div id="verMas"></div>

      <div class="bloque">
        <h2>Datos del formulario</h2>
        <div class="grid2" id="campos"></div>
      </div>

      <div class="bloque">
        <h2>Estado</h2>
        <div class="estados" id="estados"></div>
        <label class="campo" style="margin-top:14px">
          <span class="tit">Comentario / motivo <b id="marcaComentario" style="display:none">*</b></span>
          <textarea id="comentario" placeholder="Obligatorio si rechazas o devuelves para modificación."></textarea>
        </label>
      </div>

      <div class="acciones">
        <button type="button" class="primario" id="btnGuardar">Guardar y aplicar estado</button>
        <button type="button" class="secundario" id="btnLimpiar">Limpiar</button>
        <span id="guardando" style="display:none;font-size:13px;color:#5c6b7f">Guardando…</span>
      </div>

      <div class="bloque" id="cajaHistorial" style="margin-top:26px;display:none">
        <h2>Historial de la solicitud</h2>
        <table class="hist"><tbody id="historial"></tbody></table>
      </div>

      <p class="pie" id="pie"></p>
    </div>
  </div>
</div>

<script>
  var ETAPA_ID = '<?= etapaId ?>';
  var CTX = null;      // metadatos de la etapa + bandeja
  var ACTUAL = null;   // ficha de la solicitud cargada

  function $(id) { return document.getElementById(id); }

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function aviso(caja, tipo, titulo, texto) {
    if (!texto && !titulo) { caja.innerHTML = ''; return; }
    caja.innerHTML = '<div class="aviso ' + tipo + '">' +
      (titulo ? '<b>' + esc(titulo) + '</b>' : '') + esc(texto || '') + '</div>';
  }

  /* ---------------------------------------------------------- carga inicial */

  function iniciar() {
    google.script.run
      .withSuccessHandler(alCargarContexto)
      .withFailureHandler(errorFatal)
      .apiContexto(ETAPA_ID);
  }

  function errorFatal(err) {
    $('cargando').innerHTML = '<div class="aviso error"><b>No se pudo cargar el formulario</b>' +
      esc(err && err.message ? err.message : err) + '</div>';
  }

  function alCargarContexto(ctx) {
    CTX = ctx;
    $('descEtapa').textContent = ctx.etapa.descripcion;
    $('pie').textContent = 'Hoja: ' + ctx.etapa.hoja + (ctx.usuario ? ' · ' + ctx.usuario : '');
    dibujarRuta();
    dibujarCampos();
    dibujarEstados();
    dibujarBandeja(ctx.bandeja);
    $('cargando').style.display = 'none';
    $('app').style.display = '';
  }

  function dibujarRuta() {
    var idx = 0;
    CTX.etapas.forEach(function (e, i) { if (e.id === ETAPA_ID) idx = i; });
    $('ruta').innerHTML = CTX.etapas.map(function (e, i) {
      var cls = e.id === ETAPA_ID ? 'on' : (i < idx ? 'hecho' : '');
      return '<span class="' + cls + '">' + (i + 1) + '. ' + esc(e.titulo) + '</span>';
    }).join('');
  }

  /* ------------------------------------------------------------- formulario */

  function dibujarCampos() {
    $('campos').innerHTML = CTX.etapa.campos.map(function (c) {
      var req = c.requerido ? ' <b>*</b>' : '';
      var control;
      if (c.tipo === 'textarea') {
        control = '<textarea id="f_' + c.id + '"></textarea>';
      } else if (c.tipo === 'lista') {
        control = '<select id="f_' + c.id + '"><option value=""></option>' +
          c.opciones.map(function (o) { return '<option value="' + esc(o) + '">' + esc(o) + '</option>'; }).join('') +
          '</select>';
      } else {
        var tipoHtml = c.tipo === 'numero' ? 'number' : (c.tipo === 'fecha' ? 'date' : (c.tipo === 'email' ? 'email' : 'text'));
        var extra = c.tipo === 'numero' ? ' step="any"' : '';
        control = '<input type="' + tipoHtml + '" id="f_' + c.id + '"' + extra + '>';
      }
      var ancho = (c.tipo === 'textarea') ? ' ancho' : '';
      return '<label class="campo' + ancho + '">' +
        '<span class="tit">' + esc(c.etiqueta) + req + '</span>' + control +
        (c.ayuda ? '<small style="color:#5c6b7f">' + esc(c.ayuda) + '</small>' : '') +
        '</label>';
    }).join('');
  }

  function dibujarEstados() {
    var sig = CTX.etapa.siguiente;
    var glosas = {
      Aprobado: sig ? 'Pasa a ' + sig + ' con el número de solicitud.' : 'Cierra el flujo como aprobada.',
      Rechazado: 'Termina el flujo, no continúa al siguiente paso.',
      Modificado: 'Vuelve a ' + CTX.etapas[0].titulo + ' y reinicia los estados.'
    };
    $('estados').innerHTML = CTX.estados.map(function (e) {
      return '<label id="lbl_' + e + '"><input type="radio" name="estado" value="' + esc(e) + '">' +
        '<span>' + esc(e) + '<small>' + esc(glosas[e] || '') + '</small></span></label>';
    }).join('');

    Array.prototype.forEach.call(document.getElementsByName('estado'), function (r) {
      r.addEventListener('change', alCambiarEstado);
    });
  }

  function alCambiarEstado() {
    var sel = estadoElegido();
    CTX.estados.forEach(function (e) {
      $('lbl_' + e).className = (e === sel) ? 'sel-' + e : '';
    });
    $('marcaComentario').style.display = (sel && sel !== 'Aprobado') ? '' : 'none';
  }

  function estadoElegido() {
    var rs = document.getElementsByName('estado');
    for (var i = 0; i < rs.length; i++) if (rs[i].checked) return rs[i].value;
    return '';
  }

  function limpiarEstado() {
    Array.prototype.forEach.call(document.getElementsByName('estado'), function (r) { r.checked = false; });
    $('comentario').value = '';
    alCambiarEstado();
  }

  /* ---------------------------------------------------------------- bandeja */

  function dibujarBandeja(bandeja) {
    var sel = $('selBandeja');
    var opciones = [];

    if (CTX.etapa.esPrimera) {
      $('rotuloBandeja').textContent = 'Nueva solicitud o una devuelta para modificación';
      opciones.push('<option value="">➕ Nueva solicitud</option>');
    } else {
      $('rotuloBandeja').textContent = 'Solicitudes que llegaron a ' + CTX.etapa.titulo;
      opciones.push('<option value="">— Selecciona una solicitud —</option>');
    }

    (bandeja || []).forEach(function (s) {
      var txt = s.numero + (s.resumen ? ' · ' + s.resumen : '');
      if (s.devueltoPor) txt += ' (devuelta desde ' + s.devueltoPor + ')';
      opciones.push('<option value="' + esc(s.numero) + '">' + esc(txt) + '</option>');
    });

    if (!(bandeja || []).length && !CTX.etapa.esPrimera) {
      opciones.push('<option value="" disabled>(sin solicitudes pendientes)</option>');
    }

    sel.innerHTML = opciones.join('');
    sel.value = '';
    alCambiarBandeja();
  }

  function recargarBandeja() {
    $('btnRecargar').disabled = true;
    google.script.run
      .withSuccessHandler(function (b) {
        CTX.bandeja = b;
        dibujarBandeja(b);
        $('btnRecargar').disabled = false;
      })
      .withFailureHandler(function (e) {
        $('btnRecargar').disabled = false;
        aviso($('mensaje'), 'error', 'Error al actualizar la bandeja: ', e.message || e);
      })
      .apiBandeja(ETAPA_ID);
  }

  function alCambiarBandeja() {
    var numero = $('selBandeja').value;
    if (!numero) {
      ACTUAL = null;
      limpiarFicha();
      habilitarFormulario(CTX.etapa.esPrimera);
      $('numero').textContent = CTX.etapa.esPrimera ? 'Se asignará al guardar' : '—';
      $('estadoFlujo').textContent = CTX.etapa.esPrimera
        ? 'Nueva solicitud'
        : 'Selecciona una solicitud de la bandeja para continuar.';
      return;
    }
    cargarSolicitud(numero);
  }

  function cargarSolicitud(numero) {
    habilitarFormulario(false);
    $('estadoFlujo').textContent = 'Cargando ' + numero + '…';
    google.script.run
      .withSuccessHandler(alCargarSolicitud)
      .withFailureHandler(function (e) {
        aviso($('mensaje'), 'error', 'No se pudo abrir la solicitud: ', e.message || e);
        $('estadoFlujo').textContent = '';
      })
      .apiObtener(ETAPA_ID, numero);
  }

  function alCargarSolicitud(ficha) {
    ACTUAL = ficha;
    $('numero').textContent = ficha.numero;
    $('estadoFlujo').textContent = ficha.flujo.resultado + ' · versión ' + ficha.flujo.version;

    var mia = null;
    ficha.avance.forEach(function (a) { if (a.etapaId === ETAPA_ID) mia = a; });
    CTX.etapa.campos.forEach(function (c) {
      var el = $('f_' + c.id);
      if (el) el.value = (mia && mia.datos[c.id]) ? mia.datos[c.id] : '';
    });

    if (ficha.flujo.devueltoPor) {
      aviso($('avisoDevolucion'), 'alerta',
        'Devuelta para modificación desde ' + ficha.flujo.devueltoPorTitulo + ' · versión ' + ficha.flujo.version,
        ficha.flujo.motivoDevolucion || 'Sin motivo registrado.');
    } else {
      aviso($('avisoDevolucion'), '', '', '');
    }

    dibujarVerMas(ficha);
    dibujarHistorial(ficha.historial);
    limpiarEstado();
    habilitarFormulario(ficha.puedeEditar);

    if (!ficha.puedeEditar) {
      aviso($('mensaje'), 'info', 'Solo lectura: ',
        'la solicitud está en ' + ficha.flujo.etapaActualTitulo + '.');
    } else {
      aviso($('mensaje'), '', '', '');
    }
  }

  /**
   * "Ver más": trazabilidad de las otras hojas.
   * En Costos se muestra únicamente cuando la solicitud volvió por "Modificado".
   */
  function dibujarVerMas(ficha) {
    var caja = $('verMas');
    var mostrar = CTX.etapa.esPrimera ? !!ficha.flujo.devueltoPor : true;
    var otras = ficha.avance.filter(function (a) { return a.etapaId !== ETAPA_ID && a.existe; });

    if (!mostrar || !otras.length) { caja.innerHTML = ''; return; }

    var cuerpo = otras.map(function (a) {
      var filas = a.campos.map(function (c) {
        var v = a.datos[c.id];
        return v ? '<dt>' + esc(c.etiqueta) + '</dt><dd>' + esc(v) + '</dd>' : '';
      }).filter(String).join('');
      var estado = a.estado
        ? '<span class="pill ' + esc(a.estado) + '">' + esc(a.estado) + '</span>'
        : '<span style="color:#5c6b7f;font-size:12px">estado reiniciado</span>';
      return '<div class="etapa-avance"><h3>' + esc(a.titulo) + ' ' + estado + '</h3>' +
        (filas ? '<dl>' + filas + '</dl>' : '<p class="vacia">Sin datos registrados.</p>') +
        (a.comentario ? '<dl><dt>Comentario</dt><dd>' + esc(a.comentario) + '</dd></dl>' : '') +
        '</div>';
    }).join('');

    caja.innerHTML = '<details class="vermas"><summary>Avance registrado en las otras hojas</summary>' +
      '<div>' + cuerpo + '</div></details>';
  }

  function dibujarHistorial(eventos) {
    if (!eventos || !eventos.length) { $('cajaHistorial').style.display = 'none'; return; }
    $('cajaHistorial').style.display = '';
    $('historial').innerHTML =
      '<tr><th>Fecha</th><th>Etapa</th><th>Acción</th><th>Estado</th><th>Comentario</th><th>Usuario</th></tr>' +
      eventos.map(function (ev) {
        return '<tr><td>' + esc(ev.fecha) + '</td><td>' + esc(ev.etapa) + '</td><td>' + esc(ev.accion) + '</td>' +
          '<td>' + (ev.estado ? '<span class="pill ' + esc(ev.estado) + '">' + esc(ev.estado) + '</span>' : '') + '</td>' +
          '<td>' + esc(ev.comentario) + '</td><td>' + esc(ev.usuario) + '</td></tr>';
      }).join('');
  }

  function limpiarFicha() {
    CTX.etapa.campos.forEach(function (c) { var el = $('f_' + c.id); if (el) el.value = ''; });
    limpiarEstado();
    aviso($('avisoDevolucion'), '', '', '');
    aviso($('mensaje'), '', '', '');
    $('verMas').innerHTML = '';
    $('cajaHistorial').style.display = 'none';
  }

  function habilitarFormulario(activo) {
    CTX.etapa.campos.forEach(function (c) { var el = $('f_' + c.id); if (el) el.disabled = !activo; });
    Array.prototype.forEach.call(document.getElementsByName('estado'), function (r) { r.disabled = !activo; });
    $('comentario').disabled = !activo;
    $('btnGuardar').disabled = !activo;
  }

  /* --------------------------------------------------------------- guardado */

  function guardar() {
    var estado = estadoElegido();
    if (!estado) {
      aviso($('mensaje'), 'error', '', 'Selecciona un estado: ' + CTX.estados.join(', ') + '.');
      return;
    }
    var comentario = $('comentario').value.trim();
    if (estado !== 'Aprobado' && !comentario) {
      aviso($('mensaje'), 'error', '', 'Indica el motivo para el estado "' + estado + '".');
      $('comentario').focus();
      return;
    }
    if (estado === 'Rechazado' &&
        !confirm('Rechazar la solicitud cierra el flujo y no continúa al siguiente paso. ¿Confirmas?')) {
      return;
    }

    var datos = {};
    CTX.etapa.campos.forEach(function (c) {
      var el = $('f_' + c.id);
      datos[c.id] = el ? el.value : '';
    });

    $('btnGuardar').disabled = true;
    $('guardando').style.display = '';

    google.script.run
      .withSuccessHandler(alGuardar)
      .withFailureHandler(function (e) {
        $('guardando').style.display = 'none';
        $('btnGuardar').disabled = false;
        aviso($('mensaje'), 'error', 'No se pudo guardar: ', e.message || e);
      })
      .apiGuardar({
        etapaId: ETAPA_ID,
        numero: ACTUAL ? ACTUAL.numero : '',
        datos: datos,
        estado: estado,
        comentario: comentario
      });
  }

  function alGuardar(res) {
    $('guardando').style.display = 'none';
    ACTUAL = null;
    limpiarFicha();
    aviso($('mensaje'), 'ok', 'Listo. ', res.mensaje);
    recargarBandeja();
    window.scrollTo(0, 0);
  }

  /* ------------------------------------------------------------------ eventos */

  document.addEventListener('DOMContentLoaded', function () {
    $('selBandeja').addEventListener('change', alCambiarBandeja);
    $('btnRecargar').addEventListener('click', recargarBandeja);
    $('btnGuardar').addEventListener('click', guardar);
    $('btnLimpiar').addEventListener('click', function () {
      $('selBandeja').value = '';
      alCambiarBandeja();
    });
    iniciar();
  });
</script>
`;

const HTML_INICIO = `<!-- Selector de formularios (solo si se abre la URL sin ?form=) -->
<?!= include('Estilos') ?>

<div class="wrap">
  <header class="app">
    <h1>Solicitudes</h1>
    <p>Flujo Costos → T&amp;D → Producción. Cada equipo entra por su propio enlace.</p>
  </header>
  <div class="panel">
    <div class="aviso info">
      Comparte a cada equipo únicamente el enlace de su formulario. El número de
      solicitud se genera solo en Costos y es lo único que avanza entre hojas.
    </div>
    <div class="tarjetas">
      <? for (var i = 0; i < etapas.length; i++) { ?>
        <a class="tarjeta" href="<?= etapas[i].url ?>" target="_top">
          <h3><?= etapas[i].titulo ?></h3>
          <p><?= etapas[i].descripcion ?></p>
          <p style="margin-top:8px">Hoja: <b><?= etapas[i].hoja ?></b></p>
        </a>
      <? } ?>
    </div>
  </div>
</div>
`;

const HTML_PARCIALES = {
  Estilos: HTML_ESTILOS,
  Formulario: HTML_FORMULARIO,
  Inicio: HTML_INICIO
};

// ======================================================================
// Config.gs
// ======================================================================

/**
 * Flujo de solicitudes en 3 etapas: Costos -> T&D -> Producción.
 * Spreadsheet: SolicitudTableros.
 *
 * Reglas del flujo (iguales en las 3 etapas):
 *   - Rechazado  -> la solicitud se cierra, no avanza.
 *   - Modificado -> vuelve SIEMPRE a Costos, se resetean los estados de las 3
 *                   hojas y Costos se reabre con todos los campos cargados
 *                   más un "Ver más" con lo que ya se registró aguas abajo.
 *   - Aprobado   -> avanza a la hoja siguiente llevando SOLO el número de
 *                   solicitud (T&D después de Costos, Producción después de T&D).
 *
 * El número de solicitud es correlativo, único, y es lo único que viaja entre hojas.
 *
 * Para cambiar campos: edita `campos` de la etapa (columna = encabezado exacto en
 * la hoja) y vuelve a ejecutar `instalarSolicitudes`.
 */

const CFG = {
  SPREADSHEET_ID: '1afMUbL2OP-i3taaX33YORRPgX2kOqDAhkGzOkgcUAYg',
  HOJA_HISTORIAL: 'Historial',
  PREFIJO_SOLICITUD: 'SOL-',
  DIGITOS_CORRELATIVO: 5,
  PROP_CORRELATIVO: 'SOLICITUDES_ULTIMO_CORRELATIVO',
  SEGUNDOS_LOCK: 30
};

/**
 * Un enlace propio por formulario.
 *
 * ''            -> un solo despliegue que atiende las 3 etapas vía ?form=costos|td|produccion.
 * 'costos'      -> este despliegue ES el formulario de Costos y nada más.
 * 'td'          -> este despliegue ES el formulario de T&D y nada más.
 * 'produccion'  -> este despliegue ES el formulario de Producción y nada más.
 *
 * Cuando está fijada, la etapa se impone en el servidor: da lo mismo lo que
 * alguien escriba en la URL, ese enlace solo abre y solo guarda esa etapa.
 * Ver README ("Un enlace por formulario") para las dos formas de montarlo.
 */
const ETAPA_FIJA = '';

/**
 * URLs de los despliegues, si usas uno por formulario. Es solo informativo:
 * alimenta el menú "Ver enlaces de los formularios" y la página de inicio.
 */
const URLS_FORMULARIOS = {
  costos: '',
  td: '',
  produccion: ''
};

const ESTADOS = {
  APROBADO: 'Aprobado',
  RECHAZADO: 'Rechazado',
  MODIFICADO: 'Modificado'
};

const ESTADOS_LISTA = [ESTADOS.APROBADO, ESTADOS.RECHAZADO, ESTADOS.MODIFICADO];

/**
 * Columnas de control que el flujo agrega al final de cada hoja.
 * Son opcionales: si borras alguna de la hoja, el código sigue funcionando
 * (el registro completo siempre queda en la hoja Historial).
 */
const COL_CONTROL = ['Comentario Estado', 'Revisado Por', 'Fecha Estado', 'Registrado Por', 'Fecha Registro'];
/** Solo en la primera etapa (Costos): deja a la vista por qué volvió la solicitud. */
const COL_CONTROL_PRIMERA = ['Devuelto Por', 'Motivo Devolución', 'Versión'];

const COL_HISTORIAL = [
  'Fecha', 'N° Solicitud', 'Etapa', 'Acción', 'Estado', 'Comentario', 'Usuario', 'Versión'
];

/**
 * Etapas en orden: el orden del arreglo define el recorrido del flujo.
 *
 * columna      : encabezado EXACTO en la hoja.
 * tipo         : texto | textarea | numero | fecha | lista | email
 * soloLectura  : se muestra en el formulario pero no se edita.
 */
const ETAPAS = [
  {
    id: 'costos',
    hoja: 'Costos',
    titulo: 'Costos',
    descripcion: 'Ingreso de la solicitud. Aquí nace el número de solicitud.',
    colNumero: 'numero de solicitud',
    colEstado: 'estado de la solicitud',
    campos: [
      { id: 'tipoSolicitud', columna: 'Tipo de solicitud', etiqueta: 'Tipo de solicitud', tipo: 'texto', requerido: true },
      { id: 'solicitante', columna: 'solicitante', etiqueta: 'Solicitante', tipo: 'texto', requerido: true },
      { id: 'material', columna: 'Material', etiqueta: 'Material', tipo: 'textarea', requerido: true },
      { id: 'consultas', columna: 'consultas', etiqueta: 'Consultas', tipo: 'textarea', requerido: false },
      { id: 'respuestas', columna: 'Respuestas', etiqueta: 'Respuestas', tipo: 'textarea', requerido: false }
    ]
  },
  {
    id: 'td',
    hoja: 'T&D',
    titulo: 'T&D',
    descripcion: 'Recibe automáticamente el número de solicitud aprobado en Costos.',
    colNumero: 'numero de solicitud',
    colEstado: 'estado',
    campos: [
      { id: 'pregunta1', columna: 'pregunta1', etiqueta: 'Pregunta 1', tipo: 'textarea', requerido: true },
      { id: 'respuesta1', columna: 'respuesta1', etiqueta: 'Respuesta 1', tipo: 'textarea', requerido: true },
      { id: 'pregunta2', columna: 'pregunta2', etiqueta: 'Pregunta 2', tipo: 'textarea', requerido: false },
      { id: 'respuesta2', columna: 'respuesta2', etiqueta: 'Respuesta 2', tipo: 'textarea', requerido: false },
      { id: 'pregunta3', columna: 'pregunta3', etiqueta: 'Pregunta 3', tipo: 'textarea', requerido: false },
      { id: 'respuesta3', columna: 'respuesta3', etiqueta: 'Respuesta 3', tipo: 'textarea', requerido: false },
      { id: 'consultas', columna: 'Consultas', etiqueta: 'Consultas', tipo: 'textarea', requerido: false }
    ]
  },
  {
    id: 'produccion',
    hoja: 'Produccion',
    titulo: 'Producción',
    descripcion: 'Recibe automáticamente el número de solicitud y el estado aprobado en T&D.',
    colNumero: 'numero de solicitud',
    colEstado: 'estado',
    campos: [
      { id: 'pregunta1', columna: 'pregunta1', etiqueta: 'Pregunta', tipo: 'textarea', requerido: true },
      { id: 'respuesta', columna: 'Respuesta', etiqueta: 'Respuesta', tipo: 'textarea', requerido: true }
    ]
  }
];

/**
 * Control de acceso por formulario. Arreglo vacío = cualquiera con el enlace.
 * Ej: costos: ['costos@masisa.com', 'jefatura@masisa.com']
 */
const ACCESOS = {
  costos: [],
  td: [],
  produccion: []
};

function etapaPorId_(id) {
  for (var i = 0; i < ETAPAS.length; i++) {
    if (ETAPAS[i].id === id) return ETAPAS[i];
  }
  throw new Error('Etapa desconocida: ' + id);
}

/**
 * Etapa que realmente atiende esta ejecución. Si ETAPA_FIJA está definida manda
 * ella, sin importar lo que llegue desde el cliente o la URL.
 */
function etapaEfectiva_(solicitada) {
  if (ETAPA_FIJA) {
    if (indiceEtapa_(ETAPA_FIJA) === -1) {
      throw new Error('ETAPA_FIJA inválida en Config.gs: "' + ETAPA_FIJA + '".');
    }
    return ETAPA_FIJA;
  }
  var id = String(solicitada == null ? '' : solicitada).trim().toLowerCase();
  if (indiceEtapa_(id) === -1) throw new Error('Etapa desconocida: ' + solicitada);
  return id;
}

function indiceEtapa_(id) {
  for (var i = 0; i < ETAPAS.length; i++) {
    if (ETAPAS[i].id === id) return i;
  }
  return -1;
}

function etapaSiguiente_(id) {
  var i = indiceEtapa_(id);
  return (i >= 0 && i < ETAPAS.length - 1) ? ETAPAS[i + 1] : null;
}

function esPrimeraEtapa_(id) {
  return indiceEtapa_(id) === 0;
}

function primeraEtapa_() {
  return ETAPAS[0];
}

/** Encabezados que la hoja de una etapa debe tener. */
function encabezados_(etapa) {
  var cols = [etapa.colNumero];
  etapa.campos.forEach(function (c) { cols.push(c.columna); });
  cols.push(etapa.colEstado);
  cols = cols.concat(COL_CONTROL);
  if (esPrimeraEtapa_(etapa.id)) cols = cols.concat(COL_CONTROL_PRIMERA);
  return cols;
}

// ======================================================================
// Setup.gs
// ======================================================================

/**
 * Creación y reparación de las hojas del flujo.
 *
 * Ejecutar `instalarSolicitudes` una vez, y cada vez que cambie el esquema de
 * campos en Config.gs. Nunca borra ni reordena columnas existentes: solo agrega
 * al final las que falten y aplica formato/validaciones.
 */

function instalarSolicitudes() {
  var ss = ss_();
  ETAPAS.forEach(function (etapa) {
    var hoja = ss.getSheetByName(etapa.hoja) || ss.insertSheet(etapa.hoja);
    prepararHojaEtapa_(hoja, etapa);
  });
  prepararHojaHistorial_(ss);
  sincronizarCorrelativo_();
  SpreadsheetApp.flush();
  return 'Listo. Hojas: ' + ETAPAS.map(function (e) { return e.hoja; }).join(' > ') +
    ' + ' + CFG.HOJA_HISTORIAL;
}

function prepararHojaEtapa_(hoja, etapa) {
  var esperados = encabezados_(etapa);
  var actuales = leerEncabezados_(hoja);

  if (!actuales.join('')) {
    hoja.getRange(1, 1, 1, esperados.length).setValues([esperados]);
    actuales = esperados.slice();
  } else {
    var presentes = {};
    actuales.forEach(function (h) { if (h) presentes[clave_(h)] = true; });
    var faltantes = esperados.filter(function (h) { return !presentes[clave_(h)]; });
    if (faltantes.length) {
      hoja.getRange(1, actuales.length + 1, 1, faltantes.length).setValues([faltantes]);
      actuales = actuales.concat(faltantes);
    }
  }

  hoja.getRange(1, 1, 1, actuales.length)
    .setFontWeight('bold')
    .setBackground('#1f3864')
    .setFontColor('#ffffff')
    .setVerticalAlignment('middle')
    .setWrap(true);
  hoja.setFrozenRows(1);
  hoja.setRowHeight(1, 34);

  var mapa = mapaColumnas_(hoja);
  aplicarValidacionEstado_(hoja, mapa, etapa);
  aplicarFormatos_(hoja, mapa, etapa);
}

function aplicarValidacionEstado_(hoja, mapa, etapa) {
  var col = colDe_(mapa, etapa.colEstado);
  if (!col) return;
  var filas = Math.max(hoja.getMaxRows() - 1, 1);
  var regla = SpreadsheetApp.newDataValidation()
    .requireValueInList(ESTADOS_LISTA, true)
    .setAllowInvalid(false)
    .setHelpText('Seleccione ' + ESTADOS_LISTA.join(' / ') + '. Vacío = pendiente.')
    .build();
  hoja.getRange(2, col, filas, 1).setDataValidation(regla);
}

function aplicarFormatos_(hoja, mapa, etapa) {
  var filas = Math.max(hoja.getMaxRows() - 1, 1);

  ['Fecha Registro', 'Fecha Estado'].forEach(function (h) {
    var c = colDe_(mapa, h);
    if (c) hoja.getRange(2, c, filas, 1).setNumberFormat('dd-MM-yyyy HH:mm');
  });

  etapa.campos.forEach(function (campo) {
    var c = colDe_(mapa, campo.columna);
    if (!c) return;
    if (campo.tipo === 'fecha') hoja.getRange(2, c, filas, 1).setNumberFormat('dd-MM-yyyy');
    if (campo.tipo === 'numero') hoja.getRange(2, c, filas, 1).setNumberFormat('#,##0.##');
    if (campo.tipo === 'lista' && campo.opciones && campo.opciones.length) {
      hoja.getRange(2, c, filas, 1).setDataValidation(
        SpreadsheetApp.newDataValidation()
          .requireValueInList(campo.opciones, true)
          .setAllowInvalid(false)
          .build()
      );
    }
  });

  var colNum = colDe_(mapa, etapa.colNumero);
  if (colNum) {
    hoja.getRange(2, colNum, filas, 1)
      .setNumberFormat('@')
      .setHorizontalAlignment('left')
      .setFontWeight('bold');
  }
}

function prepararHojaHistorial_(ss) {
  var hoja = ss.getSheetByName(CFG.HOJA_HISTORIAL) || ss.insertSheet(CFG.HOJA_HISTORIAL);
  if (!leerEncabezados_(hoja).join('')) {
    hoja.getRange(1, 1, 1, COL_HISTORIAL.length).setValues([COL_HISTORIAL]);
  }
  hoja.getRange(1, 1, 1, COL_HISTORIAL.length)
    .setFontWeight('bold')
    .setBackground('#37474f')
    .setFontColor('#ffffff');
  hoja.setFrozenRows(1);
  hoja.getRange(2, 1, Math.max(hoja.getMaxRows() - 1, 1), 1).setNumberFormat('dd-MM-yyyy HH:mm:ss');
  return hoja;
}

/**
 * Alinea el correlativo guardado en propiedades con el mayor número existente
 * en las hojas, para que jamás se repita un N° de solicitud.
 */
function sincronizarCorrelativo_() {
  var maximo = 0;
  ETAPAS.forEach(function (etapa) {
    var hoja = ss_().getSheetByName(etapa.hoja);
    if (!hoja || hoja.getLastRow() < 2) return;
    var col = colDe_(mapaColumnas_(hoja), etapa.colNumero);
    if (!col) return;
    hoja.getRange(2, col, hoja.getLastRow() - 1, 1).getValues().forEach(function (f) {
      var n = correlativoDe_(f[0]);
      if (n > maximo) maximo = n;
    });
  });
  var props = PropertiesService.getScriptProperties();
  var guardado = parseInt(props.getProperty(CFG.PROP_CORRELATIVO) || '0', 10) || 0;
  if (maximo > guardado) props.setProperty(CFG.PROP_CORRELATIVO, String(maximo));
  return Math.max(maximo, guardado);
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Solicitudes')
    .addItem('Instalar / reparar hojas', 'instalarSolicitudes')
    .addItem('Ver enlaces de los formularios', 'mostrarUrlsFormularios')
    .addToUi();
}

function mostrarUrlsFormularios() {
  var base = '';
  try { base = ScriptApp.getService().getUrl() || ''; } catch (e) { base = ''; }

  var partes = ETAPAS.map(function (e) {
    var url = (URLS_FORMULARIOS && URLS_FORMULARIOS[e.id]) || '';
    if (!url && base && !ETAPA_FIJA) url = base + '?form=' + e.id;
    if (!url && base && ETAPA_FIJA === e.id) url = base;
    return '<p style="font:13px Arial"><b>' + e.titulo + '</b><br>' +
      (url
        ? '<a href="' + url + '" target="_blank">' + url + '</a>'
        : '<i style="color:#777">sin publicar. Si usas un despliegue por formulario, ' +
          'pega su URL en URLS_FORMULARIOS (Config.gs).</i>') +
      '</p>';
  });

  var encabezado = base || (URLS_FORMULARIOS && (URLS_FORMULARIOS.costos || URLS_FORMULARIOS.td))
    ? '<p style="font:14px Arial">Un enlace por equipo:</p>'
    : '<p style="font:14px Arial">Primero publica el proyecto: ' +
      '<i>Implementar &gt; Nueva implementación &gt; Aplicación web</i>.</p>';

  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput(encabezado + partes.join('')).setWidth(620).setHeight(320),
    'Formularios del flujo'
  );
}

// ======================================================================
// Solicitudes.gs
// ======================================================================

/**
 * Núcleo del flujo: lectura/escritura en las hojas, correlativo, transiciones
 * de estado e historial. Todas las funciones `api*` son las que invoca el HTML
 * mediante google.script.run.
 */

/* ------------------------------------------------------------------ *
 * Utilidades de hoja
 * ------------------------------------------------------------------ */

function ss_() {
  return SpreadsheetApp.openById(CFG.SPREADSHEET_ID);
}

function tz_() {
  return ss_().getSpreadsheetTimeZone() || Session.getScriptTimeZone() || 'America/Santiago';
}

/** Normaliza un encabezado para comparar sin importar mayúsculas, tildes ni espacios. */
function clave_(valor) {
  return String(valor == null ? '' : valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function leerEncabezados_(hoja) {
  var ancho = hoja.getLastColumn();
  if (!ancho || hoja.getLastRow() < 1) return [];
  return hoja.getRange(1, 1, 1, ancho).getValues()[0].map(function (v) {
    return String(v == null ? '' : v).trim();
  });
}

/** { claveNormalizada: nroColumna(1-based) } */
function mapaColumnas_(hoja) {
  var mapa = {};
  leerEncabezados_(hoja).forEach(function (h, i) {
    var k = clave_(h);
    if (k && !mapa[k]) mapa[k] = i + 1;
  });
  return mapa;
}

function colDe_(mapa, nombre) {
  return mapa[clave_(nombre)] || 0;
}

function hojaDe_(etapa) {
  var hoja = ss_().getSheetByName(etapa.hoja);
  if (!hoja) throw new Error('No existe la hoja "' + etapa.hoja + '". Ejecuta Solicitudes > Instalar / reparar hojas.');
  return hoja;
}

/** Contexto de una hoja: filas indexadas por número de solicitud. */
function ctxEtapa_(etapa) {
  var hoja = hojaDe_(etapa);
  var mapa = mapaColumnas_(hoja);
  var colNum = colDe_(mapa, etapa.colNumero);
  if (!colNum) {
    throw new Error('La hoja "' + etapa.hoja + '" no tiene la columna "' + etapa.colNumero + '".');
  }
  var ctx = { etapa: etapa, hoja: hoja, mapa: mapa, colNumero: colNum, filas: {} };
  var ultima = hoja.getLastRow();
  if (ultima < 2) return ctx;
  var ancho = hoja.getLastColumn();
  hoja.getRange(2, 1, ultima - 1, ancho).getValues().forEach(function (valores, i) {
    var numero = String(valores[colNum - 1] == null ? '' : valores[colNum - 1]).trim();
    if (!numero) return;
    ctx.filas[numero] = { indice: i + 2, valores: valores };
  });
  return ctx;
}

function ctxTodas_() {
  var ctxs = {};
  ETAPAS.forEach(function (e) { ctxs[e.id] = ctxEtapa_(e); });
  return ctxs;
}

/* ------------------------------------------------------------------ *
 * Valores
 * ------------------------------------------------------------------ */

function valorDe_(ctx, numero, columna) {
  var fila = ctx.filas[numero];
  if (!fila) return '';
  var c = colDe_(ctx.mapa, columna);
  if (!c) return '';
  var v = fila.valores[c - 1];
  return v == null ? '' : v;
}

function textoDe_(ctx, numero, columna) {
  var v = valorDe_(ctx, numero, columna);
  if (v instanceof Date) return Utilities.formatDate(v, tz_(), 'dd-MM-yyyy HH:mm');
  return String(v).trim();
}

/** Convierte el valor del formulario al tipo que corresponde escribir en la hoja. */
function valorParaHoja_(campo, valor) {
  var texto = String(valor == null ? '' : valor).trim();
  if (!texto) return '';
  if (campo.tipo === 'numero') {
    var n = Number(texto.replace(/\./g, '').replace(',', '.'));
    return isNaN(n) ? texto : n;
  }
  if (campo.tipo === 'fecha') {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
    return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : texto;
  }
  return texto;
}

/** Convierte el valor de la hoja al formato que espera el formulario. */
function valorParaFormulario_(campo, valor) {
  if (valor == null || valor === '') return '';
  if (valor instanceof Date) {
    return campo.tipo === 'fecha'
      ? Utilities.formatDate(valor, tz_(), 'yyyy-MM-dd')
      : Utilities.formatDate(valor, tz_(), 'dd-MM-yyyy HH:mm');
  }
  return String(valor);
}

/**
 * Escribe una sola celda por nombre de columna. Si la columna no existe en la
 * hoja (columna de control opcional que el usuario borró) simplemente no escribe:
 * el dato igual queda registrado en la hoja Historial.
 */
function escribirCelda_(ctx, indiceFila, columna, valor) {
  var c = colDe_(ctx.mapa, columna);
  if (!c) return;
  ctx.hoja.getRange(indiceFila, c).setValue(valor);
}

/** Devuelve el índice de fila de la solicitud en la hoja; la crea si no existe. */
function filaDe_(ctx, numero) {
  if (ctx.filas[numero]) return ctx.filas[numero].indice;
  var indice = Math.max(ctx.hoja.getLastRow(), 1) + 1;
  ctx.hoja.getRange(indice, ctx.colNumero).setValue(numero);
  ctx.filas[numero] = { indice: indice, valores: [] };
  return indice;
}

/* ------------------------------------------------------------------ *
 * Número de solicitud
 * ------------------------------------------------------------------ */

function formatearNumero_(correlativo) {
  var s = String(correlativo);
  while (s.length < CFG.DIGITOS_CORRELATIVO) s = '0' + s;
  return CFG.PREFIJO_SOLICITUD + s;
}

function correlativoDe_(valor) {
  var m = /(\d+)\s*$/.exec(String(valor == null ? '' : valor).trim());
  return m ? parseInt(m[1], 10) : 0;
}

/** Correlativo único. Debe llamarse dentro del lock de `apiGuardar`. */
function nuevoNumero_() {
  var props = PropertiesService.getScriptProperties();
  var actual = parseInt(props.getProperty(CFG.PROP_CORRELATIVO) || '0', 10) || 0;
  var enHojas = sincronizarCorrelativo_();
  var siguiente = Math.max(actual, enHojas) + 1;
  props.setProperty(CFG.PROP_CORRELATIVO, String(siguiente));
  return formatearNumero_(siguiente);
}

/* ------------------------------------------------------------------ *
 * Usuario y acceso
 * ------------------------------------------------------------------ */

function usuario_() {
  try {
    return Session.getActiveUser().getEmail() || '';
  } catch (e) {
    return '';
  }
}

function puedeAcceder_(etapaId) {
  var permitidos = (ACCESOS[etapaId] || []).map(clave_).filter(String);
  if (!permitidos.length) return true;
  return permitidos.indexOf(clave_(usuario_())) !== -1;
}

function exigirAcceso_(etapaId) {
  if (!puedeAcceder_(etapaId)) {
    throw new Error('Tu cuenta (' + (usuario_() || 'anónima') + ') no tiene acceso al formulario ' +
      etapaPorId_(etapaId).titulo + '.');
  }
}

/* ------------------------------------------------------------------ *
 * Historial
 * ------------------------------------------------------------------ */

function hojaHistorial_() {
  var ss = ss_();
  return ss.getSheetByName(CFG.HOJA_HISTORIAL) || prepararHojaHistorial_(ss);
}

function leerHistorial_() {
  var hoja = hojaHistorial_();
  if (hoja.getLastRow() < 2) return [];
  var valores = hoja.getRange(2, 1, hoja.getLastRow() - 1, COL_HISTORIAL.length).getValues();
  var eventos = [];
  valores.forEach(function (f) {
    var numero = String(f[1] || '').trim();
    if (!numero) return;
    eventos.push({
      fecha: f[0] instanceof Date ? Utilities.formatDate(f[0], tz_(), 'dd-MM-yyyy HH:mm') : String(f[0] || ''),
      numero: numero,
      etapa: String(f[2] || ''),
      etapaId: etapaIdPorTitulo_(f[2]),
      accion: String(f[3] || ''),
      estado: String(f[4] || '').trim(),
      comentario: String(f[5] || ''),
      usuario: String(f[6] || ''),
      version: Number(f[7] || 1)
    });
  });
  return eventos;
}

function etapaIdPorTitulo_(titulo) {
  var k = clave_(titulo);
  for (var i = 0; i < ETAPAS.length; i++) {
    if (clave_(ETAPAS[i].titulo) === k || clave_(ETAPAS[i].hoja) === k || ETAPAS[i].id === k) {
      return ETAPAS[i].id;
    }
  }
  return '';
}

function registrarHistorial_(numero, etapa, accion, estado, comentario, version) {
  hojaHistorial_().appendRow([
    new Date(), numero, etapa.titulo, accion, estado || '', comentario || '', usuario_(), version
  ]);
}

/**
 * Estado de devolución de una solicitud, derivado del historial.
 * Un guardado en Costos limpia la marca; un "Modificado" en cualquier etapa la activa.
 */
function devolucionDe_(numero, eventos) {
  var res = { devueltoPor: '', motivo: '', version: 1 };
  eventos.forEach(function (ev) {
    if (ev.numero !== numero) return;
    if (ev.etapaId === primeraEtapa_().id) { res.devueltoPor = ''; res.motivo = ''; }
    if (ev.estado === ESTADOS.MODIFICADO) {
      res.devueltoPor = ev.etapaId || primeraEtapa_().id;
      res.motivo = ev.comentario;
      res.version += 1;
    }
  });
  return res;
}

/* ------------------------------------------------------------------ *
 * Flujo
 * ------------------------------------------------------------------ */

function estadoEnHoja_(ctx, etapa, numero) {
  return String(valorDe_(ctx, numero, etapa.colEstado) || '').trim();
}

/**
 * Situación actual de una solicitud:
 *  - etapaActual: hoja que debe actuar ahora
 *  - cerrada / resultado
 *  - devueltoPor / motivoDevolucion: viene de un "Modificado"
 */
function flujoDe_(numero, ctxs, eventos) {
  var primera = primeraEtapa_();
  var res = {
    numero: numero,
    existe: false,
    etapaActual: primera.id,
    cerrada: false,
    resultado: '',
    estados: {},
    devueltoPor: '',
    motivoDevolucion: '',
    version: 1
  };

  if (!ctxs[primera.id].filas[numero]) return res;
  res.existe = true;

  var dev = devolucionDe_(numero, eventos || []);
  res.devueltoPor = dev.devueltoPor;
  res.motivoDevolucion = dev.motivo;
  res.version = dev.version;

  ETAPAS.forEach(function (e) { res.estados[e.id] = estadoEnHoja_(ctxs[e.id], e, numero); });

  for (var i = 0; i < ETAPAS.length; i++) {
    var e = ETAPAS[i];
    var est = res.estados[e.id];

    if (clave_(est) === clave_(ESTADOS.RECHAZADO)) {
      res.etapaActual = e.id;
      res.cerrada = true;
      res.resultado = 'Rechazada en ' + e.titulo;
      return res;
    }
    // "Modificado" escrito a mano en la hoja: se trata como devolución.
    if (clave_(est) === clave_(ESTADOS.MODIFICADO)) {
      res.etapaActual = primera.id;
      res.devueltoPor = res.devueltoPor || e.id;
      res.resultado = 'Devuelta para modificación desde ' + e.titulo;
      return res;
    }
    if (clave_(est) !== clave_(ESTADOS.APROBADO)) {
      res.etapaActual = e.id;
      res.resultado = res.devueltoPor
        ? 'Devuelta para modificación desde ' + etapaPorId_(res.devueltoPor).titulo
        : 'Pendiente en ' + e.titulo;
      return res;
    }
  }

  res.etapaActual = ETAPAS[ETAPAS.length - 1].id;
  res.cerrada = true;
  res.resultado = 'Finalizada';
  return res;
}

function datosEtapa_(etapa, ctx, numero) {
  var datos = {};
  etapa.campos.forEach(function (campo) {
    datos[campo.id] = valorParaFormulario_(campo, valorDe_(ctx, numero, campo.columna));
  });
  return {
    etapaId: etapa.id,
    titulo: etapa.titulo,
    existe: !!ctx.filas[numero],
    datos: datos,
    estado: estadoEnHoja_(ctx, etapa, numero),
    comentario: textoDe_(ctx, numero, 'Comentario Estado'),
    revisadoPor: textoDe_(ctx, numero, 'Revisado Por'),
    fechaEstado: textoDe_(ctx, numero, 'Fecha Estado'),
    registradoPor: textoDe_(ctx, numero, 'Registrado Por'),
    fechaRegistro: textoDe_(ctx, numero, 'Fecha Registro')
  };
}

function resumenSolicitud_(numero, ctxs, eventos) {
  var flujo = flujoDe_(numero, ctxs, eventos);
  var primera = primeraEtapa_();
  var ctxP = ctxs[primera.id];
  var etiquetas = [];
  primera.campos.slice(0, 2).forEach(function (campo) {
    var v = valorParaFormulario_(campo, valorDe_(ctxP, numero, campo.columna));
    if (v) etiquetas.push(v);
  });
  return {
    numero: numero,
    resumen: etiquetas.join(' · '),
    etapaActual: flujo.etapaActual,
    resultado: flujo.resultado,
    cerrada: flujo.cerrada,
    devueltoPor: flujo.devueltoPor,
    version: flujo.version
  };
}

/* ------------------------------------------------------------------ *
 * API para los formularios
 * ------------------------------------------------------------------ */

/** Metadatos del formulario de una etapa + su bandeja de solicitudes. */
function apiContexto(etapaId) {
  etapaId = etapaEfectiva_(etapaId);
  var etapa = etapaPorId_(etapaId);
  exigirAcceso_(etapaId);
  return {
    etapa: {
      id: etapa.id,
      titulo: etapa.titulo,
      hoja: etapa.hoja,
      descripcion: etapa.descripcion,
      esPrimera: esPrimeraEtapa_(etapa.id),
      siguiente: etapaSiguiente_(etapa.id) ? etapaSiguiente_(etapa.id).titulo : '',
      campos: etapa.campos.map(function (c) {
        return {
          id: c.id, etiqueta: c.etiqueta, tipo: c.tipo,
          requerido: !!c.requerido, opciones: c.opciones || [], ayuda: c.ayuda || ''
        };
      })
    },
    etapas: ETAPAS.map(function (e) { return { id: e.id, titulo: e.titulo }; }),
    estados: ESTADOS_LISTA,
    usuario: usuario_(),
    bandeja: apiBandeja(etapaId)
  };
}

/** Solicitudes que esta etapa debe atender ahora. */
function apiBandeja(etapaId) {
  etapaId = etapaEfectiva_(etapaId);
  var etapa = etapaPorId_(etapaId);
  exigirAcceso_(etapaId);
  var ctxs = ctxTodas_();
  var eventos = leerHistorial_();
  var numeros = Object.keys(ctxs[primeraEtapa_().id].filas);
  var lista = [];
  numeros.forEach(function (numero) {
    var r = resumenSolicitud_(numero, ctxs, eventos);
    if (!r.cerrada && r.etapaActual === etapa.id) lista.push(r);
  });
  lista.sort(function (a, b) { return correlativoDe_(b.numero) - correlativoDe_(a.numero); });
  return lista;
}

/** Ficha completa de una solicitud: su etapa, el avance de las demás y el historial. */
function apiObtener(etapaId, numero) {
  etapaId = etapaEfectiva_(etapaId);
  exigirAcceso_(etapaId);
  numero = String(numero || '').trim();
  if (!numero) throw new Error('Falta el número de solicitud.');

  var ctxs = ctxTodas_();
  var eventos = leerHistorial_();
  var flujo = flujoDe_(numero, ctxs, eventos);
  if (!flujo.existe) throw new Error('La solicitud ' + numero + ' no existe.');

  var avance = ETAPAS.map(function (e) {
    var d = datosEtapa_(e, ctxs[e.id], numero);
    d.campos = e.campos.map(function (c) { return { id: c.id, etiqueta: c.etiqueta }; });
    return d;
  });

  return {
    numero: numero,
    flujo: {
      etapaActual: flujo.etapaActual,
      etapaActualTitulo: etapaPorId_(flujo.etapaActual).titulo,
      cerrada: flujo.cerrada,
      resultado: flujo.resultado,
      devueltoPor: flujo.devueltoPor,
      devueltoPorTitulo: flujo.devueltoPor ? etapaPorId_(flujo.devueltoPor).titulo : '',
      motivoDevolucion: flujo.motivoDevolucion,
      version: flujo.version,
      estados: flujo.estados
    },
    avance: avance,
    puedeEditar: !flujo.cerrada && flujo.etapaActual === etapaId,
    historial: eventos.filter(function (ev) { return ev.numero === numero; })
  };
}

/**
 * Guarda el formulario de una etapa y aplica la transición de estado.
 *
 * payload = { etapaId, numero, datos:{campoId:valor}, estado, comentario }
 */
function apiGuardar(payload) {
  payload = payload || {};
  var etapaId = etapaEfectiva_(payload.etapaId);
  var etapa = etapaPorId_(etapaId);
  exigirAcceso_(etapaId);

  var estado = String(payload.estado || '').trim();
  if (ESTADOS_LISTA.map(clave_).indexOf(clave_(estado)) === -1) {
    throw new Error('Debes seleccionar un estado: ' + ESTADOS_LISTA.join(', ') + '.');
  }
  estado = ESTADOS_LISTA[ESTADOS_LISTA.map(clave_).indexOf(clave_(estado))];

  var comentario = String(payload.comentario || '').trim();
  if (clave_(estado) !== clave_(ESTADOS.APROBADO) && !comentario) {
    throw new Error('Indica el motivo para el estado "' + estado + '".');
  }

  var datos = payload.datos || {};
  var faltantes = [];
  etapa.campos.forEach(function (campo) {
    if (campo.requerido && !String(datos[campo.id] == null ? '' : datos[campo.id]).trim()) {
      faltantes.push(campo.etiqueta);
    }
  });
  if (faltantes.length) throw new Error('Completa los campos obligatorios: ' + faltantes.join(', ') + '.');

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(CFG.SEGUNDOS_LOCK * 1000)) {
    throw new Error('El sistema está procesando otra solicitud. Intenta nuevamente en unos segundos.');
  }

  try {
    var ctxs = ctxTodas_();
    var eventos = leerHistorial_();
    var numero = String(payload.numero || '').trim();
    var esNueva = false;

    if (!numero) {
      if (!esPrimeraEtapa_(etapaId)) {
        throw new Error('El formulario ' + etapa.titulo + ' solo puede trabajar sobre una solicitud existente.');
      }
      numero = nuevoNumero_();
      esNueva = true;
    } else {
      var flujoPrevio = flujoDe_(numero, ctxs, eventos);
      if (!flujoPrevio.existe) throw new Error('La solicitud ' + numero + ' no existe.');
      if (flujoPrevio.cerrada) throw new Error('La solicitud ' + numero + ' está cerrada (' + flujoPrevio.resultado + ').');
      if (flujoPrevio.etapaActual !== etapaId) {
        throw new Error('La solicitud ' + numero + ' está en ' +
          etapaPorId_(flujoPrevio.etapaActual).titulo + ', no en ' + etapa.titulo + '.');
      }
    }

    var version = devolucionDe_(numero, eventos).version;
    if (clave_(estado) === clave_(ESTADOS.MODIFICADO)) version += 1;

    var ctx = ctxs[etapaId];
    var fila = filaDe_(ctx, numero);
    var ahora = new Date();

    // 1) Campos del formulario.
    etapa.campos.forEach(function (campo) {
      escribirCelda_(ctx, fila, campo.columna, valorParaHoja_(campo, datos[campo.id]));
    });

    // 2) Datos de registro.
    if (esNueva || !textoDe_(ctx, numero, 'Fecha Registro')) {
      escribirCelda_(ctx, fila, 'Fecha Registro', ahora);
      escribirCelda_(ctx, fila, 'Registrado Por', usuario_());
    }

    // 3) Estado. "Modificado" nunca queda escrito: reinicia el flujo.
    var esModificado = clave_(estado) === clave_(ESTADOS.MODIFICADO);
    escribirCelda_(ctx, fila, etapa.colEstado, esModificado ? '' : estado);
    escribirCelda_(ctx, fila, 'Comentario Estado', comentario);
    escribirCelda_(ctx, fila, 'Revisado Por', usuario_());
    escribirCelda_(ctx, fila, 'Fecha Estado', ahora);

    // 4) Al reenviar Costos se limpia la marca de devolución previa.
    if (esPrimeraEtapa_(etapaId)) {
      var ctxP = ctxs[primeraEtapa_().id];
      var filaP = filaDe_(ctxP, numero);
      escribirCelda_(ctxP, filaP, 'Devuelto Por', '');
      escribirCelda_(ctxP, filaP, 'Motivo Devolución', '');
      escribirCelda_(ctxP, filaP, 'Versión', version);
    }

    var mensaje;

    if (esModificado) {
      // Vuelve SIEMPRE a la primera hoja y se resetean los estados de las 3 hojas.
      reiniciarEstados_(ctxs, numero);
      marcarDevolucion_(ctxs, numero, etapa, comentario, version);
      registrarHistorial_(numero, etapa, 'Devuelta para modificación', ESTADOS.MODIFICADO, comentario, version);
      mensaje = 'Solicitud ' + numero + ' devuelta a ' + primeraEtapa_().titulo +
        '. Se reiniciaron los estados de las ' + ETAPAS.length + ' hojas.';

    } else if (clave_(estado) === clave_(ESTADOS.RECHAZADO)) {
      registrarHistorial_(numero, etapa, 'Rechazada', ESTADOS.RECHAZADO, comentario, version);
      mensaje = 'Solicitud ' + numero + ' rechazada en ' + etapa.titulo + '. El flujo termina aquí.';

    } else {
      var siguiente = etapaSiguiente_(etapaId);
      if (siguiente) {
        // A la hoja siguiente viaja únicamente el número de solicitud.
        filaDe_(ctxs[siguiente.id], numero);
        registrarHistorial_(numero, etapa, 'Aprobada, pasa a ' + siguiente.titulo, ESTADOS.APROBADO, comentario, version);
        mensaje = 'Solicitud ' + numero + ' aprobada. Pasa a ' + siguiente.titulo + '.';
      } else {
        registrarHistorial_(numero, etapa, 'Aprobada, flujo finalizado', ESTADOS.APROBADO, comentario, version);
        mensaje = 'Solicitud ' + numero + ' aprobada en ' + etapa.titulo + '. Flujo finalizado.';
      }
    }

    SpreadsheetApp.flush();
    return { ok: true, numero: numero, estado: estado, mensaje: mensaje, version: version };

  } finally {
    lock.releaseLock();
  }
}

/** Deja en blanco el estado de las 3 hojas para que el flujo se rehaga desde Costos. */
function reiniciarEstados_(ctxs, numero) {
  ETAPAS.forEach(function (e) {
    var ctx = ctxs[e.id];
    if (!ctx.filas[numero]) return;   // no se crean filas que aún no existen
    var fila = ctx.filas[numero].indice;
    escribirCelda_(ctx, fila, e.colEstado, '');
  });
}

/** Marca en Costos quién devolvió la solicitud y por qué. */
function marcarDevolucion_(ctxs, numero, etapaOrigen, motivo, version) {
  var primera = primeraEtapa_();
  var ctxP = ctxs[primera.id];
  var fila = filaDe_(ctxP, numero);
  escribirCelda_(ctxP, fila, 'Devuelto Por', etapaOrigen.titulo);
  escribirCelda_(ctxP, fila, 'Motivo Devolución', motivo);
  escribirCelda_(ctxP, fila, 'Versión', version);
}

// ======================================================================
// WebApp.gs
// ======================================================================

/**
 * Publicación web. Hay dos formas de montarlo (ver README):
 *
 * A) Un enlace por formulario  (ETAPA_FIJA definida en Config.gs)
 *    Cada despliegue atiende una sola etapa y la impone en el servidor:
 *    .../exec  -> siempre el formulario de esa etapa, se escriba lo que se escriba en la URL.
 *
 * B) Un solo despliegue para los tres (ETAPA_FIJA = '')
 *    .../exec?form=costos | ?form=td | ?form=produccion
 *    Sin parámetro muestra el selector.
 */

function doGet(e) {
  var params = (e && e.parameter) || {};

  if (ETAPA_FIJA) return renderFormulario(ETAPA_FIJA);

  var etapaId = String(params.form || params.etapa || '').trim().toLowerCase();
  if (etapaId && indiceEtapa_(etapaId) !== -1) return renderFormulario(etapaId);

  var inicio = HtmlService.createTemplate(HTML_INICIO);
  inicio.etapas = ETAPAS.map(function (x) {
    return {
      id: x.id,
      titulo: x.titulo,
      descripcion: x.descripcion,
      hoja: x.hoja,
      url: (URLS_FORMULARIOS && URLS_FORMULARIOS[x.id]) || ('?form=' + x.id)
    };
  });
  return inicio.evaluate()
    .setTitle('Solicitudes · Flujo Costos → T&D → Producción')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Entrega el formulario de una etapa. Es pública para que los proyectos
 * lanzadores (un enlace por formulario, opción A del README) puedan llamarla
 * cuando este proyecto se usa como biblioteca.
 */
function renderFormulario(etapaId) {
  var etapa = etapaPorId_(etapaEfectiva_(etapaId));
  var t = HtmlService.createTemplate(HTML_FORMULARIO);
  t.etapaId = etapa.id;
  t.etapaTitulo = etapa.titulo;
  return t.evaluate()
    .setTitle('Solicitud · ' + etapa.titulo)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include(nombre) {
  return HTML_PARCIALES[nombre] || '';
}
