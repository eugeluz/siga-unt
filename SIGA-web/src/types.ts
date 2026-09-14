export interface Alumno {
  dni: number;
  apellido: string;
  nombre: string;
  fechaNac?: string;
  edad?: number;
  telPart?: string;
  nivelEstudio?: string;
  titulo?: string;
  unidadAcademica?: string;
  area?: string;
  cargoFuncion?: string;
  personas?: number;
  email?: string;
  telLab?: string;
  interno?: string;
  medios?: string[];
}

export interface Curso {
  idCurso: number;
  curso: string;
  programa?: string;
  cargaHoraria?: string;
  plan?: string;
  idDocente?: number | null;
  expediente?: string;
  fechaPresentacion?: string;
  resolucion?: string;
  fechaNotificacion?: string;
  showOnLanding?: boolean;
}

export interface Docente {
  idDocente: number;
  dni?: number;
  apellido?: string;
  nombre?: string;
  email?: string;
  celular?: string;
}

export interface Fecha {
  id?: string;
  idCurso: number;
  curso: string;
  inicio: string;
  certificado?: string;
  cantidadClases?: number;
  clasesDictadas?: Record<string, boolean>;
  fechasClases?: Record<string, string>;
  showOnLanding?: boolean;
}

export interface Inscripcion {
  id?: string;
  dni: number;
  /** FK → cursos.idCurso */
  idCurso: number;
  /** docId en `fechas` */
  fechaId: string;
  resultado: string;
  /** snapshot SOLO como respaldo si el alta en `alumnos` falla (los lotes dan de alta el DNI) */
  apellido?: string;
  nombre?: string;
  asistencias?: Record<string, boolean>;
  createdAt?: string;
  createdBy?: string;
  // --- Legacy (documentos previos a la normalización; no escribir) ---
  /** @deprecated usar idCurso */
  curso?: string;
  /** @deprecated usar fechaId */
  fechaInicio?: string;
  /** @deprecated vive en `cursos` */
  resolucion?: string;
  /** @deprecated vive en `alumnos` */
  email?: string;
  /** @deprecated vive en `alumnos` */
  cargoFuncion?: string;
  /** @deprecated vive en `alumnos` */
  unidadAcademica?: string;
  /** @deprecated */
  ua?: number | string;
  /** @deprecated vive en `alumnos` */
  telPart?: string;
  /** @deprecated vive en `alumnos` */
  fechaNac?: string;
  /** @deprecated vive en `alumnos` */
  nivelEstudio?: string;
  /** @deprecated vive en `alumnos` */
  titulo?: string;
  /** @deprecated vive en `alumnos` */
  area?: string;
  /** @deprecated vive en `alumnos` */
  personas?: number;
  /** @deprecated vive en `alumnos` */
  telLab?: string;
  /** @deprecated vive en `alumnos` */
  interno?: string;
  /** @deprecated vive en `alumnos` */
  medios?: string[];
}

export interface Facultad {
  idFac: number;
  facultad: string;
}

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  legajo?: string;
  categoria?: string;
  activo: boolean;
  rol?: string;
  createdAt?: string;
}
