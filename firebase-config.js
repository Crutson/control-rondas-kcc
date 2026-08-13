// Config pública de Firebase (no es secreta: el navegador la necesita para
// conectarse a Firestore). El acceso real lo controlan las reglas de
// seguridad de Firestore, no esta clave.
//
// Cómo conseguirla:
// 1. https://console.firebase.google.com → crear proyecto (ej: "kcc-rondas")
// 2. Dentro del proyecto: ⚙️ Configuración del proyecto → "Tus apps" → ícono </> (Web)
// 3. Registra la app (nombre libre, sin necesidad de Hosting)
// 4. Copia el objeto firebaseConfig que te muestra y pégalo abajo
// 5. En el menú lateral: Firestore Database → Crear base de datos → modo producción
// 6. En la pestaña "Reglas" de Firestore, pega las reglas del README y publica

window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyB6TTW3XqKrXxQdUnYCxWHPSh4-PtlukEo",
  authDomain: "control-rondas-kcc.firebaseapp.com",
  projectId: "control-rondas-kcc",
  storageBucket: "control-rondas-kcc.firebasestorage.app",
  messagingSenderId: "790917059804",
  appId: "1:790917059804:web:c991784307fcb47dba9019"
};

// Clave pública VAPID para Web Push (botón de pánico con app cerrada).
// Se genera en: ⚙️ Configuración del proyecto → pestaña "Cloud Messaging"
// → "Web Push certificates" → Generate key pair.
window.FIREBASE_VAPID_KEY = "BAuCCmdkO2TDhO5Ql1_rMjVVSjGDRBm32dTK2ld1DmHYH00bHqzAkrXJbpFCe_383y-Puncua8DpeZEwxOx3uVQ";

// Función serverless (Vercel) que efectivamente manda el push cuando se
// aprieta el pánico. URL de ejemplo: https://control-rondas-kcc.vercel.app/api/panic
window.PANIC_API_URL = "https://control-rondas-five.vercel.app/api/panic";

// No es un secreto real (va en el navegador, cualquiera puede verlo con
// "ver código fuente") — solo evita que bots al azar encuentren el
// endpoint y lo usen para spamear notificaciones. La seguridad real de
// los datos la dan las reglas de Firestore, no esto.
window.PANIC_API_SECRET = "86469fbcd956c62fe16f95c0eb76709e4d5f37abed5133f5";
