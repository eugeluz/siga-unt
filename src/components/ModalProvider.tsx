import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, Trash2, X, AlertCircle, ShieldAlert } from 'lucide-react';

type ModalVariant = 'danger' | 'warning' | 'info' | 'success' | 'primary';
type ModalType = 'confirm' | 'alert';

interface ModalOptions {
  title?: string;
  message: string;
  variant?: ModalVariant;
  confirmText?: string;
  cancelText?: string;
}

interface ModalState extends ModalOptions {
  isOpen: boolean;
  type: ModalType;
  resolve?: (value: boolean) => void;
}

interface ModalContextValue {
  confirm: (options: ModalOptions | string) => Promise<boolean>;
  alert: (options: ModalOptions | string) => Promise<void>;
}

const ModalContext = createContext<ModalContextValue | null>(null);

export const useModal = () => {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error('useModal must be used within ModalProvider');
  return ctx;
};

// Helper to normalize string | object
const normalizeOptions = (opts: ModalOptions | string, defaults: Partial<ModalOptions>): ModalOptions => {
  if (typeof opts === 'string') {
    return { message: opts, ...defaults } as ModalOptions;
  }
  return { ...defaults, ...opts } as ModalOptions;
};

export const ModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [modal, setModal] = useState<ModalState | null>(null);

  const confirm = useCallback((opts: ModalOptions | string) => {
    const normalized = normalizeOptions(opts, {
      title: 'Confirmar acción',
      variant: 'primary' as ModalVariant,
      confirmText: 'Confirmar',
      cancelText: 'Cancelar',
    });
    return new Promise<boolean>((resolve) => {
      setModal({
        isOpen: true,
        type: 'confirm',
        title: normalized.title!,
        message: normalized.message,
        variant: normalized.variant as ModalVariant,
        confirmText: normalized.confirmText!,
        cancelText: normalized.cancelText!,
        resolve,
      } as ModalState);
    });
  }, []);

  const alert = useCallback((opts: ModalOptions | string) => {
    const normalized = normalizeOptions(opts, {
      title: 'Aviso',
      variant: 'info' as ModalVariant,
      confirmText: 'Entendido',
      cancelText: 'Cerrar',
    });
    return new Promise<void>((resolve) => {
      const wrappedResolve = (_v: boolean) => resolve();
      setModal({
        isOpen: true,
        type: 'alert',
        title: normalized.title!,
        message: normalized.message,
        variant: normalized.variant as ModalVariant,
        confirmText: normalized.confirmText!,
        cancelText: normalized.cancelText!,
        resolve: wrappedResolve as any,
      } as ModalState);
    });
  }, []);

  const handleClose = useCallback(
    (result: boolean) => {
      if (modal?.resolve) modal.resolve(result);
      setModal(null);
    },
    [modal]
  );

  const handleOverlayClick = () => {
    if (modal?.type === 'alert') handleClose(true);
    else handleClose(false);
  };

  // Close on Escape
  useEffect(() => {
    if (!modal?.isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose(modal.type === 'alert' ? true : false);
    };
    document.addEventListener('keydown', onKey);
    // Prevent background scroll
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [modal, handleClose]);

  const getVariantConfig = (variant: ModalVariant = 'primary') => {
    switch (variant) {
      case 'danger':
        return {
          bg: 'rgba(239, 68, 68, 0.12)',
          border: 'rgba(239, 68, 68, 0.3)',
          color: '#EF4444',
          icon: <Trash2 size={22} color="#EF4444" />,
          titleColor: 'var(--danger, #EF4444)',
          buttonClass: 'btn-danger' as const,
        };
      case 'warning':
        return {
          bg: 'rgba(245, 158, 11, 0.12)',
          border: 'rgba(245, 158, 11, 0.3)',
          color: '#F59E0B',
          icon: <ShieldAlert size={22} color="#F59E0B" />,
          titleColor: '#F59E0B',
          buttonClass: 'btn-primary' as const,
        };
      case 'success':
        return {
          bg: 'rgba(16, 185, 129, 0.12)',
          border: 'rgba(16, 185, 129, 0.3)',
          color: '#10B981',
          icon: <CheckCircle2 size={22} color="#10B981" />,
          titleColor: '#10B981',
          buttonClass: 'btn-primary' as const,
        };
      case 'info':
        return {
          bg: 'rgba(56, 189, 248, 0.12)',
          border: 'rgba(56, 189, 248, 0.3)',
          color: 'var(--accent, #38BDF8)',
          icon: <Info size={22} color="var(--accent, #38BDF8)" />,
          titleColor: 'var(--text-primary)',
          buttonClass: 'btn-primary' as const,
        };
      case 'primary':
      default:
        return {
          bg: 'rgba(37, 154, 214, 0.12)',
          border: 'rgba(37, 154, 214, 0.3)',
          color: 'var(--primary, #259AD6)',
          icon: <AlertTriangle size={22} color="var(--primary, #259AD6)" />,
          titleColor: 'var(--text-primary)',
          buttonClass: 'btn-primary' as const,
        };
    }
  };

  return (
    <ModalContext.Provider value={{ confirm, alert }}>
      {children}
      {modal?.isOpen && (
        <div
          className="modal-overlay"
          onClick={handleOverlayClick}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--overlay-bg, rgba(3, 8, 14, 0.65))',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 5000,
            animation: 'fadeIn 0.2s ease-out',
            padding: '16px',
          }}
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            aria-describedby="modal-message"
            style={{
              width: '100%',
              maxWidth: modal.type === 'alert' ? '420px' : '480px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-card)',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: 'var(--shadow-lg)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0',
              animation: 'modalPopIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              position: 'relative',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            {/* Close X */}
            <button
              onClick={() => handleClose(modal.type === 'alert' ? true : false)}
              aria-label="Cerrar"
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-hover)')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'transparent')}
            >
              <X size={18} />
            </button>

            {/* Header with icon and title */}
            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', paddingRight: '24px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: getVariantConfig(modal.variant).bg,
                  border: `1px solid ${getVariantConfig(modal.variant).border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {getVariantConfig(modal.variant).icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3
                  id="modal-title"
                  style={{
                    margin: 0,
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    color: getVariantConfig(modal.variant).titleColor,
                    fontFamily: 'var(--font-display)',
                    lineHeight: '1.3',
                  }}
                >
                  {modal.title}
                </h3>
                <p
                  id="modal-message"
                  style={{
                    margin: '8px 0 0 0',
                    color: 'var(--text-secondary)',
                    fontSize: '0.9rem',
                    lineHeight: '1.6',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {modal.message}
                </p>
              </div>
            </div>

            {/* Footer buttons */}
            <div
              style={{
                display: 'flex',
                gap: '10px',
                justifyContent: 'flex-end',
                marginTop: '22px',
                flexWrap: 'wrap',
              }}
            >
              {modal.type === 'confirm' && (
                <button
                  className="btn-secondary"
                  onClick={() => handleClose(false)}
                  style={{
                    margin: 0,
                    minWidth: '110px',
                    height: '40px',
                    padding: '0 18px',
                    fontSize: '0.9rem',
                    fontWeight: 500,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: '1 1 auto',
                    maxWidth: '160px',
                  }}
                  autoFocus={false}
                >
                  {modal.cancelText}
                </button>
              )}
              <button
                className={getVariantConfig(modal.variant).buttonClass}
                onClick={() => handleClose(true)}
                style={{
                  margin: 0,
                  minWidth: '130px',
                  height: '40px',
                  padding: '0 18px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  flex: '1 1 auto',
                  maxWidth: modal.type === 'alert' ? '100%' : '200px',
                }}
                autoFocus
              >
                {modal.variant === 'danger' && modal.type === 'confirm' && <Trash2 size={16} />}
                {modal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes modalPopIn {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </ModalContext.Provider>
  );
};
