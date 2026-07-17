import React, { useState, useEffect, useRef, useMemo } from 'react';
import './App.css';

import { db, auth, provider } from './firebase'; 
import { subirBase64AStorage } from './utils/imagenes';
import { AVATAR_POR_DEFECTO } from './utils/avatar';
import { useAuth } from './hooks/useAuth';
import { useSocial } from './hooks/useSocial';
import { useTema } from './hooks/useTema';
import { useToast } from './hooks/useToast';
import { ToastContainer } from './components/ToastContainer';
import { AnimacionRacha } from './components/AnimacionRacha';
import { MenuLateral } from './components/MenuLateral';
import { ModalWishlistGrande } from './components/ModalWishlistGrande';
import { ModalNuevaPrenda } from './components/ModalNuevaPrenda';
import { ModalOutfitGrande } from './components/ModalOutfitGrande';
import { ModalPrendaGrande } from './components/ModalPrendaGrande';
import { ModalEditarCategorias } from './components/ModalEditarCategorias';
import { ModalConfirmacionBorrado } from './components/ModalConfirmacionBorrado';
import { PantallaWishlist } from './components/PantallaWishlist';
import { ModalLienzoOutfit } from './components/ModalLienzoOutfit';
import { ModalPerfilCompleto } from './components/ModalPerfilCompleto';
import { PantallaArmario } from './components/PantallaArmario';
import { PantallaOutfits } from './components/PantallaOutfits';
import { PantallaInicio } from './components/PantallaInicio';
import { SelectorFoto } from './components/SelectorFoto';
import { useCalendario } from './hooks/useCalendario';
import { useCategoriasActivas } from './hooks/useCategoriasActivas';
import { useFondos } from './hooks/useFondos';
import { useOutfits } from './hooks/useOutfits';
import { usePrendas } from './hooks/usePrendas';
import { useWishlist } from './hooks/useWishlist';

import { doc, setDoc } from 'firebase/firestore';

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

// 📈 MOTOR DE CRECIMIENTO: Calcula cuántas prendas has añadido en los últimos 6 meses
const obtenerDatosCrecimiento = (prendasArr) => {
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const ultimosMeses = [];
  const hoy = new Date();

  // 1. Preparamos el calendario de los últimos 6 meses (ej: de Febrero a Julio)
  for (let i = 5; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    ultimosMeses.push({ 
      name: meses[d.getMonth()], 
      año: d.getFullYear(), 
      Nuevas: 0  // Empezamos con 0 prendas
    });
  }

  // 2. Revisamos todo tu armario y sumamos cada prenda a su mes correspondiente
  (prendasArr || []).forEach(p => {
    if (p.creadoEn) {
      const fecha = new Date(p.creadoEn);
      const mesPrenda = meses[fecha.getMonth()];
      const añoPrenda = fecha.getFullYear();
      
      const mesEncontrado = ultimosMeses.find(m => m.name === mesPrenda && m.año === añoPrenda);
      if (mesEncontrado) {
        mesEncontrado.Nuevas += 1;
      }
    }
  });

  return ultimosMeses;
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

  // Convertimos el objeto, lo ORDENAMOS y lo CORTAMOS a 12 máximo
  const datosMapeados = Object.keys(conteo)
    .map(key => ({
      subject: key,
      A: conteo[key],
      fullMark: 15
    }))
    .sort((a, b) => b.A - a.A) // 👈 Ordena de la marca más usada a la menos usada
    .slice(0, 12);             // 👈 Se queda estrictamente con el Top 12

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
  const { toasts, mostrarToast, cerrarToast } = useToast();
  const { usuario, setUsuario, cargandoAuth, loginConGoogle, logout } = useAuth();
  const { tema, cambiarTema } = useTema(usuario);

  const [modoSeleccion, setModoSeleccion] = useState(false);
  const [prendasSeleccionadas, setPrendasSeleccionadas] = useState([]);

  const { prendas, cargandoPrendas, addPrenda, deletePrendas } = usePrendas(usuario);

  // 📊 ESTADÍSTICAS: memoizadas para que NO se recalculen en cada render,
  // solo cuando "prendas" realmente cambia. Antes estas 5 funciones se
  // ejecutaban recorriendo todo el armario en CADA render del componente
  // (por ejemplo, al escribir en cualquier input), aunque las prendas no
  // hubieran cambiado.
  const datosColores = useMemo(() => obtenerDatosColores(prendas), [prendas]);
  const datosPrendas = useMemo(() => obtenerDatosPrendas(prendas), [prendas]);
  const datosMarcas = useMemo(() => obtenerDatosMarcas(prendas), [prendas]);
  const datosCrecimiento = useMemo(() => obtenerDatosCrecimiento(prendas), [prendas]);
  const datosEstaciones = useMemo(() => obtenerDatosEstaciones(prendas), [prendas]);

  const { categoriasActivas, toggleCategoriaFiltro, activarCategoria } = useCategoriasActivas(
    usuario,
    ['Sudaderas', 'Tops', 'Camisetas', 'Pantalones largos', 'Pantalones cortos', 'Gorras', 'Zapato cerrado', 'Zapato abierto'],
    TODAS_CATEGORIAS
  );

  // REFERENCIAS Y ESTADOS PARA LA FOTO DE PERFIL
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  const [filtro, setFiltro] = useState('Todos');
  const [filtroColorPadre, setFiltroColorPadre] = useState('Todos');
  const [filtroMarca, setFiltroMarca] = useState('Todos');

  // ==========================================
  // 📅 ESTADOS Y PERSISTENCIA PARA EL CALENDARIO
  // ==========================================
  const [calendarioAbierto, setCalendarioAbierto] = useState(false);
  const [fechaNavegacion, setFechaNavegacion] = useState(new Date()); 
  
  // 📅 Calendario + racha: ahora gestionados por useCalendario()
  const { outfitsCalendario, rachaReal, guardarDiaCalendario } = useCalendario(usuario);

  const [diaCalendarioSeleccionado, setDiaCalendarioSeleccionado] = useState(null);
  const [fotoBorrador, setFotoBorrador] = useState(null); 
  const [animacionRacha, setAnimacionRacha] = useState(null);

  const handleSubirFotoCalendario = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;

      img.onload = () => {
        // 🛠️ MOTOR DE COMPRESIÓN (antes esto no existía: se guardaba
        // la foto tal cual salía del móvil, sin comprimir en absoluto)
        const canvas = document.createElement('canvas');
        const maxAncho = 600;
        const proporcion = img.height / img.width;

        canvas.width = maxAncho;
        canvas.height = maxAncho * proporcion;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const fotoComprimida = canvas.toDataURL('image/jpeg', 0.7);
        setFotoBorrador(fotoComprimida);
      };
    };
  };

  // ✋ MOTOR DE GESTOS (SWIPE) PARA EL CALENDARIO
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);

  const onTouchStartCalendario = (e) => {
    touchEndX.current = null; // Reseteamos el final del toque anterior
    touchStartX.current = e.targetTouches[0].clientX; // Guardamos dónde pulsó
  };

  const onTouchMoveCalendario = (e) => {
    touchEndX.current = e.targetTouches[0].clientX; // Actualizamos mientras arrastra
  };

  const onTouchEndCalendario = (irAnterior, irSiguiente) => {
    if (!touchStartX.current || !touchEndX.current) return;
    
    const distancia = touchStartX.current - touchEndX.current;
    const umbralSwipe = 50; // Mínimo de píxeles que debe arrastrar para que cuente
    
    if (distancia > umbralSwipe) {
      // Deslizó hacia la izquierda <- (Mes siguiente)
      irSiguiente();
    } else if (distancia < -umbralSwipe) {
      // Deslizó hacia la derecha -> (Mes anterior)
      irAnterior();
    }
  };

  const guardarCambiosCalendario = async () => {
    if (diaCalendarioSeleccionado && fotoBorrador && usuario) {
      try {
        let fotoFinal = fotoBorrador;
        if (fotoFinal.startsWith('data:')) {
          fotoFinal = await subirBase64AStorage(fotoFinal, 'calendario', usuario.uid);
        }

        const { nuevaRacha, esHoy } = await guardarDiaCalendario(diaCalendarioSeleccionado.fecha, fotoFinal);

        if (esHoy && nuevaRacha > 0) {
          setAnimacionRacha(nuevaRacha);
          setTimeout(() => setAnimacionRacha(null), 4000);
        }

        setDiaCalendarioSeleccionado(null);
        setFotoBorrador(null);
        mostrarToast('Outfit del día guardado', 'exito');
      } catch (error) {
        console.error('Error al guardar el outfit del día:', error);
        mostrarToast('No se pudo guardar en la nube. Revisa tu conexión e inténtalo de nuevo.', 'error');
      }
    }
  };

  // ⏱️ REFERENCIAS PARA EL LONG PRESS (MANTENER PULSADO)
  const temporizadorLongPress = useRef(null);
  const esLongPress = useRef(false);

  // 🟢 ESTADOS Y REFS PARA SELECCIONAR OUTFITS
  const [modoSeleccionOutfit, setModoSeleccionOutfit] = useState(false);
  const [outfitsSeleccionados, setOutfitsSeleccionados] = useState([]);
  const [modalConfirmacionBorradoOutfit, setModalConfirmacionBorradoOutfit] = useState(false);

  const temporizadorLongPressOutfit = useRef(null);
  const esLongPressOutfit = useRef(false);

  const [modoSeleccionFondo, setModoSeleccionFondo] = useState(false);
  const [fondosSeleccionados, setFondosSeleccionados] = useState([]);
  const [modalConfirmacionBorradoFondo, setModalConfirmacionBorradoFondo] = useState(false);

  const temporizadorLongPressFondo = useRef(null);
  const esLongPressFondo = useRef(false);

  // 🧥 OUTFITS: ahora gestionados por useOutfits()
  const { outfitsGuardados, cargandoOutfits, guardarOutfit, deleteOutfits } = useOutfits(usuario);

  // (Mantienes el resto igual)
  const [modalGuardarAbierto, setModalGuardarAbierto] = useState(false);
  const [nombreOutfitTemp, setNombreOutfitTemp] = useState('');
  const [fotoOutfitTemp, setFotoOutfitTemp] = useState(null);
  const [outfitAEditar, setOutfitAEditar] = useState(null);

  // 👗 ESTADO PARA VISUALIZAR TUS OUTFITS EN GRANDE
  const [miOutfitSeleccionado, setMiOutfitSeleccionado] = useState(null);

  const [modalConfirmacionBorrado, setModalConfirmacionBorrado] = useState(false);

  // 👥 SOCIAL: ahora gestionado por useSocial() con datos reales de Firestore
  const {
    amigos,
    solicitudesRecibidas,
    solicitudesEnviadas,
    cargandoSocial,
    buscarUsuarios,
    enviarSolicitud,
    aceptarSolicitud,
    rechazarSolicitud,
    dejarDeSeguir,
    cargarOutfitsDeAmigo,
  } = useSocial(usuario);

  // 📥 ESTADOS PARA BUZÓN Y DEJAR DE SEGUIR
  const [buzonAbierto, setBuzonAbierto] = useState(false);
  const [amigoADejarDeSeguir, setAmigoADejarDeSeguir] = useState(null);

  const confirmarDejarDeSeguir = async () => {
    if (!amigoADejarDeSeguir) return;
    try {
      await dejarDeSeguir(amigoADejarDeSeguir.id);
      mostrarToast(`Has dejado de seguir a ${amigoADejarDeSeguir.displayName || 'este usuario'}`, 'exito');
    } catch (error) {
      console.error('Error al dejar de seguir:', error);
      mostrarToast('No se pudo completar la acción. Inténtalo de nuevo.', 'error');
    } finally {
      setAmigoADejarDeSeguir(null);
    }
  };

  const [idSeleccionado, setIdSeleccionado] = useState(null);

  // 📸 FONDOS: ahora gestionados por useFondos()
  const { todosLosFondos, fondoPantalla, cambiarFondo, agregarFondoPersonal, borrarFondos } =
    useFondos(usuario, FONDOS_DISPONIBLES);

  // Comprime el fondo personalizado antes de guardarlo. Es el arreglo
  // más urgente de los tres: este campo ("fondos") vive dentro del
  // mismo documento que tu perfil — el mismo que acabamos de arreglar
  // para el calendario. Sin comprimir, un par de fondos sin comprimir
  // volverían a hacer que ese documento superase el 1MB.
  const handleAgregarFondoPersonal = (file) => {
    if (!file || !usuario) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;

      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const maxAncho = 800; // un poco más grande porque es fondo de pantalla completo
        const proporcion = img.height / img.width;

        canvas.width = maxAncho;
        canvas.height = maxAncho * proporcion;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const fondoComprimido = canvas.toDataURL('image/jpeg', 0.7);

        try {
          const urlFondo = await subirBase64AStorage(fondoComprimido, 'fondos', usuario.uid);
          await agregarFondoPersonal(urlFondo);
          mostrarToast('Fondo añadido', 'exito');
        } catch (error) {
          console.error('Error al subir el fondo:', error);
          mostrarToast('No se pudo subir el fondo. Inténtalo de nuevo.', 'error');
        }
      };
    };
  };

  const [menuAbierto, setMenuAbierto] = useState(false);
  const [catalogoAbierto, setCatalogoAbierto] = useState(false); 

  // ESTADOS PARA EL LIENZO DEL OUTFIT
  const [prendasLienzo, setPrendasLienzo] = useState([]);
  const [idArrastrando, setIdArrastrando] = useState(null);
  const [offsetArrastre, setOffsetArrastre] = useState({ x: 0, y: 0 });
  const [gestoInicial, setGestoInicial] = useState({ distancia: 0, angulo: 0, escala: 1, rotacion: 0 });

  const [perfilTab, setPerfilTab] = useState('perfil'); // 'perfil', 'social' o 'fondo'

  const [prendaEnZonaBorrado, setPrendaEnZonaBorrado] = useState(false);
  // ESTADOS PARA EL CREADOR DE OUTFITS
  const [modalCrearOutfitAbierto, setModalCrearOutfitAbierto] = useState(false);
  const [categoriaOutfitSeleccionada, setCategoriaOutfitSeleccionada] = useState('Sudaderas');

  const [pantallaActual, setPantallaActual] = useState('inicio'); 

  const [seccionRopaExpandida, setSeccionRopaExpandida] = useState(true); 
  const [seccionAccesoriosExpandida, setSeccionAccesoriosExpandida] = useState(false);

  const [modalPerfilCompletoAbierto, setModalPerfilCompletoAbierto] = useState(false);
  const [graficoExpandido, setGraficoExpandido] = useState(null);

  // 🖱️ DETECCIÓN DE CLIC FUERA (Buscador y Buzón)
  const [resultadosVisibles, setResultadosVisibles] = useState(false);
  const buscadorRef = useRef(null);
  const buzonRef = useRef(null);

  useEffect(() => {
    const handleClickFuera = (event) => {
      // Si hacemos clic fuera de la caja del buscador, ocultamos los resultados
      if (buscadorRef.current && !buscadorRef.current.contains(event.target)) {
        setResultadosVisibles(false);
      }
      // Si hacemos clic fuera de la caja del buzón, lo cerramos
      if (buzonRef.current && !buzonRef.current.contains(event.target)) {
        setBuzonAbierto(false);
      }
    };

    // Activamos el "escucha" de clics en toda la página
    document.addEventListener('mousedown', handleClickFuera);
    
    // Limpieza al desmontar
    return () => {
      document.removeEventListener('mousedown', handleClickFuera);
    };
  }, []);

  const [menuPerfilAbierto, setMenuPerfilAbierto] = useState(false);

  const [carruselFondosAbierto, setCarruselFondosAbierto] = useState(false);

  const [modalEditarAbierto, setModalEditarAbierto] = useState(false);
  const [modalNuevaPrendaAbierto, setModalNuevaPrendaAbierto] = useState(false);
  
  const [prendaAEditar, setPrendaAEditar] = useState(null);

  // 👥 ESTADOS PARA LA SECCIÓN SOCIAL
  const [busquedaSocial, setBusquedaSocial] = useState('');
  const [usuariosFiltrados, setUsuariosFiltrados] = useState([]);
  const [buscandoUsuarios, setBuscandoUsuarios] = useState(false);

  // Búsqueda real de usuarios en Firestore (antes era un filtro sobre
  // una lista de 4 usuarios inventados). Con un pequeño debounce de
  // 350ms para no lanzar una consulta nueva en cada tecla que pulsas.
  useEffect(() => {
    if (!busquedaSocial.trim()) {
      setUsuariosFiltrados([]);
      setBuscandoUsuarios(false);
      return;
    }

    let cancelado = false;
    setBuscandoUsuarios(true);

    const idTimeout = setTimeout(async () => {
      const resultados = await buscarUsuarios(busquedaSocial);
      if (!cancelado) {
        setUsuariosFiltrados(resultados);
        setBuscandoUsuarios(false);
      }
    }, 350);

    return () => {
      cancelado = true;
      clearTimeout(idTimeout);
    };
  }, [busquedaSocial, buscarUsuarios]);

  // ESTADOS Y REFS PARA EL MENÚ DE AÑADIR PRENDA

  // ✨ ESTADOS DE LA WISHLIST
  const { wishlist, cargandoWishlist, addWishlistItem, updateWishlistItem, deleteWishlistItems } = useWishlist(usuario);
  const [modalWishlistAbierto, setModalWishlistAbierto] = useState(false);
  // 👇 Añadido 'precio' al estado inicial
  const [formWishlist, setFormWishlist] = useState({ foto: null, nombre: '', marca: '', color: '', link: '', precio: '' });
  const [wishlistAEditar, setWishlistAEditar] = useState(null);

  // Filtros y Selección de Wishlist
  const [filtroMarcaWishlist, setFiltroMarcaWishlist] = useState('Todos');
  const [modoSeleccionWishlist, setModoSeleccionWishlist] = useState(false);
  const [wishlistSeleccionadaMulti, setWishlistSeleccionadaMulti] = useState([]);
  const [modalConfirmacionBorradoWishlist, setModalConfirmacionBorradoWishlist] = useState(false);
  const [wishlistSeleccionadaGrande, setWishlistSeleccionadaGrande] = useState(null);

  // Referencias para el toque prolongado (Long Press)
  const temporizadorLongPressWishlist = useRef(null);
  const esLongPressWishlist = useRef(false);

  // Funciones Matemáticas de Wishlist
  const obtenerMarcasWishlist = () => {
    const listaMarcas = wishlist.map(p => p.marca).filter(Boolean);
    return ['Todos', ...new Set(listaMarcas)];
  };

  const wishlistFiltrada = wishlist.filter(item =>
    filtroMarcaWishlist === 'Todos' || (item.marca && item.marca.toLowerCase() === filtroMarcaWishlist.toLowerCase())
  );

  const toggleSeleccionarWishlist = (id) => {
    setWishlistSeleccionadaMulti(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const cancelarSeleccionWishlist = () => {
    setModoSeleccionWishlist(false);
    setWishlistSeleccionadaMulti([]);
  };

  const iniciarLongPressWishlist = (id) => {
    esLongPressWishlist.current = false;
    temporizadorLongPressWishlist.current = setTimeout(() => {
      esLongPressWishlist.current = true;
      setModoSeleccionWishlist(true);
      setWishlistSeleccionadaMulti(prev => prev.includes(id) ? prev : [...prev, id]);
      if (navigator.vibrate) navigator.vibrate(50);
    }, 500);
  };

  const cancelarLongPressWishlist = () => {
    if (temporizadorLongPressWishlist.current) clearTimeout(temporizadorLongPressWishlist.current);
  };

  const ejecutarBorradoDefinitivoWishlist = async () => {
    try {
      const cuantos = idsABorrar.length;
      await deleteWishlistItems(idsABorrar);
      
      setWishlistSeleccionadaMulti([]);
      setIdsABorrar([]); // Limpiamos el temporal
      setModoSeleccionWishlist(false);
      setModalConfirmacionBorradoWishlist(false);
      mostrarToast(cuantos === 1 ? 'Artículo eliminado de la wishlist' : `${cuantos} artículos eliminados de la wishlist`, 'exito');
    } catch (error) {
      console.error("Error al borrar:", error);
      mostrarToast('Hubo un error al eliminar de la wishlist. Inténtalo de nuevo.', 'error');
    }
};

  const manejarCambioMarcaWishlist = (texto) => {
    setFormWishlist({...formWishlist, marca: texto});
    if (texto.trim() === '') {
      setSugerenciasFiltradas([]);
    } else {
      const filtradas = MARCAS_SUGERIDAS.filter(marca => marca.toLowerCase().includes(texto.toLowerCase()));
      setSugerenciasFiltradas(filtradas);
    }
  };

  // Lee la foto elegida para un artículo de la wishlist (antes iba en línea, dentro del onChange)
  // Lee y comprime la foto elegida para un artículo de la wishlist
  // (antes no comprimía en absoluto, igual que le pasaba al calendario)
  const handleFotoWishlist = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxAncho = 600;
        const proporcion = img.height / img.width;

        canvas.width = maxAncho;
        canvas.height = maxAncho * proporcion;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const fotoComprimida = canvas.toDataURL('image/jpeg', 0.7);
        setFormWishlist((prev) => ({ ...prev, foto: fotoComprimida }));
      };
    };
  };

  const guardarPrendaWishlist = async () => {
    if (formWishlist.foto && formWishlist.nombre.trim() && usuario) {
      try {
        let datosAGuardar = formWishlist;

        // Si la foto es un Base64 recién elegido, la subimos a Storage y
        // guardamos solo la URL. Si estás editando y no la has tocado,
        // formWishlist.foto ya es una URL de Storage — no se vuelve a subir.
        if (formWishlist.foto.startsWith('data:')) {
          const urlFoto = await subirBase64AStorage(formWishlist.foto, 'wishlist', usuario.uid);
          datosAGuardar = { ...formWishlist, foto: urlFoto };
        }

        if (wishlistAEditar) {
          await updateWishlistItem(wishlistAEditar.id, datosAGuardar);
        } else {
          await addWishlistItem(datosAGuardar);
        }
        setModalWishlistAbierto(false);
        setWishlistAEditar(null);
        setFormWishlist({ foto: null, nombre: '', marca: '', link: '', precio: '' });
        mostrarToast(wishlistAEditar ? 'Artículo actualizado' : 'Añadido a tu wishlist', 'exito');
      } catch (error) {
        console.error("Error al guardar en la wishlist:", error);
        mostrarToast('No se pudo guardar. Inténtalo de nuevo.', 'error');
      }
    }
  };

  const abrirEdicionWishlistDesdeGrande = (item) => {
    setWishlistSeleccionadaGrande(null);
    setWishlistAEditar(item);
    setFormWishlist({
      foto: item.foto,
      nombre: item.nombre,
      marca: item.marca || '',
      link: item.link || '',
      precio: item.precio || '' // 👇 Recuperamos el precio al editar
    });
    setModalWishlistAbierto(true);
  };

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


  // ✨ Estado para saber a qué amigo hemos clicado, y sus outfits reales
  const [amigoSeleccionado, setAmigoSeleccionado] = useState(null);
  const [outfitsDeAmigoSeleccionado, setOutfitsDeAmigoSeleccionado] = useState([]);

  // Si el modal de un amigo está abierto y su perfil cambia (por ejemplo,
  // cambia su estilo o su foto), lo reflejamos aquí al instante, sin
  // que tengas que cerrar y volver a abrir su perfil.
  useEffect(() => {
    if (!amigoSeleccionado) return;
    const actualizado = amigos.find((a) => a.id === amigoSeleccionado.id);
    if (
      actualizado &&
      (actualizado.displayName !== amigoSeleccionado.displayName ||
        actualizado.photoURL !== amigoSeleccionado.photoURL ||
        actualizado.estiloArmario !== amigoSeleccionado.estiloArmario ||
        actualizado.estacionFavorita !== amigoSeleccionado.estacionFavorita)
    ) {
      setAmigoSeleccionado(actualizado);
    }
  }, [amigos, amigoSeleccionado]);

  useEffect(() => {
    if (!amigoSeleccionado) {
      setOutfitsDeAmigoSeleccionado([]);
      return;
    }
    let cancelado = false;
    cargarOutfitsDeAmigo(amigoSeleccionado.id).then((outfits) => {
      if (!cancelado) setOutfitsDeAmigoSeleccionado(outfits);
    });
    return () => { cancelado = true; };
  }, [amigoSeleccionado, cargarOutfitsDeAmigo]);

  const canvasBorradorRef = useRef(null);
  const imgPrendaRef = useRef(null);
  const puntosSiluetaRef = useRef([]); 
  const [estaDibujando, setEstaDibujando] = useState(false);
  const [recorteHecho, setRecorteHecho] = useState(false);

  const [idsABorrar, setIdsABorrar] = useState([]);

  const [prendaSeleccionadaGrande, setPrendaSeleccionadaGrande] = useState(null);

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

  // Comprime y guarda la foto de portada del outfit (antes iba en línea, dentro del onChange)
  const handleFotoOutfit = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;

      img.onload = () => {
        // 🛠️ MOTOR DE COMPRESIÓN PARA FIREBASE
        const canvas = document.createElement('canvas');
        const maxAncho = 500; // Lo dejamos a 500px, perfecto para la galería
        const proporcion = img.height / img.width;

        canvas.width = maxAncho;
        canvas.height = maxAncho * proporcion;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Guardamos en calidad 70% (pesará unos 60KB, ideal para Firebase)
        const fotoComprimida = canvas.toDataURL('image/jpeg', 0.7);
        setFotoOutfitTemp(fotoComprimida);
      };
    };
  };

  // Carga un outfit guardado en el lienzo para editarlo (llamado desde
  // el botón "Editar Outfit" de la vista en grande)
  // Abre el lienzo en blanco para crear un outfit nuevo (llamado desde
  // el botón "+ CREAR OUTFIT" de la pantalla de Outfits)
  const abrirCreadorOutfit = () => {
    setOutfitAEditar(null);
    setPrendasLienzo([]);
    setNombreOutfitTemp('');
    setFotoOutfitTemp(null);
    setCategoriaOutfitSeleccionada('Sudaderas');
    setModalCrearOutfitAbierto(true);
  };

  const editarOutfitDesdeGrande = (outfit) => {
    if (outfit.prendas && outfit.prendas.length > 0) {
      setPrendasLienzo(outfit.prendas);
      setNombreOutfitTemp(outfit.nombre || '');
      setFotoOutfitTemp(outfit.foto || null);
      setOutfitAEditar(outfit);
      setModalCrearOutfitAbierto(true);
      setMiOutfitSeleccionado(null);
    } else {
      mostrarToast('Este outfit solo tiene una foto guardada. No hay prendas individuales para editar en el lienzo.', 'aviso');
    }
  };

  const guardarOutfitDefinitivo = async () => {
    if (!nombreOutfitTemp.trim() || !usuario) return;
    
    try {
      let fotoFinal = fotoOutfitTemp;

      // Si hay foto de portada y es un Base64 recién generado, la subimos
      // a Storage. Si es null (outfit sin portada) o ya es una URL
      // (editando sin cambiar la foto), se deja tal cual.
      if (fotoFinal && fotoFinal.startsWith('data:')) {
        fotoFinal = await subirBase64AStorage(fotoFinal, 'outfits', usuario.uid);
      }

      const datosOutfit = {
        nombre: nombreOutfitTemp,
        foto: fotoFinal,
        prendas: prendasLienzo
      };

      await guardarOutfit(datosOutfit, outfitAEditar);
      
      setModalGuardarAbierto(false);
      setModalCrearOutfitAbierto(false);
      setPrendasLienzo([]);
      setNombreOutfitTemp('');
      setFotoOutfitTemp(null);
      setOutfitAEditar(null); // Reseteamos el modo edición
      mostrarToast(outfitAEditar ? 'Outfit actualizado' : 'Outfit guardado', 'exito');
    } catch (error) {
      console.error("Error al guardar en Firebase:", error);
      mostrarToast('Error al guardar. Inténtalo de nuevo.', 'error');
    }
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

  // El estado de abierto/cerrado del selector de foto ahora vive dentro
  // del propio componente <SelectorFoto>, que se desmonta solo cuando
  // se cierra el modal del perfil — no hace falta forzar nada aquí.

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
  
  // La sesión (usuario) la gestiona useAuth(), el calendario/racha
  // useCalendario(), los fondos useFondos(), y las categorías activas
  // useCategoriasActivas() — cada uno hidrata lo suyo internamente.
  // La wishlist, al ser una colección aparte, se carga con onSnapshot (useWishlist).

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

  const handleImagenPrenda = (archivo) => {
    if (!archivo) return;

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
      mostrarToast('No se pudo procesar la foto. Intenta con otra o comprueba los permisos.', 'aviso');
      URL.revokeObjectURL(imageUrl);
    };

    img.src = imageUrl;

    // 4. Reseteamos el input para que te deje volver a subir la misma foto si la borras
    event.target.value = '';
  };

  // Guarda un campo del formulario de perfil (nombre, estilo de armario,
  // estación favorita). Antes esta función se llamaba desde el modal de
  // perfil pero no existía en ningún sitio — escribir en esos campos
  // rompía con un error. Sigue el mismo patrón que el resto de la app:
  // actualización local optimista + guardado en Firebase + aviso si falla.
  const handleActualizarDatoPerfil = async (campo, valor) => {
    if (!usuario) return;
    setUsuario({ ...usuario, [campo]: valor });
    try {
      await setDoc(doc(db, 'usuarios', usuario.uid), { [campo]: valor }, { merge: true });
    } catch (error) {
      console.error(`Error al guardar ${campo}:`, error);
      mostrarToast('No se pudo guardar el cambio. Inténtalo de nuevo.', 'error');
    }
  };

  const cerrarSesionActiva = async () => {
    try {
      await logout();
      setPantallaActual('inicio');
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      mostrarToast('No se pudo cerrar sesión. Inténtalo de nuevo.', 'error');
    }
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


  // Envuelve loginConGoogle() para avisar con el mensaje correcto si
  // falla (bloqueado por estar en un WebView embebido, popup bloqueado
  // por el navegador, o cualquier otro error). Si el usuario simplemente
  // cierra la ventana de Google, loginConGoogle() no lanza nada y aquí
  // no pasa nada tampoco — no hace falta avisar de eso.
  const intentarLoginConGoogle = () => {
    loginConGoogle().catch((error) => {
      if (error.motivo === 'webview') {
        mostrarToast(error.message, 'aviso');
      } else if (error.motivo === 'popup-bloqueado') {
        mostrarToast('Tu navegador bloqueó la ventana de Google. Permite ventanas emergentes e inténtalo de nuevo.', 'error');
      } else {
        mostrarToast('No se pudo iniciar sesión con Google. Inténtalo de nuevo.', 'error');
      }
    });
  };

  const abrirModalCrear = () => {
    if (!usuario) {
      mostrarToast('Debes iniciar sesión para añadir prendas a tu armario.', 'aviso');
      intentarLoginConGoogle();
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

  const iniciarLongPress = (prenda) => {
    esLongPress.current = false; // Reseteamos el chivato
    
    temporizadorLongPress.current = setTimeout(() => {
      esLongPress.current = true;
      
      setModoSeleccion(true);
      
      setPrendasSeleccionadas(prev => {
        if (!prev.includes(prenda.id)) return [...prev, prenda.id];
        return prev;
      });

      if (navigator.vibrate) navigator.vibrate(50);
      
    }, 500); // 500 milisegundos = medio segundo
  };
  const cancelarLongPress = () => {
    if (temporizadorLongPress.current) {
      clearTimeout(temporizadorLongPress.current);
    }
  };

  const abrirEdicionDesdeGrande = (prenda) => {
    setPrendaSeleccionadaGrande(null); // Cerramos la vista grande
    
    // Preparamos el formulario (Lo que antes hacía el clic directo)
    setPrendaAEditar(prenda);
    setFormNombre(prenda.nombre);
    setFormCategoria(prenda.categoria);
    setFormMarca(prenda.marca || '');
    setFormColor(prenda.color);
    setFormColorPadre(prenda.colorPadre);
    setFormImagen(prenda.imagen);
    setSugerenciasFiltradas([]);
    setModalNuevaPrendaAbierto(true); // Abrimos el modo edición
  };

  const manejarClicPrenda = (prenda) => {
    if (esLongPress.current) {
      esLongPress.current = false;
      return; 
    }

    if (modoSeleccion) {
      toggleSeleccionarPrenda(prenda.id);
    } else {
      // ✨ AHORA ABRE LA VISTA EN GRANDE EN LUGAR DE EDITAR
      setPrendaSeleccionadaGrande(prenda);
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
      const cuantas = prendasSeleccionadas.length;
      await deletePrendas(prendasSeleccionadas);
      cancelarSeleccion();
      setFiltroMarca('Todos');
      setModalConfirmacionBorrado(false); // Cerramos el modal tras el éxito
      mostrarToast(cuantas === 1 ? 'Prenda eliminada' : `${cuantas} prendas eliminadas`, 'exito');
    } catch (error) {
      console.error("Error al borrar de Firebase:", error);
      mostrarToast('Hubo un error al eliminar. Inténtalo de nuevo.', 'error');
    }
  };

  // 👇 FUNCIONES DE SELECCIÓN Y BORRADO DE OUTFITS
  const toggleSeleccionarOutfit = (id) => {
    setOutfitsSeleccionados(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const cancelarSeleccionOutfit = () => {
    setModoSeleccionOutfit(false);
    setOutfitsSeleccionados([]);
  };

  const iniciarLongPressOutfit = (outfit) => {
    esLongPressOutfit.current = false;
    temporizadorLongPressOutfit.current = setTimeout(() => {
      esLongPressOutfit.current = true;
      setModoSeleccionOutfit(true);
      setOutfitsSeleccionados(prev => {
        if (!prev.includes(outfit.id)) return [...prev, outfit.id];
        return prev;
      });
      if (navigator.vibrate) navigator.vibrate(50);
    }, 500);
  };

  const cancelarLongPressOutfit = () => {
    if (temporizadorLongPressOutfit.current) clearTimeout(temporizadorLongPressOutfit.current);
  };

  const intentarEliminarSeleccionadosOutfits = () => {
    if (outfitsSeleccionados.length === 0) return;
    setModalConfirmacionBorradoOutfit(true);
  };

  const ejecutarBorradoDefinitivoOutfits = async () => {
    try {
      // 🔥 Ahora sí: Borramos cada outfit seleccionado de la colección 'outfits' en Firebase
      const cuantos = outfitsSeleccionados.length;
      await deleteOutfits(outfitsSeleccionados);
      
      cancelarSeleccionOutfit();
      setModalConfirmacionBorradoOutfit(false);
      mostrarToast(cuantos === 1 ? 'Outfit eliminado' : `${cuantos} outfits eliminados`, 'exito');
      
      // Nota: No hace falta hacer setOutfitsGuardados() a mano, porque tu onSnapshot
      // detectará el borrado en Firebase y actualizará la lista de tu pantalla automáticamente ✨
      
    } catch (error) {
      console.error("Error al borrar outfits de Firebase:", error);
      mostrarToast('Hubo un error al eliminar los outfits. Inténtalo de nuevo.', 'error');
    }
  };

  // 👇 FUNCIONES DE SELECCIÓN Y BORRADO DE FONDOS
  const toggleSeleccionarFondo = (id) => {
    setFondosSeleccionados(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const cancelarSeleccionFondo = () => {
    setModoSeleccionFondo(false);
    setFondosSeleccionados([]);
  };

  const iniciarLongPressFondo = (id) => {
    esLongPressFondo.current = false;
    temporizadorLongPressFondo.current = setTimeout(() => {
      esLongPressFondo.current = true;
      setModoSeleccionFondo(true);
      setFondosSeleccionados(prev => prev.includes(id) ? prev : [...prev, id]);
      if (navigator.vibrate) navigator.vibrate(50);
    }, 500);
  };

  const cancelarLongPressFondo = () => {
    if (temporizadorLongPressFondo.current) clearTimeout(temporizadorLongPressFondo.current);
  };

  const intentarEliminarSeleccionadosFondos = () => {
    if (fondosSeleccionados.length === 0) return;
    setModalConfirmacionBorradoFondo(true);
  };

  // 👇 FUNCIONES DE SELECCIÓN Y BORRADO DE FONDOS
  const ejecutarBorradoDefinitivoFondos = async () => {
    try {
      const cuantos = fondosSeleccionados.length;
      await borrarFondos(fondosSeleccionados);
      cancelarSeleccionFondo();
      setModalConfirmacionBorradoFondo(false);
      mostrarToast(cuantos === 1 ? 'Fondo eliminado' : `${cuantos} fondos eliminados`, 'exito');
    } catch (error) {
      console.error("Error al borrar fondos:", error);
      mostrarToast('No se pudieron eliminar los fondos. Inténtalo de nuevo.', 'error');
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

    let imagenFinal = formImagen || IMAGENES_POR_DEFECTO[formCategoria] || 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=300';
    const marcaFinal = formMarca.trim() ? formMarca.trim() : 'Sin Marca';

    try {
      // Si la imagen es un Base64 recién generado (empieza por "data:"),
      // la subimos a Storage y nos quedamos con su URL. Si ya es una URL
      // (por ejemplo, una imagen por defecto), la dejamos tal cual.
      if (imagenFinal.startsWith('data:') && usuario) {
        imagenFinal = await subirBase64AStorage(imagenFinal, 'prendas', usuario.uid);
      }

      const datosPrenda = {
        nombre: formNombre,
        categoria: formCategoria,
        marca: marcaFinal,
        color: formColor,
        colorPadre: formColorPadre,
        imagen: imagenFinal
      };

      await addPrenda(datosPrenda);
      
      if (typeof e !== 'undefined' && e.target) e.target.reset(); 

      if (!categoriasActivas.includes(formCategoria)) {
        activarCategoria(formCategoria);
      }
  
      // 🔥 Ahora el formulario simplemente se cierra y nos manda al Armario
      setModalNuevaPrendaAbierto(false);     
      setPrendaAEditar(null);
      setFiltro(formCategoria);
      setPantallaActual('armario');
      mostrarToast('Prenda guardada', 'exito');

    } catch (error) {
      console.error("Error al subir a Firebase:", error);
      mostrarToast('No se pudo guardar la prenda. Inténtalo de nuevo.', 'error');
    }
  };

  // FUNCIÓN PARA COMPRIMIR, PROCESAR Y GUARDAR LA FOTO EN BASE64
  const handleSubirFotoPerfil = async (archivo) => {
    if (!archivo) return;

    if (!auth.currentUser) {
      mostrarToast('Debes estar logueado para cambiar tu foto.', 'aviso');
      return;
    }

    try {
      setSubiendoFoto(true);

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
          const fotoComprimidaBase64 = canvas.toDataURL('image/jpeg', 0.7);

          try {
            // 6. Subimos la foto a Storage y guardamos solo su URL en Firestore
            const urlFoto = await subirBase64AStorage(fotoComprimidaBase64, 'perfil', auth.currentUser.uid);

            const usuarioRef = doc(db, "usuarios", auth.currentUser.uid);
            await setDoc(usuarioRef, { photoURL: urlFoto }, { merge: true });

            // 7. Actualizamos el estado visual de React al instante
            if (usuario) {
              setUsuario({ ...usuario, photoURL: urlFoto });
            }
            mostrarToast('Foto de perfil actualizada', 'exito');

          } catch (error) {
            console.error("Error al guardar la foto de perfil:", error);
            mostrarToast('Hubo un error al guardar la foto.', 'error');
          } finally {
            setSubiendoFoto(false); 
          }
        };

        img.onerror = () => {
          mostrarToast('No se pudo procesar la foto. Prueba con otra.', 'aviso');
          setSubiendoFoto(false);
        };
      };
    } catch (error) {
      console.error("Error general al procesar la imagen:", error);
      mostrarToast('No se pudo procesar la foto.', 'error');
      setSubiendoFoto(false);
    }
  };

  return (
    <div className="app-container">
      <ToastContainer toasts={toasts} onCerrar={cerrarToast} />
      
      {/* ==========================================
          ✨ PANTALLA DE BIENVENIDA / LOGIN
          A pantalla completa y opaca: no se ve la app detrás.
          ========================================== */}
      {!usuario && (
        <div className="pantalla-bienvenida">
          <div className="pantalla-bienvenida-contenido">

            <div className="pantalla-bienvenida-marca">
              <span className="pantalla-bienvenida-monograma">P</span>
              <h1>Planells</h1>
            </div>

            <p className="pantalla-bienvenida-tagline">
              Tu armario, organizado con calma.
            </p>

            <button className="btn-google-bienvenida" onClick={intentarLoginConGoogle}>
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                <path fill="#4285F4" d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7955 2.7164v2.2581h2.9087c1.7018-1.5668 2.6836-3.874 2.6836-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.4673-.806 5.9564-2.1805l-2.9087-2.2581c-.8059.54-1.8368.859-3.0477.859-2.344 0-4.3282-1.5831-5.036-3.7104H.9573v2.3318C2.4382 15.9832 5.4818 18 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.2822-1.1168-.2822-1.71s.1023-1.17.2823-1.71V4.9582H.9573C.3477 6.1727 0 7.5477 0 9s.3477 2.8273.9573 4.0418L3.964 10.71z"/>
                <path fill="#EA4335" d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C13.4632.8918 11.426 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.964 7.29C4.6718 5.1627 6.656 3.5795 9 3.5795z"/>
              </svg>
              Continuar con Google
            </button>

            <p className="pantalla-bienvenida-legal">
              Prendas, outfits y wishlist — todo en un mismo sitio.
            </p>

          </div>
        </div>
      )}
      {/* ========================================== */}

      {/* Barra Superior */}
      <div className="navbar-superior">
        <button className="menu-hamburguesa" onClick={() => setMenuAbierto(true)} aria-label="Abrir menú">
          ☰
        </button>
        
        <div className="navbar-centro-categoria-titulo">
          {pantallaActual === 'armario' && filtro.toUpperCase()}
          {pantallaActual === 'outfits' && 'MIS OUTFITS'}
          {pantallaActual === 'social' && 'SOCIAL'}
          
          {/* ✨ Añadimos la condición para Wishlist */}
          {pantallaActual === 'wishlist' && 'MI WISHLIST'}
          
          {/* Si no es ninguna de las anteriores, mostramos el valor por defecto */}
          {pantallaActual !== 'armario' && 
          pantallaActual !== 'outfits' && 
          pantallaActual !== 'social' && 
          pantallaActual !== 'wishlist' && 'PLANELLS'}
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
                <button className="dropdown-perfil-item" onClick={() => { setCarruselFondosAbierto(true); setMenuPerfilAbierto(false); }}>
                  Elegir fondo
                </button>
                <button 
                  className="dropdown-perfil-item" 
                  onClick={() => { setCalendarioAbierto(true); setMenuPerfilAbierto(false); }} 
                  style={{ position: 'relative' }} 
                >
                  Mi Calendario
                  <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '26px' }}>
                    <svg viewBox="0 0 24 24" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', filter: 'drop-shadow(0px 1px 2px rgba(245, 158, 11, 0.4))' }}>
                      <path d="M12 2C12 2 5 8 5 15C5 18.866 8.134 22 12 22C15.866 22 19 18.866 19 15C19 11 15 7 15 7C15 7 16 10 14.5 11.5C13 13 13 11.5 13 10C13 8.5 13.5 6 12 2Z" fill="#F59E0B"/>
                      <path d="M12 9C12 9 7.5 13 7.5 16.5C7.5 18.433 9.567 20.5 12 20.5C14.433 20.5 16.5 18.433 16.5 16.5C16.5 14 14 11.5 14 11.5C14 11.5 13.5 14 12 14Z" fill="#FEF3C7"/>
                    </svg>
                    {/* 👇 Aquí cambiamos rachaActual por rachaReal en el tamaño de fuente y en el texto */}
                    <span style={{ position: 'absolute', zIndex: 1, color: '#78350F', fontSize: rachaReal > 99 ? '9px' : '12px', fontWeight: '900', top: '15px', left: '50%', transform: 'translate(-50%, -50%)', letterSpacing: '-0.5px' }}>
                      {rachaReal}
                    </span>
                  </div>
                </button>
              </div>
              <div className="perfil-overlay-cierre" onClick={() => setMenuPerfilAbierto(false)} />
            </>
          )}

          {/* 🖼️ NUEVO POP-UP: PERFIL COMPLETO (CASI PANTALLA COMPLETA) */}
          <ModalPerfilCompleto
            abierto={modalPerfilCompletoAbierto}
            usuario={usuario}
            onCerrar={() => setModalPerfilCompletoAbierto(false)}
            subiendoFoto={subiendoFoto}
            handleSubirFotoPerfil={handleSubirFotoPerfil}
            handleActualizarDatoPerfil={handleActualizarDatoPerfil}
            tema={tema}
            cambiarTema={cambiarTema}
            graficoExpandido={graficoExpandido}
            setGraficoExpandido={setGraficoExpandido}
            datosColores={datosColores}
            datosPrendas={datosPrendas}
            datosMarcas={datosMarcas}
            datosCrecimiento={datosCrecimiento}
            datosEstaciones={datosEstaciones}
            cerrarSesionActiva={cerrarSesionActiva}
          />


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
                
                <button className="btn-login-principal" onClick={() => { intentarLoginConGoogle(); setMenuPerfilAbierto(false); }}>
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
      <MenuLateral
        menuAbierto={menuAbierto}
        setMenuAbierto={setMenuAbierto}
        pantallaActual={pantallaActual}
        setPantallaActual={setPantallaActual}
        filtro={filtro}
        categoriasActivas={categoriasActivas}
        navegarA={navegarA}
        catalogoAbierto={catalogoAbierto}
        setCatalogoAbierto={setCatalogoAbierto}
        setModalEditarAbierto={setModalEditarAbierto}
        seccionRopaExpandida={seccionRopaExpandida}
        setSeccionRopaExpandida={setSeccionRopaExpandida}
        seccionAccesoriosExpandida={seccionAccesoriosExpandida}
        setSeccionAccesoriosExpandida={setSeccionAccesoriosExpandida}
        CATEGORIAS_ROPA={CATEGORIAS_ROPA}
        CATEGORIAS_ACCESORIOS={CATEGORIAS_ACCESORIOS}
      />

      {menuAbierto && <div className="menu-overlay" onClick={() => setMenuAbierto(false)}></div>}

      {/* MODAL 1: EDITAR MENÚ */}
      <ModalEditarCategorias
        abierto={modalEditarAbierto}
        onCerrar={() => setModalEditarAbierto(false)}
        TODAS_CATEGORIAS={TODAS_CATEGORIAS}
        categoriasActivas={categoriasActivas}
        toggleCategoriaFiltro={toggleCategoriaFiltro}
      />

      <AnimacionRacha dias={animacionRacha} />

      {/* 🔴 MODAL DE CONFIRMACIÓN DE BORRADO */}
      <ModalConfirmacionBorrado
        abierto={modalConfirmacionBorrado}
        titulo="¿Eliminar prendas?"
        mensaje={
          <>Estás a punto de eliminar <strong>{prendasSeleccionadas.length} prenda{prendasSeleccionadas.length > 1 ? 's' : ''}</strong> de tu armario. Esta acción no se puede deshacer.</>
        }
        onCancelar={() => setModalConfirmacionBorrado(false)}
        onConfirmar={ejecutarBorradoDefinitivo}
      />

      {/* 🔴 MODAL DE CONFIRMACIÓN DE BORRADO DE OUTFITS */}
      <ModalConfirmacionBorrado
        abierto={modalConfirmacionBorradoOutfit}
        titulo="¿Eliminar outfits?"
        mensaje={
          <>Estás a punto de eliminar <strong>{outfitsSeleccionados.length} outfit{outfitsSeleccionados.length > 1 ? 's' : ''}</strong> de tu galería. Esta acción no se puede deshacer.</>
        }
        onCancelar={() => setModalConfirmacionBorradoOutfit(false)}
        onConfirmar={ejecutarBorradoDefinitivoOutfits}
      />

      {/* 🔴 MODAL DE CONFIRMACIÓN DE BORRADO DE FONDOS */}
      <ModalConfirmacionBorrado
        abierto={modalConfirmacionBorradoFondo}
        zIndex={10001}
        titulo="¿Eliminar fondos?"
        mensaje={
          <>Estás a punto de eliminar <strong>{fondosSeleccionados.length} fondo{fondosSeleccionados.length > 1 ? 's' : ''}</strong> de tu colección. Esta acción no se puede deshacer.</>
        }
        onCancelar={() => setModalConfirmacionBorradoFondo(false)}
        onConfirmar={ejecutarBorradoDefinitivoFondos}
      />

      {/* MODAL 2: NUEVA PRENDA */}
      <ModalNuevaPrenda
        abierto={modalNuevaPrendaAbierto}
        prendaAEditar={prendaAEditar}
        formNombre={formNombre}
        setFormNombre={setFormNombre}
        formMarca={formMarca}
        manejarCambioMarca={manejarCambioMarca}
        sugerenciasFiltradas={sugerenciasFiltradas}
        setFormMarca={setFormMarca}
        setSugerenciasFiltradas={setSugerenciasFiltradas}
        formCategoria={formCategoria}
        setFormCategoria={setFormCategoria}
        TODAS_CATEGORIAS={TODAS_CATEGORIAS}
        formImagen={formImagen}
        handleImagenPrenda={handleImagenPrenda}
        formColor={formColor}
        formColorPadre={formColorPadre}
        setFormColor={setFormColor}
        setFormColorPadre={setFormColorPadre}
        COLORES_CON_TONALIDADES={COLORES_CON_TONALIDADES}
        onSubmit={processFormularioPrenda}
        onCerrar={() => setModalNuevaPrendaAbierto(false)}
      />

      {/* PANTALLA: INICIO */}
      {pantallaActual === 'inicio' && (
        <PantallaInicio
          fondoPantalla={fondoPantalla}
          usuario={usuario}
          navegarA={navegarA}
          intentarLoginConGoogle={intentarLoginConGoogle}
        />
      )}

      {/* PANTALLA: ARMARIO */}
      {pantallaActual === 'armario' && (
        <PantallaArmario
          modoSeleccion={modoSeleccion}
          cancelarSeleccion={cancelarSeleccion}
          obtenerMarcasDelArmario={obtenerMarcasDelArmario}
          filtroMarca={filtroMarca}
          setFiltroMarca={setFiltroMarca}
          filtroColorPadre={filtroColorPadre}
          setFiltroColorPadre={setFiltroColorPadre}
          obtenerColoresDelArmario={obtenerColoresDelArmario}
          setModoSeleccion={setModoSeleccion}
          cargandoPrendas={cargandoPrendas}
          prendasFiltradas={prendasFiltradas}
          prendasSeleccionadas={prendasSeleccionadas}
          manejarClicPrenda={manejarClicPrenda}
          iniciarLongPress={iniciarLongPress}
          cancelarLongPress={cancelarLongPress}
          carruselFondosAbierto={carruselFondosAbierto}
          modalPerfilCompletoAbierto={modalPerfilCompletoAbierto}
          intentarEliminarSeleccionadas={intentarEliminarSeleccionadas}
          abrirModalCrear={abrirModalCrear}
        />
      )}

      {/* ========================================== */}
      {/* ✨ PANTALLA: MIS OUTFITS (Galería 3 Columnas) */}
      {/* ========================================== */}
      {/* ========================================== */}
      {/* ✨ PANTALLA: MIS OUTFITS (Galería 3 Columnas) */}
      {/* ========================================== */}
      {pantallaActual === 'outfits' && (
        <PantallaOutfits
          modoSeleccionOutfit={modoSeleccionOutfit}
          cancelarSeleccionOutfit={cancelarSeleccionOutfit}
          setModoSeleccionOutfit={setModoSeleccionOutfit}
          outfitsGuardados={outfitsGuardados}
          cargandoOutfits={cargandoOutfits}
          outfitsSeleccionados={outfitsSeleccionados}
          toggleSeleccionarOutfit={toggleSeleccionarOutfit}
          esLongPressOutfit={esLongPressOutfit}
          iniciarLongPressOutfit={iniciarLongPressOutfit}
          cancelarLongPressOutfit={cancelarLongPressOutfit}
          setMiOutfitSeleccionado={setMiOutfitSeleccionado}
          carruselFondosAbierto={carruselFondosAbierto}
          modalPerfilCompletoAbierto={modalPerfilCompletoAbierto}
          intentarEliminarSeleccionadosOutfits={intentarEliminarSeleccionadosOutfits}
          onAbrirCreadorOutfit={abrirCreadorOutfit}
        />
      )}

      {/* ========================================== */}
      {/* ✨ PANTALLA: SOCIAL (Amigos y Búsqueda)    */}
      {/* ========================================== */}
      {pantallaActual === 'social' && (
        <div className="pantalla-social animate-fade-in" style={{ padding: 'calc(80px + env(safe-area-inset-top, 0px)) 20px 20px 20px', minHeight: '100dvh', boxSizing: 'border-box' }}>

          {/* ========================================== */}
          {/* BARRA DE BÚSQUEDA, RESULTADOS Y BUZÓN      */}
          {/* ========================================== */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '25px', zIndex: 50, position: 'relative' }}>
            
            <div ref={buscadorRef} style={{ position: 'relative', flex: 1 }}>
              <div style={{ position: 'absolute', top: '50%', left: '14px', transform: 'translateY(-50%)', display: 'flex', pointerEvents: 'none' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              </div>
              <input 
                type="text" 
                placeholder="Buscar personas..." 
                value={busquedaSocial} 
                onFocus={() => setResultadosVisibles(true)}
                onChange={(e) => {
                  setBusquedaSocial(e.target.value);
                  setResultadosVisibles(true);
                }} 
                style={{ width: '100%', padding: '14px 14px 14px 40px', borderRadius: '14px', border: '1px solid #e5e5ea', backgroundColor: '#f2f2f7', fontSize: '15px', color: '#111', outline: 'none', boxSizing: 'border-box' }} 
              />

              {busquedaSocial.trim() !== '' && resultadosVisibles && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #f2f2f7', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', maxHeight: '250px', overflowY: 'auto', zIndex: 60 }}>
                  {buscandoUsuarios ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#888', fontSize: '14px' }}>Buscando...</div>
                  ) : usuariosFiltrados.filter((u) => !amigos.some((a) => a.id === u.id)).length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#888', fontSize: '14px' }}>No se encontraron usuarios.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {usuariosFiltrados.filter((u) => !amigos.some((a) => a.id === u.id)).map((user, index, lista) => {
                        const solicitudEnviada = solicitudesEnviadas.includes(user.id);
                        return (
                          <div key={user.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: index < lista.length - 1 ? '1px solid #f2f2f7' : 'none' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <img src={user.photoURL || AVATAR_POR_DEFECTO} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} alt={user.displayName} />
                              <span style={{ fontWeight: '600', color: '#111', fontSize: '14px' }}>{user.displayName}</span>
                            </div>
                            <button
                              onClick={async () => {
                                try {
                                  await enviarSolicitud(user.id);
                                  mostrarToast('Solicitud enviada', 'exito');
                                } catch (error) {
                                  console.error('Error al enviar solicitud:', error);
                                  mostrarToast('No se pudo enviar la solicitud. Inténtalo de nuevo.', 'error');
                                }
                              }}
                              disabled={solicitudEnviada}
                              style={{ padding: '6px 14px', borderRadius: '20px', backgroundColor: solicitudEnviada ? '#f2f2f7' : '#111', color: solicitudEnviada ? '#8e8e93' : '#fff', border: 'none', fontWeight: '600', fontSize: '12px', cursor: solicitudEnviada ? 'default' : 'pointer' }}
                            >
                              {solicitudEnviada ? 'Enviada' : 'Añadir'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div ref={buzonRef} style={{ position: 'relative' }}>
              <button 
                onClick={() => setBuzonAbierto(!buzonAbierto)}
                style={{ width: '50px', height: '50px', borderRadius: '14px', backgroundColor: '#f2f2f7', border: '1px solid #e5e5ea', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer' }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                {solicitudesRecibidas.length > 0 && (
                  <div style={{ position: 'absolute', top: '-5px', right: '-5px', backgroundColor: '#ff3b30', color: '#fff', fontSize: '11px', fontWeight: '800', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '2px solid #fff' }}>
                    {solicitudesRecibidas.length}
                  </div>
                )}
              </button>

              {buzonAbierto && (
                <div className="animation-slide-up-fijo" style={{ position: 'absolute', top: '60px', right: 0, width: '280px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e5e5ea', boxShadow: '0 15px 35px rgba(0,0,0,0.1)', padding: '15px', zIndex: 65 }}>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '800', color: '#111' }}>Solicitudes de Amistad</h3>
                  {solicitudesRecibidas.length === 0 ? (
                    <p style={{ margin: 0, fontSize: '13px', color: '#8e8e93', textAlign: 'center', padding: '10px 0' }}>Buzón vacío.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {solicitudesRecibidas.map(req => (
                        <div key={req.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <img src={req.photoURL || AVATAR_POR_DEFECTO} style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }} alt={req.displayName} />
                            <span style={{ fontSize: '14px', fontWeight: '600', color: '#111' }}>{req.displayName}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={async () => {
                                try {
                                  await aceptarSolicitud(req);
                                  mostrarToast(`Ahora eres amigo de ${req.displayName}`, 'exito');
                                } catch (error) {
                                  console.error('Error al aceptar solicitud:', error);
                                  mostrarToast('No se pudo aceptar la solicitud. Inténtalo de nuevo.', 'error');
                                }
                              }}
                              style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#111', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                            >✓</button>
                            <button
                              onClick={async () => {
                                try {
                                  await rechazarSolicitud(req.id);
                                } catch (error) {
                                  console.error('Error al rechazar solicitud:', error);
                                  mostrarToast('No se pudo rechazar la solicitud. Inténtalo de nuevo.', 'error');
                                }
                              }}
                              aria-label="Rechazar solicitud"
                              style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#f2f2f7', color: '#8e8e93', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                            >✕</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* LISTA DE AMIGOS */}
          <div>
            <h3 style={{ fontSize: '12px', fontWeight: '700', color: '#8e8e93', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Mis Amigos</h3>
            {cargandoSocial ? (
              <div style={{ textAlign: 'center', marginTop: '30px', padding: '20px' }}><p style={{ color: '#8e8e93', fontSize: '14px', margin: 0 }}>Cargando...</p></div>
            ) : amigos.length === 0 ? (
              <div style={{ textAlign: 'center', marginTop: '30px', padding: '20px', backgroundColor: '#f2f2f7', borderRadius: '16px' }}><p style={{ color: '#8e8e93', fontSize: '14px', margin: 0 }}>Aún no has añadido a nadie.</p></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {amigos.map(amigo => (
                  <div key={amigo.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #f2f2f7', cursor: 'pointer' }}>
                    
                    <div onClick={() => setAmigoSeleccionado(amigo)} style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                      <img src={amigo.photoURL || AVATAR_POR_DEFECTO} style={{ width: '46px', height: '46px', borderRadius: '50%', objectFit: 'cover' }} alt={amigo.displayName} />
                      <span style={{ fontWeight: '600', color: '#111', fontSize: '15px' }}>{amigo.displayName}</span>
                    </div>

                    <button 
                      onClick={(e) => { e.stopPropagation(); setAmigoADejarDeSeguir(amigo); }} 
                      style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#f2f2f7', border: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer' }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="8.5" cy="7" r="4"></circle>
                        <polyline points="17 11 19 13 23 9"></polyline>
                      </svg>
                    </button>

                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================== */}
      {/* ✨ MODAL: PRENDA EN GRANDE (VISTA DETALLE) */}
      {/* ========================================== */}
      <ModalPrendaGrande
        prenda={prendaSeleccionadaGrande}
        onCerrar={() => setPrendaSeleccionadaGrande(null)}
        onEditar={abrirEdicionDesdeGrande}
      />

      {/* PANTALLA: WISHLIST */}
{pantallaActual === 'wishlist' && (
  <PantallaWishlist
    modoSeleccionWishlist={modoSeleccionWishlist}
    cancelarSeleccionWishlist={cancelarSeleccionWishlist}
    obtenerMarcasWishlist={obtenerMarcasWishlist}
    filtroMarcaWishlist={filtroMarcaWishlist}
    setFiltroMarcaWishlist={setFiltroMarcaWishlist}
    wishlist={wishlist}
    setModoSeleccionWishlist={setModoSeleccionWishlist}
    cargandoWishlist={cargandoWishlist}
    wishlistFiltrada={wishlistFiltrada}
    wishlistSeleccionadaMulti={wishlistSeleccionadaMulti}
    toggleSeleccionarWishlist={toggleSeleccionarWishlist}
    esLongPressWishlist={esLongPressWishlist}
    iniciarLongPressWishlist={iniciarLongPressWishlist}
    cancelarLongPressWishlist={cancelarLongPressWishlist}
    setWishlistSeleccionadaGrande={setWishlistSeleccionadaGrande}
    setIdsABorrar={setIdsABorrar}
    setModalConfirmacionBorradoWishlist={setModalConfirmacionBorradoWishlist}
    setWishlistAEditar={setWishlistAEditar}
    setFormWishlist={setFormWishlist}
    setModalWishlistAbierto={setModalWishlistAbierto}
  />
)}

      {/* ========================================== */}
      {/* ✨ MODAL: DEJAR DE SEGUIR (CONFIRMACIÓN)   */}
      {/* ========================================== */}
      {amigoADejarDeSeguir && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', backgroundColor: 'rgba(0, 0, 0, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10005 }}>
          
          <div className="modal-content animation-slide-up-fijo" style={{ width: '80%', maxWidth: '300px', backgroundColor: '#ffffff', borderRadius: '24px', padding: '24px', textAlign: 'center', boxShadow: '0 25px 50px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            
            <img src={amigoADejarDeSeguir.photoURL || AVATAR_POR_DEFECTO} style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', marginBottom: '15px' }} alt={amigoADejarDeSeguir.displayName} />
            <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', fontWeight: '800', color: '#111' }}>¿Dejar de seguir?</h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#8e8e93', lineHeight: '1.4' }}>
              Dejarás de ver los outfits de <strong style={{ color: '#111' }}>{amigoADejarDeSeguir.displayName}</strong>.
            </p>
            
            <div style={{ display: 'flex', width: '100%', gap: '10px' }}>
              <button onClick={() => setAmigoADejarDeSeguir(null)} style={{ flex: 1, padding: '14px', borderRadius: '14px', backgroundColor: '#f2f2f7', color: '#111', border: 'none', fontWeight: '600', cursor: 'pointer', fontSize: '14px' }}>
                Cancelar
              </button>
              <button onClick={confirmarDejarDeSeguir} style={{ flex: 1, padding: '14px', borderRadius: '14px', backgroundColor: '#ff3b30', color: '#fff', border: 'none', fontWeight: '600', cursor: 'pointer', fontSize: '14px' }}>
                Dejar de seguir
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* ✨ MODAL: MI OUTFIT EN GRANDE (CON EDICIÓN)*/}
      {/* ========================================== */}
      <ModalOutfitGrande
        outfit={miOutfitSeleccionado}
        onCerrar={() => setMiOutfitSeleccionado(null)}
        onEditar={editarOutfitDesdeGrande}
      />

      {/* ========================================== */}
      {/* ✨ MODAL: CARTA DE PERFIL DE AMIGO         */}
      {/* ========================================== */}
      {amigoSeleccionado && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000 }}>
          
          <div className="modal-content animation-slide-up-fijo" style={{ width: '85%', maxWidth: '360px', backgroundColor: '#ffffff', borderRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 25px 50px rgba(0,0,0,0.3)', position: 'relative' }}>

            {/* Botón Cerrar (Esquina) */}
            <button 
              onClick={() => setAmigoSeleccionado(null)} 
              aria-label="Cerrar"
              style={{ position: 'absolute', top: '18px', right: '18px', background: 'none', border: 'none', fontSize: '20px', color: '#8e8e93', cursor: 'pointer', zIndex: 10 }}
            >✕</button>

            {/* 1. Info Principal */}
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '20px', marginTop: '5px' }}>
              
              {/* Foto de Perfil */}
              <img 
                src={amigoSeleccionado.photoURL || AVATAR_POR_DEFECTO} 
                style={{ width: '90px', height: '90px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #f2f2f7', flexShrink: 0 }} 
                alt={amigoSeleccionado.displayName} 
              />
              
              {/* Datos a la Derecha */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '10px', flex: 1, width: '100%' }}>
                <h3 style={{ margin: '0', fontSize: '20px', fontWeight: '800', color: '#111', lineHeight: '1.1', textAlign: 'left' }}>
                  {amigoSeleccionado.displayName}
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                  
                  {/* Fila 1: Estilo */}
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-start', gap: '6px', textAlign: 'left', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ESTILO:</span>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#333' }}>{amigoSeleccionado.estiloArmario || 'Desconocido'}</span>
                  </div>
                  
                  {/* Fila 2: Estación */}
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-start', gap: '6px', textAlign: 'left', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ESTACIÓN:</span>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#333' }}>{amigoSeleccionado.estacionFavorita || 'Cualquiera'}</span>
                  </div>
                
                </div>
              </div>
            </div>

            {/* Línea Separadora */}
            <hr style={{ width: '100%', border: 'none', borderTop: '1px solid #d1d1d6', margin: '0' }} />

            {/* 3. Galería de Outfits (reales, cargados de Firestore) */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#111111', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>
                Sus Outfits
              </span>
              
              {outfitsDeAmigoSeleccionado.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', width: '100%' }}>
                  {outfitsDeAmigoSeleccionado.map((outfit) => (
                    <div key={outfit.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ aspectRatio: '2/3', borderRadius: '12px', backgroundColor: '#f4f4f5', overflow: 'hidden', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        {outfit.foto ? (
                          <img src={outfit.foto} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={outfit.nombre || 'Outfit'} />
                        ) : outfit.prendas && outfit.prendas.length > 0 ? (
                          // Sin foto de portada: mostramos el montaje de prendas,
                          // igual que en tu propia vista de "Mis Outfits"
                          <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            {outfit.prendas.map((p, index) => (
                              <div key={p.idUnico || index} style={{
                                position: 'absolute',
                                transform: `translate(${p.x * 0.3}px, ${p.y * 0.3}px) scale(${p.escala * 0.3}) rotate(${p.rotacion}deg)`,
                                width: '110px',
                                height: '110px',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                zIndex: index
                              }}>
                                <img src={p.imagen} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="" />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#c7c7cc' }}>Sin imagen</span>
                        )}
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: '#8e8e93', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {outfit.nombre || 'Sin título'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ width: '100%', padding: '20px 0', backgroundColor: '#fafafa', borderRadius: '12px', textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: '13px', color: '#8e8e93', fontWeight: '500' }}>No ha subido outfits todavía.</p>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      

      {/* ========================================== */}
      {/* ✨ MODAL: CREADOR DE OUTFITS (ANIMACIÓN Y LIENZO MAXIMIZADO) */}
      {/* ========================================== */}
      <ModalLienzoOutfit
        abierto={modalCrearOutfitAbierto}
        TODAS_CATEGORIAS={TODAS_CATEGORIAS}
        categoriaOutfitSeleccionada={categoriaOutfitSeleccionada}
        setCategoriaOutfitSeleccionada={setCategoriaOutfitSeleccionada}
        wishlist={wishlist}
        prendas={prendas}
        agregarPrendaAlLienzo={agregarPrendaAlLienzo}
        idSeleccionado={idSeleccionado}
        setIdSeleccionado={setIdSeleccionado}
        prendasLienzo={prendasLienzo}
        setPrendasLienzo={setPrendasLienzo}
        idArrastrando={idArrastrando}
        prendaEnZonaBorrado={prendaEnZonaBorrado}
        handleTouchStartPrenda={handleTouchStartPrenda}
        handleTouchMovePrenda={handleTouchMovePrenda}
        handleTouchEndPrenda={handleTouchEndPrenda}
        enviarAlFondo={enviarAlFondo}
        traerAlFrente={traerAlFrente}
        setModalCrearOutfitAbierto={setModalCrearOutfitAbierto}
        setOutfitAEditar={setOutfitAEditar}
        setModalGuardarAbierto={setModalGuardarAbierto}
      />

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

            {/* Caja táctil para la Foto (ahora con desplegable cámara/fototeca) */}
            <SelectorFoto
              accept="image/jpeg, image/png, image/webp"
              onArchivoSeleccionado={handleFotoOutfit}
              trigger={(alternar) => (
                <div
                  onClick={alternar}
                  style={{ width: '100%', height: '140px', borderRadius: '12px', border: '2px dashed #d1d1d6', backgroundColor: '#fafafa', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', overflow: 'hidden', position: 'relative' }}
                >
                  {fotoOutfitTemp ? (
                    <img src={fotoOutfitTemp} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Preview" />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                      <span style={{ color: '#8e8e93', fontSize: '13px', fontWeight: '500' }}>+ Añadir foto (Opcional)</span>
                    </div>
                  )}
                </div>
              )}
            />

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
      
      {/* ========================================== */}
      {/* ✨ MODAL: CALENDARIO (Estilo BeReal)       */}
      {/* ========================================== */}
      {calendarioAbierto && (() => {
        const mesActual = fechaNavegacion.getMonth();
        const anioActual = fechaNavegacion.getFullYear();
        const diasEnMes = new Date(anioActual, mesActual + 1, 0).getDate();
        const nombreMeses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        
        const hoyReal = new Date();
        const stringHoy = `${hoyReal.getFullYear()}-${String(hoyReal.getMonth() + 1).padStart(2, '0')}-${String(hoyReal.getDate()).padStart(2, '0')}`;
        
        const esMesActual = hoyReal.getMonth() === mesActual && hoyReal.getFullYear() === anioActual;
        const diaHoy = esMesActual ? hoyReal.getDate() : null;

        const irMesAnterior = () => setFechaNavegacion(new Date(anioActual, mesActual - 1, 1));
        const irMesSiguiente = () => setFechaNavegacion(new Date(anioActual, mesActual + 1, 1));

        return (
          <div className="modal-overlay" style={{ backdropFilter: 'blur(15px)', WebkitBackdropFilter: 'blur(15px)', backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000 }}>
            
            <style>
              {`
                .calendario-scroll::-webkit-scrollbar { display: none; }
                .calendario-scroll { -ms-overflow-style: none; scrollbar-width: none; }
              `}
            </style>

            <div 
              className="modal-content animation-slide-up-fijo calendario-scroll" 
              onTouchStart={onTouchStartCalendario}
              onTouchMove={onTouchMoveCalendario}
              onTouchEnd={() => onTouchEndCalendario(irMesAnterior, irMesSiguiente)}
              style={{ width: '90%', maxWidth: '380px', maxHeight: '90dvh', overflowY: 'auto', overflowX: 'hidden', backgroundColor: '#111111', borderRadius: '28px', padding: '24px', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px rgba(0,0,0,0.6)', position: 'relative', boxSizing: 'border-box' }}
            >

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '25px', marginTop: '5px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <h2 style={{ color: '#ffffff', fontSize: '28px', fontWeight: '800', margin: 0, letterSpacing: '-0.5px' }}>
                    {nombreMeses[mesActual]}
                  </h2>
                  <span style={{ color: '#8e8e93', fontSize: '16px', fontWeight: '700' }}>{anioActual}</span>
                </div>
                
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <button onClick={irMesAnterior} aria-label="Mes anterior" style={{ background: '#1c1c1e', border: '1px solid #2c2c2e', color: '#fff', width: '36px', height: '36px', borderRadius: '12px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold' }}>❮</button>
                  <button onClick={irMesSiguiente} aria-label="Mes siguiente" style={{ background: '#1c1c1e', border: '1px solid #2c2c2e', color: '#fff', width: '36px', height: '36px', borderRadius: '12px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold' }}>❯</button>
                  <div style={{ width: '1px', height: '18px', backgroundColor: '#2c2c2e', margin: '0 4px' }}></div>
                  <button onClick={() => setCalendarioAbierto(false)} aria-label="Cerrar calendario" style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '14px' }}>✕</button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                {Array.from({ length: diasEnMes }, (_, i) => i + 1).map(dia => {
                  const fechaKey = `${anioActual}-${String(mesActual + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
                  const tieneOutfit = outfitsCalendario[fechaKey];
                  const esHoy = dia === diaHoy;
                  const esFuturo = fechaKey > stringHoy;

                  return (
                    <div 
                      key={dia}
                      onClick={() => {
                        if (!esFuturo) {
                          setFotoBorrador(tieneOutfit || null);
                          setDiaCalendarioSeleccionado({
                            fecha: fechaKey,
                            diaFormateado: `${dia} de ${nombreMeses[mesActual]}`
                          });
                        }
                      }}
                      style={{ 
                        aspectRatio: '3/4', backgroundColor: tieneOutfit ? 'transparent' : (esHoy ? '#ffffff' : '#1c1c1e'), 
                        borderRadius: '12px', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center', 
                        position: 'relative', cursor: esFuturo ? 'default' : 'pointer', opacity: esFuturo ? 0.3 : 1, 
                        border: esHoy ? '2.5px solid #ffffff' : '1px solid #2c2c2e', boxSizing: 'border-box'
                      }}
                    >
                      {tieneOutfit ? (
                        <>
                          <div style={{ width: '100%', height: '100%', padding: esHoy ? '1px' : '0', boxSizing: 'border-box', borderRadius: '10px', overflow: 'hidden' }}>
                             <img src={tieneOutfit} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={`Día ${dia}`} />
                          </div>
                          <div style={{ position: 'absolute', top: '6px', right: '6px', backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', borderRadius: '6px', padding: '2px 6px' }}>
                            <span style={{ color: '#fff', fontSize: '11px', fontWeight: '800' }}>{dia}</span>
                          </div>
                        </>
                      ) : (
                        <span style={{ color: esHoy ? '#000000' : '#48484a', fontSize: esHoy ? '24px' : '18px', fontWeight: '800' }}>{esHoy ? '+' : dia}</span>
                      )}
                    </div>
                  );
                })}
              </div>

            </div>
          </div>
        );
      })()}

      {/* ========================================== */}
      {/* ✨ MODAL: DÍA DEL CALENDARIO EN GRANDE     */}
      {/* ========================================== */}
      {diaCalendarioSeleccionado && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', backgroundColor: 'rgba(0, 0, 0, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10005 }}>
          
          <div style={{ width: '90%', maxWidth: '380px', maxHeight: '90dvh', overflowY: 'auto', backgroundColor: '#111111', borderRadius: '28px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 25px 50px rgba(0,0,0,0.6)', position: 'relative', boxSizing: 'border-box' }}>

            <button 
              onClick={() => { setDiaCalendarioSeleccionado(null); setFotoBorrador(null); }} 
              aria-label="Cerrar"
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.15)', border: 'none', fontSize: '14px', color: '#fff', cursor: 'pointer', zIndex: 10, width: '30px', height: '30px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
            >✕</button>

            <h3 style={{ margin: '5px 0 0 0', fontSize: '22px', fontWeight: '800', color: '#ffffff', textAlign: 'center' }}>
              {diaCalendarioSeleccionado.diaFormateado}
            </h3>

            <div style={{ width: '100%', aspectRatio: '3/4', borderRadius: '16px', overflow: 'hidden', backgroundColor: '#1c1c1e', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px solid #2c2c2e' }}>
              {fotoBorrador ? (
                <img src={fotoBorrador} alt="Outfit del día" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ color: '#48484a', fontSize: '14px', fontWeight: '600' }}>Sin outfit subido</span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <SelectorFoto
                onArchivoSeleccionado={handleSubirFotoCalendario}
                trigger={(alternar) => (
                  <button 
                    onClick={alternar}
                    style={{ width: '100%', padding: '16px', borderRadius: '16px', backgroundColor: '#2c2c2e', color: '#ffffff', border: 'none', fontWeight: '800', fontSize: '15px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    {fotoBorrador ? 'Cambiar Foto' : 'Subir Foto'}
                  </button>
                )}
              />

              {fotoBorrador && (
                <button 
                  onClick={guardarCambiosCalendario}
                  style={{ width: '100%', padding: '16px', borderRadius: '16px', backgroundColor: '#ffffff', color: '#111111', border: 'none', fontWeight: '800', fontSize: '15px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                >
                  Guardar Cambios
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CARRUSEL DE FONDOS INTERACTIVO */}
      {carruselFondosAbierto && (
        <>
          <div 
            className="carrusel-fondos-contenedor animation-slide-up-fijo"
            onClick={() => { if(modoSeleccionFondo) cancelarSeleccionFondo(); }}
          >
            <div className="carrusel-header-zona" onClick={(e) => e.stopPropagation()}>
              <button 
                className="btn-cerrar-carrusel" 
                style={{ minWidth: '40px', textAlign: 'left' }}
                onClick={() => modoSeleccionFondo ? cancelarSeleccionFondo() : setCarruselFondosAbierto(false)}
              >
                {modoSeleccionFondo ? 'Cancelar' : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                )}
              </button>
              
              <span style={{ fontWeight: modoSeleccionFondo ? 'bold' : 'normal' }}>
                {modoSeleccionFondo ? `${fondosSeleccionados.length} seleccionados` : 'Elegir Fondo'}
              </span>
              
              {/* 🗑️ LA PAPELERA ROJA APARECE SI ESTÁS SELECCIONANDO */}
              {modoSeleccionFondo ? (
                <button 
                  onClick={intentarEliminarSeleccionadosFondos}
                  disabled={fondosSeleccionados.length === 0}
                  style={{ background: 'none', border: 'none', padding: 0, color: fondosSeleccionados.length > 0 ? '#ff3b30' : '#d1d1d6', cursor: fondosSeleccionados.length > 0 ? 'pointer' : 'default', display: 'flex', alignItems: 'center', minWidth: '40px', justifyContent: 'flex-end' }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              ) : (
                <div style={{ width: '40px' }} /> 
              )}
            </div>
            
            <div className="carrusel-scroll-x" onClick={(e) => e.stopPropagation()}>
              
              {/* 1. TU BOTÓN DE AÑADIR (ahora con desplegable cámara/fototeca) */}
              {!modoSeleccionFondo && (
                <SelectorFoto
                  onArchivoSeleccionado={handleAgregarFondoPersonal}
                  wrapperClassName="carrusel-item-card"
                  wrapperStyle={{ position: 'relative' }}
                  trigger={(alternar) => (
                    <div
                      onClick={alternar}
                      style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '8px', backgroundColor: '#111111', border: 'none', cursor: 'pointer' }}
                    >
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.15)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="5" x2="12" y2="19"></line>
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                      </div>
                      <span className="carrusel-item-name" style={{ color: '#ffffff', margin: 0, fontWeight: '500' }}>Añadir</span>
                    </div>
                  )}
                />
              )}

              {/* 2. TODOS LOS FONDOS (Juntos y Borrables con la magia Anti-Navegador) */}
              {todosLosFondos.map((fondo) => {
                const estaMarcado = fondosSeleccionados.includes(fondo.id);
                return (
                  <div 
                    key={fondo.id} 
                    className={`carrusel-item-card ${fondoPantalla === fondo.url && !modoSeleccionFondo ? 'activo' : ''}`} 
                    style={{
                      opacity: modoSeleccionFondo && !estaMarcado ? 0.6 : 1,
                      transform: estaMarcado ? 'scale(0.95)' : 'scale(1)',
                      boxShadow: estaMarcado ? '0 0 0 3px #ff3b30' : 'none',
                      transition: 'all 0.2s ease',
                      position: 'relative',
                      /* MAGIA ANTI-NAVEGADOR: Para que funcionen los gestos sin que salte el menú del móvil */
                      userSelect: 'none',
                      WebkitUserSelect: 'none',
                      WebkitTouchCallout: 'none'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (esLongPressFondo.current) { esLongPressFondo.current = false; return; }
                      if (modoSeleccionFondo) toggleSeleccionarFondo(fondo.id);
                      else cambiarFondo(fondo.url);
                    }}
                    onPointerDown={(e) => { e.stopPropagation(); iniciarLongPressFondo(fondo.id); }}
                    onPointerUp={cancelarLongPressFondo}
                    onPointerLeave={cancelarLongPressFondo}
                    onPointerCancel={cancelarLongPressFondo}
                    onContextMenu={(e) => e.preventDefault()}
                  >
                    <img src={fondo.url} alt="Fondo" style={{ objectFit: 'cover', width: '100%', height: '100%', pointerEvents: 'none' }} />
                    
                    {modoSeleccionFondo && (
                      <div className={`checkbox-burbuja-flotante ${estaMarcado ? 'burbuja-check-activa' : ''}`} style={{ top: '6px', right: '6px', backgroundColor: estaMarcado ? '#ff3b30' : 'rgba(255,255,255,0.7)', border: estaMarcado ? 'none' : '1px solid #ccc' }}>
                        {estaMarcado ? '✓' : ''}
                      </div>
                    )}
                    {fondoPantalla === fondo.url && !modoSeleccionFondo && <div className="carrusel-badge-check">✓</div>}
                  </div>
                );
              })}

            </div>
          </div>
          
          <div className="carrusel-overlay-cierre" onClick={() => { if(modoSeleccionFondo) cancelarSeleccionFondo(); else setCarruselFondosAbierto(false); }} />
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

      {/* ========================================== */}
      {/* ✨ MODALES EXCLUSIVOS DE LA WISHLIST       */}
      {/* ========================================== */}
      
      {/* A. FORMULARIO/AÑADIR WISHLIST */}
      {modalWishlistAbierto && (
        <div className="modal-overlay">
          <div className="modal-content modal-content-wide animation-slide-up-fijo">
            <button className="btn-cerrar-perfil-modal" onClick={() => setModalWishlistAbierto(false)} aria-label="Cerrar">✕</button>
            <h2>{wishlistAEditar ? 'Editar Capricho' : 'Fichar Prenda'}</h2>
            <p className="modal-subtitle">Guarda el enlace y precio para no perderla de vista.</p>

            <div className="formulario-prenda">
              <label className="label-formulario">NOMBRE DE LA PRENDA</label>
              <input type="text" className="input-prenda-texto" placeholder="Ej: Zapatillas Samba..." 
                value={formWishlist.nombre} onChange={(e) => setFormWishlist({...formWishlist, nombre: e.target.value})} />

              <label className="label-formulario">FOTO DE LA PRENDA</label>
              <div className="contenedor-carga-foto">
                <SelectorFoto
                  onArchivoSeleccionado={handleFotoWishlist}
                  trigger={(alternar) => (
                    <div className="btn-disparar-archivo btn-texto-modal" onClick={alternar} style={{ cursor: 'pointer' }}>
                      {formWishlist.foto ? 'Cambiar Foto' : 'Subir Captura'}
                    </div>
                  )}
                />
                {formWishlist.foto && (
                   <div className="vista-previa-miniatura" style={{ width: '80px', height: '80px', margin: '0 auto' }}>
                     <img src={formWishlist.foto} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                   </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '15px' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <label className="label-formulario">PRECIO (€)</label>
                  <input type="number" step="0.01" className="input-prenda-texto" placeholder="Ej: 49.99" 
                    value={formWishlist.precio} onChange={(e) => setFormWishlist({...formWishlist, precio: e.target.value})} />
                </div>
                
                <div style={{ flex: 2, display: 'flex', flexDirection: 'column', position: 'relative' }}>
                  <label className="label-formulario">MARCA</label>
                  <input 
                    type="text" 
                    placeholder="Ej: Nike..."
                    value={formWishlist.marca}
                    onChange={(e) => manejarCambioMarcaWishlist(e.target.value)}
                    className="input-prenda-texto input-marca-campo"
                  />
                  {sugerenciasFiltradas.length > 0 && (
                    <div className="lista-sugerencias-marcas" style={{ top: '65px' }}>
                      {sugerenciasFiltradas.map(marca => (
                        <div key={marca} className="item-sugerencia-marca" onClick={() => { 
                          setFormWishlist({...formWishlist, marca: marca}); 
                          setSugerenciasFiltradas([]); 
                        }}>
                          {marca}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <label className="label-formulario">ENLACE A LA TIENDA (Opcional)</label>
              <input type="url" className="input-prenda-texto" placeholder="Ej: https://zara.com/..." 
                value={formWishlist.link} onChange={(e) => setFormWishlist({...formWishlist, link: e.target.value})} />

              <button className="btn-guardar-modal btn-texto-modal" onClick={guardarPrendaWishlist} style={{ marginTop: '15px' }}>
                {wishlistAEditar ? 'Guardar Cambios' : 'Guardar en Wishlist'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* B. VISTA EN GRANDE WISHLIST */}
      <ModalWishlistGrande
        item={wishlistSeleccionadaGrande}
        onCerrar={() => setWishlistSeleccionadaGrande(null)}
        onEditar={abrirEdicionWishlistDesdeGrande}
      />

      {/* C. 🔴 EL POP-UP CORRECTO DE BORRADO DE LA WISHLIST */}
      <ModalConfirmacionBorrado
        abierto={modalConfirmacionBorradoWishlist}
        zIndex={10001}
        titulo="¿Eliminar caprichos?"
        mensaje={
          <>Estás a punto de eliminar <strong>{idsABorrar.length} artículo{idsABorrar.length > 1 ? 's' : ''}</strong> de tu Wishlist.</>
        }
        onCancelar={() => setModalConfirmacionBorradoWishlist(false)}
        onConfirmar={ejecutarBorradoDefinitivoWishlist}
      />

    </div>
  );
}
