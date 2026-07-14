import { useState, useEffect, useCallback } from 'react';
import { auth, db, provider } from '../firebase';
import { onAuthStateChanged, signInWithRedirect, signOut, getRedirectResult } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

/**
 * useAuth
 * -------
 * Centraliza la sesión del usuario:
 *  - Captura el resultado del login por redirección de Google.
 *  - Escucha el estado de sesión (onAuthStateChanged) y, si hay usuario,
 *    carga su documento en la colección "usuarios" y lo fusiona con los
 *    datos de Firebase Auth (nombre, foto, etc.).
 *  - Expone loginConGoogle() y logout().
 *
 * OJO — bug corregido respecto al código original:
 * antes, si un usuario se autenticaba pero todavía NO existía su documento
 * en "usuarios" (por ejemplo la primerísima vez, antes de crearlo), la app
 * se quedaba sin marcar sesión iniciada (usuario seguía en null) porque el
 * "if (docSnap.exists())" no tenía un "else". Aquí sí lo cubrimos: si el
 * documento no existe todavía, igualmente se marca sesión con los datos
 * de Firebase Auth.
 */
export function useAuth() {
  const [usuario, setUsuario] = useState(null);
  const [cargandoAuth, setCargandoAuth] = useState(true);

  // Captura el resultado del login por redirección (Google)
  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result) {
          console.log('Login exitoso tras redirección:', result.user.email);
        }
      })
      .catch((error) => console.error('Error al procesar login:', error));
  }, []);

  // Escucha el estado de la sesión
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (userFirebase) => {
      if (userFirebase) {
        try {
          const usuarioRef = doc(db, 'usuarios', userFirebase.uid);
          const docSnap = await getDoc(usuarioRef);
          if (docSnap.exists()) {
            setUsuario({ ...userFirebase, ...docSnap.data() });
          } else {
            // 👇 antes esto se quedaba sin cubrir (ver nota arriba)
            setUsuario(userFirebase);
          }
        } catch (error) {
          console.error('Error cargando el documento del usuario:', error);
          setUsuario(userFirebase);
        }
      } else {
        setUsuario(null);
      }
      setCargandoAuth(false);
    });
    return () => unsubscribe();
  }, []);

  const loginConGoogle = useCallback(async () => {
    try {
      await signInWithRedirect(auth, provider);
    } catch (error) {
      console.error('Error al redirigir:', error);
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  return { usuario, setUsuario, cargandoAuth, loginConGoogle, logout };
}
