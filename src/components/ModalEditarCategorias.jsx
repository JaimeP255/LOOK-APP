import React from 'react';

/**
 * ModalEditarCategorias
 * ----------------------
 * Deja elegir qué categorías de ropa/accesorios aparecen en el menú y
 * en los filtros del armario.
 */
export function ModalEditarCategorias({
  abierto,
  onCerrar,
  TODAS_CATEGORIAS,
  categoriasActivas,
  toggleCategoriaFiltro,
}) {
  if (!abierto) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Editar catálogo</h2>
        <p className="modal-subtitle">Selecciona las prendas que quieres que se muestren en tu menú.</p>

        <div className="grid-categorias">
          {TODAS_CATEGORIAS.map((cat) => {
            const estaActiva = categoriasActivas.includes(cat);
            return (
              <div
                key={cat}
                className={`categoria-card-selector ${estaActiva ? 'activa' : ''}`}
                onClick={() => toggleCategoriaFiltro(cat)}
              >
                <span className="checkbox-icon">{estaActiva ? '✓' : '☐'}</span>
                <span className="checkbox-label">{cat}</span>
              </div>
            );
          })}
        </div>

        <div className="botones-grupo-modal" style={{ marginTop: '25px' }}>
          <button className="btn-guardar-modal" style={{ marginTop: 0 }} onClick={onCerrar}>
            Guardar cambios
          </button>
          <button type="button" className="btn-cerrar-modal-formulario" onClick={onCerrar}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
