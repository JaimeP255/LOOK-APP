import { initializeApp } from "firebase/app";
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Configuración de tu proyecto de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBV_MamLq5vKRy_jyXKQkEC8-q-7N7KGwU",
  authDomain: "planells-e43d4.firebaseapp.com",
  projectId: "planells-e43d4",
  storageBucket: "planells-e43d4.firebasestorage.app",
  messagingSenderId: "218191885545",
  appId: "1:218191885545:web:178324c38b5876dde22c78",
};

// Inicializamos todo limpiamente
const app = initializeApp(firebaseConfig);

// 🐛 CORRECCIÓN: antes, si cerrabas o minimizabas la app justo después de
// guardar algo (por ejemplo, la foto del calendario de hoy), la escritura
// solo existía en la memoria de la pestaña. Si el navegador/móvil
// suspendía o mataba la pestaña antes de que esa escritura llegara al
// servidor, se perdía sin más — y al volver, Firestore te devolvía la
// última versión que SÍ había llegado a guardarse (la de ayer).
//
// Con la caché local persistente, cada escritura se guarda primero en el
// disco del dispositivo (IndexedDB) antes de intentar enviarla por red.
// Así sobrevive aunque la app se cierre a media escritura, y se
// sincroniza sola en cuanto vuelves a abrir con conexión.
//
// 🛡️ BLINDAJE: initializeFirestore() solo se puede llamar UNA vez por
// sesión. Si el editor recarga en caliente este archivo sin refrescar
// la página entera, la segunda vez que se ejecuta este código, Firebase
// lanza "Firestore has already been initialized" — y a partir de ahí
// cualquier guardado nuevo se rompe en silencio. Con este try/catch,
// si eso pasa, simplemente reutilizamos la instancia que ya existía en
// vez de romper la app.
let db;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
} catch (error) {
  console.warn("Firestore ya estaba inicializado, reutilizando instancia existente.", error.message);
  db = getFirestore(app);
}

export { db };

// EXPORTAMOS las 2 herramientas mágicas que quedan para que App.jsx las pueda usar
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();