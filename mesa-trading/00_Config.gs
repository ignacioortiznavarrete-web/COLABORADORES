/**
 * Configuracion central del sistema
 * Proyecto: Seguimiento Trading
 */

/**
 * ============================================================================
 * SCRIPT MAESTRO TRADING
 * Ventas trading, asignacion de proveedores, colores y comentarios.
 * ============================================================================
 *
 * Estructura esperada:
 * - Bd
 * - Proveedores: A Proveedor | B Color | C Estado | D Nota
 * - Hoja Unica
 * - Tabla Seguimiento
 *
 * Para agregar proveedores no hace falta editar codigo:
 * 1. Menu "Scripts Trading" > "Administrar proveedores"
 * 2. O agregar una fila en Proveedores con nombre y color.
 *
 * La columna Color acepta nombres del catalogo o codigos HEX (#RRGGBB).
 */

var TRADING_CONFIG = {
  sheets: {
    bd: "Bd",
    proveedores: "Proveedores",
    unica: "Hoja Unica",
    seguimiento: "Tabla Seguimiento",
    historialVolumen: "Historial Volumen"
  },
  unicaHeaders: [
    "Origen / Tienda",
    "Documento de Venta",
    "Material",
    "Texto Comercial",
    "Proveedor Asignado",
    "Comentarios",
    "Comentarios Compra",
    "Puerto Destino"
  ],
  providerHeaders: ["Proveedor", "Color", "Estado", "Nota"],
  historialVolumenHeaders: [
    "Fecha registro",
    "Documento de venta",
    "Material",
    "Texto comercial",
    "Cliente",
    "Proveedor",
    "Estado",
    "Volumen inicial por producir (m3)",
    "Volumen actual por producir (m3)",
    "Diferencia vs inicial (m3)",
    "Diferencia vs registro anterior (m3)",
    "Comentario ventas",
    "Comentario compras",
    "Fila Hoja Unica",
    "Clave pedido"
  ],
  pendingColor: "#fff2cc",
  negotiationColor: "#39ff14",
  defaultProviderColor: "#ffffff",
  headerColor: "#1f1f1f",
  headerTextColor: "#ffffff"
};
