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

1. **Alojarla en un hosting real y gratuito.** ✅ Hecho — desplegada en
   GitHub Pages: https://crutson.github.io/control-rondas-kcc/
   Repo: github.com/Crutson/control-rondas-kcc (rama `main`, deploy automático
   en cada push).

2. **Reemplazar el almacenamiento.** ✅ Hecho — la app ahora usa Firebase
   Firestore en vez del storage de Claude (ver `index.html`, sección
   `STORAGE HELPERS`, y `firebase-config.js`). Falta solo que alguien con
   cuenta Google:
   - Cree un proyecto en https://console.firebase.google.com
   - Registre una "Web app" dentro de ese proyecto y copie el objeto
     `firebaseConfig` en `firebase-config.js` (son claves públicas, no
     secretas — el navegador las necesita para conectarse).
   - Active Firestore Database (modo producción) y pegue estas reglas en la
     pestaña "Reglas" (abren solo las colecciones de esta app, nada más del
     proyecto):
     ```
     rules_version = '2';
     service cloud.firestore {
       match /databases/{database}/documents {
         match /control-rondas/{doc} {
           allow read, write: if true;
         }
         match /push-tokens/{token} {
           allow read, write: if true;
         }
         match /panic-events/{event} {
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
     de datos que antes, solo cambió el transporte. Además: `push-tokens`
     (un doc por celular suscrito a avisos push).
   - El botón de pánico usa `onSnapshot` (tiempo real, no polling) para
     avisar al instante a todos los celulares con la app **abierta**. La
     bitácora del jefe tiene un botón "↻" para traer manualmente lo último
     de todos los guardias.

3. **Notificaciones push reales para el botón de pánico.** ✅ Hecho — Web
   Push nativo vía Firebase Cloud Messaging, disparado por una función
   serverless en **Vercel** (`api/panic.js`), no por Cloud Functions —
   así se evita pasar el proyecto Firebase a plan Blaze (pago). El celular
   del guardia que aprieta el pánico llama directo a esa función, que lee
   `push-tokens` en Firestore (con credenciales de administrador) y manda
   el push — llega aunque la app esté cerrada o el celular bloqueado.
   - **Trade-off de esta arquitectura:** como el disparo depende del
     celular del guardia (no de un trigger de Firestore en el servidor),
     si ese celular se queda sin señal justo en el momento del pánico, el
     push no sale (aunque el registro en la bitácora sí queda guardado
     apenas recupere señal). Si más adelante se pasa a plan Blaze, conviene
     migrar a un trigger de Firestore del lado del servidor para que no
     dependa de la conexión del guardia.
   - Cada persona debe activar los avisos una vez tocando el botón
     **"🔔 Avisos"** que aparece en la barra superior (desaparece solo una
     vez concedido el permiso del navegador).
   - Requiere una clave **VAPID** (Configuración del proyecto → Cloud
     Messaging → Web Push certificates → Generate key pair), pegada en
     `firebase-config.js` (`FIREBASE_VAPID_KEY`), y una clave de **service
     account** (Configuración del proyecto → Service accounts → Generate
     new private key) configurada como variables de entorno en Vercel
     (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`)
     — **nunca** commiteada al repo, es una credencial de administrador real.
   - `PANIC_API_SECRET` en `firebase-config.js` no es un secreto real (va
     en el navegador) — solo evita que bots al azar encuentren el endpoint;
     la seguridad real de los datos la dan las reglas de Firestore.
   - Deploy: `npx vercel --prod` desde la raíz del proyecto (requiere
     `vercel login` una vez). La URL que da Vercel va en
     `firebase-config.js` (`PANIC_API_URL`).

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

