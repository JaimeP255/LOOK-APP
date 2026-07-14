import { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import {
  collection,
  onSnapshot,
  addDoc,
  doc,
  deleteDoc,
  setDoc,
  query,
  where,
} from 'firebase/firestore';

/**
 * useOutfits
 * ----------
 * Igual patrón que usePrendas/useWishlist, para la colección "outfits":
 *  - Suscripción en tiempo real filtrada por usuario.
 *  - guardarOutfit(datos, outfitAEditar) crea uno nuevo o actualiza uno
 *    existente según si le pasas el outfit que se está editando.
 *  - deleteOutfits() borra uno o varios de golpe.
 *  - cargandoOutfits para poder mostrar un estado de carga.
 *
 * @param {object|null} usuario - usuario actual de Firebase Auth (o null)
 */
export function useOutfits(usuario) {
  const [outfitsGuardados, setOutfitsGuardados] = useState([]);
  const [cargandoOutfits, setCargandoOutfits] = useState(true);

  useEffect(() => {
    if (!usuario) {
      setOutfitsGuardados([]);
      setCargandoOutfits(false);
      return;
    }

    setCargandoOutfits(true);

    const consultaOutfits = query(collection(db, 'outfits'), where('userId', '==', usuario.uid));

    const desvincularEscucha = onSnapshot(
      consultaOutfits,
      (snapshot) => {
        const outfitsNube = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
        outfitsNube.sort((a, b) => (b.creadoEn || 0) - (a.creadoEn || 0));
        setOutfitsGuardados(outfitsNube);
        setCargandoOutfits(false);
      },
      (error) => {
        console.error('Error escuchando la colección outfits:', error);
        setCargandoOutfits(false);
      }
    );

    return () => desvincularEscucha();
  }, [usuario]);

  // Crea un outfit nuevo, o actualiza uno existente si le pasas outfitAEditar
  const guardarOutfit = useCallback(
    async (datosOutfit, outfitAEditar) => {
      if (!usuario) throw new Error('No hay usuario logueado');

      const datosCompletos = {
        ...datosOutfit,
        userId: usuario.uid,
        // Si estamos editando conservamos la fecha original, si no, la de ahora
        creadoEn: outfitAEditar ? outfitAEditar.creadoEn : Date.now(),
      };

      if (outfitAEditar) {
        await setDoc(doc(db, 'outfits', outfitAEditar.id), datosCompletos, { merge: true });
      } else {
        await addDoc(collection(db, 'outfits'), datosCompletos);
      }
    },
    [usuario]
  );

  const deleteOutfits = useCallback(async (ids) => {
    if (!ids || ids.length === 0) return;
    await Promise.all(ids.map((id) => deleteDoc(doc(db, 'outfits', id))));
  }, []);

  return { outfitsGuardados, cargandoOutfits, guardarOutfit, deleteOutfits };
}
