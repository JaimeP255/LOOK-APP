import { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import {
  collection,
  onSnapshot,
  addDoc,
  doc,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';

/**
 * usePrendas
 * ----------
 * Centraliza TODO lo relacionado con la colección "prendas" de Firestore:
 *  - Se suscribe en tiempo real a las prendas del usuario logueado.
 *  - Expone addPrenda() y deletePrendas() para no repetir código en App.jsx.
 *  - Expone cargandoPrendas para poder mostrar un skeleton/spinner
 *    mientras llega la primera respuesta de Firestore (antes no existía).
 *
 * @param {object|null} usuario - usuario actual de Firebase Auth (o null)
 */
export function usePrendas(usuario) {
  const [prendas, setPrendas] = useState([]);
  const [cargandoPrendas, setCargandoPrendas] = useState(true);

  useEffect(() => {
    // Sin usuario logueado no hay nada que escuchar
    if (!usuario) {
      setPrendas([]);
      setCargandoPrendas(false);
      return;
    }

    setCargandoPrendas(true);

    const coleccionRef = collection(db, 'prendas');
    const consultaFiltrada = query(coleccionRef, where('userId', '==', usuario.uid));

    const desvincularEscucha = onSnapshot(
      consultaFiltrada,
      (snapshot) => {
        const prendasDeLaNube = snapshot.docs.map((docSnapshot) => ({
          id: docSnapshot.id,
          ...docSnapshot.data(),
        }));
        prendasDeLaNube.sort((a, b) => (b.creadoEn || 0) - (a.creadoEn || 0));
        setPrendas(prendasDeLaNube);
        setCargandoPrendas(false);
      },
      (error) => {
        // Antes esto no se capturaba nunca: si Firestore fallaba
        // (permisos, red...) la app se quedaba "colgada" en silencio.
        console.error('Error escuchando la colección prendas:', error);
        setCargandoPrendas(false);
      }
    );

    return () => desvincularEscucha();
  }, [usuario]);

  // Añade una prenda nueva. userId y creadoEn se ponen aquí dentro,
  // así App.jsx ya no tiene que acordarse de hacerlo cada vez.
  const addPrenda = useCallback(
    async (datosPrenda) => {
      if (!usuario) throw new Error('No hay usuario logueado');
      return addDoc(collection(db, 'prendas'), {
        ...datosPrenda,
        userId: usuario.uid,
        creadoEn: Date.now(),
      });
    },
    [usuario]
  );

  // Borra una o varias prendas por id (recibe siempre un array)
  const deletePrendas = useCallback(async (ids) => {
    if (!ids || ids.length === 0) return;
    await Promise.all(ids.map((id) => deleteDoc(doc(db, 'prendas', id))));
  }, []);

  return { prendas, cargandoPrendas, addPrenda, deletePrendas };
}
