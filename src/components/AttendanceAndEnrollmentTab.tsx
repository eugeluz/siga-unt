import React, { useState } from 'react';
import { EnrollmentTab } from './EnrollmentTab';
import { AttendanceTab } from './AttendanceTab';
import { ClipboardCheck, UserPlus, ChevronRight } from 'lucide-react';

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
    <div className="alumnos-institucional">
      {/* Visualización tras seleccionar una opción */}
      {subTab !== 'inicio' ? (
        <div style={{ marginBottom: '24px' }}>
          <div
            className="caja-titulo-principal"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              marginBottom: '20px',
              flexWrap: 'wrap',
              gap: '12px',
              padding: '14px 20px',
              borderRadius: '12px'
            }}
          >
            <h2 className="section-title" style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {subTab === 'inscripcion' ? (
                <>
                  <UserPlus size={22} color="currentColor" /> Inscripción a Cursos
                </>
              ) : (
                <>
                  <ClipboardCheck size={22} color="currentColor" /> Control de Asistencia y Calificaciones
                </>
              )}
            </h2>
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
        /* Vista de inicio — caja igual que Alumnos (azul en modo oscuro) */
        <div className="caja-titulo-principal">
          <h2 className="section-title" style={{ marginBottom: '16px' }}>
            <ClipboardCheck size={24} color="currentColor" /> Asistencia e Inscripción
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
            {/* Cajita 1: Inscripción */}
            <div
              className="details-box"
              onClick={() => setSubTab('inscripcion')}
              style={{
                cursor: 'pointer',
                padding: '32px 24px',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                transition: 'all 0.25s ease',
                border: '2px solid #cbd5e1',
                background: '#ffffff',
                height: '100%',
                justifyContent: 'space-between',
                boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#003876';
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,56,118,0.12)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)';
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', width: '100%', gap: '14px', textAlign: 'left' }}>
                <div
                  style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '18px',
                    background: '#f0f4f8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    border: '1px solid #cbd5e1'
                  }}
                >
                  <UserPlus size={36} color="#003876" />
                </div>

                <p style={{ color: '#1e3350', fontSize: '0.95rem', margin: 0, lineHeight: '1.5', fontWeight: 200, textAlign: 'left', flex: 1 }}>
                  Inscripción individual y/o por lotes
                </p>
              </div>

              <button
                className="btn-primary btn-ingresar"
                style={{
                  width: '100%',
                  height: '46px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  margin: 0,
                  marginTop: '36px'
                }}
              >
                Ingresar a Inscripción <ChevronRight size={18} />
              </button>
            </div>

            {/* Cajita 2: Asistencia */}
            <div
              className="details-box"
              onClick={() => setSubTab('asistencia')}
              style={{
                cursor: 'pointer',
                padding: '32px 24px',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                transition: 'all 0.25s ease',
                border: '2px solid #cbd5e1',
                background: '#ffffff',
                height: '100%',
                justifyContent: 'space-between',
                boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#003876';
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,56,118,0.12)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)';
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', width: '100%', gap: '14px', textAlign: 'left' }}>
                <div
                  style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '18px',
                    background: '#f0f4f8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    border: '1px solid #cbd5e1'
                  }}
                >
                  <ClipboardCheck size={36} color="#003876" />
                </div>

                <p style={{ color: '#1e3350', fontSize: '0.95rem', margin: 0, lineHeight: '1.5', fontWeight: 200, textAlign: 'left', flex: 1 }}>
                  Registro de asistencia y cierre de cursos
                </p>
              </div>

              <button
                className="btn-primary btn-ingresar"
                style={{
                  width: '100%',
                  height: '46px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  margin: 0,
                  marginTop: '36px'
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
