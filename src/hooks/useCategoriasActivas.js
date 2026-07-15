import { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

/**
 * useCategoriasActivas
 * ---------------------
 * Gestiona qué categorías de ropa están activas (visibles) en tu armario.
 *
 * 🐛 Bug corregido: cuando creabas una prenda de una categoría nueva
 * (que se activaba automáticamente), esa activación solo se guardaba en
 * el estado local — nunca se sincronizaba con Firebase. Al recargar la
 * app, esa categoría podía "desactivarse" sola. Ahora activarCategoria()
 * también sincroniza.
 *
 * @param {object|null} usuario - usuario actual (viene de useAuth())
 * @param {Array<string>} categoriasPorDefecto
 * @param {Array<string>} ordenCategorias - array con el orden "canónico"
 *   de todas las categorías posibles (tu TODAS_CATEGORIAS), para ordenar
 *   siempre igual.
 */
export function useCategoriasActivas(usuario, categoriasPorDefecto, ordenCategorias) {
  const [categoriasActivas, setCategoriasActivas] = useState(categoriasPorDefecto);

  useEffect(() => {
    if (usuario && usuario.categoriasActivas) {
      setCategoriasActivas(usuario.categoriasActivas);
    }
  }, [usuario]);

  const sincronizar = useCallback(
    async (listaOrdenada) => {
      if (!usuario) return;
      try {
        await setDoc(doc(db, 'usuarios', usuario.uid), { categoriasActivas: listaOrdenada }, { merge: true });
      } catch (error) {
        console.error('Error al sincronizar categorías activas:', error);
      }
    },
    [usuario]
  );

  // Activa/desactiva una categoría (usado en el filtro de "editar categorías")
  const toggleCategoriaFiltro = useCallback(
    (cat) => {
      setCategoriasActivas((prev) => {
        const existe = prev.includes(cat);
        const nuevaLista = existe ? prev.filter((c) => c !== cat) : [...prev, cat];
        const listaOrdenada = nuevaLista.sort(
          (a, b) => ordenCategorias.indexOf(a) - ordenCategorias.indexOf(b)
        );
        sincronizar(listaOrdenada);
        return listaOrdenada;
      });
    },
    [ordenCategorias, sincronizar]
  );

  // Se activa sola cuando creas una prenda de una categoría que no estaba activa
  const activarCategoria = useCallback(
    (cat) => {
      setCategoriasActivas((prev) => {
        if (prev.includes(cat)) return prev;
        const listaOrdenada = [...prev, cat].sort(
          (a, b) => ordenCategorias.indexOf(a) - ordenCategorias.indexOf(b)
        );
        sincronizar(listaOrdenada);
        return listaOrdenada;
      });
    },
    [ordenCategorias, sincronizar]
  );

  return { categoriasActivas, toggleCategoriaFiltro, activarCategoria };
}
