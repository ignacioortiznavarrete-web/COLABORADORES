# Formulario de solicitud de cambio de estado

App web (`doGet` → `Solicitud.html`) que escribe las solicitudes en la hoja
`Cambios` de la planilla `1s0r_lbPLVH4peQfn_2L7LqrD1Pvmk0tDw4GQR5CsfvI`, con el
estado anterior de cada material leído desde `BD!E`.

## Notificación por correo

Al guardar una solicitud se envía **un solo correo**, nunca los dos:

| Momento del ingreso | Destinatarios | Contenido |
| --- | --- | --- |
| **Dentro de plazo** | persona 1 | "(solicitante) solicitó un cambio de estado de X a Y" + tabla Material / Estado actual / Cambio solicitado |
| **Fuera de plazo** | persona 1 **y** persona 2 | Lo mismo, con el asunto marcado `FUERA DE PLAZO ·` y un aviso destacado en el cuerpo |

La ventana de plazo se evalúa por **día del mes, todos los meses**, en la zona
horaria del script.

## Configuración obligatoria antes de usarlo

En `Codigo.gs`:

```js
const NOTIFICACIONES = {
  PERSONA_1: 'persona1@masisa.com',   // <-- reemplazar
  PERSONA_2: 'persona2@masisa.com',   // <-- reemplazar
  MAX_FILAS_DETALLE: 200
};

const PLAZO = {
  DIA_INICIO: 10,
  DIA_FIN: 28,
  VENTANA_ES_FUERA_DE_PLAZO: true  // true: los días 10 a 28 son FUERA de plazo
};                                 // false: los días 10 a 28 son DENTRO de plazo
```

Si no hay destinatarios válidos configurados, la solicitud igual se guarda y la
interfaz avisa que no se envió el correo.

## Detalles

- El correo sale con `MailApp.sendEmail` desde la cuenta que ejecuta el script,
  según cómo esté desplegada la app web ("Ejecutar como": el propietario o el
  usuario que accede). La primera ejecución pide autorizar el permiso de envío.
- Cuota de Gmail: 100 destinatarios/día en cuentas gratuitas, 1.500 en Workspace.
  Es por correo enviado, no por material.
- Si el envío falla (cuota, dirección inválida), **la solicitud igual queda
  guardada**: el error se registra en el Logger y la interfaz lo muestra.
- `guardarCambioEstado` devuelve `{ ok, guardados, correo: { enviado,
  fueraDePlazo, destinatarios, error }, error }`. El formulario revisa `ok`
  antes de mostrar "¡Éxito!" (antes mostraba éxito aunque la función fallara).
- El cuerpo del correo lista hasta `MAX_FILAS_DETALLE` materiales; si hay más,
  indica cuántos faltan y remite a la hoja `Cambios`.

## Pendiente

En el `<select>` de solicitantes los `value` no coinciden con lo que se muestra:
"Rodrigo Barrera" guarda `Jean Paul` y "Maria Galaz" guarda `Celeste Bastias`.
Eso afecta tanto lo que queda en la planilla como el nombre que aparece en el
correo.
