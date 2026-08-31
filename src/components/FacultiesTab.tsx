import React, { useState, useEffect } from 'react';
import { query, collection, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { downloadCSV } from '../utils/csv';
import { formatDateAR } from '../utils/dateAR';
import { Download, Search, FileText, ArrowUpDown, Printer, Upload } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import logoImg from '../img/logoCentro.png';
import { useModal } from './ModalProvider';

interface FacultiesTabProps {
  facultades: any[];
}

/**
 * FacultiesTab component that handles filtering students by institutional dependencies/faculties.
 * Promotes SOLID code design by wrapping its own Firestore and download interactions.
 * Features pagination, search, and CSV/PDF export capabilities.
 */
export const FacultiesTab: React.FC<FacultiesTabProps> = ({ facultades }) => {
  const { alert } = useModal();
  const [selectedFacultad, setSelectedFacultad] = useState('');
  const [alumnosFacultad, setAlumnosFacultad] = useState<any[]>([]);
  const [loadingFacultad, setLoadingFacultad] = useState(false);

  // Filter & Sort States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCurso, setFilterCurso] = useState('');
  const [filterResultado, setFilterResultado] = useState('');
  const [filterFecha, setFilterFecha] = useState('');
  const [filterFechaDesde, setFilterFechaDesde] = useState('');
  const [filterFechaHasta, setFilterFechaHasta] = useState('');
  const [filterDniDesde, setFilterDniDesde] = useState('');
  const [filterDniHasta, setFilterDniHasta] = useState('');
  const [sortDateOrder, setSortDateOrder] = useState<'asc' | 'desc' | 'none'>('none');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Reset pagination on filter or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterCurso, filterResultado, filterFecha, filterFechaDesde, filterFechaHasta, filterDniDesde, filterDniHasta, selectedFacultad, sortDateOrder]);

  const searchFacultad = async () => {
    if (!selectedFacultad) return;

    setLoadingFacultad(true);
    setAlumnosFacultad([]);
    setCurrentPage(1);

    try {
      const facObj = facultades.find(f => (f.unidadAcademica || f.facultad) === selectedFacultad);
      const uaCode = facObj ? (facObj.codigo || facObj.idFac || facObj.ua) : null;

      const targetNames = [selectedFacultad];
      if (selectedFacultad.includes('Agronomía') || selectedFacultad.includes('Zootecnia') || selectedFacultad.includes('Veterinaria')) {
        targetNames.push('Agronomía y Zootecnia', 'Agronomía, Zootecnia y Veterinaria', 'Agronomia y Zootecnia', 'Agronomia, Zootecnia y Veterinaria');
      }
      const uniqueNames = Array.from(new Set(targetNames));

      if (!uaCode) {
        // Fallback: Si no tiene un código en la colección facultades, buscar directamente por el nombre de la facultad
        let allResults: any[] = [];
        for (const name of uniqueNames) {
          const q = query(collection(db, 'inscripciones'), where('unidadAcademica', '==', name));
          const snap = await getDocs(q);
          allResults = allResults.concat(snap.docs.map(docSnap => docSnap.data()));
        }
        setAlumnosFacultad(allResults);
        return;
      }

      // Buscar por ua o unidadAcademica
      const q = query(collection(db, 'inscripciones'), where('ua', '==', uaCode));
      const snap = await getDocs(q);
      let results = snap.docs.map(docSnap => docSnap.data());

      if (results.length === 0) {
        // Fallback secundario si las inscripciones usan la propiedad unidadAcademica
        for (const name of uniqueNames) {
          const q2 = query(collection(db, 'inscripciones'), where('unidadAcademica', '==', name));
          const snap2 = await getDocs(q2);
          results = results.concat(snap2.docs.map(docSnap => docSnap.data()));
        }
      }

      setAlumnosFacultad(results);
    } catch (err) {
      console.error('Error al consultar alumnos por facultad:', err);
      await alert({ title: 'Error', message: 'No se pudieron obtener los alumnos de la facultad. Intente nuevamente.', variant: 'danger' });
    } finally {
      setLoadingFacultad(false);
    }
  };

  // Get unique lists from fetched data for select dropdowns
  const uniqueCursos = Array.from(new Set(alumnosFacultad.map(item => item.curso))).filter(Boolean).sort();
  const uniqueResultados = Array.from(new Set(alumnosFacultad.map(item => item.resultado))).filter(Boolean).sort();
  const uniqueFechas = Array.from(new Set(alumnosFacultad.map(item => item.fechaInicio))).filter(Boolean).sort();

  // Client-side filtering logic
  const filteredAlumnos = alumnosFacultad
    .filter(item => {
      const queryStr = searchQuery.toLowerCase();
      const matchesQuery = !queryStr ||
        String(item.dni).toLowerCase().includes(queryStr) ||
        (item.apellido || '').toLowerCase().includes(queryStr) ||
        (item.nombre || '').toLowerCase().includes(queryStr) ||
        (item.curso || '').toLowerCase().includes(queryStr) ||
        (item.email || '').toLowerCase().includes(queryStr);

      const matchesCurso = !filterCurso || item.curso === filterCurso;
      const matchesResultado = !filterResultado || item.resultado === filterResultado;
      const matchesFecha = !filterFecha || (item.fechaInicio || '').includes(filterFecha);

      const itemFecha = item.fechaInicio || '';
      const matchesFechaDesde = !filterFechaDesde || itemFecha >= filterFechaDesde;
      const matchesFechaHasta = !filterFechaHasta || itemFecha <= filterFechaHasta;

      const itemDni = Number(item.dni) || 0;
      const matchesDniDesde = !filterDniDesde || itemDni >= Number(filterDniDesde);
      const matchesDniHasta = !filterDniHasta || itemDni <= Number(filterDniHasta);

      return matchesQuery && matchesCurso && matchesResultado && matchesFecha &&
        matchesFechaDesde && matchesFechaHasta && matchesDniDesde && matchesDniHasta;
    })
    .sort((a, b) => {
      if (sortDateOrder === 'none') return 0;
      const dateA = a.fechaInicio || '';
      const dateB = b.fechaInicio || '';
      if (dateA < dateB) return sortDateOrder === 'asc' ? -1 : 1;
      if (dateA > dateB) return sortDateOrder === 'asc' ? 1 : -1;
      return 0;
    });

  // Pagination calculation
  const totalPages = Math.ceil(filteredAlumnos.length / itemsPerPage);
  const paginatedAlumnos = filteredAlumnos.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // PDF Export logic
  const downloadPDF = () => {
    if (filteredAlumnos.length === 0) return;

    const doc = new jsPDF();

    // Add Logo aligned at Y = 10, height 18mm
    try {
      doc.addImage(logoImg, 'PNG', 14, 10, 75.8, 18);
    } catch (e) {
      console.error('Error adding logo to PDF', e);
    }

    const textLeftMargin = 94;

    // Title & Header styling in blue aligned with logo
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(30, 78, 140);
    doc.text("Reporte de Capacitaciones", textLeftMargin, 15);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(60, 60, 60);
    doc.text(`Dependencia: ${selectedFacultad}`, textLeftMargin, 21);
    doc.text(`Fecha Reporte: ${formatDateAR(new Date())} | Registros: ${filteredAlumnos.length}`, textLeftMargin, 27);

    doc.setDrawColor(30, 78, 140);
    doc.setLineWidth(0.5);
    doc.line(14, 32, 196, 32);

    const tableColumn = ["DNI", "Apellido", "Nombre", "Curso", "Fecha Inicio", "Resultado"];
    const tableRows = filteredAlumnos.map(item => [
      item.dni,
      item.apellido || '',
      item.nombre || '',
      item.curso || '',
      formatDateAR(item.fechaInicio),
      item.resultado || 'Cursando'
    ]);

    autoTable(doc, {
      startY: 35,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [30, 78, 140], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9.5 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 34, fontStyle: 'bold' },
        2: { cellWidth: 34 },
        3: { cellWidth: 54 },
        4: { cellWidth: 24 },
        5: { cellWidth: 22 }
      }
    });

    const fileName = `informe_facultad_${selectedFacultad.replace(/\s+/g, '_')}.pdf`;
    doc.save(fileName);
  };

  return (
    <div className="alumnos-institucional">
      <h2 className="section-title" style={{ marginBottom: '16px' }}>
        <FileText size={24} color="currentColor" /> Reportes y Consultas por Facultad / Dependencia
      </h2>

      <div className="details-box" style={{ marginBottom: '25px' }}>
        <div className="details-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '15px' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Seleccionar Facultad / Dependencia</label>
            <select
              className="form-control"
              value={selectedFacultad}
              onChange={e => setSelectedFacultad(e.target.value)}
            >
              <option value="">-- Seleccione una Dependencia --</option>
              {facultades.map((f, i) => {
                const name = f.unidadAcademica || f.facultad || '';
                const code = f.codigo || f.idFac || f.ua || '';
                return (
                  <option key={code || i} value={name}>
                    {name} {code ? `(${code})` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
            <button
              className="btn-primary"
              style={{ margin: 0, width: '140px', height: '40px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.825rem', whiteSpace: 'nowrap' }}
              onClick={searchFacultad}
              disabled={!selectedFacultad || loadingFacultad}
            >
              <FileText size={15} /> Generar reporte
            </button>

            {filteredAlumnos.length > 0 && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  className="btn-secondary"
                  style={{ margin: 0, width: '140px', height: '40px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.825rem', whiteSpace: 'nowrap' }}
                  onClick={() => downloadCSV(
                    filteredAlumnos,
                    ['DNI', 'Apellido', 'Nombre', 'Curso', 'Fecha Inicio', 'Resultado'],
                    ['dni', 'apellido', 'nombre', 'curso', 'fechaInicio', 'resultado'],
                    `informe_facultad_${selectedFacultad.replace(/\s+/g, '_')}.csv`
                  )}
                  title="Exportar archivo CSV"
                >
                  <Upload size={15} /> Exportar CSV
                </button>
                <button
                  className="btn-secondary"
                  style={{ margin: 0, width: '140px', height: '40px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.825rem', whiteSpace: 'nowrap' }}
                  onClick={downloadPDF}
                  title="Descargar Planilla PDF para Imprimir"
                >
                  <Printer size={15} /> Imprimir PDF
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {loadingFacultad && <div className="spinner"></div>}

      {alumnosFacultad.length > 0 && !loadingFacultad && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Fila de Filtros Adicionales */}
          <div className="details-box" style={{ background: 'rgba(255, 255, 255, 0.01)', borderStyle: 'dashed' }}>
            <h4 style={{ fontSize: '0.85rem', color: 'var(--primary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Filtros avanzados sobre los resultados</h4>
            <div className="details-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.75rem' }}>Búsqueda General</label>
                <input
                  type="text"
                  className="form-control"
                  style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                  placeholder="DNI, nombre, curso..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.75rem' }}>Filtrar por Curso</label>
                <select
                  className="form-control"
                  style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                  value={filterCurso}
                  onChange={e => setFilterCurso(e.target.value)}
                >
                  <option value="">-- Todos los Cursos --</option>
                  {uniqueCursos.map((c, idx) => (
                    <option key={idx} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.75rem' }}>Filtrar por Estado</label>
                <select
                  className="form-control"
                  style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                  value={filterResultado}
                  onChange={e => setFilterResultado(e.target.value)}
                >
                  <option value="">-- Todos los Estados --</option>
                  {uniqueResultados.map((r, idx) => (
                    <option key={idx} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.75rem' }}>Filtrar por Fecha (Inicio)</label>
                <select
                  className="form-control"
                  style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                  value={filterFecha}
                  onChange={e => setFilterFecha(e.target.value)}
                >
                  <option value="">-- Todas las Fechas --</option>
                  {uniqueFechas.map((f, idx) => (
                    <option key={idx} value={f}>{f}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="details-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginTop: '15px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.75rem' }}>Rango de Fecha Inicio — Desde</label>
                <input
                  type="date"
                  className="form-control"
                  style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                  value={filterFechaDesde}
                  onChange={e => setFilterFechaDesde(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.75rem' }}>Rango de Fecha Inicio — Hasta</label>
                <input
                  type="date"
                  className="form-control"
                  style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                  value={filterFechaHasta}
                  onChange={e => setFilterFechaHasta(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.75rem' }}>Rango de DNI — Desde</label>
                <input
                  type="number"
                  className="form-control"
                  style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                  placeholder="Ej: 20000000"
                  value={filterDniDesde}
                  onChange={e => setFilterDniDesde(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.75rem' }}>Rango de DNI — Hasta</label>
                <input
                  type="number"
                  className="form-control"
                  style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                  placeholder="Ej: 45000000"
                  value={filterDniHasta}
                  onChange={e => setFilterDniHasta(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="listbox-wrapper">
            <table className="listbox-table">
              <thead>
                <tr>
                  <th>DNI</th>
                  <th>Apellido</th>
                  <th>Nombre</th>
                  <th>Curso</th>
                  <th
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => setSortDateOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                    title="Haga clic para ordenar por Fecha de Inicio"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      Fecha de Inicio
                      <ArrowUpDown size={14} />
                      {sortDateOrder === 'asc' && <span style={{ fontSize: '0.75rem' }}>▲</span>}
                      {sortDateOrder === 'desc' && <span style={{ fontSize: '0.75rem' }}>▼</span>}
                    </div>
                  </th>
                  <th>Resultado</th>
                </tr>
              </thead>
              <tbody>
                {paginatedAlumnos.map((item, i) => (
                  <tr key={i}>
                    <td data-label="DNI">{item.dni}</td>
                    <td data-label="Apellido">{item.apellido}</td>
                    <td data-label="Nombre">{item.nombre}</td>
                    <td data-label="Curso">{item.curso}</td>
                    <td data-label="Fecha Inicio">{formatDateAR(item.fechaInicio)}</td>
                    <td data-label="Resultado">
                      <span className={`badge badge-${(item.resultado || 'cursando').toLowerCase().replace('ó', 'o')}`}>
                        {item.resultado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginTop: '10px' }}>
              <button
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.85rem', margin: 0 }}
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              >
                Anterior
              </button>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Página {currentPage} de {totalPages}
              </span>
              <button
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.85rem', margin: 0 }}
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              >
                Siguiente
              </button>
            </div>
          )}

          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
            Mostrando {filteredAlumnos.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} al {Math.min(currentPage * itemsPerPage, filteredAlumnos.length)} de {filteredAlumnos.length} inscritos encontrados.
          </span>
        </div>
      )}

      {alumnosFacultad.length === 0 && !loadingFacultad && selectedFacultad && (
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '20px' }}>
          No se encontraron alumnos de esta facultad registrados en ningún curso.
        </p>
      )}
    </div>
  );
};
