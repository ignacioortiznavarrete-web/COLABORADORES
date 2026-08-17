/**
 * MESA TRADING · madera — ARCHIVO ÚNICO
 *
 * Generado por fuente/construir.js. No lo edites a mano: edita los archivos
 * de mesatrading/fuente y vuelve a generarlo.
 *
 * Pega este archivo como único Código.gs del proyecto de Apps Script.
 * No necesitas crear los .html: van incrustados más abajo.
 *
 * Después de pegarlo, ejecuta la función `instalarMesaTrading` una vez.
 */

// ======================================================================
// HTML incrustado (equivalen a los archivos .html)
// ======================================================================

const HTML_ESTILOS = `<style>
  /*
    Mesa Trading. Dos contextos en la misma hoja de estilos:

      - la mesa de trabajo: densa, clara, para operar todo el día;
      - el modo reunión: oscuro y grande, para proyectar.

    Los colores de estado y de urgencia son los mismos que usa el código de
    Apps Script para pintar la planilla, así lo que se ve en pantalla y lo que
    se ve en Sheets coinciden.
  */

  :root {
    --ink: #16211F;
    --ink-suave: #3D4F4A;
    --muted: #6B7B76;
    --linea: #DCE4E1;
    --linea-fuerte: #C3D0CC;
    --panel: #FFFFFF;
    --fondo: #F2F5F4;
    --fondo-hover: #EAF1EE;
    --acento: #0E6E5C;
    --acento-oscuro: #0A5346;
    --acento-suave: #E1F0EB;
    --peligro: #A81E10;
    --alerta: #92500A;
    --ok: #17603A;

    --est-pendiente-bg: #FDE8C8;   --est-pendiente-tx: #7A4A05;
    --est-negociacion-bg: #D6E4FF; --est-negociacion-tx: #1B44A0;
    --est-asignado-bg: #DED8FB;    --est-asignado-tx: #4A2FA8;
    --est-confirmado-bg: #CDEBD8;  --est-confirmado-tx: #17603A;
    --est-cerrado-bg: #E4E8EB;     --est-cerrado-tx: #44525C;

    --urg-vencido-bg: #F9D2CE;  --urg-vencido-tx: #8C1D14;
    --urg-critico-bg: #FBDCC4;  --urg-critico-tx: #8A3D04;
    --urg-proximo-bg: #FCEFC2;  --urg-proximo-tx: #6B5104;
    --urg-holgado-bg: #E9EDEB;  --urg-holgado-tx: #475752;
    --urg-sin-fecha-bg: #EDEFF1;--urg-sin-fecha-tx: #5A666E;

    --radio: 10px;
    --sombra: 0 1px 2px rgba(16,32,28,.06), 0 4px 16px rgba(16,32,28,.05);
  }

  * { box-sizing: border-box; }

  html, body {
    margin: 0;
    height: 100%;
  }

  body {
    background: var(--fondo);
    color: var(--ink);
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 14px;
    line-height: 1.45;
    -webkit-font-smoothing: antialiased;
  }

  button, input, select, textarea { font: inherit; color: inherit; }
  button { cursor: pointer; }

  /* ---------------------------------------------------------------- base */

  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    min-height: 36px;
    padding: 0 14px;
    border: 1px solid transparent;
    border-radius: 8px;
    background: var(--acento);
    color: #fff;
    font-weight: 600;
    white-space: nowrap;
    transition: background .12s ease, border-color .12s ease;
  }
  .btn:hover { background: var(--acento-oscuro); }
  .btn:disabled { opacity: .5; cursor: not-allowed; }

  .btn.plano {
    background: var(--panel);
    color: var(--ink-suave);
    border-color: var(--linea-fuerte);
  }
  .btn.plano:hover { background: var(--fondo-hover); }

  .btn.fantasma {
    background: rgba(255,255,255,.12);
    color: #fff;
    border-color: rgba(255,255,255,.28);
  }
  .btn.fantasma:hover { background: rgba(255,255,255,.22); }

  .campo { display: block; margin-bottom: 12px; }
  /* Solo el primer span es el rótulo; los que vienen después son pistas. */
  .campo > span:first-child {
    display: block;
    margin-bottom: 5px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: .04em;
    text-transform: uppercase;
    color: var(--muted);
  }
  .campo input, .campo select, .campo textarea {
    width: 100%;
    min-height: 36px;
    padding: 7px 10px;
    border: 1px solid var(--linea-fuerte);
    border-radius: 8px;
    background: #fff;
  }
  .campo textarea { min-height: 74px; resize: vertical; line-height: 1.45; }
  .campo input:focus, .campo select:focus, .campo textarea:focus {
    outline: 2px solid var(--acento);
    outline-offset: -1px;
    border-color: var(--acento);
  }

  .pista {
    display: block;
    margin-top: 5px;
    font-size: 12px;
    font-weight: 400;
    letter-spacing: 0;
    text-transform: none;
    color: var(--muted);
  }
  .pista.ok { color: var(--ok); font-weight: 600; }
  .pista.aprox { color: var(--alerta); font-weight: 600; }

  .chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    max-width: 100%;
    padding: 3px 9px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 650;
    line-height: 1.5;
    white-space: nowrap;
  }
  .chip .punto {
    width: 9px; height: 9px;
    flex: 0 0 auto;
    border-radius: 50%;
    border: 1px solid rgba(0,0,0,.18);
  }
  .chip .txt { overflow: hidden; text-overflow: ellipsis; }

  .est-pendiente   { background: var(--est-pendiente-bg);   color: var(--est-pendiente-tx); }
  .est-negociacion { background: var(--est-negociacion-bg); color: var(--est-negociacion-tx); }
  .est-asignado    { background: var(--est-asignado-bg);    color: var(--est-asignado-tx); }
  .est-confirmado  { background: var(--est-confirmado-bg);  color: var(--est-confirmado-tx); }
  .est-cerrado     { background: var(--est-cerrado-bg);     color: var(--est-cerrado-tx); }

  .urg-vencido   { background: var(--urg-vencido-bg);   color: var(--urg-vencido-tx); }
  .urg-critico   { background: var(--urg-critico-bg);   color: var(--urg-critico-tx); }
  .urg-proximo   { background: var(--urg-proximo-bg);   color: var(--urg-proximo-tx); }
  .urg-holgado   { background: var(--urg-holgado-bg);   color: var(--urg-holgado-tx); }
  .urg-sin-fecha { background: var(--urg-sin-fecha-bg); color: var(--urg-sin-fecha-tx); }

  .vacio {
    padding: 34px 20px;
    text-align: center;
    color: var(--muted);
  }

  /* ------------------------------------------------------------ estructura */

  /* barra · kpis · avisos · herramientas · área de trabajo (la que se estira) */
  .app {
    display: grid;
    grid-template-rows: auto auto auto auto 1fr;
    height: 100%;
    min-height: 0;
  }

  .barra {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    padding: 13px 20px;
    background: var(--ink);
    color: #fff;
  }
  .barra h1 {
    margin: 0;
    font-size: 17px;
    font-weight: 700;
    letter-spacing: -.01em;
  }
  .barra .sub {
    margin-top: 2px;
    font-size: 12px;
    color: rgba(255,255,255,.62);
  }
  .barra .acciones { display: flex; gap: 8px; flex-wrap: wrap; }

  .kpis {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 10px;
    padding: 14px 20px 0;
  }
  .kpi {
    padding: 11px 13px;
    border: 1px solid var(--linea);
    border-radius: var(--radio);
    background: var(--panel);
    box-shadow: var(--sombra);
  }
  .kpi .rot {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: .04em;
    text-transform: uppercase;
    color: var(--muted);
  }
  .kpi .val {
    margin-top: 5px;
    font-size: 25px;
    font-weight: 700;
    line-height: 1.05;
    font-variant-numeric: tabular-nums;
    letter-spacing: -.02em;
  }
  .kpi .pie { margin-top: 2px; font-size: 12px; color: var(--muted); }
  .kpi.riesgo { border-color: #E9B4AD; background: #FEF6F5; }
  .kpi.riesgo .val { color: var(--peligro); }

  .avisos { padding: 12px 20px 0; display: grid; gap: 7px; }
  .aviso {
    display: flex;
    gap: 9px;
    align-items: flex-start;
    padding: 8px 12px;
    border: 1px solid #EBD9A8;
    border-left: 3px solid #C79A1E;
    border-radius: 8px;
    background: #FFFBEF;
    font-size: 13px;
    color: #6B5104;
  }

  .herramientas {
    display: flex;
    align-items: center;
    gap: 9px;
    flex-wrap: wrap;
    padding: 14px 20px;
  }
  .buscador {
    flex: 1 1 260px;
    min-width: 210px;
    min-height: 38px;
    padding: 8px 12px;
    border: 1px solid var(--linea-fuerte);
    border-radius: 9px;
    background: #fff;
  }
  .herramientas select {
    min-height: 38px;
    padding: 8px 10px;
    border: 1px solid var(--linea-fuerte);
    border-radius: 9px;
    background: #fff;
  }

  .pestanas { display: flex; gap: 6px; flex-wrap: wrap; }
  .pestana {
    min-height: 38px;
    padding: 0 12px;
    border: 1px solid var(--linea-fuerte);
    border-radius: 9px;
    background: #fff;
    color: var(--ink-suave);
    font-weight: 600;
  }
  .pestana .n {
    margin-left: 6px;
    font-variant-numeric: tabular-nums;
    color: var(--muted);
    font-weight: 700;
  }
  .pestana[aria-pressed="true"] {
    border-color: var(--acento);
    background: var(--acento-suave);
    color: var(--acento-oscuro);
  }
  .pestana[aria-pressed="true"] .n { color: var(--acento-oscuro); }

  .vistas { display: flex; border: 1px solid var(--linea-fuerte); border-radius: 9px; overflow: hidden; }
  .vistas button {
    min-height: 38px;
    padding: 0 13px;
    border: 0;
    background: #fff;
    color: var(--ink-suave);
    font-weight: 600;
  }
  .vistas button + button { border-left: 1px solid var(--linea-fuerte); }
  .vistas button[aria-pressed="true"] { background: var(--ink); color: #fff; }

  .area {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 400px;
    gap: 14px;
    min-height: 0;
    padding: 0 20px 20px;
  }
  .area.solo { grid-template-columns: minmax(0, 1fr); }

  .panel {
    min-height: 0;
    border: 1px solid var(--linea);
    border-radius: var(--radio);
    background: var(--panel);
    box-shadow: var(--sombra);
  }
  .scroll { overflow: auto; height: 100%; }

  /* ---------------------------------------------------------------- tabla */

  table { width: 100%; border-collapse: separate; border-spacing: 0; }
  thead th {
    position: sticky;
    top: 0;
    z-index: 2;
    padding: 9px 10px;
    background: #EDF2F0;
    border-bottom: 1px solid var(--linea-fuerte);
    text-align: left;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: .04em;
    text-transform: uppercase;
    color: var(--ink-suave);
    white-space: nowrap;
  }
  tbody td {
    padding: 9px 10px;
    border-bottom: 1px solid #EDF1EF;
    vertical-align: top;
  }
  tbody tr { cursor: pointer; }
  tbody tr:hover { background: var(--fondo-hover); }
  tbody tr[aria-selected="true"] { background: var(--acento-suave); }
  tbody tr[aria-selected="true"] td:first-child { box-shadow: inset 3px 0 0 var(--acento); }

  .celda-alerta { width: 4px; padding: 0 !important; }
  .marca { display: block; width: 4px; height: 100%; min-height: 42px; }
  .marca.alto  { background: var(--peligro); }
  .marca.medio { background: #D98324; }
  .marca.bajo  { background: #C9B037; }

  .fuerte { font-weight: 700; font-variant-numeric: tabular-nums; }
  .tenue { color: var(--muted); font-size: 12px; }
  .recorte {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .col-material { max-width: 260px; }
  .col-conversacion { max-width: 240px; }

  .barra-vol {
    margin-top: 4px;
    height: 4px;
    border-radius: 2px;
    background: #E3EAE7;
    overflow: hidden;
  }
  .barra-vol i { display: block; height: 100%; background: var(--acento); }

  /* La fecha de compromiso no se parte: "31-08-2026" en dos líneas se lee mal. */
  .compromiso { white-space: nowrap; }

  .desfase {
    display: inline-block;
    margin-top: 3px;
    padding: 1px 7px;
    border-radius: 999px;
    background: var(--urg-vencido-bg);
    color: var(--urg-vencido-tx);
    font-size: 11px;
    font-weight: 700;
  }
  .aprox {
    margin-left: 5px;
    font-size: 11px;
    color: var(--alerta);
    font-weight: 700;
  }

  /* -------------------------------------------------------------- detalle */

  .detalle { display: grid; grid-template-rows: auto 1fr; min-height: 0; }
  .detalle-cab {
    padding: 14px 16px;
    border-bottom: 1px solid var(--linea);
  }
  .detalle-cab h2 {
    margin: 0;
    font-size: 17px;
    font-variant-numeric: tabular-nums;
  }
  .detalle-cuerpo { overflow: auto; padding: 14px 16px; }

  .datos {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 14px;
  }
  .dato {
    padding: 8px 10px;
    border: 1px solid var(--linea);
    border-radius: 8px;
    background: #FAFCFB;
  }
  .dato b {
    display: block;
    margin-bottom: 2px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: .03em;
    text-transform: uppercase;
    color: var(--muted);
  }
  .dato span { font-weight: 650; }
  .dato.ancho { grid-column: 1 / -1; }

  .cadena { display: grid; gap: 5px; margin-bottom: 14px; }
  .cadena .paso {
    display: grid;
    grid-template-columns: 96px 1fr auto;
    gap: 9px;
    align-items: center;
    font-size: 12px;
  }
  .cadena .paso b { color: var(--muted); font-weight: 650; }
  .cadena .riel { height: 7px; border-radius: 4px; background: #E3EAE7; overflow: hidden; }
  .cadena .riel i { display: block; height: 100%; }
  .cadena .val { font-variant-numeric: tabular-nums; font-weight: 700; }

  .seccion {
    margin: 16px 0 9px;
    padding-top: 13px;
    border-top: 1px solid var(--linea);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: .05em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .areas { display: flex; gap: 6px; margin-bottom: 8px; }
  .areas button {
    flex: 1;
    min-height: 34px;
    border: 1px solid var(--linea-fuerte);
    border-radius: 8px;
    background: #fff;
    font-weight: 600;
    color: var(--ink-suave);
  }
  .areas button[aria-pressed="true"] { background: var(--ink); color: #fff; border-color: var(--ink); }

  .hilo { display: grid; gap: 9px; }
  .msj {
    padding: 9px 11px;
    border: 1px solid var(--linea);
    border-left: 3px solid var(--acento);
    border-radius: 8px;
    background: #FAFCFB;
  }
  .msj.compras { border-left-color: #8A5BD6; }
  .msj .meta {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 3px;
    font-size: 11px;
    color: var(--muted);
  }
  .msj .meta b { color: var(--ink-suave); }
  .msj .texto { white-space: pre-wrap; word-break: break-word; }

  /* -------------------------------------------------------------- tablero */

  .tablero {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: minmax(205px, 1fr);
    gap: 11px;
    height: 100%;
    padding: 12px;
    overflow: auto;
  }
  .columna {
    display: grid;
    grid-template-rows: auto 1fr;
    min-height: 0;
    border: 1px solid var(--linea);
    border-radius: var(--radio);
    background: #F7F9F8;
  }
  .columna.encima { border-color: var(--acento); background: var(--acento-suave); }
  .columna-cab {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 9px 11px;
    border-bottom: 1px solid var(--linea);
    font-weight: 700;
    font-size: 13px;
  }
  .columna-cab .m3 { font-size: 11px; color: var(--muted); font-weight: 650; }
  .columna-cuerpo { overflow: auto; padding: 9px; display: grid; gap: 8px; align-content: start; }

  .tarjeta {
    padding: 9px 11px;
    border: 1px solid var(--linea);
    border-left: 3px solid transparent;
    border-radius: 9px;
    background: #fff;
    cursor: grab;
    box-shadow: var(--sombra);
  }
  .tarjeta:active { cursor: grabbing; }
  .tarjeta[aria-selected="true"] { border-color: var(--acento); box-shadow: 0 0 0 2px var(--acento-suave); }
  .tarjeta.alto  { border-left-color: var(--peligro); }
  .tarjeta.medio { border-left-color: #D98324; }
  .tarjeta.bajo  { border-left-color: #C9B037; }
  .tarjeta .doc { font-weight: 700; font-variant-numeric: tabular-nums; }
  .tarjeta .mat { margin: 1px 0 6px; font-size: 12px; color: var(--muted); }
  .tarjeta .pie { display: flex; justify-content: space-between; gap: 8px; align-items: center; margin-top: 6px; }

  /* ---------------------------------------------------------- proveedores */

  .provs { padding: 14px; display: grid; gap: 9px; }
  .prov {
    display: grid;
    grid-template-columns: 14px 1fr 150px 90px 70px;
    gap: 11px;
    align-items: center;
    padding: 10px 12px;
    border: 1px solid var(--linea);
    border-radius: 9px;
    background: #fff;
  }
  .prov .tono { width: 14px; height: 30px; border-radius: 4px; border: 1px solid rgba(0,0,0,.12); }
  .prov .nom { font-weight: 700; }
  .prov .riel { height: 8px; border-radius: 4px; background: #E9EEEC; overflow: hidden; }
  .prov .riel i { display: block; height: 100%; }
  .prov .num { text-align: right; font-variant-numeric: tabular-nums; font-weight: 700; }
  .prov .avisa { text-align: right; font-size: 12px; color: var(--peligro); font-weight: 700; }

  /* ------------------------------------------------------------- reunión */

  .reunion {
    position: fixed;
    inset: 0;
    z-index: 60;
    display: none;
    grid-template-rows: auto 1fr auto;
    background: #0B1512;
    color: #EAF2EF;
  }
  .reunion.activa { display: grid; }

  .reunion-cab {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 18px 34px;
    border-bottom: 1px solid rgba(255,255,255,.1);
  }
  .reunion-cab .quien { font-size: 13px; color: rgba(255,255,255,.55); }
  .reunion-cab h2 { margin: 0; font-size: 20px; font-weight: 700; }

  .reunion-cuerpo { overflow: auto; padding: 34px 44px; }
  .reunion-pie {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 14px 34px;
    border-top: 1px solid rgba(255,255,255,.1);
    font-size: 13px;
    color: rgba(255,255,255,.55);
  }
  .reunion-pie .pasos { display: flex; gap: 6px; }
  .reunion-pie .paso {
    width: 26px; height: 4px;
    border-radius: 2px;
    background: rgba(255,255,255,.2);
    border: 0;
    padding: 0;
  }
  .reunion-pie .paso[aria-current="true"] { background: #5FD0AE; }

  .lamina-titulo {
    margin: 0 0 6px;
    font-size: clamp(30px, 4.6vw, 60px);
    font-weight: 800;
    letter-spacing: -.025em;
    line-height: 1.03;
  }
  .lamina-bajada {
    margin: 0 0 30px;
    font-size: clamp(15px, 1.5vw, 20px);
    color: rgba(255,255,255,.62);
  }

  .cifras {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
    gap: 16px;
  }
  .cifra {
    padding: 22px 24px;
    border: 1px solid rgba(255,255,255,.12);
    border-radius: 14px;
    background: rgba(255,255,255,.05);
  }
  .cifra .rot {
    font-size: 13px;
    font-weight: 650;
    letter-spacing: .05em;
    text-transform: uppercase;
    color: rgba(255,255,255,.55);
  }
  .cifra .val {
    margin-top: 8px;
    font-size: clamp(34px, 4.4vw, 56px);
    font-weight: 800;
    line-height: 1;
    font-variant-numeric: tabular-nums;
    letter-spacing: -.03em;
  }
  .cifra .pie { margin-top: 6px; font-size: 14px; color: rgba(255,255,255,.55); }
  .cifra.mala { border-color: rgba(255,140,120,.4); background: rgba(255,90,70,.12); }
  .cifra.mala .val { color: #FF9C88; }

  .fichas { display: grid; gap: 12px; }
  .ficha {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 18px;
    align-items: center;
    padding: 17px 22px;
    border: 1px solid rgba(255,255,255,.12);
    border-left: 4px solid #FF8A73;
    border-radius: 12px;
    background: rgba(255,255,255,.05);
  }
  .ficha .doc {
    font-size: clamp(19px, 2vw, 25px);
    font-weight: 750;
    font-variant-numeric: tabular-nums;
  }
  .ficha .mat { margin-top: 3px; font-size: 15px; color: rgba(255,255,255,.68); }
  .ficha .datos-linea {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 18px;
    margin-top: 9px;
    font-size: 14px;
    color: rgba(255,255,255,.75);
  }
  .ficha .datos-linea b { color: #EAF2EF; }
  .ficha .cifra-lado { text-align: right; }
  .ficha .cifra-lado .n {
    font-size: clamp(24px, 2.8vw, 36px);
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    line-height: 1;
  }
  .ficha .cifra-lado .u { font-size: 13px; color: rgba(255,255,255,.55); }

  .reunion .chip { font-size: 13px; padding: 4px 11px; }

  .ranking { display: grid; gap: 11px; }
  .fila-rank {
    display: grid;
    grid-template-columns: 230px 1fr 130px;
    gap: 16px;
    align-items: center;
  }
  .fila-rank .nom { font-size: 17px; font-weight: 650; }
  .fila-rank .riel { height: 22px; border-radius: 6px; background: rgba(255,255,255,.08); overflow: hidden; }
  .fila-rank .riel i { display: block; height: 100%; }
  .fila-rank .num {
    text-align: right;
    font-size: 19px;
    font-weight: 750;
    font-variant-numeric: tabular-nums;
  }

  /* --------------------------------------------------------------- estado */

  .estado-linea {
    padding: 0 20px 10px;
    min-height: 20px;
    font-size: 13px;
    color: var(--muted);
  }
  .estado-linea.error { color: var(--peligro); font-weight: 650; }
  .estado-linea.ok { color: var(--ok); font-weight: 650; }

  .cargando {
    display: grid;
    place-items: center;
    height: 100%;
    color: var(--muted);
  }

  @media (max-width: 1180px) {
    .area { grid-template-columns: minmax(0, 1fr); }
    .detalle { max-height: 70vh; }
  }
  @media (max-width: 760px) {
    .barra { flex-direction: column; align-items: flex-start; }
    .datos { grid-template-columns: 1fr; }
    .fila-rank { grid-template-columns: 130px 1fr 90px; }
    .ficha { grid-template-columns: 1fr; }
    .ficha .cifra-lado { text-align: left; }
    .reunion-cuerpo { padding: 22px 20px; }
  }

  @media print {
    .barra .acciones, .herramientas, .avisos { display: none; }
  }
</style>
`;

const HTML_MESA = `<!DOCTYPE html>
<html lang="es">
<head>
  <base target="_top">
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Mesa Trading</title>
  <?!= include('Estilos') ?>
</head>
<body>

<main class="app" id="app">
  <header class="barra">
    <div>
      <h1>Mesa Trading</h1>
      <div class="sub" id="sub">Cargando…</div>
    </div>
    <div class="acciones">
      <button class="btn fantasma" id="btnReunion" type="button">Modo reunión</button>
      <button class="btn fantasma" id="btnSincronizar" type="button">Sincronizar</button>
      <button class="btn fantasma" id="btnRecargar" type="button">Recargar</button>
    </div>
  </header>

  <section class="kpis" id="kpis"></section>
  <div class="avisos" id="avisos"></div>

  <div>
    <section class="herramientas">
      <input class="buscador" id="busqueda" type="search"
             placeholder="Buscar pedido, material, cliente, puerto, proveedor o comentario">
      <div class="pestanas" id="pestanas"></div>
      <select id="filtroProveedor" aria-label="Filtrar por proveedor">
        <option value="">Todos los proveedores</option>
      </select>
      <select id="filtroUrgencia" aria-label="Filtrar por urgencia">
        <option value="">Toda urgencia</option>
        <option value="alerta">Solo lo que requiere decisión</option>
        <option value="vencido">Embarque vencido</option>
        <option value="critico">Embarque crítico</option>
        <option value="proximo">Embarque próximo</option>
        <option value="sin-fecha">Sin fecha</option>
      </select>
      <div class="vistas" role="group" aria-label="Vista">
        <button type="button" data-vista="mesa">Mesa</button>
        <button type="button" data-vista="tablero">Tablero</button>
        <button type="button" data-vista="proveedores">Proveedores</button>
      </div>
    </section>
    <div class="estado-linea" id="linea"></div>
  </div>

  <section class="area" id="area">
    <div class="panel" id="principal">
      <div class="cargando">Cargando la mesa…</div>
    </div>
    <aside class="panel detalle" id="detalle"></aside>
  </section>
</main>

<section class="reunion" id="reunion" aria-hidden="true">
  <header class="reunion-cab">
    <div>
      <h2 id="reunionTitulo">Mesa Trading</h2>
      <div class="quien" id="reunionQuien"></div>
    </div>
    <button class="btn fantasma" id="btnCerrarReunion" type="button">Salir (Esc)</button>
  </header>
  <div class="reunion-cuerpo" id="reunionCuerpo"></div>
  <footer class="reunion-pie">
    <button class="btn fantasma" id="btnAnterior" type="button">← Anterior</button>
    <div class="pasos" id="reunionPasos"></div>
    <button class="btn fantasma" id="btnSiguiente" type="button">Siguiente →</button>
  </footer>
</section>

<script>
/* ==========================================================================
   Estado de la pantalla
   ========================================================================== */

var S = {
  datos: null,
  filtrados: [],
  seleccion: '',
  vista: 'mesa',
  filtroEstado: '',
  filtroProveedor: '',
  filtroUrgencia: '',
  busqueda: '',
  area: 'Ventas',
  guardando: false,
  borradores: {},
  reunion: { abierta: false, laminas: [], indice: 0 }
};

var $ = function (id) { return document.getElementById(id); };

/* ==========================================================================
   Utilidades
   ========================================================================== */

function esc(v) {
  return String(v === null || v === undefined ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function plano(v) {
  return String(v === null || v === undefined ? '' : v)
    .toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').trim();
}

function colorSeguro(v) {
  return /^#[0-9a-fA-F]{6}$/.test(String(v || '')) ? v : '#FFF2CC';
}

function numeroCL(n, dec) {
  var v = Number(n || 0);
  if (isNaN(v)) v = 0;
  if (dec === undefined) dec = 2;
  var partes = Math.abs(v).toFixed(dec).split('.');
  var entero = partes[0].replace(/\\B(?=(\\d{3})+(?!\\d))/g, '.');
  return (v < 0 ? '-' : '') + entero + (partes[1] ? ',' + partes[1] : '');
}

function decir(texto, clase) {
  $('linea').className = 'estado-linea' + (clase ? ' ' + clase : '');
  $('linea').textContent = texto || '';
}

function fallo(err) {
  decir(err && err.message ? err.message : String(err || 'Ocurrió un error'), 'error');
}

/* --------------------------------------------------------------------------
   Vista previa de la fecha que se escribe en texto.

   Es solo una ayuda visual mientras se escribe: al guardar, el servidor
   vuelve a interpretar el texto y ESA es la fecha que queda. Si alguna vez
   difieren, manda la del servidor (Config.gs · interpretarFecha_).
   -------------------------------------------------------------------------- */

var MESES_JS = {
  enero:1, ene:1, febrero:2, feb:2, marzo:3, mar:3, abril:4, abr:4, mayo:5, may:5,
  junio:6, jun:6, julio:7, jul:7, agosto:8, ago:8, septiembre:9, setiembre:9, sep:9, sept:9,
  octubre:10, oct:10, noviembre:11, nov:11, diciembre:12, dic:12
};

function ultimoDia(a, m) { return new Date(a, m, 0).getDate(); }

function dosDigitos(n) { return (String(n).length < 2 ? '0' : '') + n; }

function comoTexto(a, m, d) { return dosDigitos(d) + '-' + dosDigitos(m) + '-' + a; }

function verFecha(txt, anioRef) {
  var t = plano(txt);
  if (!t || t === 'sin fecha') return null;
  var anio = anioRef || new Date().getFullYear();

  var num = t.match(/(\\d{1,4})[\\/\\-.](\\d{1,2})[\\/\\-.](\\d{1,4})/);
  if (num) {
    var a = parseInt(num[1], 10), b = parseInt(num[2], 10), c = parseInt(num[3], 10);
    var A, M, D;
    if (num[1].length === 4) { A = a; M = b; D = c; }
    else { D = a; M = b; A = c < 100 ? c + 2000 : c;
           if (D > 12 && M > 12) return null;
           if (D <= 12 && M > 12) { var x = D; D = M; M = x; } }
    if (M < 1 || M > 12 || D < 1 || D > ultimoDia(A, M)) return null;
    return { texto: comoTexto(A, M, D), aprox: false };
  }

  var mes = 0, largo = 0;
  for (var nom in MESES_JS) {
    if (new RegExp('(^|[^a-z])' + nom + '([^a-z]|$)').test(t) && nom.length > largo) {
      mes = MESES_JS[nom]; largo = nom.length;
    }
  }
  if (!mes) return null;

  var anioTxt = t.match(/\\b(20\\d{2})\\b/);
  if (anioTxt) anio = parseInt(anioTxt[1], 10);

  var dia = t.replace(/\\b20\\d{2}\\b/g, ' ').match(/\\b(\\d{1,2})\\b/);
  if (dia) {
    var d = parseInt(dia[1], 10);
    if (d >= 1 && d <= ultimoDia(anio, mes)) return { texto: comoTexto(anio, mes, d), aprox: false };
  }
  if (/\\b(fin|fines|final|finales|ultima|ultimos)\\b/.test(t)) return { texto: comoTexto(anio, mes, ultimoDia(anio, mes)), aprox: true };
  if (/\\b(inicio|inicios|principio|principios|comienzo|comienzos|primera|primeros)\\b/.test(t)) return { texto: comoTexto(anio, mes, 1), aprox: true };
  if (/\\b(mediados|medio|mitad|quincena)\\b/.test(t)) return { texto: comoTexto(anio, mes, 15), aprox: true };
  return { texto: comoTexto(anio, mes, ultimoDia(anio, mes)), aprox: true };
}

/* ==========================================================================
   Carga
   ========================================================================== */

function cargar(mensaje) {
  decir(mensaje || 'Cargando la mesa…');
  google.script.run
    .withSuccessHandler(function (datos) {
      S.datos = datos;
      if (!S.seleccion && datos.pedidos.length) S.seleccion = datos.pedidos[0].id;
      llenarProveedores();
      pintar();
      decir('');
    })
    .withFailureHandler(fallo)
    .datosMesa();
}

function llenarProveedores() {
  var sel = $('filtroProveedor');
  var actual = S.filtroProveedor;
  sel.innerHTML = '<option value="">Todos los proveedores</option><option value="__sin">Sin proveedor</option>';
  (S.datos.proveedores || []).forEach(function (p) {
    var o = document.createElement('option');
    o.value = p.nombre;
    o.textContent = p.nombre;
    sel.appendChild(o);
  });
  sel.value = actual;
}

/* ==========================================================================
   Filtros
   ========================================================================== */

function filtrar() {
  var q = plano(S.busqueda);
  return (S.datos.pedidos || []).filter(function (p) {
    if (S.filtroEstado && p.estado !== S.filtroEstado) return false;

    if (S.filtroProveedor === '__sin') { if (p.proveedor) return false; }
    else if (S.filtroProveedor && p.proveedor !== S.filtroProveedor) return false;

    if (S.filtroUrgencia === 'alerta') { if (!p.alerta) return false; }
    else if (S.filtroUrgencia && p.urgencia !== S.filtroUrgencia) return false;

    if (!q) return true;
    return plano([p.docVenta, p.material, p.texto, p.cliente, p.puerto, p.pais,
                  p.proveedor, p.comentario, p.comentarioCompra].join(' ')).indexOf(q) !== -1;
  });
}

function seleccionado() {
  for (var i = 0; i < S.filtrados.length; i++) {
    if (S.filtrados[i].id === S.seleccion) return S.filtrados[i];
  }
  return S.filtrados.length ? S.filtrados[0] : null;
}

/* ==========================================================================
   Pintado general
   ========================================================================== */

function pintar() {
  if (!S.datos) return;
  S.filtrados = filtrar();

  var sel = seleccionado();
  S.seleccion = sel ? sel.id : '';

  $('sub').textContent = S.datos.planilla + ' · actualizado ' + S.datos.actualizado +
    (S.datos.usuario ? ' · ' + S.datos.usuario : '');

  pintarKpis();
  pintarAvisos();
  pintarPestanas();
  pintarVistas();

  if (S.vista === 'mesa') pintarTabla();
  else if (S.vista === 'tablero') pintarTablero();
  else pintarProveedores();

  $('area').className = 'area' + (S.vista === 'proveedores' ? ' solo' : '');
  $('detalle').style.display = S.vista === 'proveedores' ? 'none' : '';
  if (S.vista !== 'proveedores') pintarDetalle();
}

function pintarKpis() {
  var k = S.datos.kpis;
  var tarjetas = [
    { rot: 'Pedidos en mesa', val: k.total, pie: k.proveedoresUsados + ' proveedores en juego' },
    { rot: 'Por embarcar', val: k.texto.porEmbarcarM3, pie: 'm³ comprometidos y no embarcados' },
    { rot: 'Requiere decisión', val: k.enRiesgo, pie: k.texto.riesgoM3 + ' m³ en juego', malo: k.enRiesgo > 0 },
    { rot: 'Sin proveedor', val: k.sinProveedor, pie: k.texto.sinProveedorM3 + ' m³ sin asignar' },
    { rot: 'Proveedor llega tarde', val: k.texto.desfaseM3, pie: 'm³ prometidos después del embarque', malo: k.desfaseM3 > 0 },
    { rot: 'Ya embarcado', val: k.texto.embarcadoM3, pie: 'm³ de ' + k.texto.pedidoM3 + ' vendidos' }
  ];

  $('kpis').innerHTML = tarjetas.map(function (t) {
    return '<div class="kpi' + (t.malo ? ' riesgo' : '') + '">' +
      '<div class="rot">' + esc(t.rot) + '</div>' +
      '<div class="val">' + esc(t.val) + '</div>' +
      '<div class="pie">' + esc(t.pie) + '</div></div>';
  }).join('');
}

function pintarAvisos() {
  var avisos = S.datos.avisos || [];
  $('avisos').innerHTML = avisos.map(function (a) {
    return '<div class="aviso"><span>•</span><span>' + esc(a.texto) + '</span></div>';
  }).join('');
}

function pintarPestanas() {
  var cuenta = { '': (S.datos.pedidos || []).length };
  (S.datos.estados || []).forEach(function (e) { cuenta[e] = S.datos.kpis.porEstado[e] || 0; });

  var lista = [{ v: '', t: 'Todos' }].concat((S.datos.estados || []).map(function (e) {
    return { v: e, t: e };
  }));

  $('pestanas').innerHTML = lista.map(function (x) {
    return '<button type="button" class="pestana" data-estado="' + esc(x.v) + '" ' +
      'aria-pressed="' + (S.filtroEstado === x.v) + '">' + esc(x.t) +
      '<span class="n">' + (cuenta[x.v] || 0) + '</span></button>';
  }).join('');

  Array.prototype.forEach.call($('pestanas').children, function (b) {
    b.onclick = function () { S.filtroEstado = b.getAttribute('data-estado'); pintar(); };
  });
}

function pintarVistas() {
  Array.prototype.forEach.call(document.querySelectorAll('.vistas button'), function (b) {
    b.setAttribute('aria-pressed', String(b.getAttribute('data-vista') === S.vista));
  });
}

/* ------------------------------------------------------------------ tabla */

function chipProveedor(p) {
  var nombre = p.proveedor || 'Sin asignar';
  return '<span class="chip" style="background:#F1F5F3">' +
    '<span class="punto" style="background:' + colorSeguro(p.proveedorColor) + '"></span>' +
    '<span class="txt">' + esc(nombre) + '</span></span>';
}

function chipEstado(p) {
  return '<span class="chip est-' + esc(p.estadoClave) + '">' + esc(p.estado) + '</span>';
}

function celdaVolumen(p) {
  var total = p.pedidoM3 || 0;
  var hecho = total ? Math.max(0, Math.min(100, (p.embarcadoM3 / total) * 100)) : 0;
  return '<div class="fuerte">' + numeroCL(p.porEmbarcarM3) + '</div>' +
    '<div class="tenue">de ' + numeroCL(total) + ' m³</div>' +
    '<div class="barra-vol"><i style="width:' + hecho.toFixed(1) + '%"></i></div>';
}

function celdaCompromiso(p) {
  if (!p.fechaProveedor) return '<span class="tenue">—</span>';
  var html = '<div class="compromiso">' + esc(p.fechaProveedor) +
    (p.fechaProveedorConfianza === 'aproximada' ? '<span class="aprox">aprox</span>' : '') + '</div>';
  if (p.fechaProveedorTextoOriginal && p.fechaProveedorTextoOriginal !== p.fechaProveedor) {
    html += '<div class="tenue">“' + esc(p.fechaProveedorTextoOriginal) + '”</div>';
  }
  if (p.desfase !== null && p.desfase > 0) {
    html += '<span class="desfase">+' + p.desfase + " d tarde</span>";
  }
  return html;
}

function pintarTabla() {
  if (!S.filtrados.length) {
    $('principal').innerHTML = '<div class="vacio">No hay pedidos con estos filtros.</div>';
    return;
  }

  var filas = S.filtrados.map(function (p) {
    return '<tr data-id="' + esc(p.id) + '" aria-selected="' + (p.id === S.seleccion) + '">' +
      '<td class="celda-alerta"><span class="marca ' + (p.alerta ? esc(p.alerta.nivel) : '') + '"></span></td>' +
      '<td><div class="fuerte">' + esc(p.docVenta || '—') + '</div>' +
          '<div class="tenue">' + esc(p.cliente || p.origen || '') + '</div></td>' +
      '<td class="col-material"><div>' + esc(p.material || '—') + '</div>' +
          '<div class="tenue recorte">' + esc(p.texto || '') + '</div></td>' +
      '<td><div>' + esc(p.fechaEmbarque || '—') + '</div>' +
          '<div><span class="chip urg-' + esc(p.urgencia) + '">' + esc(p.diasTexto) + '</span></div></td>' +
      '<td>' + celdaVolumen(p) + '</td>' +
      '<td>' + chipProveedor(p) + '</td>' +
      '<td>' + celdaCompromiso(p) + '</td>' +
      '<td>' + chipEstado(p) + '</td>' +
      '<td class="col-conversacion">' + celdaConversacion(p) + '</td>' +
      '</tr>';
  }).join('');

  $('principal').innerHTML =
    '<div class="scroll"><table><thead><tr>' +
      '<th class="celda-alerta"></th><th>Pedido</th><th>Material</th><th>Embarque</th>' +
      '<th>Por embarcar</th><th>Proveedor</th><th>Compromiso</th><th>Estado</th><th>Conversación</th>' +
    '</tr></thead><tbody>' + filas + '</tbody></table></div>';

  Array.prototype.forEach.call($('principal').querySelectorAll('tbody tr'), function (tr) {
    tr.onclick = function () { S.seleccion = tr.getAttribute('data-id'); pintar(); };
  });
}

function celdaConversacion(p) {
  var ultimo = p.mensajes && p.mensajes.length ? p.mensajes[p.mensajes.length - 1] : null;
  if (!ultimo) {
    var suelto = p.comentario || p.comentarioCompra;
    return suelto
      ? '<div class="tenue recorte">' + esc(suelto) + '</div>'
      : '<span class="tenue">—</span>';
  }
  return '<div class="tenue"><b>' + esc(ultimo.area) + '</b> · ' + esc(ultimo.fechaTexto) +
    (p.totalMensajes > 1 ? ' · ' + p.totalMensajes + ' mensajes' : '') + '</div>' +
    '<div class="recorte">' + esc(ultimo.mensaje) + '</div>';
}

/* ---------------------------------------------------------------- tablero */

function pintarTablero() {
  var columnas = (S.datos.estados || []).map(function (estado) {
    var enEstado = S.filtrados.filter(function (p) { return p.estado === estado; });
    var m3 = enEstado.reduce(function (a, p) { return a + (p.porEmbarcarM3 || 0); }, 0);

    var tarjetas = enEstado.map(function (p) {
      return '<article class="tarjeta ' + (p.alerta ? esc(p.alerta.nivel) : '') + '" draggable="true" ' +
        'data-id="' + esc(p.id) + '" aria-selected="' + (p.id === S.seleccion) + '">' +
        '<div class="doc">' + esc(p.docVenta || '—') + '</div>' +
        '<div class="mat">' + esc(p.material || '') + '</div>' +
        chipProveedor(p) +
        '<div class="pie"><span class="chip urg-' + esc(p.urgencia) + '">' + esc(p.diasTexto) + '</span>' +
        '<span class="fuerte">' + numeroCL(p.porEmbarcarM3) + ' m³</span></div>' +
        (p.alerta ? '<div class="pie"><span class="tenue">' + esc(p.alerta.etiqueta) + '</span></div>' : '') +
        '</article>';
    }).join('');

    return '<section class="columna" data-estado="' + esc(estado) + '">' +
      '<div class="columna-cab"><span>' + esc(estado) + ' (' + enEstado.length + ')</span>' +
      '<span class="m3">' + numeroCL(m3) + ' m³</span></div>' +
      '<div class="columna-cuerpo">' + (tarjetas || '<div class="vacio">Vacío</div>') + '</div></section>';
  }).join('');

  $('principal').innerHTML = '<div class="tablero">' + columnas + '</div>';
  activarArrastre();
}

function activarArrastre() {
  Array.prototype.forEach.call($('principal').querySelectorAll('.tarjeta'), function (t) {
    t.onclick = function () { S.seleccion = t.getAttribute('data-id'); pintar(); };
    t.ondragstart = function (e) {
      e.dataTransfer.setData('text/plain', t.getAttribute('data-id'));
      e.dataTransfer.effectAllowed = 'move';
    };
  });

  Array.prototype.forEach.call($('principal').querySelectorAll('.columna'), function (col) {
    col.ondragover = function (e) { e.preventDefault(); col.classList.add('encima'); };
    col.ondragleave = function () { col.classList.remove('encima'); };
    col.ondrop = function (e) {
      e.preventDefault();
      col.classList.remove('encima');
      moverEstado(e.dataTransfer.getData('text/plain'), col.getAttribute('data-estado'));
    };
  });
}

function moverEstado(id, estado) {
  var p = null;
  for (var i = 0; i < S.datos.pedidos.length; i++) {
    if (S.datos.pedidos[i].id === id) { p = S.datos.pedidos[i]; break; }
  }
  if (!p || p.estado === estado || S.guardando) return;

  S.guardando = true;
  decir('Moviendo ' + p.docVenta + ' a ' + estado + '…');

  google.script.run
    .withSuccessHandler(function (datos) {
      S.guardando = false;
      S.datos = datos;
      pintar();
      decir(p.docVenta + ' quedó en ' + estado + '.', 'ok');
    })
    .withFailureHandler(function (e) { S.guardando = false; fallo(e); })
    .guardarPedido({
      fila: p.fila, docVenta: p.docVenta, material: p.material,
      proveedor: p.proveedor, estado: estado,
      fechaProveedor: p.fechaProveedor, mensaje: '', area: S.area
    });
}

/* ------------------------------------------------------------ proveedores */

function pintarProveedores() {
  var lista = S.datos.porProveedor || [];
  var tope = lista.reduce(function (a, p) { return Math.max(a, p.porEmbarcarM3); }, 0) || 1;

  $('principal').innerHTML = '<div class="provs">' + lista.map(function (p) {
    return '<div class="prov">' +
      '<span class="tono" style="background:' + colorSeguro(p.hex) + '"></span>' +
      '<span class="nom">' + esc(p.nombre) + '</span>' +
      '<span class="riel"><i style="width:' + ((p.porEmbarcarM3 / tope) * 100).toFixed(1) + '%;' +
        'background:' + colorSeguro(p.hex) + '"></i></span>' +
      '<span class="num">' + esc(p.porEmbarcarTexto) + ' m³</span>' +
      '<span class="avisa">' + (p.enRiesgo ? p.enRiesgo + ' ⚠' : '') + '</span>' +
      '</div>';
  }).join('') + '</div>';
}

/* ---------------------------------------------------------------- detalle */

function pintarDetalle() {
  var p = seleccionado();
  if (!p) {
    $('detalle').innerHTML = '<div class="vacio">Selecciona un pedido.</div>';
    return;
  }

  var opciones = '<option value="">Sin asignar</option>' +
    (S.datos.proveedores || []).map(function (x) {
      return '<option value="' + esc(x.nombre) + '"' +
        (x.nombre === p.proveedor ? ' selected' : '') + '>' + esc(x.nombre) + '</option>';
    }).join('');

  var estados = (S.datos.estados || []).map(function (e) {
    return '<option value="' + esc(e) + '"' + (e === p.estado ? ' selected' : '') + '>' + esc(e) + '</option>';
  }).join('');

  var claveBorrador = p.id + '|' + S.area;
  var borrador = S.borradores[claveBorrador] || '';

  $('detalle').innerHTML =
    '<div class="detalle-cab">' +
      '<h2>' + esc(p.docVenta || 'Pedido') + '</h2>' +
      '<div class="tenue">' + esc(p.material) + ' · ' + esc(p.texto) + '</div>' +
      '<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">' +
        chipEstado(p) +
        '<span class="chip urg-' + esc(p.urgencia) + '">' + esc(p.urgenciaEtiqueta) + ' · ' + esc(p.diasTexto) + '</span>' +
        (p.alerta ? '<span class="chip urg-vencido">' + esc(p.alerta.etiqueta) + '</span>' : '') +
      '</div>' +
    '</div>' +
    '<div class="detalle-cuerpo">' +
      bloqueCadena(p) +
      bloqueDatos(p) +
      '<div class="seccion">Decisión de la mesa</div>' +
      '<label class="campo"><span>Proveedor</span><select id="edProveedor">' + opciones + '</select></label>' +
      '<label class="campo"><span>Estado</span><select id="edEstado">' + estados + '</select></label>' +
      '<label class="campo"><span>Fecha que promete el proveedor</span>' +
        '<input id="edFecha" type="text" autocomplete="off" placeholder="30-08-2026, «20 julio» o «fin de agosto»" ' +
        'value="' + esc(p.fechaProveedorTextoOriginal || p.fechaProveedor || '') + '">' +
        '<span class="pista" id="pistaFecha"></span></label>' +
      '<button class="btn" id="btnGuardar" type="button" style="width:100%">Guardar</button>' +

      '<div class="seccion">Conversación (' + (p.totalMensajes || 0) + ')</div>' +
      '<div class="areas" role="group">' +
        '<button type="button" data-area="Ventas" aria-pressed="' + (S.area === 'Ventas') + '">Hablo por Ventas</button>' +
        '<button type="button" data-area="Compras" aria-pressed="' + (S.area === 'Compras') + '">Hablo por Compras</button>' +
      '</div>' +
      '<label class="campo"><span>Mensaje</span>' +
        '<textarea id="edMensaje" placeholder="Ej: proveedor confirma 200 m³ para el 20 de agosto, falta precio">' + esc(borrador) + '</textarea></label>' +
      '<button class="btn plano" id="btnEnviar" type="button" style="width:100%">Enviar mensaje</button>' +
      '<div class="hilo" style="margin-top:12px">' + bloqueHilo(p) + '</div>' +
    '</div>';

  conectarDetalle(p, claveBorrador);
}

function bloqueCadena(p) {
  var total = p.pedidoM3 || 0;
  var pasos = [
    { r: 'Vendido', v: p.pedidoM3, c: '#0E6E5C' },
    { r: 'Embarcado', v: p.embarcadoM3, c: '#3E9E86' },
    { r: 'En tránsito', v: p.transitoM3, c: '#7FBFAE' },
    { r: 'Por embarcar', v: p.porEmbarcarM3, c: '#D98324' },
    { r: 'Por producir', v: p.porProducirM3, c: '#B5561F' }
  ];
  return '<div class="cadena">' + pasos.map(function (x) {
    var pct = total ? Math.max(0, Math.min(100, (x.v / total) * 100)) : 0;
    return '<div class="paso"><b>' + esc(x.r) + '</b>' +
      '<span class="riel"><i style="width:' + pct.toFixed(1) + '%;background:' + x.c + '"></i></span>' +
      '<span class="val">' + numeroCL(x.v) + '</span></div>';
  }).join('') + '</div>';
}

function bloqueDatos(p) {
  var datos = [
    ['Cliente', p.cliente],
    ['Embarque comprometido', p.fechaEmbarque],
    ['Puerto', p.puerto],
    ['País', p.pais],
    ['Incoterm', p.incoterm],
    ['Posiciones en Bd', p.posiciones]
  ];
  var html = datos.filter(function (d) { return d[1] !== '' && d[1] !== null && d[1] !== undefined; })
    .map(function (d) {
      return '<div class="dato"><b>' + esc(d[0]) + '</b><span>' + esc(d[1]) + '</span></div>';
    }).join('');

  if (!p.enBd) {
    html += '<div class="dato ancho"><b>Atención</b><span>Este pedido ya no aparece en Bd.</span></div>';
  }
  return '<div class="datos">' + html + '</div>';
}

function bloqueHilo(p) {
  if (!p.mensajes || !p.mensajes.length) {
    var previos = [];
    if (p.comentario) previos.push({ area: 'Ventas', mensaje: p.comentario });
    if (p.comentarioCompra) previos.push({ area: 'Compras', mensaje: p.comentarioCompra });
    if (!previos.length) return '<div class="vacio">Todavía no hay mensajes.</div>';

    return previos.map(function (m) {
      return '<div class="msj ' + plano(m.area) + '">' +
        '<div class="meta"><b>' + esc(m.area) + '</b><span>antes de la bitácora</span></div>' +
        '<div class="texto">' + esc(m.mensaje) + '</div></div>';
    }).join('');
  }

  return p.mensajes.slice().reverse().map(function (m) {
    return '<div class="msj ' + plano(m.area) + '">' +
      '<div class="meta"><b>' + esc(m.area) + (m.autor ? ' · ' + esc(m.autor) : '') + '</b>' +
      '<span>' + esc(m.fechaTexto) + '</span></div>' +
      '<div class="texto">' + esc(m.mensaje) + '</div></div>';
  }).join('');
}

function conectarDetalle(p, claveBorrador) {
  var campoFecha = $('edFecha');
  var pista = $('pistaFecha');

  function revisarFecha() {
    var anioRef = p.fechaEmbarque ? parseInt(String(p.fechaEmbarque).slice(-4), 10) : null;
    var r = verFecha(campoFecha.value, anioRef);
    if (!campoFecha.value.trim()) { pista.className = 'pista'; pista.textContent = ''; return; }
    if (!r) { pista.className = 'pista'; pista.textContent = 'No se entiende como fecha; se guardará vacía.'; return; }
    pista.className = 'pista ' + (r.aprox ? 'aprox' : 'ok');
    pista.textContent = 'Se guardará como ' + r.texto + (r.aprox ? ' (aproximada)' : '');
  }

  campoFecha.oninput = revisarFecha;
  revisarFecha();

  $('edMensaje').oninput = function () { S.borradores[claveBorrador] = this.value; };

  Array.prototype.forEach.call($('detalle').querySelectorAll('.areas button'), function (b) {
    b.onclick = function () { S.area = b.getAttribute('data-area'); pintarDetalle(); };
  });

  $('btnGuardar').onclick = function () { enviar(p, false); };
  $('btnEnviar').onclick = function () { enviar(p, true); };
}

function enviar(p, conMensaje) {
  if (S.guardando) return;
  var mensaje = $('edMensaje').value.trim();
  if (conMensaje && !mensaje) { decir('Escribe un mensaje antes de enviarlo.', 'error'); return; }

  S.guardando = true;
  $('btnGuardar').disabled = true;
  $('btnEnviar').disabled = true;
  decir('Guardando…');

  var claveBorrador = p.id + '|' + S.area;

  google.script.run
    .withSuccessHandler(function (datos) {
      S.guardando = false;
      S.datos = datos;
      delete S.borradores[claveBorrador];
      llenarProveedores();
      pintar();
      decir(conMensaje ? 'Mensaje enviado y guardado.' : 'Pedido guardado.', 'ok');
    })
    .withFailureHandler(function (e) {
      S.guardando = false;
      fallo(e);
      pintarDetalle();
    })
    .guardarPedido({
      fila: p.fila,
      docVenta: p.docVenta,
      material: p.material,
      proveedor: $('edProveedor').value,
      estado: $('edEstado').value,
      fechaProveedor: $('edFecha').value,
      mensaje: mensaje,
      area: S.area
    });
}

/* ==========================================================================
   Modo reunión
   ========================================================================== */

function laminasReunion() {
  var d = S.datos;
  var k = d.kpis;
  var laminas = [];

  laminas.push({
    titulo: 'Mesa Trading',
    bajada: d.planilla + ' · ' + d.actualizado,
    html: '<div class="cifras">' +
      cifra('Pedidos en mesa', k.total, k.proveedoresUsados + ' proveedores en juego') +
      cifra('Por embarcar', k.texto.porEmbarcarM3 + ' m³', 'comprometido y no embarcado') +
      cifra('Requiere decisión hoy', k.enRiesgo, k.texto.riesgoM3 + ' m³ en juego', k.enRiesgo > 0) +
      cifra('Sin proveedor', k.sinProveedor, k.texto.sinProveedorM3 + ' m³ sin asignar', k.sinProveedor > 0) +
    '</div>'
  });

  (d.agenda || []).forEach(function (g) {
    laminas.push({
      titulo: g.titulo,
      bajada: g.detalle + ' · ' + g.pedidos.length + ' pedidos · ' + g.totalM3Texto + ' m³',
      html: '<div class="fichas">' + g.pedidos.slice(0, 7).map(ficha).join('') +
        (g.pedidos.length > 7
          ? '<div class="quien">y ' + (g.pedidos.length - 7) + ' pedido(s) más en la mesa.</div>'
          : '') + '</div>'
    });
  });

  var provs = (d.porProveedor || []).filter(function (p) { return p.porEmbarcarM3 > 0; });
  if (provs.length) {
    var tope = provs[0].porEmbarcarM3 || 1;
    laminas.push({
      titulo: 'Dónde está el volumen',
      bajada: 'm³ por embarcar según proveedor asignado',
      html: '<div class="ranking">' + provs.slice(0, 10).map(function (p) {
        return '<div class="fila-rank"><span class="nom">' + esc(p.nombre) + '</span>' +
          '<span class="riel"><i style="width:' + ((p.porEmbarcarM3 / tope) * 100).toFixed(1) + '%;' +
          'background:' + colorSeguro(p.hex) + '"></i></span>' +
          '<span class="num">' + esc(p.porEmbarcarTexto) + ' m³</span></div>';
      }).join('') + '</div>'
    });
  }

  laminas.push({
    titulo: 'Cómo vamos',
    bajada: 'Pedidos por estado',
    html: '<div class="cifras">' + (d.estados || []).map(function (e) {
      return cifra(e, k.porEstado[e] || 0, '');
    }).join('') + '</div>'
  });

  return laminas;
}

function cifra(rot, val, pie, malo) {
  return '<div class="cifra' + (malo ? ' mala' : '') + '">' +
    '<div class="rot">' + esc(rot) + '</div>' +
    '<div class="val">' + esc(val) + '</div>' +
    (pie ? '<div class="pie">' + esc(pie) + '</div>' : '') + '</div>';
}

function ficha(p) {
  var linea = [];
  if (p.cliente) linea.push('<b>' + esc(p.cliente) + '</b>');
  if (p.fechaEmbarque) linea.push('Embarque <b>' + esc(p.fechaEmbarque) + '</b> (' + esc(p.diasTexto) + ')');
  linea.push('Proveedor <b>' + esc(p.proveedor || 'sin asignar') + '</b>');
  if (p.fechaProveedor) linea.push('Promete <b>' + esc(p.fechaProveedor) + '</b>');
  if (p.puerto) linea.push(esc(p.puerto));

  return '<article class="ficha">' +
    '<div><div class="doc">' + esc(p.docVenta) + '</div>' +
    '<div class="mat">' + esc(p.material) + ' · ' + esc(p.texto) + '</div>' +
    '<div class="datos-linea">' + linea.join('<span>·</span>') + '</div></div>' +
    '<div class="cifra-lado"><div class="n">' + numeroCL(p.porEmbarcarM3) + '</div>' +
    '<div class="u">m³ por embarcar</div></div></article>';
}

function abrirReunion() {
  if (!S.datos) return;
  S.reunion.laminas = laminasReunion();
  S.reunion.indice = 0;
  S.reunion.abierta = true;
  $('reunion').classList.add('activa');
  $('reunion').setAttribute('aria-hidden', 'false');
  $('reunionQuien').textContent = S.datos.planilla + ' · ' + S.datos.actualizado;
  pintarLamina();
}

function cerrarReunion() {
  S.reunion.abierta = false;
  $('reunion').classList.remove('activa');
  $('reunion').setAttribute('aria-hidden', 'true');
}

function pintarLamina() {
  var l = S.reunion.laminas[S.reunion.indice];
  if (!l) return;

  $('reunionTitulo').textContent = l.titulo;
  $('reunionCuerpo').innerHTML =
    '<h3 class="lamina-titulo">' + esc(l.titulo) + '</h3>' +
    '<p class="lamina-bajada">' + esc(l.bajada) + '</p>' + l.html;
  $('reunionCuerpo').scrollTop = 0;

  $('reunionPasos').innerHTML = S.reunion.laminas.map(function (x, i) {
    return '<button class="paso" type="button" data-i="' + i + '" ' +
      'aria-current="' + (i === S.reunion.indice) + '" aria-label="Lámina ' + (i + 1) + '"></button>';
  }).join('');

  Array.prototype.forEach.call($('reunionPasos').children, function (b) {
    b.onclick = function () { S.reunion.indice = parseInt(b.getAttribute('data-i'), 10); pintarLamina(); };
  });

  $('btnAnterior').disabled = S.reunion.indice === 0;
  $('btnSiguiente').disabled = S.reunion.indice >= S.reunion.laminas.length - 1;
}

function moverLamina(paso) {
  var siguiente = S.reunion.indice + paso;
  if (siguiente < 0 || siguiente >= S.reunion.laminas.length) return;
  S.reunion.indice = siguiente;
  pintarLamina();
}

/* ==========================================================================
   Arranque
   ========================================================================== */

$('busqueda').oninput = function () { S.busqueda = this.value; pintar(); };
$('filtroProveedor').onchange = function () { S.filtroProveedor = this.value; pintar(); };
$('filtroUrgencia').onchange = function () { S.filtroUrgencia = this.value; pintar(); };

Array.prototype.forEach.call(document.querySelectorAll('.vistas button'), function (b) {
  b.onclick = function () { S.vista = b.getAttribute('data-vista'); pintar(); };
});

$('btnRecargar').onclick = function () { cargar('Recargando…'); };
$('btnReunion').onclick = abrirReunion;
$('btnCerrarReunion').onclick = cerrarReunion;
$('btnAnterior').onclick = function () { moverLamina(-1); };
$('btnSiguiente').onclick = function () { moverLamina(1); };

$('btnSincronizar').onclick = function () {
  decir('Sincronizando con Bd y repintando el seguimiento…');
  $('btnSincronizar').disabled = true;
  google.script.run
    .withSuccessHandler(function (r) {
      $('btnSincronizar').disabled = false;
      decir(r.mensaje, 'ok');
      cargar('');
    })
    .withFailureHandler(function (e) { $('btnSincronizar').disabled = false; fallo(e); })
    .sincronizarTodo();
};

document.addEventListener('keydown', function (e) {
  if (S.reunion.abierta) {
    if (e.key === 'Escape') cerrarReunion();
    else if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); moverLamina(1); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); moverLamina(-1); }
    return;
  }
  // "/" para buscar sin sacar las manos del teclado.
  if (e.key === '/' && document.activeElement !== $('busqueda')) {
    e.preventDefault();
    $('busqueda').focus();
  }
});

cargar();
</script>
</body>
</html>
`;

const HTML_PANEL = `<!DOCTYPE html>
<html lang="es">
<head>
  <base target="_top">
  <meta charset="UTF-8">
  <?!= include('Estilos') ?>
  <style>
    /* El panel lateral son ~300px: todo en una columna y más compacto. */
    body { padding: 12px; background: #fff; }
    .cab { margin-bottom: 10px; }
    .cab h1 { margin: 0; font-size: 16px; }
    .tabs { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 5px; margin-bottom: 12px; }
    .tabs button {
      min-height: 34px; padding: 0 6px;
      border: 1px solid var(--linea-fuerte); border-radius: 8px;
      background: #fff; color: var(--ink-suave); font-weight: 600; font-size: 12px;
    }
    .tabs button[aria-pressed="true"] { background: var(--ink); color: #fff; border-color: var(--ink); }
    .hoja { display: none; }
    .hoja.viva { display: block; }
    .ficha-panel {
      padding: 10px 12px; margin-bottom: 12px;
      border: 1px solid var(--linea); border-radius: 9px; background: #FAFCFB;
    }
    .ficha-panel h2 { margin: 0 0 2px; font-size: 15px; font-variant-numeric: tabular-nums; }
    .datos { grid-template-columns: 1fr 1fr; margin: 9px 0 0; }
    .lista { display: grid; gap: 7px; }
    .item {
      display: grid; grid-template-columns: 10px 1fr auto; gap: 8px; align-items: center;
      padding: 8px 10px; border: 1px solid var(--linea); border-radius: 8px;
      background: #fff; cursor: pointer; text-align: left; width: 100%;
    }
    .item:hover { background: var(--fondo-hover); }
    .item .tono { width: 10px; height: 22px; border-radius: 3px; border: 1px solid rgba(0,0,0,.12); }
    .item .doc { font-weight: 700; font-size: 13px; font-variant-numeric: tabular-nums; }
    .item .sub { font-size: 11px; color: var(--muted); }
    .item .m3 { font-size: 12px; font-weight: 700; font-variant-numeric: tabular-nums; }
    .par { display: grid; grid-template-columns: 1fr 44px; gap: 8px; align-items: end; }
    .muestra { height: 36px; border: 1px solid var(--linea-fuerte); border-radius: 8px; }
    .hilo { max-height: 240px; overflow: auto; }
  </style>
</head>
<body>

<header class="cab">
  <h1>Mesa Trading</h1>
  <div class="tenue" id="quien">Cargando…</div>
</header>

<nav class="tabs" role="group">
  <button type="button" data-hoja="pedido" aria-pressed="true">Pedido</button>
  <button type="button" data-hoja="pendientes" aria-pressed="false">Pendientes</button>
  <button type="button" data-hoja="proveedores" aria-pressed="false">Proveedores</button>
</nav>

<section class="hoja viva" id="hojaPedido">
  <div class="ficha-panel" id="fichaPedido">
    <div class="vacio">Selecciona una fila de la Hoja Unica.</div>
  </div>

  <label class="campo"><span>Proveedor</span><select id="proveedor"></select></label>
  <label class="campo"><span>Estado</span><select id="estado"></select></label>
  <label class="campo"><span>Fecha que promete el proveedor</span>
    <input id="fecha" type="text" autocomplete="off" placeholder="«20 julio» o 30-08-2026">
    <span class="pista" id="pistaFecha"></span>
  </label>

  <div class="areas" role="group">
    <button type="button" data-area="Ventas" aria-pressed="true">Ventas</button>
    <button type="button" data-area="Compras" aria-pressed="false">Compras</button>
  </div>
  <label class="campo"><span>Mensaje</span>
    <textarea id="mensaje" placeholder="Qué se conversó con el proveedor"></textarea>
  </label>

  <button class="btn" id="btnGuardar" type="button" style="width:100%">Guardar</button>
  <div class="estado-linea" id="lineaPedido" style="padding:8px 0 0"></div>

  <div class="seccion">Conversación</div>
  <div class="hilo" id="hilo"></div>
</section>

<section class="hoja" id="hojaPendientes">
  <div class="tenue" style="margin-bottom:9px">
    Pedidos que necesitan una decisión. Toca uno para ir a su fila.
  </div>
  <div class="lista" id="pendientes"></div>
</section>

<section class="hoja" id="hojaProveedores">
  <label class="campo"><span>Proveedor</span>
    <input id="pNombre" type="text" autocomplete="off" placeholder="Nombre del proveedor">
  </label>
  <label class="campo"><span>Color</span>
    <div class="par"><select id="pColor"></select><div class="muestra" id="pMuestra"></div></div>
  </label>
  <label class="campo"><span>Color propio (opcional)</span>
    <input id="pHex" type="text" placeholder="#88CCFF" maxlength="7">
  </label>
  <label class="campo"><span>Estado</span>
    <select id="pEstado"><option>Activo</option><option>Inactivo</option></select>
  </label>
  <label class="campo"><span>Nota</span><textarea id="pNota" placeholder="Opcional"></textarea></label>

  <button class="btn" id="btnProveedor" type="button" style="width:100%">Guardar proveedor</button>
  <div class="estado-linea" id="lineaProveedor" style="padding:8px 0 0"></div>

  <div class="seccion">Proveedores actuales</div>
  <div class="lista" id="listaProveedores"></div>
</section>

<script>
var S = { datos: null, hoja: 'pedido', area: 'Ventas', guardando: false };
var $ = function (id) { return document.getElementById(id); };

function esc(v) {
  return String(v === null || v === undefined ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
function plano(v) {
  return String(v || '').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').trim();
}
function colorSeguro(v) { return /^#[0-9a-fA-F]{6}$/.test(String(v || '')) ? v : '#FFF2CC'; }
function numeroCL(n) {
  var v = Number(n || 0); if (isNaN(v)) v = 0;
  var p = Math.abs(v).toFixed(2).split('.');
  return (v < 0 ? '-' : '') + p[0].replace(/\\B(?=(\\d{3})+(?!\\d))/g, '.') + ',' + p[1];
}
function decir(el, texto, clase) {
  el.className = 'estado-linea' + (clase ? ' ' + clase : '');
  el.style.padding = '8px 0 0';
  el.textContent = texto || '';
}
function fallo(el, e) { decir(el, e && e.message ? e.message : String(e || 'Error'), 'error'); }

/* Misma vista previa de fecha que en la mesa; al guardar decide el servidor. */
var MESES_JS = { enero:1,ene:1,febrero:2,feb:2,marzo:3,mar:3,abril:4,abr:4,mayo:5,may:5,junio:6,jun:6,
  julio:7,jul:7,agosto:8,ago:8,septiembre:9,setiembre:9,sep:9,sept:9,octubre:10,oct:10,
  noviembre:11,nov:11,diciembre:12,dic:12 };
function ultimoDia(a,m){ return new Date(a,m,0).getDate(); }
function dd(n){ return (String(n).length<2?'0':'')+n; }
function comoTexto(a,m,d){ return dd(d)+'-'+dd(m)+'-'+a; }

function verFecha(txt) {
  var t = plano(txt);
  if (!t || t === 'sin fecha') return null;
  var anio = new Date().getFullYear();

  var num = t.match(/(\\d{1,4})[\\/\\-.](\\d{1,2})[\\/\\-.](\\d{1,4})/);
  if (num) {
    var a = parseInt(num[1],10), b = parseInt(num[2],10), c = parseInt(num[3],10), A, M, D;
    if (num[1].length === 4) { A=a; M=b; D=c; }
    else { D=a; M=b; A=c<100?c+2000:c;
           if (D>12 && M>12) return null;
           if (D<=12 && M>12) { var x=D; D=M; M=x; } }
    if (M<1||M>12||D<1||D>ultimoDia(A,M)) return null;
    return { texto: comoTexto(A,M,D), aprox: false };
  }

  var mes = 0, largo = 0;
  for (var nom in MESES_JS) {
    if (new RegExp('(^|[^a-z])'+nom+'([^a-z]|$)').test(t) && nom.length > largo) {
      mes = MESES_JS[nom]; largo = nom.length;
    }
  }
  if (!mes) return null;

  var at = t.match(/\\b(20\\d{2})\\b/);
  if (at) anio = parseInt(at[1],10);
  var di = t.replace(/\\b20\\d{2}\\b/g,' ').match(/\\b(\\d{1,2})\\b/);
  if (di) {
    var d = parseInt(di[1],10);
    if (d>=1 && d<=ultimoDia(anio,mes)) return { texto: comoTexto(anio,mes,d), aprox: false };
  }
  if (/\\b(fin|fines|final|finales)\\b/.test(t)) return { texto: comoTexto(anio,mes,ultimoDia(anio,mes)), aprox: true };
  if (/\\b(inicio|inicios|principio|principios|comienzo|comienzos)\\b/.test(t)) return { texto: comoTexto(anio,mes,1), aprox: true };
  if (/\\b(mediados|medio|mitad|quincena)\\b/.test(t)) return { texto: comoTexto(anio,mes,15), aprox: true };
  return { texto: comoTexto(anio,mes,ultimoDia(anio,mes)), aprox: true };
}

/* -------------------------------------------------------------- carga */

function cargar() {
  decir($('lineaPedido'), 'Leyendo la fila seleccionada…');
  google.script.run
    .withSuccessHandler(function (d) {
      S.datos = d;
      $('quien').textContent = d.planilla + ' · ' + d.actualizado;
      llenarSelectores();
      pintarPedido();
      pintarPendientes();
      pintarProveedores();
      decir($('lineaPedido'), d.mensaje || '');
    })
    .withFailureHandler(function (e) { fallo($('lineaPedido'), e); })
    .datosPanel();
}

function llenarSelectores() {
  $('estado').innerHTML = (S.datos.estados || []).map(function (e) {
    return '<option value="' + esc(e) + '">' + esc(e) + '</option>';
  }).join('');

  $('proveedor').innerHTML = '<option value="">Sin asignar</option>' +
    (S.datos.proveedores || []).map(function (p) {
      return '<option value="' + esc(p.nombre) + '">' + esc(p.nombre) + '</option>';
    }).join('');

  $('pColor').innerHTML = (S.datos.colores || []).map(function (c) {
    return '<option value="' + esc(c.nombre) + '" data-hex="' + esc(c.hex) + '">' + esc(c.nombre) + '</option>';
  }).join('');
  verMuestra();
}

function pintarPedido() {
  var p = S.datos.seleccionado;
  if (!p) {
    $('fichaPedido').innerHTML = '<div class="vacio">' +
      esc(S.datos.mensaje || 'Selecciona una fila de la Hoja Unica.') + '</div>';
    $('btnGuardar').disabled = true;
    $('hilo').innerHTML = '';
    return;
  }

  $('btnGuardar').disabled = false;
  $('proveedor').value = p.proveedor || '';
  $('estado').value = p.estado;
  $('fecha').value = p.fechaProveedorTextoOriginal || p.fechaProveedor || '';
  $('mensaje').value = '';
  revisarFecha();

  $('fichaPedido').innerHTML =
    '<h2>' + esc(p.docVenta) + '</h2>' +
    '<div class="tenue">' + esc(p.material) + ' · ' + esc(p.texto) + '</div>' +
    '<div style="margin-top:7px;display:flex;gap:5px;flex-wrap:wrap">' +
      '<span class="chip est-' + esc(p.estadoClave) + '">' + esc(p.estado) + '</span>' +
      '<span class="chip urg-' + esc(p.urgencia) + '">' + esc(p.diasTexto) + '</span>' +
      (p.alerta ? '<span class="chip urg-vencido">' + esc(p.alerta.etiqueta) + '</span>' : '') +
    '</div>' +
    '<div class="datos">' +
      dato('Cliente', p.cliente) +
      dato('Embarque', p.fechaEmbarque) +
      dato('Por embarcar', numeroCL(p.porEmbarcarM3) + ' m³') +
      dato('Puerto', p.puerto) +
    '</div>';

  $('hilo').innerHTML = (p.mensajes && p.mensajes.length)
    ? p.mensajes.slice().reverse().map(function (m) {
        return '<div class="msj ' + plano(m.area) + '">' +
          '<div class="meta"><b>' + esc(m.area) + (m.autor ? ' · ' + esc(m.autor) : '') + '</b>' +
          '<span>' + esc(m.fechaTexto) + '</span></div>' +
          '<div class="texto">' + esc(m.mensaje) + '</div></div>';
      }).join('')
    : '<div class="vacio">Sin mensajes todavía.</div>';
}

function dato(rot, valor) {
  if (valor === '' || valor === null || valor === undefined) return '';
  return '<div class="dato"><b>' + esc(rot) + '</b><span>' + esc(valor) + '</span></div>';
}

function pintarPendientes() {
  var lista = (S.datos.pedidos || []).filter(function (p) { return p.alerta; });
  if (!lista.length) {
    $('pendientes').innerHTML = '<div class="vacio">Nada pendiente. Buen día.</div>';
    return;
  }

  $('pendientes').innerHTML = lista.slice(0, 40).map(function (p) {
    return '<button class="item" type="button" data-fila="' + p.fila + '">' +
      '<span class="tono" style="background:' + colorSeguro(p.proveedorColor) + '"></span>' +
      '<span><span class="doc">' + esc(p.docVenta) + '</span>' +
      '<span class="sub"><br>' + esc(p.alerta.etiqueta) + '</span></span>' +
      '<span class="m3">' + numeroCL(p.porEmbarcarM3) + '</span></button>';
  }).join('');

  Array.prototype.forEach.call($('pendientes').children, function (b) {
    b.onclick = function () {
      google.script.run
        .withSuccessHandler(cargar)
        .irAFila(b.getAttribute('data-fila'));
    };
  });
}

function pintarProveedores() {
  var lista = S.datos.proveedores || [];
  $('listaProveedores').innerHTML = lista.length
    ? lista.map(function (p) {
        return '<button class="item" type="button" data-nombre="' + esc(p.nombre) + '">' +
          '<span class="tono" style="background:' + colorSeguro(p.hex) + '"></span>' +
          '<span><span class="doc">' + esc(p.nombre) + '</span>' +
          '<span class="sub"><br>' + esc(p.estado) + (p.nota ? ' · ' + esc(p.nota) : '') + '</span></span>' +
          '<span class="m3"></span></button>';
      }).join('')
    : '<div class="vacio">Aún no hay proveedores.</div>';

  Array.prototype.forEach.call($('listaProveedores').children, function (b) {
    b.onclick = function () {
      var nombre = b.getAttribute('data-nombre');
      for (var i = 0; i < lista.length; i++) {
        if (lista[i].nombre !== nombre) continue;
        $('pNombre').value = lista[i].nombre;
        $('pEstado').value = lista[i].estado || 'Activo';
        $('pNota').value = lista[i].nota || '';
        if (String(lista[i].color).charAt(0) === '#') { $('pHex').value = lista[i].color; }
        else { $('pHex').value = ''; $('pColor').value = lista[i].color; }
        verMuestra();
        break;
      }
    };
  });
}

function verMuestra() {
  var hex = $('pHex').value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(hex)) { $('pMuestra').style.background = hex; return; }
  var op = $('pColor').options[$('pColor').selectedIndex];
  $('pMuestra').style.background = op ? op.getAttribute('data-hex') : '#FFFFFF';
}

function revisarFecha() {
  var v = $('fecha').value;
  var r = verFecha(v);
  if (!v.trim()) { $('pistaFecha').className = 'pista'; $('pistaFecha').textContent = ''; return; }
  if (!r) {
    $('pistaFecha').className = 'pista';
    $('pistaFecha').textContent = 'No se entiende como fecha; se guardará vacía.';
    return;
  }
  $('pistaFecha').className = 'pista ' + (r.aprox ? 'aprox' : 'ok');
  $('pistaFecha').textContent = 'Se guardará como ' + r.texto + (r.aprox ? ' (aproximada)' : '');
}

/* ------------------------------------------------------------ acciones */

function guardar() {
  var p = S.datos && S.datos.seleccionado;
  if (!p || S.guardando) return;

  S.guardando = true;
  $('btnGuardar').disabled = true;
  decir($('lineaPedido'), 'Guardando…');

  google.script.run
    .withSuccessHandler(function () {
      S.guardando = false;
      $('btnGuardar').disabled = false;
      decir($('lineaPedido'), 'Guardado.', 'ok');
      cargar();
    })
    .withFailureHandler(function (e) {
      S.guardando = false;
      $('btnGuardar').disabled = false;
      fallo($('lineaPedido'), e);
    })
    .guardarDesdePanel({
      fila: p.fila, docVenta: p.docVenta, material: p.material,
      proveedor: $('proveedor').value, estado: $('estado').value,
      fechaProveedor: $('fecha').value, mensaje: $('mensaje').value.trim(), area: S.area
    });
}

function guardarProveedorPanel() {
  var hex = $('pHex').value.trim();
  decir($('lineaProveedor'), 'Guardando proveedor…');

  google.script.run
    .withSuccessHandler(function (r) {
      S.datos.proveedores = r.proveedores || [];
      llenarSelectores();
      pintarProveedores();
      decir($('lineaProveedor'), r.mensaje, 'ok');
    })
    .withFailureHandler(function (e) { fallo($('lineaProveedor'), e); })
    .guardarProveedor({
      nombre: $('pNombre').value.trim(),
      color: /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : $('pColor').value,
      estado: $('pEstado').value,
      nota: $('pNota').value.trim()
    });
}

/* ------------------------------------------------------------- arranque */

Array.prototype.forEach.call(document.querySelectorAll('.tabs button'), function (b) {
  b.onclick = function () {
    S.hoja = b.getAttribute('data-hoja');
    Array.prototype.forEach.call(document.querySelectorAll('.tabs button'), function (o) {
      o.setAttribute('aria-pressed', String(o === b));
    });
    ['pedido', 'pendientes', 'proveedores'].forEach(function (h) {
      $('hoja' + h.charAt(0).toUpperCase() + h.slice(1)).className = 'hoja' + (h === S.hoja ? ' viva' : '');
    });
  };
});

Array.prototype.forEach.call(document.querySelectorAll('.areas button'), function (b) {
  b.onclick = function () {
    S.area = b.getAttribute('data-area');
    Array.prototype.forEach.call(document.querySelectorAll('.areas button'), function (o) {
      o.setAttribute('aria-pressed', String(o === b));
    });
  };
});

$('fecha').oninput = revisarFecha;
$('pColor').onchange = verMuestra;
$('pHex').oninput = verMuestra;
$('btnGuardar').onclick = guardar;
$('btnProveedor').onclick = guardarProveedorPanel;

cargar();
</script>
</body>
</html>
`;

const HTML_PARCIALES = {
  Estilos: HTML_ESTILOS,
  Mesa: HTML_MESA,
  Panel: HTML_PANEL
};

// ======================================================================
// Config.gs
// ======================================================================

/**
 * MESA TRADING · madera
 * Spreadsheet: Seguimiento Trading.
 *
 * La mesa junta en una sola pantalla lo que hoy vive repartido entre la tabla
 * dinámica, la Hoja Unica y los comentarios sueltos: qué pedido es, cuánto
 * volumen falta, a qué proveedor se le compra, para cuándo se comprometió y
 * qué se conversó entre ventas y compras.
 *
 * Tres decisiones de diseño explican casi todo el código:
 *
 *   1. Las columnas se buscan POR NOMBRE, nunca por posición. En la planilla
 *      real la columna 7 se llama "Puerto Destino" pero guardaba comentarios
 *      de compra; escribir por posición pisaba datos buenos.
 *
 *   2. La fecha que promete el proveedor es un CAMPO DE FECHA, no un
 *      comentario. Hoy se escribe "20 julio" o "FIN AGOSTO" en texto libre y
 *      alguien lo pasa a fecha a mano en otra hoja. `interpretarFecha_` hace
 *      esa traducción y deja el texto original a la vista.
 *
 *   3. Los comentarios se ACUMULAN en la hoja Bitacora con autor y fecha. La
 *      celda de la Hoja Unica sigue mostrando el último mensaje para que la
 *      tabla dinámica de siempre no cambie.
 */

const MESA = {
  /** Vacío = usa la planilla donde está instalado el script. */
  SPREADSHEET_ID: '',

  HOJA_BD: 'Bd',
  HOJA_PROVEEDORES: 'Proveedores',
  HOJA_MESA: 'Hoja Unica',
  HOJA_SEGUIMIENTO: 'Tabla Seguimiento',
  HOJA_BITACORA: 'Bitacora',
  HOJA_HISTORIAL: 'Historial Volumen',

  /**
   * Qué filas de Bd son de la mesa. En la planilla real la columna Origen
   * viene vacía en muchas filas, así que el filtro es tolerante: si la columna
   * Origen no existe o está vacía en TODAS las filas, se toma todo Bd y la
   * mesa lo avisa en pantalla en vez de aparecer vacía sin explicación.
   */
  FILTRO_ORIGEN: 'trading',

  /** Días de anticipación con que se clasifica la urgencia del embarque. */
  DIAS_CRITICO: 7,
  DIAS_PROXIMO: 21,

  SEGUNDOS_LOCK: 30,
  CACHE_SEGUNDOS: 45,
  CACHE_CLAVE: 'MESA_TRADING_V1'
};

/**
 * Estados de la compra. El orden es el del avance real del pedido y es el que
 * usan el tablero y el modo reunión.
 */
const ESTADOS = {
  PENDIENTE: 'Pendiente',
  NEGOCIACION: 'Negociación',
  ASIGNADO: 'Asignado',
  CONFIRMADO: 'Confirmado',
  CERRADO: 'Cerrado'
};

const ESTADOS_LISTA = [
  ESTADOS.PENDIENTE, ESTADOS.NEGOCIACION, ESTADOS.ASIGNADO,
  ESTADOS.CONFIRMADO, ESTADOS.CERRADO
];

/**
 * Colores de estado. Elegidos para que se distingan proyectados en una sala:
 * suficiente contraste con el texto oscuro y diferenciables también en
 * proyectores que lavan los colores.
 */
const COLOR_ESTADO = {
  'Pendiente':   { fondo: '#FDE8C8', texto: '#7A4A05' },
  'Negociación': { fondo: '#D6E4FF', texto: '#1B44A0' },
  'Asignado':    { fondo: '#DED8FB', texto: '#4A2FA8' },
  'Confirmado':  { fondo: '#CDEBD8', texto: '#17603A' },
  'Cerrado':     { fondo: '#E4E8EB', texto: '#44525C' }
};

/** Urgencia según cuántos días faltan para la fecha de embarque comprometida. */
const URGENCIAS = {
  VENCIDO:  { clave: 'vencido',  etiqueta: 'Vencido',  fondo: '#F9D2CE', texto: '#8C1D14' },
  CRITICO:  { clave: 'critico',  etiqueta: 'Crítico',  fondo: '#FBDCC4', texto: '#8A3D04' },
  PROXIMO:  { clave: 'proximo',  etiqueta: 'Próximo',  fondo: '#FCEFC2', texto: '#6B5104' },
  HOLGADO:  { clave: 'holgado',  etiqueta: 'Holgado',  fondo: '#E4E8EB', texto: '#44525C' },
  SIN_FECHA:{ clave: 'sin-fecha',etiqueta: 'Sin fecha',fondo: '#EDEFF1', texto: '#5A666E' }
};

/** Colores con que se pinta cada proveedor. La hoja Proveedores acepta el
 *  nombre o un HEX propio (#RRGGBB). */
const CATALOGO_COLORES = {
  'Verde':      '#B7E1CD',
  'Azul':       '#C9DAF8',
  'Naranjo':    '#FCE5CD',
  'Morado':     '#D9D2E9',
  'Amarillo':   '#FFF2CC',
  'Rojo':       '#F4C7C3',
  'Gris':       '#EFEFEF',
  'Cafe':       '#DCC5B2',
  'Rosado':     '#F4CEDD',
  'Celeste':    '#C1E7F4',
  'Fucsia':     '#F3B0F3',
  'RojoFuerte': '#F08A7A',
  'Oliva':      '#DCE6C4',
  'Turquesa':   '#BFE8E2'
};

const COLOR_SIN_PROVEEDOR = '#FFF2CC';
const COLOR_NEUTRO = '#FFFFFF';
const COLOR_ENCABEZADO = '#1F2A30';
const COLOR_ENCABEZADO_TEXTO = '#FFFFFF';

/** Columnas que la mesa necesita en Hoja Unica, con sus nombres alternativos.
 *  `crear: true` = si no está, se agrega al final sin tocar las que ya existen. */
const COL_MESA = {
  origen:      { nombre: 'Origen / Tienda',            alias: ['Hoja', 'Origen', 'Tienda'], crear: false },
  docVenta:    { nombre: 'Documento de Venta',         alias: ['PV', 'Documento de ventas', 'Pedido de venta', 'Pedido'], crear: false },
  material:    { nombre: 'Material',                   alias: ['MAterial', 'Codigo Material'], crear: false },
  texto:       { nombre: 'Texto Comercial',            alias: ['Descripcion Material', 'Descripción Material', 'Texto comercial'], crear: false },
  proveedor:   { nombre: 'Proveedor Asignado',         alias: ['Proveedor'], crear: false },
  comentario:  { nombre: 'Comentarios',                alias: ['Comentario', 'Comentario ventas'], crear: false },
  puerto:      { nombre: 'Puerto Destino',             alias: ['Puerto destino', 'Puerto de destino'], crear: false },
  estado:      { nombre: 'Estado',                     alias: ['Estado mesa'], crear: true },
  fechaProv:   { nombre: 'Fecha Compromiso Proveedor', alias: ['Fecha compromiso proveedor', 'Fecha Proveedor'], crear: true },
  comentarioC: { nombre: 'Comentarios Compra',         alias: ['Comentario compras', 'Comentarios compra'], crear: true },
  actualizado: { nombre: 'Ultima Actualizacion',       alias: ['Última Actualización'], crear: true }
};

const COL_PROVEEDORES = ['Proveedor', 'Color', 'Estado', 'Nota'];

const COL_BITACORA = [
  'Fecha', 'Clave pedido', 'Documento de venta', 'Material',
  'Area', 'Autor', 'Mensaje', 'Estado', 'Proveedor', 'Fecha compromiso'
];

const COL_HISTORIAL = [
  'Fecha registro', 'Documento de venta', 'Material', 'Texto comercial',
  'Cliente', 'Proveedor', 'Estado',
  'Volumen inicial por producir (m3)', 'Volumen actual por producir (m3)',
  'Diferencia vs inicial (m3)', 'Diferencia vs registro anterior (m3)',
  'Comentario ventas', 'Comentario compras', 'Fila Hoja Unica', 'Clave pedido'
];

/** Las dos áreas que conversan en la mesa. */
const AREAS = { VENTAS: 'Ventas', COMPRAS: 'Compras' };

// ============================================================================
// Texto
// ============================================================================

/** Minúsculas, sin acentos y sin espacios sobrantes: para comparar. */
function normalizar_(texto) {
  if (texto === null || texto === undefined) return '';
  return String(texto)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function textoDe_(valor) {
  if (valor === null || valor === undefined) return '';
  if (valor instanceof Date) return formatearFecha_(valor);
  return String(valor).trim();
}

/** Identifica un pedido: documento de venta + material. */
function clave_(docVenta, material) {
  var doc = textoDe_(docVenta);
  var mat = textoDe_(material);
  return doc && mat ? doc + '_' + mat : '';
}

// ============================================================================
// Números
// ============================================================================

/**
 * Lee los números como los escribe la planilla: formato chileno, donde el
 * punto separa miles y la coma separa decimales ("1.436,72" = 1436.72;
 * "35,001" = 35.001).
 *
 * Cuando la celda trae un número de verdad esto ni se usa: getValues() ya
 * devuelve un number. Solo entra a jugar con las celdas guardadas como texto.
 */
function numero_(valor) {
  if (typeof valor === 'number') return isNaN(valor) ? 0 : valor;
  if (valor instanceof Date) return 0;

  var texto = String(valor === null || valor === undefined ? '' : valor).trim();
  if (!texto) return 0;

  texto = texto.replace(/\s/g, '').replace(/[^0-9.,\-]/g, '');
  if (!texto) return 0;

  var hayComa = texto.indexOf(',') !== -1;
  var hayPunto = texto.indexOf('.') !== -1;

  if (hayComa) {
    // Con coma presente, la coma es el decimal y el punto es separador de miles.
    return parseFloat(texto.replace(/\./g, '').replace(',', '.')) || 0;
  }
  if (hayPunto && /^-?\d{1,3}(\.\d{3})+$/.test(texto)) {
    // "1.436" o "12.345.678": puntos cada tres dígitos, son miles.
    return parseFloat(texto.replace(/\./g, '')) || 0;
  }
  return parseFloat(texto) || 0;
}

/** 1436.723 -> "1.436,72" */
function formatearNumero_(valor, decimales) {
  var n = Number(valor || 0);
  if (isNaN(n)) n = 0;
  if (decimales === undefined) decimales = 2;

  var negativo = n < 0;
  var partes = Math.abs(n).toFixed(decimales).split('.');
  var entero = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (negativo ? '-' : '') + entero + (partes[1] ? ',' + partes[1] : '');
}

// ============================================================================
// Fechas
// ============================================================================

const MESES = {
  enero: 1, ene: 1, jan: 1,
  febrero: 2, feb: 2,
  marzo: 3, mar: 3,
  abril: 4, abr: 4, apr: 4,
  mayo: 5, may: 5,
  junio: 6, jun: 6,
  julio: 7, jul: 7,
  agosto: 8, ago: 8, aug: 8,
  septiembre: 9, setiembre: 9, sep: 9, sept: 9,
  octubre: 10, oct: 10,
  noviembre: 11, nov: 11,
  diciembre: 12, dic: 12, dec: 12
};

const MESES_NOMBRE = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function esFecha_(valor) {
  return valor instanceof Date && !isNaN(valor.getTime());
}

function fecha_(anio, mes, dia) {
  return new Date(anio, mes - 1, dia, 12, 0, 0, 0);
}

function ultimoDiaDe_(anio, mes) {
  return new Date(anio, mes, 0).getDate();
}

/** dd-MM-yyyy, el formato que ya usa la planilla. */
function formatearFecha_(valor) {
  if (!esFecha_(valor)) return '';
  var d = String(valor.getDate());
  var m = String(valor.getMonth() + 1);
  return (d.length < 2 ? '0' + d : d) + '-' + (m.length < 2 ? '0' + m : m) + '-' + valor.getFullYear();
}

/** yyyyMMdd: para ordenar y para comparar dos fechas sin depender del formato. */
function claveFecha_(valor) {
  if (!esFecha_(valor)) return '';
  var m = String(valor.getMonth() + 1);
  var d = String(valor.getDate());
  return String(valor.getFullYear()) + (m.length < 2 ? '0' + m : m) + (d.length < 2 ? '0' + d : d);
}

/**
 * Convierte a fecha lo que la gente escribe de verdad.
 *
 * Reconoce fechas normales en cualquier orden y con uno o dos dígitos
 * ("5/08/2026", "30-06-2026", "2026-06-30") y también las que están en
 * castellano ("20 julio", "20 de julio", "FIN AGOSTO", "mediados de agosto").
 *
 * Devuelve siempre un objeto para poder mostrar en pantalla qué tan segura es
 * la interpretación, en vez de inventar una fecha exacta donde no la hay:
 *
 *   { fecha, texto, confianza, aproximada }
 *   confianza: 'exacta' | 'interpretada' | 'aproximada' | 'ninguna'
 *
 * `referencia` es la fecha desde la que se resuelve un año que no vino escrito
 * (normalmente la fecha de embarque comprometida del pedido).
 */
function interpretarFecha_(valor, referencia) {
  var vacio = { fecha: null, texto: textoDe_(valor), confianza: 'ninguna', aproximada: false };

  if (valor === null || valor === undefined || valor === '') return vacio;
  if (esFecha_(valor)) {
    return { fecha: fecha_(valor.getFullYear(), valor.getMonth() + 1, valor.getDate()),
             texto: formatearFecha_(valor), confianza: 'exacta', aproximada: false };
  }

  var bruto = String(valor).trim();
  if (!bruto) return vacio;

  // Sheets a veces guarda una fecha como texto completo de JavaScript.
  if (/^[A-Z][a-z]{2} [A-Z][a-z]{2} \d{2} \d{4}/.test(bruto)) {
    var directo = new Date(bruto);
    if (esFecha_(directo)) {
      return { fecha: fecha_(directo.getFullYear(), directo.getMonth() + 1, directo.getDate()),
               texto: formatearFecha_(directo), confianza: 'exacta', aproximada: false };
    }
  }

  var t = normalizar_(bruto);
  if (!t || t === 'sin fecha' || t === 'sf' || t === '-') return vacio;

  var ref = esFecha_(referencia) ? referencia : new Date();

  // 1. Fecha numérica: d/m/aaaa, d-m-aaaa, aaaa-m-d (1 o 2 dígitos).
  var num = t.match(/(\d{1,4})[\/\-.](\d{1,2})[\/\-.](\d{1,4})/);
  if (num) {
    var a = parseInt(num[1], 10), b = parseInt(num[2], 10), c = parseInt(num[3], 10);
    var anio, mes, dia;

    if (num[1].length === 4) {          // aaaa-mm-dd
      anio = a; mes = b; dia = c;
    } else {                            // dd-mm-aaaa (lo que usa la planilla)
      dia = a; mes = b; anio = c;
      if (anio < 100) anio += 2000;
      // Si el "día" no puede serlo pero el "mes" sí, vino al revés (mm/dd).
      if (dia > 12 && mes > 12) return vacio;
      if (dia <= 12 && mes > 12) { var tmp = dia; dia = mes; mes = tmp; }
    }

    if (mes >= 1 && mes <= 12 && dia >= 1 && dia <= ultimoDiaDe_(anio, mes)) {
      return { fecha: fecha_(anio, mes, dia), texto: bruto, confianza: 'exacta', aproximada: false };
    }
    return vacio;
  }

  // 2. Mes escrito en castellano.
  var mesEncontrado = null;
  for (var nombre in MESES) {
    if (!Object.prototype.hasOwnProperty.call(MESES, nombre)) continue;
    if (new RegExp('(^|[^a-z])' + nombre + '([^a-z]|$)').test(t)) {
      // Nos quedamos con el nombre más largo que calce ("septiembre" antes que "sep").
      if (!mesEncontrado || nombre.length > mesEncontrado.largo) {
        mesEncontrado = { mes: MESES[nombre], largo: nombre.length };
      }
    }
  }
  if (!mesEncontrado) return vacio;

  var mesN = mesEncontrado.mes;
  var anioN = ref.getFullYear();
  var anioTexto = t.match(/\b(20\d{2})\b/);
  if (anioTexto) {
    anioN = parseInt(anioTexto[1], 10);
  } else if (mesN < ref.getMonth() + 1 - 6) {
    // Sin año escrito: si el mes ya quedó muy atrás, se refiere al año siguiente.
    anioN = ref.getFullYear() + 1;
  }

  // "20 julio" / "julio 20": el día es el número suelto que no sea el año.
  var dias = t.replace(/\b20\d{2}\b/g, ' ').match(/\b(\d{1,2})\b/);
  if (dias) {
    var diaN = parseInt(dias[1], 10);
    if (diaN >= 1 && diaN <= ultimoDiaDe_(anioN, mesN)) {
      return { fecha: fecha_(anioN, mesN, diaN), texto: bruto, confianza: 'interpretada', aproximada: false };
    }
  }

  // "fin de agosto", "principios de agosto", "mediados de agosto".
  if (/\b(fin|fines|final|finales|ultima|ultimos|fin de mes)\b/.test(t)) {
    return { fecha: fecha_(anioN, mesN, ultimoDiaDe_(anioN, mesN)), texto: bruto,
             confianza: 'aproximada', aproximada: true };
  }
  if (/\b(inicio|inicios|principio|principios|comienzo|comienzos|primera|primeros)\b/.test(t)) {
    return { fecha: fecha_(anioN, mesN, 1), texto: bruto, confianza: 'aproximada', aproximada: true };
  }
  if (/\b(mediados|medio|mitad|quincena)\b/.test(t)) {
    return { fecha: fecha_(anioN, mesN, 15), texto: bruto, confianza: 'aproximada', aproximada: true };
  }

  // Solo el mes: se toma el último día, que es el escenario más exigente.
  return { fecha: fecha_(anioN, mesN, ultimoDiaDe_(anioN, mesN)), texto: bruto,
           confianza: 'aproximada', aproximada: true };
}

/** Días de calendario entre dos fechas (negativo = ya pasó). */
function diasEntre_(desde, hasta) {
  if (!esFecha_(desde) || !esFecha_(hasta)) return null;
  var a = Date.UTC(desde.getFullYear(), desde.getMonth(), desde.getDate());
  var b = Date.UTC(hasta.getFullYear(), hasta.getMonth(), hasta.getDate());
  return Math.round((b - a) / 86400000);
}

function urgenciaPorDias_(dias) {
  if (dias === null || dias === undefined) return URGENCIAS.SIN_FECHA;
  if (dias < 0) return URGENCIAS.VENCIDO;
  if (dias <= MESA.DIAS_CRITICO) return URGENCIAS.CRITICO;
  if (dias <= MESA.DIAS_PROXIMO) return URGENCIAS.PROXIMO;
  return URGENCIAS.HOLGADO;
}

/** "en 12 días", "hace 3 días", "hoy". */
function textoDias_(dias) {
  if (dias === null || dias === undefined) return 'sin fecha';
  if (dias === 0) return 'hoy';
  if (dias === 1) return 'mañana';
  if (dias === -1) return 'ayer';
  return dias > 0 ? 'en ' + dias + ' días' : 'hace ' + Math.abs(dias) + ' días';
}

function nombreMes_(mes) {
  return MESES_NOMBRE[mes - 1] || '';
}

/** "1 fila quedó" / "3 filas quedaron", para que los avisos se lean bien. */
function contar_(cantidad, singular, plural) {
  return cantidad + ' ' + (cantidad === 1 ? singular : plural);
}

// ============================================================================
// Colores
// ============================================================================

function esHex_(valor) {
  return /^#[0-9a-fA-F]{6}$/.test(String(valor === null || valor === undefined ? '' : valor).trim());
}

/** Acepta el nombre del catálogo o un HEX escrito a mano. */
function colorDesde_(valor) {
  var texto = textoDe_(valor);
  if (!texto) return null;
  if (esHex_(texto)) return { nombre: texto.toUpperCase(), hex: texto.toUpperCase() };

  var buscado = normalizar_(texto).replace(/\s+/g, '');
  for (var nombre in CATALOGO_COLORES) {
    if (!Object.prototype.hasOwnProperty.call(CATALOGO_COLORES, nombre)) continue;
    if (normalizar_(nombre).replace(/\s+/g, '') === buscado) {
      return { nombre: nombre, hex: CATALOGO_COLORES[nombre] };
    }
  }
  return null;
}

function hexARgb_(hex) {
  var h = String(hex || '#FFFFFF').replace('#', '');
  return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)];
}

function rgbAHex_(r, g, b) {
  function dos(c) {
    var v = Math.max(0, Math.min(255, Math.round(c))).toString(16);
    return v.length === 1 ? '0' + v : v;
  }
  return '#' + dos(r) + dos(g) + dos(b);
}

/** Mezcla los colores de varios proveedores que comparten una misma celda. */
function mezclarColores_(listaRgb) {
  if (!listaRgb.length) return COLOR_NEUTRO;
  var r = 0, g = 0, b = 0;
  for (var i = 0; i < listaRgb.length; i++) {
    r += listaRgb[i][0]; g += listaRgb[i][1]; b += listaRgb[i][2];
  }
  return rgbAHex_(r / listaRgb.length, g / listaRgb.length, b / listaRgb.length);
}

// ======================================================================
// Esquema.gs
// ======================================================================

/**
 * Esquema de las hojas.
 *
 * Todo el acceso a columnas pasa por aquí y siempre por NOMBRE. Es lo que
 * permite que la mesa conviva con una planilla que ya tiene sus encabezados
 * puestos a mano ("PV", "MAterial", "Descripcion Material") y que se le
 * agreguen columnas nuevas sin mover ni pisar ninguna de las existentes.
 */

function libro_() {
  return MESA.SPREADSHEET_ID
    ? SpreadsheetApp.openById(MESA.SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
}

/** Busca la hoja ignorando mayúsculas, acentos y espacios de más. */
function hoja_(nombre, crearSiFalta) {
  var ss = libro_();
  var exacta = ss.getSheetByName(nombre);
  if (exacta) return exacta;

  var buscado = normalizar_(nombre);
  var hojas = ss.getSheets();
  for (var i = 0; i < hojas.length; i++) {
    if (normalizar_(hojas[i].getName()) === buscado) return hojas[i];
  }
  return crearSiFalta ? ss.insertSheet(nombre) : null;
}

function hojaObligatoria_(nombre) {
  var h = hoja_(nombre, false);
  if (!h) throw new Error('Falta la hoja "' + nombre + '" en la planilla.');
  return h;
}

/** Encabezados de la primera fila, ya normalizados para comparar. */
function encabezados_(hoja) {
  var ultimaCol = hoja.getLastColumn();
  if (ultimaCol < 1) return [];
  return hoja.getRange(1, 1, 1, ultimaCol).getValues()[0].map(function (v) { return textoDe_(v); });
}

/**
 * Posición (base 1) de una columna, probando el nombre oficial y sus alias.
 * Devuelve 0 si no está.
 */
function columna_(encabezados, definicion) {
  var candidatos = [definicion.nombre].concat(definicion.alias || []);
  for (var c = 0; c < candidatos.length; c++) {
    var buscado = normalizar_(candidatos[c]);
    for (var i = 0; i < encabezados.length; i++) {
      if (normalizar_(encabezados[i]) === buscado) return i + 1;
    }
  }
  return 0;
}

/**
 * Mapa columna -> posición para la Hoja Unica, agregando al final las que
 * falten y estén marcadas `crear`.
 *
 * Nunca renombra ni reordena: si "Comentarios Compra" no existe se agrega
 * como columna nueva. Es deliberado, porque en la planilla real la columna
 * que ocupaba esa posición se llama "Puerto Destino" y sí contiene puertos.
 */
function esquemaMesa_(hoja) {
  var cabeceras = encabezados_(hoja);
  var mapa = {};
  var porCrear = [];

  for (var id in COL_MESA) {
    if (!Object.prototype.hasOwnProperty.call(COL_MESA, id)) continue;
    var def = COL_MESA[id];
    var pos = columna_(cabeceras, def);

    if (!pos && def.crear) {
      porCrear.push({ id: id, nombre: def.nombre });
      pos = cabeceras.length + porCrear.length;
    }
    mapa[id] = pos;
  }

  if (porCrear.length) {
    var desde = cabeceras.length + 1;
    var fila = porCrear.map(function (c) { return c.nombre; });
    if (hoja.getMaxColumns() < desde + fila.length - 1) {
      hoja.insertColumnsAfter(hoja.getMaxColumns(), desde + fila.length - 1 - hoja.getMaxColumns());
    }
    hoja.getRange(1, desde, 1, fila.length).setValues([fila]);
  }

  mapa.__total = Math.max(hoja.getLastColumn(), cabeceras.length + porCrear.length);
  mapa.__creadas = porCrear.map(function (c) { return c.nombre; });
  return mapa;
}

/** Lee una celda de una fila ya cargada en memoria. `pos` es base 1; 0 = no existe. */
function celda_(fila, pos) {
  return pos > 0 && pos <= fila.length ? fila[pos - 1] : '';
}

// ============================================================================
// Preparación de hojas
// ============================================================================

/** Deja la Hoja Unica con las columnas de la mesa y las validaciones puestas. */
function prepararMesa_() {
  var hoja = hoja_(MESA.HOJA_MESA, true);
  var esquema = esquemaMesa_(hoja);

  hoja.getRange(1, 1, 1, Math.max(esquema.__total, 1))
    .setFontWeight('bold')
    .setBackground(COLOR_ENCABEZADO)
    .setFontColor(COLOR_ENCABEZADO_TEXTO);
  hoja.setFrozenRows(1);

  aplicarValidaciones_(hoja, esquema);
  return { hoja: hoja, esquema: esquema };
}

/** Desplegables de Estado y de Proveedor sobre toda la columna. */
function aplicarValidaciones_(hoja, esquema) {
  var filas = Math.max(hoja.getMaxRows() - 1, 1);
  var hojaProv = prepararProveedores_();

  if (esquema.estado) {
    hoja.getRange(2, esquema.estado, filas, 1).setDataValidation(
      SpreadsheetApp.newDataValidation()
        .requireValueInList(ESTADOS_LISTA, true)
        .setAllowInvalid(true)
        .build());
  }

  if (esquema.proveedor) {
    var filasProv = Math.max(hojaProv.getMaxRows() - 1, 1);
    hoja.getRange(2, esquema.proveedor, filas, 1).setDataValidation(
      SpreadsheetApp.newDataValidation()
        .requireValueInRange(hojaProv.getRange(2, 1, filasProv, 1), true)
        .setAllowInvalid(true)
        .build());
  }

  if (esquema.fechaProv) {
    hoja.getRange(2, esquema.fechaProv, filas, 1).setNumberFormat('dd-mm-yyyy');
  }
}

/** Crea o repara la hoja Proveedores y pinta cada color en su celda. */
function prepararProveedores_() {
  var hoja = hoja_(MESA.HOJA_PROVEEDORES, true);
  var actuales = encabezados_(hoja);
  var falta = false;

  for (var i = 0; i < COL_PROVEEDORES.length; i++) {
    if (normalizar_(actuales[i] || '') !== normalizar_(COL_PROVEEDORES[i])) { falta = true; break; }
  }
  if (falta) hoja.getRange(1, 1, 1, COL_PROVEEDORES.length).setValues([COL_PROVEEDORES]);

  hoja.getRange(1, 1, 1, COL_PROVEEDORES.length)
    .setFontWeight('bold')
    .setBackground(COLOR_ENCABEZADO)
    .setFontColor(COLOR_ENCABEZADO_TEXTO);
  hoja.setFrozenRows(1);

  var filas = Math.max(hoja.getMaxRows() - 1, 1);
  hoja.getRange(2, 2, filas, 1).setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(Object.keys(CATALOGO_COLORES), true)
      .setAllowInvalid(true)
      .build());
  hoja.getRange(2, 3, filas, 1).setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(['Activo', 'Inactivo'], true)
      .setAllowInvalid(false)
      .build());
  hoja.getRange(1, 2).setNote('Elige un color de la lista o escribe un HEX propio, por ejemplo #88CCFF.');

  pintarCatalogoProveedores_(hoja);
  return hoja;
}

/** Pinta la celda de color de cada proveedor con su propio color. */
function pintarCatalogoProveedores_(hoja) {
  var ultima = hoja.getLastRow();
  if (ultima < 2) return;

  var valores = hoja.getRange(2, 2, ultima - 1, 2).getValues();
  var fondosColor = [];
  var fondosEstado = [];

  for (var i = 0; i < valores.length; i++) {
    var color = colorDesde_(valores[i][0]);
    fondosColor.push([color ? color.hex : COLOR_NEUTRO]);
    fondosEstado.push([normalizar_(valores[i][1]) === 'inactivo' ? '#F4CCCC' : '#D9EAD3']);
  }

  hoja.getRange(2, 2, fondosColor.length, 1).setBackgrounds(fondosColor);
  hoja.getRange(2, 3, fondosEstado.length, 1).setBackgrounds(fondosEstado);
}

/** Bitácora: una fila por mensaje, nunca se sobrescribe. */
function prepararBitacora_() {
  return prepararHojaSimple_(MESA.HOJA_BITACORA, COL_BITACORA, function (hoja) {
    hoja.getRange('A:A').setNumberFormat('dd-mm-yyyy hh:mm');
    hoja.getRange('J:J').setNumberFormat('dd-mm-yyyy');
  });
}

function prepararHistorial_() {
  return prepararHojaSimple_(MESA.HOJA_HISTORIAL, COL_HISTORIAL, function (hoja) {
    hoja.getRange('A:A').setNumberFormat('dd-mm-yyyy hh:mm');
    hoja.getRange('H:K').setNumberFormat('#,##0.00');
  });
}

function prepararHojaSimple_(nombre, columnas, formato) {
  var hoja = hoja_(nombre, true);
  var actuales = encabezados_(hoja);
  var falta = false;

  for (var i = 0; i < columnas.length; i++) {
    if (normalizar_(actuales[i] || '') !== normalizar_(columnas[i])) { falta = true; break; }
  }
  if (falta) hoja.getRange(1, 1, 1, columnas.length).setValues([columnas]);

  hoja.getRange(1, 1, 1, columnas.length)
    .setFontWeight('bold')
    .setBackground(COLOR_ENCABEZADO)
    .setFontColor(COLOR_ENCABEZADO_TEXTO);
  hoja.setFrozenRows(1);
  if (formato) formato(hoja);

  return hoja;
}

// ============================================================================
// Proveedores
// ============================================================================

/** Lista de proveedores con su color ya resuelto a HEX. */
function leerProveedores_() {
  var hoja = prepararProveedores_();
  var ultima = hoja.getLastRow();
  if (ultima < 2) return [];

  var datos = hoja.getRange(2, 1, ultima - 1, COL_PROVEEDORES.length).getValues();
  var fondos = hoja.getRange(2, 2, ultima - 1, 1).getBackgrounds();
  var lista = [];

  for (var i = 0; i < datos.length; i++) {
    var nombre = textoDe_(datos[i][0]);
    if (!nombre) continue;

    var color = colorDesde_(datos[i][1]);
    // Si el color no está escrito pero alguien pintó la celda a mano, se respeta.
    var hex = color ? color.hex
      : (esHex_(fondos[i][0]) && String(fondos[i][0]).toUpperCase() !== '#FFFFFF'
          ? String(fondos[i][0]).toUpperCase()
          : COLOR_NEUTRO);

    lista.push({
      fila: i + 2,
      nombre: nombre,
      color: textoDe_(datos[i][1]),
      hex: hex,
      estado: textoDe_(datos[i][2]) || 'Activo',
      nota: textoDe_(datos[i][3])
    });
  }
  return lista;
}

/** Índice por nombre normalizado, para resolver "guivar" -> "Guivar". */
function indiceProveedores_(lista) {
  var mapa = {};
  for (var i = 0; i < lista.length; i++) {
    mapa[normalizar_(lista[i].nombre)] = lista[i];
  }
  return mapa;
}

function buscarProveedor_(indice, nombre) {
  var clave = normalizar_(nombre);
  return clave && indice[clave] ? indice[clave] : null;
}

// ======================================================================
// Datos.gs
// ======================================================================

/**
 * El modelo de la mesa: un pedido por fila, con todo lo que hace falta para
 * decidir en la reunión.
 *
 * De Bd sale la realidad comercial (cuánto se vendió, cuánto falta por
 * embarcar, para cuándo se comprometió con el cliente). De la Hoja Unica sale
 * la decisión de la mesa (a qué proveedor se le compra, en qué estado va y qué
 * fecha prometió). De la Bitacora sale la conversación.
 *
 * El número que manda la reunión es el DESFASE: cuántos días después del
 * embarque comprometido con el cliente promete entregar el proveedor. Si es
 * positivo, ese pedido llega tarde y hay que hacer algo hoy.
 */

/** Columnas de Bd. Los alias cubren las variantes que aparecen en la práctica. */
const COL_BD = {
  docVenta:   ['Documento de ventas', 'Documento de Venta', 'Pedido de venta'],
  posicion:   ['Posición Ped.Venta', 'Posicion Ped.Venta'],
  material:   ['Material'],
  texto:      ['Texto Comercial', 'Texto comercial'],
  origen:     ['Origen'],
  cliente:    ['Nombre Solicitante', 'Cliente', 'Solicitante'],
  destino:    ['Nombre Destinatario de Mercancía', 'Nombre Destinatario de Mercancia', 'Destinatario'],
  puerto:     ['Puerto Destino', 'Puerto destino'],
  pais:       ['País Destino', 'Pais Destino'],
  incoterm:   ['Incoterms2', 'Incoterms'],
  fechaEmb:   ['Fecha Embarque Comprometida', 'Fecha Compromiso', 'Fecha Embarque'],
  fechaVenta: ['Fecha Crea.Ped.Venta', 'Fecha Creacion Pedido'],
  pedido:     ['Ctd.Ped.(m3)', 'Ctd.Ped. (m3)', 'Cantidad'],
  embarcado:  ['Vol. Embarcado (M3)', 'Vol Embarcado (M3)'],
  porEmbarcar:['P.Emb(M3)', 'P.Emb (M3)', 'Por Embarcar (M3)'],
  transito:   ['Vol. Transito (M3)', 'Vol Transito (M3)'],
  porProducir:['Vol. Producir (M3)', 'Vol Producir (M3)', 'Volumen por producir'],
  estadoPos:  ['Estado Pos'],
  subfamilia: ['Desc. SubFamilia', 'Desc SubFamilia'],
  espesor:    ['Espesor (mm)']
};

function indiceBd_(cabeceras) {
  var mapa = {};
  for (var id in COL_BD) {
    if (!Object.prototype.hasOwnProperty.call(COL_BD, id)) continue;
    mapa[id] = columna_(cabeceras, { nombre: COL_BD[id][0], alias: COL_BD[id].slice(1) });
  }
  return mapa;
}

/**
 * Agrupa Bd por pedido (documento de venta + material) sumando los volúmenes
 * de todas sus posiciones.
 */
function leerBd_(avisos) {
  var hoja = hojaObligatoria_(MESA.HOJA_BD);
  var ultima = hoja.getLastRow();
  var mapa = {};
  if (ultima < 2) return mapa;

  var datos = hoja.getRange(1, 1, ultima, hoja.getLastColumn()).getValues();
  var cab = datos[0].map(function (v) { return textoDe_(v); });
  var col = indiceBd_(cab);

  if (!col.docVenta || !col.material) {
    throw new Error('En la hoja "' + MESA.HOJA_BD + '" faltan las columnas ' +
      '"Documento de ventas" y/o "Material".');
  }

  // El filtro por Origen solo se aplica si de verdad hay filas marcadas. En la
  // planilla real la columna viene vacía en la mayoría, y filtrar de más
  // dejaba la mesa vacía sin decir por qué.
  var conOrigen = 0;
  if (col.origen) {
    for (var k = 1; k < datos.length; k++) {
      if (normalizar_(celda_(datos[k], col.origen)).indexOf(MESA.FILTRO_ORIGEN) !== -1) conOrigen++;
    }
  }
  var filtrar = conOrigen > 0;
  if (col.origen && !filtrar) {
    avisos.push({
      tipo: 'origen',
      texto: 'Ninguna fila de Bd dice "' + MESA.FILTRO_ORIGEN + '" en la columna Origen, ' +
             'así que la mesa está mostrando todas las filas de Bd.'
    });
  }

  var descartadas = 0;
  for (var i = 1; i < datos.length; i++) {
    var fila = datos[i];
    var doc = textoDe_(celda_(fila, col.docVenta));
    var mat = textoDe_(celda_(fila, col.material));
    var id = clave_(doc, mat);
    if (!id) continue;

    if (filtrar && normalizar_(celda_(fila, col.origen)).indexOf(MESA.FILTRO_ORIGEN) === -1) {
      descartadas++;
      continue;
    }

    if (!mapa[id]) {
      var fEmb = interpretarFecha_(celda_(fila, col.fechaEmb));
      mapa[id] = {
        docVenta: doc,
        material: mat,
        texto: textoDe_(celda_(fila, col.texto)),
        origen: textoDe_(celda_(fila, col.origen)),
        cliente: textoDe_(celda_(fila, col.cliente)),
        destinatario: textoDe_(celda_(fila, col.destino)),
        puerto: textoDe_(celda_(fila, col.puerto)),
        pais: textoDe_(celda_(fila, col.pais)),
        incoterm: textoDe_(celda_(fila, col.incoterm)),
        estadoPos: textoDe_(celda_(fila, col.estadoPos)),
        subfamilia: textoDe_(celda_(fila, col.subfamilia)),
        espesor: numero_(celda_(fila, col.espesor)),
        fechaEmbarque: fEmb.fecha,
        posiciones: 0,
        pedido: 0, embarcado: 0, porEmbarcar: 0, transito: 0, porProducir: 0
      };
    }

    var p = mapa[id];
    p.posiciones++;
    p.pedido      += numero_(celda_(fila, col.pedido));
    p.embarcado   += numero_(celda_(fila, col.embarcado));
    p.porEmbarcar += numero_(celda_(fila, col.porEmbarcar));
    p.transito    += numero_(celda_(fila, col.transito));
    p.porProducir += numero_(celda_(fila, col.porProducir));

    // De varias posiciones nos quedamos con el embarque más próximo: es el que
    // manda para la urgencia.
    var otra = interpretarFecha_(celda_(fila, col.fechaEmb)).fecha;
    if (otra && (!p.fechaEmbarque || otra < p.fechaEmbarque)) p.fechaEmbarque = otra;
  }

  if (descartadas) {
    avisos.push({
      tipo: 'origen',
      texto: contar_(descartadas, 'fila de Bd quedó fuera', 'filas de Bd quedaron fuera') +
             ' por no ser de ' + MESA.FILTRO_ORIGEN + '.'
    });
  }
  return mapa;
}

/** Último mensaje de cada área y conteo, leído de la Bitacora. */
function leerBitacora_() {
  var hoja = prepararBitacora_();
  var ultima = hoja.getLastRow();
  var mapa = {};
  if (ultima < 2) return mapa;

  var datos = hoja.getRange(2, 1, ultima - 1, COL_BITACORA.length).getValues();
  for (var i = 0; i < datos.length; i++) {
    var id = textoDe_(datos[i][1]) || clave_(datos[i][2], datos[i][3]);
    if (!id) continue;

    if (!mapa[id]) mapa[id] = { mensajes: [], total: 0 };
    mapa[id].mensajes.push({
      fecha: esFecha_(datos[i][0]) ? datos[i][0] : null,
      fechaTexto: esFecha_(datos[i][0])
        ? formatearFecha_(datos[i][0]) + ' ' + Utilities.formatDate(datos[i][0], zonaHoraria_(), 'HH:mm')
        : textoDe_(datos[i][0]),
      area: textoDe_(datos[i][4]) || AREAS.VENTAS,
      autor: textoDe_(datos[i][5]),
      mensaje: textoDe_(datos[i][6]),
      estado: textoDe_(datos[i][7]),
      proveedor: textoDe_(datos[i][8])
    });
    mapa[id].total++;
  }
  return mapa;
}

function zonaHoraria_() {
  return libro_().getSpreadsheetTimeZone() || Session.getScriptTimeZone() || 'America/Santiago';
}

/**
 * Decide el estado del pedido.
 *
 * Si la columna Estado tiene un valor válido, manda ese: es lo que alguien
 * eligió a mano. Si está vacía se deduce de lo que ya hay escrito, que es como
 * funcionaba antes de que existiera la columna.
 */
function resolverEstado_(explicito, proveedor, comentario, comentarioCompra, tieneFechaProv) {
  var puesto = normalizar_(explicito);
  for (var i = 0; i < ESTADOS_LISTA.length; i++) {
    if (normalizar_(ESTADOS_LISTA[i]) === puesto) return ESTADOS_LISTA[i];
  }

  var todo = normalizar_([comentario, comentarioCompra].join(' '));
  if (/\b(completa|completo|cerrado|cerrada|listo|embarcado)\b/.test(todo)) return ESTADOS.CERRADO;
  if (todo.indexOf('negociacion') !== -1) return ESTADOS.NEGOCIACION;
  if (textoDe_(proveedor)) return tieneFechaProv ? ESTADOS.CONFIRMADO : ESTADOS.ASIGNADO;
  return ESTADOS.PENDIENTE;
}

/**
 * Arma la mesa completa. Es la única función que leen la web y el sidebar.
 */
function datosMesa_() {
  var avisos = [];
  var hoy = new Date();
  var tz = zonaHoraria_();

  var preparada = prepararMesa_();
  var hojaMesa = preparada.hoja;
  var esq = preparada.esquema;

  if (esq.__creadas.length) {
    avisos.push({
      tipo: 'columnas',
      texto: 'Se agregaron a la Hoja Unica las columnas: ' + esq.__creadas.join(', ') + '.'
    });
  }

  var bd = leerBd_(avisos);
  var proveedores = leerProveedores_();
  var indiceProv = indiceProveedores_(proveedores);
  var bitacora = leerBitacora_();

  var ultima = hojaMesa.getLastRow();
  var filas = ultima >= 2
    ? hojaMesa.getRange(2, 1, ultima - 1, Math.max(esq.__total, 1)).getValues()
    : [];

  var pedidos = [];
  var vistos = {};
  var interpretadas = 0;
  var sinBd = 0;

  for (var i = 0; i < filas.length; i++) {
    var fila = filas[i];
    var doc = textoDe_(celda_(fila, esq.docVenta));
    var mat = textoDe_(celda_(fila, esq.material));
    if (!doc && !mat) continue;

    var id = clave_(doc, mat);
    var info = bd[id] || {};
    if (!bd[id]) sinBd++;
    if (id) vistos[id] = true;

    var proveedorTexto = textoDe_(celda_(fila, esq.proveedor));
    var prov = buscarProveedor_(indiceProv, proveedorTexto);
    var comentario = textoDe_(celda_(fila, esq.comentario));
    var comentarioCompra = textoDe_(celda_(fila, esq.comentarioC));

    // La fecha que promete el proveedor: primero la columna dedicada; si está
    // vacía, se interpreta el comentario ("20 julio", "FIN AGOSTO"). Así los
    // comentarios que ya estaban escritos se convierten solos.
    var fp = interpretarFecha_(celda_(fila, esq.fechaProv), info.fechaEmbarque);
    var desdeComentario = false;
    if (!fp.fecha && comentario) {
      var alterno = interpretarFecha_(comentario, info.fechaEmbarque);
      if (alterno.fecha) { fp = alterno; desdeComentario = true; interpretadas++; }
    }

    var estado = resolverEstado_(
      celda_(fila, esq.estado), proveedorTexto, comentario, comentarioCompra, !!fp.fecha);

    var diasEmbarque = info.fechaEmbarque ? diasEntre_(hoy, info.fechaEmbarque) : null;
    var urgencia = estado === ESTADOS.CERRADO ? URGENCIAS.HOLGADO : urgenciaPorDias_(diasEmbarque);

    // Desfase: días que el proveedor promete DESPUÉS del embarque comprometido.
    var desfase = (info.fechaEmbarque && fp.fecha) ? diasEntre_(info.fechaEmbarque, fp.fecha) : null;

    var hilo = bitacora[id] || { mensajes: [], total: 0 };
    var pedido = {
      id: id || ('fila-' + (i + 2)),
      fila: i + 2,
      docVenta: doc,
      material: mat,
      texto: textoDe_(celda_(fila, esq.texto)) || info.texto || '',
      origen: textoDe_(celda_(fila, esq.origen)) || info.origen || '',
      cliente: info.cliente || '',
      destinatario: info.destinatario || '',
      puerto: textoDe_(celda_(fila, esq.puerto)) || info.puerto || '',
      pais: info.pais || '',
      incoterm: info.incoterm || '',
      estadoPos: info.estadoPos || '',
      subfamilia: info.subfamilia || '',

      pedidoM3: info.pedido || 0,
      embarcadoM3: info.embarcado || 0,
      porEmbarcarM3: info.porEmbarcar || 0,
      transitoM3: info.transito || 0,
      porProducirM3: info.porProducir || 0,
      posiciones: info.posiciones || 0,
      enBd: !!bd[id],

      fechaEmbarque: info.fechaEmbarque ? formatearFecha_(info.fechaEmbarque) : '',
      ordenEmbarque: info.fechaEmbarque ? claveFecha_(info.fechaEmbarque) : '',
      diasEmbarque: diasEmbarque,
      diasTexto: textoDias_(diasEmbarque),

      proveedor: proveedorTexto,
      proveedorColor: prov ? prov.hex : COLOR_SIN_PROVEEDOR,
      proveedorNota: prov ? prov.nota : '',
      proveedorConocido: !!prov,

      estado: estado,
      estadoClave: normalizar_(estado).replace(/\s+/g, '-'),
      estadoColor: COLOR_ESTADO[estado] || COLOR_ESTADO[ESTADOS.PENDIENTE],

      fechaProveedor: fp.fecha ? formatearFecha_(fp.fecha) : '',
      fechaProveedorTextoOriginal: fp.fecha ? fp.texto : '',
      fechaProveedorConfianza: fp.confianza,
      fechaProveedorDesdeComentario: desdeComentario,
      desfase: desfase,

      comentario: comentario,
      comentarioCompra: comentarioCompra,
      mensajes: hilo.mensajes,
      totalMensajes: hilo.total,

      urgencia: urgencia.clave,
      urgenciaEtiqueta: urgencia.etiqueta
    };

    pedido.alerta = calcularAlerta_(pedido);
    pedidos.push(pedido);
  }

  // Pedidos que están en Bd pero todavía no bajaron a la Hoja Unica.
  var faltantes = 0;
  for (var k in bd) {
    if (Object.prototype.hasOwnProperty.call(bd, k) && !vistos[k]) faltantes++;
  }
  if (faltantes) {
    avisos.push({
      tipo: 'nuevos',
      texto: contar_(faltantes, 'pedido de Bd todavía no está', 'pedidos de Bd todavía no están') +
             ' en la mesa. Usa "Sincronizar" para traerlos.'
    });
  }
  if (sinBd) {
    avisos.push({
      tipo: 'sinbd',
      texto: contar_(sinBd, 'pedido de la Hoja Unica ya no aparece', 'pedidos de la Hoja Unica ya no aparecen') +
             ' en Bd: quedan sin volumen ni fechas.'
    });
  }
  if (interpretadas) {
    avisos.push({
      tipo: 'fechas',
      texto: contar_(interpretadas, 'comentario se leyó', 'comentarios se leyeron') +
             ' como fecha de compromiso del proveedor. Revísalos y guárdalos para dejarlos fijos.'
    });
  }

  ordenarPedidos_(pedidos);

  return {
    titulo: 'Mesa Trading',
    planilla: libro_().getName(),
    zona: tz,
    actualizado: Utilities.formatDate(hoy, tz, 'dd-MM-yyyy HH:mm'),
    usuario: usuarioActual_(),
    estados: ESTADOS_LISTA,
    proveedores: proveedores,
    colores: coloresParaPanel_(),
    pedidos: pedidos,
    kpis: calcularKpis_(pedidos),
    porProveedor: resumenPorProveedor_(pedidos, indiceProv),
    agenda: construirAgenda_(pedidos),
    avisos: avisos
  };
}

/**
 * Por qué este pedido necesita que alguien haga algo.
 *
 * El orden importa: se busca la CAUSA sobre la que se puede actuar, no el
 * síntoma. Un embarque vencido cuyo proveedor además promete tarde se discute
 * como problema del proveedor, porque eso es lo que hay que ir a resolver.
 * "Vencido" queda para los que ya tienen proveedor comprometido en fecha y
 * aun así siguen abiertos.
 */
function calcularAlerta_(p) {
  if (p.estado === ESTADOS.CERRADO) return null;

  if (p.desfase !== null && p.desfase > 0) {
    return {
      clave: 'desfase',
      etiqueta: 'Proveedor entrega ' + p.desfase + ' días tarde',
      nivel: p.desfase > 30 ? 'alto' : 'medio'
    };
  }
  if ((p.urgencia === 'vencido' || p.urgencia === 'critico') &&
      (p.estado === ESTADOS.PENDIENTE || p.estado === ESTADOS.NEGOCIACION)) {
    return {
      clave: 'sin-proveedor',
      etiqueta: p.urgencia === 'vencido' ? 'Vencido y sin proveedor cerrado' : 'Embarque esta semana y sin cerrar',
      nivel: 'alto'
    };
  }
  if (p.urgencia === 'vencido' && p.porEmbarcarM3 > 0) {
    return { clave: 'vencido', etiqueta: 'Embarque vencido y todavía abierto', nivel: 'medio' };
  }
  if (!p.fechaEmbarque && p.porEmbarcarM3 > 0) {
    return { clave: 'sin-fecha', etiqueta: 'Sin fecha de embarque', nivel: 'bajo' };
  }
  return null;
}

/** Primero lo que quema: alerta alta, luego embarque más próximo. */
function ordenarPedidos_(pedidos) {
  var peso = { alto: 0, medio: 1, bajo: 2 };
  pedidos.sort(function (a, b) {
    var pa = a.alerta ? peso[a.alerta.nivel] : 3;
    var pb = b.alerta ? peso[b.alerta.nivel] : 3;
    if (pa !== pb) return pa - pb;
    var fa = a.ordenEmbarque || '99999999';
    var fb = b.ordenEmbarque || '99999999';
    if (fa !== fb) return fa < fb ? -1 : 1;
    return b.porEmbarcarM3 - a.porEmbarcarM3;
  });
}

function calcularKpis_(pedidos) {
  var k = {
    total: pedidos.length,
    pedidoM3: 0, embarcadoM3: 0, porEmbarcarM3: 0, porProducirM3: 0,
    enRiesgo: 0, riesgoM3: 0, sinProveedor: 0, sinProveedorM3: 0,
    desfaseM3: 0, proveedoresUsados: 0
  };
  var porEstado = {};
  var provs = {};

  for (var i = 0; i < ESTADOS_LISTA.length; i++) porEstado[ESTADOS_LISTA[i]] = 0;

  for (var j = 0; j < pedidos.length; j++) {
    var p = pedidos[j];
    k.pedidoM3      += p.pedidoM3;
    k.embarcadoM3   += p.embarcadoM3;
    k.porEmbarcarM3 += p.porEmbarcarM3;
    k.porProducirM3 += p.porProducirM3;

    porEstado[p.estado] = (porEstado[p.estado] || 0) + 1;
    if (p.proveedor) provs[normalizar_(p.proveedor)] = true;

    if (p.alerta) { k.enRiesgo++; k.riesgoM3 += p.porEmbarcarM3; }
    if (!p.proveedor && p.estado !== ESTADOS.CERRADO) {
      k.sinProveedor++;
      k.sinProveedorM3 += p.porEmbarcarM3;
    }
    if (p.desfase !== null && p.desfase > 0) k.desfaseM3 += p.porEmbarcarM3;
  }

  k.proveedoresUsados = Object.keys(provs).length;
  k.porEstado = porEstado;
  k.texto = {
    pedidoM3: formatearNumero_(k.pedidoM3),
    embarcadoM3: formatearNumero_(k.embarcadoM3),
    porEmbarcarM3: formatearNumero_(k.porEmbarcarM3),
    porProducirM3: formatearNumero_(k.porProducirM3),
    riesgoM3: formatearNumero_(k.riesgoM3),
    sinProveedorM3: formatearNumero_(k.sinProveedorM3),
    desfaseM3: formatearNumero_(k.desfaseM3)
  };
  return k;
}

/** Cuánto volumen le estamos comprando a cada proveedor. */
function resumenPorProveedor_(pedidos, indiceProv) {
  var mapa = {};

  for (var i = 0; i < pedidos.length; i++) {
    var p = pedidos[i];
    var nombre = p.proveedor || 'Sin asignar';
    var clave = normalizar_(nombre);

    if (!mapa[clave]) {
      var prov = buscarProveedor_(indiceProv, nombre);
      mapa[clave] = {
        nombre: p.proveedor || 'Sin asignar',
        hex: prov ? prov.hex : COLOR_SIN_PROVEEDOR,
        pedidos: 0, porEmbarcarM3: 0, enRiesgo: 0, asignado: !!p.proveedor
      };
    }
    mapa[clave].pedidos++;
    mapa[clave].porEmbarcarM3 += p.porEmbarcarM3;
    if (p.alerta) mapa[clave].enRiesgo++;
  }

  var lista = [];
  for (var k in mapa) {
    if (!Object.prototype.hasOwnProperty.call(mapa, k)) continue;
    mapa[k].porEmbarcarTexto = formatearNumero_(mapa[k].porEmbarcarM3);
    lista.push(mapa[k]);
  }
  lista.sort(function (a, b) { return b.porEmbarcarM3 - a.porEmbarcarM3; });
  return lista;
}

/**
 * La pauta de la reunión: los pedidos que necesitan una decisión, agrupados
 * por el motivo. Es lo que se proyecta en el modo reunión.
 */
function construirAgenda_(pedidos) {
  // El orden de los grupos es el orden en que conviene tratarlos en la reunión:
  // primero lo que se decide en la mesa, después lo que hay que explicar.
  var grupos = [
    { clave: 'sin-proveedor', titulo: 'Hay que asignar proveedor', detalle: 'El embarque está encima y la compra sigue sin cerrarse.', pedidos: [] },
    { clave: 'desfase', titulo: 'El proveedor llega tarde', detalle: 'La fecha que prometió el proveedor es posterior al embarque comprometido.', pedidos: [] },
    { clave: 'vencido', titulo: 'Vencidos y todavía abiertos', detalle: 'Ya hay proveedor en fecha, pero el embarque comprometido pasó.', pedidos: [] },
    { clave: 'sin-fecha', titulo: 'Sin fecha comprometida', detalle: 'Falta definir cuándo embarca.', pedidos: [] }
  ];
  var indice = {};
  for (var g = 0; g < grupos.length; g++) indice[grupos[g].clave] = grupos[g];

  for (var i = 0; i < pedidos.length; i++) {
    var p = pedidos[i];
    if (!p.alerta) continue;
    var destino = indice[p.alerta.clave];
    if (destino) destino.pedidos.push(p);
  }

  return grupos.filter(function (g) { return g.pedidos.length > 0; }).map(function (g) {
    var m3 = 0;
    for (var i = 0; i < g.pedidos.length; i++) m3 += g.pedidos[i].porEmbarcarM3;
    g.totalM3 = m3;
    g.totalM3Texto = formatearNumero_(m3);
    return g;
  });
}

function coloresParaPanel_() {
  var salida = [];
  for (var nombre in CATALOGO_COLORES) {
    if (!Object.prototype.hasOwnProperty.call(CATALOGO_COLORES, nombre)) continue;
    salida.push({ nombre: nombre, hex: CATALOGO_COLORES[nombre] });
  }
  return salida;
}

/** Correo de quien está usando la mesa; vacío si Google no lo entrega. */
function usuarioActual_() {
  try {
    return Session.getActiveUser().getEmail() || '';
  } catch (e) {
    return '';
  }
}

// ======================================================================
// Acciones.gs
// ======================================================================

/**
 * Todo lo que escribe en la planilla.
 *
 * Dos reglas que valen para este archivo entero:
 *
 *   - Guardar un pedido escribe UNA fila y nada más. La sincronización pesada
 *     (repintar la tabla de seguimiento) va por su lado, a mano o cada hora.
 *     Antes cada "Guardar" repintaba la planilla completa y tardaba segundos.
 *
 *   - Pintar se hace por lotes. La tabla de seguimiento son ~110 materiales
 *     por ~13 fechas: celda por celda son más de mil llamadas y se acaba el
 *     tiempo de ejecución. Con setBackgrounds/setNotes son dos.
 */

function conBloqueo_(fn) {
  var lock = LockService.getDocumentLock();
  if (!lock.tryLock(MESA.SEGUNDOS_LOCK * 1000)) {
    throw new Error('La planilla está ocupada procesando otro cambio. Intenta de nuevo en unos segundos.');
  }
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

function limpiarCache_() {
  try {
    CacheService.getDocumentCache().remove(MESA.CACHE_CLAVE);
  } catch (e) {
    // Sin caché disponible no pasa nada: se vuelve a leer de la planilla.
  }
}

// ============================================================================
// Guardar un pedido
// ============================================================================

/**
 * Guarda la decisión de la mesa sobre un pedido y, si viene mensaje, lo suma
 * a la bitácora.
 *
 * payload: { fila, docVenta, material, proveedor, estado, fechaProveedor,
 *            mensaje, area }
 */
function guardarPedido(payload) {
  payload = payload || {};

  return conBloqueo_(function () {
    var preparada = prepararMesa_();
    var hoja = preparada.hoja;
    var esq = preparada.esquema;
    var fila = ubicarFila_(hoja, esq, payload);

    if (!fila) throw new Error('No encontré el pedido en la Hoja Unica.');

    var proveedores = leerProveedores_();
    var indiceProv = indiceProveedores_(proveedores);
    var proveedor = textoDe_(payload.proveedor);

    if (proveedor && !buscarProveedor_(indiceProv, proveedor)) {
      throw new Error('El proveedor "' + proveedor + '" no está en la hoja Proveedores. ' +
        'Agrégalo primero desde el panel de proveedores.');
    }

    var actual = hoja.getRange(fila, 1, 1, esq.__total).getValues()[0];
    var docVenta = textoDe_(celda_(actual, esq.docVenta));
    var material = textoDe_(celda_(actual, esq.material));
    var id = clave_(docVenta, material);

    var area = normalizar_(payload.area) === normalizar_(AREAS.COMPRAS) ? AREAS.COMPRAS : AREAS.VENTAS;
    var mensaje = textoDe_(payload.mensaje);
    var usuario = usuarioActual_();
    var ahora = new Date();

    // Estado: el que venga, o el que corresponda por lo que ya hay.
    var estado = textoDe_(payload.estado);
    var interpretada = interpretarFecha_(payload.fechaProveedor);
    if (!estado) {
      estado = resolverEstado_('', proveedor, mensaje, '', !!interpretada.fecha);
    }

    if (esq.proveedor) escribir_(hoja, fila, esq.proveedor, proveedor);
    if (esq.estado) escribir_(hoja, fila, esq.estado, estado);
    if (esq.fechaProv) escribir_(hoja, fila, esq.fechaProv, interpretada.fecha || '');

    // La celda de comentario de la Hoja Unica guarda el último mensaje del
    // área: así la tabla dinámica de siempre sigue mostrando lo mismo de antes.
    if (mensaje) {
      var destino = area === AREAS.COMPRAS ? esq.comentarioC : esq.comentario;
      if (destino) escribir_(hoja, fila, destino, mensaje);
    }

    if (esq.actualizado) {
      escribir_(hoja, fila, esq.actualizado,
        Utilities.formatDate(ahora, zonaHoraria_(), 'dd-MM-yyyy HH:mm') + (usuario ? ' · ' + usuario : ''));
    }

    pintarFilaMesa_(hoja, esq, fila, proveedor, estado, indiceProv);

    if (esq.estado && usuario) {
      hoja.getRange(fila, esq.estado).setNote(
        estado + ' por ' + usuario + ' el ' +
        Utilities.formatDate(ahora, zonaHoraria_(), 'dd-MM-yyyy HH:mm'));
    }

    if (mensaje && id) {
      anotarBitacora_({
        fecha: ahora, id: id, docVenta: docVenta, material: material,
        area: area, autor: usuario, mensaje: mensaje,
        estado: estado, proveedor: proveedor, fechaCompromiso: interpretada.fecha
      });
    }

    limpiarCache_();
    return datosMesa_();
  });
}

/** Escribe respetando el tipo: las fechas van como fecha, no como texto. */
function escribir_(hoja, fila, columna, valor) {
  if (!columna) return;
  hoja.getRange(fila, columna).setValue(valor === null || valor === undefined ? '' : valor);
}

/** Ubica la fila por número y, si no calza, por documento de venta + material. */
function ubicarFila_(hoja, esq, payload) {
  var ultima = hoja.getLastRow();
  var fila = parseInt(payload.fila, 10);
  var buscada = clave_(payload.docVenta, payload.material);

  if (fila >= 2 && fila <= ultima) {
    if (!buscada) return fila;
    var actual = hoja.getRange(fila, 1, 1, esq.__total).getValues()[0];
    if (clave_(celda_(actual, esq.docVenta), celda_(actual, esq.material)) === buscada) return fila;
    // La fila cambió de lugar (alguien ordenó la hoja): se busca por clave.
  }
  if (!buscada || ultima < 2) return 0;

  var datos = hoja.getRange(2, 1, ultima - 1, esq.__total).getValues();
  for (var i = 0; i < datos.length; i++) {
    if (clave_(celda_(datos[i], esq.docVenta), celda_(datos[i], esq.material)) === buscada) return i + 2;
  }
  return 0;
}

function pintarFilaMesa_(hoja, esq, fila, proveedor, estado, indiceProv) {
  var prov = buscarProveedor_(indiceProv, proveedor);
  if (esq.proveedor) {
    hoja.getRange(fila, esq.proveedor).setBackground(prov ? prov.hex : COLOR_SIN_PROVEEDOR);
  }
  if (esq.estado) {
    var color = COLOR_ESTADO[estado] || COLOR_ESTADO[ESTADOS.PENDIENTE];
    hoja.getRange(fila, esq.estado).setBackground(color.fondo).setFontColor(color.texto);
  }
}

function anotarBitacora_(m) {
  var hoja = prepararBitacora_();
  hoja.appendRow([
    m.fecha, m.id, m.docVenta, m.material,
    m.area, m.autor || '(sin identificar)', m.mensaje,
    m.estado || '', m.proveedor || '', m.fechaCompromiso || ''
  ]);
}

/** Agrega un mensaje sin tocar proveedor ni estado. */
function comentarPedido(payload) {
  payload = payload || {};
  if (!textoDe_(payload.mensaje)) throw new Error('Escribe un mensaje antes de enviarlo.');

  return guardarPedido({
    fila: payload.fila,
    docVenta: payload.docVenta,
    material: payload.material,
    proveedor: payload.proveedor,
    estado: payload.estado,
    fechaProveedor: payload.fechaProveedor,
    mensaje: payload.mensaje,
    area: payload.area
  });
}

// ============================================================================
// Proveedores
// ============================================================================

function guardarProveedor(datos) {
  datos = datos || {};
  var nombre = textoDe_(datos.nombre);
  if (!nombre) throw new Error('Indica el nombre del proveedor.');

  var color = colorDesde_(datos.color || 'Gris');
  if (!color) throw new Error('Color no válido. Usa uno de la lista o un HEX como #88CCFF.');

  return conBloqueo_(function () {
    var hoja = prepararProveedores_();
    var ultima = Math.max(hoja.getLastRow(), 1);
    var filas = ultima >= 2 ? hoja.getRange(2, 1, ultima - 1, 1).getValues() : [];
    var destino = 0;
    var buscado = normalizar_(nombre);

    for (var i = 0; i < filas.length; i++) {
      if (normalizar_(filas[i][0]) === buscado) { destino = i + 2; break; }
    }
    if (!destino) destino = ultima + 1;

    hoja.getRange(destino, 1, 1, COL_PROVEEDORES.length).setValues([[
      nombre, color.nombre, textoDe_(datos.estado) || 'Activo', textoDe_(datos.nota)
    ]]);
    pintarCatalogoProveedores_(hoja);

    limpiarCache_();
    return { ok: true, mensaje: 'Proveedor guardado: ' + nombre, proveedores: leerProveedores_() };
  });
}

// ============================================================================
// Traer pedidos nuevos desde Bd
// ============================================================================

/**
 * Baja a la Hoja Unica los pedidos de Bd que todavía no están.
 * No toca los que ya existen: la decisión de la mesa nunca se sobrescribe.
 */
function traerPedidosNuevos() {
  return conBloqueo_(function () {
    var avisos = [];
    var bd = leerBd_(avisos);
    var preparada = prepararMesa_();
    var hoja = preparada.hoja;
    var esq = preparada.esquema;

    var ultima = hoja.getLastRow();
    var existentes = {};
    if (ultima >= 2) {
      var datos = hoja.getRange(2, 1, ultima - 1, esq.__total).getValues();
      for (var i = 0; i < datos.length; i++) {
        var id = clave_(celda_(datos[i], esq.docVenta), celda_(datos[i], esq.material));
        if (id) existentes[id] = true;
      }
    }

    var nuevas = [];
    for (var k in bd) {
      if (!Object.prototype.hasOwnProperty.call(bd, k) || existentes[k]) continue;
      var p = bd[k];
      var fila = new Array(esq.__total);
      for (var c = 0; c < esq.__total; c++) fila[c] = '';

      poner_(fila, esq.origen, p.origen || 'Bd');
      poner_(fila, esq.docVenta, p.docVenta);
      poner_(fila, esq.material, p.material);
      poner_(fila, esq.texto, p.texto);
      poner_(fila, esq.puerto, p.puerto);
      poner_(fila, esq.estado, ESTADOS.PENDIENTE);
      nuevas.push(fila);
    }

    if (nuevas.length) {
      var desde = hoja.getLastRow() + 1;
      hoja.getRange(desde, 1, nuevas.length, esq.__total).setValues(nuevas);
      if (esq.proveedor) {
        hoja.getRange(desde, esq.proveedor, nuevas.length, 1).setBackground(COLOR_SIN_PROVEEDOR);
      }
      if (esq.estado) {
        var c = COLOR_ESTADO[ESTADOS.PENDIENTE];
        hoja.getRange(desde, esq.estado, nuevas.length, 1)
          .setBackground(c.fondo).setFontColor(c.texto);
      }
    }

    limpiarCache_();
    return { ok: true, nuevos: nuevas.length, avisos: avisos };
  });
}

function poner_(fila, columna, valor) {
  if (columna > 0) fila[columna - 1] = valor === null || valor === undefined ? '' : valor;
}

// ============================================================================
// Tabla Seguimiento: pintado por lotes
// ============================================================================

/**
 * Repinta la tabla dinámica de seguimiento: cada celda con volumen queda del
 * color del proveedor asignado y con una nota que dice qué pedido es, en qué
 * estado va y qué se conversó.
 *
 * Estructura esperada (la que ya tiene la planilla):
 *   fila 1: título
 *   fila 2: Material | Texto Comercial | fechas... | Suma total | ... | Proveedores
 *   fila 3 en adelante: datos
 */
function sincronizarSeguimiento() {
  var hoja = hoja_(MESA.HOJA_SEGUIMIENTO, false);
  if (!hoja) return { ok: false, mensaje: 'No existe la hoja "' + MESA.HOJA_SEGUIMIENTO + '".' };

  var ultimaFila = hoja.getLastRow();
  var ultimaCol = hoja.getLastColumn();
  if (ultimaFila < 3 || ultimaCol < 3) {
    return { ok: false, mensaje: 'La tabla de seguimiento no tiene datos todavía.' };
  }

  var datos = hoja.getRange(1, 1, ultimaFila, ultimaCol).getValues();
  var cabecera = datos[1];

  var colSuma = -1;
  for (var c = 0; c < cabecera.length; c++) {
    if (normalizar_(cabecera[c]) === 'suma total') { colSuma = c; break; }
  }
  if (colSuma === -1) colSuma = ultimaCol - 1;

  var colProveedores = -1;
  for (var cp = 0; cp < cabecera.length; cp++) {
    if (normalizar_(cabecera[cp]) === 'proveedores') { colProveedores = cp; break; }
  }

  // Fechas de las columnas, comparadas por clave yyyyMMdd. Es lo que arregla
  // que "5/08/2026" no calzara nunca con el "05-08-2026" de Bd.
  var fechasCol = [];
  for (var f = 2; f < colSuma; f++) {
    fechasCol.push(claveFecha_(interpretarFecha_(cabecera[f]).fecha));
  }

  var mesa = datosMesa_();
  var porMaterial = {};
  for (var i = 0; i < mesa.pedidos.length; i++) {
    var p = mesa.pedidos[i];
    if (!p.material) continue;
    var claveMat = normalizar_(p.material);
    if (!porMaterial[claveMat]) porMaterial[claveMat] = {};

    var claveF = p.ordenEmbarque || 'sin-fecha';
    if (!porMaterial[claveMat][claveF]) porMaterial[claveMat][claveF] = [];
    porMaterial[claveMat][claveF].push(p);
  }

  var provIndice = indiceProveedores_(mesa.proveedores);
  var alto = ultimaFila - 2;
  var ancho = colSuma - 2;
  if (alto < 1 || ancho < 1) return { ok: false, mensaje: 'No hay celdas de fecha que pintar.' };

  var fondos = [];
  var notas = [];
  var pintadas = 0;

  for (var r = 2; r < ultimaFila; r++) {
    var filaFondos = [];
    var filaNotas = [];
    var material = normalizar_(datos[r][0]);
    var delMaterial = porMaterial[material] || {};

    for (var col = 2; col < colSuma; col++) {
      var valor = datos[r][col];
      var lista = delMaterial[fechasCol[col - 2]];
      var vacia = valor === '' || valor === null || numero_(valor) === 0;

      if (vacia || !lista || !lista.length) {
        filaFondos.push(COLOR_NEUTRO);
        filaNotas.push('');
        continue;
      }

      var colores = [];
      var lineas = [];
      for (var n = 0; n < lista.length; n++) {
        var ped = lista[n];
        lineas.push(lineaNota_(ped));
        var prov = buscarProveedor_(provIndice, ped.proveedor);
        if (prov) colores.push(hexARgb_(prov.hex));
      }

      filaFondos.push(colores.length ? mezclarColores_(colores) : COLOR_SIN_PROVEEDOR);
      filaNotas.push(
        (lista.length > 1 ? lista.length + ' pedidos en esta fecha' : 'Pedido') + '\n\n' +
        lineas.join('\n\n'));
      pintadas++;
    }

    fondos.push(filaFondos);
    notas.push(filaNotas);
  }

  // Dos llamadas para toda la tabla, en vez de una por celda.
  var rango = hoja.getRange(3, 3, alto, ancho);
  rango.setBackgrounds(fondos);
  rango.setNotes(notas);

  if (colProveedores !== -1) escribirProveedoresSeguimiento_(hoja, datos, porMaterial, colProveedores, ultimaFila);

  return { ok: true, celdas: pintadas, mensaje: 'Seguimiento actualizado: ' + pintadas + ' celdas con pedido.' };
}

/** Una línea de nota por pedido: proveedor, estado, compromiso y comentarios. */
function lineaNota_(p) {
  var partes = ['Pedido ' + p.docVenta + '  ·  ' + p.estado];
  partes.push(p.proveedor ? 'Proveedor: ' + p.proveedor : 'Proveedor: sin asignar');

  if (p.fechaProveedor) {
    var nota = 'Compromiso proveedor: ' + p.fechaProveedor;
    if (p.fechaProveedorConfianza === 'aproximada') nota += ' (aprox.)';
    if (p.desfase !== null && p.desfase > 0) nota += '  ->  ' + p.desfase + ' días tarde';
    partes.push(nota);
  }
  if (p.porEmbarcarM3) partes.push('Por embarcar: ' + formatearNumero_(p.porEmbarcarM3) + ' m3');
  if (p.comentario) partes.push('Ventas: ' + p.comentario);
  if (p.comentarioCompra) partes.push('Compras: ' + p.comentarioCompra);

  return partes.join('\n');
}

/** Deja en la columna "Proveedores" quién surte cada material. */
function escribirProveedoresSeguimiento_(hoja, datos, porMaterial, colProveedores, ultimaFila) {
  var valores = [];
  for (var r = 2; r < ultimaFila; r++) {
    var delMaterial = porMaterial[normalizar_(datos[r][0])] || {};
    var nombres = {};
    for (var f in delMaterial) {
      if (!Object.prototype.hasOwnProperty.call(delMaterial, f)) continue;
      for (var i = 0; i < delMaterial[f].length; i++) {
        var nombre = delMaterial[f][i].proveedor;
        if (nombre) nombres[nombre] = true;
      }
    }
    valores.push([Object.keys(nombres).join(', ')]);
  }
  if (valores.length) hoja.getRange(3, colProveedores + 1, valores.length, 1).setValues(valores);
}

// ============================================================================
// Historial de volumen
// ============================================================================

/** Anota solo los pedidos cuyo volumen por producir cambió desde la vez pasada. */
function registrarHistorial() {
  return conBloqueo_(function () {
    var mesa = datosMesa_();
    var hoja = prepararHistorial_();
    var previo = estadoHistorial_(hoja);
    var filas = [];
    var ahora = new Date();

    for (var i = 0; i < mesa.pedidos.length; i++) {
      var p = mesa.pedidos[i];
      if (!p.id) continue;

      var actual = Number(p.porProducirM3 || 0);
      var antes = previo[p.id];
      if (antes && Math.abs(antes.ultimo - actual) < 0.000001) continue;

      var inicial = antes ? antes.inicial : actual;
      var anterior = antes ? antes.ultimo : actual;

      filas.push([
        ahora, p.docVenta, p.material, p.texto, p.cliente, p.proveedor, p.estado,
        inicial, actual, inicial - actual, anterior - actual,
        p.comentario, p.comentarioCompra, p.fila, p.id
      ]);
    }

    if (filas.length) {
      hoja.getRange(hoja.getLastRow() + 1, 1, filas.length, COL_HISTORIAL.length).setValues(filas);
    }
    return { ok: true, registrados: filas.length, revisados: mesa.pedidos.length };
  });
}

function estadoHistorial_(hoja) {
  var ultima = hoja.getLastRow();
  var estado = {};
  if (ultima < 2) return estado;

  var datos = hoja.getRange(2, 1, ultima - 1, COL_HISTORIAL.length).getValues();
  for (var i = 0; i < datos.length; i++) {
    var id = textoDe_(datos[i][14]) || clave_(datos[i][1], datos[i][2]);
    if (!id) continue;

    var inicial = numero_(datos[i][7]);
    var actual = numero_(datos[i][8]);
    if (!inicial && actual) inicial = actual;

    if (!estado[id]) estado[id] = { inicial: inicial, ultimo: actual };
    else estado[id].ultimo = actual;
  }
  return estado;
}

// ============================================================================
// Sincronización completa y automatización
// ============================================================================

/** Lo que corre el trigger cada hora y el botón "Sincronizar todo". */
function sincronizarTodo() {
  var nuevos = traerPedidosNuevos();
  var seguimiento = sincronizarSeguimiento();
  var historial = registrarHistorial();
  limpiarCache_();

  return {
    ok: true,
    nuevos: nuevos.nuevos,
    celdas: seguimiento.celdas || 0,
    registrados: historial.registrados,
    mensaje: 'Pedidos nuevos: ' + nuevos.nuevos +
             ' · Celdas de seguimiento: ' + (seguimiento.celdas || 0) +
             ' · Cambios de volumen: ' + historial.registrados
  };
}

function instalarAutomatizacion() {
  var handler = 'sincronizarTodo';
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === handler) ScriptApp.deleteTrigger(triggers[i]);
  }
  ScriptApp.newTrigger(handler).timeBased().everyHours(1).create();
  return { ok: true, mensaje: 'Sincronización automática cada 1 hora.' };
}

/**
 * Deja la planilla lista de una sola vez: hojas, columnas, validaciones,
 * pedidos nuevos y la automatización.
 */
function instalarMesaTrading() {
  prepararProveedores_();
  prepararBitacora_();
  prepararHistorial_();
  prepararMesa_();

  var resultado = sincronizarTodo();
  var trigger = instalarAutomatizacion();

  return {
    ok: true,
    mensaje: 'Mesa instalada.\n' + resultado.mensaje + '\n' + trigger.mensaje
  };
}

// ======================================================================
// WebApp.gs
// ======================================================================

/**
 * Puertas de entrada: la aplicación web, el menú de la planilla y el panel
 * lateral.
 *
 * Las funciones sin guion bajo al final son las que puede llamar el navegador
 * con google.script.run. Las que terminan en guion bajo son internas.
 */

function doGet() {
  return HtmlService.createTemplate(HTML_MESA)
    .evaluate()
    .setTitle('Mesa Trading')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(nombre) {
  return HTML_PARCIALES[nombre] || '';
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Mesa Trading')
    .addItem('Abrir la mesa', 'mostrarMesa')
    .addItem('Panel lateral', 'mostrarPanel')
    .addSeparator()
    .addItem('Traer pedidos nuevos desde Bd', 'menuTraerPedidos')
    .addItem('Sincronizar todo', 'menuSincronizar')
    .addSeparator()
    .addItem('Instalar / reparar la mesa', 'menuInstalar')
    .addToUi();
}

// ============================================================================
// Lo que llama el navegador
// ============================================================================

function datosMesa() {
  return datosMesa_();
}

/** La mesa embebida dentro de la planilla, sin salir a otra pestaña. */
function mostrarMesa() {
  var html = HtmlService.createTemplate(HTML_MESA)
    .evaluate()
    .setWidth(1500)
    .setHeight(880);
  SpreadsheetApp.getUi().showModalDialog(html, 'Mesa Trading');
}

function mostrarPanel() {
  var html = HtmlService.createTemplate(HTML_PANEL)
    .evaluate()
    .setTitle('Mesa Trading');
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * Datos del panel lateral: lo mismo que la mesa, más el pedido de la fila que
 * está seleccionada en la planilla.
 */
function datosPanel() {
  var datos = datosMesa_();
  datos.seleccionado = null;
  datos.mensaje = '';

  var hoja = SpreadsheetApp.getActiveSheet();
  var rango = SpreadsheetApp.getActiveRange();

  if (!hoja || !rango || normalizar_(hoja.getName()) !== normalizar_(MESA.HOJA_MESA)) {
    datos.mensaje = 'Selecciona una fila de "' + MESA.HOJA_MESA + '" para trabajarla aquí.';
    return datos;
  }

  var fila = rango.getRow();
  if (fila < 2) {
    datos.mensaje = 'Esa es la fila de encabezados. Elige una fila de pedido.';
    return datos;
  }

  for (var i = 0; i < datos.pedidos.length; i++) {
    if (Number(datos.pedidos[i].fila) === Number(fila)) {
      datos.seleccionado = datos.pedidos[i];
      break;
    }
  }
  if (!datos.seleccionado) datos.mensaje = 'La fila ' + fila + ' todavía no tiene pedido cargado.';

  return datos;
}

/** Guarda desde el panel, tomando la fila activa si no vino en el payload. */
function guardarDesdePanel(payload) {
  payload = payload || {};
  if (!payload.fila) {
    var rango = SpreadsheetApp.getActiveRange();
    if (rango) payload.fila = rango.getRow();
  }
  return guardarPedido(payload);
}

/** Deja la planilla en la fila del pedido que se eligió en el panel. */
function irAFila(fila) {
  var numero = parseInt(fila, 10);
  if (!numero || numero < 2) return { ok: false };

  var hoja = hoja_(MESA.HOJA_MESA, false);
  if (!hoja) return { ok: false };

  SpreadsheetApp.setActiveSheet(hoja);
  hoja.setActiveRange(hoja.getRange(numero, 1));
  return { ok: true };
}

// ============================================================================
// Menú
// ============================================================================

function menuTraerPedidos() {
  var r = traerPedidosNuevos();
  SpreadsheetApp.getUi().alert(
    r.nuevos
      ? 'Se agregaron ' + r.nuevos + ' pedido(s) nuevos a "' + MESA.HOJA_MESA + '".'
      : 'No hay pedidos nuevos en Bd: la mesa está al día.');
}

function menuSincronizar() {
  SpreadsheetApp.getUi().alert(sincronizarTodo().mensaje);
}

function menuInstalar() {
  SpreadsheetApp.getUi().alert(instalarMesaTrading().mensaje);
}
