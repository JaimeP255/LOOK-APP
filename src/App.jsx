import React, { useState, useEffect } from 'react';
import './App.css';
import { db } from './firebase'; // 👈 Importamos solo db
import { collection, onSnapshot, addDoc, doc, deleteDoc } from 'firebase/firestore';

const TODAS_CATEGORIAS = [
  'Gorras', 'Sudaderas', 'Tops', 'Camisetas', 
  'Chaquetas', 'Polos', 'Camisas', 'Vestidos', 'Faldas',
  'Pantalones largos', 'Pantalones cortos', 'Zapatillas'
];

const MARCAS_SUGERIDAS = [
  'Polo Ralph Lauren', 'Zara', 'Nike', 'Adidas', 'Lacoste', 
  'Tommy Hilfiger', 'Levi\'s', 'Calvin Klein', 'Gucci', 'Prada', 
  'Massimo Dutti', 'Mango', 'H&M', 'Pull&Bear', 'Bershka'
];

const COLORES_CON_TONALIDADES = [
  { padre: 'Negro/Gris', colorBase: '#4a4a4a', tonos: ['#000000', '#4a4a4a', '#7b7b7b', '#b5b5b5', '#e1e1e1'] },
  { padre: 'Azul', colorBase: '#228be6', tonos: ['#228be6', '#5c7cfa', '#748ffc', '#91a7ff', '#bac8ff', '#edf2ff'] },
  { padre: 'Naranja', colorBase: '#fd7e14', tonos: ['#fd7e14', '#f97316', '#ffedd5', '#fed7aa', '#fdba74'] },
  { padre: 'Marrón', colorBase: '#78350f', tonos: ['#a65d00', '#78350f', '#451a03', '#b45309', '#d97706'] },
  { padre: 'Verde', colorBase: '#10b981', tonos: ['#00ff00', '#065f46', '#047857', '#10b981', '#34d399', '#a7f3d0'] },
  { padre: 'Morado', colorBase: '#a855f7', tonos: ['#be4bdb', '#4c0519', '#6b21a8', '#a855f7', '#c084fc', '#f3e8ff'] },
  { padre: 'Rosa', colorBase: '#ec4899', tonos: ['#ff007f', '#580031', '#9d174d', '#ec4899', '#f472b6', '#fce7f3'] },
  { padre: 'Rojo', colorBase: '#ef4444', tonos: ['#fa5252', '#7f1d1d', '#b91c1c', '#ef4444', '#f87171', '#fee2e2'] },
  { padre: 'Amarillo', colorBase: '#eab308', tonos: ['#ffff00', '#854d0e', '#ca8a04', '#eab308', '#fde047', '#fef9c3'] }
];

const IMAGENES_POR_DEFECTO = {
  'Gorras': 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400',
  'Sudaderas': 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=400',
  'Tops': 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400',
  'Camisetas': 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=400',
  'Chaquetas': 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400',
  'Polos': 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=400',
  'Camisas': 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400',
  'Vestidos': 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400',
  'Faldas': 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=400',
  'Pantalones largos': 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400',
  'Pantalones cortos': 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=400',
  'Zapatillas': 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400'
};

export default function App() {
  const [prendas, setPrendas] = useState([]);
  const [categoriasActivas, setCategoriasActivas] = useState(() => {
    const guardadas = localStorage.getItem('planells_armario_categorias');
    return guardadas ? JSON.parse(guardadas) : ['Gorras', 'Sudaderas', 'Tops', 'Camisetas', 'Pantalones largos', 'Pantalones cortos'];
  });

  const [filtro, setFiltro] = useState('Todos');
  const [filtroColorPadre, setFiltroColorPadre] = useState('Todos');
  const [filtroMarca, setFiltroMarca] = useState('Todos');

  const [modoSeleccion, setModoSeleccion] = useState(false);
  const [prendasSeleccionadas, setPrendasSeleccionadas] = useState([]);

  const [menuAbierto, setMenuAbierto] = useState(false);
  const [catalogoAbierto, setCatalogoAbierto] = useState(false); 
  const [pantallaActual, setPantallaActual] = useState('inicio'); 

  const [modalEditarAbierto, setModalEditarAbierto] = useState(false);
  const [modalNuevaPrendaAbierto, setModalNuevaPrendaAbierto] = useState(false);
  
  const [prendaAEditar, setPrendaAEditar] = useState(null);

  const [formNombre, setFormNombre] = useState('');
  const [formCategoria, setFormCategoria] = useState('Camisetas');
  const [formColor, setFormColor] = useState('#000000');
  const [formColorPadre, setFormColorPadre] = useState('Negro/Gris');
  const [formImagen, setFormImagen] = useState(''); // Aquí se guardará el string Base64
  const [formMarca, setFormMarca] = useState('');
  const [sugerenciasFiltradas, setSugerenciasFiltradas] = useState([]);

  // Escucha remota en tiempo real
  useEffect(() => {
    const coleccionRef = collection(db, 'prendas');
    const desvincularEscucha = onSnapshot(coleccionRef, (snapshot) => {
      const prendasDeLaNube = snapshot.docs.map(docSnapshot => ({
        id: docSnapshot.id,
        ...docSnapshot.data()
      }));
      prendasDeLaNube.sort((a, b) => (b.creadoEn || 0) - (a.creadoEn || 0));
      setPrendas(prendasDeLaNube);
    });
    return () => desvincularEscucha();
  }, []);

  useEffect(() => {
    localStorage.setItem('planells_armario_categorias', JSON.stringify(categoriasActivas));
  }, [categoriasActivas]);

  const obtenerCategoriasActivasOrdenadas = () => {
    return TODAS_CATEGORIAS.filter(cat => categoriasActivas.includes(cat));
  };

  const obtenerMarcasDelArmario = () => {
    const listaMarcas = prendas.map(p => p.marca);
    return ['Todos', ...new Set(listaMarcas)];
  };

  const prendasFiltradas = prendas.filter(p => {
    const cumpleCategoria = filtro === 'Todos' || p.categoria.toLowerCase() === filtro.toLowerCase();
    const cumpleColor = filtroColorPadre === 'Todos' || p.colorPadre === filtroColorPadre;
    const cumpleMarca = filtroMarca === 'Todos' || p.marca.toLowerCase() === filtroMarca.toLowerCase();
    return cumpleCategoria && cumpleColor && cumpleMarca;
  });

  const navegarA = (pantalla, categoryFilter = 'Todos') => {
    setPantallaActual(pantalla);
    setFiltro(categoryFilter);
    setFiltroColorPadre('Todos');
    setFiltroMarca('Todos');
    cancelarSeleccion();
    setMenuAbierto(false);
    setCatalogoAbierto(false);
  };

  const toggleCategoriaFiltro = (cat) => {
    setCategoriasActivas(prev => {
      const existe = prev.includes(cat);
      const nuevaLista = existe ? prev.filter(c => c !== cat) : [...prev, cat];
      return nuevaLista.sort((a, b) => TODAS_CATEGORIAS.indexOf(a) - TODAS_CATEGORIAS.indexOf(b));
    });
  };

  const abrirModalCrear = () => {
    setPrendaAEditar(null);
    setFormNombre('');
    setFormCategoria('Camisetas');
    setFormMarca('');
    setFormColor('#000000');
    setFormColorPadre('Negro/Gris');
    setFormImagen('');
    setSugerenciasFiltradas([]);
    setModalNuevaPrendaAbierto(true);
  };

  const manejarClicPrenda = (prenda) => {
    if (modoSeleccion) {
      toggleSeleccionarPrenda(prenda.id);
    } else {
      setPrendaAEditar(prenda);
      setFormNombre(prenda.nombre);
      setFormCategoria(prenda.categoria);
      setFormMarca(prenda.marca || '');
      setFormColor(prenda.color);
      setFormColorPadre(prenda.colorPadre);
      setFormImagen(prenda.imagen);
      setSugerenciasFiltradas([]);
      setModalNuevaPrendaAbierto(true);
    }
  };

  const toggleSeleccionarPrenda = (id) => {
    setPrendasSeleccionadas(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const cancelarSeleccion = () => {
    setModoSeleccion(false);
    setPrendasSeleccionadas([]);
  };

  const eliminarPrendasSeleccionadas = async () => {
    if (prendasSeleccionadas.length === 0) return;
    const confirmar = window.confirm(`¿Seguro que quieres eliminar las ${prendasSeleccionadas.length} prendas seleccionadas de la nube?`);
    if (confirmar) {
      try {
        await Promise.all(prendasSeleccionadas.map(id => deleteDoc(doc(db, 'prendas', id))));
        cancelarSeleccion();
        setFiltroMarca('Todos');
      } catch (error) {
        console.error("Error al borrar de Firebase:", error);
      }
    }
  };

  const manejarCambioMarca = (texto) => {
    setFormMarca(texto);
    if (texto.trim() === '') {
      setSugerenciasFiltradas([]);
    } else {
      const filtradas = MARCAS_SUGERIDAS.filter(marca =>
        marca.toLowerCase().includes(texto.toLowerCase())
      );
      setSugerenciasFiltradas(filtradas);
    }
  };

  // 👈 SOLUCIÓN DE RESCATE: Lector de archivos nativo que convierte la foto a texto Base64 inmortal y 100% GRATIS
  const manejarCambioImagen = (e) => {
    const archivo = e.target.files[0];
    if (archivo) {
      const lector = new FileReader();
      lector.onloadend = () => {
        setFormImagen(lector.result); // El archivo físico muta a texto
      };
      lector.readAsDataURL(archivo);
    }
  };

  const processFormularioPrenda = async (e) => {
    e.preventDefault();
    if (!formNombre.trim()) return;

    const imagenFinal = formImagen || IMAGENES_POR_DEFECTO[formCategoria] || 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=300';
    const marcaFinal = formMarca.trim() ? formMarca.trim() : 'Sin Marca';

    const datosPrenda = {
      nombre: formNombre,
      categoria: formCategoria,
      marca: marcaFinal,
      color: formColor,
      colorPadre: formColorPadre,
      imagen: imagenFinal, // Guardamos el texto base64 en la base de datos de texto libre
      creadoEn: Date.now()
    };

    try {
      if (prendaAEditar) {
        await addDoc(collection(db, 'prendas'), datosPrenda);
      } else {
        await addDoc(collection(db, 'prendas'), datosPrenda);
        if (!categoriasActivas.includes(formCategoria)) {
          setCategoriasActivas(prev => [...prev, formCategoria].sort((a, b) => TODAS_CATEGORIAS.indexOf(a) - TODAS_CATEGORIAS.indexOf(b)));
        }
      }
    } catch (error) {
      console.error("Error al subir a Firebase Firestore:", error);
    }

    setModalNuevaPrendaAbierto(false);
    setPrendaAEditar(null);
    setFiltro(formCategoria); 
    setPantallaActual('armario');
  };

  return (
    <div className="app-container">
      
      {/* Barra Superior */}
      <div className="navbar-superior">
        <button className="menu-hamburguesa" onClick={() => setMenuAbierto(true)}>
          ☰
        </button>
        
        <div className="navbar-centro-categoria-titulo">
          {pantallaActual === 'armario' ? filtro.toUpperCase() : 'PLANELLS'}
        </div>

        <div className="user-avatar">
          <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100" alt="Perfil" />
        </div>
      </div>

      {/* Menú Lateral */}
      <div className={`menu-lateral ${menuAbierto ? 'abierto' : ''}`}>
        <div className="menu-header">
          <button className="boton-menu-icon" onClick={() => setMenuAbierto(false)}>✕</button>
          <span className="menu-titulo">Menú</span>
        </div>
        
        <nav className="menu-nav">
          <button onClick={() => navegarA('inicio')} className={`menu-link ${pantallaActual === 'inicio' ? 'activo' : ''}`}>
            INICIO
          </button>
          
          <div className="submenu-contenedor">
            <button onClick={() => setCatalogoAbierto(!catalogoAbierto)} className="menu-link">
              CATÁLOGO {catalogoAbierto ? '▴' : '▾'}
            </button>
            
            {catalogoAbierto && (
              <div className="submenu-items">
                {obtenerCategoriasActivasOrdenadas().map(cat => (
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

      {menuAbierto && <div className="menu-overlay" onClick={() => setMenuAbierto(false)}></div>}

      {/* MODAL 1: EDITAR CATÁLOGO */}
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

      {/* MODAL 2: CREAR O EDITAR PRENDA */}
      {modalNuevaPrendaAbierto && (
        <div className="modal-overlay">
          <div className="modal-content modal-content-wide">
            <h2>{prendaAEditar ? 'Editar Prenda' : 'Nueva Prenda'}</h2>
            <p className="modal-subtitle">Introduce los datos para clasificar tu prenda.</p>
            
            <form onSubmit={processFormularioPrenda} className="formulario-prenda">
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
                    {sugerenciasFiltradas.map(marca => (
                      <div 
                        key={marca} 
                        className="item-sugerencia-marca"
                        onClick={() => {
                          setFormMarca(marca);
                          setSugerenciasFiltradas([]);
                        }}
                      >
                        {marca}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <label className="label-formulario">Categoría</label>
              <select 
                value={formCategoria} 
                onChange={(e) => setFormCategoria(e.target.value)}
                className="select-prenda-dropdown"
              >
                {TODAS_CATEGORIAS.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <label className="label-formulario">Imagen de la prenda</label>
              <div className="contenedor-carga-foto">
                <input 
                  type="file" 
                  accept="image/*" 
                  id="foto-prenda-input"
                  onChange={manejarCambioImagen}
                  className="input-archivo-oculto"
                />
                <label htmlFor="foto-prenda-input" className="btn-disparar-archivo">
                  {formImagen ? '✓ Foto seleccionada (Cambiar)' : '📷 Seleccionar Imagen / Hacer Foto'}
                </label>
                {formImagen && (
                  <div className="vista-previa-miniatura">
                    <img src={formImagen} alt="Previa" />
                  </div>
                )}
              </div>

              <label className="label-formulario">Tono Exacto</label>
              <div className="tablero-tonalidades-contenedor">
                {COLORES_CON_TONALIDADES.map(columna => (
                  <div key={columna.padre} className="columna-tonalidades">
                    {columna.tonos.map(tono => (
                      <button
                        type="button"
                        key={tono}
                        className={`cuadro-tono-prenda ${formColor === tono ? 'seleccionado' : ''}`}
                        style={{ backgroundColor: tono }}
                        onClick={() => {
                          setFormColor(tono);
                          setFormColorPadre(columna.padre);
                        }}
                      />
                    ))}
                  </div>
                ))}
              </div>

              <div className="botones-grupo-modal">
                <button type="submit" className="btn-guardar-modal-formulario">
                  Guardar Prenda
                </button>
                <button type="button" className="btn-cerrar-modal-formulario" onClick={() => setModalNuevaPrendaAbierto(false)}>
                  Cancelar
                </button>
              </div>
            </form>
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
        <div className="pantalla-armario animate-fade-in">
          <header className="armario-header">
            
            {/* PESTAÑAS EDITORIALES DE MARCAS */}
            <div className="contenedor-tabs-marcas-editorial">
              {obtenerMarcasDelArmario().map(marcaName => {
                const activa = filtroMarca.toLowerCase() === marcaName.toLowerCase();
                return (
                  <button
                    key={marcaName}
                    className={`tab-marca-editorial-item ${activa ? 'tab-activa' : ''}`}
                    onClick={() => setFiltroMarca(marcaName)}
                  >
                    {marcaName.toUpperCase()}
                  </button>
                );
              })}
            </div>

            {/* PANEL DE COLORES HORIZONTALES COMPACTOS */}
            <div className="contenedor-filtro-colores-luxury">
              <button
                className={`item-color-rectangular ${filtroColorPadre === 'Todos' ? 'activo-todos' : ''}`}
                onClick={() => setFiltroColorPadre('Todos')}
              >
                <span>ALL COLORS</span>
              </button>

              {COLORES_CON_TONALIDADES.map(colorObj => {
                const esActivo = filtroColorPadre === colorObj.padre;
                return (
                  <button
                    key={colorObj.padre}
                    className={`item-color-rectangular ${esActivo ? 'activo-solido' : ''}`}
                    style={{
                      '--color-luxury-tint': colorObj.colorBase,
                      backgroundColor: esActivo ? colorObj.colorBase : 'transparent'
                    }}
                    onClick={() => setFiltroColorPadre(colorObj.padre)}
                  >
                    <span>{colorObj.padre.toUpperCase()}</span>
                  </button>
                );
              })}
            </div>
          </header>

          <div className="contenedor-sub-accion-seleccion-zona">
            <button 
              className={`btn-activar-seleccion-link ${modoSeleccion ? 'en-seleccion' : ''}`}
              onClick={() => modoSeleccion ? cancelarSeleccion() : setModoSeleccion(true)}
            >
              {modoSeleccion ? 'CANCELAR' : 'SELECCIONAR'}
            </button>
          </div>

          <div className="armario-grid grid-ajuste-padding-bottom">
            {prendasFiltradas.length === 0 ? (
              <p className="no-prendas">No hay prendas que coincidan con los filtros.</p>
            ) : (
              prendasFiltradas.map(prenda => {
                const estaMarcada = prendasSeleccionadas.includes(prenda.id);
                return (
                  <div 
                    key={prenda.id} 
                    className={`prenda-card ${modoSeleccion ? 'modo-seleccion-activo' : ''} ${estaMarcada ? 'card-marcada-premium' : ''}`} 
                    onClick={() => manejarClicPrenda(prenda)}
                  >
                    <div className="img-wrapper">
                      <img src={prenda.imagen} alt={prenda.nombre} />
                      <div className="badge-color-prenda" style={{ backgroundColor: prenda.color }}></div>
                      
                      {modoSeleccion && (
                        <div className={`checkbox-burbuja-flotante ${estaMarcada ? 'burbuja-check-activa' : ''}`}>
                          {estaMarcada ? '✓' : ''}
                        </div>
                      )}
                    </div>
                    <h3>{prenda.nombre.toUpperCase()}</h3>
                    <span>{prenda.marca.toUpperCase()}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* BOTÓN INFERIOR FIJO DINÁMICO */}
      {pantallaActual === 'armario' && (
        <div className="contenedor-fijo-boton-inferior">
          {modoSeleccion ? (
            <button 
              className={`btn-anadir-prenda-bottom-fixed btn-eliminar-seleccion-multiple-fixed ${prendasSeleccionadas.length > 0 ? 'con-items-para-borrar' : ''}`}
              onClick={eliminarPrendasSeleccionadas}
              disabled={prendasSeleccionadas.length === 0}
            >
              ✕ ELIMINAR SELECCIONADAS ({prendasSeleccionadas.length})
            </button>
          ) : (
            <button className="btn-anadir-prenda-bottom-fixed" onClick={abrirModalCrear}>
              ＋ AÑADIR PRENDA
            </button>
          )}
        </div>
      )}

    </div>
  );
}