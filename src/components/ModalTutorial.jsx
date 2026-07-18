import React, { useState } from 'react';

const PASOS = [
  {
    titulo: 'Tu Armario',
    texto: 'Añade tus prendas con una foto, y clasifícalas por categoría, marca y color. Desde el icono "Editar" del menú puedes elegir qué categorías se muestran.',
    icono: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 4a2 2 0 1 1-2 2"></path>
        <path d="M3 9l9-5 9 5-9 5-9-5z"></path>
        <path d="M3 9v9l9 5 9-5V9"></path>
      </svg>
    ),
  },
  {
    titulo: 'Crea Outfits',
    texto: 'En el lienzo, arrastra prendas de tu armario o de tu wishlist para montar looks completos. Guárdalos para volver a usarlos.',
    icono: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"></rect>
        <rect x="14" y="3" width="7" height="7" rx="1"></rect>
        <rect x="3" y="14" width="7" height="7" rx="1"></rect>
        <rect x="14" y="14" width="7" height="7" rx="1"></rect>
      </svg>
    ),
  },
  {
    titulo: 'Wishlist y Calendario',
    texto: 'Guarda lo que quieres comprar en tu wishlist, y marca cada día tu outfit en el calendario para construir tu racha.',
    icono: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"></rect>
        <line x1="16" y1="2" x2="16" y2="6"></line>
        <line x1="8" y1="2" x2="8" y2="6"></line>
        <line x1="3" y1="10" x2="21" y2="10"></line>
      </svg>
    ),
  },
  {
    titulo: 'Social',
    texto: 'Busca a tus amigos, acepta sus solicitudes, y descubre los outfits que suben. Ellos también pueden ver los tuyos.',
    icono: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
        <circle cx="8.5" cy="7" r="4"></circle>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
      </svg>
    ),
  },
];

/**
 * ModalTutorial
 * -------------
 * Un mini tutorial de 4 pasos, con puntos de progreso, que se puede
 * recorrer hacia delante/atrás o cerrar en cualquier momento. Se
 * dispara solo una vez, justo al terminar de completar el perfil por
 * primera vez, y también se puede reabrir cuando quieras desde el
 * menú lateral.
 */
export function ModalTutorial({ abierto, onCerrar }) {
  const [paso, setPaso] = useState(0);

  if (!abierto) return null;

  const esUltimo = paso === PASOS.length - 1;
  const actual = PASOS[paso];

  const cerrarYReiniciar = () => {
    onCerrar();
    // Pequeño respiro para que no se vea el salto al paso 1 mientras se cierra
    setTimeout(() => setPaso(0), 300);
  };

  return (
    <div className="modal-overlay" onClick={cerrarYReiniciar} style={{ zIndex: 10010 }}>
      <div
        className="modal-content animation-slide-up-fijo"
        onClick={(e) => e.stopPropagation()}
        style={{ width: '85%', maxWidth: '340px', textAlign: 'center', padding: '32px 24px 24px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}
      >
        <button
          onClick={cerrarYReiniciar}
          aria-label="Cerrar tutorial"
          style={{ position: 'absolute', top: '16px', right: '16px', background: 'var(--gris-100)', border: 'none', color: 'var(--color-texto-suave)', width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}
        >✕</button>

        <div style={{ width: '72px', height: '72px', borderRadius: '50%', backgroundColor: 'var(--color-fondo-alt)', color: 'var(--color-acento)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
          {actual.icono}
        </div>

        <h3 style={{ margin: '0 0 10px 0', fontFamily: 'var(--fuente-editorial)', fontSize: '21px', fontWeight: '600', color: 'var(--color-texto)' }}>
          {actual.titulo}
        </h3>

        <p style={{ margin: '0 0 24px 0', fontSize: '14px', lineHeight: '1.55', color: 'var(--color-texto-suave)' }}>
          {actual.texto}
        </p>

        <div style={{ display: 'flex', gap: '6px', marginBottom: '22px' }}>
          {PASOS.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === paso ? '18px' : '6px',
                height: '6px',
                borderRadius: '999px',
                backgroundColor: i === paso ? 'var(--color-acento)' : 'var(--color-borde-fuerte)',
                transition: 'all 0.25s ease',
              }}
            />
          ))}
        </div>

        <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
          {paso > 0 && (
            <button
              onClick={() => setPaso((p) => p - 1)}
              style={{ flex: 1, padding: '14px', borderRadius: '14px', border: 'none', backgroundColor: 'var(--gris-100)', color: 'var(--color-texto)', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}
            >
              Atrás
            </button>
          )}
          <button
            onClick={() => (esUltimo ? cerrarYReiniciar() : setPaso((p) => p + 1))}
            style={{ flex: 2, padding: '14px', borderRadius: '14px', border: 'none', backgroundColor: 'var(--color-acento)', color: '#ffffff', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}
          >
            {esUltimo ? '¡Entendido!' : 'Siguiente'}
          </button>
        </div>
      </div>
    </div>
  );
}
