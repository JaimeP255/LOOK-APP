import React from 'react';

/**
 * PantallaArmario
 * ----------------
 * La pantalla principal: filtro por marca y por color, grid de prendas
 * con selección múltiple (mantener pulsado o botón "Seleccionar"), y
 * el botón fijo inferior para añadir una prenda o eliminar las
 * seleccionadas.
 *
 * Incluye también su botón flotante inferior (antes vivía en un bloque
 * aparte, más abajo en el árbol de JSX) — juntarlo aquí hace que el
 * componente sea autocontenido, igual que Wishlist y Outfits.
 */
export function PantallaArmario({
  modoSeleccion,
  cancelarSeleccion,
  obtenerMarcasDelArmario,
  filtroMarca,
  setFiltroMarca,
  filtroColorPadre,
  setFiltroColorPadre,
  obtenerColoresDelArmario,
  setModoSeleccion,
  cargandoPrendas,
  prendasFiltradas,
  prendasSeleccionadas,
  manejarClicPrenda,
  iniciarLongPress,
  cancelarLongPress,
  carruselFondosAbierto,
  modalPerfilCompletoAbierto,
  intentarEliminarSeleccionadas,
  abrirModalCrear,
}) {
  return (
    <>
      <div
        className="pantalla-armario animate-fade-in"
        onClick={() => {
          if (modoSeleccion) cancelarSeleccion();
        }}
      >
        <header className="armario-header" onClick={(e) => e.stopPropagation()}>
          <div className="contenedor-tabs-marcas-editorial">
            {obtenerMarcasDelArmario().map((marcaName) => {
              const activa = filtroMarca.toLowerCase() === marcaName.toLowerCase();
              return (
                <button key={marcaName} className={`tab-marca-editorial-item ${activa ? 'tab-activa' : ''}`} onClick={() => setFiltroMarca(marcaName)}>
                  {marcaName.toUpperCase()}
                </button>
              );
            })}
          </div>

          <div className="contenedor-filtro-colores-luxury">
            <button className={`item-color-rectangular ${filtroColorPadre === 'Todos' ? 'activo-todos' : ''}`} onClick={() => setFiltroColorPadre('Todos')}>
              <span>TODOS LOS COLORES</span>
            </button>

            {obtenerColoresDelArmario().map((colorObj) => {
              const esActivo = filtroColorPadre === colorObj.padre;
              return (
                <button
                  key={colorObj.padre}
                  className={`item-color-rectangular ${esActivo ? 'activo-solido' : ''}`}
                  style={{ '--color-luxury-tint': colorObj.colorBase, backgroundColor: esActivo ? colorObj.colorBase : 'transparent' }}
                  onClick={() => setFiltroColorPadre(colorObj.padre)}
                >
                  <span>{colorObj.padre.toUpperCase()}</span>
                </button>
              );
            })}
          </div>
        </header>

        <div className="contenedor-sub-accion-seleccion-zona" onClick={(e) => e.stopPropagation()}>
          <button className={`btn-activar-seleccion-link ${modoSeleccion ? 'en-seleccion' : ''}`} onClick={() => (modoSeleccion ? cancelarSeleccion() : setModoSeleccion(true))}>
            {modoSeleccion ? 'CANCELAR' : 'SELECCIONAR'}
          </button>
        </div>

        <div className="armario-grid grid-ajuste-padding-bottom">
          {cargandoPrendas ? (
            <p className="no-prendas">Cargando tu armario...</p>
          ) : prendasFiltradas.length === 0 ? (
            <p className="no-prendas">No hay prendas que coincidan con los filtros.</p>
          ) : (
            prendasFiltradas.map((prenda) => {
              const estaMarcada = prendasSeleccionadas.includes(prenda.id);
              return (
                <div
                  key={prenda.id}
                  className={`prenda-card ${modoSeleccion ? 'modo-seleccion-activo' : ''} ${estaMarcada ? 'card-marcada-premium' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    manejarClicPrenda(prenda);
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    iniciarLongPress(prenda);
                  }}
                  onPointerUp={cancelarLongPress}
                  onPointerLeave={cancelarLongPress}
                  onPointerCancel={cancelarLongPress}
                  onContextMenu={(e) => {
                    if (!modoSeleccion) e.preventDefault();
                  }}
                >
                  <div className="img-wrapper">
                    <img src={prenda.imagen} alt={prenda.nombre} />
                    <div className="badge-color-prenda" style={{ backgroundColor: prenda.color }}></div>
                    {modoSeleccion && <div className={`checkbox-burbuja-flotante ${estaMarcada ? 'burbuja-check-activa' : ''}`}>{estaMarcada ? '✓' : ''}</div>}
                  </div>
                  <h3>{prenda.nombre.toUpperCase()}</h3>
                  <span>{prenda.marca.toUpperCase()}</span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {!carruselFondosAbierto && !modalPerfilCompletoAbierto && (
        <div className="contenedor-fijo-boton-inferior">
          {modoSeleccion ? (
            <button
              className={`btn-anadir-prenda-bottom-fixed btn-eliminar-seleccion-multiple-fixed ${prendasSeleccionadas.length > 0 ? 'con-items-para-borrar' : ''}`}
              onClick={intentarEliminarSeleccionadas}
              disabled={prendasSeleccionadas.length === 0}
            >
              ✕ ELIMINAR SELECCIONADAS ({prendasSeleccionadas.length})
            </button>
          ) : (
            <button className="btn-anadir-prenda-bottom-fixed" onClick={abrirModalCrear}>＋ AÑADIR PRENDA</button>
          )}
        </div>
      )}
    </>
  );
}
