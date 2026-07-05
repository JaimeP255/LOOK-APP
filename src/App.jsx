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
  // 🚀 Modern Streetwear & New Wave (Marcas del momento)
  'Nude Project', 'Scuffers', 'Blue Banana', 'Cold Culture', 'Fake Gods',
  'Eme Studios', 'Late Checkout', 'TwoJeys', 'Capsule', 'Gonzo', 
  'Corteiz', 'Represent', 'Sporty & Rich', 'Kith', 'Ami Paris', 'Casablanca',
  
  // 🏢 Fast Fashion & High Street (Inditex y competencia)
  'Zara', 'Mango', 'H&M', 'Pull&Bear', 'Bershka', 'Massimo Dutti', 
  'Stradivarius', 'Oysho', 'Springfield', 'Primark', 'Uniqlo', 'C&A', 
  'Sfera', 'ASOS', 'Shein', 'Cortefiel', 'Pedro del Hierro', 'Bimba y Lola',
  
  // 👟 Sportswear & Streetwear Clásico
  'Nike', 'Adidas', 'Puma', 'Reebok', 'Under Armour', 'New Balance', 
  'Converse', 'Vans', 'Asics', 'Fila', 'Champion', 'Supreme', 
  'Off-White', 'Stüssy', 'Carhartt WIP', 'Salomon', 'Kappa', 'Ellesse',
  
  // 👖 Denim & Casual Prep
  'Levi\'s', 'Wrangler', 'Lee', 'Diesel', 'G-Star RAW', 'Guess', 
  'Pepe Jeans', 'Tommy Hilfiger', 'Calvin Klein', 'Polo Ralph Lauren', 
  'Lacoste', 'Gant', 'Fred Perry', 'Hollister', 'Abercrombie & Fitch', 
  'GAP', 'Dockers', 'Scalpers', 'El Ganso', 'Silbon', 'Ecoalf',
  
  // 🏔️ Outdoor & Techwear
  'The North Face', 'Patagonia', 'Columbia', 'Arc\'teryx', 'Napapijri', 
  'Timberland', 'Helly Hansen', 'Quechua',
  
  // ✨ Premium & Luxury
  'Gucci', 'Prada', 'Louis Vuitton', 'Balenciaga', 'Dior', 'Jacquemus',
  'Saint Laurent', 'Chanel', 'Hermès', 'Burberry', 'Versace', 'Ganni',
  'Armani', 'Emporio Armani', 'Hugo Boss', 'Loewe', 'Bottega Veneta', 
  'Givenchy', 'Fendi', 'Kenzo', 'Alexander McQueen', 'Carolina Herrera',
  
  // 👞 Calzado y Accesorios Especializados
  'Dr. Martens', 'Crocs', 'Birkenstock', 'Clarks', 'Skechers', 'Pompeii',
  'Veja', 'Camper', 'Munich', 'Pikolinos', 'Hoff', 'New Era', 'Hawkers'
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

  // ESTADOS PARA GUARDAR OUTFITS
  const [outfitsGuardados, setOutfitsGuardados] = useState([]);
  const [modalGuardarAbierto, setModalGuardarAbierto] = useState(false);
  const [nombreOutfitTemp, setNombreOutfitTemp] = useState('');
  const [fotoOutfitTemp, setFotoOutfitTemp] = useState(null);

  const [modalConfirmacionBorrado, setModalConfirmacionBorrado] = useState(false);

  const [idSeleccionado, setIdSeleccionado] = useState(null);

  const [menuAbierto, setMenuAbierto] = useState(false);
  const [catalogoAbierto, setCatalogoAbierto] = useState(false); 

  // ESTADOS PARA EL LIENZO DEL OUTFIT
  const [prendasLienzo, setPrendasLienzo] = useState([]);
  const [idArrastrando, setIdArrastrando] = useState(null);
  const [offsetArrastre, setOffsetArrastre] = useState({ x: 0, y: 0 });
  const [gestoInicial, setGestoInicial] = useState({ distancia: 0, angulo: 0, escala: 1, rotacion: 0 });

  const [perfilTab, setPerfilTab] = useState('perfil'); // 'perfil', 'social' o 'fondo'

  const [selectorFotoAbierto, setSelectorFotoAbierto] = useState(false);

  const [prendaEnZonaBorrado, setPrendaEnZonaBorrado] = useState(false);
  // ESTADOS PARA EL CREADOR DE OUTFITS
  const [modalCrearOutfitAbierto, setModalCrearOutfitAbierto] = useState(false);
  const [categoriaOutfitSeleccionada, setCategoriaOutfitSeleccionada] = useState('Sudaderas');

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

  // 🟢 ESTADOS PARA EL POPUP Y EL CREADOR DE SILUETAS (LAZO)
  const [modalCanvasAbierto, setModalCanvasAbierto] = useState(false);
  const [prendaRecienGuardada, setPrendaRecienGuardada] = useState(null);

  const canvasBorradorRef = useRef(null);
  const imgPrendaRef = useRef(null);
  const puntosSiluetaRef = useRef([]); 
  const [estaDibujando, setEstaDibujando] = useState(false);
  const [recorteHecho, setRecorteHecho] = useState(false);

  // 📏 Calcula la distancia en píxeles
  const calcularDistancia = (touches) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy); 
  };

  // 📐 Calcula el ángulo de inclinación
  const calcularAngulo = (touches) => {
    const dx = touches[1].clientX - touches[0].clientX;
    const dy = touches[1].clientY - touches[0].clientY;
    return Math.atan2(dy, dx) * (180 / Math.PI);
  };

  // 🎯 NUEVO: Calcula el centro exacto entre los dos dedos
  const calcularPuntoMedio = (touches) => {
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2
    };
  };

  const guardarOutfitDefinitivo = () => {
    if (!nombreOutfitTemp.trim()) return; // No permitimos guardar sin nombre
    
    const nuevoOutfit = {
      id: Date.now(),
      nombre: nombreOutfitTemp,
      foto: fotoOutfitTemp,
      prendas: prendasLienzo // 👈 Guardamos el lienzo completo para hacer el boceto
    };
    
    // Añadimos el nuevo outfit al principio de la lista
    setOutfitsGuardados(prev => [nuevoOutfit, ...prev]);
    
    // Cerramos los modales y limpiamos la memoria
    setModalGuardarAbierto(false);
    setModalCrearOutfitAbierto(false);
    setPrendasLienzo([]);
    setNombreOutfitTemp('');
    setFotoOutfitTemp(null);
  };

  // 1. Mete la prenda en el lienzo al tocarla en el carrusel
  const agregarPrendaAlLienzo = (prenda) => {
    setPrendasLienzo([...prendasLienzo, {
      idUnico: Date.now() + Math.random(), // ID irrepetible para poder poner 2 camisetas iguales
      imagen: prenda.imagen,
      x: 0, // Empieza en el centro exacto
      y: 0,
      escala: 1, // Preparado para el zoom futuro
      rotacion: 0 // Preparado para rotar futuro
    }]);
  };

  // 👆 Trae la capa hacia adelante (La pone al final del array)
  const traerAlFrente = (idUnico) => {
    setPrendasLienzo(prev => {
      const item = prev.find(p => p.idUnico === idUnico);
      const resto = prev.filter(p => p.idUnico !== idUnico);
      return [...resto, item]; 
    });
  };

  // 👇 Envía la capa hacia atrás (La pone al principio del array)
  const enviarAlFondo = (idUnico) => {
    setPrendasLienzo(prev => {
      const item = prev.find(p => p.idUnico === idUnico);
      const resto = prev.filter(p => p.idUnico !== idUnico);
      return [item, ...resto]; 
    });
  };

  // 1. INICIO DEL TOQUE
  const handleTouchStartPrenda = (e, idUnico) => {
    setIdArrastrando(idUnico);
    setIdSeleccionado(idUnico); 
    
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setOffsetArrastre({ x: touch.clientX, y: touch.clientY });
      // Reseteamos la memoria de dos dedos por si acaso
      setGestoInicial({ distancia: 0, angulo: 0, escala: 1, rotacion: 0 }); 
    } else if (e.touches.length >= 2) {
      const prendaAct = prendasLienzo.find(p => p.idUnico === idUnico);
      if (!prendaAct) return;
      
      setGestoInicial({
        distancia: calcularDistancia(e.touches),
        angulo: calcularAngulo(e.touches),
        escala: prendaAct.escala,
        rotacion: prendaAct.rotacion
      });
      setOffsetArrastre(calcularPuntoMedio(e.touches));
    }
  };

  // 2. MOVIMIENTO EN TIEMPO REAL
  const handleTouchMovePrenda = (e, idUnico) => {
    if (idArrastrando !== idUnico) return;

    const prendaAct = prendasLienzo.find(p => p.idUnico === idUnico);
    if (!prendaAct) return;

    if (e.touches.length === 1) {
      // --- 1 DEDO: Solo arrastrar ---
      
      // ✨ MAGIA: Si acabamos de soltar el 2º dedo, recalibramos para evitar el salto
      if (gestoInicial.distancia !== 0) {
        setGestoInicial({ distancia: 0, angulo: 0, escala: 1, rotacion: 0 });
        setOffsetArrastre({ x: e.touches[0].clientX, y: e.touches[0].clientY });
        return; // Detenemos la animación este frame
      }

      const deltaX = e.touches[0].clientX - offsetArrastre.x;
      const deltaY = e.touches[0].clientY - offsetArrastre.y;

      setPrendasLienzo(prev => prev.map(p => {
        if (p.idUnico === idUnico) {
          const nuevaX = p.x + deltaX;
          const nuevaY = p.y + deltaY;
          if (nuevaX < -50 && nuevaY > 30) setPrendaEnZonaBorrado(true);
          else setPrendaEnZonaBorrado(false);
          return { ...p, x: nuevaX, y: nuevaY };
        }
        return p;
      }));

      setOffsetArrastre({ x: e.touches[0].clientX, y: e.touches[0].clientY });

    } else if (e.touches.length >= 2) {
      // --- 2 DEDOS: Escalar, Rotar y Arrastrar ---
      
      const dist = calcularDistancia(e.touches);
      const ang = calcularAngulo(e.touches);
      const medio = calcularPuntoMedio(e.touches);

      // ✨ MAGIA 2: Si es el 1er instante con dos dedos, recalibramos
      if (gestoInicial.distancia === 0) {
        setGestoInicial({
          distancia: dist,
          angulo: ang,
          escala: prendaAct.escala,
          rotacion: prendaAct.rotacion
        });
        setOffsetArrastre({ x: medio.x, y: medio.y });
        return; // Detenemos la animación este frame
      }

      const deltaX = medio.x - offsetArrastre.x;
      const deltaY = medio.y - offsetArrastre.y;
      
      const deltaEscala = dist / gestoInicial.distancia;
      const nuevaEscala = Math.max(0.3, Math.min(gestoInicial.escala * deltaEscala, 3.5));

      let deltaAngulo = ang - gestoInicial.angulo;
      if (deltaAngulo > 180) deltaAngulo -= 360;
      if (deltaAngulo < -180) deltaAngulo += 360;
      const nuevaRotacion = gestoInicial.rotacion + deltaAngulo;

      setPrendasLienzo(prev => prev.map(p => {
        if (p.idUnico === idUnico) {
          const nuevaX = p.x + deltaX;
          const nuevaY = p.y + deltaY;
          if (nuevaX < -50 && nuevaY > 30) setPrendaEnZonaBorrado(true);
          else setPrendaEnZonaBorrado(false);
          return { ...p, x: nuevaX, y: nuevaY, escala: nuevaEscala, rotacion: nuevaRotacion };
        }
        return p;
      }));

      setOffsetArrastre({ x: medio.x, y: medio.y });
    }
  };

  // 3. FIN DEL TOQUE
  const handleTouchEndPrenda = (e, idUnico) => {
    // ✨ MAGIA 3: Si levantas un dedo pero dejas el otro, preparamos el motor para 1 dedo
    if (e.touches && e.touches.length > 0) {
      setOffsetArrastre({ x: e.touches[0].clientX, y: e.touches[0].clientY });
      setGestoInicial({ distancia: 0, angulo: 0, escala: 1, rotacion: 0 }); 
      return; 
    }

    if (prendaEnZonaBorrado) {
      setPrendasLienzo(prev => prev.filter(p => p.idUnico !== idUnico));
      setPrendaEnZonaBorrado(false);
    }
    setIdArrastrando(null);
    setGestoInicial({ distancia: 0, angulo: 0, escala: 1, rotacion: 0 });
  };

  useEffect(() => {
    // Si el modal del perfil se cierra, forzamos el cierre del selector de foto
    if (!modalPerfilCompletoAbierto) {
      setSelectorFotoAbierto(false);
    }
  }, [modalPerfilCompletoAbierto]);

  useEffect(() => {
    const marcasDisponibles = obtenerMarcasDelArmario().map(m => m.toLowerCase());
    if (filtroMarca && filtroMarca !== 'Todos' && !marcasDisponibles.includes(filtroMarca.toLowerCase())) {
      setFiltroMarca('Todos');
    }

    // ✨ NUEVO: Hacemos lo mismo con los colores
    const coloresDisponibles = obtenerColoresDelArmario().map(c => c.padre.toLowerCase());
    if (filtroColorPadre && filtroColorPadre !== 'Todos' && !coloresDisponibles.includes(filtroColorPadre.toLowerCase())) {
      setFiltroColorPadre('Todos');
    }
  }, [filtro, prendas]);
  
  useEffect(() => {
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

  // 1. Cargar la imagen original en el lienzo cuando se abre el popup
  useEffect(() => {
    if (modalCanvasAbierto && prendaRecienGuardada) {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        imgPrendaRef.current = img;
        restaurarImagenLienzo();
      };
      img.src = prendaRecienGuardada.imagen;
    }
  }, [modalCanvasAbierto, prendaRecienGuardada]);

  // 2. Función para redibujar la imagen y limpiar recortes previos
  const restaurarImagenLienzo = () => {
    const canvas = canvasBorradorRef.current;
    if (!canvas || !imgPrendaRef.current) return;
    const ctx = canvas.getContext('2d');
    
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const img = imgPrendaRef.current;
    const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
    const x = (canvas.width / 2) - (img.width / 2) * scale;
    const y = (canvas.height / 2) - (img.height / 2) * scale;
    
    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
    puntosSiluetaRef.current = [];
    setRecorteHecho(false);
  };

  // 3. Recortar usando la ruta dibujada
  const aplicarRecorteSilueta = () => {
    const canvas = canvasBorradorRef.current;
    const ctx = canvas.getContext('2d');
    const img = imgPrendaRef.current;
    const puntos = puntosSiluetaRef.current;

    if (puntos.length < 10) {
      restaurarImagenLienzo(); // Cancelar si el trazo es muy corto
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height); 
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(puntos[0].x, puntos[0].y);
    for (let i = 1; i < puntos.length; i++) {
      ctx.lineTo(puntos[i].x, puntos[i].y);
    }
    ctx.closePath(); 
    ctx.clip();      

    const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
    const x = (canvas.width / 2) - (img.width / 2) * scale;
    const y = (canvas.height / 2) - (img.height / 2) * scale;
    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
    ctx.restore(); 
    
    setRecorteHecho(true);
  };

  const loginConGoogle = async () => {
    try {
      const { setPersistence, browserLocalPersistence } = await import('firebase/auth');
      await setPersistence(auth, browserLocalPersistence);
      
      // Usamos Popup universalmente. Funciona de lujo en móvil si el dominio está autorizado.
      const resultado = await signInWithPopup(auth, provider);
      console.log("Login exitoso:", resultado.user.email);
      
    } catch (error) {
      console.error("Error detallado en el inicio de sesión:", error);
      
      if (error.code === 'auth/unauthorized-domain') {
        alert("🚨 FIREBASE BLOQUEADO: Revisa la lista de Dominios Autorizados en la consola.");
      } else if (error.code === 'auth/popup-closed-by-user') {
        // Ignoramos silenciosamente si el usuario cierra la ventana de login a medias
        console.log("El usuario canceló el inicio de sesión.");
      } else {
        alert(`Error al conectar con Google: ${error.message}`);
      }
    }
  };

  const handleImagenPrenda = (event) => {
    const archivo = event.target.files[0];
    if (!archivo) return;

    setSelectorPrendaAbierto(false); // Cerramos el menú al elegir

    // 1. Usamos ObjectURL: Es 100 veces más rápido en móvil y no satura la memoria RAM
    const imageUrl = URL.createObjectURL(archivo);
    
    const img = new Image();
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const tamañoFinal = 400; 
      canvas.width = tamañoFinal;
      canvas.height = tamañoFinal;
      
      const ctx = canvas.getContext('2d');
      const ladoMinimo = Math.min(img.width, img.height);
      const startX = (img.width - ladoMinimo) / 2;
      const startY = (img.height - ladoMinimo) / 2;
      
      ctx.drawImage(img, startX, startY, ladoMinimo, ladoMinimo, 0, 0, tamañoFinal, tamañoFinal);
      
      const base64String = canvas.toDataURL('image/jpeg', 0.75);
      
      // 👇 LO QUE CAMBIA: Guardamos la original temporal y abrimos el Lazo
      setFormImagen(base64String); 
      setPrendaRecienGuardada({ imagen: base64String }); 
      setModalCanvasAbierto(true);
      
      URL.revokeObjectURL(imageUrl);
    };

    // 3. Chivato de seguridad por si el móvil sube un formato corrupto
    img.onerror = () => {
      alert("No se pudo procesar la foto. Intenta con otra o comprueba los permisos.");
      URL.revokeObjectURL(imageUrl);
    };

    img.src = imageUrl;

    // 4. Reseteamos el input para que te deje volver a subir la misma foto si la borras
    event.target.value = '';
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

  const obtenerColoresDelArmario = () => {
    if (!prendas || prendas.length === 0) return [];

    // 1. Filtramos las prendas igual que hacemos con las marcas
    const prendasFiltradas = prendas.filter(p => {
      if (!filtro || filtro.toLowerCase() === 'todas' || filtro.toLowerCase() === 'todos') {
        return true;
      }
      
      const valorCategoria = p.categoria || p.categoriaPrenda || p.tipo || p.seccion || '';
      const catPrenda = valorCategoria.toLowerCase().trim();
      const catFiltro = filtro.toLowerCase().trim();
      
      const catPrendaSinS = catPrenda.endsWith('s') ? catPrenda.slice(0, -1) : catPrenda;
      const catFiltroSinS = catFiltro.endsWith('s') ? catFiltro.slice(0, -1) : catFiltro;

      return catPrenda === catFiltro || catPrendaSinS === catFiltroSinS;
    });

    // 2. Extraemos qué 'colores padre' únicos hay en esta categoría
    const coloresPresentes = [...new Set(prendasFiltradas.map(p => p.colorPadre).filter(Boolean))];

    // 3. Devolvemos la información completa del color (con sus hex de la constante) pero solo de los que existen
    return COLORES_CON_TONALIDADES.filter(colorObj => coloresPresentes.includes(colorObj.padre));
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
      await addDoc(collection(db, 'prendas'), datosPrenda);
      
      if (typeof e !== 'undefined' && e.target) e.target.reset(); 

      if (!categoriasActivas.includes(formCategoria)) {
        setCategoriasActivas(prev => [...prev, formCategoria].sort((a, b) => TODAS_CATEGORIAS.indexOf(a) - TODAS_CATEGORIAS.indexOf(b)));
      }
  
      // 🔥 Ahora el formulario simplemente se cierra y nos manda al Armario
      setModalNuevaPrendaAbierto(false);     
      setFiltro(formCategoria);
      setPantallaActual('armario');
  
    } catch (error) {
      console.error("Error al subir a Firebase:", error);
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
      
      {/* ==========================================
          🛑 CAPA DE BLOQUEO: LOGIN OBLIGATORIO (Estilo image_6da83e.jpg)
          ========================================== */}
      {!usuario && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)', /* Fondo oscuro que deja ver la app detrás */
          zIndex: 9999, /* Asegura que esté por encima de cualquier otro menú */
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '40px 30px',
            width: '100%',
            maxWidth: '320px',
            textAlign: 'center',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            
            {/* Icono de usuario calcado de la imagen */}
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '15px' }}>
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>

            <h2 style={{ margin: '0 0 10px 0', fontSize: '20px', fontWeight: '600', color: '#000' }}>
              Únete a Planells
            </h2>

            <p style={{ color: '#666', fontSize: '14px', lineHeight: '1.4', margin: '0 0 25px 0' }}>
              Inicia sesión para gestionar tu armario de forma inteligente y conectar con amigos.
            </p>

            <button 
              onClick={loginConGoogle} 
              style={{ 
                width: '100%', 
                padding: '12px', 
                backgroundColor: '#333333', /* Gris oscuro/casi negro de la imagen */
                color: '#ffffff', 
                border: 'none', 
                borderRadius: '6px', 
                fontSize: '14px', 
                fontWeight: '500', 
                cursor: 'pointer' 
              }}
            >
              Iniciar Sesión con Google
            </button>
            
            {/* ❌ La opción "Quizás más tarde" ha sido eliminada intencionadamente */}

          </div>
        </div>
      )}
      {/* ========================================== */}

      {/* Barra Superior */}
      <div className="navbar-superior">
        <button className="menu-hamburguesa" onClick={() => setMenuAbierto(true)}>
          ☰
        </button>
        
        <div className="navbar-centro-categoria-titulo">
          {pantallaActual === 'armario' && filtro.toUpperCase()}
          {pantallaActual === 'outfits' && 'MIS OUTFITS'}
          {pantallaActual !== 'armario' && pantallaActual !== 'outfits' && 'PLANELLS'}
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

                  {/* 4. INPUTS OCULTOS DE HARDWARE OPTIMIZADOS PARA MÓVIL */}
                  <input 
                    type="file" 
                    ref={inputCamaraPrendaRef} 
                    accept="image/jpeg, image/png, image/jpg" 
                    capture="environment" 
                    style={{ display: 'none' }} 
                    onChange={handleImagenPrenda} 
                  />
                  <input 
                    type="file" 
                    ref={inputGaleriaPrendaRef} 
                    accept="image/jpeg, image/png, image/jpg" 
                    style={{ display: 'none' }} 
                    onChange={handleImagenPrenda} 
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
            
            {/* ✨ NUEVO: Contenedor Flex para Título y Botón de Edición en la misma línea */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: '20px' }}>
              
              {/* Botón original de desplegar catálogo */}
              <button 
                onClick={() => setCatalogoAbierto(!catalogoAbierto)} 
                className={`menu-link ${catalogoAbierto ? 'catalogo-desplegado-azul' : ''}`}
                style={{ flex: 1, textAlign: 'left', paddingRight: 0 }} /* Ocupa el espacio izquierdo sin empujar el icono */
              >
                CATÁLOGO {catalogoAbierto ? '▴' : '▾'}
              </button>

              {/* ✨ NUEVO: Botón cuadrado de editar (Pop-up) adaptado al menú lateral */}
              <button 
                onClick={() => { setModalEditarAbierto(true); setMenuAbierto(false); }}
                style={{ 
                  width: '32px', /* Ligeramente más pequeño para el menú lateral */
                  height: '32px', 
                  backgroundColor: '#f2f2f7', 
                  border: 'none', 
                  borderRadius: '8px', 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </button>

            </div>
            
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

          {/* 👇 NUEVO BOTÓN DE MIS OUTFITS 👇 */}
          <button 
            onClick={() => { 
              setPantallaActual('outfits'); 
              setMenuAbierto(false); 
            }} 
            className={`menu-link ${pantallaActual === 'outfits' ? 'activo' : ''}`}
          >
            MIS OUTFITS
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

              {obtenerColoresDelArmario().map(colorObj => {
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

      {/* ✨ PANTALLA: MIS OUTFITS (Galería Dinámica) */}
      {/* ========================================== */}
      {pantallaActual === 'outfits' && (
        <div className="pantalla-outfits animate-fade-in" style={{ padding: '80px 20px 20px 20px', minHeight: '100dvh', boxSizing: 'border-box' }}>
          
          <h2 style={{ fontSize: '22px', fontWeight: '800', margin: '0 0 20px 0', color: '#111' }}>
            Mis Outfits
          </h2>
          
          {outfitsGuardados.length === 0 ? (
            <div style={{ textAlign: 'center', marginTop: '50px' }}>
              <p style={{ color: '#888', fontSize: '15px' }}>Aún no tienes ningún outfit guardado.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
              {outfitsGuardados.map(outfit => (
                <div key={outfit.id} style={{ display: 'flex', flexDirection: 'column' }}>
                  
                  {/* Tarjeta de Imagen o Boceto */}
                  <div style={{ width: '100%', aspectRatio: '1', borderRadius: '16px', overflow: 'hidden', backgroundColor: '#f4f4f5', border: '1px solid #e5e5ea', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    
                    {outfit.foto ? (
                      /* Si hay foto, ocupa todo el cuadrado */
                      <img src={outfit.foto} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={outfit.nombre} />
                    ) : (
                      /* Si no hay foto, generamos el MINIBOCETO escalando las físicas a 0.45x */
                      <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        {outfit.prendas.map((p, index) => (
                          <div key={p.idUnico} style={{
                            position: 'absolute',
                            /* Escala todo (posición y tamaño) a menos de la mitad para crear la miniatura */
                            transform: `translate(${p.x * 0.45}px, ${p.y * 0.45}px) scale(${p.escala * 0.45}) rotate(${p.rotacion}deg)`,
                            width: '110px', 
                            height: '110px',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            zIndex: index
                          }}>
                            <img src={p.imagen} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Nombre del outfit */}
                  <span style={{ marginTop: '10px', fontSize: '14px', fontWeight: '600', color: '#111', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {outfit.nombre}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================== */}
      {/* BOTONES FIJOS INFERIORES (Dependiendo de la pantalla) */}
      {/* ========================================== */}
      
      {/* 1. Botón para el ARMARIO */}
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

      {/* 2. Botón para los OUTFITS */}
      {pantallaActual === 'outfits' && !carruselFondosAbierto && !modalPerfilCompletoAbierto && (
        <div className="contenedor-fijo-boton-inferior">
          <button 
            className="btn-anadir-prenda-bottom-fixed" 
            style={{ backgroundColor: '#000', color: '#fff', border: 'none' }}
            onClick={() => {
              setCategoriaOutfitSeleccionada('Sudaderas');
              setModalCrearOutfitAbierto(true);
            }}
          >
            ＋ CREAR OUTFIT
          </button>
        </div>
      )}

      {/* ========================================== */}
      {/* ✨ MODAL: CREADOR DE OUTFITS (ANIMACIÓN Y LIENZO MAXIMIZADO) */}
      {/* ========================================== */}
      {modalCrearOutfitAbierto && (
        <div className="modal-overlay" style={{ 
          backdropFilter: 'blur(20px)', 
          WebkitBackdropFilter: 'blur(20px)', 
          backgroundColor: 'rgba(0, 0, 0, 0.45)', 
          display: 'flex',
          alignItems: 'center', 
          justifyContent: 'center',
          position: 'fixed', 
          top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 9999
        }}>
          <div className="modal-content animation-slide-up-fijo" style={{ 
            height: '85vh', 
            width: '85%',      
            maxWidth: '380px', 
            display: 'flex', 
            flexDirection: 'column', 
            padding: '0 0 20px 0', 
            borderRadius: '28px', 
            position: 'relative',
            backgroundColor: '#f4f4f5', 
            boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
            overflow: 'hidden',
            boxSizing: 'border-box'
          }}>

            {/* 1. CARRUSEL SUPERIOR (Subrayado animado "chulo") */}
            <div style={{ 
              backgroundColor: '#d1d1d6', 
              display: 'flex', 
              overflowX: 'auto', 
              gap: '18px', /* Más separación para que el texto respire */
              padding: '20px 20px 10px 20px', 
              scrollbarWidth: 'none', 
              flexShrink: 0, 
              WebkitOverflowScrolling: 'touch' 
            }}>
              {TODAS_CATEGORIAS.map(cat => (
                <button 
                  key={cat}
                  onClick={() => setCategoriaOutfitSeleccionada(cat)}
                  style={{
                    position: 'relative', /* 👈 Clave para la animación de la línea */
                    padding: '6px 4px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: categoriaOutfitSeleccionada === cat ? '#111111' : '#666666',
                    whiteSpace: 'nowrap',
                    fontWeight: '700',
                    fontSize: '12px',
                    cursor: 'pointer',
                    flexShrink: 0,
                    transition: 'color 0.3s ease'
                  }}
                >
                  {cat.toUpperCase()}
                  
                  {/* ✨ La línea gris oscura que se expande desde el centro */}
                  <div style={{
                    position: 'absolute',
                    bottom: '0',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    height: '2px',
                    backgroundColor: '#333333', /* Gris oscuro elegante */
                    borderRadius: '2px',
                    width: categoriaOutfitSeleccionada === cat ? '100%' : '0%', /* Magia de la animación */
                    transition: 'width 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)' /* Curva de aceleración muy fluida */
                  }} />
                </button>
              ))}
            </div>

            {/* 2. CARRUSEL INFERIOR (Ahora con función onClick para enviar al lienzo) */}
            <div style={{ 
              backgroundColor: '#e5e5ea', 
              display: 'flex', 
              overflowX: 'auto', 
              gap: '15px', 
              padding: '10px 20px 10px 20px', 
              scrollbarWidth: 'none', 
              borderBottom: '1px solid #c7c7cc', 
              flexShrink: 0, 
              minHeight: '100px' 
            }}>
              {prendas.filter(p => p.categoria === categoriaOutfitSeleccionada).length === 0 ? (
                <p style={{ color: '#888', margin: 'auto', fontSize: '13px', fontWeight: '500' }}>
                  Armario vacío
                </p>
              ) : (
                prendas.filter(p => p.categoria === categoriaOutfitSeleccionada).map(prenda => (
                  <div 
                    key={prenda.id} 
                    onClick={() => agregarPrendaAlLienzo(prenda)} /* 👈 AÑADIDO AQUÍ */
                    style={{ flexShrink: 0, width: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}
                  >
                    <div style={{ width: '80px', height: '80px', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#fff', border: '1px solid #d1d1d6', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                      <img src={prenda.imagen} alt={prenda.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {/* 3. ZONA DEL LIENZO (El motor de físicas interactivo) */}
            <div 
              /* Si tocas el fondo blanco, se deselecciona la prenda */
              onClick={() => setIdSeleccionado(null)} 
              style={{ 
                flex: '1 1 auto', 
                backgroundColor: '#ffffff', 
                margin: '10px 20px 20px 20px', 
                borderRadius: '20px', 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                border: '2px dashed #b0b0b5', 
                position: 'relative', 
                minHeight: '150px',
                overflow: 'hidden', 
                touchAction: 'none' 
              }}
            >
              
              {/* ✨ NUEVO: CONTROLES DE CAPAS (Aparecen al tocar una prenda) */}
              {idSeleccionado && prendasLienzo.find(p => p.idUnico === idSeleccionado) && (
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  display: 'flex',
                  gap: '8px',
                  zIndex: 99 /* Siempre por encima de la ropa */
                }}>
                  <button 
                    onClick={(e) => { e.stopPropagation(); enviarAlFondo(idSeleccionado); }}
                    style={{ background: 'rgba(30, 30, 30, 0.7)', color: '#fff', border: 'none', borderRadius: '14px', padding: '8px 14px', fontSize: '12px', fontWeight: '600', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  >
                    ↓ Fondo
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); traerAlFrente(idSeleccionado); }}
                    style={{ background: 'rgba(30, 30, 30, 0.7)', color: '#fff', border: 'none', borderRadius: '14px', padding: '8px 14px', fontSize: '12px', fontWeight: '600', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  >
                    ↑ Frente
                  </button>
                </div>
              )}

              {/* Papelera Animada Flotante */}
              <div style={{
                position: 'absolute',
                bottom: '15px',
                left: '15px',
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                backgroundColor: prendaEnZonaBorrado ? '#ff3b30' : '#f2f2f7',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                transition: 'all 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                transform: (idArrastrando ? 'scale(1)' : 'scale(0.5)') + (prendaEnZonaBorrado ? ' scale(1.15)' : ''),
                opacity: idArrastrando ? (prendaEnZonaBorrado ? 1 : 0.6) : 0, 
                zIndex: 99,
                boxShadow: prendaEnZonaBorrado ? '0 10px 20px rgba(255, 59, 48, 0.35)' : 'none'
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={prendaEnZonaBorrado ? '#ffffff' : '#8e8e93'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'stroke 0.3s' }}>
                  <path d="M3 6h18"></path>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
              </div>

              {/* Mensaje cuando está vacío */}
              {prendasLienzo.length === 0 && (
                <span style={{ color: '#a1a1aa', fontSize: '14px', fontWeight: '500', textAlign: 'center', padding: '0 20px' }}>
                  Toca una prenda para añadirla aquí
                </span>
              )}

              {/* Bucle que dibuja todas las prendas */}
              {prendasLienzo.map((p, index) => (
                <div
                  key={p.idUnico}
                  onTouchStart={(e) => handleTouchStartPrenda(e, p.idUnico)}
                  onTouchMove={(e) => handleTouchMovePrenda(e, p.idUnico)}
                  onTouchEnd={(e) => handleTouchEndPrenda(e, p.idUnico)}
                  style={{
                    position: 'absolute',
                    transform: `translate(${p.x}px, ${p.y}px) scale(${p.escala}) rotate(${p.rotacion}deg)`,
                    width: '110px', 
                    height: '110px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    /* 👈 MAGIA AQUÍ: El zIndex usa el orden del array a menos que lo estés arrastrando */
                    zIndex: idArrastrando === p.idUnico ? 50 : index,
                    /* Si está seleccionada, le ponemos un bordecito sutil para que el usuario sepa cuál va a mover de capa */
                    border: idSeleccionado === p.idUnico && !idArrastrando ? '1px dashed rgba(0,0,0,0.15)' : '1px solid transparent',
                    borderRadius: '12px'
                  }}
                >
                  <img 
                    src={p.imagen} 
                    style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }} 
                  />
                </div>
              ))}
            </div>

            {/* 4. BOTONES INFERIORES */}
            <div style={{ padding: '0 20px', flexShrink: 0, display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => {
                  setModalCrearOutfitAbierto(false); /* 1. Cierra la ventana */
                  setPrendasLienzo([]);              /* 2. 🧹 Vacía el lienzo de ropa */
                  setCategoriaOutfitSeleccionada('Sudaderas'); /* 3. (Opcional) Reinicia el carrusel a la primera pestaña */
                }} 
                style={{ 
                  flex: '1', 
                  padding: '14px', 
                  backgroundColor: '#ffe8e8', 
                  color: '#ff5252',           
                  border: 'none', 
                  borderRadius: '16px', 
                  fontWeight: '700', 
                  fontSize: '14px', 
                  cursor: 'pointer' 
                }}
              >
                Cancelar
              </button>
              <button 
                onClick={() => setModalGuardarAbierto(true)}
                disabled={prendasLienzo.length === 0} /* 👈 Se desactiva si el lienzo está vacío */
                style={{ 
                  flex: '1.5', 
                  padding: '14px', 
                  backgroundColor: prendasLienzo.length === 0 ? '#d1d1d6' : '#007aff', 
                  color: '#ffffff', 
                  border: 'none', 
                  borderRadius: '16px', 
                  fontWeight: '700', 
                  fontSize: '14px',
                  cursor: prendasLienzo.length === 0 ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.3s'
                }}
              >
                Guardar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* ✨ MODAL: DETALLES DEL OUTFIT (CORREGIDO) */}
      {/* ========================================== */}
      {modalGuardarAbierto && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000 }}>
          
          <div className="modal-content animation-slide-up-fijo" style={{ 
            width: '85%', 
            maxWidth: '340px', 
            backgroundColor: '#ffffff', 
            borderRadius: '24px', 
            padding: '24px', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '15px', 
            boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
            boxSizing: 'border-box', /* 👈 Evita que el padding genere scroll horizontal */
            overflow: 'hidden'
          }}>
            
            <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', fontWeight: '800', color: '#111', textAlign: 'center' }}>Guardar Outfit</h3>
            
            {/* Input para el Nombre (Fondo gris claro, Texto oscuro) */}
            <input 
              type="text" 
              placeholder="Ej: Cena de viernes..." 
              value={nombreOutfitTemp}
              onChange={(e) => setNombreOutfitTemp(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '14px', 
                borderRadius: '12px', 
                border: '1px solid #d1d1d6', 
                backgroundColor: '#f2f2f7', 
                color: '#111111', /* 👈 TEXTO VISIBLE */
                fontSize: '15px', 
                fontWeight: '500',
                outline: 'none', 
                boxSizing: 'border-box' 
              }}
              autoFocus
            />

            {/* Input oculto y Caja táctil para la Foto */}
            <label style={{ width: '100%', height: '140px', borderRadius: '12px', border: '2px dashed #d1d1d6', backgroundColor: '#fafafa', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', overflow: 'hidden', position: 'relative' }}>
              {fotoOutfitTemp ? (
                <img src={fotoOutfitTemp} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Preview" />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                  <span style={{ color: '#8e8e93', fontSize: '13px', fontWeight: '500' }}>+ Añadir foto (Opcional)</span>
                </div>
              )}
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { if(e.target.files[0]) setFotoOutfitTemp(URL.createObjectURL(e.target.files[0])) }} />
            </label>

            {/* Botones de acción (Optimizados para pulgares) */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
              <button onClick={() => setModalGuardarAbierto(false)} style={{ 
                flex: 1, 
                minHeight: '50px', /* 👈 Más alto para clics móviles */
                padding: '0', 
                borderRadius: '14px', 
                border: 'none', 
                backgroundColor: '#f2f2f7', 
                color: '#111', 
                fontWeight: '600', 
                fontSize: '14px', 
                cursor: 'pointer',
                touchAction: 'manipulation' /* 👈 Fuerza el clic instantáneo sin retrasos */
              }}>
                Volver
              </button>
              <button onClick={guardarOutfitDefinitivo} disabled={!nombreOutfitTemp.trim()} style={{ 
                flex: 1.5, 
                minHeight: '50px', /* 👈 Más alto para clics móviles */
                padding: '0', 
                borderRadius: '14px', 
                border: 'none', 
                backgroundColor: !nombreOutfitTemp.trim() ? '#a1a1aa' : '#111', 
                color: '#fff', 
                fontWeight: '600', 
                fontSize: '14px', 
                cursor: !nombreOutfitTemp.trim() ? 'not-allowed' : 'pointer', 
                transition: 'all 0.2s',
                touchAction: 'manipulation' /* 👈 Fuerza el clic instantáneo */
              }}>
                Confirmar
              </button>
            </div>

          </div>
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

      {/* 🖼️ POPUP CANVAS: HERRAMIENTA LAZO (SILUETA) */}
      {modalCanvasAbierto && prendaRecienGuardada && (
        <div className="modal-overlay modal-blur-premium" style={{ zIndex: 10000 }}>
          <div className="modal-content animation-pop-in" style={{ 
              width: '95%', maxWidth: '440px', padding: '16px', borderRadius: '24px',  
              backgroundColor: '#fff', boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
              position: 'relative', overflow: 'hidden'     
          }}>
            <h3 style={{ margin: '0 0 5px 0', textAlign: 'center', fontSize: '18px' }}>Extraer prenda</h3>
            
            <p style={{ textAlign: 'center', fontSize: '12px', color: '#666', marginBottom: '15px' }}>
              {recorteHecho 
                ? "¡Listo! ¿Te gusta cómo ha quedado?" 
                : "Dibuja un borde alrededor de la prenda sin levantar el dedo."}
            </p>

            {/* ZONA DEL LIENZO DIBUJABLE */}
            <div style={{ 
              width: '100%', height: '400px', borderRadius: '16px', overflow: 'hidden', 
              backgroundColor: '#f5f5f5', border: '1px solid #eaeaea', marginBottom: '20px',
              position: 'relative',
              backgroundImage: 'repeating-linear-gradient(45deg, #ddd 25%, transparent 25%, transparent 75%, #ddd 75%, #ddd), repeating-linear-gradient(45deg, #ddd 25%, #fff 25%, #fff 75%, #ddd 75%, #ddd)',
              backgroundPosition: '0 0, 10px 10px',
              backgroundSize: '20px 20px'
            }}>
              <canvas 
                ref={canvasBorradorRef}
                style={{ width: '100%', height: '100%', touchAction: 'none', cursor: 'crosshair' }}
                
                // EVENTOS DE DIBUJO CON TOLERANCIA (POINTER CAPTURE)
                onPointerDown={(e) => {
                  if (recorteHecho) return;
                  setEstaDibujando(true);
                  e.target.setPointerCapture(e.pointerId); // Secuestra el puntero

                  const canvas = canvasBorradorRef.current;
                  const rect = canvas.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const y = e.clientY - rect.top;
                  
                  puntosSiluetaRef.current = [{x, y}];
                  const ctx = canvas.getContext('2d');
                  ctx.beginPath();
                  ctx.moveTo(x, y);
                }}
                onPointerMove={(e) => {
                  if (!estaDibujando || recorteHecho) return;
                  const canvas = canvasBorradorRef.current;
                  const rect = canvas.getBoundingClientRect();
                  
                  const x = e.clientX - rect.left;
                  const y = e.clientY - rect.top;
                  
                  puntosSiluetaRef.current.push({x, y});
                  
                  const ctx = canvas.getContext('2d');
                  ctx.lineWidth = 3;
                  ctx.lineCap = 'round';
                  ctx.strokeStyle = '#2980b9'; 
                  ctx.lineTo(x, y);
                  ctx.stroke();
                }}
                onPointerUp={(e) => {
                  if (!estaDibujando) return;
                  setEstaDibujando(false);
                  e.target.releasePointerCapture(e.pointerId); // Libera el puntero
                  aplicarRecorteSilueta(); 
                }}
              />
            </div>

            {/* 🔘 BOTONERA INFERIOR */}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
              <button 
                className="btn-cerrar-modal-formulario" 
                style={{ flex: 1, margin: 0 }}
                onClick={() => {
                  if (recorteHecho) {
                    restaurarImagenLienzo(); // Rehacer recorte
                  } else {
                    setModalCanvasAbierto(false);
                    setPrendaRecienGuardada(null); // Omitir recorte
                  }
                }}
              >
                {recorteHecho ? 'Rehacer' : 'Omitir'}
              </button>

              <button 
                className="btn-guardar-modal-formulario" 
                style={{ flex: 1, margin: 0 }}
                onClick={() => {
                  if (recorteHecho) {
                    // Extrae el png transparente y lo pone en el formulario
                    const imagenRecortada = canvasBorradorRef.current.toDataURL('image/png'); 
                    setFormImagen(imagenRecortada); 
                  }
                  setModalCanvasAbierto(false);
                  setPrendaRecienGuardada(null);
                }}
              >
                {recorteHecho ? 'Aceptar Recorte' : 'Dejar Original'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}