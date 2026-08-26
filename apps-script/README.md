# Metro Ruma · Tablero de ingreso de trozos

Aplicación de Google Apps Script sobre la planilla de recepciones de la planta
de Cabrero. Son dos archivos: `Code.gs` (servidor) e `Index.html` (interfaz).

## Puesta en marcha

1. Pegar `Code.gs` e `Index.html` en el proyecto de Apps Script asociado a la
   planilla.
2. Publicar como aplicación web.
3. Ejecutar `limpiarCache()` una vez después de actualizar: las claves de caché
   cambiaron a `V19` y el payload trae campos nuevos.

## Hojas que usa

| Hoja | Rol |
|---|---|
| `Hoja 1` | Recepciones. Es la fuente de todo lo que se mide. |
| `Hoja 2` | Plan mensual por proveedor y faena. |
| `ProyeccionCamiones` | Proyección de camiones por día. |
| `PlanAccion` | **Nueva.** Acuerdos de la reunión semanal. |

`PlanAccion` se crea sola la primera vez que se abre la pestaña Plan de acción;
no hay que prepararla a mano. Sus columnas son `ID`, `Semana`, `Categoria`,
`Severidad`, `Hallazgo`, `Medida`, `Responsable`, `FechaCompromiso`, `Estado`,
`Notas`, `CreadoPor`, `CreadoEn` y `ActualizadoEn`. Se puede editar desde la
planilla: el tablero la vuelve a leer en cada carga.

## Cómo está organizado el tablero

- **Resumen** · cuatro KPIs de decisión, franja de contexto, trayectoria
  acumulada del mes y cierre semana a semana.
- **Análisis** · brecha por proveedor contra su plan a la fecha, mix de calidad
  y tabla de cumplimiento con apertura por faena para MASISA.
- **Territorio** · mapas de predios por ROL y de concentración por comuna.
- **Detalle** · recepciones agrupadas y exportación de la matriz.
- **Plan de acción** · hallazgos calculados sobre la vista filtrada, con la
  medida sugerida y la pregunta a resolver, más el registro de acuerdos.

## Una advertencia sobre los filtros

El plan se fija por proveedor y faena, no por calidad, largo, comuna ni ROL.
Cuando alguno de esos filtros está activo, el tablero **deja de comparar contra
plan** y lo dice explícitamente en vez de mostrar un porcentaje inventado a
partir de repartir la meta. Para medir cumplimiento hay que soltar esos filtros.

## Paleta de datos

Los colores de los gráficos están validados contra banda de luminosidad, piso de
croma, separación bajo protanopía y deuteranopía, y contraste sobre la superficie
real. Si se cambian, conviene revalidarlos antes de publicar.

| Rol | Valor |
|---|---|
| m³ real y superávit | `#12855a` |
| Plan (referencia) | `#2a78d6` |
| Déficit | `#8f2d24` |
| Calidad verde | `#1baf7a` |
| Calidad manchado | `#c98a00` |
| Calidad siniestrado | `#8f2d24` |
| Rampa de mapas | `#7cc0a1` `#4fa886` `#2f9169` `#1c7350` `#124f37` |

El texto nunca lleva el color de la serie: una cifra chica necesita 4.5:1 de
contraste y los tonos de serie están calibrados para marcas, que necesitan 3:1.
