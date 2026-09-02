import React, { useState } from 'react';
import { collection, addDoc, deleteDoc, doc, setDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { FormField } from './FormField';
import { formatDateAR } from '../utils/dateAR';
import { Plus, Trash2, Calendar, Search, ArrowUpDown, Eye, EyeOff, FileText, HelpCircle } from 'lucide-react';
import { useModal } from './ModalProvider';

interface DatesTabProps {
  cursos: any[];
  fechas: any[];
}

export const DatesTab: React.FC<DatesTabProps> = ({ cursos, fechas }) => {
  const { confirm, alert } = useModal();
  const [selectedCursoId, setSelectedCursoId] = useState('');
  const [selectedPrograma, setSelectedPrograma] = useState('');
  const [dateForm, setDateForm] = useState({
    inicio: '',
    cantidadClases: 6,
    inscripcionUrl: ''
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;

  const sortedCursos = [...cursos].sort((a, b) => (a.nombreCompleto || a.curso || '').localeCompare(b.nombreCompleto || b.curso || ''));

  const handleAddDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCursoId || !dateForm.inicio) {
      await alert({ title: 'Campos incompletos', message: 'Debe seleccionar un curso y una fecha de inicio.', variant: 'warning' });
      return;
    }

    const courseObj = cursos.find(c => String(c.idCurso) === selectedCursoId);
    if (!courseObj) {
      await alert({ title: 'Error', message: 'Curso no encontrado.', variant: 'danger' });
      return;
    }

    try {
      await addDoc(collection(db, 'fechas'), {
        idCurso: Number(courseObj.idCurso),
        curso: courseObj.nombreCompleto || courseObj.curso,
        inicio: dateForm.inicio,
        certificado: '',
        cantidadClases: Number(dateForm.cantidadClases) || 4,
        inscripcionUrl: dateForm.inscripcionUrl.trim(),
        showOnLanding: true
      });

      setDateForm({ inicio: '', cantidadClases: 4, inscripcionUrl: '' });
      setSelectedCursoId('');
      await alert({ title: 'Fecha agregada', message: 'Fecha de curso agregada con éxito.', variant: 'success' });
    } catch (err) {
      console.error('Error al agregar fecha:', err);
      await alert({ title: 'Error', message: 'No se pudo agregar la fecha de curso. Intente nuevamente.', variant: 'danger' });
    }
  };

  const handleToggleVisibility = async (id: string, currentShow: boolean) => {
    if (!id) return;
    try {
      await setDoc(doc(db, 'fechas', id), { showOnLanding: !currentShow }, { merge: true });
    } catch (err) {
      console.error('Error al cambiar visibilidad:', err);
      await alert({ title: 'Error', message: 'No se pudo actualizar la visibilidad de la fecha. Intente nuevamente.', variant: 'danger' });
    }
  };

  const handleDeleteDate = async (id: string, cursoName: string, inicioDate: string) => {
    if (!id) return;
    const confirmed = await confirm({
      title: 'Confirmar eliminación',
      message: `¿Eliminar la fecha del ${formatDateAR(inicioDate)} para el curso "${cursoName}"?\n\nEsta acción no se puede deshacer.`,
      variant: 'danger',
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar',
    });
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, 'fechas', id));
      await alert({ title: 'Fecha eliminada', message: 'Fecha eliminada con éxito.', variant: 'success' });
    } catch (err) {
      console.error('Error al eliminar fecha:', err);
      await alert({ title: 'Error', message: 'No se pudo eliminar la fecha. Intente nuevamente.', variant: 'danger' });
    }
  };

  const [informeView, setInformeView] = useState<any>(null);
  const [loadingInforme, setLoadingInforme] = useState(false);

  const handleVerInforme = async (curso: string, fechaInicio: string) => {
    setLoadingInforme(true);
    try {
      const q = query(
        collection(db, 'informes'),
        where('curso', '==', curso),
        where('fechaInicio', '==', fechaInicio)
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        await alert({ title: 'Sin informe', message: 'No hay informes del docente subidos para este curso y fecha.', variant: 'info' });
      } else {
        const docData = snap.docs[0].data();
        setInformeView(docData);
      }
    } catch (err) {
      console.error(err);
      await alert({ title: 'Error', message: 'No se pudo buscar el informe. Intente nuevamente.', variant: 'danger' });
    } finally {
      setLoadingInforme(false);
    }
  };

  // Filter & sort dates based on search term and fecha de inicio
  const filteredFechas = fechas
    .filter(f => {
      const term = searchTerm.toLowerCase();
      return (
        (f.curso || '').toLowerCase().includes(term) ||
        (f.inicio || '').includes(term) ||
        (f.certificado || '').includes(term)
      );
    })
    .sort((a, b) => {
      const dateA = a.inicio || '';
      const dateB = b.inicio || '';
      if (dateA < dateB) return sortOrder === 'asc' ? -1 : 1;
      if (dateA > dateB) return sortOrder === 'asc' ? 1 : -1;
      return (a.curso || '').localeCompare(b.curso || '');
    });

  const totalPages = Math.max(1, Math.ceil(filteredFechas.length / perPage));
  const paginatedFechas = filteredFechas.slice((currentPage - 1) * perPage, currentPage * perPage);

  // Reset page when filters change
  React.useEffect(() => { setCurrentPage(1); }, [searchTerm, sortOrder]);
  React.useEffect(() => { if (currentPage > totalPages) setCurrentPage(totalPages); }, [totalPages]);

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        {/* Formulario de Alta de Fecha en 1 sola fila compacta superior */}
        <div className="details-box" style={{ width: '100%', padding: '16px 20px', marginBottom: '15px', boxSizing: 'border-box' }}>

          <form onSubmit={handleAddDate}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', flexWrap: 'wrap', width: '100%' }}>
              <div className="form-group" style={{ flex: '1 1 160px', margin: 0 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Programa</label>
                <select className="form-control" value={selectedPrograma} onChange={e => { setSelectedPrograma(e.target.value); setSelectedCursoId(''); }} style={{ fontSize: '0.85rem' }}>
                  <option value="">-- Todos los programas --</option>
                  {[...new Set(cursos.map(c => c.programa?.trim() || 'Otros'))].sort().map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ flex: '2 1 220px', margin: 0 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Curso</label>
                <select
                  className="form-control"
                  value={selectedCursoId}
                  onChange={e => setSelectedCursoId(e.target.value)}
                  required
                  style={{ fontSize: '0.85rem' }}
                >
                  <option value="">-- Seleccione un Curso --</option>
                  {sortedCursos.filter(c => !selectedPrograma || (c.programa?.trim() || 'Otros') === selectedPrograma).map(c => (
                    <option key={c.idCurso} value={String(c.idCurso)}>
                      {c.nombreCompleto || c.curso}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ flex: '1 1 130px', margin: 0 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Fecha de Inicio</label>
                <input
                  type="date"
                  className="form-control"
                  value={dateForm.inicio}
                  onChange={e => setDateForm({ ...dateForm, inicio: e.target.value })}
                  required
                  style={{ fontSize: '0.85rem' }}
                />
              </div>

              <div className="form-group" style={{ flex: '0 1 110px', margin: 0 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Cant. Clases</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  className="form-control"
                  value={dateForm.cantidadClases}
                  onChange={e => setDateForm({ ...dateForm, cantidadClases: parseInt(e.target.value) || 1 })}
                  required
                  style={{ fontSize: '0.85rem' }}
                  title="Cantidad de clases que componen la cursada"
                />
              </div>

              <div className="form-group" style={{ flex: '1 1 260px', margin: 0 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>URL Formulario Inscripción</label>
                <input className="form-control" value={dateForm.inscripcionUrl} onChange={e => setDateForm({ ...dateForm, inscripcionUrl: e.target.value })} placeholder="https://docs.google.com/forms/.../viewform" style={{ fontSize: '0.85rem' }} />
              </div>

              <button
                type="submit"
                className="btn-primary"
                style={{
                  margin: 0,
                  height: '38px',
                  padding: '0 16px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontSize: '0.85rem',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
                disabled={!selectedCursoId || !dateForm.inicio}
              >
                <Plus size={16} /> Registrar Fecha
              </button>
            </div>
          </form>
        </div>

        {/* Listado de Fechas abajo en ancho completo */}
        <div className="details-box" style={{ width: '100%', padding: '16px 20px', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Listado de Fechas Registradas</h3>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                title="Ordenar por fecha de inicio"
              >
                <ArrowUpDown size={14} /> {sortOrder === 'asc' ? 'Fecha (Más antiguas)' : 'Fecha (Más recientes)'}
              </button>

              <div style={{ position: 'relative', width: '220px' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Buscar por curso o fecha..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{ paddingRight: '35px', fontSize: '0.85rem' }}
                />
                <Search size={16} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              </div>
            </div>
          </div>

          {filteredFechas.length > 0 ? (
            <>
              <div className="listbox-wrapper" style={{ maxHeight: '420px', overflowY: 'auto', width: '100%' }}>
                <table className="listbox-table" style={{ width: '100%', tableLayout: 'auto' }}>
                  <thead>
                    <tr>
                      <th>Nombre del Curso</th>
                      <th
                        style={{ cursor: 'pointer', userSelect: 'none', width: '130px' }}
                        onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          Fecha Inicio {sortOrder === 'asc' ? '▲' : '▼'}
                        </div>
                      </th>
                      <th style={{ width: '130px' }}>Fecha Certificado</th>
                      <th style={{ width: '110px', textAlign: 'center' }}>Cant. Clases</th>
                      <th style={{ width: '140px', textAlign: 'center' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedFechas.map((f, i) => {
                      const nombreCurso = cursos.find(c => c.idCurso === f.idCurso)?.nombreCompleto || f.curso;
                      return (
                        <tr key={f.id || i}>
                          <td data-label="Curso" style={{ fontWeight: 400 }}>{nombreCurso}</td>
                          <td data-label="Inicio">{formatDateAR(f.inicio)}</td>
                          <td data-label="Certificado">{formatDateAR(f.certificado)}</td>
                          <td data-label="Cant. Clases" style={{ textAlign: 'center', fontWeight: 600, color: 'var(--primary)' }}>
                            {f.cantidadClases || 4}
                          </td>
                          <td data-label="Acciones" style={{ textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <button
                                type="button"
                                className="btn-secondary"
                                style={{
                                  padding: '4px 8px',
                                  margin: 0,
                                  minHeight: '32px',
                                  fontSize: '0.75rem',
                                  color: f.showOnLanding !== false ? 'var(--success)' : 'var(--danger)',
                                  borderColor: f.showOnLanding !== false ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'
                                }}
                                onClick={() => handleToggleVisibility(f.id, f.showOnLanding !== false)}
                                title={f.showOnLanding !== false ? 'Visible en página principal (Clic para ocultar)' : 'Oculto en página principal (Clic para mostrar)'}
                              >
                                {f.showOnLanding !== false ? <Eye size={14} /> : <EyeOff size={14} />}
                              </button>
                              <button
                                type="button"
                                className="btn-secondary"
                                style={{ padding: '0 8px', margin: 0, minHeight: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                onClick={() => handleVerInforme(nombreCurso, f.inicio)}
                                title="Ver informe del docente"
                              >
                                <FileText size={14} />
                              </button>
                              <button
                                type="button"
                                className="btn-danger"
                                style={{ padding: '4px 8px', margin: 0, minHeight: '32px', fontSize: '0.75rem' }}
                                onClick={() => handleDeleteDate(f.id, nombreCurso, f.inicio)}
                                title="Eliminar fecha"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginTop: '12px', flexWrap: 'wrap' }}>
                  <button type="button" className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>‹ Anterior</button>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Página {currentPage} de {totalPages} — {filteredFechas.length} fechas</span>
                  <button type="button" className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Siguiente ›</button>
                </div>
              )}
            </>
          ) : (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
              No se encontraron fechas de cursos.
            </p>
          )}
        </div>
      </div>

      {/* Modal para visualizar el informe del docente (PDF base64) */}
      {informeView && (
        <div className="modal-overlay" onClick={() => setInformeView(null)}>
          <div className="modal-card" style={{ maxWidth: '720px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Informe del Docente — {informeView.curso}</h3>
              <button className="modal-close" onClick={() => setInformeView(null)}>×</button>
            </div>
            <div style={{ padding: '10px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Archivo: <strong>{informeView.fileName}</strong> | Subido por: {informeView.uploadedByName || informeView.uploadedBy}
            </div>
            <iframe
              src={informeView.dataUrl}
              title="Vista previa del informe PDF"
              style={{ width: '100%', height: '60vh', border: '1px solid var(--border-card)', borderRadius: '8px', background: '#fff' }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

