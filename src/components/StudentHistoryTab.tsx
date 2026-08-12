import React, { useState } from 'react';
import { getDoc, doc, getDocs, collection, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { formatDateAR } from '../utils/dateAR';
import { FolderOpen, Search } from 'lucide-react';

interface StudentHistoryTabProps {
  alumnos: any[];
  defaultDni?: string;
}

export const StudentHistoryTab: React.FC<StudentHistoryTabProps> = ({ alumnos, defaultDni = '' }) => {
  const [consultaDni, setConsultaDni] = useState(defaultDni);
  const [alumnoSelected, setAlumnoSelected] = useState<any>(null);
  const [historialAlumno, setHistorialAlumno] = useState<any[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  // Auto-search if defaultDni is provided
  React.useEffect(() => {
    if (defaultDni) {
      setConsultaDni(defaultDni);
      searchHistorial(defaultDni);
    }
  }, [defaultDni]);

  const searchHistorial = async (dniToSearch?: string) => {
    const searchVal = dniToSearch || consultaDni;
    if (!searchVal) return;
    setLoadingHistorial(true);
    setAlumnoSelected(null);
    setHistorialAlumno([]);

    try {
      const studentObj = alumnos.find(a => String(a.dni) === searchVal.trim());
      if (studentObj) {
        setAlumnoSelected(studentObj);
      }

      const qInsc = query(collection(db, 'inscripciones'), where('dni', '==', Number(searchVal)));
      const snapInsc = await getDocs(qInsc);
      const listInsc = snapInsc.docs.map(d => d.data());

      const [snapCursos, snapFechas] = await Promise.all([
        getDocs(collection(db, 'cursos')),
        getDocs(collection(db, 'fechas'))
      ]);

      const cursosList = snapCursos.docs.map(d => d.data());
      const fechasList = snapFechas.docs.map(d => d.data());

      const fullHistory = listInsc.map(insc => {
        const cursoObj = cursosList.find(c => c.curso === insc.curso);
        const fechaObj = fechasList.find(f => f.curso === insc.curso && f.inicio === insc.fechaInicio);

        return {
          ...insc,
          resolucion: cursoObj?.resolucion || 'Sin dato',
          certificado: fechaObj?.certificado || '—'
        };
      });

      setHistorialAlumno(fullHistory);
    } catch (err) {
      console.error(err);
      alert('Error al consultar historial del alumno.');
    } finally {
      setLoadingHistorial(false);
    }
  };

  const handleSearchClick = () => {
    searchHistorial();
  };

  return (
    <div>
      <h2 className="section-title">Historial de Capacitaciones de Alumnos</h2>

      <div className="details-box" style={{ marginBottom: '25px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ margin: 0, flex: '1', minWidth: '200px' }}>
            <label>DNI del Alumno</label>
            <input
              type="number"
              className="form-control"
              placeholder="Ingrese el DNI..."
              value={consultaDni}
              onChange={e => setConsultaDni(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSearchClick(); }}
            />
          </div>
          <button
            className="btn-primary"
            style={{ margin: 0, height: '42px', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={handleSearchClick}
          >
            <Search size={16} /> Consultar Historial
          </button>
        </div>
      </div>

      {loadingHistorial && <div className="spinner"></div>}

      {alumnoSelected && (
        <div className="details-box" style={{ marginBottom: '20px', background: 'rgba(255, 255, 255, 0.02)' }}>
          <h3>Alumno: {alumnoSelected.apellido}, {alumnoSelected.nombre}</h3>
          <p style={{ margin: '5px 0', color: 'var(--text-secondary)' }}>
            <strong>DNI:</strong> {alumnoSelected.dni} | <strong>Email:</strong> {alumnoSelected.email || '—'} | <strong>Unidad Académica:</strong> {alumnoSelected.unidadAcademica || '—'}
          </p>
        </div>
      )}

      {historialAlumno.length > 0 && (
        <div className="listbox-wrapper">
          <table className="listbox-table">
            <thead>
              <tr>
                <th>Curso</th>
                <th>Fecha Inicio</th>
                <th>Fecha Certificado</th>
                <th>Estado</th>
                <th>Resolución</th>
              </tr>
            </thead>
            <tbody>
              {historialAlumno.map(item => (
                <tr key={item.id}>
                  <td data-label="Curso">{item.curso}</td>
                  <td data-label="Fecha Inicio">{formatDateAR(item.fechaInicio)}</td>
                  <td data-label="Certificado">{formatDateAR(item.certificado)}</td>
                  <td data-label="Estado">
                    <span className={`badge badge-${(item.resultado || 'cursando').toLowerCase().replace('ó', 'o')}`}>
                      {item.resultado}
                    </span>
                  </td>
                  <td data-label="Resolución">{item.resolucion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {historialAlumno.length === 0 && !loadingHistorial && consultaDni && (
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '20px' }}>
          El alumno no registra inscripciones de capacitación.
        </p>
      )}
    </div>
  );
};
