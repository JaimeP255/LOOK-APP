import React from 'react';

/**
 * ModalConfirmacionBorrado
 * ------------------------
 * Antes había 4 copias casi idénticas de este modal pegadas por todo
 * App.jsx (una para prendas, otra para outfits, otra para fondos, otra
 * para wishlist) — mismo icono, misma estructura, solo cambiaba el
 * título, el mensaje y a qué función llamaban los botones. Un componente
 * con las mismas 4 líneas visuales, en un solo sitio.
 *
 * Props:
 *  - abierto: si es false, no renderiza nada
 *  - titulo: texto del <h2> (p.ej. "¿Eliminar prendas?")
 *  - mensaje: JSX del párrafo de detalle (para poder incluir <strong> con
 *    el número de elementos seleccionados, singular/plural, etc.)
 *  - onCancelar / onConfirmar: qué hacer al pulsar cada botón
 *  - zIndex: opcional, para los casos que necesitan ir por encima de otro
 *    modal ya abierto (fondos y wishlist lo usaban con 10001)
 */
export function ModalConfirmacionBorrado({ abierto, titulo, mensaje, onCancelar, onConfirmar, zIndex, procesando }) {
  if (!abierto) return null;

  return (
    <div className="modal-overlay modal-blur-premium" style={zIndex ? { zIndex } : undefined}>
      <div className="modal-content modal-borrado-chulo animation-pop-in">
        <div className="icono-peligro-contenedor">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        </div>

        <h2>{titulo}</h2>
        <p className="texto-borrado-detalle">{mensaje}</p>

        <div className="botones-grupo-modal botones-borrado">
          <button type="button" className="btn-cancelar-borrado" onClick={onCancelar} disabled={procesando}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn-confirmar-borrado-rojo"
            onClick={onConfirmar}
            disabled={procesando}
            style={{ opacity: procesando ? 0.7 : 1, cursor: procesando ? 'default' : 'pointer' }}
          >
            {procesando ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
}
