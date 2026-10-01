/**
 * Configuración de Difusión por Email (menú Noticias, solo admin).
 *
 * CÓMO ACTIVARLO:
 * 1) Creá una planilla de Google Drive con UNA HOJA POR LOTE
 *    (el nombre de cada hoja es el nombre del lote).
 * 2) Cada hoja lleva columnas: Email | Nombre | DNI
 *    (se aceptan alias: e-mail/mail/correo, name/nombre completo, documento).
 * 3) Publicala: Archivo → Compartir → Publicar en la web (toda la planilla).
 * 4) Pegá acá abajo la URL publicada (o el ID clásico) y la lista de lotes
 *    con el gid de cada hoja (figura en la URL de cada pestaña publicada).
 *
 * No se guarda NADA en Firebase: la planilla se lee en vivo, el flyer va
 * como link de Drive en el cuerpo, y el envío se hace por Gmail (CCO).
 */
export const DIFUSION_ADMIN_EMAIL = 'eugenia.gonzalez@webmail.unt.edu.ar';

/**
 * URL publicada de la planilla (Archivo → Publicar en la web) o ID clásico
 * (el tramo entre /d/ y /edit de la URL de edición).
 */
export const DIFUSION_SHEET_ID = '2PACX-1vRyqdbYaAFMrjt5K3Hj7RKZavbhtEUIoO_l9YL09j_TbQVvxGpaUNLO3uGIT2EmXUpL5-pigJxg2mss';

export interface DifusionLote {
  /** Nombre que se muestra en el desplegable. */
  nombre: string;
  /** gid de la hoja publicada (obligatorio con URL publicada). */
  gid?: string;
  /** Nombre real de la pestaña (solo para ID clásico, si difiere de `nombre`). */
  hoja?: string;
}

/** Lotes disponibles (una entrada por hoja de la planilla). */
export const DIFUSION_LOTES: DifusionLote[] = [
  { nombre: 'Lote 1', gid: '266220111' },
  { nombre: 'Lote 2', gid: '16484480' },
  { nombre: 'Lote 3', gid: '1251373542' },
  { nombre: 'Lote 4', gid: '156881901' },
  { nombre: 'Lote 5', gid: '575933156' },
  { nombre: 'Lote 6', gid: '516537867' },
  { nombre: 'Lote 7', gid: '1761685337' },
  { nombre: 'Lote 8', gid: '1374924237' },
];

/** Destinatarios por tramo de CCO (Gmail tolera ~40-50 por vez sin marcar spam). */
export const DIFUSION_TRAMO_DEFAULT = 40;
