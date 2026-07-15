import React from 'react';
import { SelectorFoto } from './SelectorFoto';

/**
 * ModalNuevaPrenda
 * -----------------
 * Formulario para crear o editar una prenda del armario.
 *
 * De paso, este modal era el único de los 6 flujos de foto de la app
 * que se había quedado con el patrón manual antiguo (sus propios refs
 * e inputs sueltos) en vez de usar <SelectorFoto>. Ahora usa el mismo
 * componente que el resto — una menos que mantener por separado.
 */
export function ModalNuevaPrenda({
  abierto,
  prendaAEditar,
  formNombre,
  setFormNombre,
  formMarca,
  manejarCambioMarca,
  sugerenciasFiltradas,
  setFormMarca,
  setSugerenciasFiltradas,
  formCategoria,
  setFormCategoria,
  TODAS_CATEGORIAS,
  formImagen,
  handleImagenPrenda,
  formColor,
  formColorPadre,
  setFormColor,
  setFormColorPadre,
  COLORES_CON_TONALIDADES,
  onSubmit,
  onCerrar,
}) {
  if (!abierto) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-content-wide">
        <h2>{prendaAEditar ? 'Editar Prenda' : 'Nueva Prenda'}</h2>
        <p className="modal-subtitle">Introduce los datos para clasificar tu prenda.</p>

        <form onSubmit={onSubmit} className="formulario-prenda">
          <input
            type="text"
            placeholder="Nombre de la prenda (ej. Camiseta Básica)..."
            value={formNombre}
            onChange={(e) => setFormNombre(e.target.value)}
            className="input-prenda-texto"
            required
          />

          <label className="label-formulario">Marca</label>
          <div className="contenedor-autocompletar-marca">
            <input
              type="text"
              placeholder="Escribe la marca (ej. Polo, Zara)..."
              value={formMarca}
              onChange={(e) => manejarCambioMarca(e.target.value)}
              className="input-prenda-texto input-marca-campo"
            />
            {sugerenciasFiltradas.length > 0 && (
              <div className="lista-sugerencias-marcas">
                {sugerenciasFiltradas.map((marca) => (
                  <div
                    key={marca}
                    className="item-sugerencia-marca"
                    onClick={() => { setFormMarca(marca); setSugerenciasFiltradas([]); }}
                  >
                    {marca}
                  </div>
                ))}
              </div>
            )}
          </div>

          <label className="label-formulario">Categoría</label>
          <select value={formCategoria} onChange={(e) => setFormCategoria(e.target.value)} className="select-prenda-dropdown">
            {TODAS_CATEGORIAS.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <label className="label-formulario">Imagen de la prenda</label>
          <div className="contenedor-carga-foto" style={{ position: 'relative' }}>
            <SelectorFoto
              accept="image/*"
              capturaCamara="environment"
              onArchivoSeleccionado={handleImagenPrenda}
              trigger={(alternar) => (
                <div
                  className="btn-disparar-archivo"
                  onClick={alternar}
                  style={{ cursor: 'pointer', textAlign: 'center' }}
                >
                  {formImagen ? '✓ Foto seleccionada (Cambiar)' : '📷 Seleccionar Imagen'}
                </div>
              )}
            />

            {formImagen && (
              <div className="vista-previa-miniatura">
                <img src={formImagen} alt="Previa" />
              </div>
            )}
          </div>

          <label className="label-formulario">Tono Exacto</label>
          <div className="tablero-tonalidades-contenedor">
            {COLORES_CON_TONALIDADES.map((columna) => (
              <div key={columna.padre} className="columna-tonalidades">
                {columna.tonos.map((tono) => (
                  <button
                    type="button"
                    key={tono}
                    className={`cuadro-tono-prenda ${formColor === tono ? 'seleccionado' : ''}`}
                    style={{ backgroundColor: tono }}
                    onClick={() => { setFormColor(tono); setFormColorPadre(columna.padre); }}
                  />
                ))}
              </div>
            ))}
          </div>

          <div className="botones-grupo-modal">
            <button type="submit" className="btn-guardar-modal-formulario">Guardar Prenda</button>
            <button type="button" className="btn-cerrar-modal-formulario" onClick={onCerrar}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}
