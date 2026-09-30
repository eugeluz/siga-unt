/**
 * Configuración de Difusión por Email (menú Noticias, solo admin).
 *
 * CÓMO ACTIVARLO:
 * 1) Creá una planilla de Google Drive con UNA HOJA POR LOTE
 *    (el nombre de cada hoja es el nombre del lote, ej: "DIFUSION UNT 01").
 * 2) Cada hoja lleva columnas: Email | Nombre | DNI
 *    (se aceptan alias: e-mail/mail/correo, name/nombre completo, documento).
 * 3) Publicala: Archivo → Compartir → Publicar en la web (toda la planilla).
 * 4) Pegá acá abajo el ID (el tramo largo entre /d/ y /edit de la URL) y
 *    listá en DIFUSION_LOTES los nombres exactos de las hojas.
 *
 * No se guarda NADA en Firebase: la planilla se lee en vivo, el flyer va
 * como link de Drive en el cuerpo, y el envío se hace por Gmail (CCO).
 */
export const DIFUSION_ADMIN_EMAIL = 'eugenia.gonzalez@webmail.unt.edu.ar';

/** ID de la planilla de Google Sheets con los lotes (vacío = panel desactivado). */
export const DIFUSION_SHEET_ID = '';

/** Nombres exactos de las hojas de la planilla (una por lote). */
export const DIFUSION_LOTES: string[] = [];

/** Destinatarios por tramo de CCO (Gmail tolera ~40-50 por vez sin marcar spam). */
export const DIFUSION_TRAMO_DEFAULT = 40;
