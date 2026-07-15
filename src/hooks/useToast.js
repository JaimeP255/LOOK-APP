import { useState, useCallback, useRef } from 'react';

/**
 * useToast
 * --------
 * Sistema sencillo de notificaciones "toast" para sustituir los alert()
 * nativos (que en iOS se ven muy poco pulidos y bloquean la interfaz).
 *
 * Uso:
 *   const { toasts, mostrarToast, cerrarToast } = useToast();
 *   mostrarToast('Prenda guardada', 'exito');
 *   mostrarToast('No se pudo guardar', 'error');
 *
 * Tipos disponibles: 'exito' | 'error' | 'aviso' | 'info'
 */
export function useToast() {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const cerrarToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const mostrarToast = useCallback(
    (mensaje, tipo = 'info', duracionMs = 3500) => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, mensaje, tipo }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duracionMs);
      return id;
    },
    []
  );

  return { toasts, mostrarToast, cerrarToast };
}
