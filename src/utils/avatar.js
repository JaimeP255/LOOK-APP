/**
 * Avatar por defecto cuando alguien no tiene foto de perfil. Es un SVG
 * incrustado directamente (no una URL externa) para que nunca pueda
 * fallar por un servicio de terceros caído o bloqueado (nos pasó de
 * verdad con via.placeholder.com).
 */
export const AVATAR_POR_DEFECTO =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#e5e5ea"/><circle cx="50" cy="38" r="18" fill="#b0b0b5"/><ellipse cx="50" cy="88" rx="32" ry="26" fill="#b0b0b5"/></svg>'
  );
