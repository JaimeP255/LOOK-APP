import { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

const CLAVE_CACHE_FONDO = 'planells_fondo_pantalla_cache';

// Lee el último fondo usado desde el propio dispositivo (localStorage).
// No requiere red ni esperar a Firebase — está disponible en el primer
// render, así que evita el "parpadeo" de ver el fondo por defecto un
// instante antes de que cargue el que tienes elegido de verdad.
function leerFondoDeCache(fondosPorDefecto) {
  try {
    const guardado = localStorage.getItem(CLAVE_CACHE_FONDO);
    return guardado || fondosPorDefecto[0].url;
  } catch {
    return fondosPorDefecto[0].url;
  }
}

function guardarFondoEnCache(url) {
  try {
    localStorage.setItem(CLAVE_CACHE_FONDO, url);
  } catch {
    // Si localStorage no está disponible (modo privado, cuota llena...)
    // simplemente no cacheamos — no es crítico, solo se pierde la mejora
    // de "sin parpadeo", el resto de la app sigue funcionando igual.
  }
}

/**
 * useFondos
 * ---------
 * Gestiona los fondos de pantalla: la lista completa (por defecto +
 * subidos por el usuario) y cuál está seleccionado ahora mismo.
 *
 * 🐛 Bugs corregidos respecto al original:
 * 1. `fondoPantalla` se guardaba en Firebase (`setDoc(..., { fondoPantalla })`)
 *    pero nunca se releía al cargar la app — cada recarga volvía al fondo
 *    por defecto aunque tú hubieras elegido otro. Ahora se hidrata.
 * 2. Al borrar fondos personalizados, solo se quitaban de la lista en local
 *    (`setTodosLosFondos(...)`) pero nunca se guardaba ese borrado en
 *    Firebase — así que al recargar, los fondos "borrados" volvían a
 *    aparecer. Ahora `borrarFondos` también sincroniza con Firestore.
 * 3. "Parpadeo" al abrir la app: aunque el fondo SÍ se hidrataba bien
 *    desde Firebase, esa lectura tarda un instante (viaje de red), así
 *    que el primer render siempre pintaba el fondo por defecto y luego
 *    saltaba al tuyo. Ahora el estado inicial se lee de una caché local
 *    en el propio dispositivo (guardada la última vez que elegiste
 *    fondo), disponible al instante, sin esperar a la red.
 *
 * @param {object|null} usuario - usuario actual (viene de useAuth())
 * @param {Array} fondosPorDefecto - tu constante FONDOS_DISPONIBLES
 */
export function useFondos(usuario, fondosPorDefecto) {
  const [todosLosFondos, setTodosLosFondos] = useState(fondosPorDefecto);
  const [fondoPantalla, setFondoPantallaState] = useState(() => leerFondoDeCache(fondosPorDefecto));

  useEffect(() => {
    if (usuario) {
      if (usuario.fondos) setTodosLosFondos(usuario.fondos);
      if (usuario.fondoPantalla) {
        setFondoPantallaState(usuario.fondoPantalla);
        guardarFondoEnCache(usuario.fondoPantalla);
      }
    } else {
      setTodosLosFondos(fondosPorDefecto);
    }
    // fondosPorDefecto es una constante fija en tu app, no hace falta en deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario]);

  const cambiarFondo = useCallback(
    async (url) => {
      setFondoPantallaState(url);
      guardarFondoEnCache(url);
      if (usuario) {
        try {
          await setDoc(doc(db, 'usuarios', usuario.uid), { fondoPantalla: url }, { merge: true });
        } catch (error) {
          console.error('Error al guardar fondo en Firebase:', error);
        }
      }
    },
    [usuario]
  );

  // urlBase64 ya viene leído (FileReader) desde el componente
  const agregarFondoPersonal = useCallback(
    async (urlBase64) => {
      if (!usuario) return;
      const nuevoFondo = { id: Date.now(), url: urlBase64, nombre: 'Tú' };
      const nuevosFondos = [nuevoFondo, ...todosLosFondos];
      setTodosLosFondos(nuevosFondos);
      try {
        await setDoc(doc(db, 'usuarios', usuario.uid), { fondos: nuevosFondos }, { merge: true });
      } catch (error) {
        console.error('Error al guardar fondo nuevo en Firebase:', error);
      }
    },
    [usuario, todosLosFondos]
  );

  const borrarFondos = useCallback(
    async (ids) => {
      const fondosRestantes = todosLosFondos.filter((f) => !ids.includes(f.id));
      const fondoActualBorrado = ids.some(
        (id) => todosLosFondos.find((f) => f.id === id)?.url === fondoPantalla
      );

      setTodosLosFondos(fondosRestantes);

      if (usuario) {
        try {
          await setDoc(doc(db, 'usuarios', usuario.uid), { fondos: fondosRestantes }, { merge: true });
        } catch (error) {
          console.error('Error al borrar fondos en Firebase:', error);
        }
      }

      if (fondoActualBorrado) {
        const nuevoFondo = fondosRestantes.length > 0 ? fondosRestantes[0].url : fondosPorDefecto[0].url;
        await cambiarFondo(nuevoFondo);
      }

      return fondosRestantes;
    },
    [usuario, todosLosFondos, fondoPantalla, cambiarFondo, fondosPorDefecto]
  );

  return { todosLosFondos, fondoPantalla, cambiarFondo, agregarFondoPersonal, borrarFondos };
}