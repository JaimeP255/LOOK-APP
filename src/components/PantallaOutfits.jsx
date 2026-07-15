import React from 'react';

/**
 * PantallaOutfits
 * ----------------
 * La pantalla "Mis Outfits": grid de outfits guardados con selección
 * múltiple (mantener pulsado o botón "Seleccionar"), y el botón fijo
 * inferior para crear uno nuevo o eliminar los seleccionados.
 *
 * Incluye también su botón flotante inferior (antes vivía en un bloque
 * aparte, más abajo en el árbol de JSX, aunque lógicamente pertenece
 * a esta pantalla — lo juntamos aquí para que el componente sea
 * autocontenido, igual que ya pasaba con el de Wishlist).
 */
export function PantallaOutfits({
  modoSeleccionOutfit,
  cancelarSeleccionOutfit,
  setModoSeleccionOutfit,
  outfitsGuardados,
  cargandoOutfits,
  outfitsSeleccionados,
  toggleSeleccionarOutfit,
  esLongPressOutfit,
  iniciarLongPressOutfit,
  cancelarLongPressOutfit,
  setMiOutfitSeleccionado,
  carruselFondosAbierto,
  modalPerfilCompletoAbierto,
  intentarEliminarSeleccionadosOutfits,
  onAbrirCreadorOutfit,
}) {
  return (
    <>
      <div
        className="pantalla-outfits animate-fade-in"
        style={{ padding: 'calc(80px + env(safe-area-inset-top, 0px)) 20px 20px 20px', minHeight: '100dvh', boxSizing: 'border-box' }}
        onClick={() => {
          if (modoSeleccionOutfit) cancelarSeleccionOutfit();
        }}
      >
        {outfitsGuardados.length > 0 && (
          <div className="contenedor-sub-accion-seleccion-zona" onClick={(e) => e.stopPropagation()} style={{ marginBottom: '15px' }}>
            <button
              className={`btn-activar-seleccion-link ${modoSeleccionOutfit ? 'en-seleccion' : ''}`}
              onClick={() => (modoSeleccionOutfit ? cancelarSeleccionOutfit() : setModoSeleccionOutfit(true))}
            >
              {modoSeleccionOutfit ? 'CANCELAR' : 'SELECCIONAR'}
            </button>
          </div>
        )}

        {cargandoOutfits ? (
          <div style={{ textAlign: 'center', marginTop: '30px' }}>
            <p style={{ color: '#888', fontSize: '15px' }}>Cargando tus outfits...</p>
          </div>
        ) : outfitsGuardados.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: '30px' }}>
            <p style={{ color: '#888', fontSize: '15px' }}>Aún no tienes ningún outfit guardado.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {outfitsGuardados.map((outfit) => {
              const estaMarcado = outfitsSeleccionados.includes(outfit.id);
              return (
                <div
                  key={outfit.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer',
                    opacity: modoSeleccionOutfit && !estaMarcado ? 0.7 : 1,
                    transform: estaMarcado ? 'scale(0.96)' : 'scale(1)',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (esLongPressOutfit.current) {
                      esLongPressOutfit.current = false;
                      return;
                    }
                    if (modoSeleccionOutfit) {
                      toggleSeleccionarOutfit(outfit.id);
                    } else {
                      setMiOutfitSeleccionado(outfit);
                    }
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    iniciarLongPressOutfit(outfit);
                  }}
                  onPointerUp={cancelarLongPressOutfit}
                  onPointerLeave={cancelarLongPressOutfit}
                  onPointerCancel={cancelarLongPressOutfit}
                  onContextMenu={(e) => {
                    if (!modoSeleccionOutfit) e.preventDefault();
                  }}
                >
                  <div style={{
                    width: '100%',
                    aspectRatio: '2/3',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    backgroundColor: '#f4f4f5',
                    border: estaMarcado ? '3px solid #111' : '1px solid #e5e5ea',
                    position: 'relative',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    boxSizing: 'border-box'
                  }}>
                    {modoSeleccionOutfit && (
                      <div className={`checkbox-burbuja-flotante ${estaMarcado ? 'burbuja-check-activa' : ''}`} style={{ top: '6px', right: '6px' }}>
                        {estaMarcado ? '✓' : ''}
                      </div>
                    )}

                    {outfit.foto ? (
                      <img src={outfit.foto} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={outfit.nombre} />
                    ) : (
                      <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        {outfit.prendas.map((p, index) => (
                          <div key={p.idUnico} style={{
                            position: 'absolute',
                            transform: `translate(${p.x * 0.3}px, ${p.y * 0.3}px) scale(${p.escala * 0.3}) rotate(${p.rotacion}deg)`,
                            width: '110px',
                            height: '110px',
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

                  <span style={{ marginTop: '8px', fontSize: '12px', fontWeight: '600', color: '#111', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {outfit.nombre}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {!carruselFondosAbierto && !modalPerfilCompletoAbierto && (
        <div className="contenedor-fijo-boton-inferior">
          {modoSeleccionOutfit ? (
            <button
              className={`btn-anadir-prenda-bottom-fixed btn-eliminar-seleccion-multiple-fixed ${outfitsSeleccionados.length > 0 ? 'con-items-para-borrar' : ''}`}
              onClick={intentarEliminarSeleccionadosOutfits}
              disabled={outfitsSeleccionados.length === 0}
            >
              ✕ ELIMINAR SELECCIONADOS ({outfitsSeleccionados.length})
            </button>
          ) : (
            <button
              className="btn-anadir-prenda-bottom-fixed"
              style={{ backgroundColor: '#000', color: '#fff', border: 'none' }}
              onClick={onAbrirCreadorOutfit}
            >
              ＋ CREAR OUTFIT
            </button>
          )}
        </div>
      )}
    </>
  );
}
