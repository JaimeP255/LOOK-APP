import React from 'react';

/**
 * ModalOutfitGrande
 * ------------------
 * Vista ampliada de un outfit guardado: foto (o el montaje de prendas
 * si no tiene foto de portada), nombre, y botón para editarlo en el
 * lienzo.
 */
export function ModalOutfitGrande({ outfit, onCerrar, onEditar }) {
  if (!outfit) return null;

  return (
    <div className="modal-overlay" style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000 }}>

      {/* ✨ ANIMACIÓN ULTRA CLEAN: 1.2s, sin giro 3D, flotación desde abajo con expansión */}
      <style>
        {`
          @keyframes ultraSmoothReveal {
            0% { 
              opacity: 0; 
              transform: translateY(40px) scale(0.92); 
            }
            100% { 
              opacity: 1; 
              transform: translateY(0) scale(1); 
            }
          }
        `}
      </style>

      <div style={{
        width: '90%',
        maxWidth: '400px',
        maxHeight: '90dvh',
        overflowY: 'auto',
        backgroundColor: '#ffffff',
        borderRadius: '28px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        boxShadow: '0 25px 50px rgba(0,0,0,0.4)',
        position: 'relative',
        boxSizing: 'border-box',
        overflowX: 'hidden',
        animation: 'ultraSmoothReveal 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards'
      }}>

        <button
          onClick={onCerrar}
          style={{ position: 'absolute', top: '30px', right: '30px', backgroundColor: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)', border: 'none', fontSize: '18px', fontWeight: 'bold', color: '#111', cursor: 'pointer', zIndex: 10, width: '36px', height: '36px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
        >✕</button>

        <h3 style={{ margin: '10px 0 0 0', fontSize: '24px', fontWeight: '800', color: '#111', textAlign: 'center', padding: '0 20px', boxSizing: 'border-box', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {outfit.nombre}
        </h3>

        <div style={{ width: '100%', aspectRatio: '3/4', borderRadius: '20px', overflow: 'hidden', backgroundColor: '#f4f4f5', border: '1px solid #f2f2f7', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          {outfit.foto ? (
            <img src={outfit.foto} alt={outfit.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              {outfit.prendas && outfit.prendas.map((p, index) => (
                <div key={p.idUnico} style={{
                  position: 'absolute',
                  transform: `translate(${p.x}px, ${p.y}px) scale(${p.escala}) rotate(${p.rotacion}deg)`,
                  width: '150px',
                  height: '150px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  zIndex: index
                }}>
                  <img src={p.imagen} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => onEditar(outfit)}
          style={{ width: '100%', padding: '18px', borderRadius: '20px', backgroundColor: '#111', color: '#fff', border: 'none', fontWeight: '700', fontSize: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', cursor: 'pointer', boxShadow: '0 8px 20px rgba(0,0,0,0.15)', boxSizing: 'border-box' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          Editar Outfit
        </button>

      </div>
    </div>
  );
}
