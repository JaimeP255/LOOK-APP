import React, { useState, useEffect, useRef } from 'react';
import './App.css';

// 👇 Quitamos 'storage' de esta línea
import { db, auth, provider } from './firebase'; 

import { collection, onSnapshot, addDoc, doc, deleteDoc, query, where, setDoc, getDoc } from 'firebase/firestore';

// 👇 Mantenemos 'updateProfile' porque lo necesitamos para guardar la foto Base64
import { signOut, onAuthStateChanged, signInWithRedirect, signInWithPopup, updateProfile, getRedirectResult} from 'firebase/auth'; 

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
  const conteo = {};
  
  // Cuenta dinámicamente todo lo que exista en tu armario
  prendas.forEach(p => { 
    const cat = p.categoria || 'Otras';
    conteo[cat] = (conteo[cat] || 0) + 1; 
  });

  // Lo convierte a array y lo ordena de mayor a menor cantidad
  return Object.keys(conteo)
    .map(key => ({ name: key, cantidad: conteo[key] }))
    .sort((a, b) => b.cantidad - a.cantidad);
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

const CATEGORIAS_ACCESORIOS = ['Gorras', 'Zapato cerrado', 'Zapato abierto', 'Bolsos'];
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
  'Zapato cerrado': 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400',
  'Zapato abierto': 'https://images.unsplash.com/photo-1603487742131-4160ec999306?w=400', 
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
    
    // Si ya hay memoria, la usa. Si no, carga el nuevo array por defecto.
    return guardadas ? JSON.parse(guardadas) : ['Sudaderas', 'Tops', 'Camisetas', 'Pantalones largos', 'Pantalones cortos', 'Gorras', 'Zapato cerrado', 'Zapato abierto'];
  });

  // REFERENCIAS Y ESTADOS PARA LA FOTO DE PERFIL
  const inputCamaraRef = useRef(null);
  const inputGaleriaRef = useRef(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  const [filtro, setFiltro] = useState('Todos');
  const [filtroColorPadre, setFiltroColorPadre] = useState('Todos');
  const [filtroMarca, setFiltroMarca] = useState('Todos');

  const [modoSeleccion, setModoSeleccion] = useState(false);
  const [prendasSeleccionadas, setPrendasSeleccionadas] = useState([]);

  const [modalConfirmacionBorrado, setModalConfirmacionBorrado] = useState(false);

  const [menuAbierto, setMenuAbierto] = useState(false);
  const [catalogoAbierto, setCatalogoAbierto] = useState(false); 

  const [perfilTab, setPerfilTab] = useState('perfil'); // 'perfil', 'social' o 'fondo'

  const [selectorFotoAbierto, setSelectorFotoAbierto] = useState(false);

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

  // ESTADOS Y REFS PARA EL MENÚ DE AÑADIR PRENDA
  const [selectorPrendaAbierto, setSelectorPrendaAbierto] = useState(false);
  const inputCamaraPrendaRef = useRef(null);
  const inputGaleriaPrendaRef = useRef(null);

  const [formNombre, setFormNombre] = useState('');
  const [formCategoria, setFormCategoria] = useState('Camisetas');
  const [formColor, setFormColor] = useState('#000000');
  const [formColorPadre, setFormColorPadre] = useState('Negro/Gris');
  const [formImagen, setFormImagen] = useState(''); 
  const [formMarca, setFormMarca] = useState('');
  const [sugerenciasFiltradas, setSugerenciasFiltradas] = useState([]);

  useEffect(() => {
    // Si el modal del perfil se cierra, forzamos el cierre del selector de foto
    if (!modalPerfilCompletoAbierto) {
      setSelectorFotoAbierto(false);
    }
  }, [modalPerfilCompletoAbierto]);

  useEffect(() => {
    const marcasDisponibles = obtenerMarcasDelArmario().map(m => m.toLowerCase());
    
    // Si hay una marca seleccionada que ya no está disponible en esta categoría, volvemos a 'Todos'
    if (filtroMarca && filtroMarca !== 'Todos' && !marcasDisponibles.includes(filtroMarca.toLowerCase())) {
      setFiltroMarca('Todos');
    }
  }, [filtro, prendas]); // 👈 ¡Cambiado formCategoria por filtro!
  
  // DETECTOR DE SESIÓN INTELIGENTE
  // DETECTOR DE SESIÓN INTELIGENTE Y UNIVERSAL
  useEffect(() => {
    // 1. TRAMPA PARA MÓVILES: Atrapa la sesión al volver de la redirección
    // En PC esto se ejecuta en silencio y no hace nada, así que no molesta.
    getRedirectResult(auth).catch((error) => {
      console.error("Error al procesar la redirección móvil:", error);
    });

    // 2. Tu flujo normal de detección (tanto para PC como Móvil)
    const unsubscribe = onAuthStateChanged(auth, async (userFirebase) => {
      if (userFirebase) {
        try {
          const usuarioRef = doc(db, "usuarios", userFirebase.uid);
          const docSnap = await getDoc(usuarioRef);

          if (docSnap.exists()) {
            const datosGuardados = docSnap.data();
            setUsuario({
              ...userFirebase,
              ...datosGuardados
            });
          } else {
            setUsuario(userFirebase);
          }
        } catch (error) {
          console.error("Error al recuperar los datos del usuario:", error);
          setUsuario(userFirebase); 
        }
      } else {
        setUsuario(null); 
      }
    });

    return () => unsubscribe();
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
      // 1. Detectamos si el usuario está en un móvil o tablet
      const esMovil = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      if (esMovil) {
        // 📱 EN MÓVIL: Usamos Redirección para evitar el bloqueo de ventanas emergentes
        await signInWithRedirect(auth, provider);
      } else {
        // 💻 EN ORDENADOR: Usamos Popup porque es más rápido y no recarga la página
        const resultado = await signInWithPopup(auth, provider);
        console.log("Login exitoso en PC:", resultado.user.email);
      }

    } catch (error) {
      console.error("Error detallado en el inicio de sesión:", error);
      
      // Chivato de seguridad vital para Vercel
      if (error.code === 'auth/unauthorized-domain') {
        alert("🚨 FIREBASE BLOQUEADO: Tienes que añadir tu enlace de Vercel a la lista de 'Dominios Autorizados' en la consola de Firebase.");
      } else {
        alert(`Error al conectar con Google: ${error.message}`);
      }
    }
  };

  const handleImagenPrenda = (event) => {
    const archivo = event.target.files[0];
    if (!archivo) return;

    setSelectorPrendaAbierto(false); // Cerramos el desplegable al elegir

    const reader = new FileReader();
    reader.readAsDataURL(archivo);
    
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ancho = 400; // Medida ideal para tarjetas de ropa equilibradas en peso y nitidez
        const alto = 400;
        canvas.width = ancho;
        canvas.height = alto;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, ancho, alto);
        
        const base64String = canvas.toDataURL('image/jpeg', 0.75);

        // 👇 ADAPTACIÓN: Guarda 'base64String' en el estado de tu formulario.
        // Si tu estado se llama 'nuevaPrenda', cámbialo aquí abajo. Por ejemplo:
        setNuevaPrenda(prev => ({ ...prev, imagen: base64String }));
        
        // O si usas una variable independiente como 'imagenPrenda', descomenta esto:
        // setImagenPrenda(base64String);
      };
    };
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

  // Dispara el Pop-up
  const intentarEliminarSeleccionadas = () => {
    if (prendasSeleccionadas.length === 0) return;
    setModalConfirmacionBorrado(true);
  };

  // Ejecuta la acción cuando el usuario confirma en el Pop-up
  const ejecutarBorradoDefinitivo = async () => {
    try {
      await Promise.all(prendasSeleccionadas.map(id => deleteDoc(doc(db, 'prendas', id))));
      cancelarSeleccion();
      setFiltroMarca('Todos');
      setModalConfirmacionBorrado(false); // Cerramos el modal tras el éxito
    } catch (error) {
      console.error("Error al borrar de Firebase:", error);
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

  // FUNCIÓN PARA COMPRIMIR, PROCESAR Y GUARDAR LA FOTO EN BASE64
  const handleSubirFotoPerfil = async (event) => {
    const archivo = event.target.files[0];
    if (!archivo) return;

    if (!auth.currentUser) {
      alert("Debes estar logueado para cambiar tu foto.");
      return;
    }

    try {
      setSubiendoFoto(true);
      setSelectorFotoAbierto(false);

      // 1. Leemos el archivo original
      const reader = new FileReader();
      reader.readAsDataURL(archivo);
      
      reader.onload = (e) => {
        // 2. Creamos una imagen invisible en la memoria del navegador
        const img = new Image();
        img.src = e.target.result;
        
        img.onload = async () => {
          // 3. MAGIA: Creamos un lienzo (canvas) pequeñito para encoger la foto
          const canvas = document.createElement('canvas');
          const tamaño = 150; // 150x150 píxeles es perfecto y súper ligero para un avatar
          canvas.width = tamaño;
          canvas.height = tamaño;
          
          // 4. Dibujamos la foto original encogida dentro del lienzo
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, tamaño, tamaño);
          
          // 5. Extraemos el texto Base64 del lienzo en formato JPEG con calidad media (0.7)
          // Esto genera una cadena de texto cortísima que Firebase sí acepta.
          // 5. Extraemos el texto Base64 del lienzo...
          const fotoComprimidaBase64 = canvas.toDataURL('image/jpeg', 0.7);

          try {
            // ❌ BORRAMOS EL GUARDADO EN AUTH
            // await updateProfile(auth.currentUser, { photoURL: fotoComprimidaBase64 });

            // ✅ 6. GUARDAMOS EN FIRESTORE (En una colección de "usuarios" ligada a tu ID)
            const usuarioRef = doc(db, "usuarios", auth.currentUser.uid);
            await setDoc(usuarioRef, { photoURL: fotoComprimidaBase64 }, { merge: true });

            // 7. Actualizamos el estado visual de React al instante
            if (usuario) {
              setUsuario({ ...usuario, photoURL: fotoComprimidaBase64 });
            }

          } catch (error) {
            console.error("Error al guardar en Firestore:", error);
            alert("Hubo un error al guardar la foto en la base de datos.");
          } finally {
            setSubiendoFoto(false); 
          }
        };
      };
    } catch (error) {
      console.error("Error general al procesar la imagen:", error);
      setSubiendoFoto(false);
    }
  };

  // FUNCIÓN UNIVERSAL PARA GUARDAR DATOS DEL PERFIL EN FIRESTORE
  const handleActualizarDatoPerfil = async (campo, valorNuevo) => {
    // 1. Actualizamos visualmente al instante (para que no haya lag al escribir o seleccionar)
    setUsuario(prevUsuario => ({
      ...prevUsuario,
      [campo]: valorNuevo
    }));

    // 2. Lo guardamos de fondo en la base de datos
    if (auth.currentUser) {
      try {
        const usuarioRef = doc(db, "usuarios", auth.currentUser.uid);
        // Usamos [campo] para que sea dinámico. El {merge: true} respeta la foto que ya tuvieras.
        await setDoc(usuarioRef, { [campo]: valorNuevo }, { merge: true });
      } catch (error) {
        console.error(`Error al guardar ${campo} en Firestore:`, error);
      }
    }
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
        <div className="user-avatar" onClick={() => {setMenuPerfilAbierto(!menuPerfilAbierto); setMenuAbierto(false); }} style={{ cursor: 'pointer' }}>
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

                {/* 1. Zona Superior: Foto */}
                <div className="perfil-completo-avatar-seccion" style={{ position: 'relative' }}>
                  
                  {/* Avatar interactivo (con loader visual básico si está cargando) */}
                  <div className="avatar-wrapper-edicion" onClick={() => !subiendoFoto && setSelectorFotoAbierto(!selectorFotoAbierto)}>
                    {subiendoFoto ? (
                      <div style={{width: '80px', height: '80px', borderRadius: '50%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px'}}>Cargando...</div>
                    ) : (
                      <img src={usuario.photoURL || "https://via.placeholder.com/80"} alt="Tu foto de perfil" />
                    )}
                  </div>

                  {/* 🔽 MENÚ DESPLEGABLE ESTILO APPLE 🔽 */}
                  {selectorFotoAbierto && (
                    <>
                      <div className="overlay-invisible-cerrar-menu" onClick={() => setSelectorFotoAbierto(false)} />
                      
                      <div className="selector-foto-dropdown animation-pop-in">
                        {/* Conectamos los botones a los Refs */}
                        <button onClick={() => inputCamaraRef.current.click()}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                            <circle cx="12" cy="13" r="4"></circle>
                          </svg>
                          Hacer foto
                        </button>
                        <button onClick={() => inputGaleriaRef.current.click()}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                            <polyline points="21 15 16 10 5 21"></polyline>
                          </svg>
                          Añadir desde fototeca
                        </button>
                      </div>
                    </>
                  )}

                  {/* 🔽 INPUTS OCULTOS (Conectados a la función de guardado) 🔽 */}
                  <input 
                    type="file" 
                    ref={inputCamaraRef} 
                    accept="image/*" 
                    capture="user" 
                    style={{ display: 'none' }} 
                    onChange={handleSubirFotoPerfil} 
                  />
                  <input 
                    type="file" 
                    ref={inputGaleriaRef} 
                    accept="image/*" 
                    style={{ display: 'none' }} 
                    onChange={handleSubirFotoPerfil} 
                  />
                </div>

                {/* 2. Zona Media: Datos (Con selectores vitaminados y todas las estaciones) */}
                <div className="perfil-completo-datos">
                  
                  <div className="input-group-perfil">
                    <label>Nombre de usuario</label>
                    <input 
                      type="text" 
                      value={usuario?.displayName || ''} 
                      onChange={(e) => handleActualizarDatoPerfil('displayName', e.target.value)}
                      placeholder="Tu nombre o apodo" 
                    />
                  </div>
                  
                  <div className="input-group-perfil">
                    <label>Estilo de Armario</label>
                    <select 
                      className="select-perfil-estilo" 
                      value={usuario?.estiloArmario || 'minimalista'} 
                      onChange={(e) => handleActualizarDatoPerfil('estiloArmario', e.target.value)}
                    >
                      <option value="minimalista">Minimalista & Cápsula</option>
                      <option value="casual">Casual / Diario</option>
                      <option value="formal">Formal / De Negocios</option>
                      <option value="streetwear">Streetwear / Urbano</option>
                    </select>
                  </div>
                  
                  <div className="input-group-perfil">
                    <label>Estación favorita</label>
                    <select 
                      className="select-perfil-estilo" 
                      value={usuario?.estacionFavorita || 'verano'} 
                      onChange={(e) => handleActualizarDatoPerfil('estacionFavorita', e.target.value)}
                    >
                      <option value="primavera">Primavera</option>
                      <option value="verano">Verano</option>
                      <option value="otono">Otoño</option>
                      <option value="invierno">Invierno</option>
                    </select>
                  </div>
                  
                </div>

                <div className="linea-separadora-fija" />

                {/* 3. Zona Inferior: Cuadro de Mandos Analítico */}
                <div className="perfil-completo-estadisticas">
                  <h4>Mis estadísticas</h4>
                  
                  {/* SI NO HAY NINGÚN GRÁFICO EXPANDIDO: Botones limpios estilo menú de ajustes */}
                  {!graficoExpandido ? (
                    <div className="contenedor-grid-graficos-cuadrado">
                      
                      <div className="tarjeta-grafico-item-click" onClick={() => setGraficoExpandido('colores')}>
                        <span className="titulo-grafico-btn">Colores</span>
                        <span className="icono-expandir-mini">↗</span>
                      </div>

                      <div className="tarjeta-grafico-item-click" onClick={() => setGraficoExpandido('tipos')}>
                        <span className="titulo-grafico-btn">Prendas</span>
                        <span className="icono-expandir-mini">↗</span>
                      </div>

                      <div className="tarjeta-grafico-item-click" onClick={() => setGraficoExpandido('marcas')}>
                        <span className="titulo-grafico-btn">Marcas</span>
                        <span className="icono-expandir-mini">↗</span>
                      </div>

                      <div className="tarjeta-grafico-item-click" onClick={() => setGraficoExpandido('estaciones')}>
                        <span className="titulo-grafico-btn">Clima</span>
                        <span className="icono-expandir-mini">↗</span>
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

{graficoExpandido === 'tipos' && (() => {
                          const datos = obtenerDatosPrendas(prendas);
                          const totalPrendas = datos.reduce((suma, item) => suma + item.cantidad, 0);
                          
                          // 👑 NUEVO: Buscamos cuál es la cantidad máxima para establecer el "techo" de color
                          const maxCantidad = Math.max(...datos.map(d => d.cantidad), 1);

                          return (
                            <div className="nube-palabras-contenedor">
                              {datos.length === 0 ? (
                                <p style={{textAlign: 'center', color: '#888', marginTop: '20px'}}>Tu armario está vacío</p>
                              ) : (
                                datos.map((item, idx) => {
                                  // Tamaño: Cuota real del armario
                                  const frecuencia = totalPrendas > 0 ? (item.cantidad / totalPrendas) : 0;
                                  const fontSize = Math.min(16 + (frecuencia * 80), 60); 
                                  
                                  // 🎨 RANGO DE COLOR EXTREMO: Comparamos contra el líder (De 0.0 a 1.0 siempre)
                                  const intensidadColor = item.cantidad / maxCantidad;

                                  // Saturación: De 30% (muy grisáceo) a 100% (azul purísimo)
                                  // Luminosidad: De 85% (casi blanco tiza) a 12% (azul marino tintado de negro)
                                  const saturation = 30 + (intensidadColor * 70);
                                  const lightness = 85 - (intensidadColor * 73); 
                                  const colorDinamico = `hsl(220, ${saturation}%, ${lightness}%)`;

                                  return (
                                    <span 
                                      key={idx} 
                                      className="palabra-nube"
                                      style={{ 
                                        fontSize: `${fontSize}px`,
                                        color: colorDinamico, 
                                        animationDelay: `${idx * 0.04}s` 
                                      }}
                                    >
                                      {item.name}
                                    </span>
                                  );
                                })
                              )}
                            </div>
                          );
                        })()}

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

      {/* 🔴 MODAL DE CONFIRMACIÓN DE BORRADO */}
      {modalConfirmacionBorrado && (
        <div className="modal-overlay modal-blur-premium">
          <div className="modal-content modal-borrado-chulo animation-pop-in">
            <div className="icono-peligro-contenedor">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </div>
            
            <h2>¿Eliminar prendas?</h2>
            <p className="texto-borrado-detalle">
              Estás a punto de eliminar <strong>{prendasSeleccionadas.length} prenda{prendasSeleccionadas.length > 1 ? 's' : ''}</strong> de tu armario. Esta acción no se puede deshacer.
            </p>
            
            <div className="botones-grupo-modal botones-borrado">
              <button 
                type="button" 
                className="btn-cancelar-borrado" 
                onClick={() => setModalConfirmacionBorrado(false)}
              >
                Cancelar
              </button>
              <button 
                type="button" 
                className="btn-confirmar-borrado-rojo" 
                onClick={ejecutarBorradoDefinitivo}
              >
                Eliminar
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
              <div className="contenedor-carga-foto" style={{ position: 'relative' }}>
                
                {/* 1. EL NUEVO BOTÓN (Sustituye al <label> antiguo) */}
                <div 
                  className="btn-disparar-archivo" 
                  onClick={() => setSelectorPrendaAbierto(!selectorPrendaAbierto)}
                  style={{ cursor: 'pointer', textAlign: 'center' }}
                >
                  {formImagen ? '✓ Foto seleccionada (Cambiar)' : '📷 Seleccionar Imagen'}
                </div>

                {/* 2. 🔽 EL DESPLEGABLE ESTILO APPLE 🔽 */}
                {selectorPrendaAbierto && (
                  <>
                    {/* Capa invisible para cerrar al hacer clic fuera */}
                    <div className="overlay-invisible-cerrar-menu" onClick={() => setSelectorPrendaAbierto(false)} />
                    
                    <div className="selector-foto-dropdown animation-pop-in">
                      <button type="button" onClick={() => inputCamaraPrendaRef.current.click()}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                          <circle cx="12" cy="13" r="4"></circle>
                        </svg>
                        Hacer foto
                      </button>
                      <button type="button" onClick={() => inputGaleriaPrendaRef.current.click()}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                          <circle cx="8.5" cy="8.5" r="1.5"></circle>
                          <polyline points="21 15 16 10 5 21"></polyline>
                        </svg>
                        Añadir desde fototeca
                      </button>
                    </div>
                  </>
                )}

                {/* 3. VISTA PREVIA INTACTA (Lo que tú ya tenías) */}
                {formImagen && (
                  <div className="vista-previa-miniatura">
                    <img src={formImagen} alt="Previa" />
                  </div>
                )}

                {/* 4. INPUTS OCULTOS DE HARDWARE */}
                <input 
                  type="file" 
                  ref={inputCamaraPrendaRef} 
                  accept="image/*" 
                  capture="user" 
                  style={{ display: 'none' }} 
                  onChange={handleImagenPrenda} 
                />
                <input 
                  type="file" 
                  ref={inputGaleriaPrendaRef} 
                  accept="image/*" 
                  style={{ display: 'none' }} 
                  onChange={handleImagenPrenda} 
                />
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
      {pantallaActual === 'armario' && !carruselFondosAbierto && !modalPerfilCompletoAbierto && (
        <div className="contenedor-fijo-boton-inferior">
          {modoSeleccion ? (
            <button 
              className={`btn-anadir-prenda-bottom-fixed btn-eliminar-seleccion-multiple-fixed ${prendasSeleccionadas.length > 0 ? 'con-items-para-borrar' : ''}`}
              onClick={intentarEliminarSeleccionadas}
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