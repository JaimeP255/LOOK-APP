import { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

const CLAVE_CACHE_TEMA = 'planells_tema_cache';

// Igual que hicimos con el fondo de pantalla: leemos el último tema
// elegido desde el propio dispositivo (localStorage), disponible al
// instante, para que no haya un parpadeo de "claro" un momento antes
// de cambiar a "oscuro" cuando abres la app.
function leerTemaDeCache() {
  try {
    const guardado = localStorage.getItem(CLAVE_CACHE_TEMA);
    return guardado === 'oscuro' ? 'oscuro' : 'claro';
  } catch {
    return 'claro';
  }
}

function guardarTemaEnCache(tema) {
  try {
    localStorage.setItem(CLAVE_CACHE_TEMA, tema);
  } catch {
    // No crítico si falla (modo privado, cuota llena...)
  }
}

/**
 * useTema
 * -------
 * Gestiona el modo claro/oscuro de la app: se guarda en tu perfil de
 * Firebase (para que te siga en cualquier dispositivo donde inicies
 * sesión) y en caché local (para que se aplique al instante al abrir
 * la app, sin esperar a la red).
 *
 * Aplica el tema poniendo data-tema="oscuro" en la etiqueta <html>, que
 * es donde App.css engancha la paleta de colores oscura (ver :root y
 * html[data-tema="oscuro"] en App.css).
 *
 * @param {object|null} usuario - usuario actual (viene de useAuth())
 */
export function useTema(usuario) {
  const [tema, setTemaState] = useState(() => leerTemaDeCache());

  // Hidratar desde Firebase cuando cargue el usuario
  useEffect(() => {
    if (usuario && usuario.tema && usuario.tema !== tema) {
      setTemaState(usuario.tema);
      guardarTemaEnCache(usuario.tema);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario]);

  // Aplicar el tema al documento entero (así llega a toda la app,
  // incluidos los modales que se montan fuera del árbol principal)
  useEffect(() => {
    document.documentElement.setAttribute('data-tema', tema);
  }, [tema]);

  const cambiarTema = useCallback(
    async (nuevoTema) => {
      setTemaState(nuevoTema);
      guardarTemaEnCache(nuevoTema);
      if (usuario) {
        try {
          await setDoc(doc(db, 'usuarios', usuario.uid), { tema: nuevoTema }, { merge: true });
        } catch (error) {
          console.error('Error al guardar el tema en Firebase:', error);
        }
      }
    },
    [usuario]
  );

  return { tema, cambiarTema };
}
