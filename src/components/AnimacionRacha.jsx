import React from 'react';

/**
 * AnimacionRacha
 * --------------
 * El overlay de fuego que aparece al marcar el outfit de hoy en el
 * calendario y mantener/subir la racha.
 */
export function AnimacionRacha({ dias }) {
  if (!dias) return null;

  return (
    <div className="animacion-racha-overlay">
      <div className="racha-fuego-container">
        <div className="fuego-emoji fuego-1">🔥</div>
        <div className="fuego-emoji fuego-2">🔥</div>
        <div className="fuego-emoji fuego-3">🔥</div>
      </div>
      <h1 className="texto-racha">¡Día {dias}, a tope!</h1>
      <p className="subtexto-racha">Racha salvada</p>
    </div>
  );
}
