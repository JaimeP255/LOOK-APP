/**
 * afiliados.js
 * -------------
 * Convierte un enlace normal de una tienda en uno con tu comisión de
 * afiliado, marca por marca, según la configuración de abajo.
 *
 * 🔧 CÓMO USARLO CUANDO TENGAS TUS CUENTAS DE VERDAD:
 * Rellena CONFIG_AFILIADOS con tus datos reales (verás cómo hacerlo en
 * los ejemplos comentados). No hay que tocar ningún otro archivo de la
 * app — en cuanto añadas una marca aquí, todos los enlaces de esa marca
 * (en prendas, wishlist, y "Comprar este look" en Social) empezarán a
 * generar comisión automáticamente.
 *
 * ⚠️ AVISO IMPORTANTE: el formato exacto de "envoltura" de cada red
 * (Awin, Rakuten, Amazon...) puede variar ligeramente según lo que te
 * indique tu panel de afiliado real. Los formatos de abajo son los
 * estándar más habituales de cada red, pero antes de dar por bueno un
 * enlace generado, compruébalo tú mismo: haz clic, comprueba que llega
 * a la tienda correcta, y confirma en el panel de tu cuenta de afiliado
 * que el clic se ha registrado.
 *
 * Mientras una marca no esté aquí dentro, sus enlaces funcionan exactamente
 * igual que hasta ahora (normales, sin comisión) — nada se rompe por no
 * tener todavía cuentas de afiliado.
 */

export const CONFIG_AFILIADOS = {
  // ============================================================
  // 👇 EJEMPLOS DE MENTIRA — sustituye por tus datos reales cuando
  // tengas las cuentas aprobadas. Puedes borrar estos dos y usarlos
  // como plantilla para añadir las marcas que sí tengas.
  // ============================================================

  // Ejemplo de red AWIN (Mango, muchas más marcas de moda están aquí)
  // 'mango.com': {
  //   red: 'awin',
  //   idAfiliado: 'TU_ID_DE_AFILIADO_AWIN',       // el "awinaffid" de tu cuenta
  //   idComerciante: 'ID_DE_MANGO_EN_AWIN',        // el "awinmid" — cada marca tiene el suyo
  // },

  // Ejemplo de Amazon Afiliados (formato distinto: solo añade un "tag")
  // 'amazon.es': {
  //   red: 'amazon',
  //   tag: 'tuweb-21',                              // tu Tracking ID de Amazon Afiliados
  // },

  // Ejemplo de Rakuten Advertising
  // 'asos.com': {
  //   red: 'rakuten',
  //   idAfiliado: 'TU_ID_RAKUTEN',
  //   idComerciante: 'ID_DE_ASOS_EN_RAKUTEN',
  // },
};

// Saca el dominio limpio de cualquier URL ("www.zara.com/algo" -> "zara.com")
function extraerDominio(url) {
  try {
    const urlCompleta = url.startsWith('http') ? url : `https://${url}`;
    const { hostname } = new URL(urlCompleta);
    return hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

/**
 * Convierte un enlace normal en uno con tu comisión de afiliado, si la
 * marca de ese enlace está configurada arriba. Si no lo está, devuelve
 * el enlace tal cual (normal, sin comisión, pero funcionando igual).
 * @param {string} urlOriginal
 * @returns {string}
 */
export function convertirAEnlaceAfiliado(urlOriginal) {
  if (!urlOriginal) return urlOriginal;

  const urlCompleta = urlOriginal.startsWith('http') ? urlOriginal : `https://${urlOriginal}`;
  const dominio = extraerDominio(urlCompleta);
  if (!dominio) return urlCompleta;

  const config = CONFIG_AFILIADOS[dominio];
  if (!config) return urlCompleta; // Marca sin acuerdo de afiliado todavía: enlace normal

  switch (config.red) {
    case 'awin':
      return `https://www.awin1.com/cread.php?awinmid=${config.idComerciante}&awinaffid=${config.idAfiliado}&clickref=planells&p=${encodeURIComponent(urlCompleta)}`;

    case 'rakuten':
      return `https://click.linksynergy.com/deeplink?id=${config.idAfiliado}&mid=${config.idComerciante}&murl=${encodeURIComponent(urlCompleta)}`;

    case 'amazon': {
      const separador = urlCompleta.includes('?') ? '&' : '?';
      return `${urlCompleta}${separador}tag=${config.tag}`;
    }

    default:
      return urlCompleta;
  }
}
