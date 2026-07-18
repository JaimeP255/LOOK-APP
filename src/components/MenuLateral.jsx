import React from 'react';

/**
 * MenuLateral
 * -----------
 * El menú de hamburguesa que se desliza desde la izquierda: navegación
 * principal (Inicio, Outfits, Social, Wishlist) y el desplegable de
 * categorías del catálogo (ropa / accesorios).
 */
export function MenuLateral({
  menuAbierto,
  setMenuAbierto,
  pantallaActual,
  setPantallaActual,
  filtro,
  categoriasActivas,
  navegarA,
  catalogoAbierto,
  setCatalogoAbierto,
  setModalEditarAbierto,
  seccionRopaExpandida,
  setSeccionRopaExpandida,
  seccionAccesoriosExpandida,
  setSeccionAccesoriosExpandida,
  CATEGORIAS_ROPA,
  CATEGORIAS_ACCESORIOS,
  onAbrirTutorial,
}) {
  return (
    <div className={`menu-lateral ${menuAbierto ? 'abierto' : ''}`}>
      <div className="menu-header">
        <button className="boton-menu-icon" onClick={() => setMenuAbierto(false)} aria-label="Cerrar menú">✕</button>
        <span className="menu-titulo">Menú</span>
      </div>

      <nav className="menu-nav">
        <button onClick={() => navegarA('inicio')} className={`menu-link ${pantallaActual === 'inicio' ? 'activo' : ''}`}>
          INICIO
        </button>

        <div className="submenu-contenedor">

          <button
            onClick={() => setCatalogoAbierto(!catalogoAbierto)}
            className={`menu-link ${catalogoAbierto ? 'catalogo-desplegado-azul' : ''}`}
          >
            CATÁLOGO {catalogoAbierto ? '▴' : '▾'}
          </button>

          {catalogoAbierto && (
            <div className="submenu-items">
              <button
                type="button"
                onClick={() => {
                  setSeccionRopaExpandida(!seccionRopaExpandida);
                  if (!seccionRopaExpandida) setSeccionAccesoriosExpandida(false);
                }}
                className="submenu-link"
                style={{ fontWeight: '600', color: 'var(--color-texto)', borderBottom: '1px solid var(--color-borde)', paddingBottom: '8px' }}
              >
                • ROPA {seccionRopaExpandida ? '▴' : '▾'}
              </button>

              {seccionRopaExpandida && (
                <div style={{ paddingLeft: '15px', margin: '10px 0 4px 0' }}>
                  <div className="menu-chip-categoria-grid">
                    {CATEGORIAS_ROPA.filter(cat => categoriasActivas.includes(cat)).map(cat => {
                      const activa = filtro === cat && pantallaActual === 'armario';
                      return (
                        <button
                          key={cat}
                          onClick={() => navegarA('armario', cat)}
                          className={`menu-chip-categoria ${activa ? 'activa' : ''}`}
                        >
                          {cat.toUpperCase()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setSeccionAccesoriosExpandida(!seccionAccesoriosExpandida);
                  if (!seccionAccesoriosExpandida) setSeccionRopaExpandida(false);
                }}
                className="submenu-link"
                style={{ fontWeight: '600', color: 'var(--color-texto)', borderTop: seccionRopaExpandida ? '1px solid var(--color-borde)' : 'none', paddingTop: '8px', marginTop: seccionRopaExpandida ? '4px' : '0px' }}
              >
                • ACCESORIOS {seccionAccesoriosExpandida ? '▴' : '▾'}
              </button>

              {seccionAccesoriosExpandida && (
                <div style={{ paddingLeft: '15px', margin: '10px 0 4px 0' }}>
                  <div className="menu-chip-categoria-grid">
                    {CATEGORIAS_ACCESORIOS.filter(cat => categoriasActivas.includes(cat)).map(cat => {
                      const activa = filtro === cat && pantallaActual === 'armario';
                      return (
                        <button
                          key={cat}
                          onClick={() => navegarA('armario', cat)}
                          className={`menu-chip-categoria ${activa ? 'activa' : ''}`}
                        >
                          {cat.toUpperCase()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <button onClick={() => navegarA('armario', 'Todos')} className="submenu-link" style={{ borderTop: '1px solid var(--color-borde)', paddingTop: '8px', marginTop: '8px' }}>
                • VER TODO
              </button>

              <button
                type="button"
                onClick={() => { setModalEditarAbierto(true); setMenuAbierto(false); }}
                className="submenu-link"
                style={{ color: 'var(--color-acento)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
                EDITAR CATEGORÍAS
              </button>
            </div>
          )}
        </div>

        <button
          onClick={() => {
            setPantallaActual('outfits');
            setMenuAbierto(false);
          }}
          className={`menu-link ${pantallaActual === 'outfits' ? 'activo' : ''}`}
        >
          MIS OUTFITS
        </button>

        <button
          onClick={() => {
            setPantallaActual('social');
            setMenuAbierto(false);
          }}
          className={`menu-link ${pantallaActual === 'social' ? 'activo' : ''}`}
        >
          SOCIAL
        </button>

        <button
          onClick={() => {
            setPantallaActual('wishlist');
            setMenuAbierto(false);
          }}
          className={`menu-link ${pantallaActual === 'wishlist' ? 'activo' : ''}`}
        >
          MI WISHLIST
        </button>

        <div style={{ borderTop: '1px solid var(--color-borde)', marginTop: '16px', paddingTop: '16px' }}>
          <button
            onClick={() => {
              onAbrirTutorial();
              setMenuAbierto(false);
            }}
            className="menu-link"
            style={{ fontSize: '11px', color: 'var(--color-texto-suave)', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            ¿CÓMO FUNCIONA?
          </button>
        </div>
      </nav>
    </div>
  );
}
