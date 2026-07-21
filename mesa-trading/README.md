# Mesa Trading Madera

Sistema de seguimiento para la mesa de trading: las ventas con origen **Trading**
entran desde la hoja `Bd`, el equipo les asigna un proveedor de compra y la
planificación se visualiza por fecha de embarque.

## El flujo, en 3 pasos

1. **Sincronizar** — Menú `Mesa Trading > Sincronizar ahora (todo en un paso)`
   (o el botón *Sincronizar desde Bd* de la web). Trae los pedidos nuevos desde
   `Bd`, actualiza colores/validaciones y registra el historial de volumen.
   Si instalaste la automatización, esto además corre solo cada hora.
2. **Asignar** — En la **mesa web** (vista *Mesa de pedidos*): clic en un
   pedido → elegir proveedor, escribir mensaje de ventas / respuesta de
   compras → *Guardar y sincronizar*. Los botones rápidos **En negociación** y
   **Cerrado** escriben las palabras clave que la hoja usa para colorear.
   También se puede seguir usando el sidebar dentro de Sheets.
3. **Ver** — Vista *Matriz de embarques*: volumen por material × fecha de
   embarque, con el color del proveedor asignado, tooltip y panel de detalle.

## La mesa web

Una sola página con dos vistas:

- **Mesa de pedidos** — la cinta del flujo (Pendientes → En negociación →
  Asignados → Cerrados) funciona como filtro con un clic; búsqueda libre,
  filtro por proveedor y edición directa de cada pedido en un panel lateral.
  Guardar escribe en `Hoja Unica` y re-sincroniza colores y seguimiento.
- **Matriz de embarques** — solo lectura, construida directamente desde `Bd`
  (filas con Origen = Trading). No modifica fórmulas ni hojas.

## Estados de un pedido

| Estado | Cómo se determina |
| --- | --- |
| Pendiente | Sin proveedor asignado |
| Negociación | El comentario contiene la palabra `negociacion` |
| Asignado | Tiene proveedor en `Hoja Unica` |
| Cerrado | El comentario contiene `cerrado` / `cerrada` / `completa` |

## Estructura de hojas

- `Bd` — export de ventas (requiere: Documento de ventas, Material, Texto
  Comercial, Origen, Ctd.Ped.(m3); opcional: Vol. Producir (M3), Fecha
  Embarque Comprometida, Puerto Destino, Cliente…)
- `Hoja Unica` — pedidos consolidados + proveedor y comentarios
- `Proveedores` — catálogo: Proveedor | Color | Estado | Nota
- `Tabla Seguimiento` — matriz en Sheets (colores y comentarios sincronizados)
- `Historial Volumen` — registro de cambios de volumen por producir

## Instalación

1. En el spreadsheet: `Extensiones > Apps Script` y copiar los archivos `.gs`
   y `.html` de esta carpeta (mismos nombres, sin la extensión `.txt`).
2. `Implementar > Nueva implementación > Aplicación web` (ejecutar como tú,
   acceso según tu organización) para obtener la URL de la mesa.
3. Menú `Mesa Trading > Avanzado > Configurar sistema completo` una sola vez:
   crea hojas faltantes e instala la sincronización automática cada hora.

## Módulos

| Archivo | Rol |
| --- | --- |
| `00_Config.gs` | Nombres de hojas, encabezados y colores |
| `01_Menu_WebApp.gs` | Menú, `doGet` de la web y apertura de paneles |
| `02_Sincronizacion.gs` | Consolidación desde Bd, trigger horario, `onEdit` |
| `03_TablaSeguimiento.gs` | Colores y comentarios en Tabla Seguimiento |
| `04_MesaTradingApi.gs` | API de la mesa web (datos, guardado, sincronización) |
| `05_Proveedores.gs` | Catálogo de proveedores, colores y validaciones |
| `06_HistorialVolumen.gs` | Registro histórico de volumen por producir |
| `07_Hojas.gs` | Preparación de hojas auxiliares |
| `08_Utilidades.gs` | Helpers de fechas, números y colores |
| `09_TablaSeguimientoWeb.gs` | API solo-lectura de la matriz de embarques |
| `Index.html` | Mesa web (vistas Mesa de pedidos + Matriz de embarques) |
| `SidebarTrading.html` | Sidebar operativo dentro de Sheets |
