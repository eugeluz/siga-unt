import React, { useState, useEffect, useMemo } from 'react';
import { getDoc, doc, setDoc, collection, addDoc, query, where, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { logAudit } from '../utils/audit';
import { Search, CheckSquare, UserPlus, FileSpreadsheet, Upload, Database, AlertTriangle, Trash2, HelpCircle, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { formatDateAR } from '../utils/dateAR';
import { downloadExcel } from '../utils/excel';
import { excelDateToJSDate } from '../utils/date';
import { useModal } from './ModalProvider';
import { toTitleCase } from '../utils/text';
import { FormField } from './FormField';

interface EnrollmentTabProps {
  cursos: any[];
  fechas: any[];
  facultades?: any[];
  alumnos?: any[];
}

export const EnrollmentTab: React.FC<EnrollmentTabProps> = ({ cursos, fechas, facultades = [], alumnos = [] }) => {
  const { confirm, alert } = useModal();
  // Toggle Mode
  const [enrollMode, setEnrollMode] = useState<'individual' | 'lotes' | 'historico'>('individual');

  // Lote state
  const [parsedLoteData, setParsedLoteData] = useState<any[]>([]);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [isImportingLote, setIsImportingLote] = useState(false);
  const [importLoteProgress, setImportLoteProgress] = useState({ current: 0, total: 0, status: '' });
  const [exportingInscriptos, setExportingInscriptos] = useState(false);

  const [searchDni, setSearchDni] = useState('');
  const emptyStudentForm = {
    dni: '',
    apellido: '',
    nombre: '',
    email: '',
    telPart: '',
    fechaNac: '',
    edad: '',
    nivelEstudio: 'Sin dato',
    titulo: '',
    unidadAcademica: '',
    direccionOficina: '',
    area: '',
    cargoFuncion: '',
    personas: '0',
    telLab: '',
    interno: ''
  };
  const [studentForm, setStudentForm] = useState({ ...emptyStudentForm });
  const [selectedCurso, setSelectedCurso] = useState('');
  const [selectedFecha, setSelectedFecha] = useState('');
  const [cursoFilterIndiv, setCursoFilterIndiv] = useState('');
  const [cursoFilterLotes, setCursoFilterLotes] = useState('');
  const [fechasFiltradas, setFechasFiltradas] = useState<any[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [showAltaForm, setShowAltaForm] = useState(false);

  // Edad automática igual que en Gestión de Alumnos
  useEffect(() => {
    if (studentForm.fechaNac) {
      const birth = new Date(studentForm.fechaNac);
      const today = new Date();
      let calculatedAge = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        calculatedAge--;
      }
      setStudentForm(prev => (prev.edad === calculatedAge.toString() ? prev : { ...prev, edad: calculatedAge.toString() }));
    }
  }, [studentForm.fechaNac]);

  const cargoOptions = useMemo(() => {
    const base: { value: string; label: string }[] = [
      { value: '', label: '-- Seleccione --' },
      { value: 'Administrativo/a', label: 'Administrativo/a' },
      { value: 'Profesor', label: 'Profesor' },
      { value: 'JTP/Aux. Docente', label: 'JTP/Aux. Docente' },
      { value: 'Técnico/Profesional', label: 'Técnico/Profesional' },
      { value: 'Mantenimiento', label: 'Mantenimiento' },
      { value: 'Producción', label: 'Producción' },
      { value: 'Servicios Grales.', label: 'Servicios Grales.' },
    ];
    if (studentForm.cargoFuncion && !base.some((o) => o.value === studentForm.cargoFuncion)) {
      base.push({ value: studentForm.cargoFuncion, label: studentForm.cargoFuncion });
    }
    return base;
  }, [studentForm.cargoFuncion]);

  const facultadesOptions = useMemo(() => {
    return [
      'Sin dato',
      'Sec. Académica (Rec)',
      'Sec. de Ciencia, Arte e Innovación Tecnol.(Rec)',
      'Sec. de Posgrado  (Rec)',
      'Sec. Planeamto, Gestión de Proy. y Obras (Rec)',
      'Sec. de Políticas y Comunic. Instit. (Rec)',
      'Sec. Extensión Universitaria (Rec)',
      'Sec. Económica Administrativa (Rec)',
      'Sec. Bienestar Universitario (Rec)',
      'Sec. Asuntos Estudiantiles (Rec)',
      'Sec. General (Rec)',
      'Agronomía, Zootecnia y Veterinaria',
      'Arquitectura y Urbanismo',
      'Artes',
      'Bioquímica, Química y Farmacia',
      'Cs. Económicas',
      'Cs. Exactas y Tecnología',
      'Cs. Naturales e Inst. M. Lillo',
      'Derecho y Cs. Sociales',
      'Educacion Física',
      'Filosofía y Letras',
      'Medicina',
      'Odontología',
      'Psicología',
      'EU. Cine Video y Television',
      'EU. de Enfermeria',
      'Gymnasium',
      'Esc. Agricultura y Sacarotecnia',
      'Esc. Bellas Artes',
      'Esc. y Lic. Vocacional Sarmiento',
      'Inst. Sup. de Musica',
      'Inst. Tecnico',
      'Inst. Tecnico de Aguilares',
      'Esc. Vialidad',
    ];
  }, []);

  const secOptions = useMemo(() => {
    const base = facultadesOptions.map((n) => ({ value: n, label: n }));
    if (studentForm.unidadAcademica && !facultadesOptions.includes(studentForm.unidadAcademica)) {
      base.push({ value: studentForm.unidadAcademica, label: studentForm.unidadAcademica });
    }
    return base;
  }, [facultadesOptions, studentForm.unidadAcademica]);

  useEffect(() => {
    if (selectedCurso) {
      const courseObj = cursos.find(c => (c.nombreCompleto || c.curso) === selectedCurso);
      if (courseObj) {
        // Incluye fechas cuyo idCurso coincida o cuyo nombre de curso coincida
        // (cubre fechas creadas por lote histórico bajo un ID duplicado)
        const courseName = courseObj.nombreCompleto || courseObj.curso;
        const seen = new Set<string>();
        const filtered = fechas.filter(f => {
          if (String(f.idCurso) === String(courseObj.idCurso) || (f.curso || '') === courseName) {
            const key = f.id || `${f.idCurso}||${f.curso}||${f.inicio}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          }
          return false;
        });
        setFechasFiltradas(filtered);
        if (filtered.length > 0) {
          setSelectedFecha(filtered[0].inicio || '');
        } else {
          setSelectedFecha('');
        }
      }
    } else {
      setFechasFiltradas([]);
      setSelectedFecha('');
    }
  }, [selectedCurso, cursos, fechas]);

  const resetAll = () => {
    setStudentForm({ ...emptyStudentForm });
    setSearchDni('');
    setSelectedCurso('');
    setSelectedFecha('');
    setNotFound(false);
    setShowAltaForm(false);
  };

  const searchStudent = async () => {
    if (!searchDni) return;
    setNotFound(false);
    setShowAltaForm(false);
    try {
      const docRef = doc(db, 'alumnos', searchDni);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setStudentForm({
          ...emptyStudentForm,
          dni: String(data.dni || searchDni),
          apellido: data.apellido || '',
          nombre: data.nombre || '',
          email: data.email || '',
          telPart: data.telPart || '',
          fechaNac: data.fechaNac || '',
          edad: String(data.edad || ''),
          nivelEstudio: data.nivelEstudio || 'Sin dato',
          titulo: data.titulo || '',
          unidadAcademica: data.unidadAcademica || 'Sin dato',
          direccionOficina: data.direccionOficina || (data as any).direccion || '',
          area: data.area || '',
          cargoFuncion: data.cargoFuncion || '',
          personas: String(data.personas ?? '0'),
          telLab: data.telLab || '',
          interno: data.interno || ''
        });
      } else {
        setStudentForm({ ...emptyStudentForm });
        setNotFound(true);
        setShowAltaForm(true);
      }
    } catch (err) {
      console.error(err);
      await alert({ title: 'Error', message: 'No se pudo buscar el alumno. Intente nuevamente.', variant: 'danger' });
    }
  };

  const handleAltaYInscribir = async () => {
    if (!searchDni || !selectedCurso || !selectedFecha) return;
    if (!studentForm.apellido || !studentForm.nombre) {
      await alert({ title: 'Campos incompletos', message: 'Apellido y Nombre son campos requeridos.', variant: 'warning' });
      return;
    }
    try {
      // 1. Alta en el padrón 'alumnos' con la ficha completa (igual que en Alumnos)
      const studentData = {
        dni: Number(searchDni),
        apellido: toTitleCase(studentForm.apellido),
        nombre: toTitleCase(studentForm.nombre),
        fechaNac: studentForm.fechaNac,
        edad: Number(studentForm.edad) || 0,
        telPart: studentForm.telPart,
        nivelEstudio: studentForm.nivelEstudio,
        titulo: studentForm.titulo,
        unidadAcademica: studentForm.unidadAcademica || 'Sin dato',
        direccionOficina: studentForm.direccionOficina,
        area: studentForm.area,
        cargoFuncion: studentForm.cargoFuncion,
        personas: Number(studentForm.personas) || 0,
        email: (studentForm.email || '').toLowerCase(),
        telLab: studentForm.telLab,
        interno: studentForm.interno
      };
      await setDoc(doc(db, 'alumnos', searchDni), studentData);
      // 2. Inscripción al curso
      const courseObj = cursos.find(c => (c.nombreCompleto || c.curso) === selectedCurso);
      const enrollmentData = {
        dni: Number(searchDni),
        apellido: toTitleCase(studentForm.apellido || ''),
        nombre: toTitleCase(studentForm.nombre || ''),
        curso: selectedCurso,
        fechaInicio: selectedFecha,
        resultado: 'Cursando',
        email: (studentForm.email || '').toLowerCase(),
        cargoFuncion: studentForm.cargoFuncion || '',
        unidadAcademica: studentForm.unidadAcademica || 'Sin dato',
        ua: courseObj ? courseObj.idCurso : '',
        idCurso: courseObj ? courseObj.idCurso : ''
      };
      await addDoc(collection(db, 'inscripciones'), enrollmentData);
      await logAudit('Alta e inscripción individual', `${enrollmentData.apellido}, ${enrollmentData.nombre} (DNI ${searchDni}) — ${selectedCurso} (${selectedFecha})`);

      await alert({ title: 'Inscripción exitosa', message: 'Alumno registrado en el padrón e inscripto con éxito.', variant: 'success' });
      resetAll();
    } catch (err) {
      console.error(err);
      await alert({ title: 'Error', message: 'No se pudo dar de alta e inscribir. Intente nuevamente.', variant: 'danger' });
    }
  };

  const handleEnroll = async () => {
    if (!studentForm.dni || !selectedCurso || !selectedFecha) return;
    try {
      const courseObj = cursos.find(c => (c.nombreCompleto || c.curso) === selectedCurso);
      const enrollmentData = {
        dni: Number(studentForm.dni),
        apellido: toTitleCase(studentForm.apellido),
        nombre: toTitleCase(studentForm.nombre),
        curso: selectedCurso,
        fechaInicio: selectedFecha,
        resultado: 'Cursando',
        email: studentForm.email,
        cargoFuncion: studentForm.cargoFuncion,
        unidadAcademica: studentForm.unidadAcademica,
        ua: courseObj ? courseObj.idCurso : '',
        idCurso: courseObj ? courseObj.idCurso : ''
      };

      await addDoc(collection(db, 'inscripciones'), enrollmentData);
      await logAudit('Inscripción individual', `${enrollmentData.apellido}, ${enrollmentData.nombre} — ${selectedCurso} (${selectedFecha})`);
      await alert({ title: 'Inscripción exitosa', message: 'Inscripción registrada con éxito.', variant: 'success' });

      setStudentForm({ ...emptyStudentForm });
      setSearchDni('');
      setSelectedCurso('');
      setSelectedFecha('');
    } catch (err) {
      console.error(err);
      await alert({ title: 'Error', message: 'No se pudo registrar la inscripción. Intente nuevamente.', variant: 'danger' });
    }
  };

  const handleLoteFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        const data = new Uint8Array(buffer);
        const wb = XLSX.read(data, { type: 'array' });
        
        setWorkbook(wb);
        setSheetNames(wb.SheetNames);
        
        if (wb.SheetNames.length > 0) {
          const firstSheet = wb.SheetNames[0];
          setSelectedSheet(firstSheet);
          
          const ws = wb.Sheets[firstSheet];
          const rawJson = XLSX.utils.sheet_to_json(ws);
          setParsedLoteData(rawJson);
        }
      } catch (err) {
        console.error(err);
        await alert({ title: 'Error al leer archivo', message: 'Error al leer el archivo. Asegúrese de que sea un archivo de Excel o CSV válido.', variant: 'danger' });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleLoteSheetChange = (sheetName: string) => {
    setSelectedSheet(sheetName);
    if (workbook) {
      const ws = workbook.Sheets[sheetName];
      const rawJson = XLSX.utils.sheet_to_json(ws);
      setParsedLoteData(rawJson);
    }
  };

  const executeLoteEnrollment = async () => {
    if (parsedLoteData.length === 0) {
      await alert({ title: 'Sin datos', message: 'No hay datos para inscribir.', variant: 'info' });
      return;
    }

    // Validación: si el Excel no trae Programa/Curso/Fecha, se requiere selección manual
    const hasPerRowCurso = parsedLoteData.length > 0 && (() => {
      const sample = parsedLoteData[0] as Record<string, any>;
      const keys = Object.keys(sample).map(k => k.toLowerCase());
      return keys.some(k => k.includes('curso') || k.includes('programa'));
    })();
    if (!hasPerRowCurso && (!selectedCurso || !selectedFecha)) {
      await alert({ title: 'Campos incompletos', message: 'Debe seleccionar un curso y una fecha de inicio, o incluir las columnas Programa / Curso / Fecha de inicio en el Excel.', variant: 'warning' });
      return;
    }

    setIsImportingLote(true);
    setImportLoteProgress({ current: 0, total: parsedLoteData.length, status: 'Iniciando inscripción por lotes...' });

    let count = 0;
    const stats = { created: 0, updated: 0, dupsRemoved: 0 };
    let skipped = 0;
    const skippedExamples: string[] = [];
    // Cachés para cursos/fechas creados en este lote (evita duplicados)
    const newCursosMap = new Map<string, any>();
    const newFechasMap = new Map<string, any>();
    let nextCursoId = cursos.length > 0 ? Math.max(...cursos.map((c: any) => Number(c.idCurso) || 0)) + 1 : 1;
    const fallbackCourseObj = cursos.find(c => (c.nombreCompleto || c.curso) === selectedCurso);
    const fallbackIdCurso = fallbackCourseObj ? fallbackCourseObj.idCurso : '';
    const parseFechaInicio = (raw: any): string | undefined => {
      if (raw === undefined || raw === null || String(raw).trim() === '') return undefined;
      if (typeof raw === 'number') {
        const d = excelDateToJSDate(raw);
        return d || undefined;
      }
      const s = String(raw).trim();
      // Intentar YYYY-MM-DD
      if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(s)) {
        const parts = s.split(/[-/]/);
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      }
      // DD/MM/YYYY o DD-MM-YYYY -> YYYY-MM-DD
      const dm = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
      if (dm) {
        let [, dd, mm, yyyy] = dm;
        if (yyyy.length === 2) yyyy = '20' + yyyy;
        return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
      }
      const d2 = excelDateToJSDate(s);
      if (d2) return d2;
      return s;
    };
    try {

      for (const row of parsedLoteData) {
        count++;
        // Normalizador de claves: elimina tildes, espacios extras y caracteres especiales
        const normalizeKey = (str: string) =>
          str
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // quita tildes
            .replace(/[^a-z0-9]/g, '');     // deja solo letras y números

        const rowNormalized: Record<string, any> = {};
        Object.keys(row).forEach(k => {
          rowNormalized[normalizeKey(k)] = row[k];
        });

        const getVal = (aliases: string[]) => {
          for (const alias of aliases) {
            const norm = normalizeKey(alias);
            if (rowNormalized[norm] !== undefined && rowNormalized[norm] !== null && String(rowNormalized[norm]).trim() !== '') {
              return rowNormalized[norm];
            }
          }
          return undefined;
        };

        const rawDni = getVal(['dni', 'documento', 'nro doc', 'nro de documento', 'cedula', 'identificacion', 'doc']);
        const dniVal = Number(String(rawDni || '').replace(/\D/g, ''));
        if (!dniVal) { skipped++; if (skippedExamples.length < 3) skippedExamples.push(`fila ${count}: sin DNI válido`); continue; }

        // Resolver curso/fecha por fila (si el Excel trae Programa/Curso/Fecha se auto-crean)
        const cursoFilaRaw = getVal(['curso', 'nombre del curso', 'nombre curso', 'materia', 'capacitacion']);
        const programaFilaRaw = getVal(['programa', 'programa al que pertenece']);
        const fechaFilaRaw = getVal(['fecha de inicio', 'fecha inicio', 'inicio', 'fecha', 'fechainicio']);
        const cantidadFilaRaw = getVal(['cantidad clases', 'cant clases', 'cantidad de clases', 'clases', 'cant. clases']);
        const cargaFilaRaw = getVal(['carga horaria', 'carga horaria hs', 'horas', 'carga']);
        const cursoNombreFila = cursoFilaRaw ? String(cursoFilaRaw).trim() : '';
        const programaFila = programaFilaRaw ? String(programaFilaRaw).trim() : '';
        const fechaInicioFila = parseFechaInicio(fechaFilaRaw) || selectedFecha;
        const cursoEfectivo = cursoNombreFila || selectedCurso;
        if (!cursoEfectivo || !fechaInicioFila) { skipped++; if (skippedExamples.length < 3) skippedExamples.push(`fila ${count}: DNI ${dniVal} sin curso o fecha de inicio`); continue; }
        const programaEfectivo = programaFila || fallbackCourseObj?.programa || 'Calidad de vida laboral';
        let cursoObjFila: any = null;
        if (programaFila) {
          cursoObjFila = cursos.find((c: any) => (c.nombreCompleto || c.curso) === cursoEfectivo && (c.programa?.trim() || '') === programaFila.trim()) || null;
          if (!cursoObjFila) {
            cursoObjFila = newCursosMap.get(`${cursoEfectivo}||${programaEfectivo}`) || null;
          }
        } else {
          cursoObjFila = cursos.find((c: any) => (c.nombreCompleto || c.curso) === cursoEfectivo) || null;
          if (!cursoObjFila) {
            for (const v of newCursosMap.values()) {
              if ((v.nombreCompleto || v.curso) === cursoEfectivo) { cursoObjFila = v; break; }
            }
          }
        }
        if (!cursoObjFila) {
          const keyCurso = `${cursoEfectivo}||${programaEfectivo}`;
          cursoObjFila = newCursosMap.get(keyCurso) || null;
          if (!cursoObjFila) {
            for (const v of newCursosMap.values()) {
              if ((v.nombreCompleto || v.curso) === cursoEfectivo && v.programa === programaEfectivo) { cursoObjFila = v; break; }
            }
          }
          if (!cursoObjFila) {
            // Último intento tolerante: ignora mayúsculas, tildes y espacios para no
            // duplicar cursos que ya existen con nombre apenas distinto
            const norm = (s: any) => String(s || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const targetName = norm(cursoEfectivo);
            const targetProg = norm(programaFila || programaEfectivo);
            cursoObjFila = cursos.find((c: any) =>
              norm(c.nombreCompleto || c.curso) === targetName &&
              (!programaFila || norm(c.programa) === targetProg || norm(c.programa) === norm('Otros') || !norm(c.programa))
            ) || null;
            if (!cursoObjFila) {
              for (const v of newCursosMap.values()) {
                if (norm(v.nombreCompleto || v.curso) === targetName) { cursoObjFila = v; break; }
              }
            }
          }
          if (!cursoObjFila) {
            const nuevoId = nextCursoId++;
            const nuevoCurso: any = {
              idCurso: nuevoId,
              curso: cursoEfectivo,
              nombreCompleto: cursoEfectivo,
              programa: programaEfectivo,
              cargaHoraria: '',
              cargaHorariaHs: cargaFilaRaw ? String(cargaFilaRaw).trim() : '',
              plan: '',
              planName: '',
              idDocente: null,
              docenteNombre: '',
              resolucion: '',
              showOnLanding: true
            };
            try { await setDoc(doc(db, 'cursos', String(nuevoId)), nuevoCurso); } catch (e) { console.error('Error creando curso auto:', e); }
            cursoObjFila = nuevoCurso;
            newCursosMap.set(keyCurso, cursoObjFila);
          }
        } else if (cargaFilaRaw && !cursoObjFila.cargaHorariaHs) {
          try { await setDoc(doc(db, 'cursos', String(cursoObjFila.idCurso)), { cargaHorariaHs: String(cargaFilaRaw).trim() }, { merge: true }); } catch {}
        }
        const idCursoValFila = cursoObjFila.idCurso;
        const cursoParaInscripcion = cursoEfectivo;
        const fechaParaInscripcion = fechaInicioFila;
        // Buscar o crear fecha para ese curso (por ID o por nombre, para no duplicar)
        let fechaObjFila: any = fechas.find((f: any) => (String(f.idCurso) === String(idCursoValFila) || (f.curso || '') === cursoEfectivo) && f.inicio === fechaInicioFila);
        if (!fechaObjFila) {
          const keyFecha = `${idCursoValFila}||${fechaInicioFila}`;
          fechaObjFila = newFechasMap.get(keyFecha) || null;
          if (!fechaObjFila) {
            const cantidadVal = cantidadFilaRaw ? Number(String(cantidadFilaRaw).replace(/\D/g, '')) : 4;
            const nuevaFecha: any = {
              idCurso: idCursoValFila,
              curso: cursoObjFila.nombreCompleto || cursoObjFila.curso,
              inicio: fechaInicioFila,
              certificado: '',
              cantidadClases: cantidadVal || 4
            };
            try {
              const ref = await addDoc(collection(db, 'fechas'), nuevaFecha);
              fechaObjFila = { id: ref.id, ...nuevaFecha };
            } catch (e) {
              console.error('Error creando fecha auto:', e);
              fechaObjFila = nuevaFecha;
            }
            newFechasMap.set(keyFecha, fechaObjFila);
          }
        }

        // 1. Datos solo para inscripción — NO se crea/actualiza en 'alumnos' (control de aprobados)
        const studentData: any = {
          dni: dniVal
        };

        const setIfPresent = (aliases: string[], targetKey: string, transform?: (val: any) => any) => {
          const val = getVal(aliases);
          if (val !== undefined) {
            studentData[targetKey] = transform ? transform(val) : val;
          }
        };

          setIfPresent(['apellido', 'apellidos', 'surname', 'last name', 'apellido y nombre', 'apellidos y nombres'], 'apellido', (v) => toTitleCase(String(v).trim()));
          setIfPresent(['nombre', 'nombres', 'name', 'first name'], 'nombre', (v) => toTitleCase(String(v).trim()));
          setIfPresent([
            'unidad academica', 'unidad academica / dependencia', 'unidad academica/dependencia', 'unidad academica o dependencia',
            'facultad', 'dependencia', 'unidadacademica', 'unidad', 'lugar de trabajo', 'lugar trabajo', 'facultad / dependencia',
            'facultad/dependencia', 'unidad / dependencia', 'unidad/dependencia', 'organismo', 'instituto', 'escuela', 'ua'
          ], 'unidadAcademica', (v) => String(v).trim());
          setIfPresent(['cargo', 'funcion', 'cargofuncion', 'cargo / funcion', 'cargo/funcion', 'cargo o funcion', 'puesto', 'puesto de trabajo'], 'cargoFuncion', (v) => String(v).trim());
          setIfPresent(['email', 'correo', 'e-mail', 'mail', 'correo electronico', 'e mail', 'direccion de correo', 'email personal', 'email laboral'], 'email', (v) => String(v).toLowerCase().trim());

        // 2. Inscribe solo en 'inscripciones' (no toca 'alumnos')
        // Solo requiere DNI, Apellido, Nombre y Condición del Excel
        const rawCond = getVal(['condicion', 'condición', 'condicion final', 'resultado', 'estado', 'situacion', 'situación', 'cond']);
        let resultadoVal = rawCond ? String(rawCond).trim() : 'Cursando';
        // Normalizar a valores permitidos (case-insensitive)
        const lowerCond = resultadoVal.toLowerCase();
        if (lowerCond.includes('aprob')) resultadoVal = 'Aprobado';
        else if (lowerCond.includes('desaprob')) resultadoVal = 'Desaprobado';
        else if (lowerCond.includes('abandon')) resultadoVal = 'Abandonó';
        else if (lowerCond.includes('cursando')) resultadoVal = 'Cursando';
        else resultadoVal = toTitleCase(resultadoVal) || 'Cursando';

        // Si Excel trae "Apellido y Nombre" en una sola columna y falta Nombre, intentar separar
        if (studentData.apellido && !studentData.nombre && studentData.apellido.includes(',')) {
          const parts = studentData.apellido.split(',').map((s: string) => s.trim());
          studentData.apellido = toTitleCase(parts[0] || '');
          studentData.nombre = toTitleCase(parts[1] || '');
        } else if (studentData.apellido && !studentData.nombre && studentData.apellido.includes(' ')) {
          const parts = studentData.apellido.trim().split(/\s+/);
          if (parts.length > 1) {
            // Heurística: último token como nombre si no hay coma
            // mantenemos apellido como primer token y resto como nombre para no perder datos
            // (si viene "Juan Perez" en apellido, lo separamos)
            const maybeApellido = parts[0];
            const maybeNombre = parts.slice(1).join(' ');
            // solo si nombre parece nombre (una palabra) y apellido una palabra, asumimos
            if (parts.length === 2) {
              studentData.apellido = toTitleCase(maybeApellido);
              studentData.nombre = toTitleCase(maybeNombre);
            }
          }
        }

        const enrollmentData = {
          dni: dniVal,
          apellido: studentData.apellido || '',
          nombre: studentData.nombre || '',
          curso: cursoParaInscripcion,
          fechaInicio: fechaParaInscripcion,
          resultado: resultadoVal,
          email: studentData.email || '',
          cargoFuncion: studentData.cargoFuncion || '',
          unidadAcademica: studentData.unidadAcademica || 'Sin dato',
          ua: idCursoValFila,
          idCurso: idCursoValFila
        };

        const courseObjForQuery = cursoObjFila;
        // Buscar TODAS las coincidencias (nombre largo y corto) para pisarlas y
        // eliminar duplicados: misma persona inscripta 2+ veces al mismo curso+fecha.
        // El merge conserva campos no incluidos en el Excel (ej. asistencias).
        const seenIds = new Set<string>();
        const matchedDocs: any[] = [];
        const collectSnap = (s: any) => {
          s.docs.forEach((d: any) => {
            if (!seenIds.has(d.id)) {
              seenIds.add(d.id);
              matchedDocs.push(d);
            }
          });
        };
        const q = query(
          collection(db, 'inscripciones'),
          where('dni', '==', dniVal),
          where('curso', '==', cursoParaInscripcion),
          where('fechaInicio', '==', fechaParaInscripcion)
        );
        collectSnap(await getDocs(q));
        if (courseObjForQuery && courseObjForQuery.curso && courseObjForQuery.curso !== cursoParaInscripcion) {
          const qAlt = query(
            collection(db, 'inscripciones'),
            where('dni', '==', dniVal),
            where('curso', '==', courseObjForQuery.curso),
            where('fechaInicio', '==', fechaParaInscripcion)
          );
          collectSnap(await getDocs(qAlt));
        }

        if (matchedDocs.length > 0) {
          await setDoc(doc(db, 'inscripciones', matchedDocs[0].id), enrollmentData, { merge: true });
          stats.updated++;
          for (const extra of matchedDocs.slice(1)) {
            await deleteDoc(extra.ref);
            stats.dupsRemoved++;
          }
        } else {
          await addDoc(collection(db, 'inscripciones'), enrollmentData);
          stats.created++;
        }

        setImportLoteProgress({
          current: count,
          total: parsedLoteData.length,
          status: `Inscribiendo alumno ${count} de ${parsedLoteData.length}...`
        });
      }

      const creadosCursosMsg = newCursosMap.size ? ` Se crearon ${newCursosMap.size} curso(s) nuevo(s).` : '';
      const creadasFechasMsg = newFechasMap.size ? ` Se crearon ${newFechasMap.size} fecha(s) nueva(s).` : '';
      const statsMsg = `Se procesaron ${count} filas: ${stats.created} altas, ${stats.updated} actualizadas (coincidencia DNI + Curso + Fecha), ${stats.dupsRemoved} duplicados eliminados${skipped > 0 ? `, ${skipped} omitidas (sin DNI, curso o fecha válidos${skippedExamples.length > 0 ? ` — ej.: ${skippedExamples.join('; ')}` : ''})` : ''}.`;
      await alert({ title: 'Inscripción completada', message: `Inscripción por lotes completada con éxito.\n\n${statsMsg}${creadosCursosMsg}${creadasFechasMsg}`, variant: 'success' });
      await logAudit('Inscripción por lotes', `${statsMsg}${creadosCursosMsg}${creadasFechasMsg} — ${hasPerRowCurso ? 'por fila (Programa/Curso/Fecha del Excel)' : `${selectedCurso} (${selectedFecha})`}`);
      setParsedLoteData([]);
      setWorkbook(null);
      setSheetNames([]);
      setSelectedSheet('');
      setSelectedCurso('');
      setSelectedFecha('');
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Error desconocido';
      await alert({ title: 'Error en la inscripción', message: `Error durante la inscripción por lotes en la fila ${count}: ${message}`, variant: 'danger' });
    } finally {
      setIsImportingLote(false);
    }
  };

  // Exporta TODOS los inscriptos a Excel para revisión/limpieza.
  // Las columnas coinciden con los alias de importación, por lo que el archivo
  // puede re-subirse por Lotes: las coincidencias DNI + Curso + Fecha se pisan
  // (merge: se conservan asistencias y datos no incluidos) y los duplicados se eliminan.
  const handleExportInscriptos = async () => {
    setExportingInscriptos(true);
    try {
      const snap = await getDocs(collection(db, 'inscripciones'));
      if (snap.empty) {
        await alert({ title: 'Sin inscriptos', message: 'No hay inscripciones registradas para exportar.', variant: 'info' });
        return;
      }
      const cursoById = new Map<string, any>();
      const cursoByName = new Map<string, any>();
      cursos.forEach((c: any) => {
        cursoById.set(String(c.idCurso), c);
        const n = c.nombreCompleto || c.curso;
        if (n && !cursoByName.has(n)) cursoByName.set(n, c);
      });
      const rows = snap.docs.map(d => {
        const r: any = d.data();
        const cObj = (r.idCurso !== undefined && r.idCurso !== null && r.idCurso !== '' && cursoById.get(String(r.idCurso)))
          || cursoByName.get(r.curso)
          || null;
        return {
          dni: r.dni ?? '',
          apellido: r.apellido || '',
          nombre: r.nombre || '',
          programa: cObj?.programa || '',
          curso: r.curso || '',
          fechaInicio: r.fechaInicio || '',
          resultado: r.resultado || 'Cursando',
          email: r.email || '',
          unidadAcademica: r.unidadAcademica || '',
          cargoFuncion: r.cargoFuncion || '',
          area: r.area || ''
        };
      });
      rows.sort((a, b) =>
        String(a.curso).localeCompare(String(b.curso)) ||
        String(a.fechaInicio).localeCompare(String(b.fechaInicio)) ||
        String(a.apellido).localeCompare(String(b.apellido)) ||
        String(a.nombre).localeCompare(String(b.nombre))
      );
      const today = new Date().toISOString().split('T')[0];
      downloadExcel(
        rows,
        ['DNI', 'Apellido', 'Nombre', 'Programa', 'Curso', 'Fecha de inicio', 'Condición', 'Email', 'Unidad Académica / Dependencia', 'Cargo / Función', 'Área'],
        ['dni', 'apellido', 'nombre', 'programa', 'curso', 'fechaInicio', 'resultado', 'email', 'unidadAcademica', 'cargoFuncion', 'area'],
        `inscriptos_todos_${today}.xlsx`
      );
      await logAudit('Exportación de inscriptos', `Se exportaron ${rows.length} inscripciones a Excel para revisión/limpieza.`);
      await alert({ title: 'Exportación completada', message: `Se exportaron ${rows.length} inscripciones.\n\nPuede limpiar el Excel y volver a subirlo por Lotes: las filas que coincidan en DNI + Curso + Fecha de inicio se pisan (se conservan las asistencias ya cargadas) y los registros duplicados se eliminan. No elimine ni renombre columnas.`, variant: 'success' });
    } catch (err) {
      console.error('Error exportando inscriptos:', err);
      await alert({ title: 'Error', message: 'No se pudieron exportar las inscripciones. Intente nuevamente.', variant: 'danger' });
    } finally {
      setExportingInscriptos(false);
    }
  };

  const handleClearAllInscripciones = async () => {
    const firstConfirm = await confirm({
      title: 'Atención: Acción irreversible',
      message: '¿Está seguro de que desea eliminar TODAS las inscripciones a cursos de la base de datos?\n\nEsta acción eliminará los registros de inscriptos a todos los cursos y no se puede deshacer.',
      variant: 'warning',
      confirmText: 'Sí, continuar',
      cancelText: 'Cancelar',
    });
    if (!firstConfirm) return;

    const secondConfirm = await confirm({
      title: 'Confirmación final',
      message: '¿Confirma que desea eliminar TODAS las inscripciones a cursos de forma permanente?',
      variant: 'danger',
      confirmText: 'Sí, eliminar todo',
      cancelText: 'Cancelar',
    });
    if (!secondConfirm) return;

    try {
      const snap = await getDocs(collection(db, 'inscripciones'));
      let batch = writeBatch(db);
      let count = 0;

      for (const d of snap.docs) {
        batch.delete(d.ref);
        count++;
        if (count % 400 === 0) {
          await batch.commit();
          batch = writeBatch(db);
        }
      }
      if (count % 400 !== 0) {
        await batch.commit();
      }

      await logAudit('Vaciamiento de inscripciones', `Se eliminaron ${count} inscripciones de la base de datos.`);
      await alert({ title: 'Operación completada', message: `Se han eliminado los ${count} registros de inscripciones a cursos con éxito.`, variant: 'success' });
    } catch (err) {
      console.error('Error al vaciar inscripciones:', err);
      await alert({ title: 'Error', message: 'No se pudieron eliminar las inscripciones. Intente nuevamente.', variant: 'danger' });
    }
  };

  return (
    <div>
      <h2 className="section-title">Inscripción a Cursos</h2>

      {/* Tab selector */}
      <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', borderBottom: '1px solid var(--border-card)', paddingBottom: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          type="button"
          className="enroll-mode-btn"
          onClick={() => { if (!isImportingLote) setEnrollMode('individual'); }}
          style={{
            padding: '8px 16px',
            background: enrollMode === 'individual' ? 'rgba(37, 154, 214, 0.15)' : 'transparent',
            border: 'none',
            borderRadius: '6px',
            color: enrollMode === 'individual' ? 'var(--accent)' : 'var(--text-secondary)',
            cursor: isImportingLote ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <UserPlus size={16} /> Individual
        </button>
        <button
          type="button"
          className="enroll-mode-btn"
          onClick={() => { if (!isImportingLote) setEnrollMode('lotes'); }}
          style={{
            padding: '8px 16px',
            background: enrollMode === 'lotes' ? 'rgba(37, 154, 214, 0.15)' : 'transparent',
            border: 'none',
            borderRadius: '6px',
            color: enrollMode === 'lotes' ? 'var(--accent)' : 'var(--text-secondary)',
            cursor: isImportingLote ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Download size={16} /> Lote x Curso
        </button>
        <button
          type="button"
          className="enroll-mode-btn"
          onClick={() => { if (!isImportingLote) setEnrollMode('historico'); }}
          style={{
            padding: '8px 16px',
            background: enrollMode === 'historico' ? 'rgba(232,188,0,0.18)' : 'transparent',
            border: 'none',
            borderRadius: '6px',
            color: enrollMode === 'historico' ? '#b45309' : 'var(--text-secondary)',
            cursor: isImportingLote ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
          title="Para carga masiva de datos antiguos con Programa/Curso/Fecha por fila"
        >
          <Database size={16} /> Lote Histórico
        </button>
        <div style={{ marginLeft: 'auto' }}>
          <button
            type="button"
            className="enroll-mode-btn"
            onClick={handleExportInscriptos}
            disabled={isImportingLote || exportingInscriptos}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              border: 'none',
              borderRadius: '6px',
              color: 'var(--text-secondary)',
              cursor: (isImportingLote || exportingInscriptos) ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            title="Descargar TODOS los inscriptos a Excel para revisar/limpiar. Al re-subirlo por Lotes, las coincidencias DNI + Curso + Fecha se pisan sin perder asistencias."
          >
            <Upload size={16} /> {exportingInscriptos ? 'Exportando...' : 'Exportar inscriptos'}
          </button>
        </div>
      </div>

      {enrollMode === 'individual' ? (
        <div className="details-grid">
          <div className="details-box">
            <h3>Paso 1: Datos del Alumno</h3>
            <div className="search-box">
              <input
                type="number"
                className="form-control"
                placeholder="DNI del alumno..."
                value={searchDni}
                onChange={e => { setSearchDni(e.target.value); setNotFound(false); setShowAltaForm(false); }}
              />
              <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={searchStudent}>
                <Search size={16} /> Buscar
              </button>
            </div>

            {notFound && (
              <div style={{ padding: '12px', marginBottom: '15px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '8px', fontSize: '0.85rem' }}>
                <strong>DNI no encontrado.</strong>
              </div>
            )}

            {showAltaForm ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="form-row">
                  <FormField
                    label="DNI"
                    type="number"
                    disabled
                    value={searchDni}
                  />
                  <FormField
                    label="Apellido"
                    value={studentForm.apellido}
                    onChange={e => setStudentForm({ ...studentForm, apellido: e.target.value })}
                  />
                  <FormField
                    label="Nombre"
                    value={studentForm.nombre}
                    onChange={e => setStudentForm({ ...studentForm, nombre: e.target.value })}
                  />
                  <FormField
                    label="E-mail"
                    type="email"
                    value={studentForm.email}
                    onChange={e => setStudentForm({ ...studentForm, email: e.target.value })}
                  />
                </div>
                <div className="form-row">
                  <FormField
                    label="Celular"
                    value={studentForm.telPart}
                    onChange={e => setStudentForm({ ...studentForm, telPart: e.target.value })}
                  />
                  <FormField
                    label="Fecha de nacimiento"
                    type="date"
                    value={studentForm.fechaNac}
                    onChange={e => setStudentForm({ ...studentForm, fechaNac: e.target.value })}
                  />
                  <FormField
                    label="Edad"
                    disabled
                    value={studentForm.edad}
                  />
                  <FormField
                    label="Estudios"
                    value={studentForm.nivelEstudio}
                    onChange={e => setStudentForm({ ...studentForm, nivelEstudio: e.target.value })}
                    options={[
                      { value: 'Sin dato', label: '--Seleccionar--' },
                      { value: 'Primario incompleto', label: 'Primario incompleto' },
                      { value: 'Primario completo', label: 'Primario completo' },
                      { value: 'Secundario incompleto', label: 'Secundario incompleto' },
                      { value: 'Secundario completo', label: 'Secundario completo' },
                      { value: 'Terciario incompleto', label: 'Terciario incompleto' },
                      { value: 'Terciario completo', label: 'Terciario completo' },
                      { value: 'Universitario incompleto', label: 'Universitario incompleto' },
                      { value: 'Universitario completo', label: 'Universitario completo' },
                    ]}
                  />
                </div>
                <div className="form-row">
                  <FormField
                    label="Título obtenido"
                    value={studentForm.titulo}
                    onChange={e => setStudentForm({ ...studentForm, titulo: e.target.value })}
                  />
                  <FormField
                    label="Sec. Rectorado/UA"
                    value={studentForm.unidadAcademica}
                    onChange={e => setStudentForm({ ...studentForm, unidadAcademica: e.target.value })}
                    options={secOptions}
                  />
                  <FormField
                    label="Dirección u Oficina"
                    value={studentForm.direccionOficina}
                    onChange={e => setStudentForm({ ...studentForm, direccionOficina: e.target.value })}
                    placeholder="Ej: Centro de Capacitación"
                  />
                  <FormField
                    label="Área de trabajo"
                    value={studentForm.area}
                    onChange={e => setStudentForm({ ...studentForm, area: e.target.value })}
                  />
                </div>
                <div className="form-row">
                  <FormField
                    label="Cargo o Función"
                    value={studentForm.cargoFuncion}
                    onChange={e => setStudentForm({ ...studentForm, cargoFuncion: e.target.value })}
                    options={cargoOptions}
                  />
                  <FormField
                    label="Personal a cargo"
                    type="number"
                    value={studentForm.personas}
                    onChange={e => setStudentForm({ ...studentForm, personas: e.target.value })}
                  />
                  <FormField
                    label="Teléfono laboral"
                    value={studentForm.telLab}
                    onChange={e => setStudentForm({ ...studentForm, telLab: e.target.value })}
                  />
                  <FormField
                    label="Interno"
                    value={studentForm.interno}
                    onChange={e => setStudentForm({ ...studentForm, interno: e.target.value })}
                  />
                </div>
              </div>
            ) : studentForm.dni ? (
              <div style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
                <p><strong>DNI:</strong> {studentForm.dni}</p>
                <p><strong>Apellido:</strong> {studentForm.apellido}</p>
                <p><strong>Nombre:</strong> {studentForm.nombre}</p>
                <p><strong>Sec. Rectorado/UA:</strong> {studentForm.unidadAcademica}</p>
                <p><strong>Email:</strong> {studentForm.email}</p>
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Busque un alumno para inscribirlo en un curso.</p>
            )}
          </div>

          <div className="details-box">
            <h3>Paso 2: Selección del Curso</h3>
            <div className="form-group">
              <label>Programa</label>
              {(() => {
                const programas = [...new Set(cursos.map(c => c.programa?.trim() || 'Otros'))].sort();
                return (
                  <select className="form-control" value={cursoFilterIndiv} onChange={e => { setCursoFilterIndiv(e.target.value); setSelectedCurso(''); setSelectedFecha(''); }}>
                    <option value="">-- Todos los programas --</option>
                    {programas.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                );
              })()}
            </div>
            <div className="form-group">
              <label>Seleccionar Curso</label>
              <select
                className="form-control"
                value={selectedCurso}
                onChange={e => setSelectedCurso(e.target.value)}
              >
                <option value="">-- Seleccione un Curso --</option>
                {cursos.filter(c => !cursoFilterIndiv || (c.programa?.trim() || 'Otros') === cursoFilterIndiv).map(c => (
                  <option key={c.idCurso} value={c.nombreCompleto || c.curso}>{c.nombreCompleto || c.curso}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Fecha de Inicio</label>
              <select
                className="form-control"
                value={selectedFecha}
                onChange={e => setSelectedFecha(e.target.value)}
                disabled={!selectedCurso}
              >
                <option value="">-- Seleccione Fecha --</option>
                {fechasFiltradas.map((f, i) => (
                  <option key={i} value={f.inicio}>{formatDateAR(f.inicio)}</option>
                ))}
              </select>
            </div>

            {showAltaForm ? (
              <button
                type="button"
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%' }}
                onClick={handleAltaYInscribir}
                disabled={!searchDni || !studentForm.apellido || !studentForm.nombre || !selectedCurso || !selectedFecha}
              >
                <UserPlus size={16} /> Guardar datos e inscribir
              </button>
            ) : (
              <button
                type="button"
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%' }}
                onClick={handleEnroll}
                disabled={!studentForm.dni || !selectedCurso || !selectedFecha}
              >
                <CheckSquare size={16} /> Confirmar Inscripción
              </button>
            )}
          </div>
        </div>
      ) : enrollMode === 'lotes' ? (
        <div className="details-grid">
          {/* Lotes simple Paso 1 */}
          <div className="details-box" style={{ height: 'fit-content' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              Paso 1: Destinatario de la Inscripción
              <button type="button" onClick={() => alert({ title: 'Paso 1 — Destinatario', message: 'Seleccione Programa → Curso → Fecha de inicio. Ese destino se aplicará a TODAS las filas del Excel.\n\nIdeal para lotes actuales donde todas las personas van al mismo curso.', variant: 'info' })} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'inline-flex', color: '#E8BC00' }} title="¿De qué se trata?"><HelpCircle size={16} /></button>
            </h3>
            
            <div className="form-group">
              <label>Programa</label>
              {(() => {
                const programas = [...new Set(cursos.map(c => c.programa?.trim() || 'Otros'))].sort();
                return (
                  <select className="form-control" value={cursoFilterLotes} onChange={e => { setCursoFilterLotes(e.target.value); setSelectedCurso(''); setSelectedFecha(''); }} disabled={isImportingLote}>
                    <option value="">-- Todos los programas --</option>
                    {programas.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                );
              })()}
            </div>
            <div className="form-group">
              <label>Seleccionar Curso</label>
              <select
                className="form-control"
                value={selectedCurso}
                onChange={e => setSelectedCurso(e.target.value)}
                disabled={isImportingLote}
              >
                <option value="">-- Seleccione un Curso --</option>
                {cursos.filter(c => !cursoFilterLotes || (c.programa?.trim() || 'Otros') === cursoFilterLotes).map(c => (
                  <option key={c.idCurso} value={c.nombreCompleto || c.curso}>{c.nombreCompleto || c.curso}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Fecha de Inicio</label>
              <select
                className="form-control"
                value={selectedFecha}
                onChange={e => setSelectedFecha(e.target.value)}
                disabled={!selectedCurso || isImportingLote}
              >
                <option value="">-- Seleccione Fecha --</option>
                {fechasFiltradas.map((f, i) => (
                  <option key={i} value={f.inicio}>{formatDateAR(f.inicio)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Lotes simple Paso 2 */}
          <div className="details-box">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              Paso 2: Cargar Excel / CSV
              <button type="button" onClick={() => alert({ title: 'Paso 2 — Excel simple', message: 'Excel con 4 columnas:\n\nDNI | Apellido | Nombre | Condición\n\nValores de Condición: Cursando, Aprobado, Desaprobado, Abandonó (por defecto Cursando).\n\nEl Programa/Curso/Fecha se toma del Paso 1 para todas las filas. No se modifica el padrón de Alumnos, solo Inscriptos.', variant: 'info' })} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'inline-flex', color: '#E8BC00' }} title="¿De qué se trata?"><HelpCircle size={16} /></button>
            </h3>
            
            <div className="form-group">
              <label>Seleccionar Archivo (Excel o CSV)</label>
              <input 
                type="file" 
                className="form-control" 
                accept=".xlsx, .xls, .xlsm, .csv" 
                onChange={handleLoteFileChange}
                disabled={isImportingLote}
              />
            </div>

            {sheetNames.length > 1 && (
              <div className="form-group">
                <label>Seleccionar Hoja de Excel</label>
                <select 
                  className="form-control"
                  value={selectedSheet}
                  onChange={e => handleLoteSheetChange(e.target.value)}
                  disabled={isImportingLote}
                >
                  {sheetNames.map((s, idx) => (
                    <option key={idx} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            )}

            {parsedLoteData.length > 0 && (
              <div style={{ marginTop: '15px' }}>
                <p style={{ fontSize: '0.9rem', marginBottom: '8px' }}>
                  <strong>Vista Previa (Primeras 5 filas):</strong> {parsedLoteData.length} inscriptos cargados.
                </p>
                <div className="preview-table-wrapper" style={{ overflowX: 'auto', maxHeight: '180px' }}>
                  <table className="listbox-table" style={{ fontSize: '0.75rem' }}>
                    <thead>
                      <tr>
                        {Object.keys(parsedLoteData[0]).map((k, idx) => (
                          <th key={idx}>{k}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsedLoteData.slice(0, 5).map((row, rowIdx) => (
                        <tr key={rowIdx}>
                          {Object.values(row).map((v: any, valIdx) => (
                            <td key={valIdx}>{String(v)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {!isImportingLote ? (
                  <button 
                    type="button"
                    className="btn-primary" 
                    style={{ marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%' }} 
                    onClick={executeLoteEnrollment}
                    disabled={!selectedCurso || !selectedFecha || parsedLoteData.length === 0 || isImportingLote}
                  >
                    <Database size={16} /> Confirmar Inscripción Masiva ({parsedLoteData.length} alumnos)
                  </button>
                ) : (
                  <div style={{ marginTop: '20px' }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 600 }}>
                      {importLoteProgress.status}
                    </p>
                    <div className="progress-bar-container" style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden', marginTop: '5px' }}>
                      <div 
                        className="progress-bar" 
                        style={{ width: `${(importLoteProgress.current / importLoteProgress.total) * 100}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.2s ease' }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="details-grid">
          {/* Histórico Paso 1 */}
          <div className="details-box" style={{ height: 'fit-content' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              Paso 1: Destinatario <span style={{ fontWeight: 400, fontSize: '0.8rem', color: 'var(--text-muted)' }}>(opcional)</span>
              <button type="button" onClick={() => alert({ title: 'Paso 1 — Histórico (opcional)', message: 'Opcional. Si el Excel ya trae columnas Programa / Curso / Fecha de inicio por fila (ej. Informática — Excel / Word / Power Point o Calidad de vida laboral), puede dejar este paso vacío.\n\nSi no trae esas columnas, seleccione aquí un Programa → Curso → Fecha que se aplicará a todas las filas.\n\nLos cursos y fechas que no existan se crearán automáticamente con Cantidad clases y Carga horaria de la fila.', variant: 'info' })} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'inline-flex', color: '#E8BC00' }} title="¿De qué se trata?"><HelpCircle size={16} /></button>
            </h3>
            <div className="form-group">
              <label>Programa (filtro)</label>
              {(() => {
                const programas = [...new Set(cursos.map(c => c.programa?.trim() || 'Otros'))].sort();
                return (
                  <select className="form-control" value={cursoFilterLotes} onChange={e => { setCursoFilterLotes(e.target.value); setSelectedCurso(''); setSelectedFecha(''); }} disabled={isImportingLote}>
                    <option value="">-- Todos los programas --</option>
                    {programas.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                );
              })()}
            </div>
            <div className="form-group">
              <label>Seleccionar Curso (opcional)</label>
              <select
                className="form-control"
                value={selectedCurso}
                onChange={e => setSelectedCurso(e.target.value)}
                disabled={isImportingLote}
              >
                <option value="">-- Por fila del Excel --</option>
                {cursos.filter(c => !cursoFilterLotes || (c.programa?.trim() || 'Otros') === cursoFilterLotes).map(c => (
                  <option key={c.idCurso} value={c.nombreCompleto || c.curso}>{c.nombreCompleto || c.curso}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Fecha de Inicio (opcional)</label>
              <select
                className="form-control"
                value={selectedFecha}
                onChange={e => setSelectedFecha(e.target.value)}
                disabled={!selectedCurso || isImportingLote}
              >
                <option value="">-- Por fila del Excel --</option>
                {fechasFiltradas.map((f, i) => (
                  <option key={i} value={f.inicio}>{formatDateAR(f.inicio)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Histórico Paso 2 */}
          <div className="details-box">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              Paso 2: Cargar Excel histórico
              <button type="button" onClick={() => alert({ title: 'Paso 2 — Excel histórico', message: 'Estructura requerida (9 columnas):\n\nDNI | Apellido | Nombre | Programa | Curso | Fecha de inicio | Condición | Cantidad clases | Carga horaria\n\n• Programa/Curso/Fecha: cada fila puede tener valores distintos (ej. Informática — Excel / Word / Power Point). Se crean automáticamente si no existen.\n• Cantidad clases / Carga horaria: opcionales, se usan al crear el curso/fecha.\n• Condición: Cursando, Aprobado, Desaprobado, Abandonó (por defecto Cursando).\n\nNo se modifica el padrón de Alumnos, solo Inscriptos.', variant: 'info' })} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'inline-flex', color: '#E8BC00' }} title="¿De qué se trata?"><HelpCircle size={16} /></button>
            </h3>
            
            <div className="form-group">
              <label>Seleccionar Archivo (Excel o CSV)</label>
              <input 
                type="file" 
                className="form-control" 
                accept=".xlsx, .xls, .xlsm, .csv" 
                onChange={handleLoteFileChange}
                disabled={isImportingLote}
              />
            </div>

            {sheetNames.length > 1 && (
              <div className="form-group">
                <label>Seleccionar Hoja de Excel</label>
                <select 
                  className="form-control"
                  value={selectedSheet}
                  onChange={e => handleLoteSheetChange(e.target.value)}
                  disabled={isImportingLote}
                >
                  {sheetNames.map((s, idx) => (
                    <option key={idx} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            )}

            {parsedLoteData.length > 0 && (
              <div style={{ marginTop: '15px' }}>
                <p style={{ fontSize: '0.9rem', marginBottom: '8px' }}>
                  <strong>Vista Previa (Primeras 5 filas):</strong> {parsedLoteData.length} inscriptos cargados.
                </p>
                <div className="preview-table-wrapper" style={{ overflowX: 'auto', maxHeight: '180px' }}>
                  <table className="listbox-table" style={{ fontSize: '0.75rem' }}>
                    <thead>
                      <tr>
                        {Object.keys(parsedLoteData[0]).map((k, idx) => (
                          <th key={idx}>{k}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsedLoteData.slice(0, 5).map((row, rowIdx) => (
                        <tr key={rowIdx}>
                          {Object.values(row).map((v: any, valIdx) => (
                            <td key={valIdx}>{String(v)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {!isImportingLote ? (
                  <button 
                    type="button"
                    className="btn-primary" 
                    style={{ marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', background: '#b45309', borderColor: '#b45309' }} 
                    onClick={executeLoteEnrollment}
                    disabled={parsedLoteData.length === 0 || isImportingLote}
                  >
                    <Database size={16} /> Confirmar Lote Histórico ({parsedLoteData.length} inscriptos)
                  </button>
                ) : (
                  <div style={{ marginTop: '20px' }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 600 }}>
                      {importLoteProgress.status}
                    </p>
                    <div className="progress-bar-container" style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden', marginTop: '5px' }}>
                      <div 
                        className="progress-bar" 
                        style={{ width: `${(importLoteProgress.current / importLoteProgress.total) * 100}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.2s ease' }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
