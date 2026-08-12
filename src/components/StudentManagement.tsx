import React, { useState, useEffect } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { FormField } from './FormField';
import { ImportModal } from './ImportModal';
import { Download, Plus, Upload, Save, UserPlus, Search, GraduationCap, FileText } from 'lucide-react';
import { downloadExcel } from '../utils/excel';
import { StudentHistoryTab } from './StudentHistoryTab';

interface StudentManagementProps {
  facultades: any[];
  activeTab: string;
  alumnos: any[];
}

/**
 * StudentManagement component managing students through a Master-Detail layout.
 * Employs SOLID design patterns (SRP), DRY (by utilizing FormField sub-components), 
 * and encapsulates local state workflows (such as importing and searching).
 */
export const StudentManagement: React.FC<StudentManagementProps> = ({ facultades, activeTab, alumnos }) => {
  const [currentSubTab, setCurrentSubTab] = useState<'alta' | 'historial'>('alta');
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [selectedStudentDni, setSelectedStudentDni] = useState<string | null>(null);
  const [showDetailOnMobile, setShowDetailOnMobile] = useState(false);
  const [alumnoEncontrado, setAlumnoEncontrado] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Advanced Filters State
  const [filterDni, setFilterDni] = useState('');
  const [filterApellido, setFilterApellido] = useState('');
  const [filterNombre, setFilterNombre] = useState('');
  const [filterUa, setFilterUa] = useState('');
  const [filterNivel, setFilterNivel] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Pagination State
  const [currentStudentPage, setCurrentStudentPage] = useState(1);
  const studentsPerPage = 20;

  const studentList = alumnos;

  // Reset pagination on filter changes
  useEffect(() => {
    setCurrentStudentPage(1);
  }, [studentSearchTerm, filterDni, filterApellido, filterNombre, filterUa, filterNivel]);

  const [studentForm, setStudentForm] = useState({
    dni: '',
    apellido: '',
    nombre: '',
    fechaNac: '',
    edad: '',
    telPart: '',
    nivelEstudio: 'Sin dato',
    titulo: '',
    unidadAcademica: 'Sin dato',
    area: '',
    cargoFuncion: '',
    personas: '0',
    email: '',
    telLab: '',
    interno: '',
    medios: [] as string[]
  });

  useEffect(() => {
    if (studentForm.fechaNac) {
      const birth = new Date(studentForm.fechaNac);
      const today = new Date();
      let calculatedAge = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        calculatedAge--;
      }
      setStudentForm(prev => ({ ...prev, edad: calculatedAge.toString() }));
    }
  }, [studentForm.fechaNac]);

  const saveStudent = async (type: 'alta' | 'actualizar') => {
    if (!studentForm.dni || !studentForm.apellido || !studentForm.nombre) {
      alert('DNI, Apellido y Nombre son campos requeridos.');
      return;
    }
    try {
      const studentData = {
        dni: Number(studentForm.dni),
        apellido: studentForm.apellido.toUpperCase(),
        nombre: studentForm.nombre.toUpperCase(),
        fechaNac: studentForm.fechaNac,
        edad: Number(studentForm.edad),
        telPart: studentForm.telPart,
        nivelEstudio: studentForm.nivelEstudio,
        titulo: studentForm.titulo,
        unidadAcademica: studentForm.unidadAcademica,
        area: studentForm.area,
        cargoFuncion: studentForm.cargoFuncion,
        personas: Number(studentForm.personas),
        email: studentForm.email.toLowerCase(),
        telLab: studentForm.telLab,
        interno: studentForm.interno,
        medios: studentForm.medios
      };
      
      await setDoc(doc(db, 'alumnos', studentForm.dni), studentData);
      alert(type === 'alta' ? 'Alumno registrado con éxito.' : 'Datos del alumno actualizados.');
      setAlumnoEncontrado(true);
      setSelectedStudentDni(String(studentForm.dni));
    } catch (err) {
      console.error(err);
      alert('Error al guardar datos del alumno.');
    }
  };

  const handleSelectStudent = (student: any) => {
    setStudentForm({
      dni: String(student.dni),
      apellido: student.apellido || '',
      nombre: student.nombre || '',
      fechaNac: student.fechaNac || '',
      edad: String(student.edad || ''),
      telPart: student.telPart || '',
      nivelEstudio: student.nivelEstudio || 'Sin dato',
      titulo: student.titulo || '',
      unidadAcademica: student.unidadAcademica || 'Sin dato',
      area: student.area || '',
      cargoFuncion: student.cargoFuncion || '',
      personas: String(student.personas || '0'),
      email: student.email || '',
      telLab: student.telLab || '',
      interno: student.interno || '',
      medios: student.medios || []
    });
    setAlumnoEncontrado(true);
    setSelectedStudentDni(String(student.dni));
    setShowDetailOnMobile(true);
  };

  const handleNewStudent = () => {
    setStudentForm({
      dni: '',
      apellido: '',
      nombre: '',
      fechaNac: '',
      edad: '',
      telPart: '',
      nivelEstudio: 'Sin dato',
      titulo: '',
      unidadAcademica: 'Sin dato',
      area: '',
      cargoFuncion: '',
      personas: '0',
      email: '',
      telLab: '',
      interno: '',
      medios: []
    });
    setAlumnoEncontrado(false);
    setSelectedStudentDni(null);
    setShowDetailOnMobile(true);
  };

  const [searchFeedback, setSearchFeedback] = useState<{ found: boolean; message: string } | null>(null);

  const handleSearchByDni = () => {
    if (!studentForm.dni.trim()) {
      setSearchFeedback(null);
      return;
    }
    const found = studentList.find(s => String(s.dni) === studentForm.dni.trim());
    if (found) {
      handleSelectStudent(found);
      setSearchFeedback({
        found: true,
        message: `${found.apellido || ''}, ${found.nombre || ''}`
      });
    } else {
      setAlumnoEncontrado(false);
      setSelectedStudentDni(null);
      setSearchFeedback({
        found: false,
        message: 'No se encontraron datos'
      });
    }
  };

  return (
    <div>
      {/* Submenú / Tabs de navegación interno */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--border-card)', paddingBottom: '10px' }}>
        <button 
          className={`btn-${currentSubTab === 'alta' ? 'primary' : 'secondary'}`}
          style={{ margin: 0, height: '38px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          onClick={() => setCurrentSubTab('alta')}
        >
          <GraduationCap size={16} /> Alta y modificación
        </button>
        <button 
          className={`btn-${currentSubTab === 'historial' ? 'primary' : 'secondary'}`}
          style={{ margin: 0, height: '38px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          onClick={() => setCurrentSubTab('historial')}
        >
          <FileText size={16} /> Cursos por alumno
        </button>
      </div>

      {currentSubTab === 'historial' ? (
        <StudentHistoryTab alumnos={alumnos} defaultDni={studentForm.dni} />
      ) : (
        <div>
          <h2 className="section-title" style={{ marginTop: 0 }}>Gestión de Alumnos y Altas</h2>

          <div className="details-box">
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: '20px', flexWrap: 'nowrap', gap: '8px', width: '100%', overflowX: 'auto' }}>
              {/* Bloque Destacado y Claro de Búsqueda por DNI a la izquierda */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0',
                background: 'var(--input-bg)',
                padding: '2px',
                borderRadius: '8px',
                border: '1.5px solid var(--border-focus)',
                boxShadow: '0 2px 6px var(--accent-glow)',
                flexShrink: 0,
                width: 'auto'
              }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Search size={14} style={{ position: 'absolute', left: '8px', color: 'var(--accent)', pointerEvents: 'none' }} />
                  <input
                    type="number"
                    className="form-control"
                    placeholder="Ingrese DNI..."
                    value={studentForm.dni}
                    onChange={e => {
                      setStudentForm({ ...studentForm, dni: e.target.value });
                      if (searchFeedback) setSearchFeedback(null);
                    }}
                    onKeyDown={e => { if (e.key === 'Enter') handleSearchByDni(); }}
                    style={{
                      width: '115px',
                      padding: '6px 8px 6px 26px',
                      fontSize: '0.825rem',
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--text-primary)',
                      fontWeight: 500,
                      boxShadow: 'none'
                    }}
                  />
                </div>
                <button
                  className="btn-primary"
                  style={{
                    margin: 0,
                    height: '32px',
                    padding: '0 10px',
                    fontSize: '0.75rem',
                    borderRadius: '6px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    border: 'none'
                  }}
                  onClick={handleSearchByDni}
                >
                  Buscar
                </button>
              </div>

              {/* Resultado / Feedback a continuación */}
              {searchFeedback && (
                <div style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  background: searchFeedback.found ? 'rgba(16, 185, 129, 0.15)' : 'var(--danger-bg)',
                  border: searchFeedback.found ? '1px solid rgba(16, 185, 129, 0.3)' : 'var(--danger-border)',
                  color: searchFeedback.found ? 'var(--success)' : 'var(--danger)',
                  whiteSpace: 'nowrap',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexShrink: 0
                }}>
                  {searchFeedback.found ? '✓ ' : '✕ '}
                  {searchFeedback.message}
                </div>
              )}

              {/* Botones de acción: Nuevo Alumno, Importar, Exportar */}
              <button className="btn-primary" style={{ margin: 0, padding: '7px 11px', display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.825rem', whiteSpace: 'nowrap', flexShrink: 0, width: 'auto' }} onClick={() => { handleNewStudent(); setSearchFeedback(null); }}>
                <Plus size={15} /> Nuevo Alumno
              </button>
              <button className="btn-secondary" style={{ margin: 0, padding: '7px 11px', display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.825rem', whiteSpace: 'nowrap', flexShrink: 0, width: 'auto' }} onClick={() => setShowImportModal(true)}>
                <Download size={15} /> Importar
              </button>
              <button className="btn-secondary" style={{ margin: 0, padding: '7px 11px', display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.825rem', whiteSpace: 'nowrap', flexShrink: 0, width: 'auto' }} onClick={() => {
                downloadExcel(
                  alumnos,
                  ['DNI', 'Apellido', 'Nombre', 'Fecha Nac.', 'Tel. Particular', 'Nivel Estudio', 'Título', 'Unidad Académica', 'Área', 'Cargo/Función', 'Personas', 'Email', 'Tel. Laboral', 'Interno'],
                  ['dni', 'apellido', 'nombre', 'fechaNac', 'telPart', 'nivelEstudio', 'titulo', 'unidadAcademica', 'area', 'cargoFuncion', 'personas', 'email', 'telLab', 'interno'],
                  `alumnos_export_${new Date().toISOString().slice(0, 10)}.xlsx`
                );
              }}>
                <Upload size={15} /> Exportar
              </button>
            </div>

            <div className="form-row">
              <FormField 
                label="DNI" 
                type="number" 
                disabled={alumnoEncontrado} 
                value={studentForm.dni} 
                onChange={e => setStudentForm({ ...studentForm, dni: e.target.value })} 
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
            </div>

            <div className="form-row">
              <FormField 
                label="Fecha de Nacimiento" 
                type="date" 
                value={studentForm.fechaNac} 
                onChange={e => setStudentForm({ ...studentForm, fechaNac: e.target.value })} 
              />
              <FormField 
                label="Edad Calculada" 
                disabled 
                value={studentForm.edad} 
              />
              <FormField 
                label="Teléfono Particular" 
                value={studentForm.telPart} 
                onChange={e => setStudentForm({ ...studentForm, telPart: e.target.value })} 
              />
            </div>

            <div className="form-row">
              <FormField 
                label="Nivel Estudio" 
                value={studentForm.nivelEstudio} 
                onChange={e => setStudentForm({ ...studentForm, nivelEstudio: e.target.value })} 
                options={[
                  { value: 'Sin dato', label: 'Sin dato' },
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
              <FormField 
                label="Título obtenido" 
                value={studentForm.titulo} 
                onChange={e => setStudentForm({ ...studentForm, titulo: e.target.value })} 
              />
              <FormField 
                label="Unidad Académica / Dependencia" 
                value={studentForm.unidadAcademica} 
                onChange={e => setStudentForm({ ...studentForm, unidadAcademica: e.target.value })} 
                options={[
                  { value: 'Sin dato', label: 'Sin dato' },
                  ...facultades.map(f => ({ value: f.facultad, label: f.facultad }))
                ]}
              />
            </div>

            <div className="form-row">
              <FormField 
                label="Área de trabajo" 
                value={studentForm.area} 
                onChange={e => setStudentForm({ ...studentForm, area: e.target.value })} 
              />
              <FormField 
                label="Cargo / Función" 
                value={studentForm.cargoFuncion} 
                onChange={e => setStudentForm({ ...studentForm, cargoFuncion: e.target.value })} 
              />
              <FormField 
                label="Personas a cargo" 
                type="number" 
                value={studentForm.personas} 
                onChange={e => setStudentForm({ ...studentForm, personas: e.target.value })} 
              />
            </div>

            <div className="form-row">
              <FormField 
                label="Correo Electrónico" 
                type="email" 
                value={studentForm.email} 
                onChange={e => setStudentForm({ ...studentForm, email: e.target.value })} 
              />
              <FormField 
                label="Teléfono Laboral" 
                value={studentForm.telLab} 
                onChange={e => setStudentForm({ ...studentForm, telLab: e.target.value })} 
              />
              <FormField 
                label="Interno" 
                value={studentForm.interno} 
                onChange={e => setStudentForm({ ...studentForm, interno: e.target.value })} 
              />
            </div>
            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
              {alumnoEncontrado ? (
                <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => saveStudent('actualizar')}>
                  <Save size={16} /> Modificar Datos
                </button>
              ) : (
                <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => saveStudent('alta')}>
                  <UserPlus size={16} /> Registrar Alumno (Alta)
                </button>
              )}
              <button className="btn-secondary" onClick={handleNewStudent}>Limpiar Formulario</button>
            </div>
          </div>
        </div>
      )}

      {showImportModal && (
        <ImportModal 
          onClose={() => setShowImportModal(false)} 
          onImportComplete={() => setShowImportModal(false)} 
        />
      )}
    </div>
  );
};
