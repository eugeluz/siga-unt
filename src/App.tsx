import { useState, useEffect, lazy, Suspense } from 'react';
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import {
  collection,
  onSnapshot,
  getDocs,
  doc,
  getDoc,
  query,
  limit
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { LandingPage } from './components/LandingPage';

function onSnapshotError(err: unknown) {
  console.error('Firestore listener error:', err);
}

// Lazy load subcomponents to optimize initial bundle size and application startup
const DashboardHome = lazy(() => import('./components/DashboardHome').then(m => ({ default: m.DashboardHome })));
const StudentManagement = lazy(() => import('./components/StudentManagement').then(m => ({ default: m.StudentManagement })));
const EnrollmentTab = lazy(() => import('./components/EnrollmentTab').then(m => ({ default: m.EnrollmentTab })));
const AttendanceTab = lazy(() => import('./components/AttendanceTab').then(m => ({ default: m.AttendanceTab })));
const StudentHistoryTab = lazy(() => import('./components/StudentHistoryTab').then(m => ({ default: m.StudentHistoryTab })));
const FacultiesTab = lazy(() => import('./components/FacultiesTab').then(m => ({ default: m.FacultiesTab })));
const ReportsTab = lazy(() => import('./components/ReportsTab').then(m => ({ default: m.ReportsTab })));
const CoursesTab = lazy(() => import('./components/CoursesTab').then(m => ({ default: m.CoursesTab })));
const CoursesAndDatesTab = lazy(() => import('./components/CoursesAndDatesTab').then(m => ({ default: m.CoursesAndDatesTab })));
const NewsTab = lazy(() => import('./components/NewsTab').then(m => ({ default: m.NewsTab })));
const PersonalTab = lazy(() => import('./components/PersonalTab').then(m => ({ default: m.PersonalTab })));
const PersonalAndUsersTab = lazy(() => import('./components/PersonalAndUsersTab').then(m => ({ default: m.PersonalAndUsersTab })));
const DatesTab = lazy(() => import('./components/DatesTab').then(m => ({ default: m.DatesTab })));
const UsersTab = lazy(() => import('./components/UsersTab').then(m => ({ default: m.UsersTab })));
const ConfigTab = lazy(() => import('./components/ConfigTab').then(m => ({ default: m.ConfigTab })));
import { Home, Users, UserPlus, ClipboardCheck, History, Building2, BookOpen, LogOut, Key, Calendar, X, Sun, Moon, UserCog, Megaphone, FileText, Settings } from 'lucide-react';
import logoImg from './img/logoCentro.png';

type Theme = 'dark' | 'light';

function getInitialTheme(): Theme {
  const saved = localStorage.getItem('siga-theme');
  if (saved === 'dark' || saved === 'light') return saved;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

const MOCK_CURSOS: any[] = [];
const MOCK_FECHAS: any[] = [];

const MOCK_DOCENTES = [
  { idDocente: 1, apellido: 'PEREZ', nombre: 'JUAN', email: 'juanperez@unt.edu.ar', celular: '154123456' },
  { idDocente: 2, apellido: 'GOMEZ', nombre: 'MARIA', email: 'mariagomez@unt.edu.ar', celular: '154987654' }
];

const MOCK_FACULTADES = [
  { idFac: 1, facultad: 'Agronomía, Zootecnia y Veterinaria' },
  { idFac: 2, facultad: 'Bioquímica, Química y Farmacia' },
  { idFac: 3, facultad: 'Ciencias Exactas y Tecnología' },
  { idFac: 4, facultad: 'Filosofía y Letras' }
];

/**
 * Main application container.
 * Coordinates user authentication and reference lists loading.
 * Delegates layout routes to subcomponents.
 */
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [resetSentMsg, setResetSentMsg] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // Theme (dark / light)
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('siga-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));

  // Login modal visibility (for public landing page)
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showLandingPreview, setShowLandingPreview] = useState(false);

  // App Tabs Navigation State
  const [activeTab, setActiveTab] = useState<'inicio' | 'alumnos' | 'inscripciones' | 'asistencia' | 'consultas' | 'reportes' | 'facultades' | 'cursos' | 'fechas' | 'personal' | 'usuarios' | 'noticias' | 'configuracion'>('inicio');


  // Usuario del panel (nombre, activo) para trazabilidad
  const [userNombre, setUserNombre] = useState('');

  // Database empty warning
  const [dbEmptyWarning, setDbEmptyWarning] = useState(false);

  // Global reference data lists
  const [cursos, setCursos] = useState<any[]>([]);
  const [docentes, setDocentes] = useState<any[]>([]);
  const [fechas, setFechas] = useState<any[]>([]);
  const [facultades, setFacultades] = useState<any[]>([]);
  const [inscripciones, setInscripciones] = useState<any[]>([]);
  const [alumnos, setAlumnos] = useState<any[]>([]);

  // --- 1. Authentication ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Cargar datos del usuario en la colección `usuarios` (nombre + estado activo)
        try {
          const snap = await getDoc(doc(db, 'usuarios', currentUser.uid));
          if (snap.exists()) {
            const data = snap.data();
            setUserNombre(data.nombre || currentUser.displayName || '');
            if (data.activo === false) {
              await signOut(auth);
              setUser(null);
              alert('Su cuenta fue desactivada. Contacte al administrador.');
            }
          } else {
            setUserNombre(currentUser.displayName || '');
          }
        } catch (err) {
          console.error('Error cargando perfil de usuario:', err);
          setUserNombre(currentUser.displayName || '');
        }
      } else {
        setUserNombre('');
      }
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setResetSentMsg('');
    const cleanEmail = email.trim().toLowerCase();
    try {
      await signInWithEmailAndPassword(auth, cleanEmail, password);
    } catch (err: any) {
      console.error('Error de login:', err);
      const code = err?.code || '';
      if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') {
        setAuthError('Correo o contraseña incorrectos. Si no recuerda su clave, haga clic en "¿Olvidaste tu contraseña?" abajo.');
      } else if (code === 'auth/user-disabled') {
        setAuthError('Esta cuenta ha sido deshabilitada. Contacte al administrador.');
      } else if (code === 'auth/too-many-requests') {
        setAuthError('Demasiados intentos fallidos. Por seguridad, intente nuevamente en unos minutos o restablezca la contraseña.');
      } else if (code === 'auth/invalid-email') {
        setAuthError('El formato del correo electrónico no es válido.');
      } else {
        setAuthError('Error en las credenciales o usuario no registrado.');
      }
    }
  };

  const handleForgotPassword = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setAuthError('Por favor, ingrese su correo electrónico en la casilla de arriba.');
      return;
    }
    setAuthError('');
    setResetSentMsg('');
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      setResetSentMsg(`Se envió el enlace para restablecer la contraseña a: ${cleanEmail}. (Si no lo ve en la Bandeja de entrada, revise la carpeta SPAM / Correo no deseado).`);
    } catch (err: any) {
      console.error('Error enviando correo de recuperación:', err);
      const code = err?.code || '';
      if (code === 'auth/user-not-found') {
        setAuthError(`No existe ninguna cuenta registrada con el correo "${cleanEmail}".`);
      } else if (code === 'auth/invalid-email') {
        setAuthError('El correo electrónico ingresado no es válido.');
      } else if (code === 'auth/too-many-requests') {
        setAuthError('Se han realizado demasiados intentos. Por favor aguarde unos minutos e intente nuevamente.');
      } else {
        setAuthError(`Error al enviar correo (${code || err?.message || 'Error desconocido'}). Verifique si el correo existe en el sistema.`);
      }
    } finally {
      setResetLoading(false);
    }
  };

  const handleSignOut = () => {
    signOut(auth);
    setUser(null);
  };

  // --- 2. Public data for landing page (when not logged in) ---
  useEffect(() => {
    if (user) return;
    const fetchPublic = async () => {
      try {
        const [cs, fs] = await Promise.all([
          getDocs(collection(db, 'cursos')),
          getDocs(collection(db, 'fechas')),
        ]);
        const loadedCursos = cs.docs.map(d => ({ docId: d.id, ...d.data() }));
        const loadedFechas = fs.docs.map(d => ({ id: d.id, ...d.data() }));
        setCursos(loadedCursos);
        setFechas(loadedFechas);
      } catch (err) {
        console.error('Error fetching public data:', err);
        setCursos([]);
        setFechas([]);
      }
    };
    fetchPublic();
  }, [user]);

  // --- 3. Listen to Reference Lists (authenticated) ---
  useEffect(() => {
    if (!user) {
      setDocentes([]);
      setFacultades([]);
      setInscripciones([]);
      return;
    }

    const unsubCursos = onSnapshot(collection(db, 'cursos'), (snap) => {
      const data = snap.docs.map(d => ({ docId: d.id, ...d.data() }));
      setCursos(data);
      setDbEmptyWarning(false);
    }, (err) => {
      console.error("Error listening to cursos:", err);
      setCursos([]);
      setDbEmptyWarning(false);
    });

    const unsubDocentes = onSnapshot(collection(db, 'docentes'), (snap) => {
      const data = snap.docs.map(d => d.data());
      if (data.length === 0) {
        setDocentes(MOCK_DOCENTES);
      } else {
        setDocentes(data);
      }
    }, (err) => {
      console.error("Error listening to docentes, using mock:", err);
      setDocentes(MOCK_DOCENTES);
    });

    const unsubFechas = onSnapshot(collection(db, 'fechas'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (data.length === 0) {
        setFechas(MOCK_FECHAS);
      } else {
        setFechas(data);
      }
    }, (err) => {
      console.error("Error listening to fechas, using mock:", err);
      setFechas(MOCK_FECHAS);
    });

    const unsubFacultades = onSnapshot(collection(db, 'facultades'), (snap) => {
      const data = snap.docs.map(d => d.data());
      if (data.length === 0) {
        setFacultades(MOCK_FACULTADES);
      } else {
        setFacultades(data);
      }
    }, (err) => {
      console.error("Error listening to facultades, using mock:", err);
      setFacultades(MOCK_FACULTADES);
    });

    const unsubInscripciones = onSnapshot(collection(db, 'inscripciones'), (snap) => {
      setInscripciones(snap.docs.map(d => d.data()));
    }, onSnapshotError);

    const unsubAlumnos = onSnapshot(collection(db, 'alumnos'), (snap) => {
      const list = snap.docs.map(d => d.data());
      list.sort((a, b) => (a.apellido || '').localeCompare(b.apellido || ''));
      setAlumnos(list);
    }, onSnapshotError);

    return () => {
      unsubCursos();
      unsubDocentes();
      unsubFechas();
      unsubFacultades();
      unsubInscripciones();
      unsubAlumnos();
    };
  }, [user]);

  // Loading indicator for authentication
  if (authLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  // --- Public landing page (not authenticated) ---
  if (!user) {
    return (
      <>
        <LandingPage cursos={cursos} fechas={fechas} onLoginClick={() => setShowLoginModal(true)} theme={theme} onToggleTheme={toggleTheme} />

        {/* Login Modal */}
        {showLoginModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 1000, padding: '20px',
            backdropFilter: 'blur(4px)',
          }} onClick={() => setShowLoginModal(false)}>
            <div className="login-card" style={{ position: 'relative', maxWidth: '400px', margin: 0 }} onClick={e => e.stopPropagation()}>
              <button onClick={() => setShowLoginModal(false)} style={{
                position: 'absolute', top: '12px', right: '12px',
                background: 'none', border: 'none', color: 'var(--text-muted)',
                cursor: 'pointer', padding: '4px',
              }}><X size={20} /></button>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '15px' }}>
                <img src={logoImg} alt="SIGA Logo" style={{ height: '60px', background: '#ffffff', padding: '3px 7px', borderRadius: '8px', marginBottom: '10px', objectFit: 'contain' }} />
                <h2 style={{ margin: 0 }}>SIGA 2026</h2>
              </div>
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Acceso administrativo al sistema
              </p>

              {authError && (
                <div className="error-message" style={{ padding: '10px 12px', fontSize: '0.8rem', marginBottom: '12px' }}>{authError}</div>
              )}
              {resetSentMsg && (
                <div style={{ padding: '10px 12px', fontSize: '0.8rem', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10B981', borderRadius: '6px', marginBottom: '12px' }}>
                  ✓ {resetSentMsg}
                </div>
              )}

              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label htmlFor="email">Correo Electrónico</label>
                  <input
                    id="email"
                    type="email"
                    className="form-control"
                    placeholder="ejemplo@correo.com"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setAuthError(''); setResetSentMsg(''); }}
                    required
                  />
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label htmlFor="password" style={{ margin: 0 }}>Contraseña</label>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={resetLoading}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary, #259AD6)',
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        padding: 0,
                        textDecoration: 'underline',
                        fontWeight: 500
                      }}
                    >
                      {resetLoading ? 'Enviando...' : '¿Olvidaste tu contraseña?'}
                    </button>
                  </div>
                  <input
                    id="password"
                    type="password"
                    className="form-control"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setAuthError(''); }}
                    required
                  />
                </div>

                <button type="submit" className="btn-primary">
                  Ingresar
                </button>
              </form>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="app-container">
      {!showLandingPreview && (
        <header className="app-header">
          <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img src={logoImg} alt="CCUNT Logo" style={{ height: '66px', background: '#ffffff', padding: '3px 7px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)', objectFit: 'contain' }} />
            <h1 style={{ margin: 0, fontSize: '1.35rem', color: '#ffffff', fontFamily: 'var(--font-display)', fontWeight: 700 }}>SIGA 2026</h1>
          </div>
          <div className="user-badge">
            <button className="theme-toggle" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'} title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}>
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <span className="user-badge-email" style={{ fontWeight: 500 }}>
              {userNombre || user.email}
            </span>
            <button className="btn-secondary" style={{ padding: '8px 14px', fontSize: '0.8rem', minHeight: '40px' }} onClick={() => setShowLandingPreview(true)}>
              Vista Principal
            </button>
            <button className="btn-signout" onClick={handleSignOut}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <LogOut size={14} /> Cerrar Sesión
              </span>
            </button>
          </div>
        </header>
      )}

      {showLandingPreview ? (
        <LandingPage cursos={cursos} fechas={fechas} onLoginClick={() => setShowLandingPreview(false)} backLabel="Volver al Panel" theme={theme} onToggleTheme={toggleTheme} />
      ) : (
        <div className="main-layout">
          {/* Nav Tabs */}
          <nav className="tabs-nav">
            <button className={`tab-btn ${activeTab === 'inicio' ? 'active' : ''}`} onClick={() => setActiveTab('inicio')}>
              <span className="tab-icon"><Home color="#259AD6" size={18} /></span>
              <span className="tab-label">Inicio</span>
            </button>
            <button className={`tab-btn ${activeTab === 'alumnos' ? 'active' : ''}`} onClick={() => setActiveTab('alumnos')}>
              <span className="tab-icon"><Users color="#E25E20" size={18} /></span>
              <span className="tab-label">Alumnos</span>
            </button>
            <button className={`tab-btn ${activeTab === 'inscripciones' ? 'active' : ''}`} onClick={() => setActiveTab('inscripciones')}>
              <span className="tab-icon"><UserPlus color="#10B981" size={18} /></span>
              <span className="tab-label">Inscripción</span>
            </button>
            <button className={`tab-btn ${activeTab === 'asistencia' ? 'active' : ''}`} onClick={() => setActiveTab('asistencia')}>
              <span className="tab-icon"><ClipboardCheck color="#F59E0B" size={18} /></span>
              <span className="tab-label">Asistencia</span>
            </button>
            <button className={`tab-btn ${activeTab === 'cursos' ? 'active' : ''}`} onClick={() => setActiveTab('cursos')}>
              <span className="tab-icon"><BookOpen color="#06B6D4" size={18} /></span>
              <span className="tab-label">Cursos y Fechas</span>
            </button>
            <button className={`tab-btn ${(activeTab === 'reportes' || activeTab === 'facultades') ? 'active' : ''}`} onClick={() => setActiveTab('reportes')}>
              <span className="tab-icon"><FileText color="#EC4899" size={18} /></span>
              <span className="tab-label">Reportes</span>
            </button>
            <button className={`tab-btn ${activeTab === 'noticias' ? 'active' : ''}`} onClick={() => setActiveTab('noticias')}>
              <span className="tab-icon"><Megaphone color="#E25E20" size={18} /></span>
              <span className="tab-label">Noticias</span>
            </button>
            <button className={`tab-btn ${(activeTab === 'personal' || activeTab === 'usuarios') ? 'active' : ''}`} onClick={() => setActiveTab('personal')}>
              <span className="tab-icon"><Users color="#259AD6" size={18} /></span>
              <span className="tab-label">Personal</span>
            </button>
            {(user?.email || '').toLowerCase() === 'eugenia.gonzalez@webmail.unt.edu.ar' && (
              <button className={`tab-btn ${activeTab === 'configuracion' ? 'active' : ''}`} onClick={() => setActiveTab('configuracion')}>
                <span className="tab-icon"><Settings color="#8B5CF6" size={18} /></span>
                <span className="tab-label">Configuración</span>
              </button>
            )}
          </nav>

          {/* Content Area wrapper */}
          <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0 }}>
            {/* Main warning if database is empty */}
            {dbEmptyWarning && (
              <div className="error-message" style={{ marginBottom: '20px', borderRadius: '12px' }}>
                <strong>Base de Datos Vacía:</strong> No se encontraron registros de cursos en Firestore.
                Por favor, generá tus llaves en <code>serviceAccountKey.json</code> y cargá la base de datos ejecutando
                <code>node import_to_firestore.js</code> en la terminal.
              </div>
            )}

            <main className="tab-content">
              <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}><div className="spinner"></div></div>}>
                {activeTab === 'inicio' && (
                  <DashboardHome
                    cursosCount={cursos.length}
                    facultadesCount={facultades.length}
                    docentesCount={docentes.length}
                    inscripciones={inscripciones}
                    cursos={cursos}
                  />
                )}
                {activeTab === 'alumnos' && (
                  <StudentManagement
                    facultades={facultades}
                    activeTab={activeTab}
                    alumnos={alumnos}
                    cursos={cursos}
                    fechas={fechas}
                  />
                )}
                {activeTab === 'inscripciones' && (
                  <EnrollmentTab
                    cursos={cursos}
                    fechas={fechas}
                  />
                )}
                {activeTab === 'asistencia' && (
                  <AttendanceTab
                    cursos={cursos}
                    fechas={fechas}
                  />
                )}
                {(activeTab === 'cursos' || activeTab === 'fechas') && (
                  <CoursesAndDatesTab
                    cursos={cursos}
                    docentes={docentes}
                    fechas={fechas}
                  />
                )}
                {activeTab === 'noticias' && (
                  <NewsTab />
                )}
                {(activeTab === 'reportes' || activeTab === 'facultades') && (
                  <ReportsTab
                    facultades={facultades}
                  />
                )}
                {(activeTab === 'personal' || activeTab === 'usuarios') && (
                  <PersonalAndUsersTab />
                )}
                {activeTab === 'configuracion' && (
                  <ConfigTab currentUserEmail={user?.email} />
                )}
              </Suspense>
            </main>
          </div>
        </div>
      )}
    </div>
  );
}
