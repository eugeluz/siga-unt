import React, { useState, useEffect } from 'react';
import { collection, getDocs, getDoc, doc, setDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { FormField } from './FormField';
import { logAudit } from '../utils/audit';
import { Plus, Save, Trash2, BookOpen, Calendar, Eye, EyeOff, Upload, FileText, X, Download } from 'lucide-react';

interface CoursesTabProps {
  cursos: any[];
  docentes: any[];
  fechas: any[];
}

export const CoursesTab: React.FC<CoursesTabProps> = ({ cursos, docentes, fechas }) => {
  const [courseList, setCourseList] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [showDatesModal, setShowDatesModal] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [selectedCourseForDates, setSelectedCourseForDates] = useState<any>(null);
  const [courseDates, setCourseDates] = useState<any[]>([]);

  const [cursoFilter, setCursoFilter] = useState('');
  const [programaFilter, setProgramaFilter] = useState('');

  const [form, setForm] = useState({
    idCurso: '',
    curso: '',
    programa: '',
    cargaHoraria: '',
    plan: '',
    planName: '',
    idDocente: '',
    docenteNombre: '',
    resolucion: '',
    showOnLanding: true
  });

  const [dateForm, setDateForm] = useState({
    inicio: '',
    certificado: ''
  });

  useEffect(() => {
    const sorted = [...cursos].sort((a, b) => (a.idCurso || 0) - (b.idCurso || 0));
    setCourseList(sorted);
  }, [cursos]);

  const getNextId = () => {
    if (courseList.length === 0) return 1;
    const maxId = Math.max(...courseList.map(c => Number(c.idCurso) || 0));
    return maxId + 1;
  };

  const resetForm = () => {
    setForm({
      idCurso: String(getNextId()),
      curso: '',
      programa: '',
      cargaHoraria: '',
      plan: '',
      planName: '',
      idDocente: '',
      docenteNombre: '',
      resolucion: '',
      showOnLanding: true
    });
    setSelectedCourseId(null);
    setEditing(false);
  };

  const handleNew = () => {
    resetForm();
    setEditing(true);
  };

  const handleEdit = (course: any) => {
    setForm({
      idCurso: String(course.idCurso || ''),
      curso: course.curso || '',
      programa: course.programa || '',
      cargaHoraria: course.cargaHoraria || '',
      plan: course.plan || '',
      planName: course.planName || (course.plan ? 'Programa_Curso.pdf' : ''),
      idDocente: String(course.idDocente || ''),
      docenteNombre: course.docenteNombre || '',
      resolucion: course.resolucion || '',
      showOnLanding: course.showOnLanding !== false
    });
    setSelectedCourseId(course.idCurso);
    setEditing(true);
  };

  const handleDelete = async (idCurso: number) => {
    const cursoName = courseList.find(c => c.idCurso === idCurso)?.curso || '';
    if (!confirm(`¿Eliminar el curso "${cursoName}"?`)) return;
    try {
      await deleteDoc(doc(db, 'cursos', String(idCurso)));
      await logAudit('Curso eliminado', `${cursoName} (ID ${idCurso})`);
      alert('Curso eliminado con éxito.');
    } catch (err) {
      console.error(err);
      alert('Error al eliminar el curso.');
    }
  };

  const handleSave = async () => {
    if (!form.curso || !form.idCurso) {
      alert('ID y nombre del curso son requeridos.');
      return;
    }
    try {
      const docenteSel = docentes.find(d => String(d.idDocente) === form.idDocente);
      const courseData = {
        idCurso: Number(form.idCurso),
        curso: form.curso.trim(),
        programa: form.programa.trim(),
        cargaHoraria: form.cargaHoraria.trim(),
        plan: form.plan || '',
        planName: form.planName || '',
        idDocente: form.idDocente ? Number(form.idDocente) : null,
        docenteNombre: docenteSel ? `${docenteSel.apellido}, ${docenteSel.nombre}` : (form.docenteNombre.trim() || ''),
        resolucion: form.resolucion.trim(),
        showOnLanding: form.showOnLanding
      };

      await setDoc(doc(db, 'cursos', String(form.idCurso)), courseData);
      await logAudit(selectedCourseId ? 'Curso actualizado' : 'Curso creado', `${courseData.curso} (ID ${courseData.idCurso})`);
      alert(selectedCourseId ? 'Curso actualizado con éxito.' : 'Curso creado con éxito.');
      resetForm();
    } catch (err) {
      console.error(err);
      alert('Error al guardar el curso.');
    }
  };

  const loadDatesForCourse = async (idCurso: number) => {
    const snap = await getDocs(collection(db, 'fechas'));
    const dates = snap.docs
      .map(d => ({ id: d.id, ...(d.data() as any) }))
      .filter((d: any) => d.idCurso === idCurso)
      .sort((a: any, b: any) => (a.inicio || '').localeCompare(b.inicio || ''));
    setCourseDates(dates);
  };

  const openDatesModal = async (course: any) => {
    setSelectedCourseForDates(course);
    await loadDatesForCourse(course.idCurso);
    setDateForm({ inicio: '', certificado: '' });
    setShowDatesModal(true);
  };

  const handleAddDate = async () => {
    if (!dateForm.inicio || !selectedCourseForDates) return;
    try {
      await addDoc(collection(db, 'fechas'), {
        idCurso: selectedCourseForDates.idCurso,
        curso: selectedCourseForDates.curso,
        inicio: dateForm.inicio,
        certificado: dateForm.certificado || ''
      });
      setDateForm({ inicio: '', certificado: '' });
      await loadDatesForCourse(selectedCourseForDates.idCurso);
      alert('Fecha agregada con éxito.');
    } catch (err) {
      console.error(err);
      alert('Error al agregar fecha.');
    }
  };

  const handleDeleteDate = async (dateId: string) => {
    if (!confirm('¿Eliminar esta fecha?')) return;
    try {
      await deleteDoc(doc(db, 'fechas', dateId));
      setCourseDates(prev => prev.filter(d => d.id !== dateId));
    } catch (err) {
      console.error(err);
      alert('Error al eliminar fecha.');
    }
  };

  const docenteName = (id: number) => {
    const d = docentes.find(doc => doc.idDocente === id);
    return d ? `${d.apellido}, ${d.nombre}` : 'Sin asignar';
  };

  const programasDisponibles = Array.from(new Set(courseList.map(c => c.programa?.trim()).filter(Boolean))).sort();

  return (
    <div>
      <div className="details-box" style={{ width: '100%', boxSizing: 'border-box' }}>
        {/* Encabezado y 3 Botones en la misma línea */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={20} color="var(--primary)" />
            {selectedCourseId ? `Modificar Curso #${selectedCourseId}` : 'Nuevo Curso'}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px', flexWrap: 'nowrap' }}>
            <button
              className="btn-primary"
              style={{ margin: 0, width: '145px', height: '40px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.825rem', whiteSpace: 'nowrap' }}
              onClick={handleNew}
            >
              <Plus size={15} /> Nuevo Curso
            </button>
            <button
              className="btn-primary"
              style={{ margin: 0, width: '145px', height: '40px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.825rem', whiteSpace: 'nowrap', background: 'var(--primary)' }}
              onClick={handleSave}
            >
              <Save size={15} /> Guardar Curso
            </button>
            <button
              className="btn-secondary"
              style={{ margin: 0, width: '145px', height: '40px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.825rem', whiteSpace: 'nowrap' }}
              onClick={resetForm}
            >
              Cancelar
            </button>
            {selectedCourseId && (
              <button
                className="btn-danger"
                style={{ margin: 0, width: '145px', height: '40px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.825rem', whiteSpace: 'nowrap' }}
                onClick={() => handleDelete(selectedCourseId)}
              >
                <Trash2 size={15} /> Eliminar
              </button>
            )}
          </div>
        </div>

        {/* Desplegable para seleccionar curso a editar */}
        <div className="form-group" style={{ marginBottom: '20px' }}>
          <label style={{ fontWeight: 600 }}>Modificar Curso</label>
          <select
            className="form-control"
            value={selectedCourseId || ''}
            onChange={e => {
              const val = e.target.value;
              if (!val) {
                handleNew();
              } else {
                const found = courseList.find(c => String(c.idCurso) === val);
                if (found) handleEdit(found);
              }
            }}
          >
            <option value="">Seleccionar Curso para Modificar</option>
            {courseList.map(c => (
              <option key={c.idCurso} value={c.idCurso}>
                [{c.idCurso}] {c.curso} {c.programa ? `- ${c.programa}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="form-row" style={{ width: '100%' }}>
          <FormField label="ID Curso" type="number" value={form.idCurso} onChange={e => setForm({ ...form, idCurso: e.target.value })} disabled={!!selectedCourseId} />
          <FormField label="Nombre del Curso" value={form.curso} onChange={e => setForm({ ...form, curso: e.target.value })} />
          <FormField label="Carga Horaria" value={form.cargaHoraria} onChange={e => setForm({ ...form, cargaHoraria: e.target.value })} placeholder="Ej: 40 hs" />
        </div>

        <div className="form-row" style={{ width: '100%', marginTop: '15px' }}>
          <div className="form-group">
            <label style={{ fontWeight: 600 }}>Programa al que pertenece</label>
            <input
              type="text"
              className="form-control"
              list="programas-existentes-list"
              placeholder="Seleccione o escriba..."
              value={form.programa}
              onChange={e => setForm({ ...form, programa: e.target.value })}
            />
            <datalist id="programas-existentes-list">
              {programasDisponibles.map((prog, idx) => (
                <option key={idx} value={prog} />
              ))}
            </datalist>
          </div>
          <div className="form-group">
            <label style={{ fontWeight: 600 }}>Docente Coordinador</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <select
                className="form-control"
                value={form.idDocente}
                onChange={e => {
                  const val = e.target.value;
                  const selected = docentes.find(d => String(d.idDocente) === val);
                  setForm(prev => ({
                    ...prev,
                    idDocente: val,
                    docenteNombre: selected ? `${selected.apellido}, ${selected.nombre}` : ''
                  }));
                }}
                style={{ flex: 1 }}
              >
                <option value="">-- Seleccionar--</option>
                {docentes.map(d => (
                  <option key={d.idDocente} value={d.idDocente}>
                    {d.apellido}, {d.nombre}
                  </option>
                ))}
              </select>
              <input
                type="text"
                className="form-control"
                placeholder="O escriba..."
                value={form.docenteNombre}
                onChange={e => setForm(prev => ({ ...prev, idDocente: '', docenteNombre: e.target.value }))}
                style={{ flex: 1 }}
              />
            </div>
          </div>
          <div className="form-group" style={{ flex: '0.5' }}>
            <FormField label="Resolución" value={form.resolucion} onChange={e => setForm({ ...form, resolucion: e.target.value })} />
          </div>
        </div>

        <div className="form-row" style={{ width: '100%', marginTop: '15px', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>Plan del Curso</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <label
                className="btn-secondary"
                style={{
                  margin: 0,
                  height: '42px',
                  padding: '0 14px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                <Upload size={16} color="var(--accent)" />
                {form.plan ? 'Cambiar PDF' : 'Subir PDF'}
                <input
                  type="file"
                  accept="application/pdf"
                  style={{ display: 'none' }}
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.type !== 'application/pdf') {
                        alert('Por favor seleccione un archivo en formato PDF.');
                        return;
                      }
                      if (file.size > 3 * 1024 * 1024) {
                        alert('El archivo PDF es demasiado grande. Seleccione un archivo menor a 3MB.');
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = (evt) => {
                        const base64 = evt.target?.result as string;
                        setForm(prev => ({
                          ...prev,
                          plan: base64,
                          planName: file.name
                        }));
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>

              {form.plan && (
                <>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '4px' }} title={form.planName}>
                    {form.planName}
                  </span>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ margin: 0, height: '35px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '0 8px', fontSize: '0.8rem' }}
                    onClick={() => setShowPdfModal(true)}
                    title="Vista previa del PDF"
                  >
                    <Eye size={15} /> Ver PDF
                  </button>
                  <button
                    type="button"
                    className="btn-danger"
                    style={{ height: '35px', padding: '0 8px', margin: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.8rem' }}
                    onClick={() => setForm(prev => ({ ...prev, plan: '', planName: '' }))}
                    title="Quitar PDF del Plan"
                  >
                    <Trash2 size={14} /> Eliminar
                  </button>
                </>
              )}

              <label style={{ margin: '0 0 0 16px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
                <input
                  type="checkbox"
                  checked={form.showOnLanding}
                  onChange={e => setForm({ ...form, showOnLanding: e.target.checked })}
                  style={{ accentColor: 'var(--accent)', width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span style={{ fontWeight: 500, fontSize: '0.85rem' }}>
                  Mostrar en página principal
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Modal de vista previa del PDF del programa */}
        {showPdfModal && form.plan && (
          <div className="modal-overlay" onClick={() => setShowPdfModal(false)}>
            <div className="modal-card" style={{ maxWidth: '720px' }} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>
                  <FileText size={18} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                  Programa del Curso — {form.curso || 'Sin título'}
                </h3>
                <button className="modal-close" onClick={() => setShowPdfModal(false)}>×</button>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{form.planName}</span>
                <a
                  href={form.plan}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={form.planName || 'Programa_del_Curso.pdf'}
                  className="btn-secondary"
                  style={{ margin: 0, textDecoration: 'none', height: '40px' }}
                >
                  <Download size={15} /> Descargar
                </a>
              </div>
              <iframe
                src={form.plan}
                title="Vista previa del programa PDF"
                style={{ width: '100%', height: '65vh', border: '1px solid var(--border-card)', borderRadius: '8px', background: '#fff' }}
              />
            </div>
          </div>
        )}

        {/* Botones en una misma línea al pie */}
        <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            className="btn-primary"
            style={{ margin: 0, width: '145px', height: '40px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.825rem', whiteSpace: 'nowrap' }}
            onClick={handleNew}
          >
            <Plus size={15} /> Nuevo Curso
          </button>
          <button
            className="btn-primary"
            style={{ margin: 0, width: '145px', height: '40px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.825rem', whiteSpace: 'nowrap', background: 'var(--primary)' }}
            onClick={handleSave}
          >
            <Save size={15} /> Guardar Curso
          </button>
          <button
            className="btn-secondary"
            style={{ margin: 0, width: '145px', height: '40px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.825rem', whiteSpace: 'nowrap' }}
            onClick={resetForm}
          >
            Cancelar
          </button>
          {selectedCourseId && (
            <button
              className="btn-danger"
              style={{ margin: 0, width: '145px', height: '40px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.825rem', whiteSpace: 'nowrap' }}
              onClick={() => handleDelete(selectedCourseId)}
            >
              <Trash2 size={15} /> Eliminar
            </button>
          )}
        </div>
      </div>


      {/* MODAL DE FECHAS */}
      {
        showDatesModal && selectedCourseForDates && (
          <div className="modal-overlay">
            <div className="modal-card">
              <div className="modal-header">
                <h3>
                  <Calendar size={18} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                  Fechas - {selectedCourseForDates.curso}
                </h3>
                <button className="modal-close" onClick={() => setShowDatesModal(false)}>×</button>
              </div>

              <div className="form-row">
                <FormField label="Fecha de Inicio" type="date" value={dateForm.inicio} onChange={e => setDateForm({ ...dateForm, inicio: e.target.value })} />
                <FormField label="Fecha de Certificado" type="date" value={dateForm.certificado} onChange={e => setDateForm({ ...dateForm, certificado: e.target.value })} />
                <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '18px' }}>
                  <button className="btn-primary" style={{ margin: 0, height: '44px', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={handleAddDate} disabled={!dateForm.inicio}>
                    <Plus size={16} /> Agregar
                  </button>
                </div>
              </div>

              {courseDates.length > 0 ? (
                <div className="listbox-wrapper">
                  <table className="listbox-table">
                    <thead>
                      <tr>
                        <th>Fecha de Inicio</th>
                        <th>Fecha de Certificado</th>
                        <th style={{ width: '60px' }}>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courseDates.map((d, i) => (
                        <tr key={d.id || i}>
                          <td data-label="Inicio">{d.inicio}</td>
                          <td data-label="Certificado">{d.certificado || '—'}</td>
                          <td data-label="Acción">
                            <button
                              className="btn-danger"
                              style={{ padding: '4px 8px', margin: 0, minHeight: '32px', fontSize: '0.75rem' }}
                              onClick={() => handleDeleteDate(d.id)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
                  No hay fechas registradas para este curso.
                </p>
              )}

              <button className="btn-secondary" style={{ marginTop: '10px' }} onClick={() => setShowDatesModal(false)}>
                Cerrar
              </button>
            </div>
          </div>
        )
      }
    </div >
  );
};
