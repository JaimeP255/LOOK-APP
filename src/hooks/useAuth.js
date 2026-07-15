import { useState, useEffect, useCallback } from 'react';
import { auth, db, provider } from '../firebase';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

/**
 * Detecta si la app se está ejecutando dentro de un WebView embebido
 * (Android System WebView, un navegador in-app tipo Instagram/TikTok, o
 * una futura app empaquetada con Capacitor/Cordova sin el flujo nativo
 * configurado). Google BLOQUEA activamente el login de Google dentro de
 * estos entornos ("disallowed_useragent") — no es un bug de tu código,
 * es una política de seguridad de Google.
 *
 * Esto es una detección heurística (no hay una API 100% fiable para
 * esto), pero cubre los casos más comunes.
 */
function estaEnWebViewEmbebido() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';

  // Android: el WebView del sistema añade ";wv)" a su user agent
  const esAndroidWebView = /; ?wv\)/i.test(ua);

  // iOS: los navegadores in-app (embebidos dentro de otra app) casi
  // nunca incluyen "Safari" en el user agent, a diferencia de Safari
  // real o de Chrome/Firefox para iOS (que sí lo incluyen)
  const esIOS = /iPhone|iPad|iPod/i.test(ua);
  const esIOSSinSafari = esIOS && !/Safari/i.test(ua);

  // Si en el futuro empaquetas con Capacitor, esta variable global
  // existirá y nos dice directamente que estamos en la app nativa
  const esCapacitorNativo =
    typeof window !== 'undefined' &&
    window.Capacitor &&
    typeof window.Capacitor.isNativePlatform === 'function' &&
    window.Capacitor.isNativePlatform();

  return esAndroidWebView || esIOSSinSafari || esCapacitorNativo;
}

/**
 * useAuth
 * -------
 * Centraliza la sesión del usuario:
 *  - Escucha el estado de sesión (onAuthStateChanged) y, si hay usuario,
 *    carga su documento en la colección "usuarios" y lo fusiona con los
 *    datos de Firebase Auth (nombre, foto, etc.).
 *  - Expone loginConGoogle() y logout().
 *
 * 🐛 Bugs corregidos respecto al código original:
 * 1) Si un usuario se autenticaba pero todavía NO existía su documento
 *    en "usuarios" (la primerísima vez), la app se quedaba sin marcar
 *    sesión iniciada. Corregido: si el documento no existe todavía,
 *    igualmente se marca sesión con los datos de Firebase Auth.
 * 2) El login usaba signInWithRedirect, que además de ser más complejo
 *    de gestionar (getRedirectResult, timing...), tiene el mismo
 *    problema de fondo que el popup dentro de un WebView: Google lo
 *    bloquea igual. Se cambió a signInWithPopup, más simple y fiable
 *    en web — y ahora, ANTES de intentarlo, se detecta si estás dentro
 *    de un WebView embebido y se avisa con un mensaje claro en vez de
 *    fallar en silencio (ver estaEnWebViewEmbebido arriba).
 *
 * 📌 Cuando empaquetes la app (Capacitor u otro), este seguirá siendo
 * el ÚNICO sitio que hay que tocar: sustituir el cuerpo de
 * loginConGoogle() por el flujo nativo (por ejemplo, abrir el
 * navegador del sistema con @capacitor/browser, o usar un plugin de
 * login nativo de Google y luego signInWithCredential). El resto de la
 * app no necesita cambiar nada porque solo conoce loginConGoogle().
 */
export function useAuth() {
  const [usuario, setUsuario] = useState(null);
  const [cargandoAuth, setCargandoAuth] = useState(true);

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
    if (estaEnWebViewEmbebido()) {
      const error = new Error(
        'Google no permite iniciar sesión dentro de esta vista embebida. Abre la app en Safari o Chrome directamente.'
      );
      error.motivo = 'webview';
      throw error;
    }

    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      // El usuario cerró la ventana de Google a propósito: no es un
      // error real, no hace falta molestarle con un aviso.
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        return;
      }
      if (error.code === 'auth/popup-blocked') {
        error.motivo = 'popup-bloqueado';
      }
      console.error('Error al iniciar sesión con Google:', error);
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  return { usuario, setUsuario, cargandoAuth, loginConGoogle, logout };
}