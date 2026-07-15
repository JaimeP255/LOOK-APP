import React from 'react';

/**
 * ModalWishlistGrande
 * --------------------
 * Vista ampliada de un artículo de la wishlist: foto, nombre, marca,
 * precio, enlace a la tienda, y botones de editar/cerrar.
 */
export function ModalWishlistGrande({ item, onCerrar, onEditar }) {
  if (!item) return null;

  return (
    <div className="modal-overlay" onClick={onCerrar} style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000 }}>
      <div className="animation-slide-up-fijo" onClick={(e) => e.stopPropagation()} style={{ width: '90%', maxWidth: '380px', maxHeight: '90dvh', overflowY: 'auto', backgroundColor: '#ffffff', borderRadius: '28px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '15px', boxShadow: '0 25px 50px rgba(0,0,0,0.4)', position: 'relative', boxSizing: 'border-box' }}>

        {/* Botón Editar (Izquierda) */}
        <button
          onClick={() => onEditar(item)}
          aria-label="Editar artículo"
          style={{ position: 'absolute', top: '18px', left: '18px', backgroundColor: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)', border: 'none', color: '#111', cursor: 'pointer', width: '38px', height: '38px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 10 }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
        </button>

        {/* Botón Cerrar (Derecha) */}
        <button
          onClick={onCerrar}
          aria-label="Cerrar"
          style={{ position: 'absolute', top: '18px', right: '18px', backgroundColor: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)', border: 'none', fontSize: '18px', fontWeight: 'bold', color: '#111', cursor: 'pointer', width: '38px', height: '38px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 10 }}
        >✕</button>

        <div style={{ textAlign: 'center', padding: '0 40px', marginTop: '5px' }}>
          <h3 style={{ margin: '0', fontSize: '22px', fontWeight: '800', color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.nombre}
          </h3>
          <span style={{ fontSize: '14px', color: '#8e8e93', fontWeight: '600' }}>
            {item.marca ? item.marca.toUpperCase() : 'SIN MARCA'}
            {item.precio ? ` • ${item.precio}€` : ''}
          </span>
        </div>

        <div style={{ width: '100%', aspectRatio: '1/1', borderRadius: '20px', overflow: 'hidden', backgroundColor: '#f4f4f5', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
          <img src={item.foto} alt={item.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>

        {item.link && (
          <a
            href={item.link.startsWith('http') ? item.link : `https://${item.link}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ width: '100%', padding: '14px', backgroundColor: '#111', color: '#fff', textAlign: 'center', borderRadius: '16px', fontWeight: '700', fontSize: '14px', textDecoration: 'none', display: 'block', boxSizing: 'border-box' }}
          >
            Ir a la Tienda ↗
          </a>
        )}
      </div>
    </div>
  );
}
