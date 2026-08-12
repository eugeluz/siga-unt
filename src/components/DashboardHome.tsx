import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface DashboardHomeProps {
  cursosCount: number;
  facultadesCount: number;
  docentesCount: number;
  inscripciones: any[];
  cursos: any[];
}

/**
 * DashboardHome component representing the "Inicio" tab statistics card panel.
 * Displays total statistics and dynamic charts (Enrollment Status, Top Courses).
 */
export const DashboardHome: React.FC<DashboardHomeProps> = ({
  cursosCount,
  facultadesCount,
  docentesCount,
  inscripciones = [],
  cursos = []
}) => {
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);

  // 1. Process Status Counts for Donut Chart
  const statusCounts: Record<string, number> = {
    'Aprobado': 0,
    'Cursando': 0,
    'Desaprobado': 0,
    'Abandono': 0
  };

  inscripciones.forEach(ins => {
    const res = ins.resultado || 'Cursando';
    if (statusCounts[res] !== undefined) {
      statusCounts[res]++;
    } else {
      statusCounts['Cursando']++;
    }
  });

  const alumnosAprobados = inscripciones.filter(ins => ins.resultado === 'Aprobado').length;
  const totalInscripciones = inscripciones.length;

  // Donut SVG details
  const radius = 38;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  let currentOffset = 0;

  const donutSegments = Object.entries(statusCounts).map(([status, count]) => {
    const percentage = totalInscripciones > 0 ? count / totalInscripciones : 0;
    const segmentLength = percentage * circumference;
    // Leave a small gap between slices for a modern split look
    const strokeDasharray = segmentLength > 2
      ? `${segmentLength - 2.5} ${circumference}`
      : `${segmentLength} ${circumference}`;

    const strokeDashoffset = currentOffset;
    currentOffset -= percentage * circumference;

    let color = 'var(--accent)'; // Cursando (default)
    if (status === 'Aprobado') color = 'var(--success)';
    if (status === 'Desaprobado') color = 'var(--danger-text)';
    if (status === 'Abandono') color = 'var(--warning)';

    return {
      status,
      count,
      percentage: Math.round(percentage * 100),
      strokeDasharray,
      strokeDashoffset,
      color
    };
  });

  // 2. Process Top Courses for Bar Chart
  const courseCounts: Record<string, number> = {};
  inscripciones.forEach(ins => {
    const curso = ins.curso || 'Sin curso';
    courseCounts[curso] = (courseCounts[curso] || 0) + 1;
  });

  const topCourses = Object.entries(courseCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const maxCourseInscriptions = topCourses.length > 0 ? topCourses[0][1] : 1;

  // Determine center text for interactive donut chart
  const activeCount = hoveredSegment ? statusCounts[hoveredSegment] : totalInscripciones;
  const activeLabel = hoveredSegment ? hoveredSegment : 'Total';
  const activePercentage = hoveredSegment && totalInscripciones > 0
    ? Math.round((statusCounts[hoveredSegment] / totalInscripciones) * 100)
    : null;

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
      <h2 className="section-title" style={{ marginBottom: '6px' }}>Sistema de Gestión Académica</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.9rem' }}>
        Bienvenido al sistema SIGA 2026.
      </p>

      {/* Main stat cards */}
      <div className="dashboard-grid" style={{ marginBottom: '18px', gap: '15px' }}>
        <div className="stat-card" style={{ padding: '16px' }}>
          <div className="stat-val" style={{ fontSize: '1.8rem' }}>{cursosCount}</div>
          <div className="stat-lbl" style={{ fontSize: '0.8rem' }}>Cursos de Formación</div>
        </div>
        <div className="stat-card" style={{ padding: '16px' }}>
          <div className="stat-val" style={{ fontSize: '1.8rem' }}>{facultadesCount}</div>
          <div className="stat-lbl" style={{ fontSize: '0.8rem' }}>Facultades / Dependencias</div>
        </div>
        <div className="stat-card" style={{ cursor: 'default', padding: '16px' }}>
          <div className="stat-val" style={{ fontSize: '1.8rem' }}>{alumnosAprobados}</div>
          <div className="stat-lbl" style={{ fontSize: '0.8rem' }}>Alumnos Aprobados</div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="details-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '18px' }}>

        {/* Chart 1: Donut Status */}
        <div className="details-box" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', minHeight: '270px', padding: '18px 22px' }}>
          <h3 style={{ alignSelf: 'flex-start', margin: 0 }}>Estado de Inscriptos</h3>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '40px', margin: '20px 0', width: '100%' }}>

            {/* SVG Donut */}
            <div style={{ position: 'relative', width: '150px', height: '150px' }}>
              <svg width="150" height="150" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
                <defs>
                  <filter id="donut-shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000000" floodOpacity="0.4" />
                  </filter>
                </defs>

                {/* Background tracks */}
                <circle cx="50" cy="50" r={radius} fill="transparent" stroke="rgba(255,255,255,0.02)" strokeWidth={strokeWidth} />

                {donutSegments.map((seg, idx) => {
                  const isHovered = hoveredSegment === seg.status;
                  return (
                    <circle
                      key={idx}
                      cx="50"
                      cy="50"
                      r={radius}
                      fill="transparent"
                      stroke={seg.color}
                      strokeWidth={isHovered ? strokeWidth + 3 : strokeWidth}
                      strokeDasharray={seg.strokeDasharray}
                      strokeDashoffset={seg.strokeDashoffset}
                      strokeLinecap="round"
                      filter="url(#donut-shadow)"
                      style={{
                        transition: 'stroke-width 0.2s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.2s',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={() => setHoveredSegment(seg.status)}
                      onMouseLeave={() => setHoveredSegment(null)}
                    />
                  );
                })}
              </svg>

              {/* Inner text overlay */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                width: '70px',
                height: '70px',
                borderRadius: '50%',
                background: 'rgba(20, 28, 37, 0.9)',
                border: '1px solid rgba(82, 116, 148, 0.2)',
                boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none'
              }}>
                <span style={{
                  fontSize: activeCount > 999 ? '1.05rem' : '1.25rem',
                  fontWeight: 700,
                  display: 'block',
                  color: 'white',
                  transition: 'font-size 0.2s'
                }}>
                  {activeCount}
                </span>
                <span style={{
                  fontSize: '0.6rem',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '60px'
                }}>
                  {activeLabel}
                </span>
                {activePercentage !== null && (
                  <span style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 700, marginTop: '2px' }}>
                    {activePercentage}%
                  </span>
                )}
              </div>
            </div>

            {/* Interactive Legend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '160px' }}>
              {donutSegments.map((seg, idx) => {
                const isHovered = hoveredSegment === seg.status;
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      fontSize: '0.825rem',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      background: isHovered ? 'rgba(255,255,255,0.03)' : 'transparent',
                      border: isHovered ? '1px solid rgba(255,255,255,0.05)' : '1px solid transparent',
                      transition: 'all 0.2s',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={() => setHoveredSegment(seg.status)}
                    onMouseLeave={() => setHoveredSegment(null)}
                  >
                    <div style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: seg.color,
                      boxShadow: `0 0 8px ${seg.color}`
                    }}></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{seg.status}</span>
                      <strong style={{ color: 'white', marginLeft: '10px' }}>
                        {seg.count} ({seg.percentage}%)
                      </strong>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>

        {/* Chart 2: Top Courses Bar Chart */}
        <div className="details-box" style={{ minHeight: '270px', padding: '18px 22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, marginBottom: '14px' }}>Top 5 Cursos con Mayor Demanda</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flexGrow: 1, justifyContent: 'center' }}>
            {topCourses.length > 0 ? (
              topCourses.map(([course, count], idx) => {
                const percentage = maxCourseInscriptions > 0 ? (count / maxCourseInscriptions) * 100 : 0;
                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                      <span style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '75%', color: 'var(--text-secondary)' }} title={course}>
                        {course}
                      </span>
                      <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{count} inscriptos</span>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '6px', height: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.02)' }}>
                      <div style={{ background: 'linear-gradient(to right, var(--primary), var(--accent))', width: `${percentage}%`, height: '100%', borderRadius: '6px', transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}></div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>No hay inscripciones registradas.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
