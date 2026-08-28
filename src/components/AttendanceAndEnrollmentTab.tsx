import React, { useState } from 'react';
import { EnrollmentTab } from './EnrollmentTab';
import { AttendanceTab } from './AttendanceTab';
import { ClipboardCheck, UserPlus, ArrowLeft, ChevronRight } from 'lucide-react';

interface AttendanceAndEnrollmentTabProps {
  cursos: any[];
  fechas: any[];
  facultades?: any[];
  alumnos?: any[];
}

export const AttendanceAndEnrollmentTab: React.FC<AttendanceAndEnrollmentTabProps> = ({
  cursos,
  fechas,
  facultades = [],
  alumnos = []
}) => {
  const [subTab, setSubTab] = useState<'inicio' | 'inscripcion' | 'asistencia'>('inicio');

  return (
    <div>
      {/* Visualización tras seleccionar una opción */}
      {subTab !== 'inicio' ? (
        <div style={{ marginBottom: '24px' }}>
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
            {/* Título de la sección seleccionada a la izquierda */}
            <h2 className="section-title" style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {subTab === 'inscripcion' ? (
                <>
                  <UserPlus size={22} color="#003876" /> Inscripción a Cursos
                </>
              ) : (
                <>
                  <ClipboardCheck size={22} color="#003876" /> Control de Asistencia y Calificaciones
                </>
              )}
            </h2>

            {/* Botón de volver al menú a la derecha */}
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setSubTab('inicio')}
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

          {/* Renderizado del componente correspondiente */}
          {subTab === 'inscripcion' ? (
            <EnrollmentTab
              cursos={cursos}
              fechas={fechas}
              facultades={facultades}
              alumnos={alumnos}
            />
          ) : (
            <AttendanceTab
              cursos={cursos}
              fechas={fechas}
            />
          )}
        </div>
      ) : (
        /* Vista de inicio con las 2 cajitas — estilo institucional */
        <div style={{ background: '#F2F4F7', borderRadius: '16px', padding: '24px', border: '1px solid rgba(0,56,118,0.08)' }}>
          <h2 className="section-title" style={{ marginBottom: '16px' }}>
            <ClipboardCheck size={24} color="#003876" /> Asistencia e Inscripción
          </h2>
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: '24px',
              maxWidth: '900px',
              margin: '0 auto'
            }}
          >
            {/* Cajita 1: Inscripción — mismo flavicon que Asistencia */}
            <div
              className="details-box"
              onClick={() => setSubTab('inscripcion')}
              style={{
                flex: '1 1 280px',
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
                justifyContent: 'space-between',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,56,118,0.12)';
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
                    background: 'var(--primary-alpha-15, rgba(0, 56, 118, 0.09))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '20px',
                    border: '1px solid rgba(0,56,118,0.10)'
                  }}
                >
                  <UserPlus size={36} color="#003876" />
                </div>

                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0, lineHeight: '1.5' }}>
                  Inscripción individual y/o por lotes
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
                Ingresar a Inscripción <ChevronRight size={18} />
              </button>
            </div>

            {/* Cajita 2: Asistencia — mismo flavicon que Inscripción */}
            <div
              className="details-box"
              onClick={() => setSubTab('asistencia')}
              style={{
                flex: '1 1 280px',
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
                justifyContent: 'space-between',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,56,118,0.12)';
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
                    background: 'var(--primary-alpha-15, rgba(0, 56, 118, 0.09))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '20px',
                    border: '1px solid rgba(0,56,118,0.10)'
                  }}
                >
                  <ClipboardCheck size={36} color="#003876" />
                </div>

                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0, lineHeight: '1.5' }}>
                  Registro de asistencia y cierre de cursos.
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
                Ingresar a Asistencia <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
