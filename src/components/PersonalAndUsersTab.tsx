import React, { useState } from 'react';
import { PersonalTab } from './PersonalTab';
import { UsersTab } from './UsersTab';
import { Users, UserCog, ArrowLeft, ChevronRight } from 'lucide-react';

export const PersonalAndUsersTab: React.FC = () => {
  const [subTab, setSubTab] = useState<'inicio' | 'personal' | 'usuarios'>('inicio');

  return (
    <div>
      {subTab !== 'inicio' ? (
        <div style={{ marginBottom: '24px' }}>
          {/* Cabecera cuando se selecciona una opción */}
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
            <h2 className="section-title" style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {subTab === 'personal' ? (
                <>
                  <Users size={22} color="var(--primary)" /> Asistencia y Licencias del Personal
                </>
              ) : (
                <>
                  <UserCog size={22} color="#8B5CF6" /> Gestión de Usuarios y Accesos
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
        /* Vista de inicio con 2 cajitas de igual tamaño para Personal y Usuarios */
        <div style={{ padding: '10px 0' }}>
          <h2 className="section-title" style={{ marginBottom: '8px' }}>
            <Users size={24} /> Personal y Usuarios
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
            {/* Cajita 1: Personal */}
            <div
              className="details-box"
              onClick={() => setSubTab('personal')}
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
                  <Users size={36} color="var(--primary, #3b82f6)" />
                </div>

                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0, lineHeight: '1.5' }}>
                  Planillas de asistencia y registro de licencias
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
                Ingresar a Personal <ChevronRight size={18} />
              </button>
            </div>

            {/* Cajita 2: Usuarios */}
            <div
              className="details-box"
              onClick={() => setSubTab('usuarios')}
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
                e.currentTarget.style.borderColor = '#8B5CF6';
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
                    background: 'rgba(139, 92, 246, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '20px'
                  }}
                >
                  <UserCog size={36} color="#8B5CF6" />
                </div>


                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0, lineHeight: '1.5' }}>
                  Gestión de usuarios del sistema
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
                  backgroundColor: '#8B5CF6',
                  borderColor: '#8B5CF6',
                  margin: 0
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
