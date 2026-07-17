import React from 'react';

/**
 * ModalLienzoOutfit
 * -------------------
 * El "creador de outfits": un lienzo donde arrastras prendas (con
 * gestos táctiles propios, no el arrastre nativo del navegador) para
 * montar un look, con controles de capas (traer al frente / enviar al
 * fondo) y una papelera flotante para borrar arrastrando encima.
 *
 * Los gestos de arrastre (onTouchStart/Move/End) siguen viviendo en
 * App.jsx — aquí solo se reciben como callbacks. Es la parte más
 * delicada de toda la app (gestos táctiles con cálculos de posición en
 * tiempo real), así que su lógica interna no se toca nunca, solo el
 * color de las cosas.
 */
export function ModalLienzoOutfit({
  abierto,
  TODAS_CATEGORIAS,
  categoriaOutfitSeleccionada,
  setCategoriaOutfitSeleccionada,
  wishlist,
  prendas,
  agregarPrendaAlLienzo,
  idSeleccionado,
  setIdSeleccionado,
  prendasLienzo,
  setPrendasLienzo,
  idArrastrando,
  prendaEnZonaBorrado,
  handleTouchStartPrenda,
  handleTouchMovePrenda,
  handleTouchEndPrenda,
  enviarAlFondo,
  traerAlFrente,
  setModalCrearOutfitAbierto,
  setOutfitAEditar,
  setModalGuardarAbierto,
}) {
  if (!abierto) return null;

  return (
    <div className="modal-overlay" style={{
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      backgroundColor: 'rgba(0, 0, 0, 0.45)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 9999
    }}>
      <div className="modal-content animation-slide-up-fijo" style={{
        height: '85dvh',
        width: '85%',
        maxWidth: '380px',
        display: 'flex',
        flexDirection: 'column',
        padding: '0 0 20px 0',
        borderRadius: '28px',
        position: 'relative',
        backgroundColor: 'var(--color-fondo-alt)',
        boxShadow: 'var(--sombra-fuerte)',
        overflow: 'hidden',
        boxSizing: 'border-box'
      }}>

        {/* 1. CARRUSEL SUPERIOR DE CATEGORÍAS */}
        <div style={{
          backgroundColor: 'var(--gris-200)',
          display: 'flex',
          overflowX: 'auto',
          gap: '10px',
          padding: '20px 20px 10px 20px',
          scrollbarWidth: 'none',
          flexShrink: 0,
          WebkitOverflowScrolling: 'touch'
        }}>
          {['Wishlist', ...TODAS_CATEGORIAS].map((cat) => (
            <React.Fragment key={cat}>
              <button
                onClick={() => setCategoriaOutfitSeleccionada(cat)}
                style={{
                  position: 'relative',
                  padding: '6px 4px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: categoriaOutfitSeleccionada === cat ? 'var(--color-texto)' : 'var(--color-texto-suave)',
                  whiteSpace: 'nowrap',
                  fontWeight: '700',
                  fontSize: '12px',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'color 0.3s ease'
                }}
              >
                {cat.toUpperCase()}
                <div style={{
                  position: 'absolute',
                  bottom: '0',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  height: '2px',
                  backgroundColor: 'var(--color-texto)',
                  borderRadius: '2px',
                  width: categoriaOutfitSeleccionada === cat ? '60%' : '0%',
                  transition: 'width 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)'
                }} />
              </button>

              {cat === 'Wishlist' && (
                <div style={{
                  width: '1px',
                  height: '14px',
                  backgroundColor: 'var(--color-texto-suave)',
                  margin: 'auto 2px',
                  flexShrink: 0
                }}></div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* 2. CARRUSEL INFERIOR DE PRENDAS/WISHLIST */}
        <div style={{
          backgroundColor: 'var(--gris-200)',
          display: 'flex',
          overflowX: 'auto',
          gap: '15px',
          padding: '10px 20px 10px 20px',
          scrollbarWidth: 'none',
          borderBottom: '1px solid var(--color-borde-fuerte)',
          flexShrink: 0,
          minHeight: '100px'
        }}>
          {(categoriaOutfitSeleccionada === 'Wishlist'
            ? wishlist
            : prendas.filter((p) => p.categoria === categoriaOutfitSeleccionada)
          ).length === 0 ? (
            <p style={{ color: 'var(--color-texto-suave)', margin: 'auto', fontSize: '13px', fontWeight: '500' }}>
              {categoriaOutfitSeleccionada === 'Wishlist' ? 'Wishlist vacía' : 'Armario vacío'}
            </p>
          ) : (
            (categoriaOutfitSeleccionada === 'Wishlist'
              ? wishlist
              : prendas.filter((p) => p.categoria === categoriaOutfitSeleccionada)
            ).map((item) => (
              <div
                key={item.id}
                onClick={() => agregarPrendaAlLienzo({
                  idUnico: Date.now() + Math.random(),
                  imagen: item.foto || item.imagen,
                  x: 0,
                  y: 0,
                  escala: 1,
                  rotacion: 0
                })}
                style={{ flexShrink: 0, width: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}
              >
                <div style={{ width: '80px', height: '80px', borderRadius: '12px', overflow: 'hidden', backgroundColor: 'var(--color-superficie)', border: '1px solid var(--color-borde)', boxShadow: 'var(--sombra-suave)' }}>
                  <img src={item.foto || item.imagen} alt={item.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              </div>
            ))
          )}
        </div>

        {/* 3. ZONA DEL LIENZO */}
        <div
          onClick={() => setIdSeleccionado(null)}
          style={{
            flex: '1 1 auto',
            backgroundColor: 'var(--color-superficie)',
            margin: '10px 20px 20px 20px',
            borderRadius: '20px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            border: '2px dashed var(--color-borde-fuerte)',
            position: 'relative',
            minHeight: '150px',
            overflow: 'hidden',
            touchAction: 'none'
          }}
        >
          {idSeleccionado && prendasLienzo.find((p) => p.idUnico === idSeleccionado) && (
            <div style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              display: 'flex',
              gap: '8px',
              zIndex: 99
            }}>
              {/* Estos dos controles flotan siempre sobre las prendas del
                  lienzo (no sobre el fondo de la app), así que se quedan
                  oscuros y translúcidos a propósito en los dos temas */}
              <button
                onClick={(e) => { e.stopPropagation(); enviarAlFondo(idSeleccionado); }}
                style={{ background: 'rgba(30, 30, 30, 0.7)', color: '#fff', border: 'none', borderRadius: '14px', padding: '8px 14px', fontSize: '12px', fontWeight: '600', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              >
                ↓ Fondo
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); traerAlFrente(idSeleccionado); }}
                style={{ background: 'rgba(30, 30, 30, 0.7)', color: '#fff', border: 'none', borderRadius: '14px', padding: '8px 14px', fontSize: '12px', fontWeight: '600', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              >
                ↑ Frente
              </button>
            </div>
          )}

          {/* Papelera Animada Flotante */}
          <div style={{
            position: 'absolute',
            bottom: '15px',
            left: '15px',
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            backgroundColor: prendaEnZonaBorrado ? 'var(--color-peligro)' : 'var(--gris-100)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            transition: 'all 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            transform: (idArrastrando ? 'scale(1)' : 'scale(0.5)') + (prendaEnZonaBorrado ? ' scale(1.15)' : ''),
            opacity: idArrastrando ? (prendaEnZonaBorrado ? 1 : 0.6) : 0,
            zIndex: 99,
            boxShadow: prendaEnZonaBorrado ? '0 10px 20px rgba(255, 59, 48, 0.35)' : 'none'
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={prendaEnZonaBorrado ? '#ffffff' : 'var(--color-texto-suave)'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'stroke 0.3s' }}>
              <path d="M3 6h18"></path>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </div>

          {prendasLienzo.length === 0 && (
            <span style={{ color: 'var(--color-texto-suave)', fontSize: '14px', fontWeight: '500', textAlign: 'center', padding: '0 20px' }}>
              Toca una prenda para añadirla aquí
            </span>
          )}

          {prendasLienzo.map((p, index) => (
            <div
              key={p.idUnico}
              onTouchStart={(e) => handleTouchStartPrenda(e, p.idUnico)}
              onTouchMove={(e) => handleTouchMovePrenda(e, p.idUnico)}
              onTouchEnd={(e) => handleTouchEndPrenda(e, p.idUnico)}
              style={{
                position: 'absolute',
                transform: `translate(${p.x}px, ${p.y}px) scale(${p.escala}) rotate(${p.rotacion}deg)`,
                width: '110px',
                height: '110px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: idArrastrando === p.idUnico ? 50 : index,
                border: idSeleccionado === p.idUnico && !idArrastrando ? '1px dashed var(--color-borde-fuerte)' : '1px solid transparent',
                borderRadius: '12px'
              }}
            >
              <img
                src={p.imagen}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }}
              />
            </div>
          ))}
        </div>

        {/* 4. BOTONES INFERIORES */}
        <div style={{ padding: '0 20px', flexShrink: 0, display: 'flex', gap: '12px' }}>
          <button
            onClick={() => {
              setModalCrearOutfitAbierto(false);
              setPrendasLienzo([]);
              setOutfitAEditar(null);
              setCategoriaOutfitSeleccionada('Sudaderas');
            }}
            style={{
              flex: '1',
              padding: '14px',
              backgroundColor: 'var(--color-peligro-suave)',
              color: 'var(--color-peligro)',
              border: 'none',
              borderRadius: '16px',
              fontWeight: '700',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Cancelar
          </button>
          <button
            onClick={() => setModalGuardarAbierto(true)}
            disabled={prendasLienzo.length === 0}
            style={{
              flex: '1.5',
              padding: '14px',
              backgroundColor: prendasLienzo.length === 0 ? 'var(--gris-300)' : 'var(--color-acento)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '16px',
              fontWeight: '700',
              fontSize: '14px',
              cursor: prendasLienzo.length === 0 ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.3s'
            }}
          >
            Guardar
          </button>
        </div>

      </div>
    </div>
  );
}
