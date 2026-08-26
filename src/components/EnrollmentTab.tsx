import React, { useState, useEffect, useMemo } from 'react';
import { getDoc, doc, setDoc, collection, addDoc, query, where, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { logAudit } from '../utils/audit';
import { Search, CheckSquare, UserPlus, FileSpreadsheet, Upload, Database, AlertTriangle, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { formatDateAR } from '../utils/dateAR';
import { excelDateToJSDate } from '../utils/date';
import { useModal } from './ModalProvider';

interface EnrollmentTabProps {
  cursos: any[];
  fechas: any[];
  facultades?: any[];
  alumnos?: any[];
}

export const EnrollmentTab: React.FC<EnrollmentTabProps> = ({ cursos, fechas, facultades = [], alumnos = [] }) => {
  const { confirm, alert } = useModal();
  // Toggle Mode
  const [enrollMode, setEnrollMode] = useState<'individual' | 'lotes'>('individual');

  // Lote state
  const [parsedLoteData, setParsedLoteData] = useState<any[]>([]);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [isImportingLote, setIsImportingLote] = useState(false);
  const [importLoteProgress, setImportLoteProgress] = useState({ current: 0, total: 0, status: '' });

  const [searchDni, setSearchDni] = useState('');
  const [studentForm, setStudentForm] = useState({
    dni: '',
    apellido: '',
    nombre: '',
    email: '',
    unidadAcademica: '',
    cargoFuncion: ''
  });
  const [selectedCurso, setSelectedCurso] = useState('');
  const [selectedFecha, setSelectedFecha] = useState('');
  const [cursoFilterIndiv, setCursoFilterIndiv] = useState('');
  const [cursoFilterLotes, setCursoFilterLotes] = useState('');
  const [fechasFiltradas, setFechasFiltradas] = useState<any[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [showAltaForm, setShowAltaForm] = useState(false);
  const [altaForm, setAltaForm] = useState({
    fechaNac: '',
    telPart: '',
    nivelEstudio: 'Sin dato',
    titulo: '',
    area: '',
    personas: '0',
    telLab: '',
    interno: ''
  });

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

  useEffect(() => {
    if (selectedCurso) {
      const courseObj = cursos.find(c => c.curso === selectedCurso);
      if (courseObj) {
        const filtered = fechas.filter(f => f.idCurso === courseObj.idCurso);
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
    setStudentForm({ dni: '', apellido: '', nombre: '', email: '', unidadAcademica: '', cargoFuncion: '' });
    setAltaForm({ fechaNac: '', telPart: '', nivelEstudio: 'Sin dato', titulo: '', area: '', personas: '0', telLab: '', interno: '' });
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
          dni: String(data.dni || searchDni),
          apellido: data.apellido || '',
          nombre: data.nombre || '',
          email: data.email || '',
          unidadAcademica: data.unidadAcademica || 'Sin dato',
          cargoFuncion: data.cargoFuncion || ''
        });
      } else {
        setStudentForm({ dni: '', apellido: '', nombre: '', email: '', unidadAcademica: '', cargoFuncion: '' });
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
    try {
      await setDoc(doc(db, 'alumnos', searchDni), {
        dni: Number(searchDni),
        apellido: (studentForm.apellido || '').toUpperCase(),
        nombre: (studentForm.nombre || '').toUpperCase(),
        fechaNac: altaForm.fechaNac,
        edad: altaForm.fechaNac ? Math.floor((Date.now() - new Date(altaForm.fechaNac).getTime()) / 31557600000) : 0,
        telPart: altaForm.telPart,
        nivelEstudio: altaForm.nivelEstudio,
        titulo: altaForm.titulo,
        unidadAcademica: studentForm.unidadAcademica || 'Sin dato',
        area: altaForm.area,
        cargoFuncion: studentForm.cargoFuncion || '',
        personas: Number(altaForm.personas),
        email: (studentForm.email || '').toLowerCase(),
        telLab: altaForm.telLab,
        interno: altaForm.interno,
        medios: []
      });

      const courseObj = cursos.find(c => c.curso === selectedCurso);
      const enrollmentData = {
        dni: Number(searchDni),
        apellido: (studentForm.apellido || '').toUpperCase(),
        nombre: (studentForm.nombre || '').toUpperCase(),
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
      await logAudit('Inscripción individual', `${enrollmentData.apellido}, ${enrollmentData.nombre} — ${selectedCurso} (${selectedFecha})`);

      await alert({ title: 'Alta e inscripción exitosa', message: 'Alumno dado de alta e inscrito con éxito.', variant: 'success' });
      resetAll();
    } catch (err) {
      console.error(err);
      await alert({ title: 'Error', message: 'No se pudo dar de alta e inscribir. Intente nuevamente.', variant: 'danger' });
    }
  };

  const handleEnroll = async () => {
    if (!studentForm.dni || !selectedCurso || !selectedFecha) return;
    try {
      const courseObj = cursos.find(c => c.curso === selectedCurso);
      const enrollmentData = {
        dni: Number(studentForm.dni),
        apellido: studentForm.apellido,
        nombre: studentForm.nombre,
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

      setStudentForm({ dni: '', apellido: '', nombre: '', email: '', unidadAcademica: '', cargoFuncion: '' });
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
    if (!selectedCurso || !selectedFecha) {
      await alert({ title: 'Campos incompletos', message: 'Debe seleccionar un curso y una fecha de inicio.', variant: 'warning' });
      return;
    }
    if (parsedLoteData.length === 0) {
      await alert({ title: 'Sin datos', message: 'No hay datos para inscribir.', variant: 'info' });
      return;
    }

    setIsImportingLote(true);
    setImportLoteProgress({ current: 0, total: parsedLoteData.length, status: 'Iniciando inscripción por lotes...' });

    let count = 0;
    try {
      const courseObj = cursos.find(c => c.curso === selectedCurso);
      const idCursoVal = courseObj ? courseObj.idCurso : '';

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
        if (!dniVal) continue;

        // 1. Save or update the student in 'alumnos' collection using merge (overwriting data)
        const studentData: any = {
          dni: dniVal
        };

        const setIfPresent = (aliases: string[], targetKey: string, transform?: (val: any) => any) => {
          const val = getVal(aliases);
          if (val !== undefined) {
            studentData[targetKey] = transform ? transform(val) : val;
          }
        };

          setIfPresent(['apellido', 'apellidos', 'surname', 'last name', 'apellido y nombre', 'apellidos y nombres'], 'apellido', (v) => String(v).toUpperCase().trim());
          setIfPresent(['nombre', 'nombres', 'name', 'first name'], 'nombre', (v) => String(v).toUpperCase().trim());
          setIfPresent(['fecha nac', 'nacimiento', 'fechanac', 'fecha de nacimiento', 'fec nac', 'fecha nacimiento'], 'fechaNac', (v) => excelDateToJSDate(v));
          setIfPresent(['edad', 'age'], 'edad', (v) => Number(v) || 0);
          setIfPresent(['tel part', 'telefono', 'telpart', 'celular', 'tel', 'whatsapp', 'movil', 'telefono particular', 'tel particular', 'celular particular', 'telefono contacto'], 'telPart', (v) => String(v).trim());
          setIfPresent(['nivel estudio', 'estudios', 'nivelestudio', 'nivel de estudios', 'estudio', 'nivel academico', 'nivel de estudio', 'estudios alcanzados'], 'nivelEstudio', (v) => String(v).trim());
          setIfPresent(['titulo', 'titulo obtenido', 'profesion', 'carrera'], 'titulo', (v) => String(v).trim());
          setIfPresent([
            'unidad academica', 'unidad academica / dependencia', 'unidad academica/dependencia', 'unidad academica o dependencia',
            'facultad', 'dependencia', 'unidadacademica', 'unidad', 'lugar de trabajo', 'lugar trabajo', 'facultad / dependencia',
            'facultad/dependencia', 'unidad / dependencia', 'unidad/dependencia', 'organismo', 'instituto', 'escuela', 'ua'
          ], 'unidadAcademica', (v) => String(v).trim());
          setIfPresent([
            'area', 'area de trabajo', 'areadetrabajo', 'sector', 'departamento', 'seccion', 'division', 'oficina', 'area laboral',
            'sector de trabajo', 'lugar especifico', 'area sector', 'area / sector', 'area/sector'
          ], 'area', (v) => String(v).trim());
          setIfPresent(['cargo', 'funcion', 'cargofuncion', 'cargo / funcion', 'cargo/funcion', 'cargo o funcion', 'puesto', 'puesto de trabajo'], 'cargoFuncion', (v) => String(v).trim());
          setIfPresent(['personas', 'personas a cargo', 'personal', 'personal a cargo', 'gente a cargo'], 'personas', (v) => Number(v) || 0);
          setIfPresent(['email', 'correo', 'e-mail', 'mail', 'correo electronico', 'e mail', 'direccion de correo', 'email personal', 'email laboral'], 'email', (v) => String(v).toLowerCase().trim());
          setIfPresent(['tel lab', 'tellab', 'telefono laboral', 'tel trabajo', 'laboral', 'telefono de trabajo', 'tel oficina'], 'telLab', (v) => String(v).trim());
          setIfPresent(['interno', 'int', 'nro interno', 'numero interno'], 'interno', (v) => String(v).trim());

        // Save student
        await setDoc(doc(db, 'alumnos', String(dniVal)), studentData, { merge: true });

        // 2. Inscribe the student in the selected course + date, checking for duplicates
        const enrollmentData = {
          dni: dniVal,
          apellido: studentData.apellido || '',
          nombre: studentData.nombre || '',
          curso: selectedCurso,
          fechaInicio: selectedFecha,
          resultado: 'Cursando',
          email: studentData.email || '',
          cargoFuncion: studentData.cargoFuncion || '',
          unidadAcademica: studentData.unidadAcademica || 'Sin dato',
          ua: idCursoVal,
          idCurso: idCursoVal
        };

        const q = query(
          collection(db, 'inscripciones'),
          where('dni', '==', dniVal),
          where('curso', '==', selectedCurso),
          where('fechaInicio', '==', selectedFecha)
        );
        const snap = await getDocs(q);

        if (!snap.empty) {
          const docId = snap.docs[0].id;
          await setDoc(doc(db, 'inscripciones', docId), enrollmentData, { merge: true });
        } else {
          await addDoc(collection(db, 'inscripciones'), enrollmentData);
        }

        setImportLoteProgress({
          current: count,
          total: parsedLoteData.length,
          status: `Inscribiendo alumno ${count} de ${parsedLoteData.length}...`
        });
      }

      await alert({ title: 'Inscripción completada', message: `Inscripción por lotes completada con éxito. Se inscribieron y/o actualizaron ${count} alumnos.`, variant: 'success' });
      await logAudit('Inscripción por lotes', `${count} alumnos — ${selectedCurso} (${selectedFecha})`);
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
          <UserPlus size={16} /> Inscripción Individual
        </button>
        <button
          type="button"
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
          <Upload size={16} /> Inscripción por Lotes
        </button>
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
                <strong>DNI no registrado.</strong> Completá los datos para dar de alta al alumno.
              </div>
            )}

            {showAltaForm ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="form-row">
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>DNI</label>
                    <input type="number" className="form-control" value={searchDni} disabled />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Apellido</label>
                    <input type="text" className="form-control" value={studentForm.apellido} onChange={e => setStudentForm({ ...studentForm, apellido: e.target.value.toUpperCase() })} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Nombre</label>
                    <input type="text" className="form-control" value={studentForm.nombre} onChange={e => setStudentForm({ ...studentForm, nombre: e.target.value.toUpperCase() })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Fecha de Nacimiento</label>
                    <input type="date" className="form-control" value={altaForm.fechaNac} onChange={e => setAltaForm({ ...altaForm, fechaNac: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Celular</label>
                    <input type="text" className="form-control" value={altaForm.telPart} onChange={e => setAltaForm({ ...altaForm, telPart: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Correo Electrónico</label>
                    <input type="email" className="form-control" value={studentForm.email} onChange={e => setStudentForm({ ...studentForm, email: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Nivel de Estudio</label>
                    <select className="form-control" value={altaForm.nivelEstudio} onChange={e => setAltaForm({ ...altaForm, nivelEstudio: e.target.value })}>
                      <option value="Sin dato">Sin dato</option>
                      <option value="Primario completo">Primario completo</option>
                      <option value="Secundario completo">Secundario completo</option>
                      <option value="Terciario completo">Terciario completo</option>
                      <option value="Universitario incompleto">Universitario incompleto</option>
                      <option value="Universitario completo">Universitario completo</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Secr. de Rectorado/Unidad Académica</label>
                    <input type="text" list="lista-facultades-enroll" className="form-control" value={studentForm.unidadAcademica} onChange={e => setStudentForm({ ...studentForm, unidadAcademica: e.target.value })} placeholder="Seleccione o ingrese..." />
                    <datalist id="lista-facultades-enroll">
                      {facultadesOptions.map((name, i) => (
                        <option key={i} value={name} />
                      ))}
                    </datalist>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Cargo / Función</label>
                    <input type="text" className="form-control" value={studentForm.cargoFuncion} onChange={e => setStudentForm({ ...studentForm, cargoFuncion: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Área de Trabajo</label>
                    <input type="text" className="form-control" value={altaForm.area} onChange={e => setAltaForm({ ...altaForm, area: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Personas a Cargo</label>
                    <input type="number" className="form-control" value={altaForm.personas} onChange={e => setAltaForm({ ...altaForm, personas: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Teléfono Laboral</label>
                    <input type="text" className="form-control" value={altaForm.telLab} onChange={e => setAltaForm({ ...altaForm, telLab: e.target.value })} />
                  </div>
                </div>
              </div>
            ) : studentForm.dni ? (
              <div style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
                <p><strong>DNI:</strong> {studentForm.dni}</p>
                <p><strong>Apellido:</strong> {studentForm.apellido}</p>
                <p><strong>Nombre:</strong> {studentForm.nombre}</p>
                <p><strong>Secr. de Rectorado/Unidad Académica:</strong> {studentForm.unidadAcademica}</p>
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
                  <option key={c.idCurso} value={c.curso}>{c.curso}</option>
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
                  <option key={i} value={f.inicio}>{f.inicio}</option>
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
                <UserPlus size={16} /> Dar de Alta e Inscribir
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
      ) : (
        <div className="details-grid">
          {/* Lotes Paso 1: Selección de Curso */}
          <div className="details-box" style={{ height: 'fit-content' }}>
            <h3>Paso 1: Destinatario de la Inscripción</h3>
            
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
                  <option key={c.idCurso} value={c.curso}>{c.curso}</option>
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

          {/* Lotes Paso 2: Carga y Procesamiento */}
          <div className="details-box">
            <h3>Paso 2: Cargar Excel / CSV</h3>
            
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
                    disabled={!selectedCurso || !selectedFecha}
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
      )}
    </div>
  );
};
