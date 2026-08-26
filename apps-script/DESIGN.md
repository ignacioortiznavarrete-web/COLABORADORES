# Sistema de diseño — Dashboard de ingreso de trozos

Documento de referencia del tablero. **Ningún color de este archivo se eligió a ojo**:
todos salen de una búsqueda sobre rampas OKLCH del verde de marca y están validados
con el validador de paletas (separación para daltonismo, piso de visión normal,
banda de luminosidad, piso de croma y contraste contra la superficie real).

## Escena y registro

Un analista de operaciones y un jefe de abastecimiento, en la oficina de planta en
Cabrero, proyectando el tablero en pantalla durante la reunión de los lunes. Luz
ambiente alta y un proyector de por medio. Eso fuerza **tema claro con tinta fuerte**:
los grises suaves mueren en un proyector.

Registro: **producto**. El diseño sirve al dato; el dato es lo único que puede gritar.

Estrategia de color: **contenida** — neutros teñidos hacia el propio verde de marca,
y el color saturado reservado para las marcas de datos.

## Identidad

El verde bosque de la marca se conserva. `#2D6A4F` mide OKLCH L 0.476 · C 0.078 ·
matiz 162.2°. Ese matiz 162.2° es el eje del que cuelgan la rampa secuencial y el
primer slot categórico, así que el tablero sigue leyéndose como el mismo producto.

## Paleta categórica (identidad de serie)

| Slot | Rol | Hex | Contraste sobre blanco |
|---|---|---|---|
| 1 | verde marca — real / serie principal | `#07724e` | 5.96:1 |
| 2 | naranja corteza — serie secundaria | `#e36a1f` | 3.31:1 |
| 3 | azul — proyección / referencia | `#388eea` | 3.37:1 |

Validación sobre superficie `#FFFFFF`, modo claro:

```
adyacente:  CVD ΔE 10.0 (protan) · normal ΔE 29.1 · todos ≥3:1  → PASS
todos-pares: CVD ΔE 10.0 (protan) · normal ΔE 24.5 · todos ≥3:1  → PASS
```

Tres slots es el techo deliberado. Una cuarta serie no se resuelve inventando un
matiz: se pliega en «Otros», se facetea o se cambia de forma.

El color sigue a la entidad, nunca a su posición en el ranking: filtrar proveedores
no repinta a los que quedan.

## Rampa ordinal / de magnitud (matriz de calibre, mapas de calor)

Un solo matiz, cinco pasos discretos, claro → oscuro:

`#71c49c` · `#4fad84` · `#31966d` · `#187e58` · `#116545`

```
monotonía L: PASS · ΔL adyacente ≥0.06: PASS
extremo claro 2.08:1 (piso 2:1): PASS · matiz único (1° de dispersión): PASS
```

El cero no es el paso más claro: una celda sin dato queda en superficie, sin relleno.

## Estado (calidad del trozo y cumplimiento)

La calidad de un trozo es una **condición**, no una identidad: Verde → Manchado →
Siniestrado es una escala de degradación. Por eso usa tokens de estado, siempre
acompañados de ícono y etiqueta — nunca color solo.

| Rol | Calidad | Hex | Contraste |
|---|---|---|---|
| bueno | Verde | `#07724e` | 5.96:1 |
| advertencia | Manchado | `#bb8317` | 3.30:1 |
| crítico | Siniestrado | `#b3261e` | 6.54:1 |

```
adyacente: CVD ΔE 12.9 (protan) · normal ΔE 20.0 · todos ≥3:1 → PASS
```

Verde contra rojo mide ΔE 7.9 bajo deuteranopía cuando pueden tocarse en cualquier
par. Ahí la mitigación es estructural y siempre está puesta: ícono, etiqueta directa
y vista de tabla en todos los gráficos de calidad.

## Tinta y cromo

| Rol | Hex | Contraste |
|---|---|---|
| Tinta primaria | `#12211A` | 16.69:1 |
| Tinta secundaria | `#40544A` | 8.12:1 |
| Tinta tenue (ejes, etiquetas) | `#5E7268` | 5.14:1 |
| Grilla (hairline) | `#E4EAE6` | — |
| Línea base / eje | `#C6D2CB` | — |
| Superficie de gráfico | `#FFFFFF` | — |
| Plano de página | `#F1F5F2` | — |

El `--muted: #738579` anterior medía **3.92:1**: no alcanzaba el 4.5:1 de texto de
cuerpo. Reemplazado por `#5E7268`.

## Tipografía

Una sola familia, Inter, en varios pesos. No hay segunda fuente: emparejar dos sans
parecidas es peor que no emparejar, y una serif de exhibición sobre un tablero de
operaciones es decoración. El contraste lo cargan peso, tamaño y tracking.

- Interlineado de cuerpo 1.5; medida máxima 68ch.
- Tracking de titulares: nunca por debajo de -0.02em.
- Cifras proporcionales en la cifra protagonista y en los valores de los stat tiles;
  `tabular-nums` solo donde los números se alinean en columna (tablas, ticks de eje).

## Marcas de datos

- Barra / columna: máximo 24px de grosor, extremo de dato redondeado 4px, cuadrado en
  la línea base.
- Línea: 2px, uniones y extremos redondeados.
- Punto / marcador: mínimo 8px de diámetro, con anillo de 2px en color de superficie.
- Relleno de área: el matiz de la serie al 10%.
- Grilla y ejes: hairline de 1px, sólida, nunca segmentada.
- Separación entre marcas que se tocan: 2px de superficie, nunca un borde dibujado.

## Movimiento

Curvas exponenciales de salida (`ease-out-quint`, `ease-out-expo`). Sin rebote ni
elástico. Cada animación revela lo que la marca hace: las barras crecen desde su
línea base, las líneas se dibujan con `stroke-dashoffset`, las cifras cuentan hacia
su valor. Nada de un mismo fundido aplicado a todas las secciones.

Toda revelación mejora un estado ya visible: el contenido nunca queda oculto
esperando una transición, porque en un iframe de Apps Script o una pestaña en
segundo plano esa transición puede no dispararse nunca.

`prefers-reduced-motion: reduce` recibe el estado final de inmediato.

## Prohibido en este tablero

- Franja de color en el borde izquierdo de una tarjeta como acento.
- Texto con degradado.
- Vidrio esmerilado decorativo.
- Rejillas de tarjetas idénticas repetidas como estructura por defecto.
- Radios de 20px o más en tarjetas (techo: 14px).
- Borde de 1px y sombra difusa amplia en la misma superficie.
- Dos ejes Y en un mismo gráfico.
- Un número sobre cada punto de dato.
- Tooltip como única vía para leer un valor.

## Cómo revalidar

```
node scripts/validate_palette.js "#07724e,#e36a1f,#388eea" --mode light --surface "#FFFFFF"
node scripts/validate_palette.js "#07724e,#e36a1f,#388eea" --mode light --surface "#FFFFFF" --pairs all
node scripts/validate_palette.js "#71c49c,#4fad84,#31966d,#187e58,#116545" --ordinal --mode light --surface "#FFFFFF"
node scripts/validate_palette.js "#07724e,#bb8317,#b3261e" --mode light --surface "#FFFFFF"
```
