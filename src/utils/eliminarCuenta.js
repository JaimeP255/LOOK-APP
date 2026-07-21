import { db, auth, storage, provider } from '../firebase';
import { collection, query, where, getDocs, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import { ref, listAll, deleteObject } from 'firebase/storage';
import { deleteUser, reauthenticateWithPopup } from 'firebase/auth';

/**
 * eliminarCuenta.js
 * ------------------
 * Borra TODO lo que Planells guarda de un usuario, sin dejar restos:
 * sus fotos en Storage, sus documentos en cada colección de Firestore,
 * y por último la cuenta de acceso (Firebase Auth) en sí.
 *
 * ⚠️ Es una acción irreversible — no hay papelera ni "deshacer". El
 * componente que llama a esto (ModalEliminarCuenta.jsx) es responsable
 * de pedir una confirmación explícita antes de llamarla.
 *
 * Orden importante: primero se borra todo lo demás (mientras la sesión
 * sigue activa y las reglas de seguridad te siguen reconociendo como
 * dueño), y la cuenta de Auth se borra la ÚLTIMA — en cuanto se borra,
 * ya no hay sesión con la que seguir borrando cosas.
 */

// Borra una "carpeta" de Storage entera, incluyendo las subcarpetas de
// dentro (prendas, wishlist, outfits, calendario, fondos, perfil...)
async function borrarCarpetaStorage(referencia) {
  const resultado = await listAll(referencia);
  await Promise.all(resultado.items.map((item) => deleteObject(item).catch(() => {})));
  await Promise.all(resultado.prefixes.map((subcarpeta) => borrarCarpetaStorage(subcarpeta)));
}

// Borra todos los documentos de una colección que coincidan con una
// condición, en lotes de hasta 500 (el máximo que permite Firestore
// de una vez)
async function borrarDocumentosPorLotes(docs) {
  const LOTE_MAXIMO = 500;
  for (let i = 0; i < docs.length; i += LOTE_MAXIMO) {
    const lote = writeBatch(db);
    docs.slice(i, i + LOTE_MAXIMO).forEach((docSnap) => lote.delete(docSnap.ref));
    await lote.commit();
  }
}

/**
 * Elimina la cuenta del usuario actual por completo: Storage, todas
 * las colecciones de Firestore que le pertenecen, y la cuenta de Auth.
 * @param {string} uid
 */
export async function eliminarCuentaCompleta(uid) {
  // 1. Storage: todas tus fotos, sea cual sea la carpeta
  try {
    await borrarCarpetaStorage(ref(storage, `usuarios/${uid}`));
  } catch (error) {
    console.error('Error borrando archivos de Storage (se continúa igualmente):', error);
  }

  // 2. Firestore: cada colección que guarda cosas tuyas
  const colecciones = ['prendas', 'wishlist', 'outfits', 'diasCalendario', 'fondosPersonalizados'];
  for (const nombre of colecciones) {
    const q = query(collection(db, nombre), where('userId', '==', uid));
    const snapshot = await getDocs(q);
    await borrarDocumentosPorLotes(snapshot.docs);
  }

  // 3. Amistades y solicitudes (tanto las que mandaste como las que recibiste)
  const qAmistades = query(collection(db, 'amistades'), where('miembros', 'array-contains', uid));
  const snapAmistades = await getDocs(qAmistades);
  await borrarDocumentosPorLotes(snapAmistades.docs);

  const qSolicitudesDe = query(collection(db, 'solicitudesAmistad'), where('de', '==', uid));
  const qSolicitudesPara = query(collection(db, 'solicitudesAmistad'), where('para', '==', uid));
  const [snapDe, snapPara] = await Promise.all([getDocs(qSolicitudesDe), getDocs(qSolicitudesPara)]);
  await borrarDocumentosPorLotes([...snapDe.docs, ...snapPara.docs]);

  // 4. Tu documento de perfil
  await deleteDoc(doc(db, 'usuarios', uid));

  // 5. La cuenta de acceso en sí (Firebase Auth) — SIEMPRE la última
  try {
    await deleteUser(auth.currentUser);
  } catch (error) {
    // Firebase exige un login "reciente" para poder borrar la cuenta,
    // por seguridad. Si ha pasado tiempo desde que iniciaste sesión,
    // pide que te autentiques otra vez (con el mismo Google de siempre)
    // y lo reintenta automáticamente.
    if (error.code === 'auth/requires-recent-login') {
      await reauthenticateWithPopup(auth.currentUser, provider);
      await deleteUser(auth.currentUser);
    } else {
      throw error;
    }
  }
}
