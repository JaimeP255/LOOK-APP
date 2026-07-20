import React from 'react';

/**
 * PantallaWishlist
 * -----------------
 * La pantalla "Mi Wishlist": filtro por marca, grid de artículos con
 * selección múltiple (mantener pulsado o botón "Seleccionar"), y el
 * botón fijo inferior para añadir o eliminar seleccionados.
 */
export function PantallaWishlist({
  modoSeleccionWishlist,
  cancelarSeleccionWishlist,
  obtenerMarcasWishlist,
  filtroMarcaWishlist,
  setFiltroMarcaWishlist,
  wishlist,
  setModoSeleccionWishlist,
  cargandoWishlist,
  wishlistFiltrada,
  wishlistSeleccionadaMulti,
  toggleSeleccionarWishlist,
  esLongPressWishlist,
  iniciarLongPressWishlist,
  cancelarLongPressWishlist,
  setWishlistSeleccionadaGrande,
  setIdsABorrar,
  setModalConfirmacionBorradoWishlist,
  setWishlistAEditar,
  setFormWishlist,
  setModalWishlistAbierto,
}) {
  return (
    <div
      className="pantalla-armario animate-fade-in"
      style={{ paddingTop: 'calc(80px + env(safe-area-inset-top, 0px))', minHeight: '100dvh' }}
      onClick={() => { if (modoSeleccionWishlist) cancelarSeleccionWishlist(); }}
    >
      {/* CABECERA: misma estructura que en Armario para que la línea y el filtro encajen igual */}
      <header className="armario-header" onClick={(e) => e.stopPropagation()}>
        <div className="contenedor-tabs-marcas-editorial">
          {obtenerMarcasWishlist().map((marcaName) => {
            const activa = filtroMarcaWishlist.toLowerCase() === marcaName.toLowerCase();
            return (
              <button
                key={marcaName}
                className={`tab-marca-editorial-item ${activa ? 'tab-activa' : ''}`}
                onClick={() => setFiltroMarcaWishlist(marcaName)}
              >
                {marcaName.toUpperCase()}
              </button>
            );
          })}
        </div>
      </header>

      {wishlist.length > 0 && (
        <div className="contenedor-sub-accion-seleccion-zona" onClick={(e) => e.stopPropagation()}>
          <button
            className={`btn-activar-seleccion-link ${modoSeleccionWishlist ? 'en-seleccion' : ''}`}
            onClick={() => (modoSeleccionWishlist ? cancelarSeleccionWishlist() : setModoSeleccionWishlist(true))}
          >
            {modoSeleccionWishlist ? 'CANCELAR' : 'SELECCIONAR'}
          </button>
        </div>
      )}

      {/* LISTADO */}
      <div className="armario-grid grid-ajuste-padding-bottom" style={{ padding: '0 20px 90px 20px' }}>
        {cargandoWishlist ? (
          <div className="no-prendas">Cargando tu wishlist...</div>
        ) : wishlistFiltrada.length === 0 ? (
          <div className="no-prendas">Tu wishlist está vacía o sin resultados.</div>
        ) : (
          wishlistFiltrada.map((item) => {
            const estaMarcada = wishlistSeleccionadaMulti.includes(item.id);
            return (
              <div
                key={item.id}
                className={`prenda-card ${modoSeleccionWishlist ? 'modo-seleccion-activo' : ''} ${estaMarcada ? 'card-marcada-premium' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (esLongPressWishlist.current) { esLongPressWishlist.current = false; return; }
                  if (modoSeleccionWishlist) {
                    toggleSeleccionarWishlist(item.id);
                  } else {
                    setWishlistSeleccionadaGrande(item);
                  }
                }}
                onPointerDown={(e) => { e.stopPropagation(); iniciarLongPressWishlist(item.id); }}
                onPointerUp={cancelarLongPressWishlist}
                onPointerLeave={cancelarLongPressWishlist}
                onPointerCancel={cancelarLongPressWishlist}
                onContextMenu={(e) => { if (!modoSeleccionWishlist) e.preventDefault(); }}
              >
                <div className="img-wrapper" style={{ height: '220px', borderRadius: '12px', position: 'relative' }}>
                  <img src={item.foto} alt="Wishlist item" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

                  {modoSeleccionWishlist && (
                    <div className={`checkbox-burbuja-flotante ${estaMarcada ? 'burbuja-check-activa' : ''}`} style={{ top: '10px', left: '10px', zIndex: 10 }}>
                      {estaMarcada ? '✓' : ''}
                    </div>
                  )}

                  {item.precio && (
                    <span style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      zIndex: 10,
                      fontSize: '11px',
                      fontWeight: '800',
                      color: 'var(--color-texto)',
                      backgroundColor: 'var(--superficie-translucida)',
                      padding: '4px 8px',
                      borderRadius: '8px',
                      letterSpacing: '0.5px',
                      backdropFilter: 'blur(4px)',
                      boxShadow: 'var(--sombra-suave)'
                    }}>
                      {item.precio}€
                    </span>
                  )}
                </div>

                <h3 style={{ margin: '12px 0 0px 0', color: 'var(--color-texto-suave)', whiteSpace: 'nowrap', textAlign: 'center' }}>
                  {item.nombre.length > 16 ? item.nombre.substring(0, 16).toUpperCase() + '...' : item.nombre.toUpperCase()}
                </h3>

                <span style={{ margin: '2px 0 0 0', fontSize: '10px', color: 'var(--color-texto-suave)', fontWeight: '600', textDecoration: item.link ? 'underline' : 'none', display: 'block', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', opacity: 0.8 }}>
                  {item.marca ? item.marca.toUpperCase() : 'SIN MARCA'}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* BOTÓN FIJO */}
      <div className="contenedor-fijo-boton-inferior">
        {modoSeleccionWishlist ? (
          <button
            type="button"
            className={`btn-anadir-prenda-bottom-fixed btn-eliminar-seleccion-multiple-fixed ${wishlistSeleccionadaMulti.length > 0 ? 'con-items-para-borrar' : ''}`}
            onClick={() => {
              setIdsABorrar(wishlistSeleccionadaMulti);
              setModalConfirmacionBorradoWishlist(true);
            }}
            disabled={wishlistSeleccionadaMulti.length === 0}
          >
            ✕ ELIMINAR SELECCIONADAS ({wishlistSeleccionadaMulti.length})
          </button>
        ) : (
          <button
            className="btn-anadir-prenda-bottom-fixed"
            onClick={() => {
              setWishlistAEditar(null);
              setFormWishlist({ foto: null, nombre: '', marca: '', link: '', precio: '' });
              setModalWishlistAbierto(true);
            }}
          >
            + AÑADIR A WISHLIST
          </button>
        )}
      </div>
    </div>
  );
}
