import { toTitleCase } from './text';

export const CURSOS_EXPORT_HEADERS = [
  'ID Curso',
  'Programa',
  'Nombre del curso',
  'Cantidad de clases',
  'Carga horaria',
  'ID Docente',
  'Docente Coordinador',
  'Resolución',
  'Visible en principal',
];

export const CURSOS_EXPORT_KEYS = [
  'idCurso',
  'programa',
  'curso',
  'cantidadClases',
  'cargaHoraria',
  'idDocente',
  'docente',
  'resolucion',
  'visible',
];

export const FECHAS_EXPORT_HEADERS = [
  'ID Curso',
  'Nombre del curso',
  'Fecha de inicio',
  'Fecha de certificado',
  'Cant. clases',
  'URL inscripción',
  'Visible en principal',
];

export const FECHAS_EXPORT_KEYS = [
  'idCurso',
  'curso',
  'inicio',
  'certificado',
  'cantidadClases',
  'inscripcionUrl',
  'visible',
];

const docenteDisplay = (docentes: any[], idDocente: any, fallback: string) => {
  if (fallback) return fallback;
  const d = (docentes || []).find(doc => String(doc.idDocente) === String(idDocente));
  if (!d) return 'Sin asignar';
  return `${toTitleCase(d.apellido || '')}, ${toTitleCase(d.nombre || '')}`.trim().replace(/^,/, '').trim() || 'Sin asignar';
};

/** Filas de cursos ordenadas por ID, listas para downloadExcel/downloadCSV. */
export const buildCursosExportRows = (cursos: any[], docentes: any[] = []) =>
  [...(cursos || [])]
    .sort((a, b) => (Number(a.idCurso) || 0) - (Number(b.idCurso) || 0))
    .map((c: any) => ({
      idCurso: c.idCurso ?? '',
      programa: c.programa || '',
      curso: c.nombreCompleto || c.curso || '',
      cantidadClases: c.cargaHoraria || '',
      cargaHoraria: c.cargaHorariaHs || c.horas || '',
      idDocente: c.idDocente ?? '',
      docente: docenteDisplay(docentes, c.idDocente, c.docenteNombre || ''),
      resolucion: c.resolucion || '',
      visible: c.showOnLanding !== false ? 'Sí' : 'No',
    }));

/** Filas de fechas ordenadas por inicio, listas para downloadExcel/downloadCSV. */
export const buildFechasExportRows = (fechas: any[], cursos: any[] = []) =>
  [...(fechas || [])]
    .sort((a, b) => {
      const dateA = a.inicio || '';
      const dateB = b.inicio || '';
      if (dateA < dateB) return -1;
      if (dateA > dateB) return 1;
      return (a.curso || '').localeCompare(b.curso || '');
    })
    .map((f: any) => ({
      idCurso: f.idCurso ?? '',
      curso: (cursos || []).find(c => String(c.idCurso) === String(f.idCurso))?.nombreCompleto || f.curso || '',
      inicio: f.inicio || '',
      certificado: f.certificado || '',
      cantidadClases: f.cantidadClases ?? '',
      inscripcionUrl: f.inscripcionUrl || '',
      visible: f.showOnLanding !== false ? 'Sí' : 'No',
    }));

export const exportFileName = (prefix: string, ext: 'xlsx' | 'csv') =>
  `${prefix}_export_${new Date().toISOString().slice(0, 10)}.${ext}`;
