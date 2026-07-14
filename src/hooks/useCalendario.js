import { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

// Convierte una fecha a "AAAA-MM-DD" (mismo formato que usaba App.jsx)
const aTexto = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * useCalendario
 * -------------
 * Junta el calendario de outfits del día a día y la racha (streak),
 * porque en tu app siempre se guardan/actualizan juntos (marcar el
 * outfit de hoy es lo que dispara el cálculo de racha).
 *
 * Ambos viven dentro del documento "usuarios" en Firestore (no son
 * colecciones aparte), así que se hidratan a partir del objeto `usuario`
 * que ya devuelve useAuth().
 *
 * 🐛 Bug corregido respecto al original: `rachaReal` y `ultimaFechaRacha`
 * nunca se releían de Firebase al cargar la app (solo se guardaban).
 * Es decir, cada vez que recargabas, el contador de racha volvía a 0
 * en pantalla hasta que marcabas el outfit de hoy otra vez, aunque en
 * Firebase el valor real siguiera ahí. Aquí sí se hidratan.
 *
 * @param {object|null} usuario - usuario actual (viene de useAuth())
 */
export function useCalendario(usuario) {
  const [outfitsCalendario, setOutfitsCalendario] = useState({});
  const [rachaReal, setRachaReal] = useState(0);
  const [ultimaFechaRacha, setUltimaFechaRacha] = useState(null);

  useEffect(() => {
    if (usuario) {
      if (usuario.calendario) setOutfitsCalendario(usuario.calendario);
      if (typeof usuario.rachaReal === 'number') setRachaReal(usuario.rachaReal);
      if (usuario.ultimaFechaRacha) setUltimaFechaRacha(usuario.ultimaFechaRacha);
    } else {
      setOutfitsCalendario({});
      setRachaReal(0);
      setUltimaFechaRacha(null);
    }
  }, [usuario]);

  /**
   * Guarda la foto de un día del calendario. Si ese día es HOY,
   * además recalcula y guarda la racha.
   * Devuelve { nuevaRacha, esHoy } para que la pantalla decida si
   * lanzar la animación de racha (se lanza siempre que esHoy && nuevaRacha > 0,
   * igual que en el código original, aunque ese día ya estuviera marcado).
   */
  const guardarDiaCalendario = useCallback(
    async (fecha, foto) => {
      if (!usuario) return { nuevaRacha: rachaReal, esHoy: false };

      const nuevosOutfits = { ...outfitsCalendario, [fecha]: foto };
      setOutfitsCalendario(nuevosOutfits);

      const usuarioRef = doc(db, 'usuarios', usuario.uid);

      try {
        await setDoc(usuarioRef, { calendario: nuevosOutfits }, { merge: true });
      } catch (error) {
        console.error('Error al guardar calendario en Firebase:', error);
      }

      const fechaActual = new Date();
      const hoyTexto = aTexto(fechaActual);
      const esHoy = fecha === hoyTexto;

      let nuevaRacha = rachaReal;

      if (esHoy && ultimaFechaRacha !== hoyTexto) {
        const ayer = new Date();
        ayer.setDate(fechaActual.getDate() - 1);
        const ayerTexto = aTexto(ayer);

        nuevaRacha = ultimaFechaRacha === ayerTexto ? rachaReal + 1 : 1;
        setRachaReal(nuevaRacha);
        setUltimaFechaRacha(hoyTexto);

        try {
          await setDoc(usuarioRef, { rachaReal: nuevaRacha, ultimaFechaRacha: hoyTexto }, { merge: true });
        } catch (error) {
          console.error('Error al guardar racha en Firebase:', error);
        }
      }

      return { nuevaRacha, esHoy };
    },
    [usuario, outfitsCalendario, rachaReal, ultimaFechaRacha]
  );

  return { outfitsCalendario, rachaReal, guardarDiaCalendario };
}
