export const toTitleCase = (str: string): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Para compatibilidad con nombres con apóstrofes o guiones, capitaliza después de ' y -
export const toTitleCaseComplex = (str: string): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .map((word) =>
      word
        .split(/([-'’])/)
        .map((part) => (part.length === 1 && /[-'’]/.test(part) ? part : part.charAt(0).toUpperCase() + part.slice(1)))
        .join('')
    )
    .join(' ');
};
