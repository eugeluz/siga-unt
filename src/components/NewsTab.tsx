import React, { useState, useEffect } from 'react';
import { getDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { logAudit } from '../utils/audit';
import { Save, Megaphone } from 'lucide-react';

export const NewsTab: React.FC = () => {
  const [noticias, setNoticias] = useState([
    { titulo: '', texto: '' },
    { titulo: '', texto: '' }
  ]);
  const [noticiasLoaded, setNoticiasLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [doc1, doc2] = await Promise.all([
          getDoc(doc(db, 'noticias', '1')),
          getDoc(doc(db, 'noticias', '2'))
        ]);
        if (!active) return;
        setNoticias([
          { titulo: doc1.data()?.titulo || '', texto: doc1.data()?.texto || '' },
          { titulo: doc2.data()?.titulo || '', texto: doc2.data()?.texto || '' }
        ]);
      } catch (err) {
        console.error('Error cargando noticias:', err);
      } finally {
        if (active) setNoticiasLoaded(true);
      }
    })();
    return () => { active = false; };
  }, []);

  const handleSaveNoticias = async () => {
    try {
      await setDoc(doc(db, 'noticias', '1'), { titulo: noticias[0].titulo.trim(), texto: noticias[0].texto.trim(), visible: true, updatedAt: new Date().toISOString() });
      await setDoc(doc(db, 'noticias', '2'), { titulo: noticias[1].titulo.trim(), texto: noticias[1].texto.trim(), visible: true, updatedAt: new Date().toISOString() });
      await logAudit('Noticias actualizadas', `"${noticias[0].titulo}" | "${noticias[1].titulo}"`);
      alert('Noticias guardadas con éxito.');
    } catch (err) {
      console.error(err);
      alert('Error al guardar noticias.');
    }
  };

  return (
    <div>
      <h2 className="section-title">Gestión de Noticias</h2>

      <div className="details-box" style={{ width: '100%', boxSizing: 'border-box' }}>
        <h3 style={{ margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Megaphone size={20} color="var(--primary)" />
          Noticias de la Página Principal
        </h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '15px' }}>
          Las dos noticias que se muestran en la página principal (título + texto corto).
        </p>
        {!noticiasLoaded && <div className="spinner" style={{ margin: '10px auto' }}></div>}
        {noticiasLoaded && (
          <>
            <div className="form-row" style={{ width: '100%' }}>
              {[0, 1].map(idx => (
                <div key={idx} className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: 600 }}>Noticia {idx + 1} — Título</label>
                  <input
                    type="text"
                    className="form-control"
                    value={noticias[idx].titulo}
                    onChange={e => setNoticias(prev => prev.map((n, i) => i === idx ? { ...n, titulo: e.target.value } : n))}
                    placeholder={`Título de la noticia ${idx + 1}`}
                  />
                  <label style={{ fontWeight: 600, display: 'block', marginTop: '10px' }}>Texto</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={noticias[idx].texto}
                    onChange={e => setNoticias(prev => prev.map((n, i) => i === idx ? { ...n, texto: e.target.value } : n))}
                    placeholder={`Texto de la noticia ${idx + 1}`}
                  />
                </div>
              ))}
            </div>
            <button
              className="btn-primary"
              style={{ margin: '15px 0 0', width: '200px', height: '40px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.825rem' }}
              onClick={handleSaveNoticias}
            >
              <Save size={15} /> Guardar Noticias
            </button>
          </>
        )}
      </div>
    </div>
  );
};
