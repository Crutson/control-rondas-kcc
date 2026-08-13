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
