import React, { useState } from 'react';
import { collection, addDoc, deleteDoc, doc, setDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { FormField } from './FormField';
import { formatDateAR } from '../utils/dateAR';
import { Plus, Trash2, Calendar, Search, ArrowUpDown, Eye, EyeOff, FileText } from 'lucide-react';

interface DatesTabProps {
  cursos: any[];
  fechas: any[];
}

export const DatesTab: React.FC<DatesTabProps> = ({ cursos, fechas }) => {
  const [selectedCursoId, setSelectedCursoId] = useState('');
  const [selectedPrograma, setSelectedPrograma] = useState('');
  const [dateForm, setDateForm] = useState({
    inicio: '',
    certificado: ''
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const sortedCursos = [...cursos].sort((a, b) => (a.curso || '').localeCompare(b.curso || ''));

  const handleAddDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCursoId || !dateForm.inicio) {
      alert('Debe seleccionar un curso y una fecha de inicio.');
      return;
    }

    const courseObj = cursos.find(c => String(c.idCurso) === selectedCursoId);
    if (!courseObj) {
      alert('Curso no encontrado.');
      return;
    }

    try {
      await addDoc(collection(db, 'fechas'), {
        idCurso: Number(courseObj.idCurso),
        curso: courseObj.curso,
        inicio: dateForm.inicio,
        certificado: dateForm.certificado || '',
        showOnLanding: true
      });

      setDateForm({ inicio: '', certificado: '' });
      setSelectedCursoId('');
      alert('Fecha de curso agregada con éxito.');
    } catch (err) {
      console.error('Error al agregar fecha:', err);
      alert('Error al agregar fecha de curso.');
    }
  };

  const handleToggleVisibility = async (id: string, currentShow: boolean) => {
    if (!id) return;
    try {
      await setDoc(doc(db, 'fechas', id), { showOnLanding: !currentShow }, { merge: true });
    } catch (err) {
      console.error('Error al cambiar visibilidad:', err);
      alert('Error al actualizar visibilidad de la fecha.');
    }
  };

  const handleDeleteDate = async (id: string, cursoName: string, inicioDate: string) => {
    if (!id) return;
    if (!confirm(`¿Eliminar la fecha del ${formatDateAR(inicioDate)} para el curso "${cursoName}"?`)) return;

    try {
      await deleteDoc(doc(db, 'fechas', id));
      alert('Fecha eliminada con éxito.');
    } catch (err) {
      console.error('Error al eliminar fecha:', err);
      alert('Error al eliminar la fecha.');
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
        alert('No hay informes del docente subidos para este curso y fecha.');
      } else {
        const docData = snap.docs[0].data();
        setInformeView(docData);
      }
    } catch (err) {
      console.error(err);
      alert('Error al buscar el informe.');
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

  return (
    <div>
      <h2 className="section-title">Gestión de Fechas de Cursos</h2>

      <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        {/* Formulario de Alta de Fecha en 1 sola fila compacta superior */}
        <div className="details-box" style={{ width: '100%', padding: '16px 20px', marginBottom: '15px', boxSizing: 'border-box' }}>
          <h3 style={{ margin: '0 0 14px 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} color="var(--primary)" />
            Registrar Nueva Fecha
          </h3>
          <form onSubmit={handleAddDate}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', flexWrap: 'wrap', width: '100%' }}>
              <div className="form-group" style={{ flex: '1 1 180px', margin: 0 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Programa</label>
                <select className="form-control" value={selectedPrograma} onChange={e => { setSelectedPrograma(e.target.value); setSelectedCursoId(''); }} style={{ fontSize: '0.85rem' }}>
                  <option value="">-- Todos los programas --</option>
                  {[...new Set(cursos.map(c => c.programa?.trim() || 'Otros'))].sort().map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ flex: '2 1 240px', margin: 0 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Seleccionar Curso</label>
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
                      {c.curso}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ flex: '1 1 140px', margin: 0 }}>
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

              <div className="form-group" style={{ flex: '1 1 140px', margin: 0 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Fecha de Certificado</label>
                <input
                  type="date"
                  className="form-control"
                  value={dateForm.certificado}
                  onChange={e => setDateForm({ ...dateForm, certificado: e.target.value })}
                  style={{ fontSize: '0.85rem' }}
                />
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
            <div className="listbox-wrapper" style={{ maxHeight: '420px', overflowY: 'auto', width: '100%' }}>
              <table className="listbox-table" style={{ width: '100%', tableLayout: 'auto' }}>
                <thead>
                  <tr>
                    <th>Nombre del Curso</th>
                    <th
                      style={{ cursor: 'pointer', userSelect: 'none', width: '140px' }}
                      onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        Fecha Inicio {sortOrder === 'asc' ? '▲' : '▼'}
                      </div>
                    </th>
                    <th style={{ width: '140px' }}>Fecha Certificado</th>
                    <th style={{ width: '140px', textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFechas.map((f, i) => (
                    <tr key={f.id || i}>
                      <td data-label="Curso" style={{ fontWeight: 400 }}>{f.curso}</td>
                      <td data-label="Inicio">{formatDateAR(f.inicio)}</td>
                      <td data-label="Certificado">{formatDateAR(f.certificado)}</td>
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
                            onClick={() => handleVerInforme(f.curso, f.inicio)}
                            title="Ver informe del docente"
                          >
                            <FileText size={14} />
                          </button>
                          <button
                            type="button"
                            className="btn-danger"
                            style={{ padding: '4px 8px', margin: 0, minHeight: '32px', fontSize: '0.75rem' }}
                            onClick={() => handleDeleteDate(f.id, f.curso, f.inicio)}
                            title="Eliminar fecha"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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

