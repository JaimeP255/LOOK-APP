import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
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

// EXPORTAMOS las 3 herramientas mágicas para que App.jsx las pueda usar
export const db = getFirestore(app);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();