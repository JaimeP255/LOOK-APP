import { storage } from '../firebase';
import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';

/**
 * subirBase64AStorage
 * ---------------------
 * Sube una imagen ya comprimida (en formato "data:image/jpeg;base64,...",
 * que es justo lo que produce cada <canvas> de la app) a Firebase Storage,
 * y devuelve su URL de descarga pública.
 *
 * A propósito NO toca la lógica de recorte/compresión de cada pantalla
 * (algunas tienen pasos extra, como el "lazo" para quitar el fondo de las
 * prendas) — se apoya en el resultado que esa lógica YA produce
 * correctamente, y solo añade el último paso: en vez de guardar el
 * Base64 entero dentro de un documento de Firestore (lo que nos hizo
 * reventar el límite de 1MB con el calendario), lo sube a Storage y
 * guarda solo un enlace de texto corto.
 *
 * @param {string} base64 - imagen en formato data URL (lo que da canvas.toDataURL())
 * @param {string} carpeta - subcarpeta dentro de tu usuario: "prendas", "wishlist", "outfits", "calendario", "fondos", "perfil"
 * @param {string} uid - tu UID de usuario
 * @returns {Promise<string>} la URL de descarga de la imagen ya subida
 */
export async function subirBase64AStorage(base64, carpeta, uid) {
  const nombreArchivo = `${Date.now()}.jpg`;
  const referencia = ref(storage, `usuarios/${uid}/${carpeta}/${nombreArchivo}`);
  await uploadString(referencia, base64, 'data_url', { contentType: 'image/jpeg' });
  const url = await getDownloadURL(referencia);
  return url;
}

/**
 * Borra una imagen de Storage a partir de su URL de descarga.
 * Si la URL no es de Firebase Storage (por ejemplo, alguna imagen quedó
 * como Base64 heredada de antes de esta migración, o es una de las
 * imágenes de stock de Unsplash de los fondos por defecto), no hace
 * nada — evita errores al intentar borrar algo que no está en tu Storage.
 */
export async function borrarImagenPorUrl(url) {
  if (!url || !url.includes('firebasestorage')) return;
  try {
    const referencia = ref(storage, url);
    await deleteObject(referencia);
  } catch (error) {
    console.error('Error al borrar imagen de Storage:', error);
  }
}
