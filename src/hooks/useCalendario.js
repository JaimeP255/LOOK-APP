import { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../firebase';
import {
  collection,
  doc,
  setDoc,
  deleteField,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';

// Convierte una fecha a "AAAA-MM-DD" (mismo formato que usaba App.jsx)
const aTexto = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// ID determinista por día: "uid_2026-07-15". Evita duplicados y hace que
// guardar un día sea un simple "upsert" (no hay que buscar si ya existía).
const idDiaCalendario = (uid, fecha) => `${uid}_${fecha}`;

/**
 * Calcula la racha ÚNICAMENTE a partir de las fechas reales marcadas en
 * el calendario — nunca se guarda como número aparte, se recalcula
 * siempre en vivo. Así no puede quedarse "congelada" con un valor
 * antiguo si has estado varios días sin abrir la app.
 */
function calcularRachaDesdeCalendario(calendario) {
  const hoy = new Date();
  const hoyTexto = aTexto(hoy);

  let cursor = null;
  if (calendario[hoyTexto]) {
    cursor = hoy;
  } else {
    const ayer = new Date();
    ayer.setDate(hoy.getDate() - 1);
    if (calendario[aTexto(ayer)]) cursor = ayer;
  }

  if (!cursor) return 0;

  let racha = 0;
  const d = new Date(cursor);
  while (calendario[aTexto(d)]) {
    racha++;
    d.setDate(d.getDate() - 1);
  }
  return racha;
}

/**
 * useCalendario
 * -------------
 * Calendario de outfits del día a día + racha.
 *
 * 🐛 Historial de bugs en esta parte de la app:
 * 1) `rachaReal`/`ultimaFechaRacha` se guardaban en Firebase pero nunca
 *    se releían al cargar la app.
 * 2) Se arregló hidratando esos campos — pero el problema de fondo
 *    seguía ahí: un contador guardado aparte puede desincronizarse.
 *    Se sustituyó por un cálculo en vivo a partir del propio calendario.
 * 3) 🔥 EL GRANDE: todos los días del calendario vivían como un mapa
 *    gigante dentro del documento "usuarios/{uid}" — el mismo documento
 *    donde también viven tus fondos, tu foto de perfil, etc. Firestore
 *    pone un límite de 1.048.576 bytes (1MB) POR DOCUMENTO. Al no
 *    comprimir las fotos del calendario (a diferencia del resto de fotos
 *    de la app), ese documento superó el límite y CUALQUIER guardado que
 *    lo tocara (no solo el calendario) empezó a fallar con el error
 *    "cannot be written because its size... exceeds the maximum".
 *
 * SOLUCIÓN: el calendario ahora vive en su propia colección
 * ("diasCalendario"), con un documento pequeño por día — igual que ya
 * hacían prendas/wishlist/outfits. Ningún documento puede volver a
 * "explotar" por acumular fotos. Además, las fotos ahora se comprimen
 * antes de guardarse (ver handleSubirFotoCalendario en App.jsx).
 *
 * MIGRACIÓN AUTOMÁTICA: si detecta el calendario "viejo" (el mapa
 * gigante dentro de usuarios/{uid}.calendario), mueve cada día a su
 * documento nuevo y BORRA el campo viejo, para que el documento de
 * usuario vuelva a pesar poco y puedas volver a guardar fondos,
 * categorías, foto de perfil, etc. con normalidad. Se ejecuta sola, una
 * vez, la próxima vez que abras la app — no hace falta que hagas nada.
 *
 * @param {object|null} usuario - usuario actual (viene de useAuth())
 */
export function useCalendario(usuario) {
  const [outfitsCalendario, setOutfitsCalendario] = useState({});
  const [cargandoCalendario, setCargandoCalendario] = useState(true);

  // 🔄 Migración automática, una sola vez por usuario
  useEffect(() => {
    if (!usuario) return;

    const calendarioViejo = usuario.calendario;
    if (!calendarioViejo || Object.keys(calendarioViejo).length === 0) return;

    const migrar = async () => {
      try {
        await Promise.all(
          Object.entries(calendarioViejo).map(([fecha, foto]) =>
            setDoc(doc(db, 'diasCalendario', idDiaCalendario(usuario.uid, fecha)), {
              userId: usuario.uid,
              fecha,
              foto,
            })
          )
        );
        // Ya están a salvo en su sitio nuevo: vaciamos el campo viejo
        // para que el documento de "usuarios" vuelva a pesar poco.
        await setDoc(doc(db, 'usuarios', usuario.uid), { calendario: deleteField() }, { merge: true });
        console.log(`Calendario migrado: ${Object.keys(calendarioViejo).length} día(s) movidos a su propia colección.`);
      } catch (error) {
        console.error('Error migrando el calendario al nuevo formato:', error);
      }
    };

    migrar();
  }, [usuario]);

  // 📡 Suscripción en tiempo real a los días del calendario (ya en su propia colección)
  useEffect(() => {
    if (!usuario) {
      setOutfitsCalendario({});
      setCargandoCalendario(false);
      return;
    }

    setCargandoCalendario(true);
    const q = query(collection(db, 'diasCalendario'), where('userId', '==', usuario.uid));

    const desvincular = onSnapshot(
      q,
      (snapshot) => {
        const mapa = {};
        snapshot.docs.forEach((docSnap) => {
          const datos = docSnap.data();
          mapa[datos.fecha] = datos.foto;
        });
        setOutfitsCalendario(mapa);
        setCargandoCalendario(false);
      },
      (error) => {
        console.error('Error escuchando el calendario:', error);
        setCargandoCalendario(false);
      }
    );

    return () => desvincular();
  }, [usuario]);

  const rachaReal = useMemo(
    () => calcularRachaDesdeCalendario(outfitsCalendario),
    [outfitsCalendario]
  );

  /**
   * Guarda la foto de un día del calendario en su propio documento.
   * Devuelve { nuevaRacha, esHoy } para que la pantalla decida si
   * lanzar la animación de racha.
   */
  const guardarDiaCalendario = useCallback(
    async (fecha, foto) => {
      if (!usuario) return { nuevaRacha: 0, esHoy: false };

      try {
        await setDoc(doc(db, 'diasCalendario', idDiaCalendario(usuario.uid, fecha)), {
          userId: usuario.uid,
          fecha,
          foto,
        });
      } catch (error) {
        console.error('Error al guardar calendario en Firebase:', error);
        throw error;
      }

      const hoyTexto = aTexto(new Date());
      const esHoy = fecha === hoyTexto;
      // Calculamos con el calendario local + el día recién guardado, sin
      // esperar al viaje de ida y vuelta del onSnapshot de arriba.
      const nuevaRacha = calcularRachaDesdeCalendario({ ...outfitsCalendario, [fecha]: foto });

      return { nuevaRacha, esHoy };
    },
    [usuario, outfitsCalendario]
  );

  return { outfitsCalendario, cargandoCalendario, rachaReal, guardarDiaCalendario };
}