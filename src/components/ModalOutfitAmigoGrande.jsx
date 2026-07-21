import React from 'react';

/**
 * ModalOutfitAmigoGrande
 * ------------------------
 * Vista ampliada del outfit de un AMIGO (no el tuyo) — foto o montaje,
 * y la lista de "Comprar" por cada prenda que tenga un enlace guardado.
 *
 * Esto es lo que convierte a Social en un escaparate real: cuando ves
 * el look de un amigo y te gusta, puedes ir directo a comprar cada
 * prenda concreta, no solo mirar la foto.
 */
export function ModalOutfitAmigoGrande({ outfit, nombreAmigo, onCerrar }) {
  if (!outfit) return null;

  const prendasConEnlace = (outfit.prendas || []).filter((p) => p.enlace);

  return (
    <div className="modal-overlay" onClick={onCerrar} style={{ zIndex: 10015 }}>
      <div
        className="modal-content animation-slide-up-fijo"
        onClick={(e) => e.stopPropagation()}
        style={{ width: '90%', maxWidth: '380px', maxHeight: '88dvh', overflowY: 'auto', backgroundColor: 'var(--color-superficie)', borderRadius: '28px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: 'var(--sombra-fuerte)', position: 'relative', boxSizing: 'border-box' }}
      >
        <button
          onClick={onCerrar}
          aria-label="Cerrar"
          style={{ position: 'absolute', top: '18px', right: '18px', backgroundColor: 'var(--superficie-translucida)', backdropFilter: 'blur(10px)', border: 'none', fontSize: '18px', fontWeight: 'bold', color: 'var(--color-texto)', cursor: 'pointer', zIndex: 10, width: '36px', height: '36px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: 'var(--sombra-suave)' }}
        >✕</button>

        <div style={{ textAlign: 'center', padding: '4px 40px 0 40px' }}>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: '800', color: 'var(--color-texto)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {outfit.nombre || 'Outfit'}
          </h3>
          {nombreAmigo && (
            <span style={{ fontSize: '12px', color: 'var(--color-texto-suave)', fontWeight: '600' }}>de {nombreAmigo}</span>
          )}
        </div>

        <div style={{ width: '100%', aspectRatio: '3/4', borderRadius: '20px', overflow: 'hidden', backgroundColor: 'var(--color-fondo-alt)', border: '1px solid var(--color-borde)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          {outfit.foto ? (
            <img src={outfit.foto} alt={outfit.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              {(outfit.prendas || []).map((p, index) => (
                <div key={p.idUnico || index} style={{
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

        {/* Comprar el look, prenda por prenda */}
        <div>
          <span style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--color-texto-suave)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
            Comprar este look
          </span>

          {prendasConEnlace.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {prendasConEnlace.map((p, index) => (
                <a
                  key={p.idUnico || index}
                  href={p.enlace.startsWith('http') ? p.enlace : `https://${p.enlace}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', borderRadius: '14px', backgroundColor: 'var(--color-fondo-alt)', textDecoration: 'none' }}
                >
                  <div style={{ width: '44px', height: '44px', borderRadius: '10px', overflow: 'hidden', backgroundColor: 'var(--color-superficie)', flexShrink: 0 }}>
                    <img src={p.imagen} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-texto)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.nombre || 'Prenda'}
                    </div>
                    {p.marca && (
                      <div style={{ fontSize: '11px', color: 'var(--color-texto-suave)', fontWeight: '600' }}>{p.marca}</div>
                    )}
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-acento)', flexShrink: 0 }}>Ir ↗</span>
                </a>
              ))}
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-texto-suave)', textAlign: 'center', padding: '12px 0' }}>
              {nombreAmigo ? `${nombreAmigo} no ha añadido enlaces de compra a este outfit.` : 'Este outfit no tiene enlaces de compra.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
