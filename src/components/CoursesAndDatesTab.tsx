import React, { useState } from 'react';
import { CoursesTab } from './CoursesTab';
import { DatesTab } from './DatesTab';
import { BookOpen, Calendar, ChevronRight } from 'lucide-react';

interface CoursesAndDatesTabProps {
  cursos: any[];
  docentes: any[];
  fechas: any[];
}

export const CoursesAndDatesTab: React.FC<CoursesAndDatesTabProps> = ({ cursos, docentes, fechas }) => {
  const [subTab, setSubTab] = useState<'inicio' | 'cursos' | 'fechas'>('inicio');

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
              {subTab === 'cursos' ? (
                <>
                  <BookOpen size={22} color="currentColor" /> Gestión de Cursos de Capacitación
                </>
              ) : (
                <>
                  <Calendar size={22} color="currentColor" /> Fechas de Inicio de Cursos
                </>
              )}
            </h2>
          </div>

          {/* Renderizado del componente correspondiente */}
          {subTab === 'cursos' ? (
            <CoursesTab cursos={cursos} docentes={docentes} fechas={fechas} />
          ) : (
            <DatesTab cursos={cursos} fechas={fechas} />
          )}
        </div>
      ) : (
        /* Vista de inicio — caja igual que Alumnos (azul en modo oscuro) */
        <div className="caja-titulo-principal">
          <h2 className="section-title" style={{ marginBottom: '16px' }}>
            <BookOpen size={24} color="currentColor" /> Cursos y Fechas
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
            {/* Cajita 1: Cursos */}
            <div
              className="details-box"
              onClick={() => setSubTab('cursos')}
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
                  <BookOpen size={36} color="#003876" />
                </div>

                <p style={{ color: '#1e3350', fontSize: '0.95rem', margin: 0, lineHeight: '1.5', fontWeight: 200, textAlign: 'left', flex: 1 }}>
                  Agregar y/o modificar cursos
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
                Ingresar a Cursos <ChevronRight size={18} />
              </button>
            </div>

            {/* Cajita 2: FECHAS */}
            <div
              className="details-box"
              onClick={() => setSubTab('fechas')}
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
                  <Calendar size={36} color="#003876" />
                </div>

                <p style={{ color: '#1e3350', fontSize: '0.95rem', margin: 0, lineHeight: '1.5', fontWeight: 200, textAlign: 'left', flex: 1 }}>
                  Asignar fechas de los cursos
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
                Ingresar a Fechas <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
