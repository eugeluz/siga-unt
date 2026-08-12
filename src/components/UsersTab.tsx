import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, setDoc, doc, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { db, auth } from '../firebase';
import { logAudit } from '../utils/audit';
import { UserPlus, UserCog, ShieldCheck, ShieldOff, RefreshCw, History } from 'lucide-react';

interface UsuarioDoc {
  id: string;
  email: string;
  nombre: string;
  activo: boolean;
  rol?: string;
}

export const UsersTab: React.FC = () => {
  const [usuarios, setUsuarios] = useState<UsuarioDoc[]>([]);
  const [auditoria, setAuditoria] = useState<any[]>([]);
  const [form, setForm] = useState({ nombre: '', email: '', password: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'usuarios'), (snap) => {
      const list = snap.docs.map(d => ({
        id: d.id,
        ...(d.data() as Omit<UsuarioDoc, 'id'>)
      }));
      list.sort((a, b) => (a.email || '').localeCompare(b.email || ''));
      setUsuarios(list);
    }, (err) => console.error('Error leyendo usuarios:', err));
    return unsub;
  }, []);

  const loadAuditoria = async () => {
    try {
      const q = query(collection(db, 'auditoria'), orderBy('fecha', 'desc'), limit(200));
      const snap = await getDocs(q);
      setAuditoria(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Error leyendo auditoría:', err);
      alert('Error al cargar la auditoría.');
    }
  };

  useEffect(() => {
    loadAuditoria();
  }, []);

  const handleCreate = async () => {
    if (!form.nombre.trim() || !form.email.trim() || !form.password.trim()) {
      alert('Complete nombre, email y contraseña.');
      return;
    }
    if (form.password.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setCreating(true);
    try {
      const userCred = await createUserWithEmailAndPassword(auth, form.email.trim(), form.password);
      await updateProfile(userCred.user, { displayName: form.nombre.trim() });
      await setDoc(doc(db, 'usuarios', userCred.user.uid), {
        email: form.email.trim().toLowerCase(),
        nombre: form.nombre.trim(),
        activo: true,
        rol: 'operador',
        createdAt: new Date().toISOString()
      });
      await logAudit('Usuario creado', `${form.nombre.trim()} (${form.email.trim()})`);
      setForm({ nombre: '', email: '', password: '' });
      alert('Usuario creado con éxito.');
    } catch (err: any) {
      console.error(err);
      if (err?.code === 'auth/email-already-in-use') {
        alert('Ya existe una cuenta con ese email.');
      } else {
        alert('Error al crear el usuario.');
      }
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActivo = async (u: UsuarioDoc) => {
    try {
      await setDoc(doc(db, 'usuarios', u.id), { activo: !u.activo }, { merge: true });
      await logAudit(u.activo ? 'Usuario desactivado' : 'Usuario activado', `${u.nombre || u.email}`);
    } catch (err) {
      console.error(err);
      alert('Error al actualizar el usuario.');
    }
  };

  const formatFecha = (f: any) => {
    if (!f) return '—';
    if (typeof f === 'string') return new Date(f).toLocaleString('es-AR');
    if (f.toDate) return f.toDate().toLocaleString('es-AR');
    return '—';
  };

  return (
    <div>
      <h2 className="section-title">
        <UserCog size={22} /> Usuarios y Auditoría
      </h2>

      <div className="details-box" style={{ marginBottom: '25px' }}>
        <h3 style={{ margin: '0 0 15px', fontSize: '1.05rem' }}>Crear Usuario</h3>
        <div className="form-row" style={{ width: '100%' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontWeight: 600 }}>Nombre y Apellido</label>
            <input
              type="text"
              className="form-control"
              placeholder="Ej: María González"
              value={form.nombre}
              onChange={e => setForm({ ...form, nombre: e.target.value })}
            />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontWeight: 600 }}>Email</label>
            <input
              type="email"
              className="form-control"
              placeholder="Ej: maria@unt.edu.ar"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontWeight: 600 }}>Contraseña</label>
            <input
              type="password"
              className="form-control"
              placeholder="Mínimo 6 caracteres"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              className="btn-primary"
              style={{ margin: 0, height: '44px', display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
              onClick={handleCreate}
              disabled={creating}
            >
              <UserPlus size={16} /> {creating ? 'Creando...' : 'Crear Usuario'}
            </button>
          </div>
        </div>
      </div>

      <div className="listbox-wrapper" style={{ marginBottom: '30px' }}>
        <table className="listbox-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Estado</th>
              <th style={{ width: '120px', textAlign: 'center' }}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map(u => (
              <tr key={u.id}>
                <td data-label="Nombre">{u.nombre || '—'}</td>
                <td data-label="Email">{u.email}</td>
                <td data-label="Estado">
                  <span className={`badge ${u.activo ? 'badge-aprobado' : 'badge-desaprobado'}`}>
                    {u.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td data-label="Acción" style={{ textAlign: 'center' }}>
                  <button
                    className={`btn-${u.activo ? 'danger' : 'secondary'}`}
                    style={{ padding: '6px 10px', margin: 0, minHeight: '36px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                    onClick={() => handleToggleActivo(u)}
                    title={u.activo ? 'Desactivar cuenta' : 'Activar cuenta'}
                  >
                    {u.activo ? <><ShieldOff size={14} /> Desactivar</> : <><ShieldCheck size={14} /> Activar</>}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {usuarios.length === 0 && (
          <p style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No hay usuarios registrados todavía.
          </p>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
        <h3 style={{ margin: 0, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <History size={18} color="var(--primary)" /> Registro de Actividad (Auditoría)
        </h3>
        <button
          className="btn-secondary"
          style={{ margin: 0, height: '38px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          onClick={loadAuditoria}
        >
          <RefreshCw size={14} /> Actualizar
        </button>
      </div>

      <div className="listbox-wrapper">
        <table className="listbox-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Usuario</th>
              <th>Acción</th>
              <th>Detalle</th>
            </tr>
          </thead>
          <tbody>
            {auditoria.map(item => (
              <tr key={item.id}>
                <td data-label="Fecha" style={{ whiteSpace: 'nowrap' }}>{formatFecha(item.fecha)}</td>
                <td data-label="Usuario">{item.nombre || item.usuario}</td>
                <td data-label="Acción">
                  <span className="badge" style={{ background: 'var(--primary-alpha-15)', color: 'var(--accent)' }}>
                    {item.accion}
                  </span>
                </td>
                <td data-label="Detalle">{item.detalle}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {auditoria.length === 0 && (
          <p style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Sin actividad registrada todavía.
          </p>
        )}
      </div>
    </div>
  );
};
