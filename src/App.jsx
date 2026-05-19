import React, { useState } from 'react';
import './App.css';

// Lista completa de categorías posibles para el catálogo
const TODAS_CATEGORIAS = [
  'Gorras', 'Chaquetas', 'Polos', 'Camisetas', 
  'Camisas', 'Vestidos', 'Pantalones', 'Faldas', 
  'Shorts', 'Zapatillas', 'Zapatos', 'Bolsos'
];

const prendasDePrueba = [
  { id: 1, nombre: 'Camiseta Negra', categoria: 'Camisetas', imagen: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=300' },
  { id: 2, nombre: 'Vaquero Azul', categoria: 'Pantalones', imagen: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=300' },
  { id: 3, nombre: 'Zapatillas Blancas', categoria: 'Zapatillas', imagen: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=300' },
];

export default function App() {
  const [prendas, setPrendas] = useState(prendasDePrueba);
  const [filtro, setFiltro] = useState('Todos');
  
  // Estados de navegación y menús
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [catalogoAbierto, setCatalogoAbierto] = useState(true); 
  const [pantallaActual, setPantallaActual] = useState('inicio'); 

  // NUEVO ESTADO: Modales y Categorías activas en el catálogo
  const [modalEditarAbierto, setModalEditarAbierto] = useState(false);
  const [categoriasActivas, setCategoriasActivas] = useState(['Gorras', 'Camisetas', 'Pantalones', 'Zapatillas', 'Accesorios']);

  // Filtrar la ropa según la categoría seleccionada
  const prendasFiltradas = filtro === 'Todos' 
    ? prendas 
    : prendas.filter(p => p.categoria.toLowerCase() === filtro.toLowerCase());

  const navegarA = (pantalla, categoriaFiltro = 'Todos') => {
    setPantallaActual(pantalla);
    setFiltro(categoriaFiltro);
    setMenuAbierto(false);
  };

  // Función para activar/desactivar categorías del catálogo
  const toggleCategoriaFiltro = (cat) => {
    setCategoriasActivas(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  return (
    <div className="app-container">
      
      {/* Barra Superior Estilo Editorial */}
      <div className="navbar-superior">
        <button className="menu-hamburguesa" onClick={() => setMenuAbierto(true)}>
          ☰
        </button>
        <div className="user-avatar">
          <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100" alt="Perfil" />
        </div>
      </div>

      {/* Menú Lateral Premium (Crema/Marfil) */}
      <div className={`menu-lateral ${menuAbierto ? 'abierto' : ''}`}>
        <div className="menu-header">
          <button className="boton-menu-icon" onClick={() => setMenuAbierto(false)}>✕</button>
          <span className="menu-titulo">Menú</span>
        </div>
        
        <nav className="menu-nav">
          <button onClick={() => navegarA('inicio')} className={`menu-link ${pantallaActual === 'inicio' ? 'activo' : ''}`}>
            INICIO
          </button>
          
          {/* Item con submenú desplegable */}
          <div className="submenu-contenedor">
            <button 
              onClick={() => setCatalogoAbierto(!catalogoAbierto)} 
              className="menu-link"
            >
              CATÁLOGO {catalogoAbierto ? '▴' : '▾'}
            </button>
            
            {catalogoAbierto && (
              <div className="submenu-items">
                {/* Renderiza dinámicamente solo las categorías que el usuario dejó activas */}
                {categoriasActivas.map(cat => (
                  <button 
                    key={cat}
                    onClick={() => navegarA('armario', cat)}
                    className={`submenu-link ${filtro === cat && pantallaActual === 'armario' ? 'sub-active' : ''}`}
                  >
                    • {cat.toUpperCase()}
                  </button>
                ))}
                <button onClick={() => navegarA('armario', 'Todos')} className="submenu-link">• VER TODO</button>
              </div>
            )}
          </div>
          
          <button onClick={() => { setModalEditarAbierto(true); setMenuAbierto(false); }} className="menu-link">
            EDITAR CATÁLOGO
          </button>
        </nav>
      </div>

      {/* Capa oscura transparente para el menú lateral */}
      {menuAbierto && <div className="menu-overlay" onClick={() => setMenuAbierto(false)}></div>}

      {/* MODAL: EDITAR CATÁLOGO (Aparece en medio con desenfoque) */}
      {modalEditarAbierto && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Editar catálogo</h2>
            <p className="modal-subtitle">Selecciona las prendas que quieres que se muestren en tu menú.</p>
            
            <div className="grid-categorias">
              {TODAS_CATEGORIAS.map(cat => {
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

            <button className="btn-guardar-modal" onClick={() => setModalEditarAbierto(false)}>
              Guardar cambios
            </button>
          </div>
        </div>
      )}

      {/* PANTALLAS */}
      {pantallaActual === 'inicio' && (
        <div className="pantalla-inicio-imagen">
          <div className="vibe-overlay">
            <div className="vibe-text">
              <h2>Tu Armario</h2>
              <p>Minimalista. Organizado. Personal.</p>
              <button className="btn-explorar-inicio" onClick={() => navegarA('armario', 'Todos')}>
                Explorar catálogo
              </button>
            </div>
          </div>
        </div>
      )}

      {pantallaActual === 'armario' && (
        <div className="pantalla-armario">
          <header className="armario-header">
            <h2>Catálogo / {filtro.toUpperCase()}</h2>
          </header>

          <div className="armario-grid">
            {prendasFiltradas.length === 0 ? (
              <p className="no-prendas">No hay prendas guardadas aquí.</p>
            ) : (
              prendasFiltradas.map(prenda => (
                <div key={prenda.id} className="prenda-card">
                  <div className="img-wrapper">
                    <img src={prenda.imagen} alt={prenda.nombre} />
                  </div>
                  <h3>{prenda.nombre.toUpperCase()}</h3>
                  <span>{prenda.categoria.toUpperCase()}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

    </div>
  );
}