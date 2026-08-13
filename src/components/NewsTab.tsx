import React, { useState, useEffect } from 'react';
import { getDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { logAudit } from '../utils/audit';
import { Save, Megaphone, Upload, X, Image as ImageIcon } from 'lucide-react';

export const NewsTab: React.FC = () => {
  const [noticias, setNoticias] = useState([
    { titulo: '', texto: '', imagenUrl: '' },
    { titulo: '', texto: '', imagenUrl: '' }
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
          { titulo: doc1.data()?.titulo || '', texto: doc1.data()?.texto || '', imagenUrl: doc1.data()?.imagenUrl || '' },
          { titulo: doc2.data()?.titulo || '', texto: doc2.data()?.texto || '', imagenUrl: doc2.data()?.imagenUrl || '' }
        ]);
      } catch (err) {
        console.error('Error cargando noticias:', err);
      } finally {
        if (active) setNoticiasLoaded(true);
      }
    })();
    return () => { active = false; };
  }, []);

  const handleImageFileChange = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      alert('La imagen es demasiado grande. Por favor selecciona una imagen menor a 1 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setNoticias(prev => prev.map((n, i) => i === idx ? { ...n, imagenUrl: result } : n));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveNoticias = async () => {
    try {
      await setDoc(doc(db, 'noticias', '1'), {
        titulo: noticias[0].titulo.trim(),
        texto: noticias[0].texto.trim(),
        imagenUrl: noticias[0].imagenUrl || '',
        visible: true,
        updatedAt: new Date().toISOString()
      });
      await setDoc(doc(db, 'noticias', '2'), {
        titulo: noticias[1].titulo.trim(),
        texto: noticias[1].texto.trim(),
        imagenUrl: noticias[1].imagenUrl || '',
        visible: true,
        updatedAt: new Date().toISOString()
      });
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
          Las dos noticias que se muestran en la página principal (título, texto e imagen).
        </p>
        {!noticiasLoaded && <div className="spinner" style={{ margin: '10px auto' }}></div>}
        {noticiasLoaded && (
          <>
            <div className="form-row" style={{ width: '100%', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              {[0, 1].map(idx => (
                <div key={idx} className="form-group" style={{ margin: 0, flex: '1 1 300px' }}>
                  <label style={{ fontWeight: 600 }}>Noticia {idx + 1} — Título</label>
                  <input
                    type="text"
                    className="form-control"
                    value={noticias[idx].titulo}
                    onChange={e => setNoticias(prev => prev.map((n, i) => i === idx ? { ...n, titulo: e.target.value } : n))}
                    placeholder={`Título de la noticia ${idx + 1}`}
                  />

                  <label style={{ fontWeight: 600, display: 'block', marginTop: '12px' }}>Texto</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={noticias[idx].texto}
                    onChange={e => setNoticias(prev => prev.map((n, i) => i === idx ? { ...n, texto: e.target.value } : n))}
                    placeholder={`Texto de la noticia ${idx + 1}`}
                  />

                  <label style={{ fontWeight: 600, display: 'block', marginTop: '12px' }}>Imagen de la noticia</label>
                  {noticias[idx].imagenUrl ? (
                    <div style={{ position: 'relative', marginTop: '6px', marginBottom: '8px', display: 'inline-block', maxWidth: '100%' }}>
                      <img
                        src={noticias[idx].imagenUrl}
                        alt={`Noticia ${idx + 1}`}
                        style={{ maxHeight: '140px', maxWidth: '100%', borderRadius: '8px', border: '1px solid var(--border-color)', objectFit: 'cover' }}
                      />
                      <button
                        type="button"
                        onClick={() => setNoticias(prev => prev.map((n, i) => i === idx ? { ...n, imagenUrl: '' } : n))}
                        style={{
                          position: 'absolute',
                          top: '6px',
                          right: '6px',
                          background: 'rgba(239, 68, 68, 0.85)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '50%',
                          width: '24px',
                          height: '24px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                        title="Eliminar imagen"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px', marginBottom: '6px' }}>
                      <label className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', margin: 0, padding: '6px 12px', fontSize: '0.8rem' }}>
                        <Upload size={14} /> Subir Imagen
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleImageFileChange(idx, e)} />
                      </label>
                    </div>
                  )}
                  <input
                    type="text"
                    className="form-control"
                    value={noticias[idx].imagenUrl}
                    onChange={e => setNoticias(prev => prev.map((n, i) => i === idx ? { ...n, imagenUrl: e.target.value } : n))}
                    placeholder="URL de la imagen o archivo cargado..."
                  />
                </div>
              ))}
            </div>
            <button
              className="btn-primary"
              style={{ margin: '20px 0 0', width: '200px', height: '42px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.85rem' }}
              onClick={handleSaveNoticias}
            >
              <Save size={16} /> Guardar Noticias
            </button>
          </>
        )}
      </div>
    </div>
  );
};

