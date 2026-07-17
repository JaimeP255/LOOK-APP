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

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: '20px' }}>

            <button
              onClick={() => setCatalogoAbierto(!catalogoAbierto)}
              className={`menu-link ${catalogoAbierto ? 'catalogo-desplegado-azul' : ''}`}
              style={{ flex: 1, textAlign: 'left', paddingRight: 0 }}
            >
              CATÁLOGO {catalogoAbierto ? '▴' : '▾'}
            </button>

            <button
              onClick={() => { setModalEditarAbierto(true); setMenuAbierto(false); }}
              style={{
                width: '32px',
                height: '32px',
                backgroundColor: 'var(--gris-100)',
                border: 'none',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                cursor: 'pointer',
                flexShrink: 0
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-texto)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
            </button>

          </div>

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
                <div className="sub-submenu-items" style={{ paddingLeft: '15px', display: 'flex', flexDirection: 'column', gap: '8px', margin: '8px 0 4px 0' }}>

                  {CATEGORIAS_ROPA.filter(cat => categoriasActivas.includes(cat)).map(cat => (
                    <button
                      key={cat}
                      onClick={() => navegarA('armario', cat)}
                      className={`submenu-link ${filtro === cat && pantallaActual === 'armario' ? 'sub-active' : ''}`}
                      style={{ fontSize: '11px', color: filtro === cat ? 'var(--color-texto)' : 'var(--color-texto-suave)' }}
                    >
                      ◦ {cat.toUpperCase()}
                    </button>
                  ))}
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
                <div className="sub-submenu-items" style={{ paddingLeft: '15px', display: 'flex', flexDirection: 'column', gap: '8px', margin: '8px 0 4px 0' }}>
                  {CATEGORIAS_ACCESORIOS.filter(cat => categoriasActivas.includes(cat)).map(cat => (
                    <button
                      key={cat}
                      onClick={() => navegarA('armario', cat)}
                      className={`submenu-link ${filtro === cat ? 'sub-active' : ''}`}
                      style={{ fontSize: '11px', color: filtro === cat ? 'var(--color-texto)' : 'var(--color-texto-suave)' }}
                    >
                      ◦ {cat.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}

              <button onClick={() => navegarA('armario', 'Todos')} className="submenu-link" style={{ borderTop: '1px solid #e9e5db', paddingTop: '8px', marginTop: '8px' }}>
                • VER TODO
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
      </nav>
    </div>
  );
}
