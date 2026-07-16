import { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import {
  collection,
  doc,
  setDoc,
  addDoc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';

// ID determinista para una amistad entre dos personas: siempre las
// mismas dos UID, en el mismo orden alfabético, dan el mismo ID — así
// nunca se puede duplicar una amistad, y las reglas de seguridad de
// "outfits" pueden comprobar si existe sin tener que hacer una consulta.
function idAmistad(uidA, uidB) {
  return [uidA, uidB].sort().join('_');
}

/**
 * useSocial
 * ---------
 * Sustituye la maqueta de "Social" (amigos y solicitudes inventados,
 * `MOCK_USUARIOS` fijo en el código) por datos reales de Firestore.
 *
 * Modelo de datos (3 piezas):
 *  - `usuarios/{uid}.nombreBusqueda`: nombre en minúsculas (lo sincroniza
 *    useAuth solo) — permite buscar por nombre con un rango de texto,
 *    que es como se hace una búsqueda "empieza por..." en Firestore.
 *  - `solicitudesAmistad/{id}`: una petición pendiente, con quién la
 *    manda (`de`) y a quién (`para`).
 *  - `amistades/{uidA_uidB}`: una amistad ya confirmada, con ID
 *    determinista (ver idAmistad arriba) para que las reglas de
 *    seguridad de "outfits" puedan comprobarla de forma barata.
 *
 * ⚠️ Limitación conocida (honesta): la confirmación de una solicitud
 * la hace el cliente (borra la solicitud y crea la amistad), no un
 * servidor. Las reglas de Firestore impiden que nadie lea u escriba
 * datos ajenos que no le correspondan, pero técnicamente alguien podría
 * crear un documento de "amistad" declarándose amigo de otra persona
 * sin que esa persona lo haya aceptado de verdad, y así ver sus
 * outfits. Para cerrar esto del todo haría falta mover la aceptación a
 * una Cloud Function que compruebe que la solicitud existía antes de
 * confirmar — es una mejora razonable para más adelante, no algo
 * urgente con pocos usuarios.
 *
 * @param {object|null} usuario - usuario actual (viene de useAuth())
 */
export function useSocial(usuario) {
  // Separamos "quién es mi amigo" (los UID, cambian poco) de "cómo se
  // llama/qué foto tiene cada uno" (cambia cuando ellos editan su
  // perfil) — así podemos mantener una escucha en vivo por cada amigo
  // sin tener que reconstruir toda la lista cada vez.
  const [idsAmigos, setIdsAmigos] = useState([]);
  const [perfilesAmigos, setPerfilesAmigos] = useState({});
  const [solicitudesRecibidas, setSolicitudesRecibidas] = useState([]);
  const [solicitudesEnviadas, setSolicitudesEnviadas] = useState([]);
  const [cargandoSocial, setCargandoSocial] = useState(true);

  // 📡 1. Lista de amistades confirmadas (solo quién es amigo de quién)
  useEffect(() => {
    if (!usuario) {
      setIdsAmigos([]);
      setCargandoSocial(false);
      return;
    }

    setCargandoSocial(true);
    const q = query(collection(db, 'amistades'), where('miembros', 'array-contains', usuario.uid));

    const desvincular = onSnapshot(
      q,
      (snapshot) => {
        const ids = snapshot.docs.map((docSnap) => {
          const miembros = docSnap.data().miembros;
          return miembros.find((uid) => uid !== usuario.uid);
        });
        setIdsAmigos(ids);
        setCargandoSocial(false);
      },
      (error) => {
        console.error('Error escuchando amistades:', error);
        setCargandoSocial(false);
      }
    );

    return () => desvincular();
  }, [usuario]);

  // 📡 2. Por cada amigo, una escucha en vivo de SU perfil — así si
  // cambia su nombre, foto, estilo o estación, se actualiza solo en tu
  // pantalla, sin que tengas que recargar la app.
  useEffect(() => {
    if (idsAmigos.length === 0) {
      setPerfilesAmigos({});
      return;
    }

    const desvincular = idsAmigos.map((uid) =>
      onSnapshot(
        doc(db, 'usuarios', uid),
        (docSnap) => {
          setPerfilesAmigos((prev) => ({
            ...prev,
            [uid]: docSnap.exists() ? { id: uid, ...docSnap.data() } : null,
          }));
        },
        (error) => console.error(`Error escuchando el perfil de ${uid}:`, error)
      )
    );

    return () => desvincular.forEach((fn) => fn());
    // idsAmigos es un array nuevo en cada snapshot; comparamos por su
    // contenido (no por referencia) para no reabrir las escuchas sin motivo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsAmigos.join(',')]);

  const amigos = idsAmigos.map((uid) => perfilesAmigos[uid]).filter(Boolean);

  // 📥 Solicitudes que TE han mandado a ti
  useEffect(() => {
    if (!usuario) {
      setSolicitudesRecibidas([]);
      return;
    }

    const q = query(collection(db, 'solicitudesAmistad'), where('para', '==', usuario.uid));

    const desvincular = onSnapshot(
      q,
      async (snapshot) => {
        try {
          const solicitudes = await Promise.all(
            snapshot.docs.map(async (docSnap) => {
              const datos = docSnap.data();
              const remitenteSnap = await getDoc(doc(db, 'usuarios', datos.de));
              if (!remitenteSnap.exists()) return null;
              return { id: docSnap.id, uidRemitente: datos.de, ...remitenteSnap.data() };
            })
          );
          setSolicitudesRecibidas(solicitudes.filter(Boolean));
        } catch (error) {
          console.error('Error cargando solicitudes recibidas:', error);
        }
      },
      (error) => console.error('Error escuchando solicitudes recibidas:', error)
    );

    return () => desvincular();
  }, [usuario]);

  // 📤 Solicitudes que TÚ has mandado (para saber a quién ya le has
  // escrito y no dejarte enviar dos veces)
  useEffect(() => {
    if (!usuario) {
      setSolicitudesEnviadas([]);
      return;
    }

    const q = query(collection(db, 'solicitudesAmistad'), where('de', '==', usuario.uid));

    const desvincular = onSnapshot(
      q,
      (snapshot) => {
        setSolicitudesEnviadas(snapshot.docs.map((docSnap) => docSnap.data().para));
      },
      (error) => console.error('Error escuchando solicitudes enviadas:', error)
    );

    return () => desvincular();
  }, [usuario]);

  // 🔎 Busca usuarios por nombre (prefijo, sin distinguir mayúsculas).
  // No es una búsqueda en tiempo real: se llama cuando escribes, como ya
  // hacía la maqueta.
  const buscarUsuarios = useCallback(
    async (termino) => {
      if (!usuario || !termino || !termino.trim()) return [];

      const terminoNormalizado = termino.trim().toLowerCase();
      try {
        const q = query(
          collection(db, 'usuarios'),
          orderBy('nombreBusqueda'),
          where('nombreBusqueda', '>=', terminoNormalizado),
          where('nombreBusqueda', '<=', terminoNormalizado + '\uf8ff'),
          limit(15)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs
          .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
          .filter((u) => u.id !== usuario.uid); // no te muestres a ti mismo
      } catch (error) {
        console.error('Error buscando usuarios:', error);
        return [];
      }
    },
    [usuario]
  );

  const enviarSolicitud = useCallback(
    async (paraUid) => {
      if (!usuario) return;
      await addDoc(collection(db, 'solicitudesAmistad'), {
        de: usuario.uid,
        para: paraUid,
        creadoEn: Date.now(),
      });
    },
    [usuario]
  );

  const aceptarSolicitud = useCallback(
    async (solicitud) => {
      if (!usuario) return;
      const idNuevaAmistad = idAmistad(usuario.uid, solicitud.uidRemitente);
      await setDoc(doc(db, 'amistades', idNuevaAmistad), {
        miembros: [usuario.uid, solicitud.uidRemitente].sort(),
        creadoEn: Date.now(),
      });
      await deleteDoc(doc(db, 'solicitudesAmistad', solicitud.id));
    },
    [usuario]
  );

  const rechazarSolicitud = useCallback(async (solicitudId) => {
    await deleteDoc(doc(db, 'solicitudesAmistad', solicitudId));
  }, []);

  const dejarDeSeguir = useCallback(
    async (amigoUid) => {
      if (!usuario) return;
      await deleteDoc(doc(db, 'amistades', idAmistad(usuario.uid, amigoUid)));
    },
    [usuario]
  );

  // Carga los outfits de un amigo (llamado al abrir su perfil). Solo
  // funciona si de verdad sois amigos — lo garantizan las reglas de
  // seguridad de la colección "outfits", no este código.
  const cargarOutfitsDeAmigo = useCallback(async (amigoUid) => {
    try {
      const q = query(collection(db, 'outfits'), where('userId', '==', amigoUid));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    } catch (error) {
      console.error('Error cargando los outfits de tu amigo:', error);
      return [];
    }
  }, []);

  return {
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
  };
}