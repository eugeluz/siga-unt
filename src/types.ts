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
  direccionOficina?: string;
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
}

export interface Inscripcion {
  id?: string;
  dni: number;
  apellido?: string;
  nombre?: string;
  curso: string;
  fechaInicio: string;
  resultado: string;
  email?: string;
  cargoFuncion?: string;
  unidadAcademica?: string;
  direccionOficina?: string;
  ua?: number | string;
  idCurso?: number;
  createdAt?: string;
  createdBy?: string;
  telPart?: string;
  fechaNac?: string;
  nivelEstudio?: string;
  titulo?: string;
  area?: string;
  personas?: number;
  telLab?: string;
  interno?: string;
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
