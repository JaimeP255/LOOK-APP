import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBV_MamLq5vKRy_jyXKQkEC8-q-7N7KGwU",
  authDomain: "planells-e43d4.firebaseapp.com",
  projectId: "planells-e43d4",
  storageBucket: "planells-e43d4.firebasestorage.app",
  messagingSenderId: "218191885545",
  appId: "1:218191885545:web:178324c38b5876dde22c78",
  measurementId: "G-MS0NKXMKVQ"
};

const app = initializeApp(firebaseConfig);

// Exportamos solo la base de datos de texto (que es 100% gratuita)
export const db = getFirestore(app);