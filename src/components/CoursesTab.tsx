import React, { useState, useEffect } from 'react';
import { collection, getDocs, getDoc, doc, setDoc, deleteDoc, addDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { FormField } from './FormField';
import { logAudit } from '../utils/audit';
import { formatDateAR } from '../utils/dateAR';
import { Plus, Save, Trash2, BookOpen, Calendar, Eye, EyeOff, FileText, X, Download, Pencil, AlertTriangle, HelpCircle } from 'lucide-react';
import { useModal } from './ModalProvider';
import { toTitleCase } from '../utils/text';

interface CoursesTabProps {
  cursos: any[];
  docentes: any[];
  fechas: any[];
  modoCurso?: 'nuevo' | 'modificar';
  onModoChange?: (m: 'nuevo' | 'modificar') => void;
}

export const CoursesTab: React.FC<CoursesTabProps> = ({ cursos, docentes, fechas, modoCurso: modoProp, onModoChange }) => {
  const { confirm, alert } = useModal();
  const [courseList, setCourseList] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [showDatesModal, setShowDatesModal] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [selectedCourseForDates, setSelectedCourseForDates] = useState<any>(null);
  const [courseDates, setCourseDates] = useState<any[]>([]);

  const [cursoFilter, setCursoFilter] = useState('');
  const [programaFilter, setProgramaFilter] = useState('');
  const [editProgramaFilter, setEditProgramaFilter] = useState('');
  const [modoCursoLocal, setModoCursoLocal] = useState<'nuevo' | 'modificar'>('nuevo');
  const modoCurso = modoProp ?? modoCursoLocal;
  const setModoCurso = onModoChange ?? setModoCursoLocal;

  const [form, setForm] = useState({
    idCurso: '',
    curso: '',
    nombreCompleto: '',
    programa: '',
    cargaHoraria: '',
    cargaHorariaHs: '',
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
      nombreCompleto: '',
      programa: '',
      cargaHoraria: '',
      cargaHorariaHs: '',
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
    setModoCurso('nuevo');
    setEditProgramaFilter('');
  };

  const handleEdit = (course: any) => {
    const nombre = course.nombreCompleto || course.nombre_completo || course.curso || '';
    setForm({
      idCurso: String(course.idCurso || ''),
      curso: nombre,
      nombreCompleto: nombre,
      programa: course.programa || '',
      cargaHoraria: course.cargaHoraria || '',
      cargaHorariaHs: course.cargaHorariaHs || course.horas || '',
      plan: course.plan || '',
      planName: course.planName || (course.plan ? 'Programa_Curso.pdf' : ''),
      idDocente: String(course.idDocente || ''),
      docenteNombre: course.docenteNombre ? toTitleCase(course.docenteNombre) : '',
      resolucion: course.resolucion || '',
      showOnLanding: course.showOnLanding !== false
    });
    setSelectedCourseId(course.idCurso);
    setEditing(true);
    setModoCurso('modificar');
  };

  const handleDelete = async (idCurso: number) => {
    const courseObj = courseList.find(c => Number(c.idCurso) === Number(idCurso));
    const cursoName = courseObj?.curso || '';
    const confirmed = await confirm({
      title: 'Confirmar eliminación',
      message: `¿Eliminar el curso "${cursoName}"?\n\nSe eliminará el curso y sus datos asociados de forma permanente.`,
      variant: 'danger',
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar',
    });
    if (!confirmed) return;
    try {
      // 1. Delete by docId if available
      if (courseObj?.docId) {
        await deleteDoc(doc(db, 'cursos', courseObj.docId));
      }
      // 2. Delete by String(idCurso) key as fallback
      await deleteDoc(doc(db, 'cursos', String(idCurso))).catch(() => { });

      // 3. Delete any other matching documents in Firestore with this idCurso
      const q = query(collection(db, 'cursos'), where('idCurso', '==', Number(idCurso)));
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        await deleteDoc(doc(db, 'cursos', d.id));
      }

      await logAudit('Curso eliminado', `${cursoName} (ID ${idCurso})`);
      await alert({ title: 'Curso eliminado', message: 'Curso eliminado con éxito.', variant: 'success' });
      resetForm();
    } catch (err) {
      console.error('Error al eliminar el curso:', err);
      await alert({ title: 'Error', message: 'No se pudo eliminar el curso. Intente nuevamente.', variant: 'danger' });
    }
  };

  const handleSave = async () => {
    const nombreCurso = (form.nombreCompleto || form.curso).trim();
    if (!nombreCurso) {
      await alert({ title: 'Campos incompletos', message: 'El nombre del curso es requerido.', variant: 'warning' });
      return;
    }
    const idCursoVal = form.idCurso ? Number(form.idCurso) : getNextId();
    try {
      // Si se escribió un docente nuevo, agregarlo al listado original (docentes)
      let effectiveIdDocente: number | null = form.idDocente ? Number(form.idDocente) : null;
      let effectiveDocenteNombre = '';
      const docenteSel = docentes.find(d => String(d.idDocente) === form.idDocente);
      if (docenteSel) {
        effectiveDocenteNombre = `${toTitleCase(docenteSel.apellido)}, ${toTitleCase(docenteSel.nombre)}`;
      } else if (form.docenteNombre.trim()) {
        const typed = form.docenteNombre.trim();
        const existingByName = docentes.find(d => {
          const full1 = `${d.apellido}, ${d.nombre}`.toLowerCase();
          const full2 = `${d.apellido} ${d.nombre}`.toLowerCase();
          const full3 = `${d.nombre} ${d.apellido}`.toLowerCase();
          const t = typed.toLowerCase();
          return full1 === t || full2 === t || full3 === t;
        });
        if (existingByName) {
          effectiveIdDocente = existingByName.idDocente;
          effectiveDocenteNombre = `${toTitleCase(existingByName.apellido)}, ${toTitleCase(existingByName.nombre)}`;
        } else {
          let apellido = '';
          let nombre = '';
          if (typed.includes(',')) {
            const parts = typed.split(',').map(s => s.trim());
            apellido = parts[0] || '';
            nombre = parts[1] || '';
          } else {
            const parts = typed.split(/\s+/).filter(Boolean);
            if (parts.length >= 2) {
              apellido = parts[0];
              nombre = parts.slice(1).join(' ');
            } else {
              apellido = typed;
              nombre = '';
            }
          }
          const maxId = docentes.length > 0 ? Math.max(...docentes.map(d => Number(d.idDocente) || 0)) : 0;
          const newId = maxId + 1;
          const newDocente = {
            idDocente: newId,
            apellido: toTitleCase(apellido),
            nombre: toTitleCase(nombre),
            email: '',
            celular: ''
          };
          try {
            await setDoc(doc(db, 'docentes', String(newId)), newDocente);
            await logAudit('Docente creado', `${newDocente.apellido}, ${newDocente.nombre} (ID ${newId})`);
            effectiveIdDocente = newId;
            effectiveDocenteNombre = `${newDocente.apellido}, ${newDocente.nombre}`;
          } catch (e) {
            console.error('Error creando docente:', e);
            const partsFallback = typed.includes(',') ? typed.split(',').map(s => s.trim()) : [typed];
            effectiveDocenteNombre = partsFallback.length > 1 ? `${toTitleCase(partsFallback[0])}, ${toTitleCase(partsFallback[1])}` : toTitleCase(typed);
          }
        }
      }
      const courseData = {
        idCurso: idCursoVal,
        curso: nombreCurso,
        nombreCompleto: nombreCurso,
        programa: form.programa.trim(),
        cargaHoraria: form.cargaHoraria.trim(),
        cargaHorariaHs: form.cargaHorariaHs.trim(),
        plan: form.plan || '',
        planName: form.planName || '',
        idDocente: effectiveIdDocente,
        docenteNombre: effectiveDocenteNombre,
        resolucion: form.resolucion.trim(),
        showOnLanding: form.showOnLanding
      };

      await setDoc(doc(db, 'cursos', String(idCursoVal)), courseData);
      await logAudit(selectedCourseId ? 'Curso actualizado' : 'Curso creado', `${courseData.curso} (ID ${courseData.idCurso})`);
      await alert({ title: 'Operación exitosa', message: selectedCourseId ? 'Curso actualizado con éxito.' : 'Curso creado con éxito.', variant: 'success' });
      resetForm();
    } catch (err) {
      console.error(err);
      await alert({ title: 'Error', message: 'No se pudo guardar el curso. Intente nuevamente.', variant: 'danger' });
    }
  };

  const loadDatesForCourse = (course: any) => {
    if (!course) {
      setCourseDates([]);
      return;
    }
    // Filtra en memoria (tolera idCurso numérico o texto) e incluye fechas cuyo
    // nombre de curso coincida (cubre fechas de lote histórico bajo un ID duplicado)
    const idStr = String(course.idCurso);
    const name = course.nombreCompleto || course.curso;
    const seen = new Set<string>();
    const dates = fechas
      .filter((f: any) => {
        if (String(f.idCurso) === idStr || (f.curso || '') === name) {
          const key = f.id || `${f.idCurso}||${f.curso}||${f.inicio}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        }
        return false;
      })
      .map((d: any) => ({ ...d }))
      .sort((a: any, b: any) => (a.inicio || '').localeCompare(b.inicio || ''));
    setCourseDates(dates);
  };

  const openDatesModal = async (course: any) => {
    setSelectedCourseForDates(course);
    loadDatesForCourse(course);
    setDateForm({ inicio: '', certificado: '' });
    setShowDatesModal(true);
  };

  const handleAddDate = async () => {
    if (!dateForm.inicio || !selectedCourseForDates) return;
    try {
      const ref = await addDoc(collection(db, 'fechas'), {
        idCurso: selectedCourseForDates.idCurso,
        curso: selectedCourseForDates.curso,
        inicio: dateForm.inicio,
        certificado: dateForm.certificado || ''
      });
      setDateForm({ inicio: '', certificado: '' });
      // Actualización local inmediata (la suscripción sincronizará el resto)
      const added = { id: ref.id, idCurso: selectedCourseForDates.idCurso, curso: selectedCourseForDates.curso, inicio: dateForm.inicio, certificado: dateForm.certificado || '' };
      setCourseDates(prev => [...prev, added].sort((a: any, b: any) => (a.inicio || '').localeCompare(b.inicio || '')));
      await alert({ title: 'Fecha agregada', message: 'Fecha agregada con éxito.', variant: 'success' });
    } catch (err) {
      console.error(err);
      await alert({ title: 'Error', message: 'No se pudo agregar la fecha. Intente nuevamente.', variant: 'danger' });
    }
  };

  const handleDeleteDate = async (dateId: string) => {
    const confirmed = await confirm({
      title: 'Confirmar eliminación',
      message: '¿Eliminar esta fecha?\n\nLa fecha será eliminada de forma permanente.',
      variant: 'danger',
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar',
    });
    if (!confirmed) return;
    try {
      await deleteDoc(doc(db, 'fechas', dateId));
      setCourseDates(prev => prev.filter(d => d.id !== dateId));
    } catch (err) {
      console.error(err);
      await alert({ title: 'Error', message: 'No se pudo eliminar la fecha. Intente nuevamente.', variant: 'danger' });
    }
  };

  const docenteName = (id: number) => {
    const d = docentes.find(doc => doc.idDocente === id);
    return d ? `${toTitleCase(d.apellido)}, ${toTitleCase(d.nombre)}` : 'Sin asignar';
  };

  const programasDisponibles = Array.from(new Set(courseList.map(c => c.programa?.trim()).filter(Boolean))).sort();

  useEffect(() => {
    if (modoProp === undefined) return;
    if (modoProp === 'nuevo') {
      resetForm();
      setEditProgramaFilter('');
    } else if (modoProp === 'modificar') {
      setSelectedCourseId(null);
      setEditProgramaFilter('');
    }
  }, [modoProp]);

  return (
    <div>
      <div className="details-box" style={{ width: '100%', boxSizing: 'border-box' }}>




        <h3 style={{ margin: '0 0 14px 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
          {modoCurso === 'nuevo' ? <Plus size={18} color="var(--primary)" /> : <Pencil size={18} color="var(--primary)" />} {modoCurso === 'nuevo' ? 'Nuevo curso' : 'Modificar curso'}
        </h3>

        {modoCurso === 'modificar' && (
          <div style={{ marginBottom: '12px', padding: '10px 12px', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 600, color: '#b45309', width: '100%', boxSizing: 'border-box', textAlign: 'center' }}>
            <AlertTriangle size={14} color="#b45309" /> Los cambios afectarán a todas las personas que hayan realizado el curso seleccionado.
          </div>
        )}
        {modoCurso === 'modificar' && (
          <div className="form-row" style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: '0 0 220px', minWidth: '180px', margin: 0 }}>
              <label style={{ fontWeight: 600 }}>Programa</label>
              <select
                className="form-control"
                value={editProgramaFilter}
                onChange={e => setEditProgramaFilter(e.target.value)}
              >
                <option value="">-- Seleccionar programa --</option>
                {programasDisponibles.map((prog, idx) => (
                  <option key={idx} value={prog}>{prog}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ flex: '1 1 auto', minWidth: '220px', margin: 0 }}>
              <label style={{ fontWeight: 600 }}>Seleccionar curso a modificar</label>
              <select
                className="form-control"
                value={selectedCourseId || ''}
                onChange={e => {
                  const val = e.target.value;
                  if (!val) {
                    resetForm();
                  } else {
                    const found = courseList.find(c => String(c.idCurso) === val);
                    if (found) handleEdit(found);
                  }
                }}
              >
                <option value="">-- Seleccionar Curso --</option>
                {[...courseList]
                  .filter(c => !editProgramaFilter || (c.programa?.trim() || 'Sin programa') === editProgramaFilter)
                  .sort((a, b) => (a.nombreCompleto || a.curso || '').localeCompare(b.nombreCompleto || b.curso || ''))
                  .map(c => (
                    <option key={c.idCurso} value={c.idCurso}>
                      {c.nombreCompleto || c.curso}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        )}

        {/* Formulario: en modo nuevo siempre visible; en modo modificar solo tras seleccionar */}
        {(modoCurso === 'nuevo' || (modoCurso === 'modificar' && selectedCourseId)) ? (
          <>
            <div className="form-row" style={{ width: '100%' }}>
              <div className="form-group">
                <label style={{ fontWeight: 600 }}>Programa al que pertenece</label>
                <input
                  type="text"
                  className="form-control"
                  list="programas-existentes-list"
                  placeholder="Seleccionar o escribir..."
                  value={form.programa}
                  onChange={e => setForm({ ...form, programa: e.target.value })}
                />
                <datalist id="programas-existentes-list">
                  {programasDisponibles.map((prog, idx) => (
                    <option key={idx} value={prog} />
                  ))}
                </datalist>
              </div>
              <FormField label="Nombre del curso" value={form.nombreCompleto} onChange={e => setForm({ ...form, nombreCompleto: e.target.value, curso: e.target.value })} placeholder="Escribir el nombre" />
            </div>

            <div className="form-row" style={{ width: '100%', marginTop: '15px', display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'nowrap' }}>
              <div className="form-group" style={{ flex: '1 1 auto', minWidth: '180px', margin: 0 }}>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Capacitador/a</label>
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
                        docenteNombre: selected ? `${toTitleCase(selected.apellido)}, ${toTitleCase(selected.nombre)}` : ''
                      }));
                    }}
                    style={{ flex: 1 }}
                  >
                    <option value="">-- Seleccionar--</option>
                    {docentes.map(d => (
                      <option key={d.idDocente} value={d.idDocente}>
                        {toTitleCase(d.apellido)}, {toTitleCase(d.nombre)}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="O escribir..."
                    value={form.docenteNombre}
                    onChange={e => setForm(prev => ({ ...prev, idDocente: '', docenteNombre: e.target.value }))}
                    style={{ flex: 1 }}
                  />
                </div>
              </div>
              <div style={{ flex: '0 0 130px', maxWidth: '140px', minWidth: '110px', margin: 0 }}>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Carga horaria</label>
                <input className="form-control" value={form.cargaHorariaHs} onChange={e => setForm({ ...form, cargaHorariaHs: e.target.value })} placeholder="Ej: 40 hs" />
              </div>
            </div>

            <div className="form-row" style={{ width: '100%', marginTop: '15px', display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'nowrap' }}>
              <div style={{ flex: '0 0 200px', maxWidth: '220px', minWidth: '160px', margin: 0 }}>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Resolución</label>
                <input className="form-control" value={form.resolucion} onChange={e => setForm({ ...form, resolucion: e.target.value })} placeholder="Ej: RES-123/24" />
              </div>
              <div className="form-group" style={{ margin: 0, flex: '1 1 auto', minWidth: '200px' }}>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Planificación del curso</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <label
                    className="btn-secondary"
                    style={{
                      margin: 0,
                      height: '44px',
                      padding: '0 14px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <Download size={16} color="var(--accent)" />
                    {form.plan ? 'Cambiar PDF' : 'Subir PDF'}
                    <input
                      type="file"
                      accept="application/pdf"
                      style={{ display: 'none' }}
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.type !== 'application/pdf') {
                            alert({ title: 'Archivo inválido', message: 'Por favor seleccione un archivo en formato PDF.', variant: 'warning' });
                            return;
                          }
                          if (file.size > 3 * 1024 * 1024) {
                            alert({ title: 'Archivo demasiado grande', message: 'El archivo PDF es demasiado grande. Seleccione un archivo menor a 3MB.', variant: 'warning' });
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
                      Programa del Curso — {form.nombreCompleto || form.curso || 'Sin título'}
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

            {/* Botones al pie — según modo */}
            <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <button
                className="btn-primary"
                style={{ margin: 0, width: '160px', height: '42px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.85rem', whiteSpace: 'nowrap', background: 'var(--primary)' }}
                onClick={handleSave}
              >
                <Save size={15} /> {modoCurso === 'modificar' ? 'Guardar Cambios' : 'Guardar Curso'}
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
          </>
        ) : modoCurso === 'modificar' ? (
          <div style={{ textAlign: 'center', padding: '28px 20px', color: 'var(--text-secondary)', background: 'var(--surface-bg)', borderRadius: '10px', border: '1px dashed var(--border-card)', marginTop: '4px' }}>
            <p style={{ margin: 0, fontSize: '0.92rem' }}>Seleccione un <strong>Programa</strong> y un <strong>Curso</strong> para corregirlo.</p>
          </div>
        ) : null}
      </div>


      {/* MODAL DE FECHAS */}
      {
        showDatesModal && selectedCourseForDates && (
          <div className="modal-overlay">
            <div className="modal-card">
              <div className="modal-header">
                <h3>
                  <Calendar size={18} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                  Fechas - {selectedCourseForDates.nombreCompleto || selectedCourseForDates.curso}
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
                          <td data-label="Inicio">{formatDateAR(d.inicio)}</td>
                          <td data-label="Certificado">{formatDateAR(d.certificado)}</td>
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
