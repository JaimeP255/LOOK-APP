import React from 'react';

/**
 * PantallaInicio
 * --------------
 * La pantalla de bienvenida/hero de la pestaña "Inicio": el fondo de
 * pantalla elegido, el título, y el botón de "Explorar catálogo" o
 * "Iniciar sesión con Google" según si hay sesión iniciada.
 */
export function PantallaInicio({ fondoPantalla, usuario, navegarA, intentarLoginConGoogle }) {
  return (
    <div className="pantalla-inicio-imagen" style={{ backgroundImage: `url(${fondoPantalla})` }}>
      <div className="vibe-overlay">
        <div className="vibe-text">
          <h2>Tu Armario</h2>
          <p>Minimalista. Organizado. Personal.</p>
          {usuario ? (
            <button className="btn-explorar-inicio" onClick={() => navegarA('armario', 'Todos')}>
              Explorar catálogo
            </button>
          ) : (
            <button className="btn-explorar-inicio" onClick={intentarLoginConGoogle}>
              Iniciar sesión con Google
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
