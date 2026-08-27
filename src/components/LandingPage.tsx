import React, { useState, useEffect } from 'react';
import { getDocs, collection, query, where, doc, getDoc, setDoc, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { logAudit } from '../utils/audit';
import { formatDateAR } from '../utils/dateAR';
import { SOCIAL } from '../config/social';
import logoImg from '../img/logoCentro.png';
import { GraduationCap, Calendar, Clock, MapPin, LogIn, X, Search, UserPlus, CheckSquare, ChevronRight, Star, BookOpen, FileText, Sun, Moon, MessageCircle, UserSearch, Megaphone, FolderOpen } from 'lucide-react';
import { useModal } from './ModalProvider';
import { toTitleCase } from '../utils/text';

const FacebookIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047v-2.66c0-3.026 1.792-4.697 4.533-4.697 1.312 0 2.686.235 2.686.235v2.971H15.83c-1.491 0-1.956.93-1.956 1.886v2.265h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
  </svg>
);

const InstagramIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

interface LandingPageProps {
  cursos: any[];
  fechas: any[];
  onLoginClick: () => void;
  backLabel?: string;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

const ESTUDIOS = ['Sin dato', 'Primario completo', 'Primario incompleto', 'Secundario completo', 'Secundario incompleto', 'Terciario completo', 'Terciario incompleto', 'Universitario completo', 'Universitario incompleto'];
const CARGOS = ['', 'Administrativo/a', 'Docente', 'JTP/Aux. Docente', 'Técnicos/Profesional', 'Mantenimiento', 'Producción', 'Servicios Grales.'];
const MEDIOS_OPTS = [
  { key: 'web_unt', label: 'Sitio web de la UNT' },
  { key: 'companero', label: 'Compañero de trabajo' },
  { key: 'nota_invitacion', label: 'Nota de invitación' },
  { key: 'web_centro', label: 'Sitio web del Centro' },
  { key: 'email', label: 'Email' },
];

export const LandingPage: React.FC<LandingPageProps> = ({ cursos, fechas, onLoginClick, backLabel, theme = 'dark', onToggleTheme }) => {
  const { alert } = useModal();
  const [showModal, setShowModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Form state
  const [dni, setDni] = useState('');
  const [apellido, setApellido] = useState('');
  const [nombre, setNombre] = useState('');
  const [fechaNac, setFechaNac] = useState('');
  const [telPart, setTelPart] = useState('');
  const [email, setEmail] = useState('');
  const [nivelEstudio, setNivelEstudio] = useState('Sin dato');
  const [titulo, setTitulo] = useState('');
  const [unidadAcademica, setUnidadAcademica] = useState('');
  const [area, setArea] = useState('');
  const [cargoFuncion, setCargoFuncion] = useState('');
  const [personas, setPersonas] = useState(0);
  const [telLab, setTelLab] = useState('');
  const [interno, setInterno] = useState('');
  const [medios, setMedios] = useState<string[]>([]);
  const [cursoId, setCursoId] = useState('');
  const [fechaId, setFechaId] = useState('');
  const [cursoFilter, setCursoFilter] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [dniEncontrado, setDniEncontrado] = useState(false);

  // Consulta pública de alumnos
  const [showConsulta, setShowConsulta] = useState(false);
  const [consultaDni, setConsultaDni] = useState('');
  const [consultaAlumno, setConsultaAlumno] = useState<any>(null);
  const [consultaHistorial, setConsultaHistorial] = useState<any[]>([]);
  const [consultaLoading, setConsultaLoading] = useState(false);

  // Noticias de la página principal
  const [noticias, setNoticias] = useState<{ titulo: string; texto: string; imagenUrl?: string }[]>([]);

  const fechasMap = new Map<string, any[]>();
  fechas.forEach(f => {
    if (f.showOnLanding === false) return;
    const key = String(f.idCurso);
    if (!fechasMap.has(key)) fechasMap.set(key, []);
    fechasMap.get(key)!.push(f);
  });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [doc1, doc2] = await Promise.all([
          getDoc(doc(db, 'noticias', '1')),
          getDoc(doc(db, 'noticias', '2'))
        ]);
        if (!active) return;
        const list = [doc1, doc2].map(d => ({
          titulo: d.data()?.titulo || '',
          texto: d.data()?.texto || '',
          imagenUrl: d.data()?.imagenUrl || ''
        }));
        if (list.some(n => n.titulo || n.texto || n.imagenUrl)) setNoticias(list);
      } catch (err) {
        console.error('Error cargando noticias:', err);
      }
    })();
    return () => { active = false; };
  }, []);

  const handleConsulta = async () => {
    if (!consultaDni.trim()) return;
    setConsultaLoading(true);
    setConsultaAlumno(null);
    setConsultaHistorial([]);
    try {
      const alumnoRef = doc(db, 'alumnos', consultaDni.trim());
      const [alumnoSnap, snapInsc] = await Promise.all([
        getDoc(alumnoRef),
        getDocs(query(collection(db, 'inscripciones'), where('dni', '==', Number(consultaDni))))
      ]);
      if (alumnoSnap.exists()) setConsultaAlumno(alumnoSnap.data());
      const cursosList = cursos;
      const fechasList = fechas;
      const fullHistory = snapInsc.docs.map(d => {
        const insc = d.data();
        const cursoObj = cursosList.find(c => c.curso === insc.curso);
        const fechaObj = fechasList.find(f => f.curso === insc.curso && f.inicio === insc.fechaInicio);
        return {
          ...insc,
          resolucion: cursoObj?.resolucion || 'Sin dato',
          certificado: fechaObj?.certificado || '—'
        };
      });
      setConsultaHistorial(fullHistory);
    } catch (err) {
      console.error(err);
      await alert({ title: 'Error', message: 'No se pudo consultar el historial del alumno. Intente nuevamente.', variant: 'danger' });
    } finally {
      setConsultaLoading(false);
    }
  };

  const cursosConFechas = cursos.filter(c => fechasMap.has(String(c.idCurso)));

  const resetForm = () => {
    setDni('');
    setApellido('');
    setNombre('');
    setFechaNac('');
    setTelPart('');
    setEmail('');
    setNivelEstudio('Sin dato');
    setTitulo('');
    setUnidadAcademica('');
    setArea('');
    setCargoFuncion('');
    setPersonas(0);
    setTelLab('');
    setInterno('');
    setMedios([]);
    setCursoId('');
    setFechaId('');
    setBuscando(false);
    setDniEncontrado(false);
  };

  const openEnrollment = (course?: any) => {
    resetForm();
    if (course) {
      setCursoId(String(course.idCurso));
      setSelectedCourse(course);
    }
    setSuccessMsg('');
    setShowModal(true);
  };

  const handleBuscarDni = async () => {
    if (!dni.trim()) return;
    setBuscando(true);
    try {
      const docRef = doc(db, 'alumnos', dni.trim());
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        setApellido(data.apellido || '');
        setNombre(data.nombre || '');
        setFechaNac(data.fechaNac || '');
        setTelPart(data.telPart || '');
        setEmail(data.email || '');
        setNivelEstudio(data.nivelEstudio || 'Sin dato');
        setTitulo(data.titulo || '');
        setUnidadAcademica(data.unidadAcademica || '');
        setArea(data.area || '');
        setCargoFuncion(data.cargoFuncion || '');
        setPersonas(data.personas || 0);
        setTelLab(data.telLab || '');
        setInterno(data.interno || '');
        setMedios(data.medios || []);
        setDniEncontrado(true);
      } else {
        setDniEncontrado(false);
      }
    } catch (err) {
      console.error(err);
      setDniEncontrado(false);
    }
    setBuscando(false);
  };

  const handleMedioToggle = (key: string) => {
    setMedios(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const handleCursoChange = (val: string) => {
    setCursoId(val);
    setFechaId('');
    setSelectedCourse(cursos.find(c => String(c.idCurso) === val));
  };

  const handleSubmit = async () => {
    const missing: string[] = [];
    if (!dni.trim()) missing.push('DNI');
    if (!apellido.trim()) missing.push('Apellido');
    if (!nombre.trim()) missing.push('Nombre');
    if (!fechaNac) missing.push('Fecha de Nacimiento');
    if (!telPart.trim()) missing.push('Celular');
    if (!email.trim()) missing.push('Email');
    if (!unidadAcademica.trim()) missing.push('Secr. de Rectorado/Unidad Académica');
    if (!area.trim()) missing.push('Área');
    if (!cargoFuncion) missing.push('Cargo / Función');
    if (!telLab.trim()) missing.push('Teléfono Laboral');
    if (!interno.trim()) missing.push('Interno');
    if (!cursoId) missing.push('Curso');
    if (!fechaId) missing.push('Fecha de Inicio');

    if (missing.length > 0) {
      await alert({ title: 'Campos incompletos', message: `Complete los campos obligatorios: ${missing.join(', ')}.`, variant: 'warning' });
      return;
    }

    setEnviando(true);
    try {
      const courseObj = cursos.find(c => String(c.idCurso) === cursoId);
      const fechaObj = fechas.find(f => String(f.idCurso) === cursoId && f.inicio === fechaId);

      const inscripcionData: any = {
        dni: Number(dni),
        apellido: toTitleCase(apellido),
        nombre: toTitleCase(nombre),
        curso: courseObj?.curso || '',
        fechaInicio: fechaId,
        resultado: 'Cursando',
        email: email.toLowerCase() || '',
        cargoFuncion: cargoFuncion || '',
        unidadAcademica: unidadAcademica || '',
        ua: courseObj?.idCurso || '',
        idCurso: courseObj?.idCurso || 0,
        createdAt: new Date().toISOString(),
        telPart: telPart || '',
        fechaNac: fechaNac || '',
        nivelEstudio: nivelEstudio || '',
        titulo: titulo || '',
        area: area || '',
        personas: personas || 0,
        telLab: telLab || '',
        interno: interno || '',
        medios: medios || [],
      };

      try {
        await addDoc(collection(db, 'inscripciones'), inscripcionData);
        await logAudit('Inscripción web', `${inscripcionData.apellido}, ${inscripcionData.nombre} — ${inscripcionData.curso} (${inscripcionData.fechaInicio})`);

        const alumnoRef = doc(db, 'alumnos', dni.trim());
        const alumnoSnap = await getDoc(alumnoRef);
        const alumnoData: any = {
          dni: Number(dni),
          apellido: toTitleCase(apellido),
          nombre: toTitleCase(nombre),
          fechaNac: fechaNac || '',
          telPart: telPart || '',
          nivelEstudio: nivelEstudio || '',
          titulo: titulo || '',
          unidadAcademica: unidadAcademica || '',
          area: area || '',
          cargoFuncion: cargoFuncion || '',
          personas: personas || 0,
          email: email.toLowerCase() || '',
          telLab: telLab || '',
          interno: interno || '',
          medios: medios || [],
        };
        if (alumnoSnap.exists()) {
          await setDoc(alumnoRef, alumnoData, { merge: true });
        } else {
          await setDoc(alumnoRef, alumnoData);
        }
      } catch (dbErr) {
        console.warn('Firestore writing failed. Simulating local storage for demo:', dbErr);
        // Fallback local memory storage for the session
        try {
          const localInsc = JSON.parse(sessionStorage.getItem('local_inscripciones') || '[]');
          localInsc.push(inscripcionData);
          sessionStorage.setItem('local_inscripciones', JSON.stringify(localInsc));
        } catch (e) {
          console.error('Failed to write to sessionStorage:', e);
        }
      }

      setSuccessMsg('¡Inscripción exitosa! Ya quedó registrado en el curso.');
      resetForm();
    } catch (err) {
      console.error(err);
      await alert({ title: 'Error', message: 'No se pudo procesar la inscripción. Intente nuevamente.', variant: 'danger' });
    }
    setEnviando(false);
  };

  const fechasDelCurso = fechasMap.get(cursoId) || [];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header className="app-header">
        <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <img src={logoImg} alt="SIGA Logo" style={{ height: '66px', background: '#ffffff', padding: '3px 7px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)', objectFit: 'contain' }} />
          <h1 style={{
            margin: 0, fontSize: '1.4rem', fontFamily: 'var(--font-display)', color: '#ffffff', fontWeight: 700
          }}>SIGA 2026</h1>
        </div>
        {onToggleTheme && (
          <button onClick={onToggleTheme} aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'} title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px',
            background: 'rgba(37, 154, 214, 0.18)', border: '1px solid rgba(37, 154, 214, 0.4)',
            borderRadius: '8px', color: '#D9ECFA', cursor: 'pointer', transition: '0.2s', flexShrink: 0,
          }}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        )}
        <button onClick={onLoginClick} style={{
          display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
          background: 'rgba(37, 154, 214, 0.2)', border: '1px solid rgba(37, 154, 214, 0.5)',
          borderRadius: '8px', color: '#ffffff', cursor: 'pointer', fontWeight: 600,
          fontSize: '0.9rem', transition: '0.2s',
        }}>
          <LogIn size={16} /> {backLabel || 'Iniciar Sesión'}
        </button>
      </header>

      {/* Hero */}
      <section style={{
        textAlign: 'center', padding: '60px clamp(20px, 5vw, 80px) 50px',
        background: 'var(--bg-card)',
      }}>
        <GraduationCap size={48} color="var(--accent)" style={{ marginBottom: '16px' }} />
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
          fontWeight: 800, margin: '0 0 12px', color: 'var(--text-primary)',
        }}>
          Centro de Capacitación
        </h1>
        <p style={{ fontSize: '1 rem', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 32px', lineHeight: 1.6 }}>
          Promovemos la formación continua, la innovación y el desarrollo profesional del personal docente y nodocente de la Universidad Nacional de Tucumán a través de capacitaciones adaptadas a las exigencias del entorno universitario.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap', marginBottom: '24px' }}>
          <button onClick={() => openEnrollment()} style={{
            display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '16px 36px',
            background: 'var(--primary)',
            border: 'none', borderRadius: '12px', color: '#fff', cursor: 'pointer',
            fontWeight: 700, fontSize: '1.1rem',
            transition: '0.2s',
          }}>
            <UserPlus size={20} /> Inscribirme <ChevronRight size={18} />
          </button>
          <button onClick={() => setShowConsulta(true)} style={{
            display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '16px 36px',
            background: 'rgba(37,154,214,0.12)', border: '1px solid var(--accent)',
            borderRadius: '12px', color: 'var(--accent)', cursor: 'pointer',
            fontWeight: 700, fontSize: '1.1rem', transition: '0.2s',
          }}>
            <UserSearch size={20} /> Mis Capacitaciones
          </button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <a href={SOCIAL.whatsapp} target="_blank" rel="noopener noreferrer" style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px',
            background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)',
            borderRadius: '10px', color: 'var(--success)', textDecoration: 'none',
            fontWeight: 600, fontSize: '0.9rem', transition: '0.2s',
          }}>
            <MessageCircle size={18} /> WhatsApp
          </a>
          <a href={SOCIAL.instagram} target="_blank" rel="noopener noreferrer" style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px',
            background: 'rgba(37,154,214,0.12)', border: '1px solid var(--accent)',
            borderRadius: '10px', color: 'var(--accent)', textDecoration: 'none',
            fontWeight: 600, fontSize: '0.9rem', transition: '0.2s',
          }}>
            <InstagramIcon size={18} /> Instagram
          </a>
          {SOCIAL.facebook && (
            <a href={SOCIAL.facebook} target="_blank" rel="noopener noreferrer" style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px',
              background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.4)',
              borderRadius: '10px', color: '#60A5FA', textDecoration: 'none',
              fontWeight: 600, fontSize: '0.9rem', transition: '0.2s',
            }}>
              <FacebookIcon size={18} /> Facebook
            </a>
          )}
        </div>
      </section>

      {/* Main Content Side-by-Side */}
      <div className="landing-content-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '40px',
        padding: '40px clamp(12px, 3vw, 40px) 60px',
        flex: 1
      }}>
        {/* Left Column: Cursos vigentes */}
        <section style={{ display: 'flex', flexDirection: 'column' }}>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 700,
            margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: '10px',
            color: 'var(--text-primary)'
          }}>
            <BookOpen size={24} color="var(--accent)" /> Cursos vigentes
          </h2>

          {cursosConFechas.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '60px 20px',
              background: 'var(--bg-card)', borderRadius: '16px',
              border: '1px solid var(--border-card)',
            }}>
              <Calendar size={48} color="var(--text-muted)" style={{ marginBottom: '16px' }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>No hay cursos disponibles en este momento.</p>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}>
              {cursosConFechas.map(c => {
                const fs = fechasMap.get(String(c.idCurso)) || [];
                return (
                  <div key={c.idCurso} style={{
                    background: 'var(--bg-card)', borderRadius: '14px',
                    border: '1px solid var(--border-card)', padding: '24px',
                    transition: '0.2s', cursor: 'pointer',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-card)'; e.currentTarget.style.transform = 'none'; }}
                    onClick={() => openEnrollment(c)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                      <Star size={18} color="var(--warning)" />
                      <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>{c.curso}</h3>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                      {c.programa && <span>{c.programa}</span>}
                      {c.cargaHoraria && <span>• Cantidad de clases: {c.cargaHoraria}</span>}
                      {fs.length > 0 && (
                        <span>
                          • Fecha Inicio {fs.length > 1 ? 's' : ''}: {fs.map(f => formatDateAR(f.inicio)).join(', ')}
                        </span>
                      )}
                      {c.docenteNombre && <span>• Docente: {c.docenteNombre}</span>}
                    </div>
                    {c.plan && (
                      <a
                        href={c.plan}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={c.planName || 'Plan_del_Curso.pdf'}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '0.8rem',
                          color: 'var(--success)',
                          textDecoration: 'none',
                          fontWeight: 600,
                          marginBottom: '14px'
                        }}
                        title="Ver o descargar el programa en PDF"
                      >
                        <FileText size={14} /> Ver Programa (PDF)
                      </a>
                    )}
                    <button style={{
                      width: '100%', padding: '10px', borderRadius: '8px',
                      border: '1px solid var(--accent)', background: 'rgba(37,154,214,0.1)',
                      color: 'var(--accent)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                      transition: '0.2s',
                    }}
                      onClick={(e) => { e.stopPropagation(); openEnrollment(c); }}
                    >
                      Inscribirse
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Right Column: Noticias */}
        {noticias.length > 0 && (
          <section style={{ display: 'flex', flexDirection: 'column' }}>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 700,
              margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: '10px',
              color: 'var(--text-primary)'
            }}>
              <Megaphone size={22} color="var(--accent)" /> Noticias
            </h2>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}>
              {noticias.map((n, i) => n.titulo || n.texto || n.imagenUrl ? (
                <div key={i} style={{
                  background: 'var(--bg-card)', borderRadius: '14px',
                  border: '1px solid var(--border-card)', padding: '24px',
                  overflow: 'hidden'
                }}>
                  {n.imagenUrl && (
                    <img
                      src={n.imagenUrl}
                      alt={n.titulo || `Noticia ${i + 1}`}
                      style={{
                        width: '100%',
                        maxHeight: '220px',
                        objectFit: 'cover',
                        borderRadius: '10px',
                        marginBottom: '14px',
                        display: 'block'
                      }}
                    />
                  )}
                  {n.titulo && (
                    <h3 style={{ margin: '0 0 10px', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {n.titulo}
                    </h3>
                  )}
                  {n.texto && (
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5 }}>
                      {n.texto}
                    </p>
                  )}
                </div>
              ) : null)}
            </div>
          </section>
        )}
      </div>

      {/* Footer */}
      <footer style={{
        textAlign: 'center', padding: '20px', borderTop: '1px solid var(--border-card)',
        color: 'var(--text-muted)', fontSize: '0.8rem',
      }}>
        Centro de Capacitación
      </footer>

      {/* Consulta de Capacitaciones Modal */}
      {showConsulta && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000, padding: '20px',
          backdropFilter: 'blur(4px)',
        }} onClick={() => setShowConsulta(false)}>
          <div style={{
            background: 'var(--bg-card)', borderRadius: '16px',
            border: '1px solid var(--border-card)', maxWidth: '760px',
            width: '100%', maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '20px 24px', borderBottom: '1px solid var(--border-card)',
            }}>
              <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.3rem' }}>
                <FolderOpen size={20} style={{ verticalAlign: 'middle', marginRight: '8px', color: 'var(--accent)' }} />
                Consultá tus Capacitaciones
              </h2>
              <button onClick={() => setShowConsulta(false)} style={{
                background: 'none', border: 'none', color: 'var(--text-muted)',
                cursor: 'pointer', padding: '4px',
              }}><X size={20} /></button>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <div style={{
                display: 'flex', gap: '10px', marginBottom: '20px',
                padding: '16px', background: 'var(--surface-bg)', borderRadius: '10px',
                border: '1px solid var(--border-card)',
              }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>
                    DNI *
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input type="number" className="form-control" placeholder="Ingrese su DNI"
                      value={consultaDni} onChange={e => setConsultaDni(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleConsulta(); }}
                      style={{ flex: 1, fontSize: '0.9rem' }} />
                    <button onClick={handleConsulta} disabled={consultaLoading || !consultaDni.trim()} style={{
                      display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
                      background: 'rgba(37,154,214,0.15)', border: '1px solid rgba(37,154,214,0.3)',
                      borderRadius: '8px', color: 'var(--accent)', cursor: 'pointer', fontWeight: 600,
                      fontSize: '0.85rem', whiteSpace: 'nowrap',
                    }}>
                      <Search size={14} /> {consultaLoading ? 'Buscando...' : 'Buscar'}
                    </button>
                  </div>
                </div>
              </div>

              {consultaLoading && <div className="spinner"></div>}

              {consultaAlumno && (
                <div style={{
                  padding: '14px 16px', marginBottom: '16px',
                  background: 'var(--surface-bg)', borderRadius: '10px',
                  border: '1px solid var(--border-card)',
                }}>
                  <strong style={{ fontSize: '1rem' }}>
                    {consultaAlumno.apellido}, {consultaAlumno.nombre}
                  </strong>
                  <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    DNI: {consultaAlumno.dni}
                    {consultaAlumno.email ? ` | Email: ${consultaAlumno.email}` : ''}
                    {consultaAlumno.unidadAcademica ? ` | Dependencia: ${consultaAlumno.unidadAcademica}` : ''}
                  </p>
                </div>
              )}

              {consultaHistorial.length > 0 && (
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
                      {consultaHistorial.map((item, i) => (
                        <tr key={i}>
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

              {!consultaLoading && consultaDni && !consultaAlumno && consultaHistorial.length === 0 && (
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '10px' }}>
                  No se encontraron capacitaciones registradas para ese DNI.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Enrollment Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000, padding: '20px',
          backdropFilter: 'blur(4px)',
        }} onClick={() => { if (!enviando) setShowModal(false); }}>
          <div style={{
            background: 'var(--bg-card)', borderRadius: '16px',
            border: '1px solid var(--border-card)', maxWidth: '700px',
            width: '100%', maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
          }} onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '20px 24px', borderBottom: '1px solid var(--border-card)',
            }}>
              <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.3rem' }}>
                {successMsg ? '¡Inscripción Exitosa!' : 'Formulario de Inscripción'}
              </h2>
              <button onClick={() => setShowModal(false)} style={{
                background: 'none', border: 'none', color: 'var(--text-muted)',
                cursor: 'pointer', padding: '4px',
              }}><X size={20} /></button>
            </div>

            {successMsg ? (
              <div style={{ padding: '40px 24px', textAlign: 'center' }}>
                <CheckSquare size={48} color="var(--success)" style={{ marginBottom: '16px' }} />
                <p style={{ fontSize: '1.1rem', color: 'var(--success)', fontWeight: 600, marginBottom: '12px' }}>{successMsg}</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>
                  En breve recibirá más información sobre el curso.
                </p>
                <button onClick={() => { setShowModal(false); setSuccessMsg(''); }} style={{
                  padding: '12px 28px', borderRadius: '8px', border: '1px solid var(--accent)',
                  background: 'rgba(37,154,214,0.1)', color: 'var(--accent)', cursor: 'pointer', fontWeight: 600,
                }}>
                  Cerrar
                </button>
              </div>
            ) : (
              <div style={{ padding: '20px 24px' }}>
                {/* DNI + Search */}
                <div style={{
                  display: 'flex', gap: '10px', marginBottom: '20px',
                  padding: '16px', background: 'var(--surface-bg)', borderRadius: '10px',
                  border: '1px solid var(--border-card)',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'nowrap' }}>
                      <label style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        DNI <span style={{ color: 'var(--danger, #EF4444)', fontWeight: 700 }}>*</span>
                      </label>
                      <input type="number" className="form-control" placeholder="Ingrese su DNI"
                        value={dni} onChange={e => setDni(e.target.value)}
                        style={{ flex: 1, fontSize: '0.9rem', height: '38px' }} />
                      <button onClick={handleBuscarDni} disabled={buscando || !dni.trim()} style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '0 16px', height: '38px',
                        background: 'rgba(37,154,214,0.15)', border: '1px solid rgba(37,154,214,0.3)',
                        borderRadius: '8px', color: 'var(--accent)', cursor: 'pointer', fontWeight: 600,
                        fontSize: '0.85rem', whiteSpace: 'nowrap', flexShrink: 0,
                      }}>
                        <Search size={14} /> {buscando ? 'Buscando...' : 'Buscar'}
                      </button>
                    </div>
                    {dniEncontrado && (
                      <p style={{ fontSize: '0.8rem', color: 'var(--success)', marginTop: '6px', marginBottom: 0 }}>
                        Datos encontrados. Puede modificar si es necesario.
                      </p>
                    )}
                  </div>
                </div>

                {/* Personal Data */}
                <h4 style={{ color: 'var(--accent)', fontSize: '0.9rem', marginBottom: '12px', fontWeight: 600 }}>
                  Datos Personales
                </h4>
                <div className="form-grid-2col">
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Apellido <span style={{ color: 'var(--danger, #EF4444)', fontWeight: 700 }}>*</span></label>
                    <input type="text" className="form-control" value={apellido} onChange={e => setApellido(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Nombre <span style={{ color: 'var(--danger, #EF4444)', fontWeight: 700 }}>*</span></label>
                    <input type="text" className="form-control" value={nombre} onChange={e => setNombre(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Fecha de Nacimiento <span style={{ color: 'var(--danger, #EF4444)', fontWeight: 700 }}>*</span></label>
                    <input type="date" className="form-control" value={fechaNac} onChange={e => setFechaNac(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Celular <span style={{ color: 'var(--danger, #EF4444)', fontWeight: 700 }}>*</span></label>
                    <input type="text" className="form-control" value={telPart} onChange={e => setTelPart(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Email <span style={{ color: 'var(--danger, #EF4444)', fontWeight: 700 }}>*</span></label>
                    <input type="email" className="form-control" value={email} onChange={e => setEmail(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Nivel de Estudio <span style={{ color: 'var(--danger, #EF4444)', fontWeight: 700 }}>*</span></label>
                    <select className="form-control" value={nivelEstudio} onChange={e => setNivelEstudio(e.target.value)}>
                      {ESTUDIOS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Título</label>
                    <input type="text" className="form-control" value={titulo} onChange={e => setTitulo(e.target.value)} />
                  </div>
                </div>

                {/* Work Data */}
                <h4 style={{ color: 'var(--accent)', fontSize: '0.9rem', marginBottom: '12px', fontWeight: 600 }}>
                  Datos Laborales
                </h4>
                <div className="form-grid-2col">
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Secr. de Rectorado/Unidad Académica <span style={{ color: 'var(--danger, #EF4444)', fontWeight: 700 }}>*</span></label>
                    <input type="text" className="form-control" value={unidadAcademica} onChange={e => setUnidadAcademica(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Área <span style={{ color: 'var(--danger, #EF4444)', fontWeight: 700 }}>*</span></label>
                    <input type="text" className="form-control" value={area} onChange={e => setArea(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Cargo / Función <span style={{ color: 'var(--danger, #EF4444)', fontWeight: 700 }}>*</span></label>
                    <select className="form-control" value={cargoFuncion} onChange={e => setCargoFuncion(e.target.value)}>
                      {CARGOS.map(c => <option key={c} value={c}>{c || '-- Sin cargo --'}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Personas a Cargo</label>
                    <input type="number" className="form-control" value={personas} onChange={e => setPersonas(Number(e.target.value))} min={0} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Teléfono Laboral <span style={{ color: 'var(--danger, #EF4444)', fontWeight: 700 }}>*</span></label>
                    <input type="text" className="form-control" value={telLab} onChange={e => setTelLab(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Interno <span style={{ color: 'var(--danger, #EF4444)', fontWeight: 700 }}>*</span></label>
                    <input type="text" className="form-control" value={interno} onChange={e => setInterno(e.target.value)} />
                  </div>
                </div>

                {/* Medios - Oculto temporalmente (comentado) */}
                {/*
                <h4 style={{ color: 'var(--accent)', fontSize: '0.9rem', marginBottom: '12px', fontWeight: 600 }}>
                  ¿Cómo se enteró del curso?
                </h4>
                <div className="form-grid-3col">
                  {MEDIOS_OPTS.map(m => (
                    <label key={m.key} style={{
                      display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px',
                      background: medios.includes(m.key) ? 'rgba(37,154,214,0.1)' : 'var(--surface-bg)',
                      border: `1px solid ${medios.includes(m.key) ? 'rgba(37,154,214,0.3)' : 'var(--border-card)'}`,
                      borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: medios.includes(m.key) ? 600 : 400,
                      transition: '0.15s',
                    }}>
                      <input type="checkbox" checked={medios.includes(m.key)}
                        onChange={() => handleMedioToggle(m.key)}
                        style={{ accentColor: 'var(--accent)' }} />
                      {m.label}
                    </label>
                  ))}
                </div>
                */}

                {/* Course Selection */}
                <h4 style={{ color: 'var(--accent)', fontSize: '0.9rem', marginBottom: '12px', fontWeight: 600 }}>
                  Curso / Taller en el cual se inscribe
                </h4>
                {(() => {
                  const programas = [...new Set(cursosConFechas.map(c => c.programa?.trim() || 'Otros'))].sort();
                  const cursosFiltrados = cursoFilter === 'Todos' || !cursoFilter
                    ? cursosConFechas
                    : cursosConFechas.filter(c => (c.programa?.trim() || 'Otros') === cursoFilter);
                  return (
                    <div className="form-grid-2col" style={{ marginBottom: '24px' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label>Programa</label>
                        <select className="form-control" value={cursoFilter} onChange={e => { setCursoFilter(e.target.value); setCursoId(''); setFechaId(''); }}>
                          <option value="">-- Todos los programas --</option>
                          {programas.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label>Seleccionar Curso <span style={{ color: 'var(--danger, #EF4444)', fontWeight: 700 }}>*</span></label>
                        <select className="form-control" value={cursoId} onChange={e => handleCursoChange(e.target.value)}>
                          <option value="">-- Seleccione un Curso --</option>
                          {cursosFiltrados.map(c => (
                            <option key={c.idCurso} value={String(c.idCurso)}>{c.curso}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label>Fecha de Inicio <span style={{ color: 'var(--danger, #EF4444)', fontWeight: 700 }}>*</span></label>
                        <select className="form-control" value={fechaId} onChange={e => setFechaId(e.target.value)} disabled={!cursoId}>
                          <option value="">-- Seleccione Fecha --</option>
                          {fechasDelCurso.map((f, i) => (
                            <option key={i} value={f.inicio}>{formatDateAR(f.inicio)}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })()}

                {/* Submit */}
                <button onClick={handleSubmit} disabled={enviando} style={{
                  width: '100%', padding: '14px', borderRadius: '10px',
                  border: 'none', background: 'var(--primary)',
                  color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '1rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  opacity: enviando ? 0.6 : 1,
                }}>
                  {enviando ? 'Procesando...' : <><CheckSquare size={18} /> Confirmar Inscripción</>}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
