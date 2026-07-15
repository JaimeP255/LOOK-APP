import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * SelectorFoto
 * ------------
 * Desplegable reutilizable "Hacer foto / Añadir desde fototeca".
 *
 * Por qué existe: antes cada pantalla (prenda, perfil, calendario...)
 * copiaba y pegaba su propio bloque de <input type="file"> + refs.
 * Eso fue justo lo que rompió la foto de perfil: sus botones apuntaban
 * a unos refs que nunca se conectaron a ningún input real.
 *
 * 🐛 Bug corregido: en el carrusel de fondos, el desplegable se abría
 * pero quedaba invisible. Causa: el carrusel tiene scroll horizontal
 * (overflow-x: auto), y eso hace que el navegador recorte TAMBIÉN en
 * vertical cualquier cosa que sobresalga de esa caja — el desplegable,
 * al estar posicionado justo debajo del botón, quedaba recortado.
 *
 * Solución: el desplegable ahora se renderiza con un portal de React
 * directamente en <body>, con posición "fixed" calculada a partir de
 * dónde está el botón en pantalla. Así escapa de cualquier contenedor
 * con scroll o overflow oculto, sin importar dónde se use este
 * componente — no puede volver a pasar este mismo bug en otro sitio.
 *
 * Props:
 *  - onArchivoSeleccionado(file): recibe el File elegido (cámara o galería)
 *  - trigger(alternar): función que devuelve el JSX que abre/cierra el
 *    desplegable al hacer click (así cada pantalla mantiene su propio
 *    estilo visual para el "disparador")
 *  - accept: tipos de archivo aceptados (por defecto imágenes)
 *  - capturaCamara: 'environment' (cámara trasera, por defecto — para
 *    fotografiar prendas, outfits, fondos...) o 'user' (cámara
 *    delantera — para selfies de perfil)
 */
export function SelectorFoto({
  onArchivoSeleccionado,
  trigger,
  accept = 'image/*',
  capturaCamara = 'environment',
  wrapperClassName,
  wrapperStyle = { position: 'relative', width: '100%' },
}) {
  const [abierto, setAbierto] = useState(false);
  const [posicion, setPosicion] = useState({ top: 0, left: 0 });
  const wrapperRef = useRef(null);
  const inputCamaraRef = useRef(null);
  const inputGaleriaRef = useRef(null);

  const alternar = () => {
    if (!abierto && wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();

      // Centrado horizontal respecto al botón, pero sin salirse de la
      // pantalla por los lados (importante en carruseles con tarjetas
      // cerca del borde izquierdo/derecho).
      const centroX = rect.left + rect.width / 2;
      const margenSeguridad = 90; // la mitad del ancho mínimo del desplegable
      const izquierdaSegura = Math.min(
        Math.max(centroX, margenSeguridad),
        window.innerWidth - margenSeguridad
      );

      // Si el botón está muy pegado a la parte de abajo de la pantalla
      // (como el "+" de fondos, en un panel anclado abajo del todo), no
      // cabe un desplegable debajo — lo abrimos hacia ARRIBA en su lugar.
      const alturaEstimadaMenu = 104; // aprox. dos botones del desplegable
      const espacioAbajo = window.innerHeight - rect.bottom;
      const haciaArriba = espacioAbajo < alturaEstimadaMenu + 16;

      const top = haciaArriba ? rect.top - 8 : rect.bottom + 8;
      const topSeguro = Math.min(Math.max(top, 8), window.innerHeight - 8);

      setPosicion({ top: topSeguro, left: izquierdaSegura, haciaArriba });
    }
    setAbierto((prev) => !prev);
  };

  const cerrar = () => setAbierto(false);

  // Si haces scroll o giras el móvil mientras está abierto, lo cerramos
  // en vez de dejarlo flotando en una posición que ya no corresponde
  // al botón que lo abrió.
  useEffect(() => {
    if (!abierto) return;
    window.addEventListener('scroll', cerrar, true);
    window.addEventListener('resize', cerrar);
    return () => {
      window.removeEventListener('scroll', cerrar, true);
      window.removeEventListener('resize', cerrar);
    };
  }, [abierto]);

  const manejarCambio = (e) => {
    const file = e.target.files[0];
    if (file) onArchivoSeleccionado(file);
    e.target.value = ''; // permite volver a elegir el mismo archivo dos veces seguidas
    cerrar();
  };

  return (
    <div ref={wrapperRef} className={wrapperClassName} style={wrapperStyle}>
      {trigger(alternar)}

      {abierto &&
        createPortal(
          <>
            <div
              className="overlay-invisible-cerrar-menu"
              onClick={cerrar}
              style={{ zIndex: 999998 }}
            />
            <div
              className="selector-foto-dropdown animation-pop-in"
              style={{
                position: 'fixed',
                top: posicion.top,
                left: posicion.left,
                transform: posicion.haciaArriba ? 'translate(-50%, -100%)' : 'translateX(-50%)',
                margin: 0,
                zIndex: 999999,
              }}
            >
              <button type="button" onClick={() => inputCamaraRef.current.click()}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                  <circle cx="12" cy="13" r="4"></circle>
                </svg>
                Hacer foto
              </button>
              <button type="button" onClick={() => inputGaleriaRef.current.click()}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
                Añadir desde fototeca
              </button>
            </div>
          </>,
          document.body
        )}

      <input
        type="file"
        ref={inputCamaraRef}
        accept={accept}
        capture={capturaCamara}
        style={{ display: 'none' }}
        onChange={manejarCambio}
      />
      <input
        type="file"
        ref={inputGaleriaRef}
        accept={accept}
        style={{ display: 'none' }}
        onChange={manejarCambio}
      />
    </div>
  );
}
