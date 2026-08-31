import React, { useState } from 'react';
import { PersonalTab } from './PersonalTab';
import { UsersTab } from './UsersTab';
import { Users, UserCog, ArrowLeft, ChevronRight } from 'lucide-react';

export const PersonalAndUsersTab: React.FC = () => {
  const [subTab, setSubTab] = useState<'inicio' | 'personal' | 'usuarios'>('inicio');

  return (
    <div className="alumnos-institucional">
      {subTab !== 'inicio' ? (
        <div style={{ marginBottom: '24px' }}>
          {/* Cabecera cuando se selecciona una opción */}
          <div
            className="caja-titulo-principal"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
              flexWrap: 'wrap',
              gap: '12px',
              padding: '14px 20px',
              borderRadius: '12px'
            }}
          >
            <h2 className="section-title" style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {subTab === 'personal' ? (
                <>
                  <Users size={22} color="currentColor" /> Asistencia y Licencias del Personal
                </>
              ) : (
                <>
                  <UserCog size={22} color="currentColor" /> Gestión de Usuarios y Accesos
                </>
              )}
            </h2>

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

          {subTab === 'personal' ? (
            <PersonalTab />
          ) : (
            <UsersTab />
          )}
        </div>
      ) : (
        /* Vista de inicio — caja igual que Alumnos (azul en modo oscuro) */
        <div className="caja-titulo-principal">
          <h2 className="section-title" style={{ marginBottom: '16px' }}>
            <Users size={24} color="currentColor" /> Personal y Usuarios
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
            {/* Cajita 1: Personal */}
            <div
              className="details-box"
              onClick={() => setSubTab('personal')}
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
                  <Users size={36} color="#003876" />
                </div>

                <p style={{ color: '#1e3350', fontSize: '0.95rem', margin: 0, lineHeight: '1.5', fontWeight: 200, textAlign: 'left', flex: 1 }}>
                  Planillas de asistencia y registro de licencias
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
                Ingresar a Personal <ChevronRight size={18} />
              </button>
            </div>

            {/* Cajita 2: Usuarios */}
            <div
              className="details-box"
              onClick={() => setSubTab('usuarios')}
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
                  <UserCog size={36} color="#003876" />
                </div>

                <p style={{ color: '#1e3350', fontSize: '0.95rem', margin: 0, lineHeight: '1.5', fontWeight: 200, textAlign: 'left', flex: 1 }}>
                  Gestión de usuarios del sistema
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
                Ingresar a Usuarios <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
