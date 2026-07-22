import React from 'react';
import { convertirAEnlaceAfiliado } from '../utils/afiliados';

/**
 * ModalPrendaGrande
 * ------------------
 * Vista ampliada de una prenda del armario: foto grande, nombre, marca,
 * categoría y color, con botones de editar y cerrar.
 */
export function ModalPrendaGrande({ prenda, onCerrar, onEditar }) {
  if (!prenda) return null;

  return (
    <div
      className="modal-overlay"
      onClick={onCerrar}
      style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000 }}
    >
      <div
        className="animation-slide-up-fijo"
        onClick={(e) => e.stopPropagation()}
        style={{ width: '90%', maxWidth: '380px', maxHeight: '90dvh', overflowY: 'auto', backgroundColor: 'var(--color-superficie)', borderRadius: '28px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '15px', boxShadow: 'var(--sombra-fuerte)', position: 'relative', boxSizing: 'border-box' }}
      >
        {/* CONTROLES SUPERIORES (Lápiz en la IZQUIERDA) */}
        <div style={{ position: 'absolute', top: '18px', left: '18px', display: 'flex', gap: '10px', zIndex: 10 }}>
          <button
            onClick={() => onEditar(prenda)}
            aria-label="Editar prenda"
            style={{ backgroundColor: 'var(--superficie-translucida)', backdropFilter: 'blur(10px)', border: 'none', color: 'var(--color-texto)', cursor: 'pointer', width: '38px', height: '38px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: 'var(--sombra-suave)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
          </button>
        </div>

        {/* BOTÓN CERRAR (Se mantiene a la derecha) */}
        <div style={{ position: 'absolute', top: '18px', right: '18px', zIndex: 10 }}>
          <button
            onClick={onCerrar}
            aria-label="Cerrar"
            style={{ backgroundColor: 'var(--superficie-translucida)', backdropFilter: 'blur(10px)', border: 'none', fontSize: '18px', fontWeight: 'bold', color: 'var(--color-texto)', cursor: 'pointer', width: '38px', height: '38px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: 'var(--sombra-suave)' }}
          >✕</button>
        </div>

        {/* Título y Marca */}
        <div style={{ textAlign: 'center', padding: '0 40px', marginTop: '5px' }}>
          <h3 style={{ margin: '0', fontSize: '22px', fontWeight: '800', color: 'var(--color-texto)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {prenda.nombre}
          </h3>
          <span style={{ fontSize: '14px', color: 'var(--color-texto-suave)', fontWeight: '600' }}>
            {prenda.marca.toUpperCase()}
          </span>
        </div>

        {/* Foto en Grande */}
        <div style={{ width: '100%', aspectRatio: '1/1', borderRadius: '20px', overflow: 'hidden', backgroundColor: 'var(--color-fondo-alt)', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
          <img src={prenda.imagen} alt={prenda.nombre} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          <div style={{ position: 'absolute', bottom: '15px', right: '15px', width: '26px', height: '26px', borderRadius: '50%', backgroundColor: prenda.color, border: '2px solid var(--color-superficie)', boxShadow: 'var(--sombra-suave)' }} />
        </div>

        {/* Info Extra: Categoría y Tono */}
        <div style={{ display: 'flex', justifyContent: 'space-around', backgroundColor: 'var(--color-fondo-alt)', padding: '15px', borderRadius: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-texto-suave)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Categoría</span>
            <span style={{ fontSize: '14px', color: 'var(--color-texto)', fontWeight: '600' }}>{prenda.categoria}</span>
          </div>
          <div style={{ width: '1px', backgroundColor: 'var(--color-borde-fuerte)' }}></div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-texto-suave)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Color Base</span>
            <span style={{ fontSize: '14px', color: 'var(--color-texto)', fontWeight: '600' }}>{prenda.colorPadre}</span>
          </div>
        </div>

        {prenda.enlace && (
          <a
            href={convertirAEnlaceAfiliado(prenda.enlace)}
            target="_blank"
            rel="noopener noreferrer"
            style={{ width: '100%', padding: '14px', backgroundColor: 'var(--color-texto)', color: 'var(--color-fondo)', textAlign: 'center', borderRadius: '16px', fontWeight: '700', fontSize: '14px', textDecoration: 'none', display: 'block', boxSizing: 'border-box' }}
          >
            Ir a la Tienda ↗
          </a>
        )}
      </div>
    </div>
  );
}
