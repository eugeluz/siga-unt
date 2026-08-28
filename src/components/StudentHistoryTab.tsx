import React, { useState } from 'react';
import { getDoc, doc, getDocs, collection, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { formatDateAR } from '../utils/dateAR';
import { FolderOpen, Search } from 'lucide-react';
import { useModal } from './ModalProvider';

interface StudentHistoryTabProps {
  alumnos: any[];
  cursos?: any[];
  fechas?: any[];
  defaultDni?: string;
}

export const StudentHistoryTab: React.FC<StudentHistoryTabProps> = ({ alumnos, cursos = [], fechas = [], defaultDni = '' }) => {
  const { alert } = useModal();
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
      let studentObj = alumnos.find(a => String(a.dni) === searchVal.trim());
      if (!studentObj) {
        // Fetch student directly by DNI (1 single read)
        const snapStud = await getDoc(doc(db, 'alumnos', searchVal.trim()));
        if (snapStud.exists()) studentObj = snapStud.data();
      }
      if (studentObj) {
        setAlumnoSelected(studentObj);
      }

      const qInsc = query(collection(db, 'inscripciones'), where('dni', '==', Number(searchVal)));
      const snapInsc = await getDocs(qInsc);
      const listInsc = snapInsc.docs.map(d => d.data());

      let cursosList = cursos;
      let fechasList = fechas;

      if (cursosList.length === 0 || fechasList.length === 0) {
        const [snapCursos, snapFechas] = await Promise.all([
          getDocs(collection(db, 'cursos')),
          getDocs(collection(db, 'fechas'))
        ]);
        if (cursosList.length === 0) cursosList = snapCursos.docs.map(d => d.data());
        if (fechasList.length === 0) fechasList = snapFechas.docs.map(d => d.data());
      }

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
      await alert({ title: 'Error', message: 'No se pudo consultar el historial del alumno. Intente nuevamente.', variant: 'danger' });
    } finally {
      setLoadingHistorial(false);
    }
  };

  const handleSearchClick = () => {
    searchHistorial();
  };

  return (
    <div>
      <div className="details-box" style={{ marginBottom: '25px', padding: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'end', gap: '16px', maxWidth: '650px', width: '100%' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <input
              type="number"
              className="form-control"
              placeholder="Ingresar el DNI del alumno..."
              value={consultaDni}
              onChange={e => setConsultaDni(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSearchClick(); }}
              style={{ width: '100%', height: '44px', fontSize: '0.95rem' }}
            />
          </div>
          <button
            className="btn-primary"
            style={{
              margin: 0,
              height: '44px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              whiteSpace: 'nowrap',
              padding: '0 24px',
              fontSize: '0.95rem',
              fontWeight: 600
            }}
            onClick={handleSearchClick}
          >
            <Search size={18} /> Consultar Historial
          </button>
        </div>
      </div>

      {loadingHistorial && <div className="spinner"></div>}

      {alumnoSelected && (
        <div className="details-box" style={{ marginBottom: '20px', background: 'rgba(255, 255, 255, 0.02)' }}>
          <h3>Alumno: {alumnoSelected.apellido}, {alumnoSelected.nombre}</h3>
          <p style={{ margin: '5px 0', color: 'var(--text-secondary)' }}>
            <strong>DNI:</strong> {alumnoSelected.dni} | <strong>Email:</strong> {alumnoSelected.email || '—'} | <strong>Sec. Rectorado/UA:</strong> {alumnoSelected.unidadAcademica || '—'}
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
