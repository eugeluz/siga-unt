/**
 * Formatting helper for dates in dd/mm/yy format (e.g., 13/08/26)
 */
export const formatDateAR = (dateStr: string | Date | null | undefined): string => {
  if (!dateStr) return '—';
  
  // If it's a string like YYYY-MM-DD
  if (typeof dateStr === 'string') {
    const trimmed = dateStr.trim();
    if (!trimmed) return '—';
    
    // Check YYYY-MM-DD format
    const isoMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (isoMatch) {
      const [, yyyy, mm, dd] = isoMatch;
      const yy = yyyy.slice(-2);
      return `${dd.padStart(2, '0')}/${mm.padStart(2, '0')}/${yy}`;
    }
    
    // If already DD/MM/YYYY, DD-MM-YYYY, DD/MM/YY or DD-MM-YY
    if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(trimmed)) {
      const parts = trimmed.split(/[/-]/);
      const dd = parts[0].padStart(2, '0');
      const mm = parts[1].padStart(2, '0');
      const yy = parts[2].slice(-2);
      return `${dd}/${mm}/${yy}`;
    }

    // Try parsing Date object
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yy = String(d.getFullYear()).slice(-2);
      return `${dd}/${mm}/${yy}`;
    }
    
    return trimmed;
  }

  if (dateStr instanceof Date && !isNaN(dateStr.getTime())) {
    const dd = String(dateStr.getDate()).padStart(2, '0');
    const mm = String(dateStr.getMonth() + 1).padStart(2, '0');
    const yy = String(dateStr.getFullYear()).slice(-2);
    return `${dd}/${mm}/${yy}`;
  }

  return '—';
};

/**
 * Formatting helper for timestamps in dd/mm/yy HH:MM format (e.g., 13/08/26 14:30).
 * Accepts ISO strings, Date objects and Firestore Timestamps.
 */
export const formatDateTimeAR = (f: any): string => {
  if (!f) return '—';
  let d: Date | null = null;
  if (typeof f === 'string') {
    const t = new Date(f);
    if (!isNaN(t.getTime())) d = t;
  } else if (f instanceof Date && !isNaN(f.getTime())) {
    d = f;
  } else if (f && typeof f.toDate === 'function') {
    try {
      const t = f.toDate();
      if (t && !isNaN(t.getTime())) d = t;
    } catch {
      d = null;
    }
  }
  if (!d) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yy} ${hh}:${mi}`;
};
