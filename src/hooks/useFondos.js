import { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../firebase';
import {
  collection,
  doc,
  setDoc,
  addDoc,
  deleteDoc,
  deleteField,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';

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
    // simplemente no cacheamos — no es crítico.
  }
}

/**
 * useFondos
 * ---------
 * Gestiona los fondos de pantalla: los de serie (fondosPorDefecto, fijos
 * en el código) + los que subes tú (fondosPersonalizados, en su propia
 * colección de Firestore), y cuál está seleccionado ahora mismo.
 *
 * 🔥 CAMBIO IMPORTANTE respecto a antes: los fondos personalizados YA NO
 * viven dentro del documento "usuarios/{uid}" (el mismo que ya nos
 * explotó una vez por el calendario, al superar el límite de 1MB de
 * Firestore). Ahora cada fondo que subes es su propio documento pequeño
 * en la colección "fondosPersonalizados" — el mismo patrón que ya usan
 * prendas, wishlist y outfits. Así este campo no puede volver a
 * convertirse en la próxima bomba de relojería del documento de perfil.
 *
 * MIGRACIÓN AUTOMÁTICA: si detecta fondos personalizados guardados en el
 * formato viejo (dentro de usuarios/{uid}.fondos, mezclados con los de
 * serie), los identifica por su "nombre: 'Tú'" — así es como se
 * guardaban los tuyos — los mueve a la colección nueva, y borra el
 * campo viejo del documento de usuario. Se ejecuta sola la próxima vez
 * que abras la app.
 *
 * 🐛 Bugs corregidos respecto al original (de antes de esta migración):
 * 1. `fondoPantalla` no se releía al cargar la app — arreglado.
 * 2. Al borrar fondos, el borrado no se guardaba en Firebase — arreglado.
 * 3. "Parpadeo" del fondo por defecto al abrir la app — arreglado con
 *    caché local.
 *
 * @param {object|null} usuario - usuario actual (viene de useAuth())
 * @param {Array} fondosPorDefecto - tu constante FONDOS_DISPONIBLES
 */
export function useFondos(usuario, fondosPorDefecto) {
  const [fondosPersonalizados, setFondosPersonalizados] = useState([]);
  const [fondoPantalla, setFondoPantallaState] = useState(() => leerFondoDeCache(fondosPorDefecto));

  // 🔄 Migración automática, una sola vez por usuario
  useEffect(() => {
    if (!usuario) return;

    const fondosViejos = usuario.fondos;
    if (!Array.isArray(fondosViejos) || fondosViejos.length === 0) return;

    // Solo migramos los que TÚ subiste (se guardaban con nombre: 'Tú');
    // los de serie ya viven en el código, no hace falta duplicarlos.
    const personalizadosViejos = fondosViejos.filter((f) => f.nombre === 'Tú');
    if (personalizadosViejos.length === 0) {
      // No había nada tuyo que migrar, pero igualmente limpiamos el
      // campo viejo si solo contenía copias de los de serie.
      setDoc(doc(db, 'usuarios', usuario.uid), { fondos: deleteField() }, { merge: true }).catch(() => {});
      return;
    }

    const migrar = async () => {
      try {
        await Promise.all(
          personalizadosViejos.map((f) =>
            addDoc(collection(db, 'fondosPersonalizados'), {
              userId: usuario.uid,
              url: f.url,
              nombre: 'Tú',
              creadoEn: typeof f.id === 'number' ? f.id : Date.now(),
            })
          )
        );
        await setDoc(doc(db, 'usuarios', usuario.uid), { fondos: deleteField() }, { merge: true });
        console.log(`Fondos migrados: ${personalizadosViejos.length} fondo(s) movidos a su propia colección.`);
      } catch (error) {
        console.error('Error migrando los fondos al nuevo formato:', error);
      }
    };

    migrar();
  }, [usuario]);

  // 📡 Suscripción en tiempo real a tus fondos personalizados (colección aparte)
  useEffect(() => {
    if (!usuario) {
      setFondosPersonalizados([]);
      return;
    }

    const q = query(collection(db, 'fondosPersonalizados'), where('userId', '==', usuario.uid));

    const desvincular = onSnapshot(
      q,
      (snapshot) => {
        const propios = snapshot.docs
          .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
          .sort((a, b) => (b.creadoEn || 0) - (a.creadoEn || 0));
        setFondosPersonalizados(propios);
      },
      (error) => {
        console.error('Error escuchando fondos personalizados:', error);
      }
    );

    return () => desvincular();
  }, [usuario]);

  // Hidratamos fondoPantalla (sigue siendo un simple campo de texto
  // dentro de usuarios/{uid} — una URL no pesa nada, no hace falta
  // moverla a ningún sitio)
  useEffect(() => {
    if (usuario && usuario.fondoPantalla) {
      setFondoPantallaState(usuario.fondoPantalla);
      guardarFondoEnCache(usuario.fondoPantalla);
    }
  }, [usuario]);

  // Lista combinada: tus fondos primero, luego los de serie
  const todosLosFondos = useMemo(
    () => [...fondosPersonalizados, ...fondosPorDefecto],
    [fondosPersonalizados, fondosPorDefecto]
  );

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
      try {
        await addDoc(collection(db, 'fondosPersonalizados'), {
          userId: usuario.uid,
          url: urlBase64,
          nombre: 'Tú',
          creadoEn: Date.now(),
        });
      } catch (error) {
        console.error('Error al guardar fondo nuevo en Firebase:', error);
      }
    },
    [usuario]
  );

  // Solo se pueden borrar fondos PERSONALIZADOS (los de serie viven en
  // el código, no en Firestore, así que no hay nada que borrar ahí)
  const borrarFondos = useCallback(
    async (ids) => {
      const aBorrar = fondosPersonalizados.filter((f) => ids.includes(f.id));
      if (aBorrar.length === 0) return fondosPersonalizados;

      const fondoActualBorrado = aBorrar.some((f) => f.url === fondoPantalla);
      const restantes = fondosPersonalizados.filter((f) => !ids.includes(f.id));

      try {
        await Promise.all(aBorrar.map((f) => deleteDoc(doc(db, 'fondosPersonalizados', f.id))));
      } catch (error) {
        console.error('Error al borrar fondos en Firebase:', error);
      }

      if (fondoActualBorrado) {
        const nuevoFondo = restantes.length > 0 ? restantes[0].url : fondosPorDefecto[0].url;
        await cambiarFondo(nuevoFondo);
      }

      return restantes;
    },
    [fondosPersonalizados, fondoPantalla, cambiarFondo, fondosPorDefecto]
  );

  return { todosLosFondos, fondoPantalla, cambiarFondo, agregarFondoPersonal, borrarFondos };
}