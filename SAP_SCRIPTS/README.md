# Scripts SAP R/3 — Creación de pedidos ME31K por proveedor

47 scripts VBS (SAP GUI Scripting) para crear contratos/pedidos ME31K en SAP R/3
productivo, uno por orden de compra, organizados en carpetas por proveedor.

## Dos juegos de scripts según el mes de validez

- **`MES_ACTUAL/`**: fechas de validez del primer al **último día del mes en
  curso** al momento de ejecutar el script.
- **`MES_SIGUIENTE/`**: fechas de validez del primer al **último día del mes
  siguiente** al momento de ejecutar el script.

Ambas carpetas contienen los mismos 47 scripts con los mismos valores
(proveedor, monto, moneda y posiciones); solo cambia el mes de las fechas,
que se calculan automáticamente al ejecutar. Use el juego que corresponda.

## Qué hace cada script

1. Abre la transacción `ME31K` en la sesión SAP activa.
2. Completa el encabezado: proveedor, clase `WK`, org. compras `TCMA`,
   grupo `628`, centro `TCP1`, almacén `PAN1`, grupo artículos `X1000`,
   valor previsto, moneda y fechas de validez (primer al último día del mes
   siguiente, calculadas automáticamente).
3. Escribe las posiciones (material TROZOxx, cantidad, M3, precio)
   **directamente en las celdas de la tabla de posiciones**, fila por fila.
4. **No guarda.** Al terminar muestra un aviso: usted revisa los valores en
   pantalla y presiona GUARDAR manualmente en SAP.

## Corrección respecto a la versión anterior

Antes las posiciones se copiaban al portapapeles y se pegaban con `Ctrl+V`
sobre una celda enfocada; si el foco quedaba en otra parte, los valores se
pegaban en cualquier lado. Ahora cada valor se escribe con SAP GUI Scripting
en la celda exacta que le corresponde:

- Sin portapapeles ni `SendKeys`: no depende del foco ni de la ventana activa.
- Las columnas (material, cantidad, unidad, precio) se detectan por el nombre
  técnico del campo, por lo que funciona aunque cambie el orden de columnas.
- La tabla se desplaza automáticamente cuando hay más posiciones que filas
  visibles.
- Las ventanas emergentes informativas de SAP se cierran solas con Enter.
- Si la tabla de posiciones no se encuentra, el script avisa y se detiene sin
  cargar nada (antes pegaba a ciegas).

## Requisitos y uso

- SAP GUI para Windows con scripting habilitado
  (`RZ11 → sapgui/user_scripting = TRUE` en el servidor y scripting permitido
  en las opciones locales de SAP GUI).
- Debe existir una sesión SAP abierta y con sesión iniciada (el script usa la
  primera conexión y primera sesión).
- Ejecutar el `.vbs` con doble clic (Windows Script Host).
- Al finalizar, revisar material, cantidad, UMP y precio en pantalla y
  presionar **GUARDAR** en SAP.

Los archivos `.XLSX` incluidos en algunas carpetas son las planillas de
referencia originales del proveedor.
