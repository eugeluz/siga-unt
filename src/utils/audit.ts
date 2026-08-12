import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';

/**
 * Registra una acción en la colección `auditoria` para trazabilidad.
 * Usa el usuario actualmente autenticado (o "Público (web)" si no hay sesión).
 */
export async function logAudit(accion: string, detalle: string) {
  try {
    const user = auth.currentUser;
    await addDoc(collection(db, 'auditoria'), {
      accion,
      detalle,
      usuario: user?.email || 'Público (web)',
      nombre: user?.displayName || '',
      fecha: serverTimestamp()
    });
  } catch (err) {
    console.error('Error al registrar auditoría:', err);
  }
}
