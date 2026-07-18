import React, { useState } from 'react';
import { compartirOutfit } from '../utils/compartirOutfit';

/**
 * ModalOutfitGrande
 * ------------------
 * Vista ampliada de un outfit guardado: foto (o el montaje de prendas
 * si no tiene foto de portada), nombre, y botones para compartirlo o
 * editarlo en el lienzo.
 */
export function ModalOutfitGrande({ outfit, onCerrar, onEditar, mostrarToast }) {
  const [compartiendo, setCompartiendo] = useState(false);

  if (!outfit) return null;

  const manejarCompartir = async () => {
    setCompartiendo(true);
    try {
      const resultado = await compartirOutfit(outfit);
      if (resultado === 'descargado') {
        mostrarToast('Imagen guardada en tus descargas', 'exito');
      }
      // Si se compartió con el panel nativo, no hace falta avisar —
      // el propio sistema ya confirma visualmente que se compartió
    } catch (error) {
      // El usuario cancelando el panel de compartir también dispara un
      // error (AbortError) — no es un fallo real, no hace falta avisar
      if (error.name !== 'AbortError') {
        console.error('Error al compartir el outfit:', error);
        mostrarToast('No se pudo generar la imagen para compartir. Inténtalo de nuevo.', 'error');
      }
    } finally {
      setCompartiendo(false);
    }
  };

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
        backgroundColor: 'var(--color-superficie)',
        borderRadius: '28px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        boxShadow: 'var(--sombra-fuerte)',
        position: 'relative',
        boxSizing: 'border-box',
        overflowX: 'hidden',
        animation: 'ultraSmoothReveal 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards'
      }}>

        <button
          onClick={onCerrar}
          aria-label="Cerrar"
          style={{ position: 'absolute', top: '30px', right: '30px', backgroundColor: 'var(--superficie-translucida)', backdropFilter: 'blur(10px)', border: 'none', fontSize: '18px', fontWeight: 'bold', color: 'var(--color-texto)', cursor: 'pointer', zIndex: 10, width: '36px', height: '36px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: 'var(--sombra-suave)' }}
        >✕</button>

        <h3 style={{ margin: '10px 0 0 0', fontSize: '24px', fontWeight: '800', color: 'var(--color-texto)', textAlign: 'center', padding: '0 20px', boxSizing: 'border-box', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {outfit.nombre}
        </h3>

        <div style={{ width: '100%', aspectRatio: '3/4', borderRadius: '20px', overflow: 'hidden', backgroundColor: 'var(--color-fondo-alt)', border: '1px solid var(--color-borde)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
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
                  <img src={p.imagen} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={manejarCompartir}
            disabled={compartiendo}
            style={{ flex: 1, padding: '18px', borderRadius: '20px', backgroundColor: 'var(--gris-100)', color: 'var(--color-texto)', border: 'none', fontWeight: '700', fontSize: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: compartiendo ? 'default' : 'pointer', boxSizing: 'border-box', opacity: compartiendo ? 0.7 : 1 }}
          >
            {compartiendo ? (
              'Generando...'
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-texto)" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3"></circle>
                  <circle cx="6" cy="12" r="3"></circle>
                  <circle cx="18" cy="19" r="3"></circle>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                </svg>
                Compartir
              </>
            )}
          </button>

          <button
            onClick={() => onEditar(outfit)}
            style={{ flex: 1.4, padding: '18px', borderRadius: '20px', backgroundColor: 'var(--color-texto)', color: 'var(--color-fondo)', border: 'none', fontWeight: '700', fontSize: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: 'pointer', boxShadow: 'var(--sombra-media)', boxSizing: 'border-box' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-fondo)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            Editar
          </button>
        </div>

      </div>
    </div>
  );
}
