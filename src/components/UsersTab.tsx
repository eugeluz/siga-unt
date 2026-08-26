import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, setDoc, doc, deleteDoc, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { createUserWithEmailAndPassword, updateProfile, sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from '../firebase';
import { logAudit } from '../utils/audit';
import { UserPlus, UserCog, ShieldCheck, ShieldOff, RefreshCw, History, Pencil, X, Save, Key, Trash2 } from 'lucide-react';
import { useModal } from './ModalProvider';

interface UsuarioDoc {
  id: string;
  email: string;
  nombre: string;
  legajo?: string;
  categoria?: string;
  activo: boolean;
  rol?: string;
}

export const UsersTab: React.FC = () => {
  const { confirm, alert } = useModal();
  const [usuarios, setUsuarios] = useState<UsuarioDoc[]>([]);
  const [auditoria, setAuditoria] = useState<any[]>([]);
  const [form, setForm] = useState({ legajo: '', nombre: '', email: '', categoria: '', password: '' });
  const [creating, setCreating] = useState(false);

  // Audit log pagination state
  const [currentAuditPage, setCurrentAuditPage] = useState(1);
  const auditItemsPerPage = 10;

  // User editing modal state
  const [editingUser, setEditingUser] = useState<UsuarioDoc | null>(null);
  const [editForm, setEditForm] = useState({ legajo: '', nombre: '', email: '', categoria: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'usuarios'), (snap) => {
      const list = snap.docs.map(d => ({
        id: d.id,
        ...(d.data() as Omit<UsuarioDoc, 'id'>)
      }));
      list.sort((a, b) => (a.nombre || a.email || '').localeCompare(b.nombre || b.email || ''));
      setUsuarios(list);
    }, (err) => console.error('Error leyendo usuarios:', err));
    return unsub;
  }, []);

  const loadAuditoria = async () => {
    try {
      const q = query(collection(db, 'auditoria'), orderBy('fecha', 'desc'), limit(500));
      const snap = await getDocs(q);
      setAuditoria(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setCurrentAuditPage(1);
    } catch (err) {
      console.error('Error leyendo auditoría:', err);
      await alert({ title: 'Error', message: 'No se pudo cargar la auditoría. Intente nuevamente.', variant: 'danger' });
    }
  };

  useEffect(() => {
    loadAuditoria();
  }, []);

  const handleCreate = async () => {
    if (!form.nombre.trim() || !form.email.trim() || !form.password.trim()) {
      await alert({ title: 'Campos incompletos', message: 'Complete nombre, email y contraseña.', variant: 'warning' });
      return;
    }
    if (form.password.length < 6) {
      await alert({ title: 'Contraseña inválida', message: 'La contraseña debe tener al menos 6 caracteres.', variant: 'warning' });
      return;
    }
    setCreating(true);
    try {
      const userCred = await createUserWithEmailAndPassword(auth, form.email.trim(), form.password);
      await updateProfile(userCred.user, { displayName: form.nombre.trim() });
      await setDoc(doc(db, 'usuarios', userCred.user.uid), {
        email: form.email.trim().toLowerCase(),
        nombre: form.nombre.trim(),
        legajo: form.legajo.trim(),
        categoria: form.categoria.trim(),
        activo: true,
        rol: 'operador',
        createdAt: new Date().toISOString()
      });
      await logAudit('Usuario creado', `${form.nombre.trim()} (${form.email.trim()}) - Legajo: ${form.legajo.trim() || 'N/A'}, Cat: ${form.categoria.trim() || 'N/A'}`);
      setForm({ legajo: '', nombre: '', email: '', categoria: '', password: '' });
      await alert({ title: 'Usuario creado', message: 'Usuario creado con éxito.', variant: 'success' });
    } catch (err: any) {
      console.error(err);
      if (err?.code === 'auth/email-already-in-use') {
        await alert({ title: 'Email en uso', message: 'Ya existe una cuenta con ese email.', variant: 'warning' });
      } else {
        await alert({ title: 'Error', message: 'No se pudo crear el usuario. Intente nuevamente.', variant: 'danger' });
      }
    } finally {
      setCreating(false);
    }
  };

  const handleResetPassword = async (email: string, nombre: string) => {
    if (!email) {
      await alert({ title: 'Email inválido', message: 'El usuario no posee un correo electrónico válido.', variant: 'warning' });
      return;
    }
    const confirmed = await confirm({
      title: 'Enviar correo de restablecimiento',
      message: `¿Enviar correo de restablecimiento de contraseña a ${nombre} (${email})?\n\nEl usuario recibirá un enlace para crear una nueva clave.`,
      variant: 'primary',
      confirmText: 'Sí, enviar correo',
      cancelText: 'Cancelar',
    });
    if (!confirmed) return;

    try {
      await sendPasswordResetEmail(auth, email);
      await logAudit('Restablecimiento de clave enviado', `Se envió enlace a ${nombre} (${email})`);
      await alert({ title: 'Correo enviado', message: `Se envió exitosamente el correo para restablecer la contraseña a: ${email}`, variant: 'success' });
    } catch (err: any) {
      console.error('Error al enviar enlace de contraseña:', err);
      if (err?.code === 'auth/user-not-found') {
        await alert({ title: 'Cuenta no encontrada', message: 'No se encontró una cuenta en el servidor de autenticación con ese email.', variant: 'danger' });
      } else {
        await alert({ title: 'Error', message: 'No se pudo procesar el restablecimiento: ' + (err?.message || 'intente nuevamente.'), variant: 'danger' });
      }
    }
  };

  const handleStartEdit = (u: UsuarioDoc) => {
    setEditingUser(u);
    setEditForm({
      legajo: u.legajo || '',
      nombre: u.nombre || '',
      email: u.email || '',
      categoria: u.categoria || ''
    });
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    if (!editForm.nombre.trim() || !editForm.email.trim()) {
      await alert({ title: 'Campos incompletos', message: 'Complete nombre y email.', variant: 'warning' });
      return;
    }
    setSavingEdit(true);
    try {
      await setDoc(doc(db, 'usuarios', editingUser.id), {
        nombre: editForm.nombre.trim(),
        email: editForm.email.trim().toLowerCase(),
        legajo: editForm.legajo.trim(),
        categoria: editForm.categoria.trim()
      }, { merge: true });

      await logAudit('Usuario modificado', `${editForm.nombre.trim()} (${editForm.email.trim()}) - Legajo: ${editForm.legajo.trim() || 'N/A'}, Cat: ${editForm.categoria.trim() || 'N/A'}`);
      setEditingUser(null);
      await alert({ title: 'Cambios guardados', message: 'Datos de usuario actualizados con éxito.', variant: 'success' });
    } catch (err) {
      console.error(err);
      await alert({ title: 'Error', message: 'No se pudieron actualizar los datos del usuario. Intente nuevamente.', variant: 'danger' });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleToggleActivo = async (u: UsuarioDoc) => {
    try {
      await setDoc(doc(db, 'usuarios', u.id), { activo: !u.activo }, { merge: true });
      await logAudit(u.activo ? 'Usuario desactivado' : 'Usuario activado', `${u.nombre || u.email}`);
    } catch (err) {
      console.error(err);
      await alert({ title: 'Error', message: 'No se pudo actualizar el usuario. Intente nuevamente.', variant: 'danger' });
    }
  };

  const handleDeleteUser = async (u: UsuarioDoc) => {
    const confirmed = await confirm({
      title: 'Confirmar eliminación',
      message: `¿Eliminar definitivamente el usuario "${u.nombre || u.email}"?\n\nEsta acción eliminará el registro de forma permanente y no se puede deshacer.`,
      variant: 'danger',
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar',
    });
    if (!confirmed) return;
    try {
      await deleteDoc(doc(db, 'usuarios', u.id));
      await logAudit('Usuario eliminado', `${u.nombre || u.email} (${u.email})`);
      await alert({ title: 'Usuario eliminado', message: 'Usuario eliminado con éxito.', variant: 'success' });
    } catch (err) {
      console.error('Error al eliminar usuario:', err);
      await alert({ title: 'Error', message: 'No se pudo eliminar el usuario. Intente nuevamente.', variant: 'danger' });
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
      <h3 className="section-title">
        <UserCog size={22} /> Alta de Usuarios
      </h3>

      <div className="details-box" style={{ marginBottom: '25px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '12px' }}>
          <div className="form-group" style={{ margin: 0, flex: '1 1 120px' }}>
            <label style={{ fontWeight: 600, fontSize: '0.8rem' }}>Legajo</label>
            <input
              type="text"
              className="form-control"
              placeholder="Ej: 12345"
              value={form.legajo}
              onChange={e => setForm({ ...form, legajo: e.target.value })}
              style={{ fontSize: '0.85rem' }}
            />
          </div>
          <div className="form-group" style={{ margin: 0, flex: '2 1 170px' }}>
            <label style={{ fontWeight: 600, fontSize: '0.8rem' }}>Nombre y Apellido *</label>
            <input
              type="text"
              className="form-control"
              placeholder="Ej: María González"
              value={form.nombre}
              onChange={e => setForm({ ...form, nombre: e.target.value })}
              style={{ fontSize: '0.85rem' }}
            />
          </div>
          <div className="form-group" style={{ margin: 0, flex: '2 1 170px' }}>
            <label style={{ fontWeight: 600, fontSize: '0.8rem' }}>Email *</label>
            <input
              type="email"
              className="form-control"
              placeholder="Ej: maria@unt.edu.ar"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              style={{ fontSize: '0.85rem' }}
            />
          </div>
          <div className="form-group" style={{ margin: 0, flex: '1 1 140px' }}>
            <label style={{ fontWeight: 600, fontSize: '0.8rem' }}>Categoría</label>
            <input
              type="text"
              className="form-control"
              placeholder="Ej: Nodocente / Cat. 4"
              value={form.categoria}
              onChange={e => setForm({ ...form, categoria: e.target.value })}
              style={{ fontSize: '0.85rem' }}
            />
          </div>
          <div className="form-group" style={{ margin: 0, flex: '1 1 140px' }}>
            <label style={{ fontWeight: 600, fontSize: '0.8rem' }}>Contraseña *</label>
            <input
              type="password"
              className="form-control"
              placeholder="Mínimo 6 caracteres"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              style={{ fontSize: '0.85rem' }}
            />
          </div>

          <button
            className="btn-primary"
            style={{
              margin: 0,
              height: '38px',
              padding: '0 14px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
              fontSize: '0.85rem',
              flexShrink: 0
            }}
            onClick={handleCreate}
            disabled={creating}
          >
            <UserPlus size={15} /> {creating ? 'Creando...' : 'Crear Usuario'}
          </button>
        </div>
      </div>

      <div className="listbox-wrapper" style={{ marginBottom: '30px' }}>
        <table className="listbox-table">
          <thead>
            <tr>
              <th>Legajo</th>
              <th>Nombre</th>
              <th>Email</th>
              <th>Categoría</th>
              <th>Estado</th>
              <th style={{ width: '180px', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map(u => (
              <tr key={u.id}>
                <td data-label="Legajo">{u.legajo || '—'}</td>
                <td data-label="Nombre">{u.nombre || '—'}</td>
                <td data-label="Email">{u.email}</td>
                <td data-label="Categoría">{u.categoria || '—'}</td>
                <td data-label="Estado">
                  <span className={`badge ${u.activo ? 'badge-aprobado' : 'badge-desaprobado'}`}>
                    {u.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td data-label="Acciones" style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                    <button
                      className="btn-secondary"
                      style={{ padding: '6px 10px', margin: 0, minHeight: '36px', fontSize: '0.8rem', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      onClick={() => handleStartEdit(u)}
                      title="Editar datos del usuario"
                    >
                      <Pencil size={14} /> Editar
                    </button>
                    <button
                      className={`btn-${u.activo ? 'danger' : 'secondary'}`}
                      style={{ padding: '6px 10px', margin: 0, minHeight: '36px', fontSize: '0.8rem', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      onClick={() => handleToggleActivo(u)}
                      title={u.activo ? 'Desactivar cuenta' : 'Activar cuenta'}
                    >
                      {u.activo ? <><ShieldOff size={14} /> Desactivar</> : <><ShieldCheck size={14} /> Activar</>}
                    </button>
                    <button
                      className="btn-danger"
                      style={{ padding: '6px 10px', margin: 0, minHeight: '36px', fontSize: '0.8rem', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      onClick={() => handleDeleteUser(u)}
                      title="Eliminar registro de usuario definitivamente"
                    >
                      <Trash2 size={14} /> Eliminar
                    </button>
                  </div>
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

      {/* Modal para Editar Datos de Usuario */}
      {editingUser && (
        <div
          className="modal-backdrop"
          onClick={() => setEditingUser(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: '50px',
            paddingBottom: '30px',
            zIndex: 99999,
            overflowY: 'auto'
          }}
        >
          <div
            className="modal-content"
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--card-bg, #1e293b)',
              color: 'var(--text-primary, #f8fafc)',
              borderRadius: '16px',
              padding: '28px',
              maxWidth: '520px',
              width: '92%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
              border: '1px solid var(--border-color, #334155)',
              margin: '0 auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.1))', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary, #fff)' }}>
                <Pencil size={20} color="var(--primary, #3b82f6)" /> Editar Usuario
              </h3>
              <button
                onClick={() => setEditingUser(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary, #94a3b8)', padding: '4px' }}
                title="Cerrar"
              >
                <X size={22} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px', fontSize: '0.9rem' }}>Legajo</label>
                <input
                  type="text"
                  className="form-control"
                  style={{ width: '100%', fontSize: '0.95rem' }}
                  placeholder="Ej: 12345 (Vacío)"
                  value={editForm.legajo}
                  onChange={e => setEditForm({ ...editForm, legajo: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px', fontSize: '0.9rem' }}>Nombre y Apellido *</label>
                <input
                  type="text"
                  className="form-control"
                  style={{ width: '100%', fontSize: '0.95rem' }}
                  placeholder="Nombre y Apellido del usuario"
                  value={editForm.nombre}
                  onChange={e => setEditForm({ ...editForm, nombre: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px', fontSize: '0.9rem' }}>Email de Acceso *</label>
                <input
                  type="email"
                  className="form-control"
                  style={{ width: '100%', fontSize: '0.95rem' }}
                  placeholder="correo@ejemplo.com"
                  value={editForm.email}
                  onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px', fontSize: '0.9rem' }}>Categoría / Cargo</label>
                <input
                  type="text"
                  className="form-control"
                  style={{ width: '100%', fontSize: '0.95rem' }}
                  placeholder="Ej: Nodocente / Categoría 4"
                  value={editForm.categoria}
                  onChange={e => setEditForm({ ...editForm, categoria: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px', marginTop: '20px', borderTop: '1px solid var(--border-color, rgba(255,255,255,0.1))', paddingTop: '16px' }}>
              <button
                className="btn-secondary"
                onClick={() => setEditingUser(null)}
                style={{ margin: 0, height: '38px', padding: '0 16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', width: 'auto', flexShrink: 0 }}
              >
                Cancelar
              </button>
              <button
                className="btn-primary"
                onClick={handleSaveEdit}
                disabled={savingEdit}
                style={{ margin: 0, height: '38px', padding: '0 18px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.85rem', width: 'auto', flexShrink: 0 }}
              >
                <Save size={16} /> {savingEdit ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

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

      {(() => {
        const totalAuditPages = Math.ceil(auditoria.length / auditItemsPerPage);
        const paginatedAuditoria = auditoria.slice(
          (currentAuditPage - 1) * auditItemsPerPage,
          currentAuditPage * auditItemsPerPage
        );

        return (
          <>
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
                  {paginatedAuditoria.map(item => (
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

            {auditoria.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', marginTop: '15px' }}>
                {totalAuditPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px' }}>
                    <button
                      className="btn-secondary"
                      style={{ padding: '6px 14px', fontSize: '0.85rem', margin: 0, height: '36px', display: 'inline-flex', alignItems: 'center' }}
                      disabled={currentAuditPage === 1}
                      onClick={() => setCurrentAuditPage(prev => Math.max(prev - 1, 1))}
                    >
                      Anterior
                    </button>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                      Página {currentAuditPage} de {totalAuditPages}
                    </span>
                    <button
                      className="btn-secondary"
                      style={{ padding: '6px 14px', fontSize: '0.85rem', margin: 0, height: '36px', display: 'inline-flex', alignItems: 'center' }}
                      disabled={currentAuditPage === totalAuditPages}
                      onClick={() => setCurrentAuditPage(prev => Math.min(prev + 1, totalAuditPages))}
                    >
                      Siguiente
                    </button>
                  </div>
                )}
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                  Mostrando {auditoria.length > 0 ? (currentAuditPage - 1) * auditItemsPerPage + 1 : 0} al {Math.min(currentAuditPage * auditItemsPerPage, auditoria.length)} de {auditoria.length} actividades registradas.
                </span>
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
};
