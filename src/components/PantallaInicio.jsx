import React from 'react';

/**
 * PantallaInicio
 * --------------
 * La pantalla de bienvenida/hero de la pestaña "Inicio": el fondo de
 * pantalla elegido (con un toque de saturación/contraste para que se
 * vea más vivo, aplicado solo a la foto, no al texto — ver el ::before
 * en App.css), el título editorial, y el botón de "Explorar catálogo"
 * o "Iniciar sesión con Google" según si hay sesión iniciada.
 */
export function PantallaInicio({ fondoPantalla, usuario, navegarA, intentarLoginConGoogle }) {
  return (
    <div className="pantalla-inicio-imagen" style={{ backgroundImage: `url(${fondoPantalla})` }}>
      <div className="vibe-overlay">
        <div className="vibe-text">
          <h2>Tu Armario</h2>
          <div className="vibe-linea" />
          <p>Cada prenda en su sitio, cada outfit a un toque.</p>

          {usuario ? (
            <button className="btn-explorar-inicio" onClick={() => navegarA('armario', 'Todos')}>
              Explorar catálogo
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>
          ) : (
            <button className="btn-explorar-inicio" onClick={intentarLoginConGoogle}>
              <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
                <path fill="#4285F4" d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7955 2.7164v2.2581h2.9087c1.7018-1.5668 2.6836-3.874 2.6836-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.4673-.806 5.9564-2.1805l-2.9087-2.2581c-.8059.54-1.8368.859-3.0477.859-2.344 0-4.3282-1.5831-5.036-3.7104H.9573v2.3318C2.4382 15.9832 5.4818 18 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.2822-1.1168-.2822-1.71s.1023-1.17.2823-1.71V4.9582H.9573C.3477 6.1727 0 7.5477 0 9s.3477 2.8273.9573 4.0418L3.964 10.71z"/>
                <path fill="#EA4335" d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C13.4632.8918 11.426 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.964 7.29C4.6718 5.1627 6.656 3.5795 9 3.5795z"/>
              </svg>
              Iniciar sesión con Google
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
