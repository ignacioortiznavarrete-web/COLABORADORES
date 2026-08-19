# Tablero de Capacitacion, Becas, OTIC y Presupuesto

Aplicacion Apps Script para la gestion de formacion de personas en Masisa.
Lee la planilla de BUK y entrega seis vistas de analisis con filtros comunes,
descarga a CSV e impresion a PDF.

Planilla origen:
`1o7J0Z5NnlHVld2OR4DdmN8BC5vLuCJcy3nN8aMvRySY`

---

## Instalacion

1. En la planilla: **Extensiones > Apps Script**.
2. Crea los archivos y pega el contenido de esta carpeta. Los nombres importan:

   | Archivo en Apps Script | Tipo | Contenido |
   |---|---|---|
   | `Codigo.gs` | Script | `Codigo.gs` |
   | `Index` | HTML | `Index.html` |
   | `Estilos` | HTML | `Estilos.html` |
   | `Iconos` | HTML | `Iconos.html` |
   | `Guion` | HTML | `Guion.html` |

   Para crear un archivo HTML: **+ > HTML**, y escribe el nombre sin la extension.

3. Ejecuta una vez la funcion **`obtenerDiagnostico`** desde el editor. Acepta los
   permisos y revisa en el registro que aparezcan las hojas esperadas con sus filas.
4. **Implementar > Nueva implementacion > Aplicacion web**, ejecutar como *Yo*,
   acceso segun tu politica interna.

---

## Configuracion

Todo lo ajustable esta en el bloque `CONFIG`, al inicio de `Codigo.gs`.
No hay valores de negocio escondidos dentro del HTML.

| Clave | Para que sirve |
|---|---|
| `SPREADSHEET_ID` | Planilla origen. Vacio usa la planilla activa. |
| `FONDO_INICIAL_EXCEDENTES` | Saldo inicial de la cuenta de excedentes OTIC. |
| `COMISION_OTIC` | Comision que se descuenta del aporte bruto. Hoy `0.15`. |
| `META_COBERTURA` | Meta de cobertura sobre dotacion vigente. Hoy `0.80`. |
| `META_HORAS_PER_CAPITA` | Meta de horas por persona al ano. Hoy `16`. |
| `UMBRAL_COBERTURA_CRITICA` | Bajo este valor una gerencia se marca en rojo. |
| `DOTACION_EST_POR_DEFECTO` | Valor inicial del contador manual de contratistas. |
| `CACHE_SEGUNDOS` | Duracion de la cache. Hoy 15 minutos. |

---

## Que hojas lee

El backend detecta las hojas por su nombre, sin distinguir mayusculas ni acentos:

| Contiene en el nombre | Se interpreta como |
|---|---|
| un ano de cuatro digitos, o `buk` | registros de capacitacion |
| `dotacion` | dotacion de personas |
| `beca` | becas de estudio |
| `otic` | movimientos de la cuenta OTIC |
| `saldo` o `presupuesto` | movimientos de presupuesto |

Las columnas se ubican por nombre, con varios sinonimos aceptados por campo. Si
una columna cambia de nombre en la planilla, agrega el nuevo nombre a la lista
correspondiente en `Codigo.gs` en vez de reordenar la hoja.

---

## Las seis vistas

**Resumen ejecutivo.** Cobertura de formacion como cifra principal, cobertura
separada por genero, tira de indicadores, ejecucion mensual acumulada del ano
actual contra el anterior, puntos de atencion ordenados por urgencia y detalle
por gerencia.

**Cobertura y brechas.** Contador manual de contratistas EST, cobertura por
planta o sede y la matriz por categoria ENIA con dotacion, capacitados y horas
separados por genero. Al hacer clic en una fila se abre la nomina de capacitados
y pendientes, con descarga a CSV.

**Personas y equidad.** Horas por persona, indice de paridad entre mujeres y
hombres, concentracion de las horas en el decil mas formado, distribucion de la
dotacion por tramos de horas y la nomina buscable de quienes no registran
ninguna capacitacion. Es la base del reporte GRI 404-1.

**Cursos y proveedores.** Cursos con mas participantes, reparto de horas por
modalidad, catalogo desplegable por categoria y tabla de proveedores con costo
por hora, costo por persona y tasa de aprobacion.

**Inversion.** Saldo disponible como cifra principal, proyeccion de cierre segun
el ritmo del ano, composicion de la ejecucion, estado de las cuentas OTIC
(excedentes y normal), gasto mensual y los movimientos de ambas hojas.

**Becas.** Beneficiarios, monto aportado, aporte promedio, instituciones,
reparto por gerencia e institucion y el detalle buscable.

---

## Indicadores nuevos frente a la version anterior

| Indicador | Para que decision sirve |
|---|---|
| Cobertura sobre dotacion vigente | Saber que parte de la empresa quedo fuera, no solo cuantos asistieron. |
| Nomina de personas sin capacitacion | Convocar. Es la lista accionable del area. |
| Horas por persona y por genero | Reporte GRI 404-1 e ISO 30414 sin recalcular a mano. |
| Indice de paridad | Detectar brechas de acceso a la formacion. |
| Concentracion en el decil superior | Ver si la formacion llega a muchos o se repite en pocos. |
| Costo por hora y por persona | Comparar proveedores y preparar la negociacion anual. |
| Tasa de aprobacion por proveedor | Separar volumen de calidad. |
| Saldo de excedentes OTIC y su porcentaje sin usar | Los excedentes caducan. Es dinero en riesgo. |
| Proyeccion de cierre presupuestario | Corregir el ritmo de gasto antes de diciembre. |
| Ejecucion mensual acumulada contra el ano anterior | Comparar avance real, no totales al cierre. |

---

## Decisiones de diseno

**Paleta de datos validada.** Los ocho colores de serie pasan las verificaciones
de daltonismo: peor par adyacente 8,5 de distancia CVD y 23,3 en vision normal,
sobre blanco. El verde de marca es el primer color de serie. El amarillo queda
bajo 3:1 de contraste, por eso todo grafico que lo use lleva etiqueta directa o
tabla equivalente.

**Una sola fila de filtros.** Ano, gerencia, empresa, categoria y modalidad
afectan a todas las vistas, para que las cifras nunca se contradigan entre
pestanas.

**Cada grafico tiene su tabla.** Los graficos con boton de tabla muestran los
mismos datos en cifras, y todos tienen descarga a CSV. El color nunca es la
unica forma de leer un valor.

**Sin dependencias fragiles.** Los iconos son un sprite SVG incrustado
(Phosphor, auto alojado), no una fuente externa. Solo Chart.js y la tipografia
se cargan por red; si el CDN de Chart.js esta bloqueado la aplicacion avisa en
pantalla en vez de quedarse en blanco.

**Escala de forma unica.** Paneles 12 px, controles 8 px, pildoras completas.
Sin sombras salvo en capas flotantes reales.

**Modo claro deliberado.** El tablero se proyecta en reuniones y se imprime en
PDF, por eso no invierte con el tema del sistema.

---

## Correcciones de calculo respecto de la version anterior

1. **RUT normalizado.** Antes `12.345.678-9` y `123456789` contaban como dos
   personas distintas. Ahora se compara el numero sin puntos, guion ni digito
   verificador, asi que los conteos de personas unicas cuadran entre hojas.
2. **Cache real.** `CacheService` admite 100 KB por clave y la version anterior
   intentaba guardar hasta 900 KB en una sola, por lo que la cache fallaba en
   silencio y cada carga releia toda la planilla. Ahora se guarda en trozos.
3. **Montos con formato chileno.** `1.234.567` se leia como `1,234567`. Ahora se
   interpretan los separadores de miles y decimales.
4. **Anos dinamicos.** Los filtros ya no estan fijos en 2025 y 2026: se arman
   con los anos presentes en la planilla.
5. **Ubicacion real.** La columna de ubicacion se lee de la hoja en vez de caer
   siempre al valor por defecto.
6. **Linea acumulada sin relleno falso.** Los meses sin datos quedan vacios en
   vez de continuar planos hasta diciembre, que se leia como estancamiento.
7. **Contenido de la planilla como texto, no como HTML.** Las tablas se arman
   con nodos de texto, asi que un nombre de curso con comillas o con signos ya
   no rompe la vista.

---

## Solucion de problemas

**La vista queda en blanco.** Ejecuta `obtenerDiagnostico` desde el editor y
revisa el registro: te dira que hojas encontro y con que encabezados.

**Una columna aparece vacia o en cero.** El encabezado de la planilla no coincide
con ninguno de los sinonimos. Agrega el nombre exacto a la lista del campo en
`Codigo.gs`.

**Los datos estan viejos.** El boton Actualizar limpia la cache y relee la
planilla. La cache dura 15 minutos.

**Los graficos no cargan.** La red bloquea el CDN de Chart.js. Aparece un aviso
en pantalla. Pide a TI habilitar `cdn.jsdelivr.net`, o descarga
`chart.umd.min.js` y pegalo dentro de un archivo HTML del proyecto.
