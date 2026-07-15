import React from 'react';

/**
 * ToastContainer
 * --------------
 * Pinta la pila de notificaciones en pantalla. Puramente visual: toda
 * la lógica de cuándo mostrar/ocultar vive en useToast().
 *
 * Se coloca una sola vez, cerca de la raíz de <App />, para que flote
 * por encima de cualquier modal.
 */
export function ToastContainer({ toasts, onCerrar }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-contenedor" aria-live="polite" role="status">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast toast-${t.tipo}`}
          onClick={() => onCerrar(t.id)}
        >
          {t.mensaje}
        </div>
      ))}
    </div>
  );
}
