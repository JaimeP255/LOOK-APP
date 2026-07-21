/**
 * compartirOutfit.js
 * -------------------
 * Genera una imagen (estilo BeReal: foto grande + un cuadrado pequeño
 * con el "boceto" del outfit encima) a partir de un outfit guardado, y
 * ofrece guardarla o compartirla usando lo que tenga el dispositivo.
 *
 * Cómo funciona por dentro: se dibuja todo en un <canvas> invisible
 * (nunca se ve en pantalla, es solo una "hoja de dibujo" en memoria), y
 * al final se convierte ese dibujo en una imagen de verdad.
 *
 * ⚠️ Aviso honesto sobre un posible tropiezo: para poder "leer" los
 * píxeles de tus fotos (que viven en Firebase Storage) dentro de un
 * <canvas>, el navegador exige que el servidor que las sirve permita
 * el acceso entre orígenes (CORS). Firebase Storage normalmente ya lo
 * permite para lectura pública, pero si al probar esto ves un error de
 * seguridad en la consola mencionando "tainted canvas" o "CORS",
 * significa que hay que configurar el CORS del bucket de Storage — te
 * lo explico en detalle si te pasa.
 */

const ANCHO = 1080;
const ALTO = 1920;

// Carga una imagen y espera a que esté lista para poder dibujarla
function cargarImagen(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // necesario para poder "leer" la imagen desde el canvas
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`No se pudo cargar la imagen: ${url}`));
    img.src = url;
  });
}

// Dibuja una imagen "a cubrir" (como object-fit: cover) dentro de un rectángulo
function dibujarCover(ctx, img, x, y, ancho, alto) {
  const proporcionDestino = ancho / alto;
  const proporcionOrigen = img.width / img.height;

  let sx, sy, sAncho, sAlto;
  if (proporcionOrigen > proporcionDestino) {
    sAlto = img.height;
    sAncho = sAlto * proporcionDestino;
    sx = (img.width - sAncho) / 2;
    sy = 0;
  } else {
    sAncho = img.width;
    sAlto = sAncho / proporcionDestino;
    sx = 0;
    sy = (img.height - sAlto) / 2;
  }

  ctx.drawImage(img, sx, sy, sAncho, sAlto, x, y, ancho, alto);
}

// Redondea las esquinas de un rectángulo (para el marco del cuadrado pequeño)
function trazarRectangeloRedondeado(ctx, x, y, ancho, alto, radio) {
  ctx.beginPath();
  ctx.moveTo(x + radio, y);
  ctx.arcTo(x + ancho, y, x + ancho, y + alto, radio);
  ctx.arcTo(x + ancho, y + alto, x, y + alto, radio);
  ctx.arcTo(x, y + alto, x, y, radio);
  ctx.arcTo(x, y, x + ancho, y, radio);
  ctx.closePath();
}

// Dibuja el "boceto" (el montaje de prendas del lienzo) dentro de un
// cuadrado, reescalando las posiciones para que quepan
async function dibujarBoceto(ctx, prendas, x, y, tamano) {
  ctx.save();
  trazarRectangeloRedondeado(ctx, x, y, tamano, tamano, 24);
  ctx.clip();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x, y, tamano, tamano);

  // El lienzo original ronda los 300-340px de ancho visible; esta es
  // una equivalencia aproximada, no exacta (no hace falta que lo sea
  // para una imagen de vista previa)
  const factorEscala = tamano / 320;
  const centroX = x + tamano / 2;
  const centroY = y + tamano / 2;

  const imagenesPrendas = await Promise.all(
    prendas.map((p) => cargarImagen(p.imagen).catch(() => null))
  );

  prendas.forEach((p, i) => {
    const img = imagenesPrendas[i];
    if (!img) return;

    const ladoPieza = 110 * p.escala * factorEscala;
    const cx = centroX + p.x * factorEscala;
    const cy = centroY + p.y * factorEscala;

    // 🐛 Antes se forzaba la imagen a un cuadrado (drawImage con ancho y
    // alto iguales), lo que la deformaba si no era ya cuadrada — el
    // lienzo real usa "object-fit: contain" (respeta las proporciones,
    // cabe entera dentro del hueco), así que replicamos exactamente eso.
    const proporcion = img.width / img.height;
    let anchoPieza, altoPieza;
    if (proporcion > 1) {
      anchoPieza = ladoPieza;
      altoPieza = ladoPieza / proporcion;
    } else {
      altoPieza = ladoPieza;
      anchoPieza = ladoPieza * proporcion;
    }

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((p.rotacion * Math.PI) / 180);
    ctx.drawImage(img, -anchoPieza / 2, -altoPieza / 2, anchoPieza, altoPieza);
    ctx.restore();
  });

  ctx.restore();
}

/**
 * Genera la imagen para compartir de un outfit.
 * @param {object} outfit - el outfit completo (con .nombre, .foto, .prendas)
 * @returns {Promise<Blob>} la imagen final, lista para descargar o compartir
 */
export async function generarImagenCompartible(outfit) {
  const canvas = document.createElement('canvas');
  canvas.width = ANCHO;
  canvas.height = ALTO;
  const ctx = canvas.getContext('2d');

  const tieneFoto = Boolean(outfit.foto);
  const tieneBoceto = Boolean(outfit.prendas && outfit.prendas.length > 0);

  // Fondo base (por si alguna imagen tarda o falla)
  ctx.fillStyle = '#f4efe4';
  ctx.fillRect(0, 0, ANCHO, ALTO);

  if (tieneFoto) {
    // 1. La foto grande, a pantalla completa
    const fotoGrande = await cargarImagen(outfit.foto);
    dibujarCover(ctx, fotoGrande, 0, 0, ANCHO, ALTO);

    // 2. Degradado oscuro abajo, para que el texto se lea bien
    const degradado = ctx.createLinearGradient(0, ALTO * 0.6, 0, ALTO);
    degradado.addColorStop(0, 'rgba(10,7,5,0)');
    degradado.addColorStop(1, 'rgba(10,7,5,0.85)');
    ctx.fillStyle = degradado;
    ctx.fillRect(0, ALTO * 0.6, ANCHO, ALTO * 0.4);

    // 3. El cuadrado con el boceto (estilo BeReal), arriba a la derecha
    if (tieneBoceto) {
      const margen = 48;
      const tamanoCuadrado = 460;
      const posX = ANCHO - margen - tamanoCuadrado;
      const posY = margen;
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.35)';
      ctx.shadowBlur = 30;
      ctx.shadowOffsetY = 10;
      await dibujarBoceto(ctx, outfit.prendas, posX, posY, tamanoCuadrado);
      ctx.restore();

      // Borde blanco alrededor del cuadrado
      ctx.save();
      trazarRectangeloRedondeado(ctx, posX, posY, tamanoCuadrado, tamanoCuadrado, 24);
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
      ctx.restore();
    }
  } else if (tieneBoceto) {
    // Sin foto de portada: el boceto se convierte en el protagonista,
    // centrado y en grande
    const tamanoGrande = 700;
    await dibujarBoceto(
      ctx,
      outfit.prendas,
      (ANCHO - tamanoGrande) / 2,
      (ALTO - tamanoGrande) / 2 - 100,
      tamanoGrande
    );
  }

  // 4. Nombre del outfit y marca, abajo
  await document.fonts.ready.catch(() => {});

  ctx.textAlign = 'center';

  // Si hay foto, el fondo de esa zona siempre es oscuro (por el degradado
  // que añadimos encima) y el texto va en blanco. Si NO hay foto, el
  // fondo se queda en el crema claro fijo — ahí el texto tiene que ser
  // oscuro, o si no, prácticamente no se leería.
  const colorTitulo = tieneFoto ? '#ffffff' : '#2c2a29';
  const colorMarca = tieneFoto ? 'rgba(255,255,255,0.75)' : 'rgba(44,42,41,0.65)';

  // Sombra en el propio texto (solo tiene sentido sobre foto, no sobre
  // el fondo crema plano) — así se sigue leyendo bien aunque la foto de
  // portada sea clara justo en esa zona
  if (tieneFoto) {
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 2;
  }

  ctx.fillStyle = colorTitulo;
  ctx.font = '600 64px "Playfair Display", serif';
  ctx.fillText(outfit.nombre || 'Mi outfit', ANCHO / 2, ALTO - 140, ANCHO - 120);

  ctx.font = '600 28px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = colorMarca;
  ctx.fillText('PLANELLS', ANCHO / 2, ALTO - 80);

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('No se pudo generar la imagen'));
      },
      'image/png',
      0.95
    );
  });
}

/**
 * Construye el texto que acompaña a la imagen al compartir: si el
 * outfit tiene prendas con enlace de compra, las lista una a una — así
 * quien reciba el outfit por WhatsApp/Instagram puede ir directo a la
 * tienda, no solo mirar la foto.
 */
function construirTextoCompartir(outfit) {
  const prendasConEnlace = (outfit.prendas || []).filter((p) => p.enlace);
  if (prendasConEnlace.length === 0) return undefined;

  const lineas = prendasConEnlace.map((p) => {
    const etiqueta = [p.nombre, p.marca].filter(Boolean).join(' — ');
    return `${etiqueta || 'Prenda'}: ${p.enlace}`;
  });

  return `Cómpralo aquí:\n${lineas.join('\n')}`;
}

/**
 * Comparte (o descarga, si el dispositivo no soporta compartir
 * archivos) la imagen ya generada de un outfit.
 * @param {object} outfit
 */
export async function compartirOutfit(outfit) {
  const blob = await generarImagenCompartible(outfit);
  const nombreArchivo = `${(outfit.nombre || 'outfit').replace(/[^a-z0-9]/gi, '_')}.png`;
  const archivo = new File([blob], nombreArchivo, { type: 'image/png' });
  const texto = construirTextoCompartir(outfit);

  // Si el dispositivo soporta compartir archivos de verdad (la mayoría
  // de móviles), abrimos su panel nativo de compartir/guardar
  if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
    await navigator.share({
      files: [archivo],
      title: outfit.nombre || 'Mi outfit',
      ...(texto ? { text: texto } : {}),
    });
    return 'compartido';
  }

  // Si no, lo descargamos directamente (ordenador, o un móvil sin
  // soporte para compartir archivos)
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
  return 'descargado';
}