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
 * useWishlist
 * -----------
 * Igual que usePrendas, pero para la colección "wishlist":
 *  - Suscripción en tiempo real filtrada por el usuario logueado.
 *  - addWishlistItem() para crear un artículo nuevo.
 *  - updateWishlistItem() para editar uno existente (antes se hacía
 *    con setDoc + merge directamente en el componente).
 *  - deleteWishlistItems() para borrar uno o varios de golpe.
 *  - cargandoWishlist para poder mostrar un estado de carga.
 *
 * @param {object|null} usuario - usuario actual de Firebase Auth (o null)
 */
export function useWishlist(usuario) {
  const [wishlist, setWishlist] = useState([]);
  const [cargandoWishlist, setCargandoWishlist] = useState(true);

  useEffect(() => {
    if (!usuario) {
      setWishlist([]);
      setCargandoWishlist(false);
      return;
    }

    setCargandoWishlist(true);

    const q = query(collection(db, 'wishlist'), where('userId', '==', usuario.uid));

    const desvincularEscucha = onSnapshot(
      q,
      (snapshot) => {
        setWishlist(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
        setCargandoWishlist(false);
      },
      (error) => {
        console.error('Error escuchando la colección wishlist:', error);
        setCargandoWishlist(false);
      }
    );

    return () => desvincularEscucha();
  }, [usuario]);

  const addWishlistItem = useCallback(
    async (datosItem) => {
      if (!usuario) throw new Error('No hay usuario logueado');
      return addDoc(collection(db, 'wishlist'), {
        ...datosItem,
        userId: usuario.uid,
      });
    },
    [usuario]
  );

  const updateWishlistItem = useCallback(
    async (id, datosItem) => {
      if (!usuario) throw new Error('No hay usuario logueado');
      return setDoc(
        doc(db, 'wishlist', id),
        { ...datosItem, userId: usuario.uid },
        { merge: true }
      );
    },
    [usuario]
  );

  const deleteWishlistItems = useCallback(async (ids) => {
    if (!ids || ids.length === 0) return;
    await Promise.all(ids.map((id) => deleteDoc(doc(db, 'wishlist', id))));
  }, []);

  return {
    wishlist,
    cargandoWishlist,
    addWishlistItem,
    updateWishlistItem,
    deleteWishlistItems,
  };
}
