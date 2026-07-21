import React, { useState } from 'react';
import { eliminarCuentaCompleta } from '../utils/eliminarCuenta';

const PALABRA_CONFIRMACION = 'ELIMINAR';

/**
 * ModalEliminarCuenta
 * ---------------------
 * Pide confirmación explícita (escribir una palabra, no solo un clic)
 * antes de borrar la cuenta por completo — es una acción irreversible,
 * así que el nivel de fricción es intencionado.
 */
export function ModalEliminarCuenta({ abierto, uid, onCerrar, onCuentaEliminada, mostrarToast }) {
  const [textoConfirmacion, setTextoConfirmacion] = useState('');
  const [eliminando, setEliminando] = useState(false);

  if (!abierto) return null;

  const puedeConfirmar = textoConfirmacion.trim().toUpperCase() === PALABRA_CONFIRMACION;

  const manejarEliminar = async () => {
    if (!puedeConfirmar || eliminando) return;
    setEliminando(true);
    try {
      await eliminarCuentaCompleta(uid);
      onCuentaEliminada();
    } catch (error) {
      console.error('Error al eliminar la cuenta:', error);
      mostrarToast('No se pudo eliminar la cuenta. Inténtalo de nuevo o contacta con soporte.', 'error');
      setEliminando(false);
    }
  };

  const cerrar = () => {
    if (eliminando) return; // no dejamos cerrar a mitad del borrado
    setTextoConfirmacion('');
    onCerrar();
  };

  return (
    <div className="modal-overlay" onClick={cerrar} style={{ zIndex: 10020 }}>
      <div
        className="modal-content animation-slide-up-fijo"
        onClick={(e) => e.stopPropagation()}
        style={{ width: '85%', maxWidth: '340px', padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}
      >
        <div style={{ width: '52px', height: '52px', borderRadius: '50%', backgroundColor: 'var(--color-peligro-suave)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 4px auto' }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--color-peligro)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18"></path>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
        </div>

        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: 'var(--color-texto)', textAlign: 'center' }}>
          Eliminar tu cuenta
        </h3>

        <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.6', color: 'var(--color-texto-suave)', textAlign: 'center' }}>
          Se borrará <strong style={{ color: 'var(--color-texto)' }}>todo</strong>: tu armario, tus outfits, tu wishlist, tu calendario y tus amistades. No hay forma de deshacerlo.
          <br /><br />
          Escribe <strong style={{ color: 'var(--color-peligro)' }}>{PALABRA_CONFIRMACION}</strong> para confirmar:
        </p>

        <input
          type="text"
          value={textoConfirmacion}
          onChange={(e) => setTextoConfirmacion(e.target.value)}
          placeholder={PALABRA_CONFIRMACION}
          disabled={eliminando}
          style={{
            width: '100%',
            padding: '13px',
            borderRadius: '12px',
            border: '1px solid ' + (puedeConfirmar ? 'var(--color-peligro)' : 'var(--color-borde-fuerte)'),
            backgroundColor: 'var(--gris-100)',
            color: 'var(--color-texto)',
            fontSize: '16px',
            textAlign: 'center',
            fontWeight: '700',
            letterSpacing: '1px',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />

        <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
          <button
            onClick={cerrar}
            disabled={eliminando}
            style={{ flex: 1, padding: '14px', borderRadius: '14px', border: 'none', backgroundColor: 'var(--gris-100)', color: 'var(--color-texto)', fontWeight: '600', fontSize: '14px', cursor: eliminando ? 'default' : 'pointer' }}
          >
            Cancelar
          </button>
          <button
            onClick={manejarEliminar}
            disabled={!puedeConfirmar || eliminando}
            style={{
              flex: 1.3,
              padding: '14px',
              borderRadius: '14px',
              border: 'none',
              backgroundColor: puedeConfirmar ? 'var(--color-peligro)' : 'var(--gris-300)',
              color: '#ffffff',
              fontWeight: '700',
              fontSize: '14px',
              cursor: puedeConfirmar && !eliminando ? 'pointer' : 'default',
              opacity: eliminando ? 0.8 : 1,
            }}
          >
            {eliminando ? 'Eliminando...' : 'Eliminar para siempre'}
          </button>
        </div>
      </div>
    </div>
  );
}
