import { db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

/**
 * exportarDatos.js
 * -----------------
 * Recopila todo lo que Planells guarda de un usuario (perfil, prendas,
 * wishlist, outfits, calendario, fondos personalizados) y lo entrega
 * como un único archivo JSON descargable — es el "derecho de acceso" /
 * "portabilidad de datos" que reconoce el RGPD, y respalda de verdad lo
 * que ya dice tu política de privacidad.
 *
 * No incluye las FOTOS en sí (serían enlaces a Storage, que solo
 * funcionan mientras tengas sesión iniciada) — sí incluye todos los
 * enlaces a esas fotos, así que nada se queda "oculto".
 */

// Trae todos los documentos de una colección que te pertenecen a ti
async function traerColeccionPropia(nombreColeccion, uid) {
  const q = query(collection(db, nombreColeccion), where('userId', '==', uid));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
}

/**
 * Recopila todos los datos del usuario en un solo objeto.
 * @param {object} usuario - el usuario actual (con .uid)
 */
export async function recopilarMisDatos(usuario) {
  const [prendas, wishlist, outfits, diasCalendario, fondosPersonalizados, perfilSnap] = await Promise.all([
    traerColeccionPropia('prendas', usuario.uid),
    traerColeccionPropia('wishlist', usuario.uid),
    traerColeccionPropia('outfits', usuario.uid),
    traerColeccionPropia('diasCalendario', usuario.uid),
    traerColeccionPropia('fondosPersonalizados', usuario.uid),
    getDoc(doc(db, 'usuarios', usuario.uid)),
  ]);

  return {
    exportadoEl: new Date().toISOString(),
    perfil: {
      nombre: usuario.displayName || null,
      email: usuario.email || null,
      uid: usuario.uid,
      ...(perfilSnap.exists() ? perfilSnap.data() : {}),
    },
    prendas,
    wishlist,
    outfits,
    diasCalendario,
    fondosPersonalizados,
  };
}

/**
 * Descarga todos los datos del usuario como un archivo .json
 * @param {object} usuario
 */
export async function exportarYDescargarMisDatos(usuario) {
  const datos = await recopilarMisDatos(usuario);
  const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const fecha = new Date().toISOString().split('T')[0];
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = `planells-mis-datos-${fecha}.json`;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
}
