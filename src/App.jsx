import React, { useState, useEffect } from 'react';
import './App.css';
// 👇 IMPORTACIÓN LIMPIA: Traemos todo directamente de tu firebase.js
import { db, auth, provider } from './firebase'; 
import { collection, onSnapshot, addDoc, doc, deleteDoc, query, where } from 'firebase/firestore';
import { signOut, onAuthStateChanged, signInWithPopup } from 'firebase/auth';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip,
  RadialBarChart, RadialBar
} from 'recharts';

// Funciones dinámicas: Calculan las estadísticas partiendo de CERO
// 🎨 CORRECCIÓN PARA DETECTAR CÓDIGOS HEXADECIMALES
// 🎨 SINCRONIZACIÓN EXACTA CON TU MAPA DE TONALIDADES
export const obtenerDatosColores = (prendasArr) => {
  // Inicializamos el conteo con los nombres de tus colores padres
  const conteo = {
    'Negro/Gris': 0,
    'Azul': 0,
    'Naranja': 0,
    'Marrón': 0,
    'Verde': 0,
    'Morado': 0,
    'Rosa': 0,
    'Rojo': 0,
    'Amarillo': 0,
  };
  
  (prendasArr || []).forEach(p => {
    // Extraemos el código hexadecimal (limpiando espacios y pasándolo a minúsculas)
    const hexPrenda = (p.color || p.colorPrenda || p.value || '').trim().toLowerCase();
    
    // Buscamos a qué grupo "padre" pertenece este tono hexadecimal
    const grupoEncontrado = COLORES_CON_TONALIDADES.find(grupo => 
      grupo.tonos.some(tono => tono.toLowerCase() === hexPrenda)
    );

    if (grupoEncontrado) {
      // Si el código está en la lista de tonos, sumamos a su padre (ej: 'Azul')
      conteo[grupoEncontrado.padre]++;
    } 
  });

  // Convertimos el objeto en el formato array de objetos que lee Recharts
  return Object.keys(conteo).map(key => ({ 
    subject: key, 
    A: conteo[key], 
    fullMark: 15 
  }));
};

const obtenerDatosPrendas = (prendas = []) => {
  const categorias = { Camisetas: 0, Pantalones: 0, Chaquetas: 0, Zapatos: 0, Camisas: 0 };
  prendas.forEach(p => { if(categorias[p.categoria] !== undefined) categorias[p.categoria]++; });
  return Object.keys(categorias).map(key => ({ name: key, cantidad: categorias[key] }));
};

export const obtenerDatosMarcas = (prendasArr) => {
  // Inicializamos un contador dinámico
  const conteo = {};

  (prendasArr || []).forEach(p => {
    // Buscamos la marca en 'marca' o 'marcaPrenda'. Si no hay, ponemos 'Sin Marca'
    let marcaClean = (p.marca || p.marcaPrenda || 'Sin Marca').trim();
    
    // Convertimos la primera letra en mayúscula y el resto en minúscula (ej: levis -> Levis)
    marcaClean = marcaClean.charAt(0).toUpperCase() + marcaClean.slice(1).toLowerCase();

    if (marcaClean) {
      conteo[marcaClean] = (conteo[marcaClean] || 0) + 1;
    }
  });

  // Convertimos el objeto en el formato que necesita Recharts para el RadarChart
  const datosMapeados = Object.keys(conteo).map(key => ({
    subject: key,
    A: conteo[key],
    fullMark: 15
  }));

  // Si está vacío, mandamos un esqueleto básico para que no rompa el gráfico
  return datosMapeados.length > 0 ? datosMapeados : [{ subject: 'Ninguna', A: 0, fullMark: 15 }];
};

const obtenerDatosEstaciones = (prendas = []) => {
  const estaciones = { Verano: 0, Invierno: 0, Primavera: 0, Otoño: 0 };
  prendas.forEach(p => { if(estaciones[p.estacion] !== undefined) estaciones[p.estacion]++; });
  // Estilo Apple Watch: cada una con su color premium redondo
  return [
    { name: '☀️ Verano', v: estaciones.Verano, fill: '#e67e22' },
    { name: '❄️ Invierno', v: estaciones.Invierno, fill: '#2980b9' },
    { name: '🌱 Primavera', v: estaciones.Primavera, fill: '#27ae60' },
    { name: '🍂 Otoño', v: estaciones.Otoño, fill: '#d35400' }
  ];
};

const CATEGORIAS_ROPA = [
  'Sudaderas', 'Tops', 'Camisetas', 'Chaquetas', 
  'Polos', 'Camisas', 'Vestidos', 'Faldas', 
  'Pantalones largos', 'Pantalones cortos'
];

const CATEGORIAS_ACCESORIOS = ['Gorras', 'Zapatillas', 'Bolsos'];
const TODAS_CATEGORIAS = [...CATEGORIAS_ROPA, ...CATEGORIAS_ACCESORIOS];

const MARCAS_SUGERIDAS = [
  'Polo Ralph Lauren', 'Zara', 'Nike', 'Adidas', 'Lacoste', 
  'Tommy Hilfiger', 'Levi\'s', 'Calvin Klein', 'Gucci', 'Prada', 
  'Massimo Dutti', 'Mango', 'H&M', 'Pull&Bear', 'Bershka'
];

const COLORES_CON_TONALIDADES = [
  { padre: 'Negro/Gris', colorBase: '#000000', tonos: ['#000000', '#444444', '#888888', '#bbbbbb', '#dddddd', '#ffffff'] },
  { padre: 'Azul', colorBase: '#1e88e5', tonos: ['#1e88e5', '#42a5f5', '#64b5f6', '#90caf9', '#bbdefb', '#e3f2fd'] },
  { padre: 'Naranja', colorBase: '#fb8c00', tonos: ['#b35300ff', '#e06d00ff', '#fb8c00', '#fbad38ff', '#f6c77cff', '#fee9a4ff'] },
  { padre: 'Marrón', colorBase: '#9d5f01ff', tonos: ['#4a2c00ff', '#704301ff', '#9d5f01ff', '#c57704ff', '#dfa149ff', '#f5dcb3ff'] },
  { padre: 'Verde', colorBase: '#00ff0dff', tonos: ['#014f05ff', '#018208ff', '#00ff0dff', '#4cfc52ff', '#86ff8aff', '#abfbb1ff'] },
  { padre: 'Morado', colorBase: '#c800ffff', tonos: ['#51025fff', '#68037aff', '#ba02dbff', '#c800ffff', '#e973fcff', '#f7a1faff'] },
  { padre: 'Rosa', colorBase: '#ff00e1ff', tonos: ['#62064eff', '#990a7fff', '#e312bcff', '#ff00e1ff', '#f05acbff', '#fdb7eeff'] },
  { padre: 'Rojo', colorBase: '#f02222ff', tonos: ['#800505ff', '#af2b2bff', '#f02222ff', '#fb3f3fff', '#fe6f6fff', '#faa2a2ff'] },
  { padre: 'Amarillo', colorBase: '#fbff00ff', tonos: ['#ab9d0cff', '#cbc805ff', '#fbff00ff', '#feed35ff', '#f8f27eff', '#fcfe94ff'] }
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
  'Zapatillas': 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400',
  'Bolsos': 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400'
};

const FONDOS_DISPONIBLES = [
  { id: 'minimal', url: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=800', nombre: 'Studio' },
  { id: 'closet1', url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800', nombre: 'Boutique' },
  { id: 'closet2', url: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800', nombre: 'Nórdico' },
  { id: 'wood', url: 'https://images.unsplash.com/photo-1532372320978-9b4d1a358f4c?w=800', nombre: 'Madera' },
  { id: 'dark', url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800', nombre: 'Elegante' }
];

export default function App() {
  const [prendas, setPrendas] = useState([]);
  const [categoriasActivas, setCategoriasActivas] = useState(() => {
    const guardadas = localStorage.getItem('planells_armario_categorias');
    return guardadas ? JSON.parse(guardadas) : ['Sudaderas', 'Tops', 'Camisetas', 'Pantalones largos', 'Pantalones cortos', 'Gorras', 'Zapatillas'];
  });

  const [filtro, setFiltro] = useState('Todos');
  const [filtroColorPadre, setFiltroColorPadre] = useState('Todos');
  const [filtroMarca, setFiltroMarca] = useState('Todos');

  const [modoSeleccion, setModoSeleccion] = useState(false);
  const [prendasSeleccionadas, setPrendasSeleccionadas] = useState([]);

  const [menuAbierto, setMenuAbierto] = useState(false);
  const [catalogoAbierto, setCatalogoAbierto] = useState(false); 

  const [perfilTab, setPerfilTab] = useState('perfil'); // 'perfil', 'social' o 'fondo'

  const [pantallaActual, setPantallaActual] = useState('inicio'); 

  const [seccionRopaExpandida, setSeccionRopaExpandida] = useState(true); 
  const [seccionAccesoriosExpandida, setSeccionAccesoriosExpandida] = useState(false);

  const [modalPerfilCompletoAbierto, setModalPerfilCompletoAbierto] = useState(false);
  const [graficoExpandido, setGraficoExpandido] = useState(null);

  const [menuPerfilAbierto, setMenuPerfilAbierto] = useState(false);
  const [usuario, setUsuario] = useState(null);

  const [carruselFondosAbierto, setCarruselFondosAbierto] = useState(false);
  const [fondoPantalla, setFondoPantalla] = useState(() => {
    return localStorage.getItem('planells_armario_fondo') || FONDOS_DISPONIBLES[0].url;
  });

  const [modalEditarAbierto, setModalEditarAbierto] = useState(false);
  const [modalNuevaPrendaAbierto, setModalNuevaPrendaAbierto] = useState(false);
  
  const [prendaAEditar, setPrendaAEditar] = useState(null);

  const [formNombre, setFormNombre] = useState('');
  const [formCategoria, setFormCategoria] = useState('Camisetas');
  const [formColor, setFormColor] = useState('#000000');
  const [formColorPadre, setFormColorPadre] = useState('Negro/Gris');
  const [formImagen, setFormImagen] = useState(''); 
  const [formMarca, setFormMarca] = useState('');
  const [sugerenciasFiltradas, setSugerenciasFiltradas] = useState([]);

  useEffect(() => {
    const marcasDisponibles = obtenerMarcasDelArmario().map(m => m.toLowerCase());
    
    // Si hay una marca seleccionada que ya no está disponible en esta categoría, volvemos a 'Todos'
    if (filtroMarca && filtroMarca !== 'Todos' && !marcasDisponibles.includes(filtroMarca.toLowerCase())) {
      setFiltroMarca('Todos');
    }
  }, [filtro, prendas]); // 👈 ¡Cambiado formCategoria por filtro!
  
  useEffect(() => {
    const desvincularAuth = onAuthStateChanged(auth, (userConnected) => {
      setUsuario(userConnected);
    });
    return () => desvincularAuth();
  }, []);

  useEffect(() => {
    if (!usuario) {
      setPrendas([]); 
      return;
    }

    const coleccionRef = collection(db, 'prendas');
    const consultaFiltrada = query(coleccionRef, where('userId', '==', usuario.uid));

    const desvincularEscucha = onSnapshot(consultaFiltrada, (snapshot) => {
      const prendasDeLaNube = snapshot.docs.map(docSnapshot => ({
        id: docSnapshot.id,
        ...docSnapshot.data()
      }));
      prendasDeLaNube.sort((a, b) => (b.creadoEn || 0) - (a.creadoEn || 0));
      setPrendas(prendasDeLaNube);
    });
    return () => desvincularEscucha();
  }, [usuario]);

  useEffect(() => {
    localStorage.setItem('planells_armario_categorias', JSON.stringify(categoriasActivas));
  }, [categoriasActivas]);

  const loginConGoogle = async () => {
    try {
      const { setPersistence, browserLocalPersistence } = await import('firebase/auth');
      
      // Forzamos al navegador a recordar tu cuenta localmente en el PC
      await setPersistence(auth, browserLocalPersistence);
      
      // Abrimos el popup nativo que sí funciona en ordenador
      const resultado = await signInWithPopup(auth, provider);
      if (resultado?.user) {
        setUsuario(resultado.user);
      }
    } catch (error) {
      console.error("Error en el inicio de sesión del PC:", error);
      alert("Error al conectar con Google. Revisa la consola de Firebase.");
    }
  };

  const cerrarSesionActiva = async () => {
    try {
      await signOut(auth);
      setPantallaActual('inicio');
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  const cambiarFondo = (url) => {
    setFondoPantalla(url);
    localStorage.setItem('planells_armario_fondo', url);
  };

  const obtenerMarcasDelArmario = () => {
    if (!prendas || prendas.length === 0) return ['Todos'];

    const prendasFiltradas = prendas.filter(p => {
      // 👈 Usamos 'filtro' en toda esta comprobación
      if (!filtro || filtro.toLowerCase() === 'todas' || filtro.toLowerCase() === 'todos') {
        return true;
      }
      
      const valorCategoria = p.categoria || p.categoriaPrenda || p.tipo || p.seccion || '';
      
      const catPrenda = valorCategoria.toLowerCase().trim();
      const catFiltro = filtro.toLowerCase().trim(); // 👈 Usamos 'filtro' aquí también
      
      const catPrendaSinS = catPrenda.endsWith('s') ? catPrenda.slice(0, -1) : catPrenda;
      const catFiltroSinS = catFiltro.endsWith('s') ? catFiltro.slice(0, -1) : catFiltro;

      return catPrenda === catFiltro || catPrendaSinS === catFiltroSinS;
    });

    const listaMarcas = prendasFiltradas
      .map(p => p.marca || p.marcaPrenda)
      .filter(Boolean);
    
    return ['Todos', ...new Set(listaMarcas)];
  };

  const prendasFiltradas = prendas.filter(p => {
    let cumpleCategoria = false;
    if (filtro === 'Todos') {
      cumpleCategoria = true;
    } else {
      cumpleCategoria = p.categoria.toLowerCase() === filtro.toLowerCase();
    }
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
    setCarruselFondosAbierto(false);
  };

  const toggleCategoriaFiltro = (cat) => {
    setCategoriasActivas(prev => {
      const existe = prev.includes(cat);
      const nuevaLista = existe ? prev.filter(c => c !== cat) : [...prev, cat];
      return nuevaLista.sort((a, b) => TODAS_CATEGORIAS.indexOf(a) - TODAS_CATEGORIAS.indexOf(b));
    });
  };

  const abrirModalCrear = () => {
    if (!usuario) {
      alert("Debes iniciar sesión para añadir prendas a tu armario.");
      loginConGoogle();
      return;
    }
    setPrendaAEditar(null);
    setFormNombre('');
    setFormMarca('');
    setFormColor('#000000');
    setFormColorPadre('Negro/Gris');
    setFormImagen('');
    setSugerenciasFiltradas([]);
    if (TODAS_CATEGORIAS.includes(filtro)) {
      setFormCategoria(filtro);
    } else {
      setFormCategoria('Camisetas');
    }
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
    const confirmar = window.confirm(`¿Seguro que quieres eliminar las ${prendasSeleccionadas.length} prendas seleccionadas?`);
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

  const manejarCambioImagen = (e) => {
    const archivo = e.target.files[0];
    if (archivo) {
      const lector = new FileReader();
      lector.onloadend = () => {
        setFormImagen(lector.result); 
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
      userId: usuario.uid, 
      nombre: formNombre,
      categoria: formCategoria,
      marca: marcaFinal,
      color: formColor,
      colorPadre: formColorPadre,
      imagen: imagenFinal, 
      creadoEn: Date.now()
    };

    try {
      // 1. Sube la prenda a Firebase de forma limpia
      await addDoc(collection(db, 'prendas'), datosPrenda);
      
      // 2. 🧹 LIMPIEZA AUTOMÁTICA DEL FORMULARIO (Sin usar sets)
      // Si tu función recibe el evento (e), esta línea borra todo el texto de los inputs al instante
      if (typeof e !== 'undefined' && e.target) {
        e.target.reset(); 
      }

      if (!categoriasActivas.includes(formCategoria)) {
        setCategoriasActivas(prev => [...prev, formCategoria].sort((a, b) => TODAS_CATEGORIAS.indexOf(a) - TODAS_CATEGORIAS.indexOf(b)));
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

        <div className="perfil-superior-contenedor" style={{ position: 'relative' }}>
          <div className="user-avatar" onClick={() => setMenuPerfilAbierto(!menuPerfilAbierto)} style={{ cursor: 'pointer' }}>
            {usuario ? (
              <img src={usuario.photoURL} alt="Perfil" />
            ) : (
              <div className="icon-personita-svg">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
            )}
          </div>

          {/* 🟢 CASO A: SESIÓN INICIADA -> DROPDOWN TRADICIONAL VERTICAL */}
          {menuPerfilAbierto && usuario && (
            <>
              <div className="dropdown-perfil-ventana animation-slide-down">
                <button className="dropdown-perfil-item" onClick={() => { setModalPerfilCompletoAbierto(true); setMenuPerfilAbierto(false); }}>
                  Perfil
                </button>
                <button className="dropdown-perfil-item" onClick={() => { alert('Social'); setMenuPerfilAbierto(false); }}>
                  Social
                </button>
                <button className="dropdown-perfil-item" onClick={() => { setCarruselFondosAbierto(true); setMenuPerfilAbierto(false); }}>
                  Elegir fondo
                </button>
              </div>
              <div className="perfil-overlay-cierre" onClick={() => setMenuPerfilAbierto(false)} />
            </>
          )}

          {/* 🖼️ NUEVO POP-UP: PERFIL COMPLETO (CASI PANTALLA COMPLETA) */}
          {modalPerfilCompletoAbierto && usuario && (
            <>
              {/* Fondo súper oscuro y muy blurreado */}
              <div className="modal-perfil-completo-overlay" onClick={() => setModalPerfilCompletoAbierto(false)} />
              
              {/* Panel central grande */}
              <div className="modal-perfil-completo-contenedor">
                {/* Botón de cerrar aspa X */}
                <button className="btn-cerrar-perfil-modal" onClick={() => setModalPerfilCompletoAbierto(false)}>✕</button>

                {/* 1. Zona Superior: Foto (Ahora el click SOLO funciona al tocar la foto real) */}
                <div className="perfil-completo-avatar-seccion">
                  <div className="avatar-wrapper-edicion" onClick={() => alert('Cambiar foto de perfil próximamente')}>
                    <img src={usuario.photoURL} alt="Tu foto de perfil" />
                    <div className="avatar-overlay-camara">📷</div>
                  </div>
                </div>

                <div className="linea-separadora-fija" />

                {/* 2. Zona Media: Datos (Con selectores vitaminados y todas las estaciones) */}
                <div className="perfil-completo-datos">
                  <div className="input-group-perfil">
                    <label>Nombre de usuario</label>
                    <input type="text" defaultValue={usuario.displayName || 'Usuario'} placeholder="Tu nombre o apodo" />
                  </div>
                  <div className="input-group-perfil">
                    <label>Estilo de Armario</label>
                    <select className="select-perfil-estilo" defaultValue="minimalista">
                      <option value="minimalista">🌿 Minimalista & Cápsula</option>
                      <option value="casual">👟 Casual / Diario</option>
                      <option value="formal">👔 Formal / De Negocios</option>
                      <option value="streetwear">🔥 Streetwear / Urbano</option>
                    </select>
                  </div>
                  <div className="input-group-perfil">
                    <label>Estación favorita</label>
                    <select className="select-perfil-estilo" defaultValue="verano">
                      <option value="primavera">🌱 Primavera</option>
                      <option value="verano">☀️ Verano</option>
                      <option value="otono">🍂 Otoño</option>
                      <option value="invierno">❄️ Invierno</option>
                    </select>
                  </div>
                </div>

                <div className="linea-separadora-fija" />

                {/* 3. Zona Inferior: Cuadro de Mandos Analítico */}
                <div className="perfil-completo-estadisticas">
                  <h4>Mis estadísticas</h4>
                  
                  {/* SI NO HAY NINGÚN GRÁFICO EXPANDIDO: Mostramos la cuadrícula compacta 2x2 */}
                  {!graficoExpandido ? (
                    <div className="contenedor-grid-graficos-cuadrado">
                      
                      {/* Gráfico 1: Colores */}
                      <div className="tarjeta-grafico-item-click" onClick={() => setGraficoExpandido('colores')}>
                        <h5>🎨 Colores</h5>
                        <div className="caja-mockup-grafico-cuadrado">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={obtenerDatosColores(prendas)}>
                              <PolarGrid stroke="#e5e5e5" />
                              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 8, fill: '#777' }} />
                              <Radar dataKey="A" stroke="#111111" fill="#111111" fillOpacity={0.2} />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Gráfico 2: Prendas */}
                      <div className="tarjeta-grafico-item-click" onClick={() => setGraficoExpandido('tipos')}>
                        <h5>👕 Prendas</h5>
                        <div className="caja-mockup-grafico-cuadrado">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={obtenerDatosPrendas(prendas)} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                              <XAxis dataKey="name" tick={{ fontSize: 7, fill: '#777' }} />
                              <YAxis tick={{ fontSize: 7 }} />
                              <Bar dataKey="cantidad" fill="#222222" radius={[3, 3, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Gráfico 3: Marcas */}
                      <div className="tarjeta-grafico-item-click" onClick={() => setGraficoExpandido('marcas')}>
                        <h5>🏷️ Marcas</h5>
                        <div className="caja-mockup-grafico-cuadrado">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={obtenerDatosMarcas(prendas)}>
                              <PolarGrid stroke="#e5e5e5" />
                              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 8, fill: '#777' }} />
                              <Radar dataKey="A" stroke="#555555" fill="#555555" fillOpacity={0.15} />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Gráfico 4: Clima */}
                      <div className="tarjeta-grafico-item-click" onClick={() => setGraficoExpandido('estaciones')}>
                        <h5>☀️ Clima</h5>
                        <div className="caja-mockup-grafico-cuadrado">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadialBarChart cx="50%" cy="50%" innerRadius="25%" outerRadius="90%" barSize={4} data={obtenerDatosEstaciones(prendas)}>
                              <RadialBar minAngle={15} background clockWise dataKey="v" />
                            </RadialBarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                    </div>
                  ) : (
                    /* SI EL USUARIO HA SELECCIONADO UNO: Se expande ocupando este espacio de forma limpia */
                    <div className="grafico-vista-maximizada">
                      <button className="btn-volver-mini" onClick={() => setGraficoExpandido(null)}>← Volver al cuadro</button>
                      
                      <div className="caja-grafico-grande-real">
                        {graficoExpandido === 'colores' && (
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={obtenerDatosColores(prendas)}>
                              <PolarGrid stroke="#ccc" />
                              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: '#111' }} />
                              <Radar name="Prendas" dataKey="A" stroke="#111111" fill="#111111" fillOpacity={0.35} />
                              <Tooltip />
                            </RadarChart>
                          </ResponsiveContainer>
                        )}

                        {graficoExpandido === 'tipos' && (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={obtenerDatosPrendas(prendas)} margin={{ top: 20, right: 10, left: -15, bottom: 5 }}>
                              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#111' }} />
                              <YAxis precision={0} />
                              <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                              <Bar dataKey="cantidad" fill="#111111" radius={[6, 6, 0, 0]} label={{ position: 'top', fontSize: 11 }} />
                            </BarChart>
                          </ResponsiveContainer>
                        )}

                        {graficoExpandido === 'marcas' && (
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={obtenerDatosMarcas(prendas)}>
                              <PolarGrid stroke="#ccc" />
                              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: '#111' }} />
                              <Radar name="Marcas" dataKey="A" stroke="#333333" fill="#333333" fillOpacity={0.3} />
                              <Tooltip />
                            </RadarChart>
                          </ResponsiveContainer>
                        )}

                        {graficoExpandido === 'estaciones' && (
                          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <ResponsiveContainer width="100%" height="80%">
                              <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="90%" barSize={12} data={obtenerDatosEstaciones(prendas)}>
                                <RadialBar minAngle={15} background clockWise dataKey="v" label={{ position: 'insideStart', fill: '#fff', fontSize: 10 }} />
                                <Tooltip />
                              </RadialBarChart>
                            </ResponsiveContainer>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.75rem', marginTop: '5px', textAlign: 'center' }}>
                              <div><span style={{color:'#e67e22'}}>●</span> Verano</div>
                              <div><span style={{color:'#2980b9'}}>●</span> Invierno</div>
                              <div><span style={{color:'#27ae60'}}>●</span> Primavera</div>
                              <div><span style={{color:'#d35400'}}>●</span> Otoño</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Pie del Pop-up: Cerrar Sesión (Rojo Relleno Premium) */}
                <button className="btn-logout-modal-completo-rojo" onClick={() => { cerrarSesionActiva(); setModalPerfilCompletoAbierto(false); }}>
                  Cerrar Sesión
                </button>
              </div>
            </>
          )}

          {/* 🔴 CASO B: SESIÓN NO INICIADA -> POP-UP / MODAL PREMIUM */}
          {menuPerfilAbierto && !usuario && (
            <>
              {/* Capa de fondo oscuro animada */}
              <div 
                className="modal-login-overlay-premium" 
                onClick={() => setMenuPerfilAbierto(false)} 
              />

              {/* Contenedor blanco del Pop-up Premium */}
              <div className="modal-login-contenedor-premium">
                <div className="perfil-avatar-placeholder-premium">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <h3>Únete a Planells</h3>
                <p>Inicia sesión para gestionar tu armario de forma inteligente y conectar con amigos.</p>
                
                <button className="btn-login-principal" onClick={() => { loginConGoogle(); setMenuPerfilAbierto(false); }}>
                  Iniciar Sesión con Google
                </button>
                
                <button 
                  className="btn-cerrar-modal-formulario" 
                  onClick={() => setMenuPerfilAbierto(false)}
                >
                  Quizás más tarde
                </button>
              </div>
            </>
          )}
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
            <button 
              onClick={() => setCatalogoAbierto(!catalogoAbierto)} 
              className={`menu-link ${catalogoAbierto ? 'catalogo-desplegado-azul' : ''}`}
            >
              CATÁLOGO {catalogoAbierto ? '▴' : '▾'}
            </button>
            
            {catalogoAbierto && (
              <div className="submenu-items">
                <button 
                  type="button"
                  onClick={() => {
                    setSeccionRopaExpandida(!seccionRopaExpandida);
                    if(!seccionRopaExpandida) setSeccionAccesoriosExpandida(false);
                  }} 
                  className="submenu-link"
                  style={{ fontWeight: '600', color: '#2c2a29', borderBottom: '1px solid #e9e5db', paddingBottom: '8px' }}
                >
                  • ROPA {seccionRopaExpandida ? '▴' : '▾'}
                </button>

                {seccionRopaExpandida && (
                  <div className="sub-submenu-items" style={{ paddingLeft: '15px', display: 'flex', flexDirection: 'column', gap: '8px', margin: '8px 0 4px 0' }}>
                    {CATEGORIAS_ROPA.filter(cat => categoriasActivas.includes(cat)).map(cat => (
                      <button 
                        key={cat}
                        onClick={() => navegarA('armario', cat)}
                        className={`submenu-link ${filtro === cat && pantallaActual === 'armario' ? 'sub-active' : ''}`}
                        style={{ fontSize: '11px', color: filtro === cat ? '#2c2a29' : '#8c8882' }}
                      >
                        ◦ {cat.toUpperCase()}
                      </button>
                    ))}
                  </div>
                )}

                <button 
                  type="button"
                  onClick={() => {
                    setSeccionAccesoriosExpandida(!seccionAccesoriosExpandida);
                    if(!seccionAccesoriosExpandida) setSeccionRopaExpandida(false);
                  }} 
                  className="submenu-link"
                  style={{ fontWeight: '600', color: '#2c2a29', borderTop: seccionRopaExpandida ? '1px solid #e9e5db' : 'none', paddingTop: '8px', marginTop: seccionRopaExpandida ? '4px' : '0px' }}
                >
                  • ACCESORIOS {seccionAccesoriosExpandida ? '▴' : '▾'}
                </button>

                {seccionAccesoriosExpandida && (
                  <div className="sub-submenu-items" style={{ paddingLeft: '15px', display: 'flex', flexDirection: 'column', gap: '8px', margin: '8px 0 4px 0' }}>
                    {CATEGORIAS_ACCESORIOS.filter(cat => categoriasActivas.includes(cat)).map(cat => (
                      <button 
                        key={cat}
                        onClick={() => navegarA('armario', cat)} 
                        className={`submenu-link ${filtro === cat ? 'sub-active' : ''}`}
                        style={{ fontSize: '11px', color: filtro === cat ? '#2c2a29' : '#8c8882' }}
                      >
                        ◦ {cat.toUpperCase()}
                      </button>
                    ))}
                  </div>
                )}
                
                <button onClick={() => navegarA('armario', 'Todos')} className="submenu-link" style={{ borderTop: '1px solid #e9e5db', paddingTop: '8px', marginTop: '8px' }}>
                  • VER TODO
                </button>
              </div>
            )}
          </div>
          
          <button onClick={() => { setModalEditarAbierto(true); setMenuAbierto(false); }} className="menu-link">
            EDITAR CATÁLOGO
          </button>
        </nav>
      </div>

      {menuAbierto && <div className="menu-overlay" onClick={() => setMenuAbierto(false)}></div>}

      {/* MODAL 1: EDITAR MENÚ */}
      {modalEditarAbierto && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Editar catálogo</h2>
            <p className="modal-subtitle">Selecciona las prendas que quieres que se muestren en tu menú.</p>
            
            <div className="grid-categorias">
              {TODAS_CATEGORIAS.map(cat => {
                const estaActiva = categoriasActivas.includes(cat);
                return (
                  <div key={cat} className={`categoria-card-selector ${estaActiva ? 'activa' : ''}`} onClick={() => toggleCategoriaFiltro(cat)}>
                    <span className="checkbox-icon">{estaActiva ? '✓' : '☐'}</span>
                    <span className="checkbox-label">{cat}</span>
                  </div>
                );
              })}
            </div>

            {/* 👇 GRUPO DE BOTONES ALINEADOS 👇 */}
            <div className="botones-grupo-modal" style={{ marginTop: '25px' }}>
              <button className="btn-guardar-modal" style={{ marginTop: 0 }} onClick={() => setModalEditarAbierto(false)}>
                Guardar cambios
              </button>
              <button type="button" className="btn-cerrar-modal-formulario" onClick={() => setModalEditarAbierto(false)}>
                Cancelar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 2: NUEVA PRENDA */}
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
                      <div key={marca} className="item-sugerencia-marca" onClick={() => { setFormMarca(marca); setSugerenciasFiltradas([]); }}>
                        {marca}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <label className="label-formulario">Categoría</label>
              <select value={formCategoria} onChange={(e) => setFormCategoria(e.target.value)} className="select-prenda-dropdown">
                {TODAS_CATEGORIAS.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <label className="label-formulario">Imagen de la prenda</label>
              <div className="contenedor-carga-foto">
                <input type="file" accept="image/*" id="foto-prenda-input" onChange={manejarCambioImagen} className="input-archivo-oculto" />
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
                        onClick={() => { setFormColor(tono); setFormColorPadre(columna.padre); }}
                      />
                    ))}
                  </div>
                ))}
              </div>

              <div className="botones-grupo-modal">
                <button type="submit" className="btn-guardar-modal-formulario">Guardar Prenda</button>
                <button type="button" className="btn-cerrar-modal-formulario" onClick={() => setModalNuevaPrendaAbierto(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PANTALLA: INICIO */}
      {pantallaActual === 'inicio' && (
        <div className="pantalla-inicio-imagen" style={{ backgroundImage: `url(${fondoPantalla})` }}>
          <div className="vibe-overlay">
            <div className="vibe-text">
              <h2>Tu Armario</h2>
              <p>Minimalista. Organizado. Personal.</p>
              {usuario ? (
                <button className="btn-explorar-inicio" onClick={() => navegarA('armario', 'Todos')}>Explorar catálogo</button>
              ) : (
                <button className="btn-explorar-inicio" onClick={loginConGoogle}>Iniciar sesión con Google</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PANTALLA: ARMARIO */}
      {pantallaActual === 'armario' && (
        <div className="pantalla-armario animate-fade-in">
          <header className="armario-header">
            <div className="contenedor-tabs-marcas-editorial">
              {obtenerMarcasDelArmario().map(marcaName => {
                const activa = filtroMarca.toLowerCase() === marcaName.toLowerCase();
                return (
                  <button key={marcaName} className={`tab-marca-editorial-item ${activa ? 'tab-activa' : ''}`} onClick={() => setFiltroMarca(marcaName)}>
                    {marcaName.toUpperCase()}
                  </button>
                );
              })}
            </div>

            <div className="contenedor-filtro-colores-luxury">
              <button className={`item-color-rectangular ${filtroColorPadre === 'Todos' ? 'activo-todos' : ''}`} onClick={() => setFiltroColorPadre('Todos')}>
                <span>TODOS LOS COLORES</span>
              </button>

              {COLORES_CON_TONALIDADES.map(colorObj => {
                const esActivo = filtroColorPadre === colorObj.padre;
                return (
                  <button
                    key={colorObj.padre}
                    className={`item-color-rectangular ${esActivo ? 'activo-solido' : ''}`}
                    style={{ '--color-luxury-tint': colorObj.colorBase, backgroundColor: esActivo ? colorObj.colorBase : 'transparent' }}
                    onClick={() => setFiltroColorPadre(colorObj.padre)}
                  >
                    <span>{colorObj.padre.toUpperCase()}</span>
                  </button>
                );
              })}
            </div>
          </header>

          <div className="contenedor-sub-accion-seleccion-zona">
            <button className={`btn-activar-seleccion-link ${modoSeleccion ? 'en-seleccion' : ''}`} onClick={() => modoSeleccion ? cancelarSeleccion() : setModoSeleccion(true)}>
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
                  <div key={prenda.id} className={`prenda-card ${modoSeleccion ? 'modo-seleccion-activo' : ''} ${estaMarcada ? 'card-marcada-premium' : ''}`} onClick={() => manejarClicPrenda(prenda)}>
                    <div className="img-wrapper">
                      <img src={prenda.imagen} alt={prenda.nombre} />
                      <div className="badge-color-prenda" style={{ backgroundColor: prenda.color }}></div>
                      {modoSeleccion && <div className={`checkbox-burbuja-flotante ${estaMarcada ? 'burbuja-check-activa' : ''}`}>{estaMarcada ? '✓' : ''}</div>}
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

      {/* BOTÓN FIJO INFERIOR */}
      {pantallaActual === 'armario' && !carruselFondosAbierto && (
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
            <button className="btn-anadir-prenda-bottom-fixed" onClick={abrirModalCrear}>＋ AÑADIR PRENDA</button>
          )}
        </div>
      )}

      {/* CARRUSEL DE FONDOS INTERACTIVO */}
      {carruselFondosAbierto && (
        <>
          <div className="carrusel-fondos-contenedor animation-slide-up-fijo">
            <div className="carrusel-header-zona">
              <button className="btn-cerrar-carrusel" onClick={() => setCarruselFondosAbierto(false)}>✕</button>
              <span>Elegir Fondo de Pantalla</span>
              <div style={{ width: '24px' }} /> 
            </div>
            
            <div className="carrusel-scroll-x">
              {FONDOS_DISPONIBLES.map((fondo) => (
                <div key={fondo.id} className={`carrusel-item-card ${fondoPantalla === fondo.url ? 'activo' : ''}`} onClick={() => cambiarFondo(fondo.url)}>
                  <img src={fondo.url} alt={fondo.nombre} />
                  <span className="carrusel-item-name">{fondo.nombre}</span>
                  {fondoPantalla === fondo.url && <div className="carrusel-badge-check">✓</div>}
                </div>
              ))}
            </div>
          </div>
          <div className="carrusel-overlay-cierre" onClick={() => setCarruselFondosAbierto(false)} />
        </>
      )}

    </div>
  );
}