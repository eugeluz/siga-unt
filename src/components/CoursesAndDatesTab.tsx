import React, { useState } from 'react';
import { CoursesTab } from './CoursesTab';
import { DatesTab } from './DatesTab';
import { BookOpen, Calendar, ArrowLeft, ChevronRight } from 'lucide-react';

interface CoursesAndDatesTabProps {
  cursos: any[];
  docentes: any[];
  fechas: any[];
}

export const CoursesAndDatesTab: React.FC<CoursesAndDatesTabProps> = ({ cursos, docentes, fechas }) => {
  const [subTab, setSubTab] = useState<'inicio' | 'cursos' | 'fechas'>('inicio');

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
              {subTab === 'cursos' ? (
                <>
                  <BookOpen size={22} color="var(--primary)" /> Gestión de Cursos de Capacitación
                </>
              ) : (
                <>
                  <Calendar size={22} color="#10b981" /> Fechas de Inicio de Cursos
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
          {subTab === 'cursos' ? (
            <CoursesTab cursos={cursos} docentes={docentes} fechas={fechas} />
          ) : (
            <DatesTab cursos={cursos} fechas={fechas} />
          )}
        </div>
      ) : (
        /* Vista de inicio con las 2 cajitas del mismo tamaño indicando cada función */
        <div style={{ padding: '10px 0' }}>
          <h2 className="section-title" style={{ marginBottom: '8px' }}>
            <BookOpen size={24} /> Cursos y Fechas
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
            {/* Cajita 1: Cursos */}
            <div
              className="details-box"
              onClick={() => setSubTab('cursos')}
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
                e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.15)';
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
                    background: 'var(--primary-alpha-15, rgba(59, 130, 246, 0.12))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '20px'
                  }}
                >
                  <BookOpen size={36} color="var(--primary, #3b82f6)" />
                </div>



                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0, lineHeight: '1.5' }}>
                  Altas y modificaciones de cursos
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
                Ingresar a Cursos <ChevronRight size={18} />
              </button>
            </div>

            {/* Cajita 2: FECHAS */}
            <div
              className="details-box"
              onClick={() => setSubTab('fechas')}
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
                e.currentTarget.style.borderColor = '#10b981';
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.15)';
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
                    background: 'rgba(16, 185, 129, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '20px'
                  }}
                >
                  <Calendar size={36} color="#10b981" />
                </div>

                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0, lineHeight: '1.5' }}>
                  Asignación de fechas de los cursos
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
                  backgroundColor: '#10b981',
                  borderColor: '#10b981',
                  margin: 0
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
