import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Registramos el service worker: es lo que hace falta para que Chrome
// en Android considere la web "instalable de verdad" y la abra en modo
// standalone (sin barra de navegador) al añadirla a la pantalla de
// inicio, en vez de tratarla como un simple acceso directo.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('Error al registrar el service worker:', error);
    });
  });
}
