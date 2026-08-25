import React, { useState, useEffect } from 'react';
import { doc, setDoc, deleteDoc, getDocs, collection, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { logAudit } from '../utils/audit';
import { FormField } from './FormField';
import { ImportModal } from './ImportModal';
import { Download, Plus, Upload, Save, UserPlus, Search, GraduationCap, FileText, ArrowLeft, ChevronRight, Trash2 } from 'lucide-react';
import { downloadExcel } from '../utils/excel';
import { StudentHistoryTab } from './StudentHistoryTab';

interface StudentManagementProps {
  facultades: any[];
  activeTab: string;
  alumnos: any[];
  cursos?: any[];
  fechas?: any[];
}

/**
 * StudentManagement component managing students through a Master-Detail layout.
 * Employs SOLID design patterns (SRP), DRY (by utilizing FormField sub-components), 
 * and encapsulates local state workflows (such as importing and searching).
 */
export const StudentManagement: React.FC<StudentManagementProps> = ({ facultades, activeTab, alumnos, cursos = [], fechas = [] }) => {
  const [currentSubTab, setCurrentSubTab] = useState<'inicio' | 'alta' | 'historial'>('inicio');
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
    direccionOficina: '',
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
        direccionOficina: studentForm.direccionOficina,
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
      direccionOficina: student.direccionOficina || '',
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
      direccionOficina: '',
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

  const handleDeleteSingleStudent = async () => {
    if (!studentForm.dni) return;
    const name = `${studentForm.apellido}, ${studentForm.nombre}`.trim();
    if (!confirm(`¿Eliminar al alumno DNI ${studentForm.dni} (${name}) de la base de datos?`)) return;

    try {
      await deleteDoc(doc(db, 'alumnos', studentForm.dni.trim()));
      await logAudit('Alumno eliminado', `DNI: ${studentForm.dni} — ${name}`);
      alert('Alumno eliminado con éxito.');
      handleNewStudent();
      setSearchFeedback(null);
    } catch (err) {
      console.error('Error al eliminar alumno:', err);
      alert('Error al eliminar el alumno.');
    }
  };

  const handleClearAllStudents = async () => {
    if (alumnos.length === 0) {
      alert('No hay alumnos registrados para eliminar.');
      return;
    }

    const firstConfirm = confirm(
      `⚠️ ¿ATENCIÓN: Está seguro de que desea eliminar TODOS los registros de alumnos? (${alumnos.length} alumnos registrados)\n\nEsta acción eliminará todos los alumnos del padrón.`
    );
    if (!firstConfirm) return;

    const secondConfirm = confirm('Confirmación final: ¿Eliminar TODOS los registros de alumnos?');
    if (!secondConfirm) return;

    try {
      const snap = await getDocs(collection(db, 'alumnos'));
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

      await logAudit('Vaciamiento de alumnos', `Se eliminaron ${count} alumnos de la base de datos.`);
      alert(`Se han eliminado los ${count} registros de alumnos con éxito.`);
      handleNewStudent();
      setSearchFeedback(null);
    } catch (err) {
      console.error('Error al vaciar registros de alumnos:', err);
      alert('Error al eliminar los registros de alumnos.');
    }
  };

  return (
    <div>
      {currentSubTab !== 'inicio' ? (
        <div style={{ marginBottom: '24px' }}>
          {/* Cabecera de la sección seleccionada con título a la izquierda y Volver al menú a la derecha */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
              flexWrap: 'wrap',
              gap: '12px',
              background: 'var(--card-bg)',
              padding: '14px 20px',
              borderRadius: '12px',
              border: '1px solid var(--border-color)'
            }}
          >
            <h2 className="section-title" style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {currentSubTab === 'alta' ? (
                <>
                  <GraduationCap size={22} color="var(--primary)" /> Gestión de Alumnos             </>
              ) : (
                <>
                  <Search size={22} color="#10b981" /> Cursos por Alumno
                </>
              )}
            </h2>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => setCurrentSubTab('inicio')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                margin: 0,
                padding: '8px 16px',
                fontSize: '0.9rem',
                height: '40px'
              }}
            >
              <ArrowLeft size={16} /> Volver al menú
            </button>
          </div>

          {currentSubTab === 'historial' ? (
            <StudentHistoryTab alumnos={alumnos} cursos={cursos} fechas={fechas} defaultDni={studentForm.dni} />
          ) : (
            <div>

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
                        justifyContent: 'center',
                        gap: '4px',
                        border: 'none'
                      }}
                      onClick={handleSearchByDni}
                      title="Buscar por DNI"
                    >
                      <Search size={16} />
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

                  {/* Botones de acción: Nuevo Alumno, Exportar */}
                  <button className="btn-primary" style={{ margin: 0, padding: '7px 11px', display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.825rem', whiteSpace: 'nowrap', flexShrink: 0, width: 'auto' }} onClick={() => { handleNewStudent(); setSearchFeedback(null); }}>
                    <Plus size={15} /> Nuevo Alumno
                  </button>
                  <button className="btn-secondary" style={{ margin: 0, padding: '7px 11px', display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.825rem', whiteSpace: 'nowrap', flexShrink: 0, width: 'auto' }} onClick={() => {
                    downloadExcel(
                      alumnos,
                      ['DNI', 'Apellido', 'Nombre', 'Fecha Nac.', 'Tel. Particular', 'Nivel Estudio', 'Título', 'Unidad Académica', 'Dirección u Oficina', 'Área', 'Cargo/Función', 'Personas', 'Email', 'Tel. Laboral', 'Interno'],
                      ['dni', 'apellido', 'nombre', 'fechaNac', 'telPart', 'nivelEstudio', 'titulo', 'unidadAcademica', 'direccionOficina', 'area', 'cargoFuncion', 'personas', 'email', 'telLab', 'interno'],
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
                    label="Dirección u Oficina"
                    value={studentForm.direccionOficina}
                    onChange={e => setStudentForm({ ...studentForm, direccionOficina: e.target.value })}
                  />
                  <FormField
                    label="Área de trabajo"
                    value={studentForm.area}
                    onChange={e => setStudentForm({ ...studentForm, area: e.target.value })}
                  />
                  <FormField
                    label="Cargo / Función"
                    value={studentForm.cargoFuncion}
                    onChange={e => setStudentForm({ ...studentForm, cargoFuncion: e.target.value })}
                    options={[
                      { value: '', label: '-- Sin cargo / función --' },
                      { value: 'Administrativo/a', label: 'Administrativo/a' },
                      { value: 'Docente', label: 'Docente' },
                      { value: 'JTP/Aux. Docente', label: 'JTP/Aux. Docente' },
                      { value: 'Técnicos/Profesional', label: 'Técnicos/Profesional' },
                      { value: 'Mantenimiento', label: 'Mantenimiento' },
                      { value: 'Producción', label: 'Producción' },
                      { value: 'Servicios Grales.', label: 'Servicios Grales.' }
                    ]}
                  />
                </div>

                <div className="form-row">
                  <FormField
                    label="Personas a cargo"
                    type="number"
                    value={studentForm.personas}
                    onChange={e => setStudentForm({ ...studentForm, personas: e.target.value })}
                  />
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
                </div>

                <div className="form-row">
                  <FormField
                    label="Interno"
                    value={studentForm.interno}
                    onChange={e => setStudentForm({ ...studentForm, interno: e.target.value })}
                  />
                </div>
                <div style={{ marginTop: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {alumnoEncontrado ? (
                    <>
                      <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => saveStudent('actualizar')}>
                        <Save size={16} /> Modificar Datos
                      </button>
                      <button className="btn-danger" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={handleDeleteSingleStudent}>
                        <Trash2 size={16} /> Eliminar Alumno
                      </button>
                    </>
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
        </div>
      ) : (
        /* Vista de inicio con 2 cajitas de igual tamaño para Alumnos */
        <div style={{ padding: '10px 0' }}>
          <h2 className="section-title" style={{ marginBottom: '8px' }}>
            <GraduationCap size={24} /> Gestión de Alumnos
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '24px',
              maxWidth: '900px',
              margin: '0 auto'
            }}
          >
            {/* Cajita 1: Alta y modificación */}
            <div
              className="details-box"
              onClick={() => setCurrentSubTab('alta')}
              style={{
                cursor: 'pointer',
                padding: '32px 24px',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                transition: 'all 0.25s ease',
                border: '2px solid var(--border-color)',
                background: 'var(--card-bg)',
                height: '100%',
                justifyContent: 'space-between',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border-color)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                <div
                  style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '18px',
                    background: 'var(--primary-alpha-15, rgba(59, 130, 246, 0.12))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '20px'
                  }}
                >
                  <GraduationCap size={36} color="var(--primary, #3b82f6)" />
                </div>

                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0, lineHeight: '1.5' }}>
                  Alta y modificación de datos de alumnos
                </p>
              </div>

              <button
                className="btn-primary"
                style={{
                  marginTop: '28px',
                  width: '100%',
                  height: '46px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  margin: 0
                }}
              >
                Ingresar a Alumnos <ChevronRight size={18} />
              </button>
            </div>

            {/* Cajita 2: Cursos por alumno (Lupa) */}
            <div
              className="details-box"
              onClick={() => setCurrentSubTab('historial')}
              style={{
                cursor: 'pointer',
                padding: '32px 24px',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                transition: 'all 0.25s ease',
                border: '2px solid var(--border-color)',
                background: 'var(--card-bg)',
                height: '100%',
                justifyContent: 'space-between',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#10b981';
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border-color)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                <div
                  style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '18px',
                    background: 'rgba(16, 185, 129, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '20px'
                  }}
                >
                  <Search size={36} color="#10b981" />
                </div>

              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0, lineHeight: '1.5' }}>
                  Consulta e historial de cursos por alumno
                </p>
              </div>

              <button
                className="btn-primary"
                style={{
                  marginTop: '28px',
                  width: '100%',
                  height: '46px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  backgroundColor: '#10b981',
                  borderColor: '#10b981',
                  margin: 0
                }}
              >
                Ingresar a Historial <ChevronRight size={18} />
              </button>
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
