const pad2 = (n: number) => String(n).padStart(2, '0');

/** Serial de Excel → YYYY-MM-DD en UTC (sin vaivenes de zona horaria). */
const serialToISODate = (serial: number): string | null => {
  if (!Number.isFinite(serial)) return null;
  try {
    const days = Math.floor(serial - 25569);
    const d = new Date(days * 86400000);
    return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
  } catch {
    return null;
  }
};

/**
 * Normalizador canónico de fechas de Excel a YYYY-MM-DD.
 * Acepta: serial numérico, serial como texto ("45352", que Excel deja al
 * guardar una columna de fechas como texto), ISO ("2024-03-01", con o sin
 * hora) y latino ("01/03/2024" o "01-03-2024", año de 2 dígitos → 20xx).
 * Devuelve null si no reconoce el formato: los importadores omiten la fila
 * en vez de crear fechas basura que rompen los listados.
 */
export function excelDateToJSDate(serial: unknown): string | null {
  if (serial === undefined || serial === null) return null;
  if (typeof serial === 'number') return serialToISODate(serial);
  if (serial instanceof Date) {
    if (isNaN(serial.getTime())) return null;
    return `${serial.getFullYear()}-${pad2(serial.getMonth() + 1)}-${pad2(serial.getDate())}`;
  }
  const s = String(serial).trim();
  if (!s) return null;
  // Serial como texto: 5 dígitos en rango plausible (1954–2119).
  // Sin este caso, "45352" se guardaba literal y generaba fechas fantasma.
  if (/^\d{5}(\.\d+)?$/.test(s)) {
    const n = Number(s);
    if (n >= 20000 && n <= 80000) return serialToISODate(n);
    return null;
  }
  // ISO con o sin hora ("2024-03-01", "2024-03-01T00:00", "2024-03-01 00:00")
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/);
  if (m) return `${m[1]}-${pad2(Number(m[2]))}-${pad2(Number(m[3]))}`;
  // Latino DD/MM/YYYY o DD-MM-YYYY
  m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:[T ].*)?$/);
  if (m) {
    let yyyy = m[3];
    if (yyyy.length === 2) yyyy = '20' + yyyy;
    return `${yyyy}-${pad2(Number(m[2]))}-${pad2(Number(m[1]))}`;
  }
  return null;
}
