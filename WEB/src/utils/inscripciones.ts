/**
 * Modelo normalizado de inscripciones (fuente única de verdad por tabla):
 * - `alumnos` (docId = dni): datos de la persona.
 * - `cursos`: programa, nombre del curso, carga horaria, resolución.
 * - `fechas`: fecha de inicio (+ certificado, clases).
 * - `inscripciones`: SOLO referencias { dni, idCurso, fechaId, resultado }
 *   + alta automática en `alumnos` (merge) si el dni no está en el padrón.
 *   + snapshot apellido/nombre ÚNICAMENTE como respaldo si el alta falla.
 *   + asistencias (ligadas a la inscripción, no se mueven).
 *
 * Los helpers de este módulo resuelven la vista completa (join) y toleran
 * documentos legacy (con `curso`/`fechaInicio`/`resolucion` embebidos) para
 * que la transición y la migración sean seguras.
 */

export interface InscripcionNormalizada {
  dni: number;
  idCurso: number;
  /** docId del documento en `fechas` */
  fechaId: string;
  /** condición: Cursando | Aprobado | Desaprobado | Abandonó */
  resultado: string;
  /** snapshot solo si el dni no existe en `alumnos` */
  apellido?: string;
  nombre?: string;
  asistencias?: Record<string, boolean>;
}

/** Normaliza una clave de columna: minúsculas, sin tildes ni símbolos. */
export const normalizeKey = (str: unknown): string =>
  String(str ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

/** Convierte las claves de una fila de Excel a su forma normalizada. */
export const normalizeRowKeys = (row: any): Record<string, any> => {
  const out: Record<string, any> = {};
  Object.keys(row || {}).forEach(k => {
    out[normalizeKey(k)] = row[k];
  });
  return out;
};

/** Toma el primer alias con valor no vacío de una fila ya normalizada. */
export const pickAlias = (rowNorm: Record<string, any>, aliases: string[]): any => {
  for (const alias of aliases) {
    const v = rowNorm[normalizeKey(alias)];
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  return undefined;
};

export const RESOLUCION_ALIASES = [
  'resolucion', 'resolución', 'res', 'nro resolucion', 'nro resolución',
  'numero resolucion', 'número resolucion', 'numero de resolucion',
  'resolucion nro', 'resolucion del curso', 'resolución del curso',
  'res.', 'res. nro', 'expediente', 'expdte'
];

export const CURSO_ALIASES = ['curso', 'nombre del curso', 'nombre curso', 'materia', 'capacitacion'];
export const PROGRAMA_ALIASES = ['programa', 'programa al que pertenece'];
export const FECHA_INICIO_ALIASES = ['fecha de inicio', 'fecha inicio', 'inicio', 'fecha', 'fechainicio'];
export const CONDICION_ALIASES = ['condicion', 'condición', 'condicion final', 'resultado', 'estado', 'situacion', 'situación', 'cond'];
export const CANTIDAD_CLASES_ALIASES = ['cantidad clases', 'cant clases', 'cantidad de clases', 'clases', 'cant. clases'];
export const CARGA_HORARIA_ALIASES = ['carga horaria', 'carga horaria hs', 'horas', 'carga'];

/** Normaliza la condición del Excel a los valores permitidos. */
export const normalizeResultado = (raw: unknown): string => {
  const s = String(raw ?? '').trim();
  if (!s) return 'Cursando';
  const lower = s.toLowerCase();
  if (lower.includes('aprob')) return 'Aprobado';
  if (lower.includes('desaprob')) return 'Desaprobado';
  if (lower.includes('abandon')) return 'Abandonó';
  if (lower.includes('cursando')) return 'Cursando';
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/** Busca un curso por idCurso y/o nombre (exacto + normalizado tolerante). */
export const matchCurso = (cursos: any[], opts: { idCurso?: unknown; nombre?: unknown }): any | undefined => {
  const list = cursos || [];
  const id = opts.idCurso !== undefined && opts.idCurso !== null && String(opts.idCurso).trim() !== ''
    ? String(opts.idCurso).trim()
    : undefined;
  if (id) {
    const byId = list.find(c => String(c.idCurso) === id);
    if (byId) return byId;
  }
  const raw = String(opts.nombre ?? '').trim();
  if (!raw) return undefined;
  const norm = normalizeKey(raw);
  if (!norm) return undefined;
  const exact = list.find(c =>
    (c.curso && String(c.curso).trim().toLowerCase() === raw.toLowerCase()) ||
    (c.nombreCompleto && String(c.nombreCompleto).trim().toLowerCase() === raw.toLowerCase())
  );
  if (exact) return exact;
  return list.find(c =>
    (normalizeKey(c.curso || '') !== '' && normalizeKey(c.curso || '') === norm) ||
    (normalizeKey(c.nombreCompleto || '') !== '' && normalizeKey(c.nombreCompleto || '') === norm)
  );
};

/** Busca un documento de `fechas`: primero por docId, luego por idCurso + inicio. */
export const matchFecha = (
  fechas: any[],
  opts: { fechaId?: unknown; idCurso?: unknown; inicio?: unknown }
): any | undefined => {
  const list = fechas || [];
  const fid = opts.fechaId !== undefined && opts.fechaId !== null && String(opts.fechaId).trim() !== ''
    ? String(opts.fechaId).trim()
    : undefined;
  if (fid) {
    const byId = list.find(f => String(f.id) === fid);
    if (byId) return byId;
  }
  const inicio = String(opts.inicio ?? '').trim();
  if (opts.idCurso !== undefined && opts.idCurso !== null && String(opts.idCurso).trim() !== '' && inicio) {
    const byKey = list.find(f =>
      String(f.idCurso) === String(opts.idCurso).trim() && String(f.inicio || '') === inicio
    );
    if (byKey) return byKey;
  }
  return undefined;
};

export type AlumnosLookup = Map<string, any> | any[];

const buildAlumnoMap = (alumnos?: AlumnosLookup): Map<string, any> => {
  if (!alumnos) return new Map();
  if (alumnos instanceof Map) return alumnos;
  return new Map((alumnos as any[]).map((a: any) => [String(a?.dni), a]));
};

export interface InscripcionDisplay {
  dni: any;
  apellido: string;
  nombre: string;
  email: string;
  telefono: string;
  unidadAcademica: string;
  idCurso: any;
  curso: string;
  programa: string;
  resolucion: string;
  cargaHoraria: string;
  fechaId: string;
  fechaInicio: string;
  certificado: string;
  cantidadClases: number;
  resultado: string;
  asistencias: Record<string, boolean>;
}

/**
 * Resuelve la vista completa de una inscripción (join con cursos/fechas/alumnos).
 * Prioridad: dato maestro de su tabla → snapshot legacy embebido → ''.
 */
export const displayInscripcion = (
  ins: any,
  ctx: { cursos?: any[]; fechas?: any[]; alumnos?: AlumnosLookup }
): InscripcionDisplay => {
  const cursos = ctx.cursos || [];
  const fechas = ctx.fechas || [];
  const alumno = buildAlumnoMap(ctx.alumnos).get(String(ins?.dni));
  const cursoObj = matchCurso(cursos, { idCurso: ins?.idCurso, nombre: ins?.curso });
  let fechaObj = matchFecha(fechas, {
    fechaId: ins?.fechaId,
    idCurso: cursoObj?.idCurso ?? ins?.idCurso,
    inicio: ins?.fechaInicio,
  });
  if (!fechaObj && ins?.fechaInicio && cursoObj) {
    const nombreCurso = cursoObj.nombreCompleto || cursoObj.curso;
    fechaObj = fechas.find(
      f => String(f.curso || '') === String(nombreCurso || '') && String(f.inicio || '') === String(ins.fechaInicio)
    );
  }
  return {
    dni: ins?.dni,
    apellido: alumno?.apellido || ins?.apellido || '',
    nombre: alumno?.nombre || ins?.nombre || '',
    email: alumno?.email || ins?.email || '',
    telefono: alumno?.telPart || alumno?.telLab || ins?.telPart || ins?.telLab || '',
    unidadAcademica: alumno?.unidadAcademica || ins?.unidadAcademica || '',
    idCurso: cursoObj?.idCurso ?? ins?.idCurso ?? '',
    curso: cursoObj?.nombreCompleto || cursoObj?.curso || ins?.curso || '',
    programa: cursoObj?.programa || '',
    resolucion: cursoObj?.resolucion || ins?.resolucion || '',
    cargaHoraria: cursoObj?.cargaHorariaHs || cursoObj?.cargaHoraria || '',
    fechaId: fechaObj?.id || ins?.fechaId || '',
    fechaInicio: fechaObj?.inicio || ins?.fechaInicio || '',
    certificado: fechaObj?.certificado || '',
    cantidadClases: fechaObj?.cantidadClases ? Number(fechaObj.cantidadClases) : 4,
    resultado: ins?.resultado || 'Cursando',
    asistencias: ins?.asistencias || {},
  };
};

/** Clave de deduplicación normalizada: dni + idCurso + fechaId. */
export const inscripcionKey = (dni: unknown, idCurso: unknown, fechaId: unknown): string =>
  `${String(dni ?? '').trim()}|${String(idCurso ?? '').trim()}|${String(fechaId ?? '').trim()}`;
