# Liderman — Control de Rondas

App móvil (PWA) para registrar rondas de guardia por QR, con botón de pánico
de dos pasos y un panel "Acceso datos" protegido por contraseña para exportar
la bitácora a CSV. Piloto interno de Liderman Chile, en fase beta — pensada
para poder desplegarse después en otras instalaciones de la empresa.

## Estado actual

- `index.html` — la app completa (UI, lógica, escaneo QR con la cámara).
- `manifest.json` — metadatos para que el navegador ofrezca "Agregar a pantalla de inicio".
- `service-worker.js` — cachea la app para que abra rápido y funcione con mala señal.
- `icons/` — ícono de la app (badge de Liderman sobre fondo oscuro), en los tamaños que pide un PWA.
- `brand/liderman-badge.png` — logo circular oficial de Liderman (fondo transparente),
  usado en el header y en la pantalla de inicio.
- Paleta: rojo de marca `#B02E21` (extraído del logo oficial) para la marca y
  las acciones principales; ámbar `#FF9500` reservado solo para el botón de
  pánico y las alertas, a propósito distinto del rojo para que no se confundan
  a simple vista.
- Los datos (rondas, alertas de pánico, configuración de guardias/puntos) se
  guardan con la API de almacenamiento de Claude — **funciona solo dentro de
  claude.ai**, no fuera de ese entorno.

## Por qué todavía no es instalable en el celular

Los navegadores solo permiten "Agregar a pantalla de inicio" y Service Workers
cuando la página se sirve por **HTTPS** desde un dominio real — no funciona
abriendo el archivo `index.html` directo desde el celular (`file://`).

## Lo que falta para tenerla instalable de verdad (para Claude Code)

1. **Alojarla en un hosting real y gratuito.** Cualquiera de estos sirve:
   - GitHub Pages
   - Vercel
   - Netlify
   Solo hay que subir esta carpeta tal cual (son puros archivos estáticos,
   no requiere backend) y quedará con una URL `https://...`.

2. **Reemplazar el almacenamiento.** ✅ Hecho — la app ahora usa Firebase
   Firestore en vez del storage de Claude (ver `index.html`, sección
   `STORAGE HELPERS`, y `firebase-config.js`). Falta solo que alguien con
   cuenta Google:
   - Cree un proyecto en https://console.firebase.google.com
   - Registre una "Web app" dentro de ese proyecto y copie el objeto
     `firebaseConfig` en `firebase-config.js` (son claves públicas, no
     secretas — el navegador las necesita para conectarse).
   - Active Firestore Database (modo producción) y pegue estas reglas en la
     pestaña "Reglas" (abren solo la colección de esta app, nada más del
     proyecto):
     ```
     rules_version = '2';
     service cloud.firestore {
       match /databases/{database}/documents {
         match /control-rondas/{doc} {
           allow read, write: if true;
         }
       }
     }
     ```
   - **Ojo:** estas reglas son abiertas (cualquiera con la URL de la app
     puede leer/escribir los datos) — aceptable para un piloto interno de
     9 personas, pero antes de escalar a más instalaciones conviene sumar
     Firebase Auth anónimo o un check de contraseña también del lado de
     las reglas.
   - Estructura en Firestore: colección `control-rondas` con 3 documentos —
     `seguridad-config` (`{guards, checkpoints}`), `seguridad-rondas`
     (`{items: [...]}`), `seguridad-panico` (`{items: [...]}`). Misma forma
     de datos que antes, solo cambió el transporte.
   - El botón de pánico ahora usa `onSnapshot` (tiempo real real, no
     polling) — llega al instante a todos los celulares con la app abierta.
     La bitácora del jefe tiene un botón "↻" para traer manualmente lo
     último de todos los guardias.

3. **Notificaciones push reales para el botón de pánico**, para que llegue
   aviso aunque el celular esté con la pantalla apagada. Opciones a evaluar:
   - Web Push nativo (gratis, requiere configurar el service worker un poco más).
   - WhatsApp Business API o Twilio, si se quiere que llegue como mensaje/SMS
     fuera de la app (tiene costo mensual).

4. **Generar los códigos QR físicos** desde la pestaña "Imprimir QR" del
   panel de Acceso datos, e imprimirlos para pegar en cada punto:
   Garita Principal, Punto 2, Punto 3, Punto 4, Punto 5, Garita Salida.

5. **Cambiar la contraseña de "Acceso datos"** (ahora `1621`, hardcodeada en
   el archivo) por algo gestionado del lado del servidor una vez que haya
   backend real — en texto plano en el HTML no es seguro para producción.

## Contexto de uso (para que Claude Code entienda el flujo real)

- 8 guardias + 1 jefe de seguridad. Turno día (lunes a viernes) hace ronda
  solo al ingreso y a la salida del turno; turno noche hace ronda cada 2 horas.
  La app no necesita saber de turnos: solo registra quién escaneó y cuándo.
- El guardia solo puede marcar por QR (a propósito, no hay opción manual)
  para asegurar que estuvo físicamente en el punto.
- El botón de pánico es de tres pantallas a propósito (dock → advertencia →
  confirmación) para que no se dispare por error.
- Si el prototipo funciona bien, se replicaría igual en la instalación de
  La Serena (misma dotación de personal), y potencialmente en otras
  instalaciones de Liderman.

