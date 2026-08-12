export function excelDateToJSDate(serial: unknown): string | null {
  if (!serial) return null;
  if (typeof serial !== 'number') return String(serial);
  try {
    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    const fractional_day = serial - Math.floor(serial) + 0.0000001;
    let total_seconds = Math.floor(86400 * fractional_day);
    const seconds = total_seconds % 60;
    total_seconds -= seconds;
    const hours = Math.floor(total_seconds / 3600);
    const minutes = Math.floor(total_seconds / 60) % 60;
    const localDate = new Date(
      date_info.getUTCFullYear(),
      date_info.getUTCMonth(),
      date_info.getUTCDate(),
      hours, minutes, seconds
    );
    return localDate.toISOString().split('T')[0];
  } catch {
    return null;
  }
}
